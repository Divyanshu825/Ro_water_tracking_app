import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Screen, TabHeader } from '../../../components/common/Screen';
import { SearchBar, Fab } from '../../../components/common/Misc';
import { FilterChips, Segmented } from '../../../components/common/Chips';
import { SkeletonList, useReady } from '../../../components/common/Skeleton';
import { EmptyState } from '../../../components/common/EmptyState';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { AppText } from '../../../components/common/Text';
import { Icon } from '../../../components/common/Icon';
import { OrderCard } from '../../../components/cards/OrderCard';
import { useDb } from '../../../hooks/useData';
import { useNav } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';
import { orderTotal } from '../../payments/services/ledger';
import { isOpen } from '../services/orderService';
import { ORDER_STATUSES } from '../../../types/domain';
import { labelize } from '../../../utils/format';
import { todayStr } from '../../../utils/date';

type Sort = 'newest' | 'delivery' | 'amount';

export default function OrderListScreen() {
  const c = useTheme();
  const nav = useNav();
  const db = useDb();
  const route = useRoute();
  const ready = useReady();
  const initial = (route.params as { status?: string } | undefined)?.status;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>(initial ?? 'all');
  const [sort, setSort] = useState<Sort>('newest');
  const [sheet, setSheet] = useState(false);

  React.useEffect(() => { if (initial) setStatus(initial); }, [initial]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const custName = new Map(db.customers.map((x) => [x.id, x.name.toLowerCase()]));
    let r = db.orders.filter((o) =>
      (status === 'all' || (status === 'open' ? isOpen(o.status) : status === 'today' ? o.deliveryDate === todayStr() : o.status === status)) &&
      (!s || o.number.toLowerCase().includes(s) || (custName.get(o.customerId) ?? '').includes(s)));
    if (sort === 'delivery') r = [...r].sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate));
    if (sort === 'amount') r = [...r].sort((a, b) => orderTotal(b) - orderTotal(a));
    return r;
  }, [db.orders, db.customers, q, status, sort]);

  return (
    <Screen padded={false} header={<TabHeader title="Orders" subtitle={`${db.orders.filter((o) => isOpen(o.status)).length} open · ${db.orders.length} total`} />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search order # or customer"
          right={<Pressable accessibilityRole="button" accessibilityLabel="Sort orders" onPress={() => setSheet(true)} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: sort !== 'newest' ? c.primary : c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}><Icon name="sliders" size={18} color={sort !== 'newest' ? c.onPrimary : c.text} /></Pressable>} />
      </View>
      <FilterChips value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'today', label: 'Today' }, ...ORDER_STATUSES.map((s) => ({ value: s, label: labelize(s) }))]} />
      <View style={{ height: 12 }} />
      {!ready ? <SkeletonList /> : (
        <FlatList data={list} keyExtractor={(o) => o.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 190, gap: 12 }} showsVerticalScrollIndicator={false} initialNumToRender={8} windowSize={9}
          renderItem={({ item, index }) => <OrderCard order={item} index={index} onPress={() => nav.navigate('OrderDetail', { id: item.id })} />}
          ListEmptyComponent={<EmptyState title="No orders found" message={q || status !== 'all' ? 'Try changing the filters.' : 'Create your first order to get started.'} actionLabel="Create order" onAction={() => nav.navigate('OrderCreate')} />} />
      )}
      <Fab label="New order" onPress={() => nav.navigate('OrderCreate')} />
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Sort orders">
        <Segmented value={sort} onChange={(v) => { setSort(v); setSheet(false); }} options={[{ value: 'newest', label: 'Newest' }, { value: 'delivery', label: 'Delivery date' }, { value: 'amount', label: 'Amount' }]} />
        <AppText v="caption" color="textMuted">Sorting applies to the current filter.</AppText>
      </BottomSheet>
    </Screen>
  );
}
