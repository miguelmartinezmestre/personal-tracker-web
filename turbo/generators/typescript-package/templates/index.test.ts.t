import { hello } from './index';

describe('hello', () => {
  it('should return a greeting message', () => {
    const result = hello('World');
    expect(result).toBe('Hello, World!');
  });

  it('should work with different names', () => {
    const result = hello('TypeScript');
    expect(result).toBe('Hello, TypeScript!');
  });
});

