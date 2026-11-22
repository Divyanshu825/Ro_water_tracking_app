import { PayloadAction, createNextState, createSlice } from '@reduxjs/toolkit';
import { Ctx, DbState, ID } from '../types/domain';
import { Op, applyOp } from '../services/engine';
import { buildSeed, emptyDb } from '../services/seed';
import { ensureDefaultProducts, ensureWorkspaceDefaults } from '../modules/products/services/productService';
import { defaultSettings } from '../constants/settingsDefaults';

const initCtx = (): Ctx => ({ now: new Date().toISOString(), settings: defaultSettings() });

const slice = createSlice({
  name: 'db',
  initialState: buildSeed() as DbState,
  reducers: {
    // The thunk validates first (dry-run); the reducer then replays the exact same op deterministically.
    apply: (state: DbState, action: PayloadAction<{ op: Op; ctx: Ctx }>) => {
      applyOp(state, action.payload.op, action.payload.ctx);
    },
    // Resets keep the workspace attached to the signed-in account.
    resetDemo: (s) => ({ ...buildSeed(), ownerId: s.ownerId }),
    // Erasing data still leaves the standard sizes and catalogue, like a new account.
    clearAll: (s) => { const db = emptyDb(); ensureDefaultProducts(db, initCtx()); return { ...db, ownerId: s.ownerId }; },
    /** Makes `db` the active workspace (used when switching accounts). */
    // Upgrade is an idempotent safety net for workspaces saved by older versions; the payload may be frozen state, so copy-on-write.
    load: (_s, a: PayloadAction<DbState>) => createNextState(a.payload, (d) => { ensureWorkspaceDefaults(d as DbState, initCtx()); }),
    setOwner: (s, a: PayloadAction<ID>) => { s.ownerId = a.payload; },
  },
});

export const dbActions = slice.actions;
export default slice.reducer;
