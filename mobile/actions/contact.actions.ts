import type {
  MonitoredPersonContact,
  MonitoredPersonContactInsert,
  MonitoredPersonContactUpdate,
} from '@/database/types';
import { supabase } from '@/utils/supabase';

const TABLE_NAME = 'monitored_person_contacts';

const normalizeContact = (contact: MonitoredPersonContact): MonitoredPersonContact => ({
  ...contact,
});

export const fetchMonitoredPersonContacts = async (
  caregiverUserId: string,
): Promise<MonitoredPersonContact[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('caregiver_user_id', caregiverUserId)
      .order('is_primary', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching monitored person contacts:', error);
      return [];
    }

    return (data ?? []).map(normalizeContact);
  } catch (error) {
    console.error('Error fetching monitored person contacts:', error);
    return [];
  }
};

export const createMonitoredPersonContact = async (
  caregiverUserId: string,
  payload: Omit<MonitoredPersonContactInsert, 'caregiver_user_id'>,
): Promise<MonitoredPersonContact | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        ...payload,
        caregiver_user_id: caregiverUserId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating monitored person contact:', error);
      return null;
    }

    return data ? normalizeContact(data) : null;
  } catch (error) {
    console.error('Error creating monitored person contact:', error);
    return null;
  }
};

export const updateMonitoredPersonContact = async (
  contactId: string,
  updates: MonitoredPersonContactUpdate,
): Promise<MonitoredPersonContact | null> => {
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
      console.error('Error updating monitored person contact:', error);
      return null;
    }

    return data ? normalizeContact(data) : null;
  } catch (error) {
    console.error('Error updating monitored person contact:', error);
    return null;
  }
};

export const deleteMonitoredPersonContact = async (contactId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', contactId);

    if (error) {
      console.error('Error deleting monitored person contact:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting monitored person contact:', error);
    return false;
  }
};

export const setPrimaryMonitoredPersonContact = async (
  caregiverUserId: string,
  contactId: string,
): Promise<boolean> => {
  try {
    const { error: clearError } = await supabase
      .from(TABLE_NAME)
      .update({ is_primary: false })
      .eq('caregiver_user_id', caregiverUserId)
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
      .eq('caregiver_user_id', caregiverUserId);

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
