import type { AppDispatch, RootState } from './index';
import { dbActions } from './dbSlice';
import { UNCLAIMED, workspacesActions } from './workspacesSlice';
import { buildSeed, freshWorkspaceDb } from '../services/seed';
import { DEMO_ACCOUNT_ID } from './authSlice';

/**
 * Makes `userId`'s workspace the active `db`, parking the current one so each business keeps its own data.
 * - Same owner already active: nothing to do (no work on repeated launches or screen visits).
 * - `fresh` (new registration): always starts a new workspace with the default catalogue and sizes.
 * - Data saved before workspaces were per-account is adopted by the first account that signs in.
 */
export const activateWorkspace = (userId: string, opts: { fresh?: boolean } = {}) => (dispatch: AppDispatch, getState: () => RootState) => {
  const { db, workspaces } = getState();
  if (!opts.fresh && db.ownerId === userId) return;
  if (!opts.fresh && !db.ownerId) { dispatch(dbActions.setOwner(userId)); return; }

  dispatch(workspacesActions.park({ key: db.ownerId ?? UNCLAIMED, db }));
  const key = opts.fresh ? undefined : workspaces[userId] ? userId : workspaces[UNCLAIMED] ? UNCLAIMED : undefined;
  const next = key ? workspaces[key] : opts.fresh || userId !== DEMO_ACCOUNT_ID ? freshWorkspaceDb() : buildSeed();
  dispatch(dbActions.load({ ...next, ownerId: userId }));
  if (key) dispatch(workspacesActions.remove(key));
};
