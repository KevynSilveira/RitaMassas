import { Platform } from 'react-native';

import { INIT_SQL_NATIVE, INIT_SQL_SHARED } from './dbSchema';
import { createWebDatabase, type WebSqliteDatabase } from './web-sqlite-client';

export type AppSqliteDatabase =
  | import('expo-sqlite').SQLiteDatabase
  | WebSqliteDatabase;

export async function openAppDatabase(): Promise<AppSqliteDatabase> {
  if (Platform.OS === 'web') {
    return createWebDatabase(INIT_SQL_SHARED);
  }
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync('ritamassas.db');
  await db.execAsync(INIT_SQL_NATIVE);
  return db;
}
