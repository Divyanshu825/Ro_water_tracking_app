import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { DbState } from '../types/domain';

/**
 * Saved workspaces of the accounts that are not signed in, keyed by account id. The signed-in account's
 * workspace lives in the `db` slice; switching accounts parks it here and loads the other one.
 */
export type WorkspacesState = Record<string, DbState>;

/** Key for data that existed before workspaces were per-account and was never claimed by a sign-in. */
export const UNCLAIMED = '__unclaimed';

const slice = createSlice({
  name: 'workspaces',
  initialState: {} as WorkspacesState,
  reducers: {
    park: (s, a: PayloadAction<{ key: string; db: DbState }>) => { s[a.payload.key] = a.payload.db; },
    remove: (s, a: PayloadAction<string>) => { delete s[a.payload]; },
  },
});
export const workspacesActions = slice.actions;
export default slice.reducer;
