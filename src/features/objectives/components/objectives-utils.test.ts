import { describe, expect, it } from 'vitest';
import { computeObjectiveProgressPercent, normalizeObjective } from './objectives-utils';

describe('normalizeObjective', () => {
  it('normalizes objective with simplified fields', () => {
    const normalized = normalizeObjective({
      _id: 'obj_1',
      userId: 'user_1',
      organizationId: 'org_1',
      scope: 'personal',
      title: 'Test objective',
      description: null,
      category: null,
      targetValue: 100,
      currentValue: 25,
      startValue: 0,
      deadline: null,
      status: 'active',
      unit: 'pts',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as never);

    expect(normalized.scope).toBe('personal');
    expect(normalized.status).toBe('active');
    expect(normalized.startValue).toBe(0);
  });
});

describe('computeObjectiveProgressPercent', () => {
  it('computes progress from start value', () => {
    const percent = computeObjectiveProgressPercent({
      currentValue: 50,
      targetValue: 100,
      startValue: 0,
    });

    expect(percent).toBe(50);
  });

  it('clamps progress between 0 and 100', () => {
    const over = computeObjectiveProgressPercent({
      currentValue: 1000,
      targetValue: 100,
      startValue: 0,
    });
    const under = computeObjectiveProgressPercent({
      currentValue: -100,
      targetValue: 100,
      startValue: 0,
    });

    expect(over).toBe(100);
    expect(under).toBe(0);
  });
});
