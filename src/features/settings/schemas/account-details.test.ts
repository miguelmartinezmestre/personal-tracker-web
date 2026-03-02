import { describe, expect, it } from 'vitest';
import { accountDetailsSchema } from './account-details';

describe('accountDetailsSchema', () => {
  it('accepts valid username and email', () => {
    const result = accountDetailsSchema.safeParse({
      username: 'john-doe',
      email: 'john@example.com',
    });

    expect(result.success).toBe(true);
  });

  it('rejects usernames shorter than 3 chars', () => {
    const result = accountDetailsSchema.safeParse({
      username: 'ab',
      email: 'john@example.com',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = accountDetailsSchema.safeParse({
      username: 'john-doe',
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);
  });
});
