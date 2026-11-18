module.exports = () => ({
  upload: {
    config: {
      provider: 'local',
      sizeLimit: 12 * 1024 * 1024,
    },
  },
});
