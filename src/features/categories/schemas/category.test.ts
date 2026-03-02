import { describe, expect, it } from 'vitest';
import { categorySchema } from './category';

describe('categorySchema', () => {
  it('accepts a valid category', () => {
    const result = categorySchema.safeParse({
      name: 'Health',
      color: '#22AA44',
      icon: 'heart',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid hex color', () => {
    const result = categorySchema.safeParse({
      name: 'Health',
      color: 'red',
      icon: 'heart',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = categorySchema.safeParse({
      name: '',
      color: '#22AA44',
      icon: 'heart',
    });

    expect(result.success).toBe(false);
  });
});
