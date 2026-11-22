import React from 'react';
import { View } from 'react-native';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { FormText } from '../../../components/forms/TextField';
import { FormSelect } from '../../../components/forms/SelectField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useCustomer } from '../../../hooks/useData';
import { useNav, useParams } from '../../../navigation/hooks';
import { CUSTOMER_TYPES } from '../../../types/domain';
import { phoneStr } from '../../../utils/zodHelpers';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the customer name'),
  phone: phoneStr,
  email: z.string().trim().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
  type: z.string().min(1, 'Select a type'),
  notes: z.string(),
  addresses: z.array(z.object({ id: z.string().optional(), label: z.string().trim().min(1, 'Label required'), line: z.string().trim().min(3, 'Enter the address'), city: z.string().trim().min(2, 'City required'), pincode: z.string().trim().regex(/^\d{4,8}$/, 'Invalid pincode') })).min(1, 'Add at least one address'),
});
type F = z.infer<typeof schema>;

export default function CustomerFormScreen() {
  const nav = useNav();
  const params = useParams<'CustomerForm'>();
  const existing = useCustomer(params?.id);
  const exec = useExec();
  const fb = useFeedback();
  const { control, handleSubmit } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? { name: existing.name, phone: existing.phone, email: existing.email ?? '', type: existing.type, notes: existing.notes, addresses: existing.addresses }
      : { name: '', phone: '', email: '', type: 'Home', notes: '', addresses: [{ label: 'Home', line: '', city: 'Pune', pincode: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'addresses' });

  const submit = handleSubmit((v) => {
    const r = exec({ t: 'customer.save', v: { id: existing?.id, name: v.name, phone: v.phone, email: v.email || undefined, type: v.type as never, notes: v.notes, addresses: v.addresses } });
    if (!r.ok) return fb.error(r.error);
    fb.success(existing ? 'Customer updated' : 'Customer added');
    if (existing) nav.goBack(); else nav.replace('CustomerDetail', { id: r.id });
  });

  return (
    <Screen scroll header={<Header title={existing ? 'Edit customer' : 'New customer'} />} footer={<Button title={existing ? 'Save changes' : 'Add customer'} onPress={submit} />}>
      <Card style={{ gap: 14 }}>
        <AppText v="h3">Personal information</AppText>
        <FormText control={control} name="name" label="Name" icon="user" placeholder="Customer or business name" autoCapitalize="words" />
        <FormText control={control} name="phone" label="Mobile number" icon="phone" placeholder="98765 43210" keyboardType="phone-pad" />
        <FormText control={control} name="email" label="Email (optional)" icon="mail" placeholder="name@email.com" autoCapitalize="none" keyboardType="email-address" />
        <FormSelect control={control} name="type" label="Customer type" options={CUSTOMER_TYPES.map((t) => ({ value: t, label: t }))} />
      </Card>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText v="h3">Delivery addresses</AppText>
          <Button title="Add" icon="plus" size="sm" variant="soft" full={false} onPress={() => append({ label: `Address ${fields.length + 1}`, line: '', city: 'Pune', pincode: '' })} />
        </View>
        {fields.map((f, i) => (
          <View key={f.id} style={{ gap: 12, paddingTop: i ? 14 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: '#8883' }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><FormText control={control} name={`addresses.${i}.label`} label="Label" placeholder="Home, Office…" /></View>
              {fields.length > 1 ? <Button title="Remove" size="sm" variant="danger" full={false} onPress={() => remove(i)} style={{ marginBottom: 6 }} /> : null}
            </View>
            <FormText control={control} name={`addresses.${i}.line`} label="Address" placeholder="Flat / street / area" multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FormText control={control} name={`addresses.${i}.city`} label="City" /></View>
              <View style={{ flex: 1 }}><FormText control={control} name={`addresses.${i}.pincode`} label="Pincode" keyboardType="number-pad" /></View>
            </View>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 14 }}>
        <FormText control={control} name="notes" label="Notes" placeholder="Gate code, delivery preferences…" multiline />
      </Card>
    </Screen>
  );
}
