import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function RegisterScreen() {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !password || !confirm) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background, paddingHorizontal: spacing[6] }]}>
        <Text variant="h2" style={styles.mb8}>Check your email</Text>
        <Text variant="body" muted style={{ textAlign: 'center' }}>
          We sent a confirmation link to {email}. Click it to activate your account.
        </Text>
        <Link href="/(auth)/login" style={styles.mt16}>
          <Text variant="bodyMd" color={colors.primary}>Back to Sign In</Text>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.container, { paddingHorizontal: spacing[6] }]} keyboardShouldPersistTaps="handled">
        <Text variant="h1" style={styles.title}>Create Account</Text>
        <Text variant="body" muted style={styles.subtitle}>Start managing your grocery lists</Text>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <Input
            label="Confirm Password"
            placeholder="Repeat password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          {error ? <Text variant="small" color={colors.destructive}>{error}</Text> : null}
          <Button label="Create Account" onPress={handleRegister} loading={loading} fullWidth />
        </View>

        <View style={styles.footer}>
          <Text variant="small" muted>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text variant="small" color={colors.primary}>Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, justifyContent: 'center', paddingVertical: 48 },
  title: { textAlign: 'center', marginBottom: 4 },
  subtitle: { textAlign: 'center', marginBottom: 32 },
  form: { gap: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  mb8: { marginBottom: 8 },
  mt16: { marginTop: 16 },
});
