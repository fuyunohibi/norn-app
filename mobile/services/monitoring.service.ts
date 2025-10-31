import type {
  Alert,
  AlertInsert,
  MonitoringSession,
  MonitoringSessionInsert
} from '@/database/types';
import { supabase } from '@/utils/supabase';

// =============================================
// ALERT ACTIONS
// =============================================

export const getAlerts = async (userId: string, limit = 50): Promise<Alert[]> => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
};

export const getUnreadAlerts = async (userId: string): Promise<Alert[]> => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unread alerts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching unread alerts:', error);
    return [];
  }
};

export const createAlert = async (alert: AlertInsert): Promise<Alert | null> => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert(alert)
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating alert:', error);
    return null;
  }
};

export const markAlertAsRead = async (alertId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return false;
  }
};

export const markAllAlertsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all alerts as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    return false;
  }
};

export const resolveAlert = async (alertId: string, resolvedBy: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ 
        is_resolved: true, 
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error resolving alert:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error resolving alert:', error);
    return false;
  }
};

// =============================================
// MONITORING SESSION ACTIONS
// =============================================

export const getActiveSessions = async (userId: string): Promise<MonitoringSession[]> => {
  try {
    const { data, error } = await supabase
      .from('monitoring_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
};

export const getSessionHistory = async (userId: string, limit = 50): Promise<MonitoringSession[]> => {
  try {
    const { data, error } = await supabase
      .from('monitoring_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching session history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching session history:', error);
    return [];
  }
};

export const startSession = async (session: MonitoringSessionInsert): Promise<MonitoringSession | null> => {
  try {
    const { data, error } = await supabase
      .from('monitoring_sessions')
      .insert(session)
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error starting session:', error);
    return null;
  }
};

export const endSession = async (sessionId: string, sessionData: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('monitoring_sessions')
      .update({ 
        end_time: new Date().toISOString(),
        is_active: false,
        session_data: sessionData
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
};

export const updateSessionStats = async (sessionId: string, stats: {
  total_readings?: number;
  movement_events?: number;
  fall_events?: number;
  average_sleep_quality?: number;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('monitoring_sessions')
      .update(stats)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session stats:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating session stats:', error);
    return false;
  }
};
