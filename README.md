# su8 codes docs (Rspress)

这是对外的文档站源码（部署到 `docs.su8.codes`）。

## 本地启动

```bash
npm install
npm run dev
```

然后打开：
- `http://localhost:4600/`（会自动跳到中文 `/zh/`）
- `http://localhost:4600/en/`

## 构建

```bash
npm run build
```

构建产物在 `dist/`，部署到 `https://docs.su8.codes/` 对应的静态目录即可。

## Cloudflare（推荐：docs.su8.codes）

最简单的方式：直接用 Cloudflare Pages 托管静态站，然后把自定义域名绑到 `docs.su8.codes`。

Pages 项目配置（连接仓库后）：
- Root directory：`.`
- Build command：`npm run build`
- Output directory：`dist`
