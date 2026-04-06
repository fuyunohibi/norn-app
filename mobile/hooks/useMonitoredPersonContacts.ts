import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  MonitoredPersonContact,
  MonitoredPersonContactInsert,
  MonitoredPersonContactUpdate,
} from '@/database/types';
import {
  createMonitoredPersonContact,
  deleteMonitoredPersonContact,
  fetchMonitoredPersonContacts,
  setPrimaryMonitoredPersonContact,
  updateMonitoredPersonContact,
} from '@/actions/contact.actions';

const monitoredPersonContactsKey = (caregiverUserId: string) =>
  ['monitored-person-contacts', caregiverUserId] as const;

type CreatePayload = Omit<
  MonitoredPersonContactInsert,
  'caregiver_user_id' | 'id' | 'created_at' | 'updated_at'
>;
type UpdatePayload = Omit<MonitoredPersonContactUpdate, 'caregiver_user_id' | 'created_at'>;

export const useMonitoredPersonContacts = (caregiverUserId?: string) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(caregiverUserId);

  const contactsQuery = useQuery({
    queryKey: caregiverUserId
      ? monitoredPersonContactsKey(caregiverUserId)
      : ['monitored-person-contacts', 'anonymous'],
    queryFn: () => {
      if (!caregiverUserId) {
        return Promise.resolve<MonitoredPersonContact[]>([]);
      }

      return fetchMonitoredPersonContacts(caregiverUserId);
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePayload) => {
      if (!caregiverUserId) {
        throw new Error('User ID is required to create a contact');
      }
      return createMonitoredPersonContact(caregiverUserId, payload);
    },
    onSuccess: (_, __, context) => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: monitoredPersonContactsKey(caregiverUserId) });
      }
      return context;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ contactId, updates }: { contactId: string; updates: UpdatePayload }) =>
      updateMonitoredPersonContact(contactId, updates),
    onSuccess: () => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: monitoredPersonContactsKey(caregiverUserId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => deleteMonitoredPersonContact(contactId),
    onSuccess: () => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: monitoredPersonContactsKey(caregiverUserId) });
      }
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (contactId: string) => {
      if (!caregiverUserId) {
        throw new Error('User ID is required to set a primary contact');
      }
      return setPrimaryMonitoredPersonContact(caregiverUserId, contactId);
    },
    onSuccess: () => {
      if (caregiverUserId) {
        queryClient.invalidateQueries({ queryKey: monitoredPersonContactsKey(caregiverUserId) });
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
