module.exports = {
  routes: [
    { method: 'GET', path: '/public-homepage', handler: 'public-homepage.read', config: { auth: false } },
    { method: 'GET', path: '/health', handler: 'public-homepage.health', config: { auth: false } },
  ],
};
