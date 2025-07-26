
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test input
const testLoginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create user first with hashed password
    const hashedPassword = await Bun.password.hash(testLoginInput.password);
    await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        password_hash: hashedPassword,
        display_name: 'Test User'
      })
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify user data
    expect(result.user.email).toEqual(testLoginInput.email);
    expect(result.user.display_name).toEqual('Test User');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should throw error for non-existent email', async () => {
    const nonExistentInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    await expect(loginUser(nonExistentInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create user with different password
    const hashedPassword = await Bun.password.hash('correctpassword');
    await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        password_hash: hashedPassword,
        display_name: 'Test User'
      })
      .execute();

    const wrongPasswordInput: LoginUserInput = {
      email: testLoginInput.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(wrongPasswordInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should not return password hash in response', async () => {
    // Create user
    const hashedPassword = await Bun.password.hash(testLoginInput.password);
    await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        password_hash: hashedPassword,
        display_name: 'Test User'
      })
      .execute();

    const result = await loginUser(testLoginInput);

    // Ensure password_hash is not in the response
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should generate unique tokens for different login sessions', async () => {
    // Create user
    const hashedPassword = await Bun.password.hash(testLoginInput.password);
    await db.insert(usersTable)
      .values({
        email: testLoginInput.email,
        password_hash: hashedPassword,
        display_name: 'Test User'
      })
      .execute();

    const result1 = await loginUser(testLoginInput);
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    const result2 = await loginUser(testLoginInput);

    expect(result1.token).not.toEqual(result2.token);
  });
});
