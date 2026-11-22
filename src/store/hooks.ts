import { useCallback } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { createNextState } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './index';
import { Op, applyOp } from '../services/engine';
import { dbActions } from './dbSlice';
import { Ctx, DbState, Result } from '../types/domain';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export type OpResult = Result<Record<string, any>>;

/**
 * Runs a business operation: dry-run on a copy first so a failed operation never leaves partial
 * changes, then commits through the reducer. Ids are counter-based so both runs agree.
 */
export const makeExec = (dispatch: AppDispatch, getState: () => RootState) => (op: Op, at?: string): OpResult => {
  const state = getState();
  const ctx: Ctx = { now: at ?? new Date().toISOString(), settings: state.settings };
  let result: OpResult = { ok: false, error: 'Unknown error' };
  try {
    createNextState(state.db as DbState, (draft) => { result = applyOp(draft as DbState, op, ctx) as OpResult; });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong' };
  }
  if (result.ok) dispatch(dbActions.apply({ op, ctx }));
  return result;
};

export function useExec() {
  const dispatch = useAppDispatch();
  const store = useStoreRef();
  return useCallback((op: Op, at?: string) => makeExec(dispatch, store)(op, at), [dispatch, store]);
}

import { useStore } from 'react-redux';
function useStoreRef() {
  const s = useStore<RootState>();
  return s.getState;
}
