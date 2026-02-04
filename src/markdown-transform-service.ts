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

        this.logger?.debug(`[MD] start transform: ${file.name}`);

        /**
         * Obsidian 图片语法 → 标准 Markdown
         */
        const imageResult = this.transformImageSyntax(content);
        content = imageResult.content;
        changed ||= imageResult.changed;
        if (imageResult.changed) {
            this.logger?.debug(`[MD:image] transformed`);
        }


        /**
         * Obsidian 内链语法处理
         */
        const linkResult = this.transformInternalLinks(content);
        content = linkResult.content;
        changed ||= linkResult.changed;
        if (linkResult.changed) {
            this.logger?.debug(`[MD:link] transformed`);
        }

        /**
         * 将附件路径的attachment改为md同名，
         * 便于hexo辨认
         */
        const attachmentPathResult = this.transformAttachmentPath(content,file);
        content = attachmentPathResult.content;
        changed ||= attachmentPathResult.changed;
        if (attachmentPathResult.changed) {
            this.logger?.debug(`[MD:attachmentPath] transformed`);
        }


        /**
         * 清理 Obsidian 特有残留
         */
        const cleanupResult = this.cleanupObsidianSyntax(content);
        content = cleanupResult.content;
        changed ||= cleanupResult.changed;
        if (cleanupResult.changed) {
            this.logger?.debug(`[MD:cleanup] transformed`);
        }

        if (changed) {
            this.logger?.info(`[MD] transformed: ${file.name}`);
        }

        /*
       留一下日志格式方便之后只用
       this.logger?.info('[MD] ...');
this.logger?.debug('[MD:image] ...');
this.logger?.warn('[MD] ...');

         */
        return {
            content,
            changed
        };
    }
//=============================功能函数
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

    /**
     * done 需要将附件路径中的1attachment改为md同名路径，不然附件复制成功之后是没办法正确读取附件的
     */
    /**
     * 修正附件路径
     * xxx.png → <md-name>/xxx.png
     */
    private transformAttachmentPath(
        input: string,
        file: TFile
    ): MarkdownTransformResult {

        let changed = false;
        const mdName = file.basename;

        const content = input.replace(
            /!\[\]\((?:\.\/)?attachment\/(.+?)\)/g,
            (_, fileName) => {
                changed = true;
                return `![](${mdName}/${fileName})`;
            }
        );

        return { content, changed };
    }


}