import type { QueryClient, QueryKey } from '@tanstack/react-query';

type ConvexQueryDescriptor = {
    queryKey: QueryKey;
};

type QueryArgs = Record<string, unknown>;

function getConvexQueryPrefix({ queryKey }: ConvexQueryDescriptor): QueryKey {
    return queryKey.slice(0, 2);
}

function isRecord(value: unknown): value is QueryArgs {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function invalidateConvexQuery(queryClient: QueryClient, descriptor: ConvexQueryDescriptor) {
    return queryClient.invalidateQueries({
        queryKey: getConvexQueryPrefix(descriptor),
    });
}

export function invalidateConvexQueryWhere(
    queryClient: QueryClient,
    descriptor: ConvexQueryDescriptor,
    matchesArgs: (args: QueryArgs) => boolean
) {
    const [queryKind, functionName] = getConvexQueryPrefix(descriptor);

    return queryClient.invalidateQueries({
        predicate: query => {
            const [candidateKind, candidateFunctionName, candidateArgs] = query.queryKey;
            if (candidateKind !== queryKind || candidateFunctionName !== functionName) {
                return false;
            }

            return matchesArgs(isRecord(candidateArgs) ? candidateArgs : {});
        },
    });
}
