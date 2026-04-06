import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CareRecipientProfile } from '@/database/types';
import {
  fetchCareRecipientProfile,
  upsertCareRecipientProfile,
} from '@/actions/care-recipient.actions';

const careRecipientProfileKey = (caregiverUserId: string) =>
  ['care-recipient-profile', caregiverUserId] as const;

export const useCareRecipientProfile = (caregiverUserId?: string) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(caregiverUserId);

  const profileQuery = useQuery({
    queryKey: caregiverUserId
      ? careRecipientProfileKey(caregiverUserId)
      : ['care-recipient-profile', 'anonymous'],
    queryFn: () => {
      if (!caregiverUserId) {
        return Promise.resolve<CareRecipientProfile | null>(null);
      }
      return fetchCareRecipientProfile(caregiverUserId);
    },
    enabled,
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: { full_name: string | null; phone_number: string | null }) => {
      if (!caregiverUserId) {
        throw new Error('User ID is required');
      }
      return upsertCareRecipientProfile(caregiverUserId, payload);
    },
    onSuccess: () => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: careRecipientProfileKey(caregiverUserId) });
      }
    },
  });

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    isFetching: profileQuery.isFetching,
    refetch: profileQuery.refetch,
    upsertProfile: upsertMutation.mutateAsync,
    isSavingProfile: upsertMutation.isPending,
    saveError: upsertMutation.error,
  };
};
