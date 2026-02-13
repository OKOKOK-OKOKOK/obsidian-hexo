import { TFile } from 'obsidian';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {Logger} from "./logger";


/**
 * 表示 Front Matter 处理结果的接口
 */
export interface FrontMatterResult {
  content: string;
  frontMatter: Record<string, any>;
  changed: boolean;
}

/**
 * 处理 Front Matter 的服务类
 * 构造函数
 */
export class FrontMatterService {

  constructor(private logger?: Logger) {}

  /**
   * 主入口：确保 Front Matter 符合 Hexo 规范
   */
  public ensureAndNormalize(
    file: TFile,
    raw: string
  ): FrontMatterResult {
    this.logger?.info(`[FM] start ${file.path}`);

    /**
     * 解析 Front Matter
     */
    const { frontMatter, content } = this.parse(raw);
    /**
     * 规范化 Front Matter
     */
    const normalized = this.normalize(file, frontMatter);
    /**
     * 检查是否有变化
     */
    const changed =
      JSON.stringify(frontMatter) !== JSON.stringify(normalized);

    /**
     * 将fm是否改变 写入日志
     */
    this.logger?.debug(
        changed
            ? `[FM] Front Matter updated: ${file.name}`
            : `[FM] Front Matter unchanged: ${file.name}`
    );
    /**
     * 序列化 Front Matter
     */
    return {
      content: this.stringify(normalized, content),
      frontMatter: normalized,
      changed
    };
  }

  /**
   * 解析 Front Matter
   */
  private parse(md: string): { frontMatter: Record<string, any>; content: string } {

    /**
     * 按行分割 Markdown 内容
     */
    const lines = md.split('\n');

    /**
     * 检查是否有 Front Matter
     */
    if (lines[0]?.trim() !== '---') {
      return { frontMatter: {}, content: md };
    }

    /**
     * 查找 Front Matter 结束位置
     */
    let end = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        end = i;
        break;
      }
    }

    /**
     * 检查是否有 Front Matter 结束标记
     */
    if (end === -1) {
      return { frontMatter: {}, content: md };
    }

    /**
     * 提取 Front Matter 内容
     */
    const fmLines = lines.slice(1, end);

    /**
     * 提取 Markdown 内容
     */
    const content = lines.slice(end + 1).join('\n').trimStart();

    /**
     * 解析 Front Matter 内容
     */
    const fm: Record<string, any> = {};
    /**
     * 当前解析的键名，
     * string | null，联合变量，要么为string，要么为null，
     * 初始值为null，因为在解析第一行时，还没有键名
     */
    let currentKey: string | null = null;

    /**
     * 解析 Front Matter 行
     */
    for (const line of fmLines) {
      /**
       * 跳过空行
       */
      if (!line.trim()) continue;

      /**
       * 处理列表项
       * 用于处理带多个‘-’的列表项，例如：
       * - item1
       * - item2
       */
      if (line.trim().startsWith('-') && currentKey) {
        /**
         * 如果为空，则生成空数组
         */
        fm[currentKey] ??= [];
        /**
         * 移除列表项的 '-' 前缀，然后去掉空格，加入数组里面
         */
        fm[currentKey].push(line.replace('-', '').trim());
        continue;
      }

      /**
       * 处理键值对
       * 遇到的‘：’冒号，说明出现了新的键值对
       * @param idx 冒号的索引位置
       * @param key 键名
       * @param value 值
       * @param currentKey 当前解析的键名，最重要的一个变量，相当于展示当前状态
       */
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        /**
         * 跳过无效的键值对，去点空格之后如果为空，那就要直接跳过这个循环，连后面的代码都不用执行了
         */
        if (!key) continue;
        /**
         * 每一轮循环都对current key进行赋值
         */
        currentKey = key;
        fm[key] = value === '' ? [] : value;
      }
    }

    return { frontMatter: fm, content };
  }

  /**
   * Hexo 规范化
   */
  private normalize(file: TFile, fm: Record<string, any>): Record<string, any> {
    const result = { ...fm };

    // title
    result.title ??= path.basename(file.name, '.md');
    this.logger?.debug(`[FM] title ${file.path}`);

    /**
   * 保证创建日期不会被修改
   */
    // date
    if (result.date == null) {
      result.date = this.formatDate(new Date()); // 只在没有 date 时设置
      this.logger?.debug(`[FM] date ${file.path}`);
    }

    /**
     * 每次修改都要更新前日期
     */
    // updated
    result.updated = this.formatDate(new Date());
    this.logger?.debug(`[FM] update ${file.path}`);

    // tags
    if (typeof result.tags === 'string') {
      result.tags = [result.tags];
      this.logger?.debug(`[FM] tag ${file.path}`);
    }

    // categories
    if (typeof result.categories === 'string') {
      result.categories = [result.categories];
      this.logger?.debug(`[FM] categories ${file.path}`);
    }

    /**
     * hexo_id：永久唯一 ID，只在第一次生成
     */
    //uuid
    if (result.hexo_id == null) {
      result.hexo_id = randomUUID();
      this.logger?.debug(`[FM] hexo id ${file.path}`);
    }

    return result;
  }

  /**
   * 序列化为 Markdown
   */
  private stringify(fm: Record<string, any>, content: string): string {
    const lines: string[] = ['---'];

    for (const key of Object.keys(fm)) {
      const val = fm[key];
      if (Array.isArray(val)) {
        lines.push(`${key}:`);
        for (const item of val) {
          lines.push(`  - ${item}`);
        }
      } else {
        lines.push(`${key}: ${val}`);
      }
    }

    lines.push('---', '', content);
    return lines.join('\n');
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
      + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}

/**
 * todo 逻辑缺陷，如果使用---在一开头就作为分隔符，会被错误识别成fm开头，例如如下：
 * ！！！！！！！！！！第一行必须是空格才会被正常解析
 * ---
 *
 * # 从 Obsidian 插件开发理解依赖反转原则（DIP）与干净架构
 *
 * 在开发 Hexo Sync 插件的过程中，我逐渐意识到：
 *
 * > 写功能很容易，但写“可以长期演化的代码结构”非常难。
 *
 * 本文将结合实际代码，讲清楚三个核心问题：
 *
 * 1. 为什么依赖反转原则（DIP）是大型项目的核心？
 *
 * 2. 如何用接口避免循环依赖？
 */