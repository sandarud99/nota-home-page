const isPublicUploadRead = ({ method, path }) =>
  (method === 'GET' || method === 'HEAD') && path.startsWith('/uploads/');

module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      // Browsers fetch uploaded Lottie JSON from the frontend origin.
      origin: ctx => isPublicUploadRead(ctx)
        ? '*'
        : env.array('CORS_ORIGINS', [env('STRAPI_PUBLIC_URL', 'http://127.0.0.1:1337')]),
      credentials: ctx => !isPublicUploadRead(ctx),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '512kb',
      formidable: { maxFileSize: 12 * 1024 * 1024 },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
