import './config.js';
import { runJobs } from './services/jobs.js';
import { db } from './db.js';
let running: Promise<unknown> | undefined;
let stopping = false;
async function tick() {
  if (running || stopping) return;
  running = runJobs();
  try {
    await running;
  } catch {
    console.error(JSON.stringify({ level: 'error', job: 'worker', code: 'TICK_FAILED' }));
  } finally {
    running = undefined;
  }
}
void tick();
const timer = setInterval(() => void tick(), 15_000);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    const forceExit = setTimeout(() => process.exit(1), 30_000);
    forceExit.unref();
    void Promise.resolve(running)
      .catch(() => undefined)
      .then(() => db.$disconnect())
      .then(() => process.exit(0));
  });
