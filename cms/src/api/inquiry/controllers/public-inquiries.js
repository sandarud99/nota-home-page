const { createHash, timingSafeEqual } = require('node:crypto');
const { isIP } = require('node:net');
const { resolve } = require('node:path');
const { MAX_BODY_BYTES, validateInquiry } = require(resolve(process.cwd(), '../shared/inquiry.cjs'));

const attempts = new Map();
const windowMs = 60_000;
const limit = 5;
let nextCleanup = 0;

function authorized(header) {
  const secret = process.env.INQUIRY_PROXY_SECRET;
  if (!secret || secret.length < 32 || !header.startsWith('Bearer ')) return false;
  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function reserve(ip, email) {
  const now = Date.now();
  if (now >= nextCleanup) {
    for (const [key, attempt] of attempts) {
      if (attempt.expires <= now) attempts.delete(key);
    }
    nextCleanup = now + windowMs;
  }

  const keys = ['total', `address:${ip}`, createHash('sha256').update(email).digest('hex')];
  const entries = keys.map(key => {
    const attempt = attempts.get(key);
    return attempt && attempt.expires > now ? attempt : { count: 0, expires: now + windowMs };
  });
  if (entries.some(({ count }, i) => count >= (i === 0 ? 100 : limit))) return false;
  keys.forEach((key, i) => attempts.set(key, { ...entries[i], count: entries[i].count + 1 }));
  return true;
}

module.exports = {
  async create(ctx) {
    if (!authorized(ctx.get('Authorization'))) return ctx.unauthorized();
    if (!ctx.is('application/json')) {
      ctx.status = 415;
      return;
    }
    if (ctx.request.length > MAX_BODY_BYTES || Buffer.byteLength(JSON.stringify(ctx.request.body ?? null)) > MAX_BODY_BYTES) {
      ctx.status = 413;
      return;
    }
    const inquiry = validateInquiry(ctx.request.body);
    if (!inquiry) return ctx.badRequest('Invalid inquiry.');
    const suppliedIp = ctx.get('X-Nota-Client-IP');
    if (!reserve(isIP(suppliedIp) ? suppliedIp : 'unknown', inquiry.email)) {
      ctx.set('Retry-After', String(windowMs / 1000));
      ctx.status = 429;
      ctx.body = { error: 'Too many attempts.' };
      return;
    }
    await strapi.documents('api::inquiry.inquiry').create({ data: inquiry });
    ctx.status = 201;
    ctx.body = { ok: true };
  },
};
