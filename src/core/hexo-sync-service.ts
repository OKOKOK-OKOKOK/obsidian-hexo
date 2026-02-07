import {Notice, TFile} from 'obsidian';
import * as fs from 'fs';
import {Logger} from "../services/logger";
import {FrontMatterService} from "../services/frontmatter-service";
import {AttachmentService} from "../services/attachment-service";
import {MarkdownTransformService} from "../services/markdown-transform-service";
import {ResolvedPathsService, ResolvedPaths} from "../utils/path-utils";
import {writeTextFile} from "../utils/fs-utils";

export interface SyncContext {
    file: TFile;
    /**
     * 这里的数据不能变
     *
     * absoluteSrcPath
     * 原来ob中的md文件绝对路径
     *
     * targetAttachmentDir
     * 附件最终要去的文件夹，需要组合附件的文件名 + 扩展名
     *
     * targetMarkdownFilePath
     * md文档的最终地址，直接使用
     */
    paths: ResolvedPaths;
    /**
     * rawContent 永远不变
     */
    rawContent: string;
    /**
     * 这里的数据不能变
     * content 持续变化
     */
    content: string;
    changed: boolean;


}

export class SingleMarkdownSyncService {

    /**
     * @param logger
     * @param frontMatterService
     * @param attachmentService
     * @param markdownTransform
     * @param resolvedPathsService
     */
    constructor(private logger: Logger,
                private frontMatterService: FrontMatterService,
                private attachmentService: AttachmentService,
                private markdownTransform: MarkdownTransformService,
                private resolvedPathsService: ResolvedPathsService,
    ) {
    }

    syncSingleMarkdown(file: TFile): void {
        try {
            //===========================查找数据库，文件路径
            /**
             * 同步开始
             */

            this.logger.info(`[OBS2HEXO] Sync start: ${file.path}`);

            const ctx: SyncContext = {
                file,
                /**
                 * learn 类型断言，阻止 ts 检测
                 */
                paths: {} as ResolvedPaths,
                rawContent: '',
                content: '',
                changed: false,
            };

            //paths
            const paths = this.resolvedPathsService.resolvedPaths(file);
            if (!paths) return;
            ctx.paths = paths;

            //rawContent
            //content
            const rawContent = fs.readFileSync((ctx.paths.absoluteSrcPath), 'utf8');

            /**
             * learn 避免直接对 ctx 赋值，因为会在赋值之前读取数据，但是这时候为空，会直接报错
             */
            ctx.paths = paths;
            ctx.rawContent = rawContent;
            ctx.content = rawContent;

            this.logger.debug('[OBS2HEXO] FrontMatter stage start');
            this.processFrontMatterStage(ctx);
            this.logger.debug('[OBS2HEXO] FrontMatter stage done');


            this.logger.debug('[OBS2HEXO] Attachment stage start');
            this.processAttachmentStage(ctx);
            this.logger.debug('[OBS2HEXO] Attachment stage done');

            this.logger.debug('[OBS2HEXO] MdTransform stage start');
            this.processMarkdownTransformStage(ctx);
            this.logger.debug('[OBS2HEXO] MdTransform stage done');

            this.logger.debug('[OBS2HEXO] Write stage start');
            this.writeStage(ctx);
            this.logger.debug('[OBS2HEXO] Write stage done');

            this.logger.info(`[OBS2HEXO] Sync success: ${file.name}`);
            new Notice('Hexo sync OK');

        } catch (error) {
            this.logger.error(
                `[OBS2HEXO] Sync failed for ${file.path}: ${String(error)}`
            );
            new Notice('Hexo sync failed');
        }
    }

    /**
     * 进行 front matter 处理
     * @param ctx
     * @private
     */
    private processFrontMatterStage(ctx: SyncContext) {

        const fmResult = this.frontMatterService.ensureAndNormalize(
            ctx.file,
            ctx.content);
        ctx.content = fmResult.content;
        ctx.changed = fmResult.changed;

    }

    private processAttachmentStage(ctx: SyncContext) {
        const attachmentResult = this.attachmentService.processAttachments(
            ctx.file,
            ctx.content,
            ctx.paths)
        ctx.content = attachmentResult.content;
        ctx.changed = attachmentResult.changed;

    }

    private processMarkdownTransformStage(ctx: SyncContext) {
        const markdownResult = this.markdownTransform.transform(
            ctx.file,
            ctx.content);
        ctx.content = markdownResult.content;
        ctx.changed = markdownResult.changed;

    }
//D:\Obsidian\Obsidian\source\_posts\欢迎.md'
    /**
     * question 几乎没有什么新添加处理的功能，感觉这个封装多此一举，但是比较整齐，可能方便之后修改
     * @param ctx
     * @private
     */
    private writeStage(ctx: SyncContext) {
        if (!ctx.paths.targetMarkdownFilePath) {
            throw new Error('[Paths] targetMarkdownFilePath is empty');
        }
        writeTextFile(ctx.paths.targetMarkdownFilePath, ctx.content);

    }
}