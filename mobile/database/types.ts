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

export type DeviceStatus = Tables<'device_status'>;

export type EmergencyContact = Tables<'emergency_contacts'>;
export type EmergencyContactInsert = TablesInsert<'emergency_contacts'>;
export type EmergencyContactUpdate = TablesUpdate<'emergency_contacts'>;

export type MonitoringSession = Tables<'monitoring_sessions'>;
export type MonitoringSessionInsert = TablesInsert<'monitoring_sessions'>;
export type MonitoringSessionUpdate = TablesUpdate<'monitoring_sessions'>;

export type SensorConfiguration = Tables<'sensor_configurations'>;
export type SensorConfigurationInsert = TablesInsert<'sensor_configurations'>;
export type SensorConfigurationUpdate = TablesUpdate<'sensor_configurations'>;

export type SensorDevice = Tables<'sensor_devices'>;
export type SensorDeviceInsert = TablesInsert<'sensor_devices'>;
export type SensorDeviceUpdate = TablesUpdate<'sensor_devices'>;

export type SensorReading = Tables<'sensor_readings'>;
export type SensorReadingInsert = TablesInsert<'sensor_readings'>;
export type SensorReadingUpdate = TablesUpdate<'sensor_readings'>;

export type UserDashboard = Tables<'user_dashboard'>;

export type UserPreferences = Tables<'user_preferences'>;
export type UserPreferencesInsert = TablesInsert<'user_preferences'>;
export type UserPreferencesUpdate = TablesUpdate<'user_preferences'>;

export type UserProfile = Tables<'users'>;
export type UserProfileInsert = TablesInsert<'users'>;
export type UserProfileUpdate = TablesUpdate<'users'>;

