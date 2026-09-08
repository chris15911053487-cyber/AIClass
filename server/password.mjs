import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  if (password.length < 12 || password.length > 256) throw new Error('Administrator password must contain 12–256 characters');
  const salt = randomBytes(16).toString('hex');
  const digest = await scrypt(password, salt, 64, { N: 32768, maxmem: 67108864 });
  return `scrypt:${salt}:${digest.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const parts = (encoded || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2]) || typeof password !== 'string' || password.length > 256) return false;
  const digest = await scrypt(password, parts[1], 64, { N: 32768, maxmem: 67108864 });
  return timingSafeEqual(digest, Buffer.from(parts[2], 'hex'));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input = ''; for await (const chunk of process.stdin) input += chunk;
  console.log(await hashPassword(input.replace(/\r?\n$/, '')));
}
