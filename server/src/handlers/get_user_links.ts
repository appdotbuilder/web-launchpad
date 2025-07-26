
import { db } from '../db';
import { linksTable } from '../db/schema';
import { type GetUserLinksInput, type Link } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getUserLinks = async (input: GetUserLinksInput): Promise<Link[]> => {
  try {
    // Fetch all links for the user, ordered by position_order for proper grid display
    const results = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, input.user_id))
      .orderBy(asc(linksTable.position_order))
      .execute();

    return results;
  } catch (error) {
    console.error('Get user links failed:', error);
    throw error;
  }
};
