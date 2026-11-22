import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Badge } from '../../../components/common/Badge';
import { Fab, SearchBar } from '../../../components/common/Misc';
import { EmptyState } from '../../../components/common/EmptyState';
import { FilterChips } from '../../../components/common/Chips';
import { ProductThumb } from '../components/ProductThumb';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav } from '../../../navigation/hooks';
import { formatCapacity } from '../../../utils/format';
import { getStock } from '../../inventory/services/inventoryService';

export default function ProductListScreen() {
  const nav = useNav();
  const db = useDb();
  const { money } = useFormat();
  const [q, setQ] = useState('');
  const [f, setF] = useState<string>('all');
  // One chip per distinct capacity in use, so custom sizes get a chip automatically and persist with the products.
  const sizes = useMemo(() => Array.from(new Set(db.products.map((p) => p.capacityMl))).sort((a, b) => a - b), [db.products]);
  const chips = useMemo(() => [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, ...sizes.map((ml) => ({ value: `ml:${ml}`, label: formatCapacity(ml) }))], [sizes]);
  const sel = chips.some((x) => x.value === f) ? f : 'all';
  const list = useMemo(() => db.products.filter((p) => (sel === 'all' || (sel === 'active' ? p.active : sel === 'inactive' ? !p.active : `ml:${p.capacityMl}` === sel)) && p.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.capacityMl - b.capacityMl), [db.products, q, sel]);
  return (
    <Screen padded={false} header={<Header title="Products" subtitle={`${db.products.length} products`} />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search products" />
      </View>
      <FilterChips value={sel} onChange={setF} options={chips} />
      <View style={{ height: 12 }} />
      <FlatList data={list} keyExtractor={(p) => p.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 12 }} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No products" message={q || sel !== 'all' ? 'No products match this filter.' : 'Add the bottle sizes you sell.'} actionLabel="Add product" onAction={() => nav.navigate('ProductForm')} />}
        renderItem={({ item: p, index }) => {
          const st = getStock(db, p.id);
          return (
            <Animated.View entering={index < 8 ? FadeInDown.delay(index * 45).duration(380) : undefined}>
              <Card onPress={() => nav.navigate('ProductForm', { id: p.id })} pad={14} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', opacity: p.active ? 1 : 0.65 }}>
                <ProductThumb uri={p.image} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText v="h3" numberOfLines={1}>{p.name}</AppText>
                  <AppText v="caption" color="textMuted">{formatCapacity(p.capacityMl)} · {p.returnable ? `Deposit ${money(p.deposit)}` : 'Non-returnable'}</AppText>
                  <AppText v="caption" color="textMuted">Stock {st.filled} filled · cost {money(p.purchaseCost)}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <AppText v="h3">{money(p.sellingPrice)}</AppText>
                  <Badge status={p.active ? 'active' : 'expired'} label={p.active ? 'Active' : 'Inactive'} />
                </View>
              </Card>
            </Animated.View>
          );
        }} />
      <Fab label="Add Product" onPress={() => nav.navigate('ProductForm')} />
    </Screen>
  );
}
