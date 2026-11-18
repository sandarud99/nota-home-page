import { defineRailway, github, postgres, project, service, volume } from 'railway/iac';

export default defineRailway(ctx => {
  const repository = process.env.NOTA_GITHUB_REPO;
  const source = repository ? github(repository, { branch: 'main', rootDirectory: '/' }) : undefined;
  const database = postgres('Postgres');
  const uploads = volume('cms-uploads', { sizeMB: 1024 });
  const deploy = {
    healthcheckPath: '/api/health',
    healthcheckTimeout: 180,
    restartPolicyType: 'ON_FAILURE' as const,
    restartPolicyMaxRetries: 5,
  };

  const cms = service('cms', {
    source,
    build: {
      builder: 'DOCKERFILE',
      dockerfilePath: 'deploy/cms.Dockerfile',
      watchPatterns: ['cms/**', 'shared/**', 'src/content/**', 'public/images/**', 'deploy/cms.Dockerfile', 'deploy/start-cms.sh', '.dockerignore'],
    },
    deploy: { ...deploy, requiredMountPath: '/app/cms/public/uploads' },
    replicas: 1,
    volumeMounts: { '/app/cms/public/uploads': uploads },
    env: {
      PORT: '1337',
      HOST: '::',
      TRUST_PROXY: 'true',
      STRAPI_PUBLIC_URL: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
      DATABASE_URL: database.env.DATABASE_URL,
      DATABASE_SSL: 'false',
      SEED_HOMEPAGE: 'true',
      APP_KEYS: ctx.shared.NOTA_APP_KEYS,
      ADMIN_JWT_SECRET: ctx.shared.NOTA_ADMIN_JWT_SECRET,
      API_TOKEN_SALT: ctx.shared.NOTA_API_TOKEN_SALT,
      TRANSFER_TOKEN_SALT: ctx.shared.NOTA_TRANSFER_TOKEN_SALT,
      ENCRYPTION_KEY: ctx.shared.NOTA_ENCRYPTION_KEY,
      INQUIRY_PROXY_SECRET: ctx.shared.NOTA_INQUIRY_PROXY_SECRET,
    },
  });

  const frontend = service('frontend', {
    source,
    build: {
      builder: 'DOCKERFILE',
      dockerfilePath: 'deploy/frontend.Dockerfile',
      watchPatterns: ['src/**', 'public/**', 'shared/**', 'package*.json', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json',
        'eslint.config.mjs', 'postcss.config.mjs', 'deploy/frontend.Dockerfile', '.dockerignore'],
    },
    deploy,
    env: {
      PORT: '3000',
      CONTENT_SOURCE: 'strapi',
      STRAPI_URL: 'http://${{cms.RAILWAY_PRIVATE_DOMAIN}}:1337',
      STRAPI_PUBLIC_URL: 'https://${{cms.RAILWAY_PUBLIC_DOMAIN}}',
      FRONTEND_PUBLIC_URL: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
      INQUIRY_PROXY_SECRET: ctx.shared.NOTA_INQUIRY_PROXY_SECRET,
    },
  });

  return project('nota-homepage', { resources: [database, uploads, cms, frontend] });
});
