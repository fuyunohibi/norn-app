import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EmergencyContact,
  EmergencyContactInsert,
  EmergencyContactUpdate,
} from '@/database/types';
import {
  createEmergencyContact,
  deleteEmergencyContact,
  fetchEmergencyContacts,
  setPrimaryEmergencyContact,
  updateEmergencyContact,
} from '@/actions/contact.actions';

const emergencyContactsKey = (userId: string) => ['emergency-contacts', userId] as const;

type CreatePayload = Omit<EmergencyContactInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>;
type UpdatePayload = Omit<EmergencyContactUpdate, 'user_id' | 'created_at'>;

export const useEmergencyContacts = (userId?: string) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(userId);

  const contactsQuery = useQuery({
    queryKey: userId ? emergencyContactsKey(userId) : ['emergency-contacts', 'anonymous'],
    queryFn: () => {
      if (!userId) {
        return Promise.resolve<EmergencyContact[]>([]);
      }

      return fetchEmergencyContacts(userId);
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePayload) => {
      if (!userId) {
        throw new Error('User ID is required to create an emergency contact');
      }
      return createEmergencyContact(userId, payload);
    },
    onSuccess: (_, __, context) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: emergencyContactsKey(userId) });
      }
      return context;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ contactId, updates }: { contactId: string; updates: UpdatePayload }) =>
      updateEmergencyContact(contactId, updates),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: emergencyContactsKey(userId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => deleteEmergencyContact(contactId),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: emergencyContactsKey(userId) });
      }
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (contactId: string) => {
      if (!userId) {
        throw new Error('User ID is required to set a primary contact');
      }
      return setPrimaryEmergencyContact(userId, contactId);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: emergencyContactsKey(userId) });
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

