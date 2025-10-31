-- NORN App Database Schemas
-- C1001 SEN0623 mmWave Human Detection Sensor App
-- Supabase PostgreSQL Database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SENSOR DEVICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sensor_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_id VARCHAR(50) UNIQUE NOT NULL, -- C1001 device identifier
    mac_address VARCHAR(17),
    firmware_version VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SENSOR CONFIGURATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sensor_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES sensor_devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Sleep Mode Configuration
    sleep_sensitivity INTEGER DEFAULT 5 CHECK (sleep_sensitivity >= 1 AND sleep_sensitivity <= 10),
    sleep_detection_range DECIMAL(5,2) DEFAULT 2.0, -- meters
    sleep_alert_threshold INTEGER DEFAULT 30, -- minutes of no movement
    
    -- Fall Detection Configuration
    fall_sensitivity INTEGER DEFAULT 7 CHECK (fall_sensitivity >= 1 AND fall_sensitivity <= 10),
    fall_detection_range DECIMAL(5,2) DEFAULT 3.0, -- meters
    fall_alert_delay INTEGER DEFAULT 10, -- seconds before alert
    
    -- General Settings
    auto_mode_switch BOOLEAN DEFAULT false,
    emergency_contacts JSONB DEFAULT '[]'::jsonb,
    notification_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SENSOR READINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES sensor_devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reading Data
    reading_type VARCHAR(20) NOT NULL CHECK (reading_type IN ('sleep', 'fall', 'movement', 'presence')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Sensor Values
    distance DECIMAL(5,2), -- distance in meters
    movement_intensity DECIMAL(3,2), -- 0.0 to 1.0
    confidence_score DECIMAL(3,2), -- 0.0 to 1.0
    
    -- Processed Data
    is_person_detected BOOLEAN DEFAULT false,
    is_movement_detected BOOLEAN DEFAULT false,
    is_fall_detected BOOLEAN DEFAULT false,
    sleep_quality_score INTEGER CHECK (sleep_quality_score >= 1 AND sleep_quality_score <= 10),
    
    -- Metadata
    raw_data JSONB, -- store raw sensor data
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ALERTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES sensor_devices(id) ON DELETE CASCADE,
    
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('fall', 'no_movement', 'device_offline', 'low_battery')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    
    -- Alert Data
    alert_data JSONB, -- additional context data
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SESSIONS TABLE (for tracking monitoring sessions)
-- =============================================
CREATE TABLE IF NOT EXISTS monitoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES sensor_devices(id) ON DELETE CASCADE,
    
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('sleep', 'fall_monitoring', 'general')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- Session Statistics
    total_readings INTEGER DEFAULT 0,
    movement_events INTEGER DEFAULT 0,
    fall_events INTEGER DEFAULT 0,
    average_sleep_quality DECIMAL(3,2),
    
    -- Session Data
    session_data JSONB, -- aggregated session data
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER PREFERENCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Notification Preferences
    push_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    
    -- App Settings
    auto_backup BOOLEAN DEFAULT true,
    backup_frequency VARCHAR(20) DEFAULT 'daily' CHECK (backup_frequency IN ('hourly', 'daily', 'weekly')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Sensor devices indexes
CREATE INDEX IF NOT EXISTS idx_sensor_devices_user_id ON sensor_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_devices_device_id ON sensor_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_devices_active ON sensor_devices(is_active);

-- Sensor configurations indexes
CREATE INDEX IF NOT EXISTS idx_sensor_configurations_device_id ON sensor_configurations(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_configurations_user_id ON sensor_configurations(user_id);

-- Sensor readings indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_id ON sensor_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_type ON sensor_readings(reading_type);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_detected ON sensor_readings(is_person_detected, is_movement_detected, is_fall_detected);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- Monitoring sessions indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_user_id ON monitoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_device_id ON monitoring_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_type ON monitoring_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_active ON monitoring_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_time ON monitoring_sessions(start_time, end_time);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sensor devices policies
CREATE POLICY "Users can view own devices" ON sensor_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON sensor_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON sensor_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON sensor_devices
    FOR DELETE USING (auth.uid() = user_id);

-- Sensor configurations policies
CREATE POLICY "Users can view own configurations" ON sensor_configurations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configurations" ON sensor_configurations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configurations" ON sensor_configurations
    FOR UPDATE USING (auth.uid() = user_id);

-- Sensor readings policies
CREATE POLICY "Users can view own readings" ON sensor_readings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own readings" ON sensor_readings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE USING (auth.uid() = user_id);

-- Monitoring sessions policies
CREATE POLICY "Users can view own sessions" ON monitoring_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON monitoring_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON monitoring_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensor_devices_updated_at BEFORE UPDATE ON sensor_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensor_configurations_updated_at BEFORE UPDATE ON sensor_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_sessions_updated_at BEFORE UPDATE ON monitoring_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, username, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
    );
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for user dashboard data
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.id as profile_id,
    u.username,
    u.full_name,
    u.avatar_url,
    COUNT(DISTINCT sd.id) as device_count,
    COUNT(DISTINCT CASE WHEN sd.is_active THEN sd.id END) as active_devices,
    COUNT(DISTINCT a.id) as unread_alerts,
    MAX(sr.timestamp) as last_reading_time
FROM users u
LEFT JOIN sensor_devices sd ON u.user_id = sd.user_id
LEFT JOIN alerts a ON u.user_id = a.user_id AND a.is_read = false
LEFT JOIN sensor_readings sr ON u.user_id = sr.user_id
WHERE u.user_id = auth.uid()
GROUP BY u.id, u.username, u.full_name, u.avatar_url;

-- View for device status
CREATE OR REPLACE VIEW device_status AS
SELECT 
    sd.id,
    sd.device_name,
    sd.device_id,
    sd.is_active,
    sd.last_seen,
    sc.sleep_sensitivity,
    sc.fall_sensitivity,
    COUNT(DISTINCT sr.id) as total_readings,
    COUNT(DISTINCT CASE WHEN sr.timestamp > NOW() - INTERVAL '1 hour' THEN sr.id END) as recent_readings,
    MAX(sr.timestamp) as last_reading
FROM sensor_devices sd
LEFT JOIN sensor_configurations sc ON sd.id = sc.device_id
LEFT JOIN sensor_readings sr ON sd.id = sr.device_id
WHERE sd.user_id = auth.uid()
GROUP BY sd.id, sd.device_name, sd.device_id, sd.is_active, sd.last_seen, sc.sleep_sensitivity, sc.fall_sensitivity;
