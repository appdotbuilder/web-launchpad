
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type CreateLinkInput } from '../schema';
import { createLink } from '../handlers/create_link';
import { eq } from 'drizzle-orm';

describe('createLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a link with auto-generated favicon', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateLinkInput = {
      user_id: testUser.id,
      title: 'Google',
      url: 'https://www.google.com'
    };

    const result = await createLink(testInput);

    // Basic field validation
    expect(result.title).toEqual('Google');
    expect(result.url).toEqual('https://www.google.com');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.favicon_url).toEqual('https://www.google.com/s2/favicons?domain=www.google.com');
    expect(result.custom_icon_url).toBeNull();
    expect(result.position_order).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a link with custom icon URL', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateLinkInput = {
      user_id: testUser.id,
      title: 'My Custom Link',
      url: 'https://example.com',
      custom_icon_url: 'https://example.com/custom-icon.png'
    };

    const result = await createLink(testInput);

    expect(result.title).toEqual('My Custom Link');
    expect(result.url).toEqual('https://example.com');
    expect(result.custom_icon_url).toEqual('https://example.com/custom-icon.png');
    expect(result.favicon_url).toEqual('https://www.google.com/s2/favicons?domain=example.com');
  });

  it('should save link to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateLinkInput = {
      user_id: testUser.id,
      title: 'Test Link',
      url: 'https://test.com'
    };

    const result = await createLink(testInput);

    // Query database to verify link was saved
    const links = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, result.id))
      .execute();

    expect(links).toHaveLength(1);
    expect(links[0].title).toEqual('Test Link');
    expect(links[0].url).toEqual('https://test.com');
    expect(links[0].user_id).toEqual(testUser.id);
    expect(links[0].favicon_url).toEqual('https://www.google.com/s2/favicons?domain=test.com');
  });

  it('should assign correct position_order for multiple links', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create first link
    const firstLink = await createLink({
      user_id: testUser.id,
      title: 'First Link',
      url: 'https://first.com'
    });

    // Create second link
    const secondLink = await createLink({
      user_id: testUser.id,
      title: 'Second Link',
      url: 'https://second.com'
    });

    // Create third link
    const thirdLink = await createLink({
      user_id: testUser.id,
      title: 'Third Link',
      url: 'https://third.com'
    });

    expect(firstLink.position_order).toEqual(0);
    expect(secondLink.position_order).toEqual(1);
    expect(thirdLink.position_order).toEqual(2);
  });

  it('should handle invalid URL gracefully', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateLinkInput = {
      user_id: testUser.id,
      title: 'Invalid URL Link',
      url: 'not-a-valid-url'
    };

    const result = await createLink(testInput);

    expect(result.title).toEqual('Invalid URL Link');
    expect(result.url).toEqual('not-a-valid-url');
    expect(result.favicon_url).toBeNull(); // Should be null when URL parsing fails
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateLinkInput = {
      user_id: 999, // Non-existent user ID
      title: 'Test Link',
      url: 'https://test.com'
    };

    await expect(createLink(testInput)).rejects.toThrow(/user not found/i);
  });
});
