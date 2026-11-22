import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { motion, radius, spacing, touchTarget, typography } from "../theme/tokens";
import { NativeIcon } from "./NativeIcon";
import { haptics } from "../utils/haptics";

interface BottomSheetModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export function BottomSheetModal({
  visible,
  title,
  onClose,
  rightAction,
  children,
}: BottomSheetModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(motion.quickDuration)}
          exiting={reducedMotion ? undefined : FadeOut.duration(140)}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              haptics.light();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Close ${title}`}
          />
        </Animated.View>

        <Animated.View
          entering={
            reducedMotion
              ? undefined
              : SlideInDown.duration(motion.standardDuration).easing(Easing.out(Easing.cubic))
          }
          exiting={
            reducedMotion
              ? undefined
              : SlideOutDown.duration(motion.quickDuration).easing(Easing.in(Easing.cubic))
          }
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerRight}>
              {rightAction}
              <Pressable
                onPress={() => {
                  haptics.light();
                  onClose();
                }}
                hitSlop={touchTarget.hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <NativeIcon name="close" size={18} color={colors.textSecondary} decorative />
              </Pressable>
            </View>
          </View>

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
