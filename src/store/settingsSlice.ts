import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { SettingsState } from '../types/domain';
import { defaultSettings } from '../constants/settingsDefaults';

const slice = createSlice({
  name: 'settings',
  initialState: defaultSettings(),
  reducers: {
    patch: (state, a: PayloadAction<Partial<SettingsState>>) => ({ ...state, ...a.payload }),
    reset: () => defaultSettings(),
  },
});
export const settingsActions = slice.actions;
export default slice.reducer;
