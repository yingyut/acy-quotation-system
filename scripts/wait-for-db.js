// Waits for the PostgreSQL database (from DATABASE_URL) to accept TCP
// connections before the app proceeds to run migrations / start the server.
const net = require('net');

function parseDatabaseUrl(url) {
  const u = new URL(url);
  return { host: u.hostname, port: Number(u.port || 5432) };
}

function checkOnce(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 3000 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[wait-for-db] DATABASE_URL is not set');
    process.exit(1);
  }
  const { host, port } = parseDatabaseUrl(url);
  const maxAttempts = 60;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await checkOnce(host, port);
    if (ok) {
      console.log(`[wait-for-db] Database reachable at ${host}:${port}`);
      return;
    }
    console.log(`[wait-for-db] Waiting for ${host}:${port} (attempt ${attempt}/${maxAttempts})...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error('[wait-for-db] Timed out waiting for database');
  process.exit(1);
}

main();
