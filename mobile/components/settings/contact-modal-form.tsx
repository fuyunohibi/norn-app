import React from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { switchTrackColors } from "@/theme";
import type { CareBackupContactFormValues } from "@/schemas/care-backup-contact.schema";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type ContactModalFormProps = {
  contactControl: Control<CareBackupContactFormValues>;
  contactErrors: FieldErrors<CareBackupContactFormValues>;
  editingContact: boolean;
  isContactSubmitting: boolean;
  contactsMutating: boolean;
  bottomPadding: number;
  onSubmit: () => void;
};

export function ContactModalForm({
  contactControl,
  contactErrors,
  editingContact,
  isContactSubmitting,
  contactsMutating,
  bottomPadding,
  onSubmit,
}: ContactModalFormProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="max-h-[84vh]"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPadding }}
    >
      <Text className="mb-3 text-xs font-hell-round-bold uppercase tracking-wide text-gray-400">Details</Text>
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
            onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))}
            onBlur={onBlur}
            keyboardType="number-pad"
            error={contactErrors.priority?.message}
          />
        )}
      />

      <View className="mb-4 mt-1 overflow-hidden rounded-3xl border border-gray-200/90 bg-gray-50/80">
        <View className="flex-row items-center justify-between px-4 py-4">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-base font-hell-round-bold text-gray-900">Primary backup contact</Text>
            <Text className="mt-1 font-hell text-xs leading-4 text-gray-500">
              Used when the wearer has no phone number saved above.
            </Text>
          </View>
          <Controller
            control={contactControl}
            name="is_primary"
            render={({ field: { value, onChange } }) => (
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={switchTrackColors}
                thumbColor={value ? "#FFFFFF" : "#F3F4F6"}
                ios_backgroundColor="#E5E7EB"
              />
            )}
          />
        </View>
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

      <View className="mt-4 border-t border-gray-100 pt-5">
        <Button
          title={editingContact ? "Save changes" : "Save contact"}
          onPress={onSubmit}
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isContactSubmitting || contactsMutating}
        />
      </View>
    </ScrollView>
  );
}
