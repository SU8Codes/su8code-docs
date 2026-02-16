import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.su8.codes',
  base: '/',
  integrations: [
    starlight({
      title: 'su8 codes',
      description: 'Codex API gateway docs',
      logo: {
        src: './src/assets/logo.svg',
        alt: 'su8 codes'
      },
      favicon: '/favicon.svg',
      defaultLocale: 'zh',
      locales: {
        zh: { label: '中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' }
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: '计费',
          translations: { en: 'Billing' },
          items: ['billing/plans', 'billing/pay-as-you-go', 'billing/reconciliation']
        },
        {
          label: 'Codex 上手',
          translations: { en: 'Codex setup' },
          items: [
            'codex/install',
            'codex/configure',
            'codex/verify',
            'tools/api-tester',
            'tools/models',
            'codex/troubleshooting',
            'codex/stability-and-security'
          ]
        },
        {
          label: '第三方接入',
          translations: { en: 'Integrations' },
          items: [
            'integrations/overview',
            'integrations/node',
            'integrations/python',
            'integrations/tools',
            'integrations/cline',
            'integrations/roo-code',
            'integrations/openclaw',
            'integrations/kilo-code',
            'integrations/opencode'
          ]
        },
        {
          label: '关于',
          translations: { en: 'About' },
          items: ['about/overview']
        }
      ]
    }),
    mdx(),
    react()
  ],
  vite: {
    server: {
      proxy: {
        '/codex/v1': {
          target: 'https://su8.codes',
          changeOrigin: true
        }
      }
    }
  }
});
