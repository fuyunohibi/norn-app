import type {
  EmergencyContact,
  EmergencyContactInsert,
  EmergencyContactUpdate,
} from '@/database/types';
import { supabase } from '@/utils/supabase';

const TABLE_NAME = 'emergency_contacts';

const normalizeContact = (contact: EmergencyContact): EmergencyContact => ({
  ...contact,
});

export const fetchEmergencyContacts = async (userId: string): Promise<EmergencyContact[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching emergency contacts:', error);
      return [];
    }

    return (data ?? []).map(normalizeContact);
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return [];
  }
};

export const createEmergencyContact = async (
  userId: string,
  payload: Omit<EmergencyContactInsert, 'user_id'>
): Promise<EmergencyContact | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        ...payload,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating emergency contact:', error);
      return null;
    }

    return data ? normalizeContact(data) : null;
  } catch (error) {
    console.error('Error creating emergency contact:', error);
    return null;
  }
};

export const updateEmergencyContact = async (
  contactId: string,
  updates: EmergencyContactUpdate
): Promise<EmergencyContact | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      console.error('Error updating emergency contact:', error);
      return null;
    }

    return data ? normalizeContact(data) : null;
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return null;
  }
};

export const deleteEmergencyContact = async (contactId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error('Error deleting emergency contact:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return false;
  }
};

export const setPrimaryEmergencyContact = async (
  userId: string,
  contactId: string
): Promise<boolean> => {
  try {
    const { error: clearError } = await supabase
      .from(TABLE_NAME)
      .update({ is_primary: false })
      .eq('user_id', userId)
      .neq('id', contactId);

    if (clearError) {
      console.error('Error clearing primary contacts:', clearError);
      return false;
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        is_primary: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error setting primary contact:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting primary contact:', error);
    return false;
  }
};

