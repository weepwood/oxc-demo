# Oxc Demo · 工具链实验室

一个基于 **React 19 + TypeScript + Vite 8** 的 Oxc 功能演示项目，通过真实运行结果展示六个工具的行为，不将模拟数据当作 Oxc 结果。

**在线访问：** https://weepwood.github.io/oxc-demo/

## 演示内容

| 工具 | 3 个真实案例 | 深入观察 |
| --- | --- | --- |
| **Oxlint** | 未使用变量、调试语句、检查通过 | 规则名称、严重程度、源码行定位 |
| **Oxfmt** | 对象与数组、链式调用、TSX 组件 | 格式化前后逐行差异 |
| **Parser** | TypeScript AST、JSX AST、语法错误 | 可展开的 AST 树、节点类型统计、原始 JSON |
| **Transformer** | 类型移除、JSX 转换、现代语法 | 输入/输出差异 |
| **Minifier** | 常量折叠、不可达代码、函数压缩 | 代码差异、体积变化 |
| **Resolver** | React、react-dom/client、lucide-react | 模块解析结果、实际文件路径 |

每个案例提供可共享的地址（Hash 路由）、源码、真实输出、针对性的解释和官方文档。

## 运行

需要 **Node.js 22.12+**。

```bash
npm install
npm run dev
```

开发模式下可以直接修改源码、插入缩进（Tab），并按 **Ctrl / ⌘ + Enter** 执行。处理发生在本地 Node.js 中，不会运行输入的 JS/TS 程序。

## 在线版和本地版的区别

GitHub Pages 没有 Node.js 服务器，无法直接调用 Oxc 的原生 N-API 工具。因此，构建流程会用已安装的 Oxc 实际执行所有 **18 个案例**，生成 `public/showcase.json`，供在线站点切换展示。页面明确标识快照来源，**不会声称浏览器正在实时分析你编辑的代码**。

| 能力 | GitHub Pages | 本地开发服务器 |
| --- | --- | --- |
| 18 个案例与结果 | ✅ 构建时真实快照 | ✅ 构建快照、实时运行 |
| AST 树 / 诊断 / 差异对比 | ✅ | ✅ |
| 复制、下载、案例分享链接 | ✅ | ✅ |
| 直接编辑并重新执行 | ❌ | ✅ |
| 浅色 / 深色 / 跟随系统 | ✅ | ✅ |

> **注意：** 在线 Resolver 解析出的绝对路径来自 GitHub Actions 的构建机器，而不是访客电脑。显示的处理耗时是快照生成时的耗时，不代表浏览器或任何机器的 Oxc 基准测试。代码差异是可视化逐行比较，不是语义等价性证明。

## 工程命令

```bash
npm run dev        # 本地交互式工作台
npm run build      # 生成 18 个快照、类型检查并编译
npm run preview    # 预览生产构建
npm run lint       # Oxlint
npm run lint:fix   # Oxlint 安全修复
npm run fmt        # Oxfmt 格式化
npm run fmt:check  # Oxfmt 格式检查
npm run typecheck  # TypeScript 类型检查
npm test           # Node 测试
npm run generate   # 单独生成真实案例快照
```

案例定义在 `src/data/samples.json`，工具说明在 `src/data/catalog.ts`。添加案例无需修改页面：只需要使用唯一 ID、对应工具与合法源代码，重新执行构建即可自动生成输出。

## 项目结构

```text
src/
  App.tsx                 工作台与路由
  theme.ts                系统主题监听、存储
  styles.css              语义设计变量、界面与响应式样式
  components/Inspector.tsx AST / 差异 / 诊断 / Resolver 视图
  lib/inspect.ts          诊断、AST 计数与差异算法
  data/catalog.ts         工具能力元信息
  data/samples.json       18 个案例
scripts/
  engine.mjs              真实 Oxc Node 执行器
  generate.mjs            构建期案例快照
  *.test.mjs              自动化测试
```

## 部署

仓库通过 `.github/workflows/pages.yml` 自动构建并发布到 GitHub Pages。通过 `.github/workflows/ci.yml` 检查 Oxlint、类型与测试。

## 相关项目

- [Oxc 文档](https://oxc.rs/)
- [Oxc 官方 Playground](https://playground.oxc.rs/)
- [Oxc GitHub](https://github.com/oxc-project/oxc)

示例代码为教学用途。功能和解析结果以项目依赖版本实际执行为准。
