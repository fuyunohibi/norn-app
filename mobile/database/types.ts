import type {
  Database,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '../types/database.types';

export type { Database, Enums, Tables, TablesInsert, TablesUpdate };

export type Alert = Tables<'alerts'>;
export type AlertInsert = TablesInsert<'alerts'>;
export type AlertUpdate = TablesUpdate<'alerts'>;

export type ActivityEvent = Tables<'activity_events'>;
export type ActivityEventInsert = TablesInsert<'activity_events'>;
export type ActivityEventUpdate = TablesUpdate<'activity_events'>;

export type DeviceStatus = Tables<'device_status'>;

/** Backup numbers the caregiver can call if they cannot reach the person wearing the sensor. */
export type CareBackupContact = Tables<'care_backup_contacts'>;
export type CareBackupContactInsert = TablesInsert<'care_backup_contacts'>;
export type CareBackupContactUpdate = TablesUpdate<'care_backup_contacts'>;

/** The person wearing the sensor (one profile row per caregiver). */
export type CareRecipientProfile = Tables<'care_recipient_profiles'>;
export type CareRecipientProfileInsert = TablesInsert<'care_recipient_profiles'>;
export type CareRecipientProfileUpdate = TablesUpdate<'care_recipient_profiles'>;

export type DailyStatistic = Tables<'daily_statistics'>;
export type DailyStatisticInsert = TablesInsert<'daily_statistics'>;
export type DailyStatisticUpdate = TablesUpdate<'daily_statistics'>;

export type SensorDevice = Tables<'sensor_devices'>;
export type SensorDeviceInsert = TablesInsert<'sensor_devices'>;
export type SensorDeviceUpdate = TablesUpdate<'sensor_devices'>;

export type UserDashboard = Tables<'user_dashboard'>;

export type UserPreferences = Tables<'user_preferences'>;
export type UserPreferencesInsert = TablesInsert<'user_preferences'>;
export type UserPreferencesUpdate = TablesUpdate<'user_preferences'>;

export type UserProfile = Tables<'users'>;
export type UserProfileInsert = TablesInsert<'users'>;
export type UserProfileUpdate = TablesUpdate<'users'>;

