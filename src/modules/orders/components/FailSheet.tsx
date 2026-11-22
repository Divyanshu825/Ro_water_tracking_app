import React, { useState } from 'react';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { Button } from '../../../components/common/Button';
import { FilterChips } from '../../../components/common/Chips';
import { TextField } from '../../../components/forms/TextField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';

const REASONS = ['Customer not available', 'Wrong address', 'Premises locked', 'Customer refused', 'Other'];

export const FailSheet = ({ orderId, visible, onClose, onDone }: { orderId: string; visible: boolean; onClose: () => void; onDone?: () => void }) => {
  const exec = useExec();
  const fb = useFeedback();
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const submit = () => {
    const text = reason === 'Other' ? note.trim() : note.trim() ? `${reason} – ${note.trim()}` : reason;
    const r = exec({ t: 'order.status', v: { orderId, status: 'failed', reason: text } });
    if (!r.ok) return fb.error(r.error);
    onClose(); fb.success('Reported as failed', 'Stock returned to filled'); onDone?.();
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Report failed delivery">
      <FilterChips pad={0} value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} />
      <TextField label="Details (optional)" value={note} onChangeText={setNote} multiline placeholder="Add more context" />
      <Button title="Report failed delivery" variant="danger" onPress={submit} />
    </BottomSheet>
  );
};
