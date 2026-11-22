import { createNextState } from '@reduxjs/toolkit';
import type { PersistedState } from 'redux-persist';
import { Ctx, DbState } from '../types/domain';
import { upgradeWorkspace } from '../modules/products/services/capacityService';
import { ensureWorkspaceDefaults } from '../modules/products/services/productService';
import { defaultSettings } from '../constants/settingsDefaults';

type Persisted = PersistedState & { db?: DbState; auth?: { user?: { id: string } | null }; workspaces?: Record<string, DbState> };

/** Runs once per install when the saved state is older than `version`; never on ordinary launches. */
export const migrations = {
  // v2: saved bottle sizes per workspace (standard 8 + any custom size already on a product), and workspaces owned per account.
  2: (state: PersistedState) => {
    const s = state as Persisted;
    if (!s?.db) return state;
    const now = new Date().toISOString();
    const db = createNextState(s.db, (d) => {
      upgradeWorkspace(d as DbState, now);
      if (!d.ownerId && s.auth?.user?.id) d.ownerId = s.auth.user.id;
    });
    return { ...s, db, workspaces: s.workspaces ?? {} } as PersistedState;
  },
  // v3: v2 only created size records, so a workspace without the standard products showed sizes but an empty
  // Product List. Create any missing standard product, in the active workspace and every parked one.
  3: (state: PersistedState) => {
    const s = state as Persisted;
    if (!s?.db) return state;
    const ctx: Ctx = { now: new Date().toISOString(), settings: defaultSettings() };
    const up = (w: DbState) => createNextState(w, (d) => { ensureWorkspaceDefaults(d as DbState, ctx); });
    const workspaces = Object.fromEntries(Object.entries(s.workspaces ?? {}).map(([k, w]) => [k, up(w)]));
    return { ...s, db: up(s.db), workspaces } as PersistedState;
  },
};
export const PERSIST_VERSION = 3;
