const seedHomepage = require('./seed-homepage');

module.exports = {
  async bootstrap({ strapi }) {
    if (process.env.RAILWAY_ENVIRONMENT_ID) {
      const mount = process.env.RAILWAY_VOLUME_MOUNT_PATH;
      if (mount !== '/app/cms/public/uploads') throw new Error('Mount the uploads volume at /app/cms/public/uploads.');
      if (!process.env.STRAPI_PUBLIC_URL?.startsWith('https://')) throw new Error('Set the public HTTPS Strapi URL.');
    }
    if (process.env.SEED_HOMEPAGE === 'true') await seedHomepage(strapi);
  },
};
