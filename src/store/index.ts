import { combineReducers, configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, createMigrate, persistReducer, persistStore } from 'redux-persist';
import db from './dbSlice';
import settings from './settingsSlice';
import auth from './authSlice';
import workspaces from './workspacesSlice';
import { PERSIST_VERSION, migrations } from './migrations';

const rootReducer = combineReducers({ db, settings, auth, workspaces });

const persisted = persistReducer(
  { key: 'bottle-track-v1', storage: AsyncStorage, whitelist: ['db', 'settings', 'auth', 'workspaces'], version: PERSIST_VERSION, migrate: createMigrate(migrations, { debug: false }) },
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
