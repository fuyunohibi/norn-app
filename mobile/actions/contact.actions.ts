import type {
  CareBackupContact,
  CareBackupContactInsert,
  CareBackupContactUpdate,
} from '@/database/types';
import { supabase } from '@/utils/supabase';

const TABLE_NAME = 'care_backup_contacts';

const normalizeContact = (contact: CareBackupContact): CareBackupContact => ({
  ...contact,
});

export const fetchCareBackupContacts = async (
  caregiverUserId: string,
): Promise<CareBackupContact[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('caregiver_user_id', caregiverUserId)
      .order('is_primary', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching care backup contacts:', error);
      return [];
    }

    return (data ?? []).map(normalizeContact);
  } catch (error) {
    console.error('Error fetching care backup contacts:', error);
    return [];
  }
};

export const createCareBackupContact = async (
  caregiverUserId: string,
  payload: Omit<CareBackupContactInsert, 'caregiver_user_id'>,
): Promise<CareBackupContact | null> => {
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
      console.error('Error creating care backup contact:', error);
      return null;
    }

    return data ? normalizeContact(data) : null;
  } catch (error) {
    console.error('Error creating care backup contact:', error);
    return null;
  }
};

export const updateCareBackupContact = async (
  contactId: string,
  updates: CareBackupContactUpdate,
): Promise<CareBackupContact | null> => {
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
      console.error('Error updating care backup contact:', error);
      return null;
    }

    return data ? normalizeContact(data) : null;
  } catch (error) {
    console.error('Error updating care backup contact:', error);
    return null;
  }
};

export const deleteCareBackupContact = async (contactId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', contactId);

    if (error) {
      console.error('Error deleting care backup contact:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting care backup contact:', error);
    return false;
  }
};

export const setPrimaryCareBackupContact = async (
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
