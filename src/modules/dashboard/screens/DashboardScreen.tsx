import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../../theme';
import { AppText } from '../../../components/common/Text';
import { Card } from '../../../components/common/Card';
import { Icon, IconName } from '../../../components/common/Icon';
import { CountUp } from '../../../components/common/Misc';
import { SectionTitle } from '../../../components/common/Screen';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { Skeleton, useReady } from '../../../components/common/Skeleton';
import { EmptyState } from '../../../components/common/EmptyState';
import { Badge } from '../../../components/common/Badge';
import { DatePickerSheet } from '../../../components/forms/DateField';
import { StatTile } from '../../../components/cards/StatTile';
import { OrderCard } from '../../../components/cards/OrderCard';
import { BarChart } from '../../../components/charts/BarChart';
import { AreaChart } from '../../../components/charts/AreaChart';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useAppSelector } from '../../../store/hooks';
import { useNav } from '../../../navigation/hooks';
import { RANGE_OPTIONS, RangeKey, dailySeries, dashboardStats, lowStock, monthlySeries, resolveRange, revenueMap, upcomingDeliveries } from '../services/stats';
import { addDays, friendlyDate, monthLabel, todayStr, weekdayShort, formatDateTime } from '../../../utils/date';
import { labelize } from '../../../utils/format';

const QUICK: { icon: IconName; label: string; tone: 'secondary' | 'success' | 'warning' | 'accent' | 'primary'; go: (n: ReturnType<typeof useNav>) => void }[] = [
  { icon: 'user-plus', label: 'Add Customer', tone: 'secondary', go: (n) => n.navigate('CustomerForm') },
  { icon: 'plus-circle', label: 'Create Order', tone: 'success', go: (n) => n.navigate('OrderCreate') },
  { icon: 'credit-card', label: 'Add Payment', tone: 'warning', go: (n) => n.navigate('RecordPayment') },
  { icon: 'package', label: 'Add Stock', tone: 'accent', go: (n) => n.navigate('StockEntry', { kind: 'new_stock' }) },
  { icon: 'bar-chart-2', label: 'View Reports', tone: 'primary', go: (n) => n.navigate('Reports') },
];

const TONE_BG = {
  secondary: (c: ReturnType<typeof useTheme>) => c.secondarySoft,
  success: (c: ReturnType<typeof useTheme>) => c.successSoft,
  warning: (c: ReturnType<typeof useTheme>) => c.warningSoft,
  accent: (c: ReturnType<typeof useTheme>) => c.secondarySoft,
  primary: (c: ReturnType<typeof useTheme>) => c.primarySoft,
};

