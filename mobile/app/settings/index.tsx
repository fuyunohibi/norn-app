import type { CareBackupContact } from "@/database/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Pencil, PhoneCall, Star, Trash2, User, UserPlus, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackScreenScaffold } from "../../components/layout";
import { AccountSummaryCard } from "../../components/settings/account-summary-card";
import { ContactModalForm } from "../../components/settings/contact-modal-form";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../contexts/auth-context";
import { useCareBackupContacts } from "../../hooks/useCareBackupContacts";
import { useCareRecipientProfile } from "../../hooks/useCareRecipientProfile";
import {
  careBackupContactFormSchema,
  CareBackupContactFormValues,
} from "../../schemas/care-backup-contact.schema";
import { NornColors, shadowStyles, switchTrackColors } from "@/theme";

const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const resolvedUserId = useMemo(() => user?.id, [user?.id]);

  const {
    contacts,
    isLoading: contactsLoading,
    isMutating: contactsMutating,
    createContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
  } = useCareBackupContacts(resolvedUserId);

  const {
    profile: careRecipientProfile,
    refetch: refetchCareRecipientProfile,
    upsertProfile: upsertCareRecipientProfile,
    isSavingProfile: savingMonitoredInfo,
    isLoading: careRecipientProfileLoading,
  } = useCareRecipientProfile(resolvedUserId);

  const [monitoredPersonName, setMonitoredPersonName] = useState("");
  const [monitoredPersonPhone, setMonitoredPersonPhone] = useState("");
  /** When false, show read-only summary + Edit; when true, show fields + Save / Cancel */
  const [monitoredDetailsEditing, setMonitoredDetailsEditing] = useState(false);
  const monitoredEditInitRef = useRef(false);

  useEffect(() => {
    if (careRecipientProfileLoading) return;
    setMonitoredPersonName(careRecipientProfile?.full_name ?? "");
    setMonitoredPersonPhone(careRecipientProfile?.phone_number ?? "");
  }, [careRecipientProfile, careRecipientProfileLoading]);

  /** First visit with no saved name/phone: open the form so it is obvious they can add details */
  useEffect(() => {
    if (!resolvedUserId || careRecipientProfileLoading || monitoredEditInitRef.current) return;
    monitoredEditInitRef.current = true;
    const hasAny =
      Boolean(careRecipientProfile?.full_name?.trim()) ||
      Boolean(careRecipientProfile?.phone_number?.trim());
    if (!hasAny) {
      setMonitoredDetailsEditing(true);
    }
  }, [careRecipientProfile, careRecipientProfileLoading, resolvedUserId]);

  const hasMonitoredDetailsSaved = useMemo(() => {
    return (
      Boolean(careRecipientProfile?.full_name?.trim()) ||
      Boolean(careRecipientProfile?.phone_number?.trim())
    );
  }, [careRecipientProfile]);

  const {
    control: contactControl,
    handleSubmit: handleContactFormSubmit,
    reset: resetContactForm,
    formState: { errors: contactErrors, isSubmitting: isContactSubmitting },
  } = useForm<CareBackupContactFormValues>({
    resolver: zodResolver(careBackupContactFormSchema),
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
  const [editingContact, setEditingContact] = useState<CareBackupContact | null>(null);

  const contactsHavePrimary = useMemo(
    () => contacts.some((contact) => contact.is_primary),
    [contacts]
  );

  const openContactModal = (contact?: CareBackupContact) => {
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

  const handleDeleteContact = (contact: CareBackupContact) => {
    Alert.alert(
      "Remove contact",
      `Remove ${contact.full_name} from backup contacts?`,
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

  /** Persists to Supabase `care_recipient_profiles` (person wearing the sensor). */
  const handleSaveMonitoredPersonInfo = async () => {
    if (!resolvedUserId) return;
    try {
      const name = monitoredPersonName.trim();
      const phone = monitoredPersonPhone.trim();
      const result = await upsertCareRecipientProfile({
        full_name: name.length > 0 ? name : null,
        phone_number: phone.length > 0 ? phone : null,
      });
      if (!result) {
        Alert.alert("Error", "Could not save. Please try again.");
        return;
      }
      await refetchCareRecipientProfile();
      setMonitoredDetailsEditing(false);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save. Please try again.");
    }
  };

  const handleCancelMonitoredPersonEdit = () => {
    setMonitoredPersonName(careRecipientProfile?.full_name ?? "");
    setMonitoredPersonPhone(careRecipientProfile?.phone_number ?? "");
    setMonitoredDetailsEditing(false);
  };

  const onSubmitCareBackupContact = async (values: CareBackupContactFormValues) => {
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
        isEditing ? "Contact updated." : "Contact added."
      );
    } catch (error) {
      console.error("Failed to save contact:", error);
      Alert.alert("Error", "We could not save this contact. Please try again.");
    }
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
    <>
      <StackScreenScaffold
        hero={{
          title: "Settings",
          subtitle: "Account and the person you monitor with NORN.",
        }}
      >
          <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-orange-600">
            Account
          </Text>
          <Text className="mt-1 text-lg font-hell-round-bold text-gray-900">
            Signed in as
          </Text>

          <AccountSummaryCard email={user?.email} onSignOut={handleLogout} />

          <Text className="mb-2 mt-10 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-orange-600">
            Monitored person
          </Text>
          <Text className="text-lg font-hell-round-bold text-orange-950">
            Person wearing the sensor
          </Text>
          <Text className="mt-1 font-hell text-sm leading-5 text-stone-600">
            The clip is on them; you use this app to respond when something happens. Add their name
            and number so you can call them from fall alerts.
          </Text>

          <Card
            variant="outlined"
            className="mt-4 border-orange-200/90 bg-orange-50/50"
            style={shadowStyles.card}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-base font-hell-round-bold text-orange-950">Their details</Text>
                <Text className="text-stone-700 text-sm font-hell mt-1 leading-5">
                  Shown on the main call button when a fall is detected.
                </Text>
              </View>
              {!monitoredDetailsEditing ? (
                <TouchableOpacity
                  onPress={() => setMonitoredDetailsEditing(true)}
                  className="flex-row items-center rounded-2xl border border-orange-300/90 bg-white px-3.5 py-2.5 active:opacity-90"
                  activeOpacity={0.88}
                >
                  <Pencil size={16} color={NornColors.brandOrange} strokeWidth={2.2} />
                  <Text className="ml-1.5 font-hell-round-bold text-sm text-[#C2410C]">Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {monitoredDetailsEditing ? (
              <>
                <Input
                  label="Name (optional)"
                  placeholder="e.g. Mom"
                  value={monitoredPersonName}
                  onChangeText={setMonitoredPersonName}
                  containerClassName="mt-4"
                />
                <Input
                  label="Phone number"
                  placeholder="Number to reach the person wearing the clip"
                  value={monitoredPersonPhone}
                  onChangeText={setMonitoredPersonPhone}
                  keyboardType="phone-pad"
                  containerClassName="mt-1"
                />
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <Button
                    title={savingMonitoredInfo ? "Saving…" : "Save"}
                    variant="primary"
                    size="sm"
                    className="px-6"
                    onPress={handleSaveMonitoredPersonInfo}
                    disabled={savingMonitoredInfo || !resolvedUserId}
                  />
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="sm"
                    className="px-6"
                    onPress={handleCancelMonitoredPersonEdit}
                    disabled={savingMonitoredInfo}
                  />
                </View>
              </>
            ) : (
              <View className="mt-4 rounded-2xl border border-orange-200/80 bg-white/90 px-4 py-3.5">
                <Text className="text-xs font-hell-round-bold uppercase tracking-wide text-[#EA580C]">
                  Name
                </Text>
                <Text className="mt-1 text-base font-hell-round-bold text-stone-900">
                  {monitoredPersonName.trim() ? monitoredPersonName.trim() : "—"}
                </Text>
                <Text className="mt-3 text-xs font-hell-round-bold uppercase tracking-wide text-[#EA580C]">
                  Phone
                </Text>
                <Text className="mt-1 text-base font-hell-round-bold text-stone-900">
                  {monitoredPersonPhone.trim() ? monitoredPersonPhone.trim() : "—"}
                </Text>
                {!hasMonitoredDetailsSaved ? (
                  <Text className="mt-3 text-xs font-hell leading-5 text-orange-900/85">
                    Tap Edit to add their name and number for fall quick-calls.
                  </Text>
                ) : null}
              </View>
            )}
          </Card>

          <Text className="mb-2 mt-10 text-xs font-hell-round-bold uppercase tracking-[0.08em] text-orange-600">
            Safety
          </Text>
          <Text className="text-lg font-hell-round-bold text-orange-950">
            Backup contacts
          </Text>
          <Text className="mt-1 font-hell text-sm leading-5 text-stone-600">
            Family, neighbors, or others to call if you cannot reach the person wearing the sensor.
          </Text>

          <Card
            variant="outlined"
            className="mt-4 border-orange-100/80 bg-white"
            style={shadowStyles.card}
          >
          <View className="flex-row items-start justify-between gap-3 mb-4">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-hell-round-bold text-orange-950">
                Backup list
              </Text>
              <Text className="text-stone-600 text-sm font-hell mt-1 leading-5">
                Used from home when you need another number besides the wearer.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => openContactModal()}
              disabled={contactsMutating}
              className="flex-row items-center rounded-2xl bg-primary-accent px-4 py-3 active:opacity-90"
              activeOpacity={0.88}
            >
              <UserPlus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-white font-hell-round-bold text-sm ml-2">
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {contactsLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color={NornColors.brandOrange} />
              <Text className="text-gray-500 text-sm font-hell mt-3">
                Loading backup contacts...
              </Text>
            </View>
          ) : contacts.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl p-6 items-center">
              <Text className="text-gray-700 font-hell-round-bold text-base">
                No contacts yet
              </Text>
              <Text className="text-gray-500 text-sm font-hell mt-2 text-center">
                Add people to call if you cannot reach the person wearing the sensor.
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
            <View className="gap-y-4">
              {contacts.map((contact) => (
                <View
                  key={contact.id}
                  className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white"
                  style={shadowStyles.card}
                >
                  <View className="flex-row gap-3 p-4">
                    <View className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-100/90 bg-orange-50/90">
                      <User size={26} color={NornColors.brandOrange} fill={NornColors.brandOrange} strokeWidth={2.2} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-lg font-hell-round-bold text-gray-900">
                          {contact.full_name}
                        </Text>
                        {contact.is_primary ? (
                          <View className="flex-row items-center rounded-full border border-orange-200/60 bg-orange-50 px-2.5 py-1">
                            <Star size={12} color={NornColors.brandOrange} fill={NornColors.brandOrange} />
                            <Text className="ml-1 text-xs font-hell-round-bold text-primary-accent">
                              Primary backup
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {!!contact.relationship && (
                        <View className="mt-2 self-start rounded-full bg-gray-100 px-2.5 py-1">
                          <Text className="text-xs font-hell text-gray-600">
                            {contact.relationship}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => handleCallContact(contact.phone_number)}
                        className="mt-3 flex-row items-center rounded-2xl border border-gray-200/80 bg-gray-50/90 px-3 py-2.5 active:bg-gray-100/90"
                        activeOpacity={0.85}
                      >
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                          <PhoneCall size={18} color={NornColors.brandOrange} strokeWidth={2.2} />
                        </View>
                        <Text className="ml-3 flex-1 text-sm font-hell-round-bold text-gray-900">
                          {contact.phone_number}
                        </Text>
                        <Text className="text-xs font-hell-round-bold text-primary-accent">Call</Text>
                      </TouchableOpacity>
                      {!!contact.notes && (
                        <View className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                          <Text className="text-xs font-hell leading-4 text-gray-600">
                            {contact.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-2 border-t border-gray-100 bg-gray-50/70 px-3 py-3">
                    <TouchableOpacity
                      onPress={() => openContactModal(contact)}
                      className="flex-row items-center rounded-full border border-gray-200 bg-white px-3.5 py-2 shadow-sm"
                      activeOpacity={0.85}
                    >
                      <Pencil size={14} color="#111827" strokeWidth={2.5} />
                      <Text className="ml-2 text-xs font-hell-round-bold text-gray-900">Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteContact(contact)}
                      className="flex-row items-center rounded-full border border-red-100 bg-white px-3.5 py-2 shadow-sm"
                      activeOpacity={0.85}
                    >
                      <Trash2 size={14} color="#DC2626" strokeWidth={2.5} />
                      <Text className="ml-2 text-xs font-hell-round-bold text-red-600">Remove</Text>
                    </TouchableOpacity>

                    {!contact.is_primary && (
                      <TouchableOpacity
                        onPress={() => handleSetPrimaryContact(contact.id)}
                        className="flex-row items-center rounded-full border border-orange-200/70 bg-white px-3.5 py-2 shadow-sm"
                        activeOpacity={0.85}
                      >
                        <Star size={14} color={NornColors.brandOrange} strokeWidth={2.5} />
                        <Text className="ml-2 text-xs font-hell-round-bold text-primary-accent">
                          Make primary
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </StackScreenScaffold>

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
            <View className="flex-1 justify-end bg-black/45">
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  className="max-h-[96%] min-h-[52%] overflow-hidden border-t border-gray-100 bg-white"
                  style={shadowStyles.modalSheet}
                >
                  <View className="items-center pt-3 pb-1">
                    <View className="h-1 w-12 rounded-full bg-gray-300/90" />
                  </View>

                  <View className="flex-row items-start justify-between gap-3 px-5 pb-4 pt-2">
                    <View className="min-w-0 flex-1">
                      <Text className="text-xl font-hell-round-bold text-gray-900">
                        {editingContact ? "Edit contact" : "New contact"}
                      </Text>
                      <Text className="mt-1 font-hell text-sm leading-5 text-gray-500">
                        {editingContact
                          ? "Update details or change who is primary backup."
                          : "Someone to call if you cannot reach the person wearing the sensor."}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={closeContactModal}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 active:bg-gray-200"
                      activeOpacity={0.85}
                    >
                      <X size={20} color="#4B5563" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  <ContactModalForm
                    contactControl={contactControl}
                    contactErrors={contactErrors}
                    editingContact={Boolean(editingContact)}
                    isContactSubmitting={isContactSubmitting}
                    contactsMutating={contactsMutating}
                    bottomPadding={Math.max(insets.bottom, 16) + 20}
                    onSubmit={handleContactFormSubmit(onSubmitCareBackupContact)}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default SettingsScreen;
