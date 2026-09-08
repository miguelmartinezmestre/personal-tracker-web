import { act, renderHook } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useFormSubmit } from './use-form-submit';

test('coalesces repeated submissions while pending and releases the lock after failure', async () => {
    let rejectRequest: (error: Error) => void = () => undefined;
    const operation = vi.fn(
        () =>
            new Promise<void>((_resolve, reject) => {
                rejectRequest = reject;
            })
    );
    const { result } = renderHook(() => useFormSubmit(operation));
    let pending: Promise<void> | undefined;
    await act(async () => {
        pending = result.current.submit('first');
        await result.current.submit('duplicate');
    });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);
    await act(async () => {
        const rejected = expect(pending).rejects.toThrow('Temporary failure');
        rejectRequest(new Error('Temporary failure'));
        await rejected;
    });
    expect(result.current.isSubmitting).toBe(false);
    operation.mockResolvedValueOnce(undefined);
    await act(async () => {
        await result.current.submit('retry');
    });
    expect(operation).toHaveBeenCalledTimes(2);
});
