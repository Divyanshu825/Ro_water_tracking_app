import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button, IconButton } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { Avatar } from '../../../components/common/Misc';
import { Segmented } from '../../../components/common/Chips';
import { Badge } from '../../../components/common/Badge';
import { useFeedback } from '../../../components/common/Feedback';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useExec } from '../../../store/hooks';
import { useNav, useParams } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';
import { bottleBalance, customerBalance, depositHeld } from '../../payments/services/ledger';
import { BottlesTab, OrdersTab, OverviewTab, PaymentsTab, SubscriptionsTab } from '../components/CustomerTabs';

type Tab = 'info' | 'orders' | 'payments' | 'bottles' | 'subs';

export default function CustomerDetailScreen() {
  const { id } = useParams<'CustomerDetail'>();
  const c = useTheme();
  const nav = useNav();
  const db = useDb();
  const exec = useExec();
  const fb = useFeedback();
  const { money } = useFormat();
  const [tab, setTab] = useState<Tab>('info');
  const customer = db.customers.find((x) => x.id === id);
  if (!customer) return <Screen header={<Header title="Customer" />}><AppText color="textMuted">This customer no longer exists.</AppText></Screen>;

  const balance = customerBalance(db.financialEntries, id);
  const held = bottleBalance(db.bottleLedger, id);
  const deposit = depositHeld(db.financialEntries, id);

  const toggleActive = () => {
    const r = exec({ t: 'customer.active', id, active: !customer.active });
    if (r.ok) fb.success(customer.active ? 'Customer deactivated' : 'Customer activated');
  };
  const remove = () => fb.confirm('Delete customer?', 'Customers with order or payment history are deactivated instead, so records stay intact.', () => {
    const r = exec({ t: 'customer.delete', id });
    if (!r.ok) return fb.error(r.error);
    fb.success(r.deactivated ? 'Customer deactivated' : 'Customer deleted', r.deactivated ? 'History is preserved' : undefined);
    if (!r.deactivated) nav.goBack();
  }, 'Delete', true);

  return (
    <Screen scroll header={<Header title="Customer" right={<IconButton icon="edit-2" label="Edit customer" onPress={() => nav.navigate('CustomerForm', { id })} />} />}>
      <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={customer.name} size={56} tint="rgba(255,255,255,0.18)" />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText v="h2" color="#fff" numberOfLines={1}>{customer.name}</AppText>
            <View style={{ flexDirection: 'row', gap: 6 }}><Badge label={customer.type} tone={{ fg: '#fff', bg: 'rgba(255,255,255,0.2)' }} /><Badge label={customer.active ? 'Active' : 'Inactive'} tone={{ fg: '#fff', bg: customer.active ? 'rgba(22,163,74,0.6)' : 'rgba(220,38,38,0.6)' }} /></View>
          </View>
          <IconButton icon="phone" label={`Call ${customer.name}`} bg="rgba(255,255,255,0.2)" color="#fff" onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[{ l: balance < 0 ? 'Advance' : 'Outstanding', v: money(Math.abs(balance)) }, { l: 'Bottles held', v: String(held) }, { l: 'Deposit held', v: money(deposit, true) }].map((x) => (
            <View key={x.l} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 10 }}>
              <AppText v="caption" color="rgba(255,255,255,0.75)">{x.l}</AppText>
              <AppText v="h3" color="#fff">{x.v}</AppText>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button title="New order" icon="plus" size="sm" disabled={!customer.active} onPress={() => nav.navigate('OrderCreate', { customerId: id })} /></View>
        <View style={{ flex: 1 }}><Button title="Payment" icon="credit-card" size="sm" variant="soft" onPress={() => nav.navigate('RecordPayment', { customerId: id })} /></View>
        <View style={{ flex: 1 }}><Button title="Refund" icon="rotate-ccw" size="sm" variant="soft" onPress={() => nav.navigate('DepositRefund', { customerId: id })} /></View>
      </View>

      <Segmented value={tab} onChange={setTab} options={[{ value: 'info', label: 'Info' }, { value: 'orders', label: 'Orders' }, { value: 'payments', label: 'Ledger' }, { value: 'bottles', label: 'Bottles' }, { value: 'subs', label: 'Subs' }]} />
      {tab === 'info' ? <OverviewTab customer={customer} /> : null}
      {tab === 'orders' ? <OrdersTab db={db} customerId={id} /> : null}
      {tab === 'payments' ? <PaymentsTab db={db} customerId={id} /> : null}
      {tab === 'bottles' ? <BottlesTab db={db} customerId={id} /> : null}
      {tab === 'subs' ? <SubscriptionsTab db={db} customerId={id} /> : null}

      {tab === 'info' ? (
        <Card style={{ gap: 10 }}>
          <Button title={customer.active ? 'Deactivate customer' : 'Activate customer'} variant="outline" onPress={toggleActive} />
          <Button title="Delete customer" variant="danger" icon="trash-2" onPress={remove} />
        </Card>
      ) : null}
    </Screen>
  );
}
