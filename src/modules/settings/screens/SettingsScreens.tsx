import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { ListItem } from '../../../components/common/Misc';
import { Segmented } from '../../../components/common/Chips';
import { TextField } from '../../../components/forms/TextField';
import { SelectField } from '../../../components/forms/SelectField';
import { ToggleRow } from '../../../components/forms/ToggleRow';
import { useFeedback } from '../../../components/common/Feedback';
import { Logo } from '../../../components/common/Logo';
import { useAppDispatch } from '../../../store/hooks';
import { settingsActions } from '../../../store/settingsSlice';
import { dbActions } from '../../../store/dbSlice';
import { useSettings } from '../../../hooks/useData';
import { useNav } from '../../../navigation/hooks';
import { CURRENCIES, NOTIF_LABELS } from '../../../constants/settingsDefaults';
import { NotifType, PAYMENT_METHODS, SettingsState } from '../../../types/domain';
import { labelize, toNum } from '../../../utils/format';
import { RootStackParamList } from '../../../navigation/types';
import { pickImage } from '../../../utils/files';

const useSave = () => {
  const dispatch = useAppDispatch();
  const fb = useFeedback();
  const nav = useNav();
  return (patch: Partial<SettingsState>, msg = 'Settings saved', back = true) => { dispatch(settingsActions.patch(patch)); fb.success(msg); if (back) nav.goBack(); };
};

export const SettingsHomeScreen = () => {
  const nav = useNav();
  const s = useSettings();
  const items: { icon: React.ComponentProps<typeof ListItem>['icon']; title: string; sub: string; to: keyof RootStackParamList }[] = [
    { icon: 'briefcase', title: 'Business profile', sub: s.business.name, to: 'BusinessProfile' },
    { icon: 'percent', title: 'Tax, delivery & deposit rules', sub: `${s.tax.enabled ? `${s.tax.label} ${s.tax.rate}%` : 'No tax'} · delivery ${s.currency.symbol}${s.delivery.defaultCharge}`, to: 'TaxCharges' },
    { icon: 'credit-card', title: 'Payment methods', sub: PAYMENT_METHODS.filter((m) => s.paymentMethods[m]).map(labelize).join(', '), to: 'PaymentMethodsSettings' },
    { icon: 'users', title: 'Staff management', sub: 'Add or edit delivery staff', to: 'StaffList' },
    { icon: 'file-text', title: 'Invoice customization', sub: `Prefix ${s.invoice.prefix}`, to: 'InvoiceSettings' },
    { icon: 'bell', title: 'Notification preferences', sub: 'Choose which alerts you get', to: 'NotificationPrefs' },
    { icon: 'moon', title: 'Appearance & data', sub: `Theme: ${s.theme}`, to: 'Appearance' },
  ];
  return (
    <Screen scroll header={<Header title="Settings" />}>
      <Card style={{ paddingVertical: 4 }}>{items.map((i) => <ListItem key={i.title} icon={i.icon} title={i.title} subtitle={i.sub} onPress={() => nav.navigate(i.to as never)} />)}</Card>
    </Screen>
  );
};

export const BusinessProfileScreen = () => {
  const s = useSettings();
  const save = useSave();
  const [b, setB] = useState(s.business);
  const [cur, setCur] = useState(s.currency.code);
  const set = (k: keyof typeof b) => (v: string) => setB({ ...b, [k]: v });
  return (
    <Screen scroll header={<Header title="Business profile" />} footer={<Button title="Save" onPress={() => save({ business: b, currency: CURRENCIES.find((c) => c.code === cur) ?? s.currency })} />}>
      <Card style={{ alignItems: 'center', gap: 10 }}>
        {b.logo ? <Image source={{ uri: b.logo }} style={{ width: 84, height: 84, borderRadius: 22 }} accessibilityLabel="Business logo" /> : <Logo size={72} />}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Change logo" icon="image" size="sm" variant="soft" full={false} onPress={async () => { const u = await pickImage(); if (u) setB({ ...b, logo: u }); }} />
          {b.logo ? <Button title="Remove" size="sm" variant="danger" full={false} onPress={() => setB({ ...b, logo: undefined })} /> : null}
        </View>
      </Card>
      <Card style={{ gap: 14 }}>
        <TextField label="Business name" value={b.name} onChangeText={set('name')} />
        <TextField label="Phone" value={b.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <TextField label="Email" value={b.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Address" value={b.address} onChangeText={set('address')} multiline />
        <TextField label="GSTIN / Tax ID" value={b.gstin} onChangeText={set('gstin')} autoCapitalize="characters" />
        <SelectField label="Currency" value={cur} onChange={setCur} options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))} />
      </Card>
    </Screen>
  );
};

