import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { EmergencyContact } from "../database/types";
import { Button } from "./ui/button";

const DEFAULT_MESSAGE =
  "A fall was detected. Let us know you are safe or call for help.";

export type EmergencyQuickActionsModalProps = {
  visible: boolean;
  /** Context-specific copy; falls back to DEFAULT_MESSAGE when null */
  message: string | null;
  contacts: EmergencyContact[];
  contactsLoading: boolean;
  primaryContact: EmergencyContact | null;
  onDismiss: () => void;
  onImOk: () => void;
  onCallPrimary: () => void;
  onManageContacts: () => void;
  onCallContact: (phoneNumber: string, fullName: string) => void;
};

export function EmergencyQuickActionsModal({
  visible,
  message,
  contacts,
  contactsLoading,
  primaryContact,
  onDismiss,
  onImOk,
  onCallPrimary,
  onManageContacts,
  onCallContact,
}: EmergencyQuickActionsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 justify-end bg-black/50 p-7">
        <View className="bg-white rounded-[2.5rem] p-6 max-h-[75%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-hell-round-bold text-gray-900 ">
              Fall Quick Actions
            </Text>
            <TouchableOpacity
              onPress={onDismiss}
              className="w-8 h-8 items-center justify-center"
            >
              <Text className="text-2xl text-gray-400 font-hell">×</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-gray-600 text-sm font-hell mb-6">
            {message ?? DEFAULT_MESSAGE}
          </Text>
          <View className="gap-y-3">
            <Button title="I'm OK" variant="secondary" size="lg" onPress={onImOk} />
            <Button
              title={
                primaryContact
                  ? `Call ${primaryContact.full_name}`
                  : "Call primary contact"
              }
              variant="primary"
              size="lg"
              onPress={onCallPrimary}
              disabled={!primaryContact && contactsLoading}
            />
            <Button
              title="Manage Contacts"
              variant="outline"
              size="lg"
              onPress={onManageContacts}
            />
          </View>
          {contactsLoading ? (
            <View className="flex-row items-center mt-6">
              <ActivityIndicator size="small" color="#FF7300" />
              <Text className="text-gray-500 text-sm font-hell ml-3">
                Loading emergency contacts...
              </Text>
            </View>
          ) : (
            <ScrollView className="mt-6" showsVerticalScrollIndicator={false}>
              {contacts.length > 0 ? (
                <View className="gap-y-2">
                  {contacts.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      onPress={() =>
                        onCallContact(contact.phone_number, contact.full_name)
                      }
                      className="flex-row items-center justify-between bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100"
                      activeOpacity={0.85}
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-hell-round-bold text-gray-900 ">
                          {contact.full_name}
                        </Text>
                        <Text className="text-gray-600 text-xs font-hell mt-1">
                          {contact.phone_number}
                        </Text>
                      </View>
                      {contact.is_primary ? (
                        <View className="bg-primary-accent/10 px-3 py-1 rounded-full">
                          <Text className="text-primary-accent text-xs font-hell">
                            Primary
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="bg-gray-50 rounded-2xl px-4 py-5 border border-dashed border-gray-300">
                  <Text className="text-sm font-hell-round-bold text-gray-900 text-center">
                    No emergency contacts yet
                  </Text>
                  <Text className="text-gray-600 text-xs font-hell mt-2 text-center">
                    Add trusted contacts so you can reach them fast during an emergency.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
