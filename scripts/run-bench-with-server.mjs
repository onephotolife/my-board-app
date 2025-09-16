import { spawn } from 'node:child_process';
import process from 'node:process';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true, ...options });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(0);
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function main() {
  await runCommand('npm', ['run', 'build:next']);

  const server = spawn('npm', ['run', 'start:next'], { stdio: 'inherit', shell: true });
  let closed = false;
  server.on('close', () => {
    closed = true;
  });

  await wait(6000);

  try {
    await runCommand('node', ['scripts/bench-step04.mjs']);
  } finally {
    if (!closed) {
      server.kill('SIGTERM');
      await wait(1000);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
