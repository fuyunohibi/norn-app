import type {
    DeviceStatus,
    SensorDevice,
    SensorDeviceInsert,
    SensorDeviceUpdate,
} from '@/database/types';
import { supabase } from '@/utils/supabase';

// =============================================
// SENSOR DEVICE ACTIONS
// =============================================

export const getDevices = async (userId: string): Promise<SensorDevice[]> => {
  try {
    const { data, error } = await supabase
      .from('sensor_devices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching devices:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
};

export const getDevice = async (deviceId: string): Promise<SensorDevice | null> => {
  try {
    const { data, error } = await supabase
      .from('sensor_devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (error) {
      console.error('Error fetching device:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching device:', error);
    return null;
  }
};

export const createDevice = async (device: SensorDeviceInsert): Promise<SensorDevice | null> => {
  try {
    const { data, error } = await supabase
      .from('sensor_devices')
      .insert(device)
      .select()
      .single();

    if (error) {
      console.error('Error creating device:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating device:', error);
    return null;
  }
};

export const updateDevice = async (deviceId: string, updates: SensorDeviceUpdate): Promise<SensorDevice | null> => {
  try {
    const { data, error } = await supabase
      .from('sensor_devices')
      .update(updates)
      .eq('id', deviceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating device:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating device:', error);
    return null;
  }
};

export const deleteDevice = async (deviceId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('sensor_devices')
      .delete()
      .eq('id', deviceId);

    if (error) {
      console.error('Error deleting device:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting device:', error);
    return false;
  }
};

export const updateDeviceLastSeen = async (deviceId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('sensor_devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', deviceId);

    if (error) {
      console.error('Error updating last seen:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating last seen:', error);
    return false;
  }
};

// =============================================
// DEVICE STATUS (view: rows scoped by auth.uid() in SQL)
// =============================================

export const getDeviceStatus = async (_userId: string): Promise<DeviceStatus[]> => {
  try {
    const { data, error } = await supabase.from('device_status').select('*');

    if (error) {
      console.error('Error fetching device status:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching device status:', error);
    return [];
  }
};
