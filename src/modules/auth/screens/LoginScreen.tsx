import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../components/AuthLayout';
import { FormText } from '../../../components/forms/TextField';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { WaterLoader } from '../../../components/common/WaterLoader';
import { useFeedback } from '../../../components/common/Feedback';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authActions } from '../../../store/authSlice';
import { login } from '../../../services/authService';
import { useNav } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').regex(/^\S+@\S+\.\S+$/, 'Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type F = z.infer<typeof schema>;

export default function LoginScreen() {
  const nav = useNav();
  const c = useTheme();
  const dispatch = useAppDispatch();
  const accounts = useAppSelector((s) => s.auth.accounts);
  const fb = useFeedback();
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, setValue } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const submit = handleSubmit(async (v) => {
    setBusy(true);
    try {
      const user = await login(accounts, v.email, v.password);
      dispatch(authActions.setUser(user));
      nav.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      fb.error(e instanceof Error ? e.message : 'Unable to sign in', 'Sign in failed');
    } finally { setBusy(false); }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage deliveries, stock and payments.">
      <FormText control={control} name="email" label="Email" icon="mail" placeholder="you@business.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <FormText control={control} name="password" label="Password" icon="lock" placeholder="Your password" secure autoCapitalize="none" />
      <AppText v="label" color="secondary" align="right" onPress={() => nav.navigate('ForgotPassword')} accessibilityRole="button">Forgot password?</AppText>
      <Button title="Sign in" icon="log-in" onPress={submit} loading={busy} />
      <Button title="Use demo account" variant="soft" onPress={() => { setValue('email', 'owner@aquapure.in'); setValue('password', 'demo1234'); }} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <AppText color="textMuted">New to Bottle Track?</AppText>
        <AppText color="secondary" style={{ fontWeight: '700' }} onPress={() => nav.navigate('Register')} accessibilityRole="button">Create account</AppText>
      </View>
      <Modal transparent visible={busy} animationType="fade">
        <View style={{ flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: c.surface, borderRadius: 24, padding: 24 }}><WaterLoader label="Signing you in…" /></View>
        </View>
      </Modal>
    </AuthLayout>
  );
}
