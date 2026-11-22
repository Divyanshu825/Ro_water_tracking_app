import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, TabHeader } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Badge } from '../../../components/common/Badge';
import { Icon, IconName } from '../../../components/common/Icon';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { CountUp } from '../../../components/common/Misc';
import { DonutChart } from '../../../components/charts/DonutChart';
import { Skeleton, useReady } from '../../../components/common/Skeleton';
import { Button } from '../../../components/common/Button';
import { ProductThumb } from '../../products/components/ProductThumb';
import { useDb } from '../../../hooks/useData';
import { useNav } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';
import { getStock, stockHealth, totalBottles } from '../services/inventoryService';
import { formatCapacity } from '../../../utils/format';
import { InventoryEntryKind } from '../services/inventoryService';

const ACTIONS: { kind: InventoryEntryKind; icon: IconName; label: string }[] = [
  { kind: 'new_stock', icon: 'plus-square', label: 'New stock' },
  { kind: 'purchase', icon: 'shopping-cart', label: 'Purchase' },
  { kind: 'collect_empty', icon: 'rotate-ccw', label: 'Collect empties' },
  { kind: 'refill', icon: 'droplet', label: 'Refill' },
  { kind: 'adjust', icon: 'edit-3', label: 'Adjust' },
  { kind: 'damaged', icon: 'alert-octagon', label: 'Damaged' },
  { kind: 'lost', icon: 'help-circle', label: 'Lost' },
];

export default function InventoryScreen() {
  const c = useTheme();
  const nav = useNav();
  const db = useDb();
  const ready = useReady(250);
  const rows = useMemo(() => db.products.filter((p) => p.active || totalBottles(getStock(db, p.id)) > 0).sort((a, b) => a.capacityMl - b.capacityMl).map((p) => ({ p, s: getStock(db, p.id) })), [db]);
  const sum = useMemo(() => rows.reduce((a, { s }) => ({ filled: a.filled + s.filled, empty: a.empty + s.empty, cust: a.cust + s.withCustomers, staff: a.staff + s.withStaff, bad: a.bad + s.damaged + s.lost }), { filled: 0, empty: 0, cust: 0, staff: 0, bad: 0 }), [rows]);
  const total = sum.filled + sum.empty + sum.cust + sum.staff + sum.bad;

  return (
    <Screen scroll header={<TabHeader title="Inventory" subtitle="Bottle stock by product" right={<Button title="History" icon="list" size="sm" variant="soft" full={false} onPress={() => nav.navigate('InventoryHistory')} />} />}>
      {!ready ? <><Skeleton h={190} r={20} /><Skeleton h={150} r={20} /></> : (
        <>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><CountUp value={total} v="h1" /><AppText color="textMuted">bottles in the business</AppText></View>
            <DonutChart size={130} centerValue={String(sum.filled)} centerLabel="filled" segments={[
              { label: `Filled · ${sum.filled}`, value: sum.filled, color: c.success }, { label: `Empty · ${sum.empty}`, value: sum.empty, color: c.warning },
              { label: `With customers · ${sum.cust}`, value: sum.cust, color: c.secondary }, { label: `In delivery · ${sum.staff}`, value: sum.staff, color: '#7C5CFC' }, { label: `Damaged/lost · ${sum.bad}`, value: sum.bad, color: c.error }]} />
          </Card>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {ACTIONS.map((a) => (
              <Pressable key={a.kind} accessibilityRole="button" accessibilityLabel={a.label} onPress={() => nav.navigate('StockEntry', { kind: a.kind })} style={{ alignItems: 'center', gap: 6, width: 82 }}>
                <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}><Icon name={a.icon} size={21} color={c.secondary} /></View>
                <AppText v="caption" align="center" style={{ fontWeight: '600' }}>{a.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          {rows.map(({ p, s }, i) => {
            const t = totalBottles(s) || 1;
            const h = stockHealth(s.filled, p.lowStockThreshold);
            const bar = (label: string, v: number, color: string) => (
              <View key={label} style={{ flex: 1, gap: 4 }}>
                <AppText v="caption" color="textMuted">{label}</AppText>
                <AppText v="h3">{v}</AppText>
              </View>
            );
            return (
              <Animated.View key={p.id} entering={i < 6 ? FadeInDown.delay(i * 60).duration(400) : undefined}>
                <Card style={{ gap: 12 }} onPress={() => nav.navigate('InventoryHistory', { productId: p.id })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ProductThumb uri={p.image} size={44} />
                    <View style={{ flex: 1 }}><AppText v="h3">{p.name}</AppText><AppText v="caption" color="textMuted">{formatCapacity(p.capacityMl)} · {t === 1 && totalBottles(s) === 0 ? 0 : totalBottles(s)} total</AppText></View>
                    <Badge label={h === 'ok' ? 'In stock' : h === 'low' ? 'Low stock' : 'Out of stock'} status={h === 'ok' ? 'active' : h === 'low' ? 'pending' : 'cancelled'} />
                  </View>
                  <ProgressBar value={s.filled / t} color={h === 'ok' ? c.success : h === 'low' ? c.warning : c.error} height={10} />
                  <View style={{ flexDirection: 'row' }}>
                    {bar('Filled', s.filled, c.success)}{bar('Empty', s.empty, c.warning)}{bar('Customers', s.withCustomers, c.secondary)}{bar('In van', s.withStaff, c.accent)}
                  </View>
                  {(s.damaged || s.lost) ? <AppText v="caption" color="error">{s.damaged} damaged · {s.lost} lost</AppText> : null}
                </Card>
              </Animated.View>
            );
          })}
        </>
      )}
    </Screen>
  );
}
