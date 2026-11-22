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
import { validateEmail, validatePassword } from "../../src/utils/validation";

const logoLight = require("../../assets/splash-icon-light.png");
const logoDark = require("../../assets/splash-icon-dark.png");

export default function LoginScreen() {
  const { login } = useAuthStore();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailError = touched.email ? validateEmail(email) : undefined;
  const passwordError = touched.password ? validatePassword(password, 1) : undefined;

  async function handleLogin() {
    setServerError("");
    setTouched({ email: true, password: true });
    const eErr = validateEmail(email);
    const pErr = validatePassword(password, 1);
    if (eErr || pErr) {
      haptics.warning();
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.login({
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
      setServerError("Invalid email or password. Please check your details and try again.");
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
            paddingTop: Math.max(insets.top + 24, 48),
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
          <Text style={[s.brandTitle, { color: colors.text }]}>InvoiceFlow</Text>
          <Text style={[s.brandSub, { color: colors.textSecondary }]}>
            Sign in to manage invoices and clients
          </Text>
        </View>

        <View
          style={[
            s.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
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

          <FormField
            label="Email"
            required
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (serverError) setServerError("");
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
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
            onChangeText={(v) => {
              setPassword(v);
              if (serverError) setServerError("");
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            placeholder="Enter your password"
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />

          <NativePressable
            haptic="medium"
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityState={{ busy: loading, disabled: loading }}
            style={[s.primaryBtn, { backgroundColor: colors.accent }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[s.primaryBtnText, { color: colors.onAccent }]}>Sign In</Text>
            )}
          </NativePressable>
        </View>

        <Link href="/(auth)/register" asChild>
          <NativePressable
            haptic="selection"
            disableScale
            accessibilityRole="link"
            style={s.footerLink}
          >
            <Text style={[s.footerText, { color: colors.textSecondary }]}>
              No account yet?{" "}
              <Text style={[s.footerAccent, { color: colors.accentText }]}>Create one</Text>
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
    marginBottom: spacing.xl,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoImg: {
    width: 48,
    height: 48,
  },
  brandTitle: {
    ...typography.display,
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