export default function DashboardScreen() {
  const c = useTheme();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const db = useDb();
  const { money } = useFormat();
  const user = useAppSelector((s) => s.auth.user);
  const business = useAppSelector((s) => s.settings.business.name);
  const [key, setKey] = useState<RangeKey>('today');
  const [custom, setCustom] = useState(todayStr());
  const [pickOpen, setPickOpen] = useState(false);
  const ready = useReady(250);

  const range = useMemo(() => resolveRange(key, custom), [key, custom]);
  const stats = useMemo(() => dashboardStats(db, range), [db, range]);
  const rev = useMemo(() => revenueMap(db), [db.financialEntries]); // eslint-disable-line react-hooks/exhaustive-deps
  const week = useMemo(() => dailySeries(rev, addDays(todayStr(), -6), todayStr()).map((d) => ({ label: weekdayShort(d.date), value: d.value })), [rev]);
  const months = useMemo(() => monthlySeries(rev, 6).map((m) => ({ label: monthLabel(m.key).split(' ')[0], value: m.value })), [rev]);
  const low = useMemo(() => lowStock(db), [db]);
  const upcoming = useMemo(() => upcomingDeliveries(db, 4), [db]);
  const recent = useMemo(() => db.orders.slice(0, 4), [db.orders]);
  const txns = useMemo(() => db.financialEntries.filter((e) => e.kind === 'payment' || e.kind === 'deposit_refund').slice(0, 5), [db.financialEntries]);
  const unread = db.notifications.filter((n) => !n.read).length;
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const rangeLabel = key === 'custom' ? friendlyDate(custom) : RANGE_OPTIONS.find((r) => r.value === key)!.label;
  const stockTotal = Math.max(1, stats.totalBottles);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 70, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <AppText v="caption" color="rgba(255,255,255,0.75)">{greet}{user ? `, ${user.name.split(' ')[0]}` : ''} 👋</AppText>
              <AppText v="h2" color="#fff" numberOfLines={1}>{business}</AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Notifications, ${unread} unread`} onPress={() => nav.navigate('Notifications')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={20} color="#fff" />
              {unread > 0 ? <View style={{ position: 'absolute', top: 6, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><AppText v="caption" color="#fff" style={{ fontSize: 10, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</AppText></View> : null}
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {RANGE_OPTIONS.map((o) => {
              const on = o.value === key;
              return (
                <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { if (o.value === 'custom') setPickOpen(true); else setKey(o.value); }}
                  style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', backgroundColor: on ? '#fff' : 'rgba(255,255,255,0.14)' }}>
                  <AppText v="label" color={on ? '#0B1F44' : '#fff'}>{o.value === 'custom' && key === 'custom' ? friendlyDate(custom) : o.label}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ marginTop: 22 }}>
            <AppText v="overline" color="rgba(255,255,255,0.7)">Revenue · {rangeLabel}</AppText>
            <CountUp value={stats.revenue} format={(n) => money(n)} v="display" color="#fff" />
            <AppText v="caption" color="rgba(255,255,255,0.7)">Net sales, excluding bottle deposits</AppText>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: -40, gap: 20 }}>
          {!ready ? (
            <View style={{ gap: 12 }}><Skeleton h={96} r={20} /><Skeleton h={96} r={20} /><Skeleton h={180} r={20} /></View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <StatTile index={0} icon="shopping-bag" label={`Orders · ${rangeLabel}`} value={stats.orders} tint={c.secondary} bg={c.secondarySoft} onPress={() => nav.navigate('Main', { screen: 'Orders' })} />
                <StatTile index={1} icon="check-circle" label="Completed deliveries" value={stats.completed} tint={c.success} bg={c.successSoft} />
                <StatTile index={2} icon="clock" label="Pending orders" value={stats.pending} tint={c.warning} bg={c.warningSoft} onPress={() => nav.navigate('Main', { screen: 'Orders', params: { status: 'open' } })} />
                <StatTile index={3} icon="users" label="Active customers" value={stats.activeCustomers} tint={c.accent} bg={c.secondarySoft} onPress={() => nav.navigate('Main', { screen: 'Customers' })} />
                <StatTile index={4} icon="alert-circle" label="Outstanding" value={stats.outstanding} format={(n) => money(n, true)} tint={c.error} bg={c.errorSoft} onPress={() => nav.navigate('Payments')} />
                <StatTile index={5} icon="droplet" label="Total bottle stock" value={stats.totalBottles} tint={c.primary} bg={c.primarySoft} onPress={() => nav.navigate('Main', { screen: 'Inventory' })} />
              </View>

              <Animated.View entering={FadeInDown.delay(150).duration(450)}>
                <Card style={{ gap: 14 }}>
                  <SectionTitle title="Bottle overview" action="Manage" onAction={() => nav.navigate('Main', { screen: 'Inventory' })} />
                  {[
                    { label: 'Filled', v: stats.filled, color: c.success },
                    { label: 'Empty', v: stats.empty, color: c.warning },
                    { label: 'With customers', v: stats.withCustomers, color: c.secondary },
                  ].map((x) => (
                    <View key={x.label} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <AppText v="label">{x.label}</AppText>
                        <AppText v="label" color="textMuted">{x.v.toLocaleString()}</AppText>
                      </View>
                      <ProgressBar value={x.v / stockTotal} color={x.color} />
                    </View>
                  ))}
                </Card>
              </Animated.View>

              <View style={{ gap: 12 }}>
                <SectionTitle title="Quick actions" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                  {QUICK.map((q) => (
                    <Card key={q.label} flat pad={12} onPress={() => q.go(nav)} style={{ width: 96, alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: TONE_BG[q.tone](c), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c[q.tone] + '33' }}><Icon name={q.icon} size={21} color={c[q.tone]} /></View>
                      <AppText v="caption" align="center" numberOfLines={2} style={{ fontWeight: '700', minHeight: 34 }}>{q.label}</AppText>
                    </Card>
                  ))}
                </ScrollView>
              </View>

              <Card><BarChart data={week} format={(n) => money(n)} title="Weekly revenue" /></Card>
              <Card><AreaChart data={months} format={(n) => money(n)} title="Monthly sales" /></Card>

              {low.length > 0 ? (
                <View style={{ gap: 12 }}>
                  <SectionTitle title="Low stock alerts" action="Add stock" onAction={() => nav.navigate('StockEntry', { kind: 'new_stock' })} />
                  {low.slice(0, 3).map(({ product, stock }) => (
                    <Card key={product.id} pad={14} style={{ gap: 8 }} onPress={() => nav.navigate('StockEntry', { kind: 'new_stock', productId: product.id })}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.warningSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="alert-triangle" size={18} color={c.warning} /></View>
                        <View style={{ flex: 1 }}>
                          <AppText v="bodyBold">{product.name}</AppText>
                          <AppText v="caption" color="textMuted">{stock.filled} filled left · alert at {product.lowStockThreshold}</AppText>
                        </View>
                        <Badge label={stock.filled === 0 ? 'Out' : 'Low'} status={stock.filled === 0 ? 'cancelled' : 'pending'} />
                      </View>
                    </Card>
                  ))}
                </View>
              ) : null}

              <View style={{ gap: 12 }}>
                <SectionTitle title="Upcoming deliveries" action="All orders" onAction={() => nav.navigate('Main', { screen: 'Orders' })} />
                {upcoming.length === 0 ? <Card><EmptyState title="No upcoming deliveries" message="New orders scheduled for today or later will show up here." /></Card> : upcoming.map((o, i) => <OrderCard key={o.id} order={o} index={i} onPress={() => nav.navigate('OrderDetail', { id: o.id })} />)}
              </View>

              <View style={{ gap: 12 }}>
                <SectionTitle title="Recent orders" />
                {recent.length === 0 ? <Card><EmptyState title="No orders yet" message="Orders you create will appear here." /></Card> : null}
                {recent.map((o, i) => <OrderCard key={o.id} order={o} index={i} onPress={() => nav.navigate('OrderDetail', { id: o.id })} />)}
              </View>

              <View style={{ gap: 12 }}>
                <SectionTitle title="Recent transactions" action="View all" onAction={() => nav.navigate('Payments')} />
                <Card pad={4}>
                  {txns.length === 0 ? <EmptyState title="No transactions yet" message="Payments you record will appear here." /> : txns.map((t, i) => {
                    const cust = db.customers.find((x) => x.id === t.customerId);
                    const refund = t.kind === 'deposit_refund';
                    return (
                      <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: refund ? c.warningSoft : c.successSoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={refund ? 'arrow-up-right' : 'arrow-down-left'} size={17} color={refund ? c.warning : c.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppText v="bodyBold" numberOfLines={1}>{cust?.name ?? 'Customer'}</AppText>
                          <AppText v="caption" color="textMuted">{refund ? 'Deposit refund' : labelize(t.method ?? 'cash')} · {formatDateTime(t.at)}</AppText>
                        </View>
                        <AppText v="h3" color={refund ? 'warning' : 'success'}>{refund ? '-' : '+'}{money(t.amount)}</AppText>
                      </View>
                    );
                  })}
                </Card>
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <DatePickerSheet visible={pickOpen} onClose={() => setPickOpen(false)} value={custom} max={todayStr()} onPick={(d) => { if (d > todayStr()) return; setCustom(d); setKey('custom'); setPickOpen(false); }} />
    </View>
  );
}
