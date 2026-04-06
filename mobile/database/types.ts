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

/** Backup contacts for the monitored person (sensor wearer); rows belong to the caregiver app account. */
export type MonitoredPersonContact = Tables<'monitored_person_contacts'>;
export type MonitoredPersonContactInsert = TablesInsert<'monitored_person_contacts'>;
export type MonitoredPersonContactUpdate = TablesUpdate<'monitored_person_contacts'>;

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

