import type { Alert, AlertInsert } from '@/database/types';
import { supabase } from '@/utils/supabase';
import { backendAPIService } from './backend-api.service';

const alertLogThrottleMs = 25_000;
const lastAlertLogAt = new Map<string, number>();

function logAlertError(context: string, error: unknown) {
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  const now = Date.now();
  const prev = lastAlertLogAt.get(context) ?? 0;
  if (now - prev < alertLogThrottleMs) return;
  lastAlertLogAt.set(context, now);
  console.warn(
    `[alerts] ${context}:`,
    e?.message ?? error,
    e?.code ? `code=${e.code}` : '',
    e?.details ?? '',
  );
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
