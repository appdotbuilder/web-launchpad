
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  display_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Link schema
export const linkSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  url: z.string().url(),
  favicon_url: z.string().url().nullable(),
  custom_icon_url: z.string().url().nullable(),
  position_order: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Link = z.infer<typeof linkSchema>;

// Input schemas for user operations
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).max(100)
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Input schemas for link operations
export const createLinkInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1).max(200),
  url: z.string().url(),
  custom_icon_url: z.string().url().nullable().optional()
});

export type CreateLinkInput = z.infer<typeof createLinkInputSchema>;

export const updateLinkInputSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  custom_icon_url: z.string().url().nullable().optional(),
  position_order: z.number().int().optional()
});

export type UpdateLinkInput = z.infer<typeof updateLinkInputSchema>;

export const deleteLinkInputSchema = z.object({
  id: z.number(),
  user_id: z.number()
});

export type DeleteLinkInput = z.infer<typeof deleteLinkInputSchema>;

export const getUserLinksInputSchema = z.object({
  user_id: z.number()
});

export type GetUserLinksInput = z.infer<typeof getUserLinksInputSchema>;

export const reorderLinksInputSchema = z.object({
  user_id: z.number(),
  link_orders: z.array(z.object({
    id: z.number(),
    position_order: z.number().int()
  }))
});

export type ReorderLinksInput = z.infer<typeof reorderLinksInputSchema>;

// Auth response schema
export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
