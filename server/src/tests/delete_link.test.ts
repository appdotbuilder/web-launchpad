
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type DeleteLinkInput } from '../schema';
import { deleteLink } from '../handlers/delete_link';
import { eq, and } from 'drizzle-orm';

describe('deleteLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a link successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test link
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Test Link',
        url: 'https://example.com',
        position_order: 0
      })
      .returning()
      .execute();
    const linkId = linkResult[0].id;

    const input: DeleteLinkInput = {
      id: linkId,
      user_id: userId
    };

    const result = await deleteLink(input);

    expect(result.success).toBe(true);

    // Verify link was deleted
    const deletedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkId))
      .execute();

    expect(deletedLinks).toHaveLength(0);
  });

  it('should reorder remaining links after deletion', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple links with different positions
    const link1 = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Link 1',
        url: 'https://example1.com',
        position_order: 0
      })
      .returning()
      .execute();

    const link2 = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Link 2',
        url: 'https://example2.com',
        position_order: 1
      })
      .returning()
      .execute();

    const link3 = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Link 3',
        url: 'https://example3.com',
        position_order: 2
      })
      .returning()
      .execute();

    // Delete the middle link (position 1)
    const input: DeleteLinkInput = {
      id: link2[0].id,
      user_id: userId
    };

    await deleteLink(input);

    // Check remaining links are properly reordered
    const remainingLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, userId))
      .orderBy(linksTable.position_order)
      .execute();

    expect(remainingLinks).toHaveLength(2);
    expect(remainingLinks[0].id).toBe(link1[0].id);
    expect(remainingLinks[0].position_order).toBe(0); // Unchanged
    expect(remainingLinks[1].id).toBe(link3[0].id);
    expect(remainingLinks[1].position_order).toBe(1); // Decreased from 2 to 1
  });

  it('should throw error when link does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: DeleteLinkInput = {
      id: 999, // Non-existent link ID
      user_id: userId
    };

    await expect(deleteLink(input)).rejects.toThrow(/link not found/i);
  });

  it('should throw error when user does not own the link', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        display_name: 'User 1'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        display_name: 'User 2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create link for user1
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: user1Id,
        title: 'User 1 Link',
        url: 'https://example.com',
        position_order: 0
      })
      .returning()
      .execute();
    const linkId = linkResult[0].id;

    // Try to delete with user2's ID
    const input: DeleteLinkInput = {
      id: linkId,
      user_id: user2Id
    };

    await expect(deleteLink(input)).rejects.toThrow(/does not belong to user/i);

    // Verify link still exists
    const existingLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkId))
      .execute();

    expect(existingLinks).toHaveLength(1);
  });

  it('should update timestamps when reordering links', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create links
    const link1 = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Link 1',
        url: 'https://example1.com',
        position_order: 0
      })
      .returning()
      .execute();

    const link2 = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Link 2',
        url: 'https://example2.com',
        position_order: 1
      })
      .returning()
      .execute();

    const originalUpdatedAt = link2[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Delete first link (this should reorder the second link)
    const input: DeleteLinkInput = {
      id: link1[0].id,
      user_id: userId
    };

    await deleteLink(input);

    // Check that the remaining link's updated_at was modified
    const updatedLink = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, link2[0].id))
      .execute();

    expect(updatedLink).toHaveLength(1);
    expect(updatedLink[0].updated_at).not.toEqual(originalUpdatedAt);
    expect(updatedLink[0].updated_at).toBeInstanceOf(Date);
  });
});
