export type ID = string;

export type CustomerType = 'Home' | 'Office' | 'Hotel' | 'Restaurant' | 'Shop' | 'Corporate';
export const CUSTOMER_TYPES: CustomerType[] = ['Home', 'Office', 'Hotel', 'Restaurant', 'Shop', 'Corporate'];

export interface Address { id: ID; label: string; line: string; city: string; pincode: string }

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  type: CustomerType;
  addresses: Address[];
  active: boolean;
  notes: string;
  createdAt: string;
}

export interface Product {
  id: ID;
  name: string;
  capacityMl: number;
  sellingPrice: number;
  purchaseCost: number;
  deposit: number;
  returnable: boolean;
  active: boolean;
  lowStockThreshold: number;
  image?: string;
}

/** A bottle size this business sells. One record per size; drives the capacity chips on Products. */
export interface Capacity {
  id: ID;
  ml: number;
  /** Optional display name, e.g. "Jumbo jar". Empty means show the formatted size. */
  label: string;
  /** Created from the standard size list rather than by the owner. Owners can still edit or delete it. */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockField = 'filled' | 'empty' | 'withCustomers' | 'withStaff' | 'damaged' | 'lost';
export const STOCK_FIELDS: StockField[] = ['filled', 'empty', 'withCustomers', 'withStaff', 'damaged', 'lost'];
export type StockRecord = { productId: ID } & Record<StockField, number>;

export type InvTxnType =
  | 'opening' | 'new_stock' | 'purchase' | 'refill' | 'adjustment' | 'damaged' | 'lost'
  | 'collect_empty' | 'dispatch' | 'delivery' | 'return_to_stock';

export interface InventoryTxn {
  id: ID;
  productId: ID;
  type: InvTxnType;
  qty: number;
  delta: Partial<Record<StockField, number>>;
  refKey?: string;
  orderId?: ID;
  customerId?: ID;
  staffId?: ID;
  note: string;
  at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled', 'failed'];

export interface OrderItem {
  productId: ID;
  name: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  unitDeposit: number;
  returnable: boolean;
}

export interface Order {
  id: ID;
  number: string;
  customerId: ID;
  addressId: ID;
  items: OrderItem[];
  deliveryDate: string;
  timeSlot: string;
  instructions: string;
  discount: number;
  deliveryCharge: number;
  taxAmount: number;
  /** Estimated until delivered, then the actual deposit charged. */
  depositAmount: number;
  status: OrderStatus;
  staffId?: ID;
  createdAt: string;
  deliveredAt?: string;
  statusHistory: { status: OrderStatus; at: string; note?: string }[];
  dispatchCycle: number;
  dispatched: boolean;
  subscriptionId?: ID;
  failureReason?: string;
  emptiesCollected?: Record<ID, number>;
}

export type PaymentMethod = 'cash' | 'upi' | 'online' | 'bank_transfer';
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'online', 'bank_transfer'];

/** Every financial movement is one entry; amounts are positive magnitudes. */
export type EntryKind = 'product' | 'delivery' | 'tax' | 'deposit' | 'discount' | 'payment' | 'deposit_refund';

export interface FinancialEntry {
  id: ID;
  customerId: ID;
  orderId?: ID;
  kind: EntryKind;
  amount: number;
  method?: PaymentMethod;
  collectedBy?: ID;
  receiptNo?: string;
  note: string;
  at: string;
}

export interface BottleEntry {
  id: ID;
  customerId: ID;
  productId: ID;
  /** + delivered to customer, - returned/lost */
  delta: number;
  /** change in number of bottles whose deposit is held */
  depositDelta: number;
  orderId?: ID;
  note: string;
  at: string;
}

export type Frequency = 'daily' | 'alternate' | 'weekly' | 'monthly' | 'custom';
export type SubStatus = 'active' | 'paused' | 'cancelled';
export interface Subscription {
  id: ID;
  customerId: ID;
  addressId: ID;
  items: { productId: ID; qty: number }[];
  frequency: Frequency;
  intervalDays: number;
  startDate: string;
  endDate: string;
  timeSlot: string;
  status: SubStatus;
  /** date -> order id; guarantees one order per scheduled date */
  generated: Record<string, ID>;
  createdAt: string;
}

export interface Staff {
  id: ID;
  name: string;
  phone: string;
  vehicle: string;
  active: boolean;
  joinedAt: string;
}

export type ExpenseCategory = 'Fuel' | 'Staff Salary' | 'Electricity' | 'Vehicle Maintenance' | 'Bottle Purchase' | 'Other';
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Fuel', 'Staff Salary', 'Electricity', 'Vehicle Maintenance', 'Bottle Purchase', 'Other'];
export interface Expense {
  id: ID;
  category: ExpenseCategory;
  amount: number;
  date: string;
  method: PaymentMethod;
  description: string;
  createdAt: string;
}

export type NotifType =
  | 'new_order' | 'delivery_assigned' | 'payment_received' | 'pending_payment'
  | 'low_stock' | 'subscription_expiry' | 'delivery_completed' | 'delivery_failed';
export interface AppNotification {
  id: ID;
  type: NotifType;
  title: string;
  body: string;
  at: string;
  read: boolean;
  refType?: 'order' | 'customer' | 'product' | 'subscription';
  refId?: ID;
}

export interface SettingsState {
  business: { name: string; phone: string; email: string; address: string; gstin: string; logo?: string };
  currency: { code: string; symbol: string; locale: string };
  tax: { enabled: boolean; rate: number; label: string };
  delivery: { defaultCharge: number; freeAbove: number };
  depositEnabled: boolean;
  allowNegativeStock: boolean;
  paymentMethods: Record<PaymentMethod, boolean>;
  invoice: { prefix: string; footer: string; terms: string; showLogo: boolean };
  notifications: Record<NotifType, boolean>;
  theme: 'system' | 'light' | 'dark';
}

export interface DbState {
  /** Account that owns this workspace. Unset only for data created before workspaces were per-account. */
  ownerId?: ID;
  customers: Customer[];
  products: Product[];
  capacities: Capacity[];
  staff: Staff[];
  orders: Order[];
  stock: Record<ID, StockRecord>;
  inventoryTxns: InventoryTxn[];
  financialEntries: FinancialEntry[];
  bottleLedger: BottleEntry[];
  subscriptions: Subscription[];
  expenses: Expense[];
  notifications: AppNotification[];
  counters: { seq: number; order: number; receipt: number };
  /** idempotency keys of already-applied one-time effects */
  appliedKeys: Record<string, true>;
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface Ctx { now: string; settings: SettingsState }
