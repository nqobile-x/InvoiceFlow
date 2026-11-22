import React from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { motion } from "../theme/tokens";
import { haptics } from "../utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface NativePressableProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  haptic?: "none" | "selection" | "light" | "medium";
  rippleColor?: string;
  rippleBorderless?: boolean;
  disableScale?: boolean;
}

export function NativePressable({
  style,
  haptic = "none",
  rippleColor,
  rippleBorderless = false,
  disableScale = false,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}: NativePressableProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : opacity.value,
  }));

  function handlePressIn(e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) {
    if (!disabled) {
      if (!disableScale && !reducedMotion) {
        scale.value = withTiming(motion.pressScale, {
          duration: motion.pressDuration,
          easing: Easing.out(Easing.cubic),
        });
      }
      if (Platform.OS === "ios") {
        opacity.value = withTiming(0.86, { duration: motion.pressDuration });
      }
    }
    onPressIn?.(e);
  }

  function handlePressOut(e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) {
    scale.value = withTiming(1, {
      duration: motion.quickDuration,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, { duration: motion.quickDuration });
    onPressOut?.(e);
  }

  function handlePress(e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) {
    if (disabled) return;
    if (haptic === "selection") haptics.selection();
    else if (haptic === "light") haptics.light();
    else if (haptic === "medium") haptics.medium();
    onPress?.(e);
  }

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      android_ripple={
        Platform.OS === "android" && !disabled
          ? {
              color: rippleColor ?? colors.ripple,
              borderless: rippleBorderless,
              foreground: true,
            }
          : undefined
      }
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
