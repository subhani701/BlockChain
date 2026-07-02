/**
 * Ambient declaration for Node's built-in `node:sqlite` module (experimental,
 * available in Node >= 22.5). @types/node@20 does not ship these types yet, so
 * we declare the small surface we use. Remove once @types/node is upgraded.
 */
declare module "node:sqlite" {
  export interface StatementSync {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }
  export class DatabaseSync {
    constructor(path: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
