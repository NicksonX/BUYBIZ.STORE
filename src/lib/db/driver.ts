export type SqlParam =
  | string
  | number
  | boolean
  | null
  | Date
  | Record<string, unknown>
  | unknown[];

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface SqlTransaction {
  query<T = Record<string, unknown>>(
    text: string,
    params?: SqlParam[],
  ): Promise<QueryResult<T>>;
}

export interface Database extends SqlTransaction {
  transaction<T>(fn: (tx: SqlTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
