import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CareBackupContact,
  CareBackupContactInsert,
  CareBackupContactUpdate,
} from '@/database/types';
import {
  createCareBackupContact,
  deleteCareBackupContact,
  fetchCareBackupContacts,
  setPrimaryCareBackupContact,
  updateCareBackupContact,
} from '@/actions/contact.actions';

const careBackupContactsKey = (caregiverUserId: string) =>
  ['care-backup-contacts', caregiverUserId] as const;

type CreatePayload = Omit<
  CareBackupContactInsert,
  'caregiver_user_id' | 'id' | 'created_at' | 'updated_at'
>;
type UpdatePayload = Omit<CareBackupContactUpdate, 'caregiver_user_id' | 'created_at'>;

export const useCareBackupContacts = (caregiverUserId?: string) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(caregiverUserId);

  const contactsQuery = useQuery({
    queryKey: caregiverUserId
      ? careBackupContactsKey(caregiverUserId)
      : ['care-backup-contacts', 'anonymous'],
    queryFn: () => {
      if (!caregiverUserId) {
        return Promise.resolve<CareBackupContact[]>([]);
      }

      return fetchCareBackupContacts(caregiverUserId);
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePayload) => {
      if (!caregiverUserId) {
        throw new Error('User ID is required to create a contact');
      }
      return createCareBackupContact(caregiverUserId, payload);
    },
    onSuccess: (_, __, context) => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: careBackupContactsKey(caregiverUserId) });
      }
      return context;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ contactId, updates }: { contactId: string; updates: UpdatePayload }) =>
      updateCareBackupContact(contactId, updates),
    onSuccess: () => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: careBackupContactsKey(caregiverUserId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => deleteCareBackupContact(contactId),
    onSuccess: () => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: careBackupContactsKey(caregiverUserId) });
      }
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (contactId: string) => {
      if (!caregiverUserId) {
        throw new Error('User ID is required to set a primary contact');
      }
      return setPrimaryCareBackupContact(caregiverUserId, contactId);
    },
    onSuccess: () => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: careBackupContactsKey(caregiverUserId) });
      }
    },
  });

  return {
    contacts: contactsQuery.data ?? [],
    isLoading: contactsQuery.isLoading,
    isFetching: contactsQuery.isFetching,
    refetch: contactsQuery.refetch,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    setPrimaryContact: setPrimaryMutation.mutateAsync,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      setPrimaryMutation.isPending,
    errors: {
      loadError: contactsQuery.error,
      createError: createMutation.error,
      updateError: updateMutation.error,
      deleteError: deleteMutation.error,
      setPrimaryError: setPrimaryMutation.error,
    },
  };
};
