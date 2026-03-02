import { describe, expect, it } from 'vitest';
import { organizationSchema } from './organization';

describe('organizationSchema', () => {
  it('accepts valid organization payload', () => {
    const result = organizationSchema.safeParse({
      name: 'Acme Org',
      description: 'Main organization for testing',
    });

    expect(result.success).toBe(true);
  });

  it('rejects non-string name', () => {
    const result = organizationSchema.safeParse({
      name: 123,
      description: 'Main organization for testing',
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-string description', () => {
    const result = organizationSchema.safeParse({
      name: 'Acme Org',
      description: null,
    });

    expect(result.success).toBe(false);
  });
});
