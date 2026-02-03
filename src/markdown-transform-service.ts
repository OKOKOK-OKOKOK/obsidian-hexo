import {TFile} from 'obsidian';
import {Logger} from "./logger";

export interface MarkdownTransformResult {
    content: string;
    changed: boolean;
}

export class MarkdownTransformService {
    /**
     * 构造函数logger
     * @param logger
     */
    constructor(private logger?: Logger) {}
    /**
     * 主入口：对 markdown 做统一转换
     */
    transform(
        /**
         * file虽然好像没啥用，但是可以用来打日志
         */
        file: TFile,
        raw: string
    ): MarkdownTransformResult {
        let content = raw;
        let changed = false;

        // 1. 处理 Obsidian 内链
        // 2. 处理图片语法
        // 3. 清理 obsidian 特有语法

        // Obsidian 图片语法 → 标准 Markdown
        const imageResult = this.transformImageSyntax(content);
        content = imageResult.content;
        changed ||= imageResult.changed;

        // Obsidian 内链语法处理
        const linkResult = this.transformInternalLinks(content);
        content = linkResult.content;
        changed ||= linkResult.changed;

        // 清理 Obsidian 特有残留
        const cleanupResult = this.cleanupObsidianSyntax(content);
        content = cleanupResult.content;
        changed ||= cleanupResult.changed;

        this.logger?.log(
            `[INFO] Markdown transformed (obsidian → hexo): ${file.name}`
        );


        return {
            content,
            changed
        };
    }

    /**
     * 处理 Obsidian 图片语法
     * ![[image.png]] → ![](image.png)
     */
    private transformImageSyntax(
        input: string
    ): MarkdownTransformResult {

        let changed = false;

        const content = input.replace(
            /!\[\[(.+?)]]/g,
            (_, imagePath) => {
                changed = true;
                return `![](${imagePath})`;
            }
        );

        return { content, changed };
    }

    /**
     * 处理 Obsidian 内链
     * [[Note]] → [Note](Note)
     * [[Note|Alias]] → [Alias](Note)
     */
    private transformInternalLinks(
        input: string
    ): MarkdownTransformResult {

        let changed = false;

        const content = input.replace(
            /\[\[([^\]|]+)(\|([^\]]+))?]]/g,
            (_, target, __, alias) => {
                changed = true;
                const text = alias ?? target;
                return `[${text}](${target})`;
            }
        );

        return { content, changed };
    }

    /**
     * 清理 Obsidian 特有语法
     * - ^block-id
     * - %% 注释 %%
     */
    private cleanupObsidianSyntax(
        input: string
    ): MarkdownTransformResult {

        let changed = false;
        let content = input;

        // 移除 block id (^xxxx)
        const beforeBlockId = content;
        content = content.replace(/\s\^[a-zA-Z0-9-]+/g, '');
        if (content !== beforeBlockId) {
            changed = true;
        }

        // 移除 Obsidian 注释 %% %%
        const beforeComment = content;
        content = content.replace(/%%[\s\S]*?%%/g, '');
        if (content !== beforeComment) {
            changed = true;
        }

        return { content, changed };
    }
}