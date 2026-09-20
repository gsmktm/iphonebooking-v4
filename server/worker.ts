import 'dotenv/config';
import { runJobs } from './services/jobs.js';
import { db } from './db.js';
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    await runJobs();
  } catch {
    console.error(JSON.stringify({ level: 'error', job: 'worker', code: 'TICK_FAILED' }));
  } finally {
    running = false;
  }
}
void tick();
const timer = setInterval(() => void tick(), 15_000);
process.on('SIGTERM', () => {
  clearInterval(timer);
  void db.$disconnect().then(() => process.exit(0));
});
