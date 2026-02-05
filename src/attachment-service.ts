import { TFile } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';


export interface AttachmentProcessResult {
    content: string; // 处理后的 md 内容
    changed: boolean; // 是否修改过路径
}

export class AttachmentService {
    /**
     * Obsidian attachment 统一目录
     */
    private OBS_ATTACHMENT_DIR: string;

    constructor(
        private logger?: Logger,
        // fixme 路径后期需要可修改
        obsAttachmentDir: string = 'D:\\Obsidian\\PluginTest\\Blog\\attachment' // 默认路径，可传入
    ) {
        this.OBS_ATTACHMENT_DIR = obsAttachmentDir;
    }

    /**
     * 主入口：处理 Markdown 中引用的附件
     * @param file 当前 md 文件（仅用于日志）
     * @param content md 内容
     * @param targetDir Hexo md 同名目标文件夹
     */
    processAttachments(
        file: TFile,
        content: string,
        targetDir: string
    ): AttachmentProcessResult {

        let changed = false;
        let newContent = content;

        /**
         * 同时匹配：
         * 1. ![](xxx)
         * 2. ![[xxx]]
         */
        const imageRegex =
            /!\[\[(.+?)]]|!\[[^\]]*]\((.+?)\)/g;

        newContent = newContent.replace(
            imageRegex,
            (_, obsidianPath, markdownPath) => {

                /**
                 * 原始路径（Obsidian 优先）
                 */
                const rawPath = obsidianPath ?? markdownPath;
                if (!rawPath) return _;

                /**
                 * 真实文件名（此阶段不做任何清洗）
                 */
                const imgName = path.basename(rawPath);

                /**
                 * 源路径：Obsidian attachment
                 */
                const srcPath = path.join(this.OBS_ATTACHMENT_DIR, imgName);

                /**
                 * 目标路径：Hexo images/<mdName>/
                 */
                //const destPath = path.join(targetDir, imgName);

                /**
                 * 安全目标路径
                 */
                const safeDestPath = path.join(targetDir, this.normalizeFileName(imgName));
                    //this.normalizeFileName(destPath);

                // 创建目标目录
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                    this.logger?.debug(
                        `[AS] Created target directory: ${targetDir}`
                    );
                }

                // 附件不存在：保持原样（非常重要）
                if (!fs.existsSync(srcPath)) {
                    this.logger?.warn(
                        `[AS] Attachment not found: ${srcPath}`
                    );
                    return _;
                }

                // 幂等复制
                if (!fs.existsSync(safeDestPath)) {
                    fs.copyFileSync(srcPath, safeDestPath);
                    this.logger?.debug(
                        `[AS] Copied attachment ${imgName}`
                    );
                }

                changed = true;

                /**
                 * 注意：
                 * 此时只负责改成 Hexo 路径
                 * 不关心格式是否最终规范
                 */
                return `![](/images/${file.basename}/${imgName})`;
            }
        );

        return { content: newContent, changed };
    }

    /**
     * 将附件文件名转换为 Web / Hexo 安全格式
     */
    private normalizeFileName(fileName: string): string {
        return fileName
            .trim()
            .replace(/\s+/g, '_')      // 空格 → _
            .replace(/[^\w.-]/g, '');  // 移除非法字符
    }



}
