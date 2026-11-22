import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  type TextInput,
} from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { authApi } from "../../src/services/apiMethods";
import { useAuthStore } from "../../src/store/auth";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, spacing, touchTarget, typography } from "../../src/theme/tokens";
import { FormField } from "../../src/components/FormField";
import { NativePressable } from "../../src/components/NativePressable";
import { NativeIcon } from "../../src/components/NativeIcon";
import { haptics } from "../../src/utils/haptics";
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from "../../src/utils/validation";

const logoLight = require("../../assets/splash-icon-light.png");
const logoDark = require("../../assets/splash-icon-dark.png");

export default function RegisterScreen() {
  const { login } = useAuthStore();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const firstErr = touched.firstName ? validateRequired(firstName, "First name") : undefined;
  const lastErr = touched.lastName ? validateRequired(lastName, "Last name") : undefined;
  const emailErr = touched.email ? validateEmail(email) : undefined;
  const passErr = touched.password ? validatePassword(password, 8) : undefined;

  async function handleRegister() {
    setServerError("");
    setTouched({ firstName: true, lastName: true, email: true, password: true });

    if (
      validateRequired(firstName, "First name") ||
      validateRequired(lastName, "Last name") ||
      validateEmail(email) ||
      validatePassword(password, 8)
    ) {
      haptics.warning();
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      haptics.success();
      await login(
        {
          id: data.userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          hasBusinessProfile: data.hasBusinessProfile,
        },
        data.accessToken,
        data.refreshToken
      );
    } catch {
      haptics.error();
      setServerError("Registration failed. This email may already be registered.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          {
            paddingTop: Math.max(insets.top + 20, 40),
            paddingBottom: Math.max(insets.bottom + 24, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brandHeader}>
          <View
            style={[
              s.logoWrap,
              {
                backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Image
              source={isDark ? logoDark : logoLight}
              style={s.logoImg}
              resizeMode="contain"
              accessibilityLabel="InvoiceFlow logo"
            />
          </View>
          <Text style={[s.brandTitle, { color: colors.text }]}>Create Account</Text>
          <Text style={[s.brandSub, { color: colors.textSecondary }]}>
            Start sending VAT-ready South African invoices
          </Text>
        </View>

        <View
          style={[
            s.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {serverError ? (
            <View
              style={[s.errorBanner, { backgroundColor: colors.dangerBg }]}
              accessibilityRole="alert"
            >
              <NativeIcon name="alert" size={18} color={colors.danger} decorative />
              <Text style={[s.errorText, { color: colors.danger }]}>{serverError}</Text>
            </View>
          ) : null}

          <View style={s.row}>
            <View style={s.half}>
              <FormField
                label="First Name"
                required
                value={firstName}
                onChangeText={setFirstName}
                onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                error={firstErr}
                placeholder="Nqobile"
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => lastNameRef.current?.focus()}
                editable={!loading}
              />
            </View>
            <View style={s.half}>
              <FormField
                ref={lastNameRef}
                label="Last Name"
                required
                value={lastName}
                onChangeText={setLastName}
                onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
                error={lastErr}
                placeholder="Sibiya"
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!loading}
              />
            </View>
          </View>

          <FormField
            ref={emailRef}
            label="Email"
            required
            value={email}
            onChangeText={setEmail}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailErr}
            placeholder="you@business.co.za"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />

          <FormField
            ref={passwordRef}
            label="Password"
            required
            isPassword
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passErr}
            helperText="Minimum 8 characters"
            placeholder="Create a strong password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            editable={!loading}
          />

          <NativePressable
            haptic="medium"
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
            accessibilityState={{ busy: loading, disabled: loading }}
            style={[s.primaryBtn, { backgroundColor: colors.accent }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[s.primaryBtnText, { color: colors.onAccent }]}>Create Account</Text>
            )}
          </NativePressable>
        </View>

        <Link href="/(auth)/login" asChild>
          <NativePressable
            haptic="selection"
            disableScale
            accessibilityRole="link"
            style={s.footerLink}
          >
            <Text style={[s.footerText, { color: colors.textSecondary }]}>
              Already have an account?{" "}
              <Text style={[s.footerAccent, { color: colors.accentText }]}>Sign in</Text>
            </Text>
          </NativePressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoImg: {
    width: 42,
    height: 42,
  },
  brandTitle: {
    ...typography.title,
    marginBottom: 4,
  },
  brandSub: {
    ...typography.callout,
    textAlign: "center",
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  half: { flex: 1 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    fontWeight: "500",
    flex: 1,
  },
  primaryBtn: {
    minHeight: touchTarget.minHeight + 2,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  primaryBtnText: {
    ...typography.headline,
  },
  footerLink: {
    marginTop: spacing.lg,
    minHeight: touchTarget.minHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  footerText: {
    ...typography.callout,
  },
  footerAccent: {
    fontWeight: "700",
  },
});
