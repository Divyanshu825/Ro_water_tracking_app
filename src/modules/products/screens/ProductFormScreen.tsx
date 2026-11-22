import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { FormText } from '../../../components/forms/TextField';
import { ToggleRow } from '../../../components/forms/ToggleRow';
import { useFeedback } from '../../../components/common/Feedback';
import { ProductThumb } from '../components/ProductThumb';
import { useExec } from '../../../store/hooks';
import { useProduct } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav, useParams } from '../../../navigation/hooks';
import { numStr } from '../../../utils/zodHelpers';
import { formatCapacity, toNum } from '../../../utils/format';
import { pickImage } from '../../../utils/files';
import { useTheme } from '../../../theme';

const PRESETS = [250, 500, 1000, 2000, 5000, 10000, 20000, 25000];
const schema = z.object({
  name: z.string().trim().min(2, 'Enter a product name'),
  capacityMl: numStr('Capacity', 1, { integer: true }),
  sellingPrice: numStr('Selling price'),
  purchaseCost: numStr('Purchase cost'),
  deposit: numStr('Deposit', 0, { required: false }),
  lowStockThreshold: numStr('Low-stock alert', 0, { integer: true }),
});
type F = z.infer<typeof schema>;

export default function ProductFormScreen() {
  const c = useTheme();
  const nav = useNav();
  const params = useParams<'ProductForm'>();
  const p = useProduct(params?.id);
  const exec = useExec();
  const fb = useFeedback();
  const { money, cur } = useFormat();
  const [returnable, setReturnable] = useState(p?.returnable ?? false);
  const [active, setActive] = useState(p?.active ?? true);
  const [image, setImage] = useState(p?.image);
  const { control, handleSubmit, setValue } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { name: p?.name ?? '', capacityMl: String(p?.capacityMl ?? 20000), sellingPrice: String(p?.sellingPrice ?? ''), purchaseCost: String(p?.purchaseCost ?? ''), deposit: String(p?.deposit ?? 0), lowStockThreshold: String(p?.lowStockThreshold ?? 20) },
  });
  const w = useWatch({ control });
  const margin = toNum(w.sellingPrice) - toNum(w.purchaseCost);

  const submit = handleSubmit((v) => {
    const r = exec({ t: 'product.save', v: { id: p?.id, name: v.name, capacityMl: toNum(v.capacityMl), sellingPrice: toNum(v.sellingPrice), purchaseCost: toNum(v.purchaseCost), deposit: returnable ? toNum(v.deposit) : 0, returnable, lowStockThreshold: toNum(v.lowStockThreshold), image, active } });
    if (!r.ok) return fb.error(r.error);
    fb.success(p ? 'Product updated' : 'Product added');
    nav.goBack();
  });

  return (
    <Screen scroll header={<Header title={p ? 'Edit product' : 'New product'} />} footer={<Button title={p ? 'Save changes' : 'Add product'} onPress={submit} />}>
      <Card style={{ alignItems: 'center', gap: 10 }}>
        <ProductThumb uri={image} size={88} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={image ? 'Change image' : 'Add image'} icon="image" size="sm" variant="soft" full={false} onPress={async () => { const u = await pickImage(); if (u) setImage(u); }} />
          {image ? <Button title="Remove" size="sm" variant="danger" full={false} onPress={() => setImage(undefined)} /> : null}
        </View>
      </Card>
      <Card style={{ gap: 14 }}>
        <FormText control={control} name="name" label="Product name" placeholder="e.g. 20L Jar" autoCapitalize="words" />
        <View style={{ gap: 8 }}>
          <AppText v="label" color="textMuted">Bottle capacity</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map((ml) => {
              const on = toNum(w.capacityMl) === ml;
              return (
                <Pressable key={ml} onPress={() => setValue('capacityMl', String(ml), { shouldValidate: true })} accessibilityRole="button" style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? c.primary : c.surfaceAlt, borderWidth: 1, borderColor: on ? c.primary : c.border }}>
                  <AppText v="label" color={on ? 'onPrimary' : 'textMuted'}>{formatCapacity(ml)}</AppText>
                </Pressable>
              );
            })}
          </View>
          <FormText control={control} name="capacityMl" suffix="ml" placeholder="Custom size in ml" keyboardType="number-pad" hint="Pick a preset or enter any custom size." />
        </View>
      </Card>
      <Card style={{ gap: 14 }}>
        <AppText v="h3">Pricing</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><FormText control={control} name="sellingPrice" label="Selling price" prefix={cur.symbol} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><FormText control={control} name="purchaseCost" label="Purchase cost" prefix={cur.symbol} keyboardType="decimal-pad" /></View>
        </View>
        {w.sellingPrice && w.purchaseCost ? <AppText v="caption" color={margin >= 0 ? 'success' : 'error'}>Margin per unit: {money(margin)}</AppText> : null}
        <ToggleRow title="Returnable bottle" subtitle="Reusable jars/cans tracked per customer, with a deposit" value={returnable} onChange={setReturnable} />
        {returnable ? <FormText control={control} name="deposit" label="Deposit per bottle" prefix={cur.symbol} keyboardType="decimal-pad" /> : null}
      </Card>
      <Card style={{ gap: 14 }}>
        <FormText control={control} name="lowStockThreshold" label="Low-stock alert at (filled bottles)" keyboardType="number-pad" />
        <ToggleRow title="Product active" subtitle="Inactive products can't be added to new orders" value={active} onChange={setActive} />
        {p ? <AppText v="caption" color="textMuted">Available stock is managed from Inventory.</AppText> : <AppText v="caption" color="textMuted">Add opening stock from Inventory after saving.</AppText>}
      </Card>
    </Screen>
  );
}
