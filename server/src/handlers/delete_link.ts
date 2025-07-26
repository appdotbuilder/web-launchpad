
import { db } from '../db';
import { linksTable } from '../db/schema';
import { type DeleteLinkInput } from '../schema';
import { eq, and, gt, sql } from 'drizzle-orm';

export const deleteLink = async (input: DeleteLinkInput): Promise<{ success: boolean }> => {
  try {
    // First, check if the link exists and belongs to the user
    const existingLink = await db.select()
      .from(linksTable)
      .where(and(
        eq(linksTable.id, input.id),
        eq(linksTable.user_id, input.user_id)
      ))
      .execute();

    if (existingLink.length === 0) {
      throw new Error('Link not found or does not belong to user');
    }

    const linkToDelete = existingLink[0];

    // Delete the link
    await db.delete(linksTable)
      .where(and(
        eq(linksTable.id, input.id),
        eq(linksTable.user_id, input.user_id)
      ))
      .execute();

    // Reorder remaining links to fill the gap
    // Decrease position_order by 1 for all links with position_order > deleted link's position
    await db.update(linksTable)
      .set({
        position_order: sql`${linksTable.position_order} - 1`,
        updated_at: new Date()
      })
      .where(and(
        eq(linksTable.user_id, input.user_id),
        gt(linksTable.position_order, linkToDelete.position_order)
      ))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Link deletion failed:', error);
    throw error;
  }
};
