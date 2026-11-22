import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export interface AuthUser { id: string; name: string; email: string; business: string }
export interface MockAccount extends AuthUser { password: string }
export const DEMO_ACCOUNT_ID = 'u_demo';

interface AuthState { user: AuthUser | null; seenWelcome: boolean; accounts: MockAccount[] }

const initialState: AuthState = {
  user: null,
  seenWelcome: false,
  // Demo account. A real backend replaces authService, not this slice.
  accounts: [{ id: DEMO_ACCOUNT_ID, name: 'Aarav Mehta', email: 'owner@aquapure.in', business: 'AquaPure Water Supply', password: 'demo1234' }],
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (s, a: PayloadAction<AuthUser | null>) => { s.user = a.payload; },
    addAccount: (s, a: PayloadAction<MockAccount>) => { s.accounts.push(a.payload); },
    setPassword: (s, a: PayloadAction<{ email: string; password: string }>) => {
      const acc = s.accounts.find((x) => x.email === a.payload.email);
      if (acc) acc.password = a.payload.password;
    },
    welcomeSeen: (s) => { s.seenWelcome = true; },
  },
});
export const authActions = slice.actions;
export default slice.reducer;
