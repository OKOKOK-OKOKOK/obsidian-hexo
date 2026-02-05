import {Plugin, Notice, TFile, FileSystemAdapter} from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';
import {Logger} from './logger';
import {FrontMatterService} from './frontmatter';
import {MarkdownTransformService} from "./markdown-transform-service";
import {AttachmentService} from "./attachment-service";

interface ResolvedPaths {
    /**
     * 原来ob中的md文件绝对路径
     */
    absoluteSrcPath: string;
    /**
     * 附件最后要去的文件夹
     */
    targetDir: string;
    /**
     * md文件最后要去的路径
     */
    targetFilePath: string;
}

export default class HexoSyncPlugin extends Plugin {

    /**
     * Obsidian 中写博客的目录
     */
    private OBSIDIAN_BLOG_DIR = 'D:\\Obsidian\\PluginTest\\Blog';

    /**
     * Hexo 的 _posts 目录
     */
    private HEXO_POST_DIR = 'F:\\Blog\\hexo-blog\\source\\_posts';

    /**
     * Hexo的source/images目录
     * 存放插件文件夹
     */
    private  HEXO_SRC_IMG_DIR = 'F:\\Blog\\hexo-blog\\source\\images';

    /**
     * 声明logger
     */
    private logger!: Logger;

    /**
     * 声明fm部分
     */
    private frontMatter!: FrontMatterService;

    /**
     * 声明附件service部分
     */
    private attachmentService!: AttachmentService;

    /**
     * 清洗语法
     * @private
     */
    private markdownTransform!: MarkdownTransformService;

    async onload() {

        try {
            const adapter = this.app.vault.adapter;

            if (adapter instanceof FileSystemAdapter) {
                /**
                 * 插件数据目录,实际上就是log文件位置
                 */
                const pluginDataDir = path.join(
                    adapter.getBasePath(),
                    '.obsidian',
                    'plugins',
                    'obsidian-hexo',
                    'data'
                );

                this.logger = new Logger(pluginDataDir);
                /**
                 * 需要先初始化logger再初始化fm，不然报错
                 */
                this.frontMatter = new FrontMatterService(this.logger);

                this.markdownTransform = new MarkdownTransformService(this.logger);

// 在 onload 中初始化
                this.attachmentService = new AttachmentService(this.logger, 'D:\\Obsidian\\PluginTest\\Blog\\attachment');

                this.logger.info('Plugin loaded');
            }

            new Notice('Hexo Sync Plugin loaded');
        } catch (err) {
            console.error('Plugin load failed:', err);
        }

        // 监听文件保存（modify）
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.logger.info(`[OBS2HEXO] File modified: ${file.path}`);
                    this.syncSingleMarkdown(file);
                }
            })
        );

    }

    /**
     * 同步 md 文件
     */
    private syncSingleMarkdown(file: TFile) {

        try {
            //===========================查找数据库，文件路径
            /**
             * 同步开始
             */
            this.logger.info(`[OBS2HEXO] Sync start: ${file.path}`);

            const adapter = this.app.vault.adapter;

            if (!(adapter instanceof FileSystemAdapter)) {
                new Notice('Hexo Sync only supports local vaults');
                return;
            }
            const paths = this.resolvePaths(file);

            if (!paths) return;

            const rawContent = fs.readFileSync(paths.absoluteSrcPath, 'utf8');

//===============================fm流程

            /**
             *
             */
            const {content} = this.processFrontMatter(file, rawContent);
            this.logger.info(`[FM] FM successfully`);

            //==============================附件处理

            this.attachmentService.processAttachments(
                file,
                content,
                paths.targetDir);
            this.logger.info(`[AS] Attachment modified: ${file.path}`);

//==============================语法清洗

            const transformedContent = this.markdownTransform.transform(file,content);
            this.logger.info(`[MD] MarkdownTransformed`);

// ========================复制md文件

            this.writeToHexo(paths, transformedContent.content);

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
     * 纯处理路径
     * @param file
     * @private
     */
    private resolvePaths(file: TFile): ResolvedPaths | null {
        /**
         * 同步开始
         */

        const adapter = this.app.vault.adapter;

        if (!(adapter instanceof FileSystemAdapter)) {
            new Notice('Hexo Sync only supports local vaults');
            return null;
        }
        /**
         * ob数据库的位置
         */
        const vaultBasePath = adapter.getBasePath();

        /**
         *  ob中md文件的绝对路径
         */
        const absoluteSrcPath = path.join(vaultBasePath, file.path);

        // 只同步 Obsidian Blog 目录
        if (!absoluteSrcPath.startsWith(this.OBSIDIAN_BLOG_DIR)) {
            this.logger.debug(
                `[OBS2HEXO] Skip non-blog file: ${absoluteSrcPath}`
            );
            return null;
        }

        /**
         * 文件名字（无扩展名）
         */
        const fileNameWithoutExt = path.basename(file.name, '.md');

        /**
         * 需要创建的同名目标附件文件夹
         */
        const targetDir = path.join(
            this.HEXO_SRC_IMG_DIR,
            fileNameWithoutExt
        );

        /**
         * md需要去的文件路径
         */
        const targetFilePath = path.join(
            this.HEXO_POST_DIR,
            file.name
        );
        return {
            absoluteSrcPath,//ob md文件绝对路径
            targetDir,//需要创建的同名文件夹绝对路径
            targetFilePath//md文件最后要去的绝对路径
        }
    }

    /**
     * fm处理
     * @param file
     * @param rawContent
     * @private
     */
    private processFrontMatter(
        file: TFile,
        rawContent: string
    ): { content: string; changed: boolean } {
        /**
         * 解析并规范化Front Matter
         */
        const fmResult = this.frontMatter.ensureAndNormalize(file, rawContent);

        /**
         * 将规范化的fm写入原本的obs 的 md文档中
         */
        if (fmResult.changed) {
            this.app.vault.modify(file, fmResult.content);
            this.logger.info(`[FM] write back to obsidian | ${file.path}`);
        }
        return fmResult;

    }

    /**
     * 写入md
     * @param paths 写入md的路径
     * @param content 修改后的内容
     * @private
     */
    private writeToHexo(
        paths: ResolvedPaths,
        content: string
    ) {
        fs.writeFileSync(
            paths.targetFilePath,
            content,
            'utf-8'
        );
    }

}
