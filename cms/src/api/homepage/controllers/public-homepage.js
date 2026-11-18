const homepageType = 'api::homepage.homepage';
const image = { fields: ['url', 'alternativeText', 'width', 'height'] };
const artwork = { populate: { image, mobileImage: image } };

module.exports = {
  async read(ctx) {
    const homepage = await strapi.documents(homepageType).findFirst({
      status: 'published',
      populate: {
        brandMark: artwork,
        navigation: true,
        hero: { populate: { ...artwork.populate, profileImage: image } },
        menuArtwork: artwork,
        specsHeading: true,
        specsArtwork: artwork,
        specifications: { populate: { bullets: true } },
        audienceHeading: true,
        audiences: true,
        aboutArtwork: artwork,
        paperHeading: true,
        paperDetails: artwork,
        boxHeading: true,
        boxSet: artwork,
        boxItems: artwork,
        boxCallouts: artwork,
        colorsHeading: true,
        colors: artwork,
        footerLinks: true,
        formCopy: true,
        seo: { populate: { ogImage: image, twitterImage: image, siteIcon: image } },
      },
    });
    if (!homepage) return ctx.notFound('Homepage is unpublished.');
    const clean = await strapi.contentAPI.sanitize.output(homepage, strapi.contentType(homepageType));
    const fields = Object.keys(strapi.contentType(homepageType).attributes);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { data: Object.fromEntries(fields.filter(field => field in clean).map(field => [field, clean[field]])) };
  },

  async health(ctx) {
    try {
      await strapi.db.connection.raw('select 1');
      ctx.body = { status: 'ok' };
    } catch {
      ctx.status = 503;
      ctx.body = { status: 'unavailable' };
    }
  },
};
