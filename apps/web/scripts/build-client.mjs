// A local API .env may select development. Release assets must still be production builds.
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build();
