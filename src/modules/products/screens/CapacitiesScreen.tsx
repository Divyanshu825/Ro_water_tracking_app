import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Fab } from '../../../components/common/Misc';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { EmptyState } from '../../../components/common/EmptyState';
import { TextField } from '../../../components/forms/TextField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb } from '../../../hooks/useData';
import { Capacity } from '../../../types/domain';
import { formatCapacity, toNum } from '../../../utils/format';
import { capacityLabel, productsUsing, sortedCapacities } from '../services/capacityService';

type Draft = { id?: string; ml: string; label: string };

/** The business's own bottle sizes: the standard ones it started with plus any it added. Each one is a filter chip on Products. */
export default function CapacitiesScreen() {
  const db = useDb();
  const exec = useExec();
  const fb = useFeedback();
  const [draft, setDraft] = useState<Draft | null>(null);
  const list = useMemo(() => sortedCapacities(db), [db]);
  const editing = draft?.id ? db.capacities.find((x) => x.id === draft.id) : undefined;
  const inUse = editing ? productsUsing(db, editing.ml) : 0;

  const open = (c?: Capacity) => setDraft(c ? { id: c.id, ml: String(c.ml), label: c.label } : { ml: '', label: '' });
  const save = () => {
    if (!draft) return;
    const r = exec({ t: 'capacity.save', v: { id: draft.id, ml: toNum(draft.ml), label: draft.label } });
    if (!r.ok) return fb.error(r.error);
    setDraft(null);
    fb.success(draft.id ? 'Size updated' : 'Size added');
  };
  const remove = () => {
    if (!editing) return;
    fb.confirm('Delete size?', `${capacityLabel(editing)} will no longer appear as a filter or preset.`, () => {
      const r = exec({ t: 'capacity.delete', id: editing.id });
      if (!r.ok) return fb.error(r.error);
      setDraft(null);
      fb.success('Size deleted');
    }, 'Delete', true);
  };

  return (
    <Screen padded={false} header={<Header title="Bottle sizes" subtitle={`${list.length} sizes`} />}>
      <FlatList data={list} keyExtractor={(c) => c.id} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120, gap: 10 }} showsVerticalScrollIndicator={false}
        ListHeaderComponent={<AppText v="caption" color="textMuted" style={{ marginBottom: 4 }}>These sizes appear as filters on Products and as presets when adding a product. Tap a size to edit it.</AppText>}
        ListEmptyComponent={<EmptyState title="No sizes" message="Add the bottle sizes you sell." actionLabel="Add size" onAction={() => open()} />}
        renderItem={({ item: c }) => {
          const n = productsUsing(db, c.ml);
          return (
            <Card onPress={() => open(c)} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText v="h3" numberOfLines={1}>{capacityLabel(c)}</AppText>
                <AppText v="caption" color="textMuted">{c.label.trim() ? `${formatCapacity(c.ml)} · ` : ''}{n === 0 ? 'No products yet' : `${n} product${n > 1 ? 's' : ''}`}</AppText>
              </View>
              <Badge label={c.isDefault ? 'Standard' : 'Custom'} status={c.isDefault ? 'default' : 'active'} />
            </Card>
          );
        }} />
      <Fab label="Add size" onPress={() => open()} />
      <BottomSheet visible={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit size' : 'New size'}>
        {draft ? (
          <>
            <TextField label="Capacity" required value={draft.ml} onChangeText={(ml) => setDraft({ ...draft, ml: ml.replace(/[^0-9]/g, '') })} suffix="ml" keyboardType="number-pad" placeholder="e.g. 15000"
              editable={inUse === 0} hint={inUse > 0 ? `Used by ${inUse} product${inUse > 1 ? 's' : ''}. Change ${inUse > 1 ? 'their' : 'its'} capacity to edit this size, or rename it below.` : toNum(draft.ml) > 0 ? `Shown as ${formatCapacity(toNum(draft.ml))}` : undefined} />
            <TextField label="Display name" value={draft.label} onChangeText={(label) => setDraft({ ...draft, label })} placeholder={toNum(draft.ml) > 0 ? formatCapacity(toNum(draft.ml)) : 'Optional, e.g. Jumbo jar'} maxLength={30} hint="Optional. Leave empty to show the size." />
            <Button title={draft.id ? 'Save changes' : 'Add size'} icon="check" onPress={save} />
            {editing ? <Button title="Delete size" icon="trash-2" variant="danger" disabled={inUse > 0} onPress={remove} /> : null}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
