import type { Database, SqlJsStatic } from 'sql.js';
import initSqlJs from 'sql.js';

const SQL_JS_VERSION = '1.14.1';
const STORAGE_KEY = 'ritamassas_sqljs_v1';

let sqlModulePromise: Promise<SqlJsStatic> | undefined;

function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/sql.js@${SQL_JS_VERSION}/dist/${file}`,
    });
  }
  return sqlModulePromise;
}

function loadFromStorage(): Uint8Array | null {
  if (typeof localStorage === 'undefined') return null;
  const s = localStorage.getItem(STORAGE_KEY);
  if (!s) return null;
  try {
    const binary = atob(s);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function saveToStorage(db: Database): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const data = db.export();
    let binary = '';
    for (let i = 0; i < data.length; i++)
      binary += String.fromCharCode(data[i]);
    localStorage.setItem(STORAGE_KEY, btoa(binary));
  } catch (e) {
    console.warn('ritamassas: falha ao persistir SQLite web', e);
  }
}

function bindParams(rest: unknown[]): unknown[] {
  if (rest.length === 1 && Array.isArray(rest[0])) {
    return rest[0] as unknown[];
  }
  return rest;
}

function getTransactionCommand(source: string): 'begin' | 'commit' | 'rollback' | null {
  const normalized = source.trim().toUpperCase();

  if (
    normalized === 'BEGIN' ||
    normalized === 'BEGIN IMMEDIATE' ||
    normalized === 'BEGIN TRANSACTION' ||
    normalized === 'BEGIN EXCLUSIVE'
  ) {
    return 'begin';
  }

  if (normalized === 'COMMIT' || normalized === 'END') {
    return 'commit';
  }

  if (normalized === 'ROLLBACK') {
    return 'rollback';
  }

  return null;
}

/**
 * Subconjunto da API do expo-sqlite usado pelo app (web).
 */
export class WebSqliteDatabase {
  private inTransaction = false;

  constructor(private readonly db: Database) {}

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
    this.syncTransactionState(source);
    this.persistIfNeeded();
  }

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    const bind = bindParams(params);
    if (bind.length === 0) {
      this.db.run(source);
    } else {
      this.db.run(source, bind as (string | number | Uint8Array | null)[]);
    }
    const stmt = this.db.prepare(
      'SELECT changes() AS c, last_insert_rowid() AS i'
    );
    stmt.step();
    const row = stmt.getAsObject() as { c: number; i: number };
    stmt.free();
    this.syncTransactionState(source);
    this.persistIfNeeded();
    return {
      changes: Number(row.c) || 0,
      lastInsertRowId: Number(row.i) || 0,
    };
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    const bind = bindParams(params);
    const stmt = this.db.prepare(source);
    if (bind.length) {
      stmt.bind(bind as (string | number | Uint8Array | null)[]);
    }
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const obj = stmt.getAsObject() as T;
    stmt.free();
    return obj;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    const bind = bindParams(params);
    const stmt = this.db.prepare(source);
    if (bind.length) {
      stmt.bind(bind as (string | number | Uint8Array | null)[]);
    }
    const out: T[] = [];
    while (stmt.step()) {
      out.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return out;
  }

  private syncTransactionState(source: string) {
    const command = getTransactionCommand(source);

    if (command === 'begin') {
      this.inTransaction = true;
      return;
    }

    if (command === 'commit' || command === 'rollback') {
      this.inTransaction = false;
    }
  }

  private persistIfNeeded() {
    if (!this.inTransaction) {
      saveToStorage(this.db);
    }
  }
}

export async function createWebDatabase(
  initSql: string
): Promise<WebSqliteDatabase> {
  const SQL = await loadSqlJs();
  const saved = loadFromStorage();
  const db = saved ? new SQL.Database(saved) : new SQL.Database();
  try {
    db.exec(initSql);
  } catch (e) {
    console.error('ritamassas: init SQL web', e);
    throw e;
  }
  saveToStorage(db);
  return new WebSqliteDatabase(db);
}
