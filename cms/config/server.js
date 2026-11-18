module.exports = ({ env }) => ({
  host: env('HOST', '127.0.0.1'),
  port: env.int('PORT', 1337),
  url: env('STRAPI_PUBLIC_URL', 'http://127.0.0.1:1337'),
  dirs: { public: env('STRAPI_PUBLIC_DIR', './public') },
  app: { keys: env.array('APP_KEYS') },
  proxy: { koa: env.bool('TRUST_PROXY', false) },
});
