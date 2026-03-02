import { describe, expect, it } from 'vitest';
import { notificationSchema } from './notification';

describe('notificationSchema', () => {
  it('accepts valid notification payload', () => {
    const result = notificationSchema.safeParse({
      objective: 'Objective A',
      notificationType: 'deadline',
      notificationDate: new Date('2026-01-01T10:00:00.000Z'),
      message: 'Deadline tomorrow',
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown notification type', () => {
    const result = notificationSchema.safeParse({
      objective: 'Objective A',
      notificationType: 'invalid-type',
      notificationDate: new Date('2026-01-01T10:00:00.000Z'),
      message: 'Deadline tomorrow',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty objective and message', () => {
    const result = notificationSchema.safeParse({
      objective: '',
      notificationType: 'deadline',
      notificationDate: new Date('2026-01-01T10:00:00.000Z'),
      message: '',
    });

    expect(result.success).toBe(false);
  });
});
