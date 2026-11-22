import React from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { iconSize } from "../theme/tokens";

type MaterialName = React.ComponentProps<typeof MaterialIcons>["name"];

export type AppIconName =
  | "dashboard"
  | "dashboard-outline"
  | "invoices"
  | "invoices-outline"
  | "clients"
  | "clients-outline"
  | "settings"
  | "settings-outline"
  | "plus"
  | "search"
  | "close"
  | "clear"
  | "chevron-right"
  | "chevron-down"
  | "back"
  | "send"
  | "check-circle"
  | "delete"
  | "edit"
  | "share"
  | "download"
  | "more"
  | "eye"
  | "eye-off"
  | "alert"
  | "clock"
  | "draft"
  | "viewed"
  | "cancelled"
  | "business"
  | "bank"
  | "location"
  | "mail"
  | "phone"
  | "calendar"
  | "theme-system"
  | "theme-light"
  | "theme-dark"
  | "sign-out"
  | "refresh"
  | "info";

const ICON_MAP: Record<AppIconName, { sf: SFSymbol; material: MaterialName }> = {
  dashboard: { sf: "chart.bar.fill", material: "dashboard" },
  "dashboard-outline": { sf: "chart.bar", material: "space-dashboard" },
  invoices: { sf: "doc.text.fill", material: "receipt-long" },
  "invoices-outline": { sf: "doc.text", material: "receipt-long" },
  clients: { sf: "person.2.fill", material: "people" },
  "clients-outline": { sf: "person.2", material: "people-outline" },
  settings: { sf: "gearshape.fill", material: "settings" },
  "settings-outline": { sf: "gearshape", material: "settings" },
  plus: { sf: "plus", material: "add" },
  search: { sf: "magnifyingglass", material: "search" },
  close: { sf: "xmark", material: "close" },
  clear: { sf: "xmark.circle.fill", material: "cancel" },
  "chevron-right": { sf: "chevron.right", material: "chevron-right" },
  "chevron-down": { sf: "chevron.down", material: "keyboard-arrow-down" },
  back: { sf: "chevron.left", material: "arrow-back" },
  send: { sf: "paperplane.fill", material: "send" },
  "check-circle": { sf: "checkmark.circle.fill", material: "check-circle" },
  delete: { sf: "trash.fill", material: "delete-outline" },
  edit: { sf: "pencil", material: "edit" },
  share: { sf: "square.and.arrow.up", material: "share" },
  download: { sf: "arrow.down.doc", material: "picture-as-pdf" },
  more: { sf: "ellipsis", material: "more-vert" },
  eye: { sf: "eye", material: "visibility" },
  "eye-off": { sf: "eye.slash", material: "visibility-off" },
  alert: { sf: "exclamationmark.triangle.fill", material: "error-outline" },
  clock: { sf: "clock.fill", material: "schedule" },
  draft: { sf: "doc.badge.ellipsis", material: "edit-note" },
  viewed: { sf: "eye.fill", material: "visibility" },
  cancelled: { sf: "nosign", material: "block" },
  business: { sf: "building.2.fill", material: "business" },
  bank: { sf: "banknote.fill", material: "account-balance" },
  location: { sf: "mappin.and.ellipse", material: "location-on" },
  mail: { sf: "envelope.fill", material: "mail-outline" },
  phone: { sf: "phone.fill", material: "phone" },
  calendar: { sf: "calendar", material: "calendar-today" },
  "theme-system": { sf: "circle.lefthalf.filled", material: "brightness-auto" },
  "theme-light": { sf: "sun.max.fill", material: "light-mode" },
  "theme-dark": { sf: "moon.fill", material: "dark-mode" },
  "sign-out": { sf: "rectangle.portrait.and.arrow.right", material: "logout" },
  refresh: { sf: "arrow.clockwise", material: "refresh" },
  info: { sf: "info.circle", material: "info-outline" },
};

interface NativeIconProps {
  name: AppIconName;
  size?: number | keyof typeof iconSize;
  color: string;
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function NativeIcon({
  name,
  size = "md",
  color,
  decorative = true,
  accessibilityLabel,
  style,
}: NativeIconProps) {
  const px = typeof size === "number" ? size : iconSize[size];
  const entry = ICON_MAP[name];
  const a11yProps = decorative
    ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no" as const }
    : { accessible: true, accessibilityLabel };

  const fallback = (
    <MaterialIcons
      name={entry.material}
      size={px}
      color={color}
      {...a11yProps}
    />
  );

  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={entry.sf}
        size={px}
        tintColor={color}
        weight="medium"
        style={[{ width: px, height: px }, style]}
        fallback={fallback}
        {...a11yProps}
      />
    );
  }

  return fallback;
}
