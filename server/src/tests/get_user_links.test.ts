
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type GetUserLinksInput } from '../schema';
import { getUserLinks } from '../handlers/get_user_links';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  display_name: 'Test User'
};

const testUser2 = {
  email: 'test2@example.com',
  password_hash: 'hashed_password_2',
  display_name: 'Test User 2'
};

describe('getUserLinks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no links', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input: GetUserLinksInput = {
      user_id: userResult[0].id
    };

    const result = await getUserLinks(input);

    expect(result).toEqual([]);
  });

  it('should return user links ordered by position_order', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create links in random order but with specific position_order values
    await db.insert(linksTable)
      .values([
        {
          user_id: userId,
          title: 'Third Link',
          url: 'https://third.com',
          position_order: 3
        },
        {
          user_id: userId,
          title: 'First Link',
          url: 'https://first.com',
          position_order: 1
        },
        {
          user_id: userId,
          title: 'Second Link',
          url: 'https://second.com',
          position_order: 2
        }
      ])
      .execute();

    const input: GetUserLinksInput = {
      user_id: userId
    };

    const result = await getUserLinks(input);

    expect(result).toHaveLength(3);
    
    // Verify ordering by position_order
    expect(result[0].title).toEqual('First Link');
    expect(result[0].position_order).toEqual(1);
    expect(result[1].title).toEqual('Second Link');
    expect(result[1].position_order).toEqual(2);
    expect(result[2].title).toEqual('Third Link');
    expect(result[2].position_order).toEqual(3);

    // Verify all required fields are present
    result.forEach(link => {
      expect(link.id).toBeDefined();
      expect(link.user_id).toEqual(userId);
      expect(link.title).toBeDefined();
      expect(link.url).toBeDefined();
      expect(link.position_order).toBeDefined();
      expect(link.created_at).toBeInstanceOf(Date);
      expect(link.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should only return links for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create links for both users
    await db.insert(linksTable)
      .values([
        {
          user_id: user1Id,
          title: 'User1 Link',
          url: 'https://user1.com',
          position_order: 1
        },
        {
          user_id: user2Id,
          title: 'User2 Link',
          url: 'https://user2.com',
          position_order: 1
        }
      ])
      .execute();

    const input: GetUserLinksInput = {
      user_id: user1Id
    };

    const result = await getUserLinks(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User1 Link');
    expect(result[0].user_id).toEqual(user1Id);
  });

  it('should handle links with nullable fields correctly', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create link with nullable fields
    await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Link with nulls',
        url: 'https://example.com',
        favicon_url: null,
        custom_icon_url: null,
        position_order: 1
      })
      .execute();

    const input: GetUserLinksInput = {
      user_id: userId
    };

    const result = await getUserLinks(input);

    expect(result).toHaveLength(1);
    expect(result[0].favicon_url).toBeNull();
    expect(result[0].custom_icon_url).toBeNull();
  });
});
