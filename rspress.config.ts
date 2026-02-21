import path from 'node:path';
import { defineConfig } from '@rspress/core';

const DOC_ROOT = 'src/content/docs';
const resolveFromRepoRoot = (p: string) => path.resolve(process.cwd(), p);
const linkItem = (text: string, link: string) => ({ text, link });

export default defineConfig({
  root: DOC_ROOT,
  base: '/',
  outDir: 'dist',
  title: 'su8 codes',
  description: 'Codex API gateway docs',
  icon: '/favicon.svg',
  logo: '/logo.svg',
  logoText: 'su8 codes',
  globalStyles: resolveFromRepoRoot('src/styles/custom.css'),
  route: {
    cleanUrls: true
  },
  themeConfig: {
    nav: [
      {
        text: '语言',
        position: 'right',
        items: [
          { text: '中文', link: '/zh/', activeMatch: '^/zh/' },
          { text: 'English', link: '/en/', activeMatch: '^/en/' }
        ]
      }
    ],
    sidebar: {
      '/zh/': [
        {
          text: '计费',
          collapsible: false,
          items: [
            linkItem('套餐（适合只用 Codex）', '/zh/billing/plans/'),
            linkItem('按量付费（余额）', '/zh/billing/pay-as-you-go/'),
            linkItem('对账与常见误会', '/zh/billing/reconciliation/')
          ]
        },
        {
          text: 'Codex 上手',
          collapsible: false,
          items: [
            linkItem('安装 Codex（准备工作）', '/zh/codex/install/'),
            linkItem('配置（Base URL + API Key）', '/zh/codex/configure/'),
            linkItem('跑通一次请求（curl + 在线测试）', '/zh/codex/verify/'),
            linkItem('在线 API 测试', '/zh/tools/api-tester/'),
            linkItem('模型列表', '/zh/tools/models/'),
            linkItem('常见错误排查', '/zh/codex/troubleshooting/'),
            linkItem('稳定与安全', '/zh/codex/stability-and-security/')
          ]
        },
        {
          text: '第三方接入',
          collapsible: false,
          items: [
            linkItem('第三方接入总览（通用原则）', '/zh/integrations/overview/'),
            linkItem('Node.js 接入（fetch）', '/zh/integrations/node/'),
            linkItem('Python 接入（requests）', '/zh/integrations/python/'),
            linkItem('其他工具', '/zh/integrations/tools/'),
            linkItem('Cline 接入', '/zh/integrations/cline/'),
            linkItem('Roo Code 接入', '/zh/integrations/roo-code/'),
            linkItem('OpenClaw 接入', '/zh/integrations/openclaw/'),
            linkItem('Kilo Code 接入', '/zh/integrations/kilo-code/'),
            linkItem('opencode 接入', '/zh/integrations/opencode/')
          ]
        },
        {
          text: '关于',
          collapsible: false,
          items: [linkItem('关于 su8 codes', '/zh/about/overview/')]
        }
      ],
      '/en/': [
        {
          text: 'Billing',
          collapsible: false,
          items: [
            linkItem('Plans (best for Codex-only)', '/en/billing/plans/'),
            linkItem('Pay-as-you-go (balance)', '/en/billing/pay-as-you-go/'),
            linkItem('Reconciliation & common misconceptions', '/en/billing/reconciliation/')
          ]
        },
        {
          text: 'Codex setup',
          collapsible: false,
          items: [
            linkItem('Install Codex (prep)', '/en/codex/install/'),
            linkItem('Configure (Base URL + API Key)', '/en/codex/configure/'),
            linkItem('Make your first request (curl + web tester)', '/en/codex/verify/'),
            linkItem('API Tester', '/en/tools/api-tester/'),
            linkItem('Models', '/en/tools/models/'),
            linkItem('Troubleshooting', '/en/codex/troubleshooting/'),
            linkItem('Stability & security', '/en/codex/stability-and-security/')
          ]
        },
        {
          text: 'Integrations',
          collapsible: false,
          items: [
            linkItem('Integrations overview (general rules)', '/en/integrations/overview/'),
            linkItem('Node.js integration (fetch)', '/en/integrations/node/'),
            linkItem('Python integration (requests)', '/en/integrations/python/'),
            linkItem('Other tools', '/en/integrations/tools/'),
            linkItem('Cline integration', '/en/integrations/cline/'),
            linkItem('Roo Code integration', '/en/integrations/roo-code/'),
            linkItem('OpenClaw integration', '/en/integrations/openclaw/'),
            linkItem('Kilo Code integration', '/en/integrations/kilo-code/'),
            linkItem('opencode integration', '/en/integrations/opencode/')
          ]
        },
        {
          text: 'About',
          collapsible: false,
          items: [linkItem('About su8 codes', '/en/about/overview/')]
        }
      ]
    }
  },
  builderConfig: {
    dev: {
      hmr: false
    },
    resolve: {
      alias: {
        '@astrojs/starlight/components': resolveFromRepoRoot('src/components/starlight.tsx')
      }
    },
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
