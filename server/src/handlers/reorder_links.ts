
import { db } from '../db';
import { linksTable } from '../db/schema';
import { type ReorderLinksInput, type Link } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function reorderLinks(input: ReorderLinksInput): Promise<Link[]> {
  try {
    // Extract link IDs from input
    const linkIds = input.link_orders.map(order => order.id);
    
    // Validate that all links belong to the user
    const existingLinks = await db.select()
      .from(linksTable)
      .where(
        and(
          eq(linksTable.user_id, input.user_id),
          inArray(linksTable.id, linkIds)
        )
      )
      .execute();

    // Check if all requested links exist and belong to the user
    if (existingLinks.length !== linkIds.length) {
      throw new Error('One or more links not found or do not belong to the user');
    }

    // Execute updates in a transaction for consistency
    await db.transaction(async (tx) => {
      for (const linkOrder of input.link_orders) {
        await tx.update(linksTable)
          .set({ 
            position_order: linkOrder.position_order,
            updated_at: new Date()
          })
          .where(
            and(
              eq(linksTable.id, linkOrder.id),
              eq(linksTable.user_id, input.user_id)
            )
          )
          .execute();
      }
    });

    // Return updated links ordered by new position_order
    const updatedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, input.user_id))
      .orderBy(linksTable.position_order)
      .execute();

    return updatedLinks;
  } catch (error) {
    console.error('Link reordering failed:', error);
    throw error;
  }
}
