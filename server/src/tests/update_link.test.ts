
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type UpdateLinkInput } from '../schema';
import { updateLink } from '../handlers/update_link';
import { eq, and } from 'drizzle-orm';

describe('updateLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testLinkId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create another user for ownership tests
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Other User'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test link
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: testUserId,
        title: 'Original Title',
        url: 'https://original.com',
        favicon_url: 'https://original.com/favicon.ico',
        custom_icon_url: null,
        position_order: 1
      })
      .returning()
      .execute();
    testLinkId = linkResult[0].id;
  });

  it('should update link title', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      title: 'Updated Title'
    };

    const result = await updateLink(input);

    expect(result.id).toEqual(testLinkId);
    expect(result.title).toEqual('Updated Title');
    expect(result.url).toEqual('https://original.com'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update link URL and fetch new favicon', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      url: 'https://newsite.com'
    };

    const result = await updateLink(input);

    expect(result.url).toEqual('https://newsite.com');
    expect(result.favicon_url).toEqual('https://newsite.com/favicon.ico');
    expect(result.title).toEqual('Original Title'); // Unchanged
  });

  it('should update custom icon URL', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      custom_icon_url: 'https://example.com/custom-icon.png'
    };

    const result = await updateLink(input);

    expect(result.custom_icon_url).toEqual('https://example.com/custom-icon.png');
    expect(result.title).toEqual('Original Title'); // Unchanged
  });

  it('should update position order', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      position_order: 5
    };

    const result = await updateLink(input);

    expect(result.position_order).toEqual(5);
    expect(result.title).toEqual('Original Title'); // Unchanged
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      title: 'New Title',
      url: 'https://newdomain.com',
      custom_icon_url: 'https://example.com/icon.png',
      position_order: 3
    };

    const result = await updateLink(input);

    expect(result.title).toEqual('New Title');
    expect(result.url).toEqual('https://newdomain.com');
    expect(result.favicon_url).toEqual('https://newdomain.com/favicon.ico');
    expect(result.custom_icon_url).toEqual('https://example.com/icon.png');
    expect(result.position_order).toEqual(3);
  });

  it('should set custom_icon_url to null when explicitly provided', async () => {
    // First set a custom icon
    await db.update(linksTable)
      .set({ custom_icon_url: 'https://example.com/old-icon.png' })
      .where(eq(linksTable.id, testLinkId))
      .execute();

    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      custom_icon_url: null
    };

    const result = await updateLink(input);

    expect(result.custom_icon_url).toBeNull();
  });

  it('should update the database record', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      title: 'Database Updated Title'
    };

    await updateLink(input);

    // Verify in database
    const links = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, testLinkId))
      .execute();

    expect(links).toHaveLength(1);
    expect(links[0].title).toEqual('Database Updated Title');
    expect(links[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle invalid URL gracefully', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      url: 'invalid-url'
    };

    const result = await updateLink(input);

    expect(result.url).toEqual('invalid-url');
    expect(result.favicon_url).toBeNull();
  });

  it('should throw error when link does not exist', async () => {
    const input: UpdateLinkInput = {
      id: 999999,
      user_id: testUserId,
      title: 'New Title'
    };

    expect(updateLink(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when user does not own the link', async () => {
    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: otherUserId,
      title: 'Unauthorized Update'
    };

    expect(updateLink(input)).rejects.toThrow(/not owned/i);
  });

  it('should preserve favicon when URL does not change', async () => {
    // Set a custom favicon first
    await db.update(linksTable)
      .set({ favicon_url: 'https://custom-favicon.com/icon.ico' })
      .where(eq(linksTable.id, testLinkId))
      .execute();

    const input: UpdateLinkInput = {
      id: testLinkId,
      user_id: testUserId,
      title: 'New Title Only'
    };

    const result = await updateLink(input);

    expect(result.title).toEqual('New Title Only');
    expect(result.favicon_url).toEqual('https://custom-favicon.com/icon.ico'); // Preserved
  });
});
