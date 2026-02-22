import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import process from 'node:process';
import net from 'node:net';
import { localeCookieName, parseCookie, pickLocale, supportedLocales } from '../functions/_shared/locale.ts';

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

async function fetchText(url, options = {}) {
  const resp = await fetch(url, { redirect: 'manual', ...options });
  const text = await resp.text().catch(() => '');
  return {
    ok: resp.ok,
    status: resp.status,
    location: resp.headers.get('location'),
    setCookie: resp.headers.get('set-cookie'),
    text
  };
}

function createRootRedirectProxy({ host, port, previewBaseUrl }) {
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', `http://${host}:${port}`);

      if (requestUrl.pathname === '/' && (req.method === 'GET' || req.method === 'HEAD')) {
        const cookieHeader = String(req.headers?.cookie ?? '');
        const cookies = parseCookie(cookieHeader);

        const locale = pickLocale({
          cookieHeader,
          acceptLanguageHeader: String(req.headers?.['accept-language'] ?? ''),
          cookieName: localeCookieName,
          defaultLocale: 'en'
        });

        if (!supportedLocales.includes(locale)) {
          res.statusCode = 302;
          res.setHeader('Location', `/en/${requestUrl.search || ''}`);
          return res.end();
        }

        res.statusCode = 302;
        res.setHeader('Location', `/${locale}/${requestUrl.search || ''}`);

        if (!cookies[localeCookieName]) {
          const cookieParts = [
            `${localeCookieName}=${encodeURIComponent(locale)}`,
            'Max-Age=31536000',
            'Path=/',
            'SameSite=Lax'
          ];
          if (String(req.headers?.['x-forwarded-proto'] ?? '') === 'https') cookieParts.push('Secure');
          res.setHeader('Set-Cookie', cookieParts.join('; '));
        }

        return res.end();
      }

      // Proxy everything else to `astro preview` so we can smoke-test `/` redirect behavior.
      const targetUrl = new URL(req.url ?? '/', previewBaseUrl);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers ?? {})) {
        if (typeof value === 'string') headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(', '));
      }
      headers.delete('host');
      // Avoid content-encoding mismatch when proxying through Bun/Node fetch.
      headers.set('accept-encoding', 'identity');

      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        redirect: 'manual'
      });

      res.statusCode = upstream.status;
      upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'transfer-encoding') return;
        if (key.toLowerCase() === 'content-encoding') return;
        if (key.toLowerCase() === 'content-length') return;
        res.setHeader(key, value);
      });
      const body = await upstream.arrayBuffer().catch(() => null);
      res.end(body ? Buffer.from(body) : undefined);
    } catch {
      res.statusCode = 502;
      res.end('bad gateway');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
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
  const previewBaseUrl = `http://${host}:${port}`;
  const proxyPort = await ensurePortFree(host, port + 1);
  const baseUrl = `http://${host}:${proxyPort}`;

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

  const proxyServer = await createRootRedirectProxy({
    host,
    port: proxyPort,
    previewBaseUrl
  });

  const stop = async () => {
    proxyServer.close();
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
      {
        path: '/',
        headers: { 'accept-language': 'en-US,en;q=0.9' },
        allowRedirectTo: ['/en/'],
        expectSetCookie: true
      },
      {
        path: '/',
        headers: { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' },
        allowRedirectTo: ['/zh/'],
        expectSetCookie: true
      },
      {
        path: '/?utm_source=smoke',
        headers: { 'accept-language': 'en-US,en;q=0.9' },
        allowRedirectTo: ['/en/?utm_source=smoke'],
        expectSetCookie: true
      },
      {
        path: '/',
        headers: { cookie: 'su8_locale=zh', 'accept-language': 'en-US,en;q=0.9' },
        allowRedirectTo: ['/zh/'],
        expectSetCookie: false
      },
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
      const { ok, status, location, setCookie, text } = await fetchText(url, {
        headers: item.headers
      });

      if (!ok) {
        if (
          status >= 300 &&
          status < 400 &&
          item.allowRedirectTo &&
          item.allowRedirectTo.includes(location ?? '')
        ) {
          if (typeof item.expectSetCookie === 'boolean') {
            const hasCookie = Boolean(setCookie && setCookie.includes(`${localeCookieName}=`));
            if (item.expectSetCookie !== hasCookie) {
              failed.push({
                url,
                status,
                reason: item.expectSetCookie ? 'missing Set-Cookie' : 'unexpected Set-Cookie'
              });
            }
          }
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
