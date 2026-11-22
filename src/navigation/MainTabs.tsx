import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from '../components/navigation/TabBar';
import { TabParamList } from './types';
import DashboardScreen from '../modules/dashboard/screens/DashboardScreen';
import CustomerListScreen from '../modules/customers/screens/CustomerListScreen';
import OrderListScreen from '../modules/orders/screens/OrderListScreen';
import InventoryScreen from '../modules/inventory/screens/InventoryScreen';
import MoreScreen from '../modules/settings/screens/MoreScreen';
import { useExec } from '../store/hooks';
import { addDays, todayStr } from '../utils/date';

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabs() {
  const exec = useExec();
  // Once per launch: create today's/tomorrow's recurring orders (idempotent) and refresh alerts.
  useEffect(() => {
    exec({ t: 'sub.generate', from: todayStr(), to: addDays(todayStr(), 1) });
    exec({ t: 'alerts.refresh' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, lazy: true }}>
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Customers" component={CustomerListScreen} />
      <Tab.Screen name="Orders" component={OrderListScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
