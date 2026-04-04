import type {
  Alert,
  AlertInsert,
  MonitoringSession,
  MonitoringSessionInsert
} from '@/database/types';
import { supabase } from '@/utils/supabase';
import { backendAPIService } from './backend-api.service';

function logAlertError(context: string, error: unknown) {
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  console.error(`Error ${context}:`, e?.message ?? error, e?.code ? `code=${e.code}` : '', e?.details ?? '');
}

// =============================================
// ALERT ACTIONS (via FastAPI + service role — matches IMU inserts, avoids client RLS issues)
// =============================================

export const getAlerts = async (userId: string, limit = 50): Promise<Alert[]> => {
  try {
    const res = await backendAPIService.listAlerts(userId, { limit });
    return res.alerts ?? [];
  } catch (error) {
    logAlertError('fetching alerts', error);
    return [];
  }
};

export const getUnreadAlerts = async (userId: string): Promise<Alert[]> => {
  try {
    const res = await backendAPIService.listAlerts(userId, { limit: 100, isRead: false });
    return res.alerts ?? [];
  } catch (error) {
    logAlertError('fetching unread alerts', error);
    return [];
  }
};

/** Prefer backend-driven flows; kept for rare client-side inserts. */
export const createAlert = async (alert: AlertInsert): Promise<Alert | null> => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert(alert)
      .select()
      .single();

    if (error) {
      logAlertError('creating alert', error);
      return null;
    }

    return data;
  } catch (error) {
    logAlertError('creating alert', error);
    return null;
  }
};

export const markAlertAsRead = async (alertId: string): Promise<boolean> => {
  try {
    await backendAPIService.patchAlert(alertId, { is_read: true });
    return true;
  } catch (error) {
    logAlertError('marking alert as read', error);
    return false;
  }
};

export const markAllAlertsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const unread = await getUnreadAlerts(userId);
    if (unread.length === 0) return true;
    await Promise.all(unread.map((a) => backendAPIService.patchAlert(a.id, { is_read: true })));
    return true;
  } catch (error) {
    logAlertError('marking all alerts as read', error);
    return false;
  }
};

export const resolveAlert = async (alertId: string, _resolvedBy: string): Promise<boolean> => {
  try {
    await backendAPIService.patchAlert(alertId, { is_resolved: true });
    return true;
  } catch (error) {
    logAlertError('resolving alert', error);
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
