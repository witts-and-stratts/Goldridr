import type { Client, InArgs, InStatement, InValue, ResultSet, Transaction, TransactionMode } from "@libsql/client/node";
import { AsyncLocalStorage } from "node:async_hooks";

export type DbConnection = Client | Transaction;

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface PreparedStatement {
  get( ...args: InValue[] ): unknown | Promise<unknown>;
  all( ...args: InValue[] ): unknown[] | Promise<unknown[]>;
  run( ...args: InValue[] ): RunResult | Promise<RunResult>;
}

export interface DatabaseLike {
  exec( sql: string ): unknown;
  prepare( sql: string ): PreparedStatement;
  transaction( callback: ( tx: DatabaseLike ) => unknown ): () => unknown;
}

let clientPromise: Promise<Client> | null = null;
let databasePromise: Promise<DatabaseLike> | null = null;
const transactionStorage = new AsyncLocalStorage<DbConnection>();

function getDatabaseUrl(): string {
  return process.env.TURSO_DATABASE_URL
    || process.env.DATABASE_URL
    || ( process.env.NODE_TEST_CONTEXT
      ? `file:/tmp/goldridr-test-${ process.pid }.db`
      : "file:bookings.db" );
}

async function createLibsqlClient(): Promise<Client> {
  const url = getDatabaseUrl();
  const config = {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };

  if ( url.startsWith( "file:" ) ) {
    const { createClient } = await import( "@libsql/client/sqlite3" );
    return createClient( config );
  }

  const { createClient } = await import( "@libsql/client/web" );
  return createClient( config );
}

export function getDb(): Promise<Client> {
  clientPromise ??= createLibsqlClient();
  return clientPromise;
}

function toRunResult( result: ResultSet ): RunResult {
  return {
    changes: result.rowsAffected,
    lastInsertRowid: Number( result.lastInsertRowid ?? 0 ),
  };
}

function normalizeArgs( args: InValue[] ): InArgs | undefined {
  return args.length ? args : undefined;
}

function makeDatabaseLike( connection: DbConnection ): DatabaseLike {
  return {
    async exec( sql: string ) {
      const activeConnection = transactionStorage.getStore() ?? connection;
      const statements = sql
        .split( ";" )
        .map( statement => statement.trim() )
        .filter( Boolean );
      if ( statements.length === 0 ) return;
      if ( "batch" in activeConnection ) {
        await ( activeConnection as Client ).batch( statements.map( statement => ( { sql: statement } ) ), "write" );
        return;
      }
      for ( const statement of statements ) {
        await ( activeConnection as Transaction ).execute( statement );
      }
    },
    prepare( sql: string ) {
      return {
        async get<T = Record<string, unknown>>( ...args: InValue[] ) {
          const activeConnection = transactionStorage.getStore() ?? connection;
          const result = await activeConnection.execute( sql, normalizeArgs( args ) );
          return result.rows[ 0 ] as unknown as T | undefined;
        },
        async all<T = Record<string, unknown>>( ...args: InValue[] ) {
          const activeConnection = transactionStorage.getStore() ?? connection;
          const result = await activeConnection.execute( sql, normalizeArgs( args ) );
          return result.rows as unknown as T[];
        },
        async run( ...args: InValue[] ) {
          const activeConnection = transactionStorage.getStore() ?? connection;
          const result = await activeConnection.execute( sql, normalizeArgs( args ) );
          return toRunResult( result );
        },
      };
    },
    transaction<T>( callback: ( tx: DatabaseLike ) => T | Promise<T> ) {
      return async () => transaction( async tx =>
        transactionStorage.run( tx, () => callback( makeDatabaseLike( tx ) ) )
      );
    },
  };
}

export async function getDatabase(): Promise<DatabaseLike> {
  databasePromise ??= getDb().then( makeDatabaseLike );
  return databasePromise;
}

export async function execute( sql: string, args?: InArgs ): Promise<ResultSet> {
  return ( await getDb() ).execute( sql, args );
}

export async function executeOn( db: DbConnection, sql: string, args?: InArgs ): Promise<ResultSet> {
  return db.execute( sql, args );
}

export async function getRow<T extends Record<string, unknown>>( sql: string, args?: InArgs ): Promise<T | undefined> {
  const result = await execute( sql, args );
  return result.rows[ 0 ] as unknown as T | undefined;
}

export async function getRowOn<T extends Record<string, unknown>>(
  db: DbConnection,
  sql: string,
  args?: InArgs
): Promise<T | undefined> {
  const result = await executeOn( db, sql, args );
  return result.rows[ 0 ] as unknown as T | undefined;
}

export async function allRows<T extends Record<string, unknown>>( sql: string, args?: InArgs ): Promise<T[]> {
  const result = await execute( sql, args );
  return result.rows as unknown as T[];
}

export async function allRowsOn<T extends Record<string, unknown>>(
  db: DbConnection,
  sql: string,
  args?: InArgs
): Promise<T[]> {
  const result = await executeOn( db, sql, args );
  return result.rows as unknown as T[];
}

export async function run( sql: string, args?: InArgs ): Promise<ResultSet> {
  return execute( sql, args );
}

export async function runOn( db: DbConnection, sql: string, args?: InArgs ): Promise<ResultSet> {
  return executeOn( db, sql, args );
}

export async function batch(
  statements: Array<InStatement | [ string, InArgs? ]>,
  mode: TransactionMode = "write"
): Promise<ResultSet[]> {
  return ( await getDb() ).batch( statements, mode );
}

export async function transaction<T>(
  callback: ( tx: Transaction ) => Promise<T>,
  mode: TransactionMode = "write"
): Promise<T> {
  const tx = await ( await getDb() ).transaction( mode );
  try {
    const result = await callback( tx );
    await tx.commit();
    return result;
  } catch ( error ) {
    await tx.rollback();
    throw error;
  }
}
