import React, { forwardRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, touchTarget, typography } from "../theme/tokens";
import { NativeIcon } from "./NativeIcon";
import { haptics } from "../utils/haptics";

export interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  {
    label,
    error,
    helperText,
    required,
    isPassword,
    containerStyle,
    style,
    onFocus,
    onBlur,
    secureTextEntry,
    editable = true,
    ...rest
  },
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = isPassword ? !showPassword : secureTextEntry;
  const borderColor = error
    ? colors.danger
    : focused
      ? colors.borderFocus
      : colors.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      </View>

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.inputBg,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            opacity: editable ? 1 : 0.65,
          },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={isSecure}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityHint={error ?? helperText}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.text },
            rest.multiline && styles.multiline,
            style,
          ]}
        />

        {isPassword ? (
          <Pressable
            onPress={() => {
              haptics.selection();
              setShowPassword((prev) => !prev);
            }}
            hitSlop={touchTarget.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            style={styles.trailingBtn}
          >
            <NativeIcon
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={colors.textMuted}
              decorative
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <NativeIcon name="alert" size={14} color={colors.danger} decorative />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    ...typography.eyebrow,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.sm,
    minHeight: touchTarget.minHeight,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 11,
    fontSize: 16,
    lineHeight: 22,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  trailingBtn: {
    minWidth: touchTarget.minWidth,
    minHeight: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  errorText: {
    ...typography.caption,
    fontWeight: "500",
    flex: 1,
  },
  helperText: {
    ...typography.caption,
    marginTop: 5,
  },
});
