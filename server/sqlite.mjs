import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

export function openDatabase(path) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  const connection = new DatabaseSync(path);
  connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  return connection;
}
export function migrate(connection, directory) {
  connection.exec('CREATE TABLE IF NOT EXISTS academy_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL)');
  for (const name of readdirSync(directory).filter(n => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(resolve(directory, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    connection.exec('BEGIN IMMEDIATE');
    try {
      const previous = connection.prepare('SELECT checksum FROM academy_migrations WHERE name=?').get(name);
      if (previous && previous.checksum !== checksum) throw new Error('Applied migration was modified: ' + name);
      if (!previous) {
        connection.exec(sql);
        connection.prepare('INSERT INTO academy_migrations VALUES(?,?,?)').run(name, checksum, Date.now());
      }
      connection.exec('COMMIT');
    } catch (error) { connection.exec('ROLLBACK'); throw error; }
  }
}
export function adaptDatabase(connection) {
  const statement = (sql, params = []) => ({
    bind(...values) { return statement(sql, values); },
    async first(column) { const row = connection.prepare(sql).get(...params); return column ? row?.[column] ?? null : row ?? null; },
    async all() { return { success: true, results: connection.prepare(sql).all(...params) }; },
    async run() { return this.execute(); },
    execute() {
      const stmt = connection.prepare(sql);
      return { success: true, results: stmt.all(...params) };
    },
  });
  return {
    prepare(sql) { return statement(sql); },
    async batch(statements) {
      connection.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(s => s.execute()); connection.exec('COMMIT'); return results; }
      catch (error) { connection.exec('ROLLBACK'); throw error; }
    },
  };
}
let singleton;
export function getDatabase() {
  if (!singleton) singleton = adaptDatabase(openDatabase(process.env.DATABASE_PATH || '/data/academy.sqlite'));
  return singleton;
}
