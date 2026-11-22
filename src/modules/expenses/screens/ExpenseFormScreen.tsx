import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { FormText } from '../../../components/forms/TextField';
import { FormSelect } from '../../../components/forms/SelectField';
import { FormDate } from '../../../components/forms/DateField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb, useSettings } from '../../../hooks/useData';
import { useNav, useParams } from '../../../navigation/hooks';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../../types/domain';
import { numStr } from '../../../utils/zodHelpers';
import { labelize, toNum } from '../../../utils/format';
import { todayStr } from '../../../utils/date';

const schema = z.object({ category: z.string().min(1), amount: numStr('Amount', 0.01), date: z.string().min(1, 'Select a date'), method: z.string().min(1), description: z.string() });
type F = z.infer<typeof schema>;

export default function ExpenseFormScreen() {
  const nav = useNav();
  const params = useParams<'ExpenseForm'>();
  const db = useDb();
  const settings = useSettings();
  const ex = db.expenses.find((e) => e.id === params?.id);
  const exec = useExec();
  const fb = useFeedback();
  const { control, handleSubmit } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { category: ex?.category ?? 'Fuel', amount: ex ? String(ex.amount) : '', date: ex?.date ?? todayStr(), method: ex?.method ?? 'cash', description: ex?.description ?? '' } });
  const submit = handleSubmit((v) => {
    const r = exec({ t: 'expense.save', v: { id: ex?.id, category: v.category as never, amount: toNum(v.amount), date: v.date, method: v.method as never, description: v.description } });
    if (!r.ok) return fb.error(r.error);
    fb.success(ex ? 'Expense updated' : 'Expense added');
    nav.goBack();
  });
  const del = () => fb.confirm('Delete expense?', 'This removes it from reports.', () => { exec({ t: 'expense.delete', id: ex!.id }); fb.success('Expense deleted'); nav.goBack(); }, 'Delete', true);
  return (
    <Screen scroll header={<Header title={ex ? 'Edit expense' : 'Add expense'} />} footer={<Button title="Save expense" onPress={submit} />}>
      <Card style={{ gap: 14 }}>
        <FormSelect control={control} name="category" label="Category" options={EXPENSE_CATEGORIES.map((k) => ({ value: k, label: k }))} />
        <FormText control={control} name="amount" label="Amount" prefix={settings.currency.symbol} keyboardType="decimal-pad" />
        <FormDate control={control} name="date" label="Date" />
        <FormSelect control={control} name="method" label="Payment method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: labelize(m) }))} />
        <FormText control={control} name="description" label="Description" multiline placeholder="What was this for?" />
      </Card>
      {ex ? <Button title="Delete expense" variant="danger" onPress={del} /> : null}
    </Screen>
  );
}
