import { spawn } from 'node:child_process';

const port = process.env.PORT ?? '3100';
const baseURL = `http://127.0.0.1:${port}`;

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });

    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function stopServer(server) {
  if (!server.pid || server.exitCode !== null) return Promise.resolve();

  if (process.platform === 'win32') {
    return run('taskkill', ['/pid', String(server.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  }

  server.kill('SIGTERM');
  return Promise.resolve();
}

const server = spawn(
  process.execPath,
  ['./node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port],
  { stdio: 'inherit' },
);

let exitCode = 1;

try {
  await waitForServer(baseURL);
  const result = await run(
    process.execPath,
    ['./node_modules/@playwright/test/cli.js', 'test'],
    {
      env: {
        ...process.env,
        PLAYWRIGHT_EXTERNAL_SERVER: '1',
      },
    },
  );
  exitCode = result.code ?? 1;
} finally {
  await stopServer(server);
}

process.exit(exitCode);
