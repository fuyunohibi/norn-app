import type { CareRecipientProfile } from '@/database/types';
import { supabase } from '@/utils/supabase';

export const fetchCareRecipientProfile = async (
  caregiverUserId: string,
): Promise<CareRecipientProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('care_recipient_profiles')
      .select('*')
      .eq('caregiver_user_id', caregiverUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching care recipient profile:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Error fetching care recipient profile:', e);
    return null;
  }
};

/** One row per caregiver: the person wearing the sensor (name + phone for quick dial). */
export const upsertCareRecipientProfile = async (
  caregiverUserId: string,
  payload: { full_name: string | null; phone_number: string | null },
): Promise<CareRecipientProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('care_recipient_profiles')
      .upsert(
        {
          caregiver_user_id: caregiverUserId,
          full_name: payload.full_name,
          phone_number: payload.phone_number,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'caregiver_user_id' },
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting care recipient profile:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Error upserting care recipient profile:', e);
    return null;
  }
};
