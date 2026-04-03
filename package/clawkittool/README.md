# clawkittool

按需下载安装 OpenClaw workflow kit 的轻量安装器。

## 使用方式

```bash
clawkittool get product-kit
clawkittool get hotnews-kit --dir ./my-clawkit
clawkittool get product-kit --manifest https://example.com/clawkit/manifest.json
clawkittool get product-kit --config ~/.openclaw
clawkittool get product-kit --target-name sandbox
```

默认行为：

- 下载 `core.zip`
- 下载指定 kit
- 自动执行 `npm install`
- 自动探测本机 OpenClaw 目录并执行 `deploy`

自动探测顺序：

- `--config <path>`
- `OPENCLAW_HOME`
- `OPENCLAW_CONFIG_DIR`
- `OPENCLAW_CONFIG_PATH`
- `~/.openclaw/openclaw.json`
- `~/.config/openclaw/openclaw.json`

如果只想下载但不自动部署，可以加：

```bash
clawkittool get product-kit --skip-deploy
```

## manifest 格式

```json
{
  "version": 1,
  "core": {
    "url": "https://example.com/core.zip"
  },
  "kits": {
    "product-kit": {
      "url": "https://example.com/product-kit.zip"
    }
  }
}
```

## GitHub Release 用法

如果你把 `core.zip`、`product-kit.zip`、`hotnews-kit.zip` 上传到 GitHub Release，可以让构建脚本直接生成对应的 manifest：

```bash
CLAWKIT_GITHUB_REPO=hanson/openclawstudy \
CLAWKIT_GITHUB_TAG=v0.1.0 \
npm run build:distribution
```

这时 `manifest.json` 里的地址会变成：

```json
{
  "core": {
    "url": "https://github.com/hanson/openclawstudy/releases/download/v0.1.0/core.zip"
  },
  "kits": {
    "product-kit": {
      "url": "https://github.com/hanson/openclawstudy/releases/download/v0.1.0/product-kit.zip"
    }
  }
}
```
