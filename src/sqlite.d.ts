declare module "bun:sqlite" {
  export interface Statement {
    run(...params: unknown[]): void;
    get(...params: unknown[]): any;
    all(...params: unknown[]): any[];
  }

  export class Database {
    constructor(path: string, options?: { create?: boolean });
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }
}
