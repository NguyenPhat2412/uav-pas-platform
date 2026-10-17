import { apiClient } from '@/lib/api.client';
import { DashboardSummary } from '../types/dashboard.types';

export const dashboardService = {
  getSummary: () => apiClient.get<DashboardSummary>('/api/v1/dashboard/summary'),
};
