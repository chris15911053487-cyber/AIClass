// Cloudflare Sites uses its verified owner identity, never app-owned passwords.
export async function verifyPassword(_password: string, _encoded: string) { return false; }
export async function hashPassword(_password: string, _minLength?: number): Promise<string> { throw new Error('Password accounts are only available in the self-hosted build.'); }
