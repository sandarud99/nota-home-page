const { stat, access } = require('node:fs/promises');
const { basename, join, resolve } = require('node:path');

module.exports = async function seedHomepage(strapi) {
  const homepage = strapi.documents('api::homepage.homepage');
  if (await homepage.findFirst({ status: 'draft' })) return;

  const root = resolve(process.cwd(), '..');
  const { homepageData } = require(join(root, 'src/content/homepage.ts'));
  const uploads = strapi.plugin('upload').service('upload');
  const byName = strapi.db.query('plugin::upload.file');
  const saved = new Map();

  async function storeMedia(url, alt) {
    const isAnimation = url === '/animations/nota-pen.json';
    if (!isAnimation && !/^\/images\/[a-z0-9-]+\.(webp|svg)$/.test(url)) throw new Error('Unexpected seed media path.');
    const name = basename(url);
    if (!saved.has(name)) {
      saved.set(name, (async () => {
        const existing = await byName.findOne({ where: { name, provider: 'local' } });
        if (existing) {
          // Seed retries can reuse earlier uploads as long as the volume still contains the originals.
          await access(join(strapi.dirs.static.public, 'uploads', basename(existing.url)));
          return existing.id;
        }
        const filepath = join(root, 'public', url.slice(1));
        const { size } = await stat(filepath);
        const mimetype = isAnimation ? 'application/json' : (name.endsWith('.svg') ? 'image/svg+xml' : 'image/webp');
        const [file] = await uploads.upload({
          data: { fileInfo: { name, alternativeText: alt || undefined } },
          files: { filepath, originalFilename: name, mimetype, size },
        });
        return file.id;
      })());
    }
    return saved.get(name);
  }

  async function withUploads(value) {
    if (Array.isArray(value)) {
      const items = [];
      for (const item of value) items.push(await withUploads(item));
      return items;
    }
    if (!value || typeof value !== 'object') return value;
    const fields = {};
    const mediaFields = { imageUrl: 'image', mobileImageUrl: 'mobileImage', hoverImageUrl: 'hoverImage', ogImageUrl: 'ogImage', animationUrl: 'animation' };
    for (const [key, field] of Object.entries(value)) {
      if (key.endsWith('Width') || key.endsWith('Height')) continue;
      if (mediaFields[key]) fields[mediaFields[key]] = await storeMedia(field, key === 'hoverImageUrl' ? undefined : value.alt);
      else fields[key] = await withUploads(field);
    }
    return fields;
  }

  const data = await withUploads(homepageData);
  await homepage.create({ data, status: 'published' });
  strapi.log.info(`Published the initial homepage with ${saved.size} Media Library uploads.`);
};
