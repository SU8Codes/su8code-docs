import { spawn } from 'node:child_process';
import process from 'node:process';
import net from 'node:net';

const host = '127.0.0.1';
let port = Number.parseInt(process.env.SMOKE_PORT ?? process.env.PORT ?? '4600', 10);
if (!Number.isFinite(port)) port = 4600;

const astroBin =
  process.platform === 'win32' ? 'node_modules/.bin/astro.cmd' : 'node_modules/.bin/astro';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortFree(host, port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function ensurePortFree(host, preferredPort) {
  if (await isPortFree(host, preferredPort)) return preferredPort;

  // Try a small range of ports to avoid failing when 4600 is already in use.
  for (let p = preferredPort + 1; p <= preferredPort + 50; p++) {
    if (await isPortFree(host, p)) return p;
  }

  throw new Error(
    `端口 ${host}:${preferredPort} 被占用，且在 ${preferredPort + 1}~${preferredPort + 50} 没找到可用端口，无法启动 preview。`
  );
}

async function fetchText(url) {
  const resp = await fetch(url, { redirect: 'manual' });
  const text = await resp.text().catch(() => '');
  return {
    ok: resp.ok,
    status: resp.status,
    location: resp.headers.get('location'),
    text
  };
}

async function waitForServer(url, previewExited, timeoutMs = 45_000) {
  const startedAt = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (previewExited()) {
      throw new Error('Preview server exited before becoming ready (is port 4600 already in use?)');
    }
    try {
      const { ok } = await fetchText(url);
      if (ok) return;
    } catch {
      // ignore until ready
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Preview server not ready after ${timeoutMs}ms: ${url}`);
    }
    await sleep(500);
  }
}

async function main() {
  port = await ensurePortFree(host, port);
  const baseUrl = `http://${host}:${port}`;

  let exited = false;
  const preview = spawn(astroBin, ['preview', '--host', host, '--port', String(port)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  const previewExit = new Promise((resolve) => {
    preview.on('exit', (code, signal) => {
      exited = true;
      resolve({ code, signal });
    });
  });

  const stop = async () => {
    if (preview.killed) return;
    preview.kill('SIGTERM');
    await sleep(500);
    preview.kill('SIGKILL');
    await previewExit;
  };

  process.on('SIGINT', () => stop().finally(() => process.exit(130)));
  process.on('SIGTERM', () => stop().finally(() => process.exit(143)));

  try {
    await waitForServer(`${baseUrl}/zh/`, () => exited);

    const urls = [
      { path: '/zh/', mustContain: ['starlight-lang-select'], mustNotContain: ['data-su8-theme-toggle', 'starlight-theme-select'] },
      { path: '/en/', mustContain: ['starlight-lang-select'], mustNotContain: ['data-su8-theme-toggle', 'starlight-theme-select'] },
      { path: '/zh/tools/api-tester/', mustContain: ['在线 API 测试', 'API Key', 'type=\"password\"'] },
      { path: '/en/tools/api-tester/', mustContain: ['API Tester', 'API Key', 'type=\"password\"'] },
      { path: '/zh/tools/models/', mustContain: ['模型列表', '加载模型', 'type=\"password\"'] },
      { path: '/en/tools/models/', mustContain: ['Models', '加载模型', 'type=\"password\"'] },
      { path: '/zh/codex/install/' },
      { path: '/en/codex/install/' }
    ];

    const failed = [];
    for (const item of urls) {
      const url = `${baseUrl}${item.path}`;
      const { ok, status, location, text } = await fetchText(url);

      if (!ok) {
        if (
          status >= 300 &&
          status < 400 &&
          item.allowRedirectTo &&
          item.allowRedirectTo.includes(location ?? '')
        ) {
          continue;
        }
        failed.push({ url, status, reason: location ? `redirected to: ${location}` : undefined });
        continue;
      }

      if (!text || text.length < 200) {
        failed.push({ url, status, reason: 'empty html' });
        continue;
      }

      for (const token of item.mustContain ?? []) {
        if (!text.includes(token)) {
          failed.push({ url, status, reason: `missing: ${token}` });
          break;
        }
      }

      for (const token of item.mustNotContain ?? []) {
        if (text.includes(token)) {
          failed.push({ url, status, reason: `should not contain: ${token}` });
          break;
        }
      }
    }

    if (failed.length) {
      const lines = failed
        .map((f) => `- ${f.url} -> ${f.status}${f.reason ? ` (${f.reason})` : ''}`)
        .join('\n');
      throw new Error(`Smoke test failed:\n${lines}`);
    }
  } finally {
    await stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
