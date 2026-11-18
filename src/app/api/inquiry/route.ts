import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { MAX_BODY_BYTES, validateInquiry } from '../../../../shared/inquiry.cjs';

const error = (status: number, message: string, headers?: HeadersInit) =>
  NextResponse.json({ error: message }, { status, headers });

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

function acceptsOrigin(origin: string, configuredOrigin: string) {
  try {
    const expected = new URL(configuredOrigin);
    if (origin === expected.origin) return true;
    const actual = new URL(origin);
    return actual.origin === origin && actual.protocol === expected.protocol && actual.port === expected.port &&
      loopbackHosts.has(expected.hostname) && loopbackHosts.has(actual.hostname);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') return error(415, 'Unsupported content type.');
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return error(413, 'Inquiry is too large.');

  const allowedOrigin = process.env.FRONTEND_PUBLIC_URL;
  const requestOrigin = request.headers.get('origin');
  if (allowedOrigin && requestOrigin && !acceptsOrigin(requestOrigin, allowedOrigin)) {
    return error(403, 'Unexpected request origin.');
  }

  const reader = request.body?.getReader();
  if (!reader) return error(400, 'Missing inquiry.');
  let input: unknown;
  try {
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return error(413, 'Inquiry is too large.');
      }
      chunks.push(chunk.value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return error(400, 'Invalid JSON.');
  } finally {
    reader.releaseLock();
  }

  const inquiry = validateInquiry(input);
  if (!inquiry) return error(400, 'Invalid inquiry.');

  const secret = process.env.INQUIRY_PROXY_SECRET;
  if (process.env.CONTENT_SOURCE !== 'strapi' || !secret || secret.length < 32) {
    return error(503, 'Inquiry service unavailable.');
  }

  // Railway sets X-Real-IP at the public edge. Local requests share a fallback bucket.
  const suggestedIp = process.env.RAILWAY_ENVIRONMENT_ID ? request.headers.get('x-real-ip') : null;
  const ip = suggestedIp && isIP(suggestedIp) ? suggestedIp : 'unknown';

  try {
    const response = await fetch(new URL('/api/public-inquiries', process.env.STRAPI_URL || 'http://127.0.0.1:1337'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        'X-Nota-Client-IP': ip,
      },
      body: JSON.stringify(inquiry),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
      redirect: 'error',
    });
    if (response.status === 429) return error(429, 'Too many attempts.', { 'Retry-After': '60' });
    if (response.status !== 201) return error(502, 'Unable to save the inquiry.');
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return error(503, 'Inquiry service unavailable.');
  }
}
