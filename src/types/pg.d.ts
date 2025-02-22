declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    ssl?: boolean | { rejectUnauthorized: boolean };
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
  }

  export interface QueryResult<T> {
    rows: T[];
    rowCount: number;
    command: string;
    oid: number;
    fields: any[];
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    query<T>(text: string, values?: any[]): Promise<QueryResult<T>>;
  }

  export class PoolClient {
    query<T>(text: string, values?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }
} 