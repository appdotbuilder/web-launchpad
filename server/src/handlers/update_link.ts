
import { db } from '../db';
import { linksTable } from '../db/schema';
import { type UpdateLinkInput, type Link } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateLink(input: UpdateLinkInput): Promise<Link> {
  try {
    // Check if link exists and belongs to user
    const existingLinks = await db.select()
      .from(linksTable)
      .where(and(
        eq(linksTable.id, input.id),
        eq(linksTable.user_id, input.user_id)
      ))
      .execute();

    if (existingLinks.length === 0) {
      throw new Error('Link not found or not owned by user');
    }

    const existingLink = existingLinks[0];

    // Prepare update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.url !== undefined) {
      updateData.url = input.url;
      // If URL changed, fetch new favicon
      if (input.url !== existingLink.url) {
        try {
          const urlObj = new URL(input.url);
          updateData.favicon_url = `${urlObj.origin}/favicon.ico`;
        } catch {
          updateData.favicon_url = null;
        }
      }
    }

    if (input.custom_icon_url !== undefined) {
      updateData.custom_icon_url = input.custom_icon_url;
    }

    if (input.position_order !== undefined) {
      updateData.position_order = input.position_order;
    }

    // Update the link
    const result = await db.update(linksTable)
      .set(updateData)
      .where(and(
        eq(linksTable.id, input.id),
        eq(linksTable.user_id, input.user_id)
      ))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Link update failed:', error);
    throw error;
  }
}
