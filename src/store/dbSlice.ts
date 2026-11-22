import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { Ctx, DbState } from '../types/domain';
import { Op, applyOp } from '../services/engine';
import { buildSeed, emptyDb, freshWorkspaceDb } from '../services/seed';

const slice = createSlice({
  name: 'db',
  initialState: buildSeed() as DbState,
  reducers: {
    // The thunk validates first (dry-run); the reducer then replays the exact same op deterministically.
    apply: (state: DbState, action: PayloadAction<{ op: Op; ctx: Ctx }>) => {
      applyOp(state, action.payload.op, action.payload.ctx);
    },
    resetDemo: () => buildSeed(),
    initWorkspace: () => freshWorkspaceDb(),
    clearAll: () => {
      const db = emptyDb();
      return db;
    },
  },
});

export const dbActions = slice.actions;
export default slice.reducer;
