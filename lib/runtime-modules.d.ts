declare module '@academy/runtime' {
  export const env: Cloudflare.Env & Record<string, string>;
}
declare module '@academy/admin-password' {
  export function verifyPassword(password: string, encoded: string): Promise<boolean>;
}
