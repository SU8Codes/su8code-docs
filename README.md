# SU8 Codes docs (Astro + Starlight + Theme Next)

这是对外的文档站源码（部署到 `docs.su8.codes`）。

## 本地启动

```bash
bun install
bun run dev
```

然后打开：
- `http://localhost:4600/`（会自动跳到中文 `/zh/`）
- `http://localhost:4600/en/`

## 构建

```bash
bun run build
```

构建产物在 `dist/`，部署到 `https://docs.su8.codes/` 对应的静态目录即可。

## 测试（本仓库的“自动检查”）

```bash
bun run test
```

它会做三件事：先做类型检查（TypeScript），再构建（build），最后用预览服务器跑一遍关键页面的冒烟检查（确保不会 404）。

## Cloudflare（推荐：docs.su8.codes）

最简单的方式：直接用 Cloudflare Pages 托管静态站，然后把自定义域名绑到 `docs.su8.codes`。

Pages 项目配置（连接仓库后）：
- Root directory：`.`
- Build command：`bun run build`
- Output directory：`dist`
