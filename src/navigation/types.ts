import { NavigatorScreenParams } from '@react-navigation/native';
import { InventoryEntryKind } from '../modules/inventory/services/inventoryService';
import { ID } from '../types/domain';

export type TabParamList = { Home: undefined; Customers: undefined; Orders: { status?: string } | undefined; Inventory: undefined; More: undefined };

export type RootStackParamList = {
  Splash: undefined; Welcome: undefined; Login: undefined; Register: undefined; ForgotPassword: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  CustomerForm: { id?: ID } | undefined; CustomerDetail: { id: ID };
  ProductList: undefined; ProductForm: { id?: ID } | undefined;
  OrderCreate: { customerId?: ID } | undefined; OrderDetail: { id: ID };
  StockEntry: { kind?: InventoryEntryKind; productId?: ID } | undefined; InventoryHistory: { productId?: ID } | undefined;
  Subscriptions: undefined; SubscriptionForm: { id?: ID } | undefined;
  StaffList: undefined; StaffForm: { id?: ID } | undefined; StaffDetail: { id: ID }; DeliveryMode: undefined;
  Payments: undefined; RecordPayment: { customerId?: ID } | undefined; DepositRefund: { customerId?: ID } | undefined;
  Expenses: undefined; ExpenseForm: { id?: ID } | undefined;
  Reports: undefined; Notifications: undefined;
  Settings: undefined; BusinessProfile: undefined; TaxCharges: undefined; PaymentMethodsSettings: undefined;
  InvoiceSettings: undefined; NotificationPrefs: undefined; Appearance: undefined;
};
