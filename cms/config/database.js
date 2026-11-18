module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      connectionString: env('DATABASE_URL', 'postgresql://postgres@127.0.0.1:5432/nota'),
      ssl: env.bool('DATABASE_SSL', false) && { ca: env('DATABASE_SSL_CA'), rejectUnauthorized: true },
    },
    pool: { min: 0, max: env.int('DATABASE_POOL_MAX', 8) },
    acquireConnectionTimeout: 30_000,
  },
});
