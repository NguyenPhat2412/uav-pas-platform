import {apiClient, API_ROUTES} from '@/lib/api';
import type {Operator, PageResponse} from '@/types/resources';

export const operatorsService = {
    listOperators: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Operator>>(`${API_ROUTES.users.list}?role=ROLE_OPERATOR&page=${page}&size=${size}`, {signal}),
};
