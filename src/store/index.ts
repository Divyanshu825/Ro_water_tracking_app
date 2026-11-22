import { combineReducers, configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer, persistStore } from 'redux-persist';
import db from './dbSlice';
import settings from './settingsSlice';
import auth from './authSlice';

const rootReducer = combineReducers({ db, settings, auth });

const persisted = persistReducer(
  { key: 'bottle-track-v1', storage: AsyncStorage, whitelist: ['db', 'settings', 'auth'], version: 1 },
  rootReducer,
);

export const store = configureStore({
  reducer: persisted,
  middleware: (gdm) =>
    gdm({
      immutableCheck: false,
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER], warnAfter: 200 },
    }),
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
