import {Plugin, Notice, TFile, FileSystemAdapter} from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';
import {Logger} from './logger';
import {FrontMatterService} from './frontmatter';
import {MarkdownTransformService} from "./markdown-transform-service";
import {AttachmentService} from "./attachment-service";

interface ResolvedPaths {
    absoluteSrcPath: string;
    targetDir: string;
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
                    this.logger.info(`[INFO] File modified: ${file.path}`);
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
            this.logger.info(`Sync start: ${file.path}`);

            const adapter = this.app.vault.adapter;

            if (!(adapter instanceof FileSystemAdapter)) {
                new Notice('Hexo Sync only supports local vaults');
                return;
            }
            const paths = this.resolvePaths(file);

            if (!paths) return;

            const rawContent = fs.readFileSync(paths.absoluteSrcPath, 'utf8');

//===============================fm流程

            const {content} = this.processFrontMatter(file, rawContent);

//====================语法清洗

            const transformedContent = this.markdownTransform.transform(file,content);


//==============================附件处理

            this.
                attachmentService.
                processAttachments(
                    file,
                    transformedContent.
                        content,
                    paths.
                        targetDir);

// ========================复制md文件

            this.writeToHexo(paths, transformedContent.content);

            this.logger.info(`Sync success: ${file.name}`);
            new Notice('Hexo sync OK');

        } catch (error) {
            this.logger.error(
                `Sync failed for ${file.path}: ${String(error)}`
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
            this.logger.info(
                `Skip non-blog file: ${absoluteSrcPath}`
            );
            return null;
        }

        /**
         * 文件名字（无扩展名）
         */
        const fileNameWithoutExt = path.basename(file.name, '.md');

        /**
         * 需要创建的同名目标文件夹
         */
        const targetDir = path.join(
            this.HEXO_POST_DIR,
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
        const result = this.frontMatter.ensureAndNormalize(file, rawContent);

        /**
         * 将fm是否改变 写入日志
         */
        this.logger.info(
            result.changed
                ? `Front Matter updated: ${file.name}`
                : `Front Matter unchanged: ${file.name}`
        );
        return result;

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
