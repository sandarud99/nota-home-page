module.exports = {
  routes: [
    { method: 'POST', path: '/public-inquiries', handler: 'public-inquiries.create', config: { auth: false } },
  ],
};
