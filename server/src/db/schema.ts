
import { serial, text, pgTable, timestamp, integer, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  display_name: varchar('display_name', { length: 100 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const linksTable = pgTable('links', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  url: text('url').notNull(),
  favicon_url: text('favicon_url'), // Nullable - automatically fetched favicon
  custom_icon_url: text('custom_icon_url'), // Nullable - user uploaded custom icon
  position_order: integer('position_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  links: many(linksTable)
}));

export const linksRelations = relations(linksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [linksTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Link = typeof linksTable.$inferSelect;
export type NewLink = typeof linksTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  links: linksTable 
};
