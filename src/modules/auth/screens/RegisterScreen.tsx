import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../components/AuthLayout';
import { FormText } from '../../../components/forms/TextField';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { useFeedback } from '../../../components/common/Feedback';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authActions } from '../../../store/authSlice';
import { settingsActions } from '../../../store/settingsSlice';
import { register } from '../../../services/authService';
import { useNav } from '../../../navigation/hooks';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  business: z.string().trim().min(2, 'Enter your business name'),
  email: z.string().trim().regex(/^\S+@\S+\.\S+$/, 'Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type F = z.infer<typeof schema>;

export default function RegisterScreen() {
  const nav = useNav();
  const dispatch = useAppDispatch();
  const fb = useFeedback();
  const accounts = useAppSelector((s) => s.auth.accounts);
  const business = useAppSelector((s) => s.settings.business);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const { control, handleSubmit } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { name: '', business: '', email: '', password: '', confirm: '' } });

  const submit = handleSubmit(async (v) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const acc = await register(accounts, v);
      dispatch(authActions.addAccount(acc));
      const { password: _p, ...user } = acc;
      dispatch(authActions.setUser(user));
      dispatch(settingsActions.patch({ business: { ...business, name: acc.business, email: acc.email } }));
      fb.success('Account created', `Welcome, ${acc.name.split(' ')[0]}!`);
      nav.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      fb.error(e instanceof Error ? e.message : 'Unable to register', 'Registration failed');
    } finally { submitting.current = false; setBusy(false); }
  });

  return (
    <AuthLayout back title="Create your account" subtitle="Set up your water business in a minute.">
      <FormText control={control} name="name" label="Your name" icon="user" placeholder="Full name" autoCapitalize="words" />
      <FormText control={control} name="business" label="Business name" icon="briefcase" placeholder="e.g. Crystal Aqua Supplies" autoCapitalize="words" />
      <FormText control={control} name="email" label="Email" icon="mail" placeholder="you@business.com" autoCapitalize="none" keyboardType="email-address" />
      <FormText control={control} name="password" label="Password" icon="lock" placeholder="At least 6 characters" secure autoCapitalize="none" />
      <FormText control={control} name="confirm" label="Confirm password" icon="lock" placeholder="Repeat password" secure autoCapitalize="none" />
      <Button title="Create account" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <AppText color="textMuted">Already registered?</AppText>
        <AppText color="secondary" style={{ fontWeight: '700' }} onPress={() => nav.goBack()} accessibilityRole="button">Sign in</AppText>
      </View>
    </AuthLayout>
  );
}
