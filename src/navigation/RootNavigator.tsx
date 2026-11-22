import React from 'react';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Screens are loaded lazily the first time they are visited to keep startup fast. */
const lazy = <T extends React.ComponentType<never>>(load: () => { default: T } | T) => () => {
  const m = load() as { default?: T };
  return (m.default ?? m) as T;
};

export default function RootNavigator() {
  const c = useTheme();
  const base = c.isDark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.background, card: c.surface, text: c.text, border: c.border, primary: c.secondary } };
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="Splash" getComponent={lazy(() => require('../modules/auth/screens/SplashScreen'))} options={{ animation: 'fade' }} />
        <Stack.Screen name="Welcome" getComponent={lazy(() => require('../modules/auth/screens/WelcomeScreen'))} options={{ animation: 'fade' }} />
        <Stack.Screen name="Login" getComponent={lazy(() => require('../modules/auth/screens/LoginScreen'))} options={{ animation: 'fade' }} />
        <Stack.Screen name="Register" getComponent={lazy(() => require('../modules/auth/screens/RegisterScreen'))} />
        <Stack.Screen name="ForgotPassword" getComponent={lazy(() => require('../modules/auth/screens/ForgotPasswordScreen'))} />
        <Stack.Screen name="Main" getComponent={lazy(() => require('./MainTabs'))} options={{ animation: 'fade', gestureEnabled: false }} />

        <Stack.Screen name="CustomerForm" getComponent={lazy(() => require('../modules/customers/screens/CustomerFormScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="CustomerDetail" getComponent={lazy(() => require('../modules/customers/screens/CustomerDetailScreen'))} />
        <Stack.Screen name="ProductList" getComponent={lazy(() => require('../modules/products/screens/ProductListScreen'))} />
        <Stack.Screen name="ProductForm" getComponent={lazy(() => require('../modules/products/screens/ProductFormScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Capacities" getComponent={lazy(() => require('../modules/products/screens/CapacitiesScreen'))} />
        <Stack.Screen name="OrderCreate" getComponent={lazy(() => require('../modules/orders/screens/OrderCreateScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="OrderDetail" getComponent={lazy(() => require('../modules/orders/screens/OrderDetailScreen'))} />
        <Stack.Screen name="StockEntry" getComponent={lazy(() => require('../modules/inventory/screens/StockEntryScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="InventoryHistory" getComponent={lazy(() => require('../modules/inventory/screens/InventoryHistoryScreen'))} />
        <Stack.Screen name="Subscriptions" getComponent={lazy(() => require('../modules/subscriptions/screens/SubscriptionsScreen'))} />
        <Stack.Screen name="SubscriptionForm" getComponent={lazy(() => require('../modules/subscriptions/screens/SubscriptionFormScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="StaffList" getComponent={lazy(() => require('../modules/delivery/screens/StaffListScreen'))} />
        <Stack.Screen name="StaffForm" getComponent={lazy(() => require('../modules/delivery/screens/StaffFormScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="StaffDetail" getComponent={lazy(() => require('../modules/delivery/screens/StaffDetailScreen'))} />
        <Stack.Screen name="DeliveryMode" getComponent={lazy(() => require('../modules/delivery/screens/DeliveryModeScreen'))} />
        <Stack.Screen name="Payments" getComponent={lazy(() => require('../modules/payments/screens/PaymentsScreen'))} />
        <Stack.Screen name="RecordPayment" getComponent={lazy(() => require('../modules/payments/screens/RecordPaymentScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="DepositRefund" getComponent={lazy(() => require('../modules/payments/screens/DepositRefundScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Expenses" getComponent={lazy(() => require('../modules/expenses/screens/ExpensesScreen'))} />
        <Stack.Screen name="ExpenseForm" getComponent={lazy(() => require('../modules/expenses/screens/ExpenseFormScreen'))} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Reports" getComponent={lazy(() => require('../modules/reports/screens/ReportsScreen'))} />
        <Stack.Screen name="Notifications" getComponent={lazy(() => require('../modules/notifications/screens/NotificationsScreen'))} />
        <Stack.Screen name="Settings" getComponent={lazy(() => ({ default: require('../modules/settings/screens/SettingsScreens').SettingsHomeScreen }))} />
        <Stack.Screen name="BusinessProfile" getComponent={lazy(() => ({ default: require('../modules/settings/screens/SettingsScreens').BusinessProfileScreen }))} />
        <Stack.Screen name="TaxCharges" getComponent={lazy(() => ({ default: require('../modules/settings/screens/SettingsScreens').TaxChargesScreen }))} />
        <Stack.Screen name="PaymentMethodsSettings" getComponent={lazy(() => ({ default: require('../modules/settings/screens/SettingsScreens').PaymentMethodsScreen }))} />
        <Stack.Screen name="InvoiceSettings" getComponent={lazy(() => ({ default: require('../modules/settings/screens/SettingsScreens').InvoiceSettingsScreen }))} />
        <Stack.Screen name="NotificationPrefs" getComponent={lazy(() => ({ default: require('../modules/settings/screens/SettingsScreens').NotificationPrefsScreen }))} />
        <Stack.Screen name="Appearance" getComponent={lazy(() => ({ default: require('../modules/settings/screens/SettingsScreens').AppearanceScreen }))} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
