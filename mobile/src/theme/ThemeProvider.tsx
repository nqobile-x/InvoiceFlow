import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import { darkColors, lightColors, type ThemeColors } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeContextValue {
  scheme: "light" | "dark";
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  colors: ThemeColors;
  navigationTheme: NavigationTheme;
}

const PREF_KEY = "invoiceflow_theme_pref";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    SecureStore.getItemAsync(PREF_KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark" || saved === "system") {
          setPreferenceState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const scheme: "light" | "dark" =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const isDark = scheme === "dark";
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
    }
  }, [colors.bg, isDark]);

  function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
    SecureStore.setItemAsync(PREF_KEY, pref).catch(() => {});
  }

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = isDark ? NavDarkTheme : NavLightTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.accentText,
        background: colors.bg,
        card: colors.headerBg,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [isDark, colors]);

  const value = useMemo<ThemeContextValue>(
    () => ({ scheme, isDark, preference, setPreference, colors, navigationTheme }),
    [scheme, isDark, preference, colors, navigationTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
