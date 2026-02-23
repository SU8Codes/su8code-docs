import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import starlightThemeNext from 'starlight-theme-next';
import type { Plugin } from 'vite';
import { localeCookieName, pickLocale } from './functions/_shared/locale';

function devRootRedirect(): Plugin {
  return {
    name: 'dev-root-redirect',
    apply: 'serve',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = String(req?.url ?? '');
        if (url !== '/' && url !== '/?' && !url.startsWith('/?')) return next();

        const locale = pickLocale({
          cookieHeader: req?.headers?.cookie,
          acceptLanguageHeader: req?.headers?.['accept-language'],
          cookieName: localeCookieName,
          defaultLocale: 'en'
        });

        const requestUrl = new URL(url, 'http://localhost');
        const search = requestUrl.search || '';

        res.statusCode = 302;
        res.setHeader('Location', `/${locale}/${search}`);
        if (!String(req?.headers?.cookie ?? '').includes(`${localeCookieName}=`)) {
          res.setHeader('Set-Cookie', `${localeCookieName}=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`);
        }
        res.end();
      });
    }
  };
}

const sidebar = [

  {
    label: '开始使用',
    translations: { en: 'Getting Started' },
    items: [
      { slug: 'index', label: '首页与介绍', translations: { en: 'Home & Intro' } },
      { slug: 'about/overview', label: '平台服务概要', translations: { en: 'About' } },
      { slug: 'about/community', label: '社区交流', translations: { en: 'Community' } },
      { slug: 'start/three-steps', label: '获取密钥与快速跑通', translations: { en: 'Quickstart' } }
    ]
  },
  {
    label: '核心接入指南',
    translations: { en: 'Integrations' },
    items: [
      { slug: 'integrations/overview', label: '手册总览 (第一步)', translations: { en: 'Overview (Required)' } },
      { slug: 'integrations/codex-cli', label: 'Codex', translations: { en: 'Codex' } },
      { slug: 'integrations/openclaw', label: 'OpenClaw', translations: { en: 'OpenClaw' } },
      { slug: 'integrations/roo-code', label: 'Roo Code', translations: { en: 'Roo Code' } },
      { slug: 'integrations/cline', label: 'Cline', translations: { en: 'Cline' } },
      { slug: 'integrations/kilo-code', label: 'Kilo Code', translations: { en: 'Kilo Code' } },
      { slug: 'integrations/opencode', label: 'opencode', translations: { en: 'opencode' } },
      { slug: 'integrations/sdks', label: '开发者 SDK (Node/Python)', translations: { en: 'SDKs' } }
    ]
  },
  {
    label: '参考与支持',
    translations: { en: 'References & Support' },
    items: [
      { slug: 'tools/models', label: '全站支持模型聚合', translations: { en: 'Supported Models' } },
      { slug: 'tools/api-tester', label: '在线 API 可视测试器', translations: { en: 'API Tester' } },
      { slug: 'codex/stability-and-security', label: '可用性承诺与安全保障', translations: { en: 'Stability & Security' } },
      { slug: 'codex/troubleshooting', label: '网络排错与错误速查', translations: { en: 'Troubleshooting FAQ' } }
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
      title: {
        zh: 'SU8 Codes 官方文档',
        en: 'SU8 Codes Docs'
      },
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
        Head: './src/components/Su8Head.astro',
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
    plugins: [devRootRedirect()]
  }
});
