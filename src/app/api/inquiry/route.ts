import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  }
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!input || typeof input !== 'object') {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  const payload = input as Record<string, unknown>;
  const text = (key: string) => typeof payload[key] === 'string' ? (payload[key] as string).trim() : '';
  const name = text('name'), email = text('email'), message = text('message');
  const website = text('website');
  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
      email.length > 254 || message.length < 10 || message.length > 3000) {
    return NextResponse.json({ error: 'Please check your name, email and message.' }, { status: 400 });
  }
  if (process.env.CONTENT_SOURCE !== 'strapi') {
    return NextResponse.json({ error: 'Local preview only. Connect Strapi to save inquiries.' }, { status: 503 });
  }
  try {
    const response = await fetch(`${process.env.STRAPI_URL || 'http://localhost:1337'}/api/public-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message, website }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: response.status === 429 ? 'Please try again shortly.' : 'Unable to save your inquiry.' },
        { status: response.status === 429 ? 429 : 502 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Service unavailable. Please try again.' }, { status: 503 });
  }
}
