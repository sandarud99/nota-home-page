import { getHomepage } from '@/lib/homepage-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getHomepage();
    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
