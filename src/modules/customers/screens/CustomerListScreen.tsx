import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useDb, useBalances, useBottleBalances } from '../../../hooks/useData';
import { useNav } from '../../../navigation/hooks';
import { Screen, TabHeader } from '../../../components/common/Screen';
import { SearchBar, Fab } from '../../../components/common/Misc';
import { FilterChips } from '../../../components/common/Chips';
import { SkeletonList, useReady } from '../../../components/common/Skeleton';
import { EmptyState } from '../../../components/common/EmptyState';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { Icon } from '../../../components/common/Icon';
import { AppText } from '../../../components/common/Text';
import { Segmented } from '../../../components/common/Chips';
import { CustomerRow } from '../components/CustomerRow';
import { CUSTOMER_TYPES } from '../../../types/domain';
import { useTheme } from '../../../theme';

type Sort = 'name' | 'outstanding' | 'bottles' | 'recent';
type Status = 'all' | 'active' | 'inactive' | 'owing';

export default function CustomerListScreen() {
  const c = useTheme();
  const nav = useNav();
  const db = useDb();
  const balances = useBalances();
  const bottles = useBottleBalances();
  const ready = useReady();
  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [status, setStatus] = useState<Status>('all');
  const [sheet, setSheet] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let r = db.customers.filter((x) =>
      (type === 'all' || x.type === type) &&
      (status === 'all' || (status === 'active' && x.active) || (status === 'inactive' && !x.active) || (status === 'owing' && (balances.get(x.id) ?? 0) > 0)) &&
      (!s || x.name.toLowerCase().includes(s) || x.phone.includes(s)));
    r = [...r].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'outstanding' ? (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0)
      : sort === 'bottles' ? (bottles.get(b.id) ?? 0) - (bottles.get(a.id) ?? 0)
      : b.createdAt.localeCompare(a.createdAt));
    return r;
  }, [db.customers, q, type, sort, status, balances, bottles]);

  const filtersOn = sort !== 'name' || status !== 'all';
  return (
    <Screen padded={false} header={<TabHeader title="Customers" subtitle={`${db.customers.length} total · ${db.customers.filter((x) => x.active).length} active`} />}>
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 12 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search name or mobile"
          right={<Pressable accessibilityRole="button" accessibilityLabel="Filters and sorting" onPress={() => setSheet(true)} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: filtersOn ? c.primary : c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}><Icon name="sliders" size={18} color={filtersOn ? c.onPrimary : c.text} /></Pressable>} />
      </View>
      <FilterChips value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, ...CUSTOMER_TYPES.map((t) => ({ value: t, label: t }))]} />
      <View style={{ height: 12 }} />
      {!ready ? <SkeletonList /> : (
        <FlatList
          data={list} keyExtractor={(x) => x.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, gap: 12 }} showsVerticalScrollIndicator={false}
          initialNumToRender={8} windowSize={9}
          renderItem={({ item, index }) => <CustomerRow index={index} customer={item} balance={balances.get(item.id) ?? 0} bottles={bottles.get(item.id) ?? 0} onPress={() => nav.navigate('CustomerDetail', { id: item.id })} />}
          ListEmptyComponent={<EmptyState title={q || type !== 'all' || status !== 'all' ? 'No matching customers' : 'No customers yet'} message={q ? 'Try a different name or number.' : 'Add your first customer to start taking orders.'} actionLabel={q ? undefined : 'Add customer'} onAction={() => nav.navigate('CustomerForm')} />}
        />
      )}
      <Fab icon="user-plus" label="Add" onPress={() => nav.navigate('CustomerForm')} />
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Filter & sort">
        <AppText v="overline" color="textMuted">Status</AppText>
        <FilterChips pad={0} value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'owing', label: 'Has dues' }]} />
        <AppText v="overline" color="textMuted">Sort by</AppText>
        <Segmented value={sort} onChange={setSort} options={[{ value: 'name', label: 'Name' }, { value: 'outstanding', label: 'Dues' }, { value: 'bottles', label: 'Bottles' }, { value: 'recent', label: 'Newest' }]} />
      </BottomSheet>
    </Screen>
  );
}
