
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const registerUser = async (input: RegisterUserInput): Promise<AuthResponse> => {
  try {
    // Check if email is already taken
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Create new user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        display_name: input.display_name
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate simple JWT-like token (in production, use proper JWT library)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    const token = btoa(JSON.stringify(tokenPayload));

    // Return user data without password hash
    return {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};