export const TaxChargesScreen = () => {
  const s = useSettings();
  const save = useSave();
  const [tax, setTax] = useState({ ...s.tax, rate: String(s.tax.rate) });
  const [charge, setCharge] = useState(String(s.delivery.defaultCharge));
  const [free, setFree] = useState(String(s.delivery.freeAbove));
  const [dep, setDep] = useState(s.depositEnabled);
  const [neg, setNeg] = useState(s.allowNegativeStock);
  return (
    <Screen scroll header={<Header title="Tax, delivery & deposits" />} footer={<Button title="Save" onPress={() => save({ tax: { enabled: tax.enabled, label: tax.label || 'Tax', rate: Math.max(0, toNum(tax.rate)) }, delivery: { defaultCharge: Math.max(0, toNum(charge)), freeAbove: Math.max(0, toNum(free)) }, depositEnabled: dep, allowNegativeStock: neg })} />}>
      <Card style={{ gap: 12 }}>
        <ToggleRow title="Charge tax on orders" subtitle="Applied on (products − discount). Kept separate from revenue." value={tax.enabled} onChange={(v) => setTax({ ...tax, enabled: v })} />
        {tax.enabled ? <><TextField label="Tax label" value={tax.label} onChangeText={(v) => setTax({ ...tax, label: v })} /><TextField label="Rate" suffix="%" value={tax.rate} onChangeText={(v) => setTax({ ...tax, rate: v })} keyboardType="decimal-pad" /></> : null}
      </Card>
      <Card style={{ gap: 12 }}>
        <TextField label="Default delivery charge" prefix={s.currency.symbol} value={charge} onChangeText={setCharge} keyboardType="decimal-pad" />
        <TextField label="Free delivery above (0 = never)" prefix={s.currency.symbol} value={free} onChangeText={setFree} keyboardType="decimal-pad" />
      </Card>
      <Card style={{ gap: 4 }}>
        <ToggleRow title="Bottle deposit" subtitle="Charge a refundable deposit on returnable bottles" value={dep} onChange={setDep} />
        <ToggleRow title="Allow negative stock" subtitle="Off by default. When off, dispatch and stock removal are blocked if stock would go below zero." value={neg} onChange={setNeg} />
      </Card>
    </Screen>
  );
};

export const PaymentMethodsScreen = () => {
  const s = useSettings();
  const save = useSave();
  const fb = useFeedback();
  const [m, setM] = useState(s.paymentMethods);
  return (
    <Screen scroll header={<Header title="Payment methods" />} footer={<Button title="Save" onPress={() => (Object.values(m).some(Boolean) ? save({ paymentMethods: m }) : fb.error('Keep at least one payment method enabled.'))} />}>
      <Card>{PAYMENT_METHODS.map((k) => <ToggleRow key={k} title={labelize(k)} value={m[k]} onChange={(v) => setM({ ...m, [k]: v })} />)}</Card>
    </Screen>
  );
};

export const InvoiceSettingsScreen = () => {
  const s = useSettings();
  const save = useSave();
  const [i, setI] = useState(s.invoice);
  return (
    <Screen scroll header={<Header title="Invoice customization" />} footer={<Button title="Save" onPress={() => save({ invoice: i })} />}>
      <Card style={{ gap: 14 }}>
        <TextField label="Invoice prefix" value={i.prefix} onChangeText={(v) => setI({ ...i, prefix: v })} autoCapitalize="characters" />
        <TextField label="Terms" value={i.terms} onChangeText={(v) => setI({ ...i, terms: v })} multiline />
        <TextField label="Footer message" value={i.footer} onChangeText={(v) => setI({ ...i, footer: v })} multiline />
        <ToggleRow title="Show logo on invoice" value={i.showLogo} onChange={(v) => setI({ ...i, showLogo: v })} />
      </Card>
      <Card style={{ gap: 4 }}><AppText v="overline" color="textMuted">Preview</AppText><AppText v="h3">{s.business.name}</AppText><AppText v="caption" color="textMuted">{i.prefix}-BT-1001</AppText><AppText v="caption" color="textMuted">{i.terms}</AppText><AppText v="caption">{i.footer}</AppText></Card>
    </Screen>
  );
};

export const NotificationPrefsScreen = () => {
  const s = useSettings();
  const dispatch = useAppDispatch();
  return (
    <Screen scroll header={<Header title="Notification preferences" />}>
      <Card>{(Object.keys(NOTIF_LABELS) as NotifType[]).map((k) => <ToggleRow key={k} title={NOTIF_LABELS[k]} value={s.notifications[k]} onChange={(v) => dispatch(settingsActions.patch({ notifications: { ...s.notifications, [k]: v } }))} />)}</Card>
      <AppText v="caption" color="textMuted">Changes apply instantly to new in-app notifications.</AppText>
    </Screen>
  );
};

export const AppearanceScreen = () => {
  const s = useSettings();
  const dispatch = useAppDispatch();
  const fb = useFeedback();
  return (
    <Screen scroll header={<Header title="Appearance & data" />}>
      <Card style={{ gap: 12 }}>
        <AppText v="h3">Theme</AppText>
        <Segmented value={s.theme} onChange={(v) => dispatch(settingsActions.patch({ theme: v }))} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Card>
      <Card style={{ gap: 12 }}>
        <AppText v="h3">Data</AppText>
        <AppText v="caption" color="textMuted">Everything is stored on this device. Restore the sample business to explore, or start fresh with an empty business.</AppText>
        <Button title="Restore sample data" variant="outline" onPress={() => fb.confirm('Restore sample data?', 'This replaces all current data with the demo business.', () => { dispatch(dbActions.resetDemo()); fb.success('Sample data restored'); }, 'Restore', true)} />
        <Button title="Start with empty data" variant="danger" onPress={() => fb.confirm('Erase all data?', 'All customers, orders, stock, payments and custom products will be deleted. Your standard bottle sizes and products are set up again. This cannot be undone.', () => { dispatch(dbActions.clearAll()); fb.success('Data cleared'); }, 'Erase', true)} />
      </Card>
    </Screen>
  );
};
