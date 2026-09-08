import { getDatabase } from '../server/sqlite.mjs';
// Built only for the standalone Node target. Identity headers are never trusted here.
export const env = new Proxy({} as Cloudflare.Env & Record<string, string>, {
  get(_target, key) {
    if (key === 'DB') return getDatabase();
    if (key === 'DEPLOYMENT_TARGET') return 'docker';
    return process.env[String(key)] || '';
  },
});
