import bindings from 'bindings';
import * as fs from 'fs';
import * as path from 'path';

type ExtractOptions = {
  password?: string;
  pageStart?: number; // 1-based inclusive
  pageEnd?: number;   // 1-based inclusive
  'return'?: 'text';
  separator?: string;
  normalize?: boolean | { spaces?: boolean; newlines?: boolean; trim?: boolean };
};

type ExtractedPage = {
  page: number;
  text: string;
};

type ExtractMetadata = {
  title: string;
  author: string;
  pages: number;
};

type ExtractResult = {
  metadata: ExtractMetadata;
  pages: ExtractedPage[];
};

type NativeOptions = {
  password?: string;
  pageStart?: number;
  pageEnd?: number;
};

interface NativeModule {
  extractPdf(input: string | Buffer, options?: NativeOptions): any;
}

const native: NativeModule = bindings('pdf_extractor');

function extractPdf(input: string | Buffer, options?: Omit<ExtractOptions, 'return'>): ExtractResult;
function extractPdf(input: string | Buffer, options: ExtractOptions & { 'return': 'text' }): string;
function extractPdf(input: string | Buffer, options: ExtractOptions = {}): ExtractResult | string {
  const isPath = typeof input === 'string';
  const isBuffer = Buffer.isBuffer(input);
  if (!isPath && !isBuffer) {
    throw new TypeError('input deve ser uma string (caminho) ou Buffer');
  }
  if (isPath && input.length === 0) {
    throw new TypeError('caminho não pode ser vazio');
  }
  if (isPath) {
    const full = path.resolve(String(input));
    let stats: fs.Stats;
    try {
      stats = fs.statSync(full);
    } catch (e) {
      throw new Error('arquivo não encontrado');
    }
    if (!stats.isFile()) {
      throw new Error('caminho não é arquivo');
    }
  }

  const password: string | undefined = typeof options.password === 'string' ? options.password : undefined;
  const pageStart: number | undefined = Number.isInteger(options.pageStart) ? options.pageStart : undefined; // 1-based
  const pageEnd: number | undefined = Number.isInteger(options.pageEnd) ? options.pageEnd : undefined; // 1-based

  const nativeOptions: NativeOptions = {};
  if (password) nativeOptions.password = password;
  if (pageStart) nativeOptions.pageStart = pageStart;
  if (pageEnd) nativeOptions.pageEnd = pageEnd;

  const result: ExtractResult = Object.keys(nativeOptions).length > 0
    ? native.extractPdf(input, nativeOptions)
    : native.extractPdf(input);

  if (options['return'] === 'text') {
    const sep = typeof options.separator === 'string' ? options.separator : '\n';
    return result.pages.map(p => p.text).join(sep);
  }

  return result;
}

export type { ExtractOptions, ExtractResult, ExtractMetadata, ExtractedPage };
export {
  extractPdf,
};