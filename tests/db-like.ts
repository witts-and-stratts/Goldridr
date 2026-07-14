import type Database from "better-sqlite3";
import type { DatabaseLike, RunResult } from "../src/lib/db-client";

export function asDatabaseLike( db: Database.Database ): DatabaseLike {
  return {
    exec( sql: string ) {
      db.exec( sql );
    },
    prepare( sql: string ) {
      const statement = db.prepare( sql );
      return {
        get( ...args: unknown[] ) {
          return statement.get( ...args );
        },
        all( ...args: unknown[] ) {
          return statement.all( ...args );
        },
        run( ...args: unknown[] ): RunResult {
          const result = statement.run( ...args );
          return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
          };
        },
      };
    },
    transaction<T>( callback: ( tx: DatabaseLike ) => T | Promise<T> ) {
      return async () => callback( asDatabaseLike( db ) );
    },
  };
}
