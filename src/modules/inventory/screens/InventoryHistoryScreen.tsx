import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { FilterChips } from '../../../components/common/Chips';
import { EmptyState } from '../../../components/common/EmptyState';
import { useDb } from '../../../hooks/useData';
import { useParams } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';
import { formatDateTime } from '../../../utils/date';
import { labelize } from '../../../utils/format';

const FIELD: Record<string, string> = { filled: 'Filled', empty: 'Empty', withCustomers: 'Customers', withStaff: 'In van', damaged: 'Damaged', lost: 'Lost' };

export default function InventoryHistoryScreen() {
  const c = useTheme();
  const params = useParams<'InventoryHistory'>();
  const db = useDb();
  const [pid, setPid] = useState(params?.productId ?? 'all');
  const list = useMemo(() => db.inventoryTxns.filter((t) => pid === 'all' || t.productId === pid).slice(0, 300), [db.inventoryTxns, pid]);
  return (
    <Screen padded={false} header={<Header title="Inventory ledger" subtitle="Every stock movement" />}>
      <FilterChips value={pid} onChange={setPid} options={[{ value: 'all', label: 'All products' }, ...db.products.map((p) => ({ value: p.id, label: p.name }))]} />
      <View style={{ height: 12 }} />
      <FlatList data={list} keyExtractor={(t) => t.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }} initialNumToRender={12}
        ListEmptyComponent={<EmptyState title="No movements" message="Stock changes will be recorded here." />}
        renderItem={({ item: t }) => (
          <Card pad={12} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText v="bodyBold">{labelize(t.type)} · {db.products.find((p) => p.id === t.productId)?.name}</AppText>
              <AppText v="bodyBold">{t.qty}</AppText>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(t.delta).filter(([, v]) => v).map(([k, v]) => (
                <View key={k} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: (v as number) > 0 ? c.successSoft : c.errorSoft }}>
                  <AppText v="caption" color={(v as number) > 0 ? 'success' : 'error'} style={{ fontWeight: '700' }}>{FIELD[k]} {(v as number) > 0 ? '+' : ''}{v}</AppText>
                </View>
              ))}
            </View>
            <AppText v="caption" color="textMuted">{t.note ? `${t.note} · ` : ''}{formatDateTime(t.at)}</AppText>
          </Card>
        )} />
    </Screen>
  );
}
