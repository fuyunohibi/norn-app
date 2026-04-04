import { useQuery } from '@tanstack/react-query';
import { backendAPIService, type ActivityPeriod } from '../services/backend-api.service';

export const useActivityStatistics = (
  userId: string | undefined,
  period: ActivityPeriod = 'today',
) => {
  return useQuery({
    queryKey: ['activity-statistics', userId, period],
    queryFn: () => backendAPIService.getActivityStatistics(userId!, period),
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
};
