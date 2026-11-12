import {QueryClient, type UseMutationOptions} from '@tanstack/react-query';

export const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

type Subject = number | string | null | undefined;

/**
 * One shape for every cached server response: ['session', userId, feature, ...parts].
 * AuthProvider clears the whole cache on sign-out or account switch; invalidate a feature with queryKeys.feature().
 */
export const queryKeys = {
    of: (userId: Subject, feature: string, ...parts: unknown[]) => ['session', userId ?? 'anonymous', feature, ...parts] as const,
    feature: (userId: Subject, feature: string) => queryKeys.of(userId, feature),
    list: (userId: Subject, feature: string, page = 0) => queryKeys.of(userId, feature, 'list', page),
    detail: (userId: Subject, feature: string, id: number | string | undefined) => queryKeys.of(userId, feature, 'detail', id),
    history: (userId: Subject, feature: string, id?: number) => queryKeys.of(userId, feature, 'history', id),
};

/** What a component may add to a feature mutation: its own callbacks and meta, never the request itself. */
export type MutationOptions<TData, TVariables = void> = Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;

/** Runs the hook's cache work after a success, then the caller's onSuccess (awaited, as React Query does). */
export function afterSuccess<TData, TVariables>(
    options: MutationOptions<TData, TVariables> | undefined,
    effect: (data: TData, variables: TVariables) => unknown,
): NonNullable<MutationOptions<TData, TVariables>['onSuccess']> {
    return async (data, variables, result, context) => {
        await effect(data, variables);
        return options?.onSuccess?.(data, variables, result, context);
    };
}

/** For calls whose errors the component shows itself: no global error toast. */
export const QUIET = {suppressToast: true} as const;
