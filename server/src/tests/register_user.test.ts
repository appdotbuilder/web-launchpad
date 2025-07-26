
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  display_name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testInput);

    // Validate user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.display_name).toEqual('Test User');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate token
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify token can be decoded
    const decoded = JSON.parse(atob(result.token));
    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.exp).toBeGreaterThan(Date.now());
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];

    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.display_name).toEqual('Test User');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123'); // Should be hashed

    // Verify password was hashed correctly using Bun's password verification
    const isValidPassword = await Bun.password.verify('password123', savedUser.password_hash);
    expect(isValidPassword).toBe(true);
  });

  it('should reject duplicate email registration', async () => {
    // Register first user
    await registerUser(testInput);

    // Attempt to register same email again
    await expect(registerUser(testInput)).rejects.toThrow(/email already registered/i);
  });

  it('should not return password hash in response', async () => {
    const result = await registerUser(testInput);

    // Ensure password_hash is not included in the response
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should create different hashes for same password', async () => {
    const input1 = { ...testInput, email: 'user1@example.com' };
    const input2 = { ...testInput, email: 'user2@example.com' };

    await registerUser(input1);
    await registerUser(input2);

    // Get both users from database
    const users = await db.select()
      .from(usersTable)
      .execute();

    expect(users).toHaveLength(2);
    expect(users[0].password_hash).not.toEqual(users[1].password_hash);
  });

  it('should generate valid token with correct expiration', async () => {
    const result = await registerUser(testInput);

    // Decode and verify token structure
    const decoded = JSON.parse(atob(result.token));
    
    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.exp).toBeGreaterThan(Date.now());
    expect(decoded.exp).toBeLessThan(Date.now() + 25 * 60 * 60 * 1000); // Less than 25 hours
  });
});
