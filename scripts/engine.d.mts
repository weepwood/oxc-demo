export interface OxcInput {
  tool: 'lint' | 'format' | 'parser' | 'transform' | 'minify' | 'resolver';
  filename: string;
  code: string;
  specifier?: string;
}

export interface OxcResult {
  output: string;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  diagnostics: string[];
  success: boolean;
}

export declare function runTool(input: unknown): Promise<OxcResult>;
