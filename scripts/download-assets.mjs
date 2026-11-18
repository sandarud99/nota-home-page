/** Download only images — never reference HTML/CSS/JS. The assignment permits imagery reuse. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const contentPath = join(projectRoot, 'src', 'content', 'homepage.ts');
const imageDir = join(projectRoot, 'public', 'images');
const original = await readFile(contentPath, 'utf8');
const urls = [...new Set(original.match(/https:\/\/nota\.uprock\.pro\/thumb\/[a-zA-Z0-9_./%-]+/g) ?? [])];
if (!urls.length) {
  console.log('No remote NŌTA image URLs remain in the content file. Nothing to download.');
  process.exit(0);
}
await mkdir(imageDir, { recursive: true });
let updated = original;
let ok = 0;
for (const [index, url] of urls.entries()) {
  const pathname = new URL(url).pathname;
  const extension = pathname.endsWith('.png') ? '.png' : pathname.endsWith('.webp') ? '.webp' : '.jpg';
  const fileName = `nota-${String(index + 1).padStart(2, '0')}-${createHash('sha256').update(url).digest('hex').slice(0, 10)}${extension}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Independent technical assignment)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error(`Unexpected media type: ${contentType}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 18_000_000) throw new Error('Image exceeds 18 MB safeguard');
    await writeFile(join(imageDir, fileName), buffer);
    updated = updated.replaceAll(url, `/images/${fileName}`);
    ok++;
    console.log(`✓ ${fileName} (${Math.round(buffer.length / 1024)} KB)`);
  } catch (error) {
    console.warn(`✗ Failed ${url}: ${String(error)}`);
  } finally { clearTimeout(timeout); }
}
// Only replace a source URL once its bytes are successfully saved.
if (ok) {
  await writeFile(contentPath, updated, 'utf8');
  console.log(`\nSaved ${ok}/${urls.length} images and updated src/content/homepage.ts.`);
} else console.warn('No images downloaded. The site will continue to use remote URLs and SVG fallbacks.');
