import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import starlightThemeNext from 'starlight-theme-next';
import type { Plugin } from 'vite';

function devRootRedirect(): Plugin {
  const cookieName = 'su8_locale';

  function parseCookie(header: string | undefined) {
    const out: Record<string, string> = {};
    if (!header) return out;
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx <= 0) continue;
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (!k) continue;
      out[k] = v;
    }
    return out;
  }

  function pickLocale(params: { cookie?: string; acceptLanguage?: string }) {
    const cookies = parseCookie(params.cookie);
    const fromCookie = String(cookies[cookieName] ?? '').toLowerCase();
    if (fromCookie === 'zh' || fromCookie === 'en') return fromCookie;

    const raw = String(params.acceptLanguage ?? '').trim();
    if (!raw) return 'en';

    type Range = { lang: string; q: number; index: number };
    const ranges: Range[] = [];

    raw.split(',').forEach((part, index) => {
      const segments = part.split(';');
      const lang = segments[0]?.trim().toLowerCase();
      if (!lang) return;

      let q = 1;
      for (let i = 1; i < segments.length; i++) {
        const param = segments[i]?.trim().toLowerCase();
        if (!param?.startsWith('q=')) continue;
        const parsed = Number.parseFloat(param.slice(2));
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) q = parsed;
        break;
      }

      ranges.push({ lang, q, index });
    });

    ranges.sort((a, b) => (b.q !== a.q ? b.q - a.q : a.index - b.index));

    for (const { lang } of ranges) {
      if (lang === '*') continue;
      if (lang.startsWith('zh')) return 'zh';
      if (lang.startsWith('en')) return 'en';
    }

    return 'en';
  }

  return {
    name: 'dev-root-redirect',
    apply: 'serve',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = String(req?.url ?? '');
        if (url !== '/' && url !== '/?' && !url.startsWith('/?')) return next();

        const locale = pickLocale({
          cookie: req?.headers?.cookie,
          acceptLanguage: req?.headers?.['accept-language']
        });

        const requestUrl = new URL(url, 'http://localhost');
        const search = requestUrl.search || '';

        res.statusCode = 302;
        res.setHeader('Location', `/${locale}/${search}`);
        if (!String(req?.headers?.cookie ?? '').includes(`${cookieName}=`)) {
          res.setHeader('Set-Cookie', `${cookieName}=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`);
        }
        res.end();
      });
    }
  };
}

const sidebar = [
  {
    label: '介绍 + 套餐 + 三步',
    translations: { en: 'Intro + Billing + 3 steps' },
    items: [
      {
        slug: 'about/overview',
        label: '介绍自己（我们是谁）',
        translations: { en: 'About SU8 Codes' }
      },
      {
        label: '套餐说明',
        translations: { en: 'Billing' },
        items: [
          {
            slug: 'billing/plans',
            label: '套餐（适合只用 Codex）',
            translations: { en: 'Plans (best for Codex-only)' }
          },
          {
            slug: 'billing/pay-as-you-go',
            label: '按量付费（余额）',
            translations: { en: 'Pay-as-you-go (balance)' }
          },
          {
            slug: 'billing/reconciliation',
            label: '对账与常见误会',
            translations: { en: 'Reconciliation & common misconceptions' }
          }
        ]
      },
      {
        slug: 'start/three-steps',
        label: '使用三步跑通',
        translations: { en: '3-step quickstart' }
      },
      {
        label: '工具箱',
        translations: { en: 'Tools' },
        items: [
          { slug: 'tools/api-tester', label: '在线 API 测试', translations: { en: 'API Tester' } },
          { slug: 'tools/models', label: '模型列表', translations: { en: 'Models' } }
        ]
      },
      {
        label: '排障与稳定',
        translations: { en: 'Troubleshooting' },
        items: [
          { slug: 'codex/troubleshooting', label: '常见错误排查', translations: { en: 'Troubleshooting' } },
          {
            slug: 'codex/stability-and-security',
            label: '稳定与安全',
            translations: { en: 'Stability & security' }
          }
        ]
      }
    ]
  },
  {
    label: '可接入的程序',
    translations: { en: 'Integrations' },
    items: [
      {
        slug: 'integrations/overview',
        label: '接入总览（先看这个）',
        translations: { en: 'Integrations overview' }
      },
      {
        label: 'Codex CLI（重点）',
        translations: { en: 'Codex CLI (recommended)' },
        items: [
          { slug: 'codex/install', label: '安装 Codex（准备工作）', translations: { en: 'Install Codex (prep)' } },
          {
            slug: 'codex/configure',
            label: '配置（Base URL + API Key）',
            translations: { en: 'Configure (Base URL + API Key)' }
          },
          {
            slug: 'codex/verify',
            label: '跑通一次请求（curl + 在线测试）',
            translations: { en: 'Make your first request (curl + web tester)' }
          }
        ]
      },
      {
        slug: 'integrations/openclaw',
        label: 'OpenClaw 接入（重点）',
        translations: { en: 'OpenClaw integration' }
      },
      {
        label: '其他工具',
        translations: { en: 'Other tools' },
        items: [
          { slug: 'integrations/cline', label: 'Cline 接入', translations: { en: 'Cline integration' } },
          { slug: 'integrations/roo-code', label: 'Roo Code 接入', translations: { en: 'Roo Code integration' } },
          { slug: 'integrations/kilo-code', label: 'Kilo Code 接入', translations: { en: 'Kilo Code integration' } },
          { slug: 'integrations/opencode', label: 'opencode 接入', translations: { en: 'opencode integration' } },
          { slug: 'integrations/tools', label: '字段通用说明', translations: { en: 'Field reference' } }
        ]
      },
      {
        label: '自己写代码接入',
        translations: { en: 'SDK integration' },
        items: [
          { slug: 'integrations/node', label: 'Node.js 接入（fetch）', translations: { en: 'Node.js integration (fetch)' } },
          { slug: 'integrations/python', label: 'Python 接入（requests）', translations: { en: 'Python integration (requests)' } }
        ]
      }
    ]
  }
];

export default defineConfig({
  site: 'https://docs.su8.codes',
  output: 'static',
  trailingSlash: 'always',
  outDir: './dist',
  integrations: [
    starlight({
      title: 'SU8 Codes 官方文档',
      description: 'Codex API gateway docs',
      favicon: '/favicon.ico',
      logo: {
        src: './src/assets/logo-wide.png',
        alt: 'SU8 Codes',
        replacesTitle: true
      },
      defaultLocale: 'en',
      locales: {
        zh: { label: '中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' }
      },
      components: {
        ThemeProvider: './src/components/Su8ThemeProvider.astro',
        ThemeSelect: './src/components/Su8ThemeDisabled.astro',
        Header: './src/components/Su8Header.astro',
        MobileMenuFooter: './src/components/Su8MobileMenuFooter.astro'
      },
      plugins: [starlightThemeNext()],
      sidebar,
      customCss: ['./src/styles/custom.css']
    }),
    mdx(),
    react()
  ],
  vite: {
    plugins: [devRootRedirect()],
    server: {
      proxy: {
        '/codex/v1': {
          target: 'https://www.su8.codes',
          changeOrigin: true
        }
      }
    }
  }
});
