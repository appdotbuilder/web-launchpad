
import { db } from '../db';
import { linksTable, usersTable } from '../db/schema';
import { type CreateLinkInput, type Link } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function createLink(input: CreateLinkInput): Promise<Link> {
  try {
    // Validate user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Get next position_order for this user's links
    const lastLink = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, input.user_id))
      .orderBy(desc(linksTable.position_order))
      .limit(1)
      .execute();

    const nextPosition = lastLink.length > 0 ? lastLink[0].position_order + 1 : 0;

    // Generate favicon URL from the provided URL
    let faviconUrl: string | null = null;
    try {
      const hostname = new URL(input.url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}`;
    } catch {
      // If URL parsing fails, leave favicon_url as null
      faviconUrl = null;
    }

    // Insert new link record
    const result = await db.insert(linksTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        url: input.url,
        favicon_url: faviconUrl,
        custom_icon_url: input.custom_icon_url || null,
        position_order: nextPosition
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Link creation failed:', error);
    throw error;
  }
}
