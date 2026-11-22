import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../components/AuthLayout';
import { FormText } from '../../../components/forms/TextField';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { useFeedback } from '../../../components/common/Feedback';
import { useAppSelector } from '../../../store/hooks';
import { requestPasswordReset } from '../../../services/authService';
import { useNav } from '../../../navigation/hooks';

const schema = z.object({ email: z.string().trim().regex(/^\S+@\S+\.\S+$/, 'Enter a valid email') });

export default function ForgotPasswordScreen() {
  const nav = useNav();
  const fb = useFeedback();
  const accounts = useAppSelector((s) => s.auth.accounts);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit } = useForm<{ email: string }>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const submit = handleSubmit(async (v) => {
    setBusy(true);
    try { await requestPasswordReset(accounts, v.email); setSent(true); fb.success('Reset link sent', 'Check your inbox'); }
    catch (e) { fb.error(e instanceof Error ? e.message : 'Unable to send link'); }
    finally { setBusy(false); }
  });
  return (
    <AuthLayout back title="Forgot password?" subtitle="Enter your email and we'll send you a reset link.">
      <FormText control={control} name="email" label="Email" icon="mail" placeholder="you@business.com" autoCapitalize="none" keyboardType="email-address" />
      {sent ? <AppText color="success" v="bodyBold">Reset link sent (demo: no real email is sent).</AppText> : null}
      <Button title="Send reset link" onPress={submit} loading={busy} />
      <Button title="Back to sign in" variant="ghost" onPress={() => nav.goBack()} />
    </AuthLayout>
  );
}
