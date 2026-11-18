import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const root = new URL('../', import.meta.url);
const frontendPath = new URL('.env.local', root);
const cmsPath = new URL('cms/.env', root);
const key = () => randomBytes(32).toString('hex');

async function readEnv(path) {
  try {
    return parseEnv(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const [frontend, cms] = await Promise.all([readEnv(frontendPath), readEnv(cmsPath)]);
const configuredSecrets = [frontend?.INQUIRY_PROXY_SECRET, cms?.INQUIRY_PROXY_SECRET].filter(Boolean);
if ((frontend && !frontend.INQUIRY_PROXY_SECRET) || (cms && !cms.INQUIRY_PROXY_SECRET) || new Set(configuredSecrets).size > 1) {
  throw new Error('Set matching INQUIRY_PROXY_SECRET values in your existing local environment files.');
}
const secret = configuredSecrets[0] ?? key();

async function writeEnv(path, values) {
  const output = Object.entries(values).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join('\n');
  await writeFile(path, output + '\n', { flag: 'wx', mode: 0o600 });
}

if (!cms) {
  const defaults = await readEnv(new URL('cms/.env.example', root));
  await writeEnv(cmsPath, {
    ...defaults,
    DATABASE_URL: process.env.DATABASE_URL || defaults.DATABASE_URL,
    APP_KEYS: [key(), key(), key(), key()].join(','),
    ADMIN_JWT_SECRET: key(),
    API_TOKEN_SALT: key(),
    TRANSFER_TOKEN_SALT: key(),
    ENCRYPTION_KEY: key(),
    INQUIRY_PROXY_SECRET: secret,
  });
}
if (!frontend) {
  const defaults = await readEnv(new URL('.env.example', root));
  await writeEnv(frontendPath, { ...defaults, INQUIRY_PROXY_SECRET: secret });
}
console.log('Local environment files are ready.');
