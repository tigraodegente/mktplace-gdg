// Tipos do banco de dados
import type { Database as DatabaseClass } from './database';

// Re-exportar a classe Database como tipo
export type Database = DatabaseClass;

// Tipos básicos de consulta
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

// Tipo para RPC functions
export interface DatabaseRPC {
  rpc: (functionName: string, params?: any) => {
    single: () => Promise<{ data: any; error: any }>;
  };
  from: (table: string) => any;
}

// Estender Database com métodos específicos do Supabase-like
export interface DatabaseWithRPC extends Database {
  rpc(functionName: string, params?: any): {
    single(): Promise<{ data: any; error?: any }>;
  };
  from(table: string): {
    select(columns?: string): any;
    insert(data: any): any;
    update(data: any): any;
    delete(): any;
    upsert(data: any): any;
    eq(column: string, value: any): any;
    single(): any;
    order(column: string, options?: { ascending?: boolean }): any;
    limit(count: number): any;
    is(column: string, value: any): any;
    gt(column: string, value: any): any;
  };
} 