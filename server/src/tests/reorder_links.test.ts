
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type ReorderLinksInput, type User, type Link } from '../schema';
import { reorderLinks } from '../handlers/reorder_links';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  display_name: 'Test User'
};

// Test links data
const testLinks = [
  {
    title: 'First Link',
    url: 'https://example1.com',
    position_order: 1
  },
  {
    title: 'Second Link', 
    url: 'https://example2.com',
    position_order: 2
  },
  {
    title: 'Third Link',
    url: 'https://example3.com',
    position_order: 3
  }
];

describe('reorderLinks', () => {
  let createdUser: User;
  let createdLinks: Link[];

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    createdUser = userResult[0];

    // Create test links
    const linkResults = await db.insert(linksTable)
      .values(testLinks.map(link => ({
        ...link,
        user_id: createdUser.id
      })))
      .returning()
      .execute();
    createdLinks = linkResults;
  });

  afterEach(resetDB);

  it('should reorder links correctly', async () => {
    const reorderInput: ReorderLinksInput = {
      user_id: createdUser.id,
      link_orders: [
        { id: createdLinks[0].id, position_order: 3 }, // Move first to last
        { id: createdLinks[1].id, position_order: 1 }, // Move second to first
        { id: createdLinks[2].id, position_order: 2 }  // Move third to middle
      ]
    };

    const result = await reorderLinks(reorderInput);

    // Should return all user's links ordered by new position
    expect(result).toHaveLength(3);
    expect(result[0].id).toEqual(createdLinks[1].id); // Second link is now first
    expect(result[0].position_order).toEqual(1);
    expect(result[1].id).toEqual(createdLinks[2].id); // Third link is now second
    expect(result[1].position_order).toEqual(2);
    expect(result[2].id).toEqual(createdLinks[0].id); // First link is now last
    expect(result[2].position_order).toEqual(3);
  });

  it('should update the database with new positions', async () => {
    const reorderInput: ReorderLinksInput = {
      user_id: createdUser.id,
      link_orders: [
        { id: createdLinks[0].id, position_order: 2 },
        { id: createdLinks[1].id, position_order: 3 },
        { id: createdLinks[2].id, position_order: 1 }
      ]
    };

    await reorderLinks(reorderInput);

    // Verify changes were persisted in database
    const updatedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, createdUser.id))
      .orderBy(linksTable.position_order)
      .execute();

    expect(updatedLinks[0].id).toEqual(createdLinks[2].id);
    expect(updatedLinks[0].position_order).toEqual(1);
    expect(updatedLinks[1].id).toEqual(createdLinks[0].id);
    expect(updatedLinks[1].position_order).toEqual(2);
    expect(updatedLinks[2].id).toEqual(createdLinks[1].id);
    expect(updatedLinks[2].position_order).toEqual(3);
  });

  it('should update updated_at timestamp', async () => {
    const originalUpdatedAt = createdLinks[0].updated_at;
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1));

    const reorderInput: ReorderLinksInput = {
      user_id: createdUser.id,
      link_orders: [
        { id: createdLinks[0].id, position_order: 5 }
      ]
    };

    await reorderLinks(reorderInput);

    const updatedLink = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, createdLinks[0].id))
      .execute();

    expect(updatedLink[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should reject reordering links that do not belong to user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        display_name: 'Other User'
      })
      .returning()
      .execute();
    const otherUser = otherUserResult[0];

    // Create link for other user
    const otherLinkResult = await db.insert(linksTable)
      .values({
        user_id: otherUser.id,
        title: 'Other Link',
        url: 'https://other.com',
        position_order: 1
      })
      .returning()
      .execute();
    const otherLink = otherLinkResult[0];

    const reorderInput: ReorderLinksInput = {
      user_id: createdUser.id,
      link_orders: [
        { id: otherLink.id, position_order: 1 } // Try to reorder other user's link
      ]
    };

    await expect(reorderLinks(reorderInput))
      .rejects.toThrow(/not found or do not belong to the user/i);
  });

  it('should reject reordering non-existent links', async () => {
    const reorderInput: ReorderLinksInput = {
      user_id: createdUser.id,
      link_orders: [
        { id: 999999, position_order: 1 } // Non-existent link ID
      ]
    };

    await expect(reorderLinks(reorderInput))
      .rejects.toThrow(/not found or do not belong to the user/i);
  });

  it('should handle partial reordering correctly', async () => {
    // Only reorder 2 out of 3 links
    const reorderInput: ReorderLinksInput = {
      user_id: createdUser.id,
      link_orders: [
        { id: createdLinks[0].id, position_order: 10 },
        { id: createdLinks[2].id, position_order: 5 }
      ]
    };

    const result = await reorderLinks(reorderInput);

    // Should still return all user's links
    expect(result).toHaveLength(3);
    
    // Find the reordered links in the result
    const firstLink = result.find(link => link.id === createdLinks[0].id);
    const thirdLink = result.find(link => link.id === createdLinks[2].id);
    const secondLink = result.find(link => link.id === createdLinks[1].id);

    expect(firstLink?.position_order).toEqual(10);
    expect(thirdLink?.position_order).toEqual(5);
    expect(secondLink?.position_order).toEqual(2); // Unchanged
  });
});
