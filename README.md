# Oxc Demo

一个面向 JavaScript / TypeScript 工具链的 Oxc 演示工作台，覆盖 **Oxlint、Oxfmt、Parser、Transformer、Minifier、Resolver**。

- **本地开发**：`npm run dev` 启动可编辑、可执行的真实 Oxc 工具演示（仅在本机运行，不会上传源代码）。
- **GitHub Pages**：通过构建时真实调用 Oxc 生成快照，提供无需服务端的可查看示例。静态模式不会冒充实时执行。
- **工程实践**：React + TypeScript + Vite 8、Oxlint、Oxfmt、类型检查、Node 测试、GitHub Actions。

## 快速开始

需要 Node.js **22.12+**（建议最新 Node 22 LTS 或 24 LTS）。

```bash
npm install
npm run dev
```

访问终端提示的本地地址，切换六种工具，编辑代码并点击「运行」。

## 主要命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动支持真实运行的本地工作台 |
| `npm run build` | 生成真实 Oxc 示例快照并构建站点 |
| `npm run preview` | 预览静态构建结果 |
| `npm run lint` | Oxlint 静态检查 |
| `npm run lint:fix` | Oxlint 安全修复 |
| `npm run fmt` | Oxfmt 格式化 |
| `npm run fmt:check` | Oxfmt 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | Node 内置测试 |
| `npm run generate` | 重新生成 `public/showcase.json` |

## 工作模式

| 操作 | 本地 Vite 开发服务器 | GitHub Pages |
| --- | --- | --- |
| 浏览全部工具及源码示例 | ✅ | ✅ |
| 查看 Oxc 真实处理结果 | ✅ | ✅（构建时快照） |
| 修改代码并即时运行 | ✅ | ❌（静态站点无 Node 运行时） |
| 复制源码、结果与下载 | ✅ | ✅ |

开发服务器的 `/api/run` 仅在本地提供，源码在本地 Node.js 进程处理；**不执行用户输入的 JS/TS**。Oxlint 只读取临时文件，调用完成即删除。输入长度有上限，输出经过截断，防止意外占用资源。


## 主题与交互

- 主题默认设置为 **跟随系统**：根据操作系统的浅色 / 深色外观自动切换，系统主题改变时无需刷新页面。
- 顶部主题切换支持 **系统 / 浅色 / 深色** 三种选择；手动选择保存在本机浏览器，下次访问自动恢复。重新选择「系统」即可恢复自动跟随。
- 应用使用语义颜色变量统一管理背景、边框、文本、代码面板和交互状态，避免浅色模式对比度不足。
- 工具导航高亮平滑移动，切换模块时内容轻量淡入；按钮反馈、运行状态、输出和提示有适度动画。
- 移动端支持滑出导航、点击遮罩关闭、按 Escape 关闭。
- 遵守 `prefers-reduced-motion`：系统设置减少动态效果时，会关闭非必要动效。

## GitHub Pages

仓库包含 `.github/workflows/pages.yml`。在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions** 后，推送 `main` 将自动部署到：

https://weepwood.github.io/oxc-demo/

## 官方文档

- [Oxc](https://oxc.rs/)
- [Oxlint](https://oxc.rs/docs/guide/usage/linter)
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- [Parser](https://oxc.rs/docs/guide/usage/parser)
- [Transformer](https://oxc.rs/docs/guide/usage/transformer)
- [Minifier](https://oxc.rs/docs/guide/usage/minifier)
- [Resolver](https://oxc.rs/docs/guide/usage/resolver)

> Oxc 包更新较频繁；此仓库将依赖版本明确记录在 `package.json`，示例输出以实际安装和运行结果为准。
