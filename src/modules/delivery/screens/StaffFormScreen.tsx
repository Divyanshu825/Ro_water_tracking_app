import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { FormText } from '../../../components/forms/TextField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useStaffMember } from '../../../hooks/useData';
import { useNav, useParams } from '../../../navigation/hooks';
import { phoneStr } from '../../../utils/zodHelpers';

const schema = z.object({ name: z.string().trim().min(2, 'Enter the name'), phone: phoneStr, vehicle: z.string() });
type F = z.infer<typeof schema>;

export default function StaffFormScreen() {
  const nav = useNav();
  const params = useParams<'StaffForm'>();
  const s = useStaffMember(params?.id);
  const exec = useExec();
  const fb = useFeedback();
  const { control, handleSubmit } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { name: s?.name ?? '', phone: s?.phone ?? '', vehicle: s?.vehicle ?? '' } });
  const submit = handleSubmit((v) => {
    const r = exec({ t: 'staff.save', v: { id: s?.id, ...v } });
    if (!r.ok) return fb.error(r.error);
    fb.success(s ? 'Staff updated' : 'Staff added');
    nav.goBack();
  });
  return (
    <Screen scroll header={<Header title={s ? 'Edit staff' : 'Add staff'} />} footer={<Button title="Save" onPress={submit} />}>
      <Card style={{ gap: 14 }}>
        <FormText control={control} name="name" label="Full name" icon="user" autoCapitalize="words" />
        <FormText control={control} name="phone" label="Mobile number" icon="phone" keyboardType="phone-pad" />
        <FormText control={control} name="vehicle" label="Vehicle" icon="truck" placeholder="Reg. no · type" />
      </Card>
    </Screen>
  );
}
