/** Every Phase 1 cache belongs to the authenticated account. */
export const queryKeys = {
  feature: (userId: number | undefined, feature: string) => ['session', userId ?? 'anonymous', feature] as const,
  list: (userId: number | undefined, feature: string, page = 0) => [...queryKeys.feature(userId, feature), 'list', page] as const,
  detail: (userId: number | undefined, feature: string, id: number | undefined) => [...queryKeys.feature(userId, feature), 'detail', id] as const,
  history: (userId: number | undefined, feature: string, id?: number) => [...queryKeys.feature(userId, feature), 'history', id] as const,
};
