import { db } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await db().prepare('SELECT key FROM content LIMIT 1').all();
    return Response.json({status:'ok'}, {headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({status:'unavailable'}, {status:503}); }
}
