// Configure the host's Node startup file to deployment/cpanel/app.cjs.
// Application code and secrets belong outside public_html.
import('../../apps/api/dist-server/index.js').catch((error) => {
  console.error(
    JSON.stringify({ level: 'error', code: 'STARTUP_FAILED', errorType: error?.constructor?.name }),
  );
  process.exit(1);
});
