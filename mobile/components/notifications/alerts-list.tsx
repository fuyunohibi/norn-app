import { Bell } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import type { Alert } from "@/database/types";
import { NornColors } from "@/theme";
import { Card } from "../ui/card";

type AlertsListProps = {
  alerts: Alert[];
  loading: boolean;
  markPending: boolean;
  onMarkRead: (id: string) => void;
  getSeverityColor: (severity: string) => string;
  getAlertTypeIcon: (type: string) => React.ReactNode;
};

export function AlertsList({
  alerts,
  loading,
  markPending,
  onMarkRead,
  getSeverityColor,
  getAlertTypeIcon,
}: AlertsListProps) {
  if (loading) {
    return (
      <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
        <View className="items-center py-10">
          <ActivityIndicator size="large" color={NornColors.brandOrange} />
          <Text className="mt-4 font-hell text-sm text-gray-600">Loading alerts…</Text>
        </View>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card variant="outlined" className="border-gray-100 bg-gray-50/80">
        <View className="items-center px-2 py-10">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Bell size={28} color="#9CA3AF" strokeWidth={2} />
          </View>
          <Text className="mt-4 text-center text-lg font-hell-round-bold text-gray-900">No alerts</Text>
          <Text className="mt-2 text-center font-hell text-sm leading-5 text-gray-600">
            You are up to date.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View className="gap-3">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          variant="outlined"
          className={`border-gray-100 bg-white ${alert.is_read ? "opacity-80" : ""}`}
        >
          <View className="flex-row items-start">
            <View
              className={`mr-3 h-11 w-11 items-center justify-center rounded-2xl ${getSeverityColor(alert.severity)}`}
            >
              {getAlertTypeIcon(alert.alert_type)}
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-base font-hell-round-bold text-gray-900">
                  {alert.title}
                </Text>
                {!alert.is_read ? (
                  <View
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: NornColors.brandOrange }}
                  />
                ) : null}
              </View>
              <Text className="mt-1 font-hell text-sm leading-5 text-gray-600">
                {alert.message}
              </Text>
              <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2">
                <Text className="font-hell text-xs text-gray-500">
                  {alert.created_at ? new Date(alert.created_at).toLocaleString() : ""}
                </Text>
                {!alert.is_read ? (
                  <TouchableOpacity
                    onPress={() => onMarkRead(alert.id)}
                    disabled={markPending}
                    activeOpacity={0.88}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5"
                  >
                    <Text className="text-xs font-hell-round-bold text-gray-800">Mark read</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}
