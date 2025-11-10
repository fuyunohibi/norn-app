import type { EmergencyContact } from "@/database/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  LogOut,
  Moon,
  Pencil,
  PhoneCall,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import Header from "../../components/ui/header";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../contexts/auth-context";
import { useEmergencyContacts } from "../../hooks/useEmergencyContacts";
import {
  emergencyContactFormSchema,
  EmergencyContactFormValues,
} from "../../schemas/emergency-contact.schema";

interface SettingsFormData {
  deviceName: string;
  refreshInterval: string;
  alertThreshold: string;
  sleepModeEnabled: boolean;
  fallDetectionEnabled: boolean;
  emergencyContact: string;
}

const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SettingsFormData>({
    defaultValues: {
      deviceName: "C1001 SEN0623",
      refreshInterval: "5",
      alertThreshold: "80",
      sleepModeEnabled: true,
      fallDetectionEnabled: true,
      emergencyContact: "",
    },
  });

  const fallbackUserId = "0b8baf9c-dcfa-4d11-93d5-a08ce06a3d61";

  const resolvedUserId = useMemo(() => user?.id ?? fallbackUserId, [user?.id]);

  const {
    contacts,
    isLoading: contactsLoading,
    isMutating: contactsMutating,
    createContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
  } = useEmergencyContacts(resolvedUserId);

  const {
    control: contactControl,
    handleSubmit: handleContactFormSubmit,
    reset: resetContactForm,
    formState: { errors: contactErrors, isSubmitting: isContactSubmitting },
  } = useForm<EmergencyContactFormValues>({
    resolver: zodResolver(emergencyContactFormSchema),
    defaultValues: {
      full_name: "",
      relationship: "",
      phone_number: "",
      priority: "1",
      is_primary: false,
      notes: "",
    },
  });

  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(
    null
  );

  const contactsHavePrimary = useMemo(
    () => contacts.some((contact) => contact.is_primary),
    [contacts]
  );

  const openContactModal = (contact?: EmergencyContact) => {
    if (contact) {
      resetContactForm({
        id: contact.id,
        full_name: contact.full_name,
        relationship: contact.relationship ?? "",
        phone_number: contact.phone_number,
        priority: String(contact.priority),
        is_primary: contact.is_primary,
        notes: contact.notes ?? "",
      });
      setEditingContact(contact);
    } else {
      resetContactForm({
        full_name: "",
        relationship: "",
        phone_number: "",
        priority: String(Math.min(contacts.length + 1, 5)),
        is_primary: !contactsHavePrimary,
        notes: "",
      });
      setEditingContact(null);
    }

    setContactModalVisible(true);
  };

  const closeContactModal = () => {
    setContactModalVisible(false);
    setEditingContact(null);
    resetContactForm();
  };

  const handleCallContact = async (phoneNumber: string) => {
    try {
      const sanitized = phoneNumber.replace(/[^+\d]/g, "");
      const telUrl = `tel:${sanitized}`;
      const canOpen = await Linking.canOpenURL(telUrl);

      if (!canOpen) {
        Alert.alert(
          "Call not supported",
          "This device cannot place calls automatically."
        );
        return;
      }

      await Linking.openURL(telUrl);
    } catch (error) {
      console.error("Error placing call:", error);
      Alert.alert("Call failed", "Unable to start the phone call.");
    }
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      "Remove contact",
      `Remove ${contact.full_name} from your emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deleteContact(contact.id)
              .then((success) => {
                if (!success) {
                  Alert.alert(
                    "Error",
                    "Failed to remove the contact. Please try again."
                  );
                }
              })
              .catch((error) => {
                console.error("Error removing contact:", error);
                Alert.alert(
                  "Error",
                  "Failed to remove the contact. Please try again."
                );
              });
          },
        },
      ]
    );
  };

  const handleSetPrimaryContact = async (contactId: string) => {
    try {
      await setPrimaryContact(contactId);
    } catch (error) {
      console.error("Error setting primary contact:", error);
      Alert.alert(
        "Error",
        "Unable to set this contact as primary. Please try again."
      );
    }
  };

  const onSubmitEmergencyContact = async (
    values: EmergencyContactFormValues
  ) => {
    const currentEditing = editingContact;
    const isEditing = Boolean(currentEditing);
    const normalizeOptional = (value?: string) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };
    const normalizedRelationship = normalizeOptional(values.relationship);
    const normalizedNotes = normalizeOptional(values.notes);
    const priorityNumber = Number(values.priority);
    const normalizedPriority = Number.isNaN(priorityNumber)
      ? 1
      : Math.min(Math.max(Math.round(priorityNumber), 1), 5);

    try {
      if (isEditing && currentEditing) {
        await updateContact({
          contactId: currentEditing.id,
          updates: {
            full_name: values.full_name,
            relationship: normalizedRelationship,
            phone_number: values.phone_number,
            notes: normalizedNotes,
            priority: normalizedPriority,
            is_primary: values.is_primary,
          },
        });

        if (values.is_primary) {
          await setPrimaryContact(currentEditing.id);
        } else if (currentEditing.is_primary && !values.is_primary) {
          const fallbackContact = contacts.find(
            (contact) => contact.id !== currentEditing.id
          );

          if (fallbackContact) {
            await setPrimaryContact(fallbackContact.id);
          }
        }
      } else {
        const newContact = await createContact({
          full_name: values.full_name,
          relationship: normalizedRelationship,
          phone_number: values.phone_number,
          notes: normalizedNotes,
          priority: normalizedPriority,
          is_primary: values.is_primary,
        });

        if (values.is_primary && newContact?.id) {
          await setPrimaryContact(newContact.id);
        }
      }

      closeContactModal();
      Alert.alert(
        "Success",
        isEditing
          ? "Emergency contact updated successfully."
          : "Emergency contact added."
      );
    } catch (error) {
      console.error("Failed to save emergency contact:", error);
      Alert.alert("Error", "We could not save this contact. Please try again.");
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      Alert.alert(
        "Settings Saved",
        "Your sensor configuration has been updated successfully.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save settings. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => reset(),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
        {
        text: "Sign Out",
        style: "destructive",
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Header
          title="Settings"
          subtitle="Configure your sensor preferences"
          showBackButton={true}
        />

        {/* User Info */}
        <Card variant="outlined" className="mb-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-hell-round-bold text-gray-900 ">
                {user?.email || "Guest User"}
              </Text>
              <Text className="text-gray-600 text-sm font-hell">
                {user ? "Authenticated" : "Not signed in"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center bg-red-50 px-6 py-4 rounded-xl"
            >
              <LogOut size={16} color="#dc2626" />
              <Text className="text-red-600 font-hell font-medium ml-2">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Monitoring Modes */}
        <Card variant="outlined" className="mb-6">
          <Text className="text-lg font-hell-round-bold text-gray-900 mb-4 ">
            Monitoring Modes
          </Text>

          <View className="gap-y-4">
            <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-accent rounded-lg items-center justify-center mr-3">
                  <Moon size={20} color="white" fill="white" />
                </View>
                <View>
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Sleep Mode
                  </Text>
                  <Text className="text-gray-600 text-sm font-hell">
                    Optimized for sleep monitoring
                  </Text>
                </View>
              </View>
              <Controller
                control={control}
                name="sleepModeEnabled"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: "#E5E7EB", true: "#FF7300" }}
                    thumbColor={value ? "#FFFFFF" : "#F3F4F6"}
                    ios_backgroundColor="#E5E7EB"
                  />
                )}
              />
            </View>

            <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary-button rounded-lg items-center justify-center mr-3">
                  <AlertTriangle size={20} color="white" />
                </View>
                <View>
                  <Text className="text-base font-hell-round-bold text-gray-900 ">
                    Fall Detection
                  </Text>
                  <Text className="text-gray-600 text-sm font-hell">
                    Emergency fall detection
                  </Text>
                </View>
              </View>
              <Controller
                control={control}
                name="fallDetectionEnabled"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: "#E5E7EB", true: "#FF7300" }}
                    thumbColor={value ? "#FFFFFF" : "#F3F4F6"}
                    ios_backgroundColor="#E5E7EB"
                  />
                )}
              />
            </View>
          </View>
        </Card>

        <Card variant="outlined" className="mb-6">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 pr-4">
              <Text className="text-lg font-hell-round-bold text-gray-900 ">
                Emergency Contacts
              </Text>
              <Text className="text-gray-600 text-sm font-hell mt-1">
                Quick actions will call or notify these contacts when a fall is
                detected.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => openContactModal()}
              disabled={contactsMutating}
              className="flex-row items-center bg-primary-accent px-4 py-3 rounded-2xl"
              activeOpacity={0.8}
            >
              <UserPlus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-white font-hell-round-bold text-sm ml-2">
                Add
          </Text>
            </TouchableOpacity>
          </View>

          {contactsLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#FF7300" />
              <Text className="text-gray-500 text-sm font-hell mt-3">
                Loading emergency contacts...
              </Text>
            </View>
          ) : contacts.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl p-6 items-center">
              <Text className="text-gray-700 font-hell-round-bold text-base">
                No contacts yet
              </Text>
              <Text className="text-gray-500 text-sm font-hell mt-2 text-center">
                Add trusted friends, family, or caregivers to reach out during
                emergencies.
              </Text>
              <Button
                title="Add Contact"
                variant="primary"
                size="sm"
                className="mt-4 px-8"
                onPress={() => openContactModal()}
                disabled={contactsMutating}
              />
            </View>
          ) : (
            <View className="gap-y-3">
              {contacts.map((contact) => (
                <View
                  key={contact.id}
                  className="bg-gray-50 rounded-2xl p-4 border border-gray-100"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center">
                        <Text className="text-base font-hell-round-bold text-gray-900 ">
                          {contact.full_name}
                        </Text>
                        {contact.is_primary && (
                          <View className="flex-row items-center bg-primary-accent/10 px-2 py-1 rounded-full ml-2">
                            <Star size={14} color="#FF7300" fill="#FF7300" />
                            <Text className="text-primary-accent text-xs font-hell ml-1">
                              Primary
                            </Text>
                          </View>
                        )}
                      </View>
                      {!!contact.relationship && (
                        <Text className="text-gray-500 text-xs font-hell uppercase mt-1">
                          {contact.relationship}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => handleCallContact(contact.phone_number)}
                        className="flex-row items-center mt-3"
                        activeOpacity={0.8}
                      >
                        <PhoneCall size={16} color="#FF7300" />
                        <Text className="text-primary-accent text-sm font-hell ml-2">
                          {contact.phone_number}
                        </Text>
                      </TouchableOpacity>
                      {!!contact.notes && (
                        <Text className="text-gray-500 text-xs font-hell mt-3 leading-4">
                          {contact.notes}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="flex-row flex-wrap items-center gap-2 mt-4">
                    <TouchableOpacity
                      onPress={() => openContactModal(contact)}
                      className="flex-row items-center px-3 py-2 rounded-full border border-gray-200 bg-white"
                      activeOpacity={0.8}
                    >
                      <Pencil size={14} color="#111827" strokeWidth={2.5} />
                      <Text className="text-gray-900 text-xs font-hell-round-bold ml-2">
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteContact(contact)}
                      className="flex-row items-center px-3 py-2 rounded-full border border-gray-200 bg-white"
                      activeOpacity={0.8}
                    >
                      <Trash2 size={14} color="#DC2626" strokeWidth={2.5} />
                      <Text className="text-red-600 text-xs font-hell-round-bold ml-2">
                        Remove
                      </Text>
                    </TouchableOpacity>

                    {!contact.is_primary && (
                      <TouchableOpacity
                        onPress={() => handleSetPrimaryContact(contact.id)}
                        className="flex-row items-center px-3 py-2 rounded-full border border-gray-200 bg-white"
                        activeOpacity={0.8}
                      >
                        <Star size={14} color="#FF7300" strokeWidth={2.5} />
                        <Text className="text-primary-accent text-xs font-hell-round-bold ml-2">
                          Make Primary
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View className="gap-y-3 mb-8">
          <Button
            title="Save Settings"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          />

          <Button
            title="Reset to Defaults"
            onPress={handleReset}
            variant="outline"
            size="lg"
            className="w-full"
          />
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>

      <Modal
        visible={isContactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeContactModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={closeContactModal}>
            <View className="flex-1 bg-black/50 justify-end">
              <TouchableWithoutFeedback onPress={() => {}}>
                <View className="bg-white rounded-[2.5rem] p-6 max-h-[85%]">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-xl font-hell-round-bold text-gray-900 ">
                      {editingContact
                        ? "Edit Emergency Contact"
                        : "Add Emergency Contact"}
                    </Text>
                    <TouchableOpacity
                      onPress={closeContactModal}
                      className="w-8 h-8 items-center justify-center rounded-full"
                    >
                      <Text className="text-2xl text-gray-400 font-hell">×</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="max-h-[70vh]"
                    keyboardShouldPersistTaps="handled"
                  >
                    <Controller
                      control={contactControl}
                      name="full_name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Full name"
                          placeholder="Enter contact name"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={contactErrors.full_name?.message}
                        />
                      )}
                    />

                    <Controller
                      control={contactControl}
                      name="relationship"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Relationship"
                          placeholder="e.g. Daughter, Neighbor, Caregiver"
                          value={value ?? ""}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={contactErrors.relationship?.message}
                        />
                      )}
                    />

                    <Controller
                      control={contactControl}
                      name="phone_number"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Phone number"
                          placeholder="099-999-9999"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="phone-pad"
                          error={contactErrors.phone_number?.message}
                        />
                      )}
                    />

                    <Controller
                      control={contactControl}
                      name="priority"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Priority (1 = highest)"
                          placeholder="1"
                          value={value ?? ""}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^0-9]/g, ""))
                          }
                          onBlur={onBlur}
                          keyboardType="number-pad"
                          error={contactErrors.priority?.message}
                        />
                      )}
                    />

                    <View className="bg-gray-50 rounded-2xl px-4 py-4 flex-row items-center justify-between mb-4">
                      <View className="flex-1 pr-4">
                        <Text className="text-base font-hell-round-bold text-gray-900 ">
                          Set as primary contact
                        </Text>
                        <Text className="text-gray-500 text-xs font-hell mt-1">
                          The primary contact is called first during fall alerts.
                        </Text>
                      </View>
                      <Controller
                        control={contactControl}
                        name="is_primary"
                        render={({ field: { value, onChange } }) => (
                          <Switch
                            value={value}
                            onValueChange={onChange}
                            trackColor={{ false: "#E5E7EB", true: "#FF7300" }}
                            thumbColor={value ? "#FFFFFF" : "#F3F4F6"}
                            ios_backgroundColor="#E5E7EB"
                          />
                        )}
                      />
                    </View>

                    <Controller
                      control={contactControl}
                      name="notes"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          label="Notes (optional)"
                          placeholder="Additional instructions or context"
                          value={value ?? ""}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          multiline
                          numberOfLines={3}
                          style={{ textAlignVertical: "top" }}
                          error={contactErrors.notes?.message}
                        />
                      )}
                    />

                    <View className="gap-y-3 mt-2">
                      <Button
                        title={editingContact ? "Save Changes" : "Save Contact"}
                        onPress={handleContactFormSubmit(onSubmitEmergencyContact)}
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={isContactSubmitting || contactsMutating}
                      />
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default SettingsScreen;
