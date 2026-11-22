import { NotifType, SettingsState } from '../types/domain';

export const NOTIF_LABELS: Record<NotifType, string> = {
  new_order: 'New orders',
  delivery_assigned: 'Delivery assigned',
  payment_received: 'Payment received',
  pending_payment: 'Pending payments',
  low_stock: 'Low stock alerts',
  subscription_expiry: 'Subscription expiry',
  delivery_completed: 'Delivery completed',
  delivery_failed: 'Failed deliveries',
};

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN', label: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', locale: 'en-US', label: 'US Dollar ($)' },
  { code: 'AED', symbol: 'AED ', locale: 'en-AE', label: 'UAE Dirham (AED)' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'British Pound (£)' },
];

export const defaultSettings = (): SettingsState => ({
  business: {
    name: 'AquaPure Water Supply', phone: '+91 98765 43210', email: 'hello@aquapure.in',
    address: '14, Industrial Area, Phase 2, Pune 411019', gstin: '27ABCDE1234F1Z5',
  },
  currency: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  tax: { enabled: false, rate: 5, label: 'GST' },
  delivery: { defaultCharge: 20, freeAbove: 300 },
  depositEnabled: true,
  allowNegativeStock: false,
  paymentMethods: { cash: true, upi: true, online: true, bank_transfer: true },
  invoice: {
    prefix: 'INV', footer: 'Thank you for choosing AquaPure. Stay hydrated!',
    terms: 'Bottle deposits are refundable on return of bottles in good condition.', showLogo: true,
  },
  notifications: {
    new_order: true, delivery_assigned: true, payment_received: true, pending_payment: true,
    low_stock: true, subscription_expiry: true, delivery_completed: true, delivery_failed: true,
  },
  theme: 'system',
});
