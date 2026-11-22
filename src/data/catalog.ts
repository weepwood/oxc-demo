import {
  Braces,
  FileSearch,
  Gauge,
  Layers3,
  ScanSearch,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';

export const tools = [
  {
    id: 'lint',
    name: 'Oxlint',
    category: '质量',
    headline: '更快地发现问题',
    description: '检查潜在错误、可疑写法与不必要的代码。',
    icon: ScanSearch,
    accent: 'blue',
    docs: 'https://oxc.rs/docs/guide/usage/linter',
    command: 'npx oxlint .',
    capabilities: ['规则诊断', '严重程度', '源代码位置'],
  },
  {
    id: 'format',
    name: 'Oxfmt',
    category: '格式化',
    headline: '让代码保持统一',
    description: '在复杂对象、链式表达式与 TSX 中保持一致的排版。',
    icon: WandSparkles,
    accent: 'orange',
    docs: 'https://oxc.rs/docs/guide/usage/formatter',
    command: 'npx oxfmt .',
    capabilities: ['稳定格式', 'TSX 支持', '差异对比'],
  },
  {
    id: 'parser',
    name: 'Parser',
    category: '解析',
    headline: '看见代码的内部结构',
    description: '将 JavaScript 与 TypeScript 解析为可以探索的 AST。',
    icon: Braces,
    accent: 'purple',
    docs: 'https://oxc.rs/docs/guide/usage/parser',
    command: "import { parseSync } from 'oxc-parser';",
    capabilities: ['TS-ESTree', '节点分布', '语法诊断'],
  },
  {
    id: 'transform',
    name: 'Transformer',
    category: '转换',
    headline: '从源码到 JavaScript',
    description: '观察类型移除、JSX 编译与现代语法处理。',
    icon: Layers3,
    accent: 'cyan',
    docs: 'https://oxc.rs/docs/guide/usage/transformer',
    command: "import { transform } from 'oxc-transform';",
    capabilities: ['类型移除', 'JSX 编译', '语法转换'],
  },
  {
    id: 'minify',
    name: 'Minifier',
    category: '压缩',
    headline: '更小的生产代码',
    description: '查看常量折叠、不可达分支处理与代码压缩效果。',
    icon: Gauge,
    accent: 'green',
    docs: 'https://oxc.rs/docs/guide/usage/minifier',
    command: "import { minifySync } from 'oxc-minify';",
    capabilities: ['体积对比', '常量折叠', '代码优化'],
  },
  {
    id: 'resolver',
    name: 'Resolver',
    category: '模块',
    headline: '定位依赖的真正入口',
    description: '解析包入口、子路径导出与 node_modules 的模块位置。',
    icon: FileSearch,
    accent: 'rose',
    docs: 'https://oxc.rs/docs/guide/usage/resolver',
    command: "import { ResolverFactory } from 'oxc-resolver';",
    capabilities: ['依赖路径', 'exports 映射', '解析结果'],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  category: string;
  headline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  docs: string;
  command: string;
  capabilities: readonly string[];
}>;

export type ToolId = (typeof tools)[number]['id'];
export type ToolMeta = (typeof tools)[number];

export function getTool(toolId: ToolId) {
  return tools.find((item) => item.id === toolId)!;
}
