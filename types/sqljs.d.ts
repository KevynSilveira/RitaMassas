declare module 'sql.js' {
  export interface SqlValue {
    [key: string]: unknown;
  }

  export interface Statement {
    bind(values?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    get(): SqlValue[];
    free(): boolean;
  }

  export interface Database {
    exec(sql: string): void;
    run(sql: string, params?: unknown[]): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }

  export interface SqlJsStatic {
    Database: {
      new (data?: ArrayLike<number> | ArrayBuffer): Database;
    };
  }

  function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;

  export default initSqlJs;
}
