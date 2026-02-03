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

        // 匹配 Markdown 图片语法 ![](xxx)
        const imageRegex = /!\[.*?]\((.*?)\)/g;

        newContent = newContent.replace(imageRegex, (_, imgPath) => {
            // 取文件名
            const imgName = path.basename(imgPath);

            // 目标 Hexo 文件夹
            const destPath = path.join(targetDir, imgName);

            // 创建目标文件夹
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
                this.logger?.log(`[INFO] Created target directory for attachment: ${targetDir}`);
            }

            // 在 Obsidian attachment 目录寻找文件
            const srcPath = path.join(this.OBS_ATTACHMENT_DIR, imgName);

            /**
             * fixme 如果是第一次创建attachment，会导致备份md时，attachment文件夹还未创建好
             * 这时候会触发这个warn，导致直接报告not found，无法进行到下一步创建文件夹和复制文件
             * 解决方法，是否使用延时等待可以处理？
             */
            if (!fs.existsSync(srcPath)) {
                this.logger?.log(`[WARN] Attachment not found: ${srcPath}`);
                return `![](${imgPath})`; // 不改
            }

            // 复制附件
            fs.copyFileSync(srcPath, destPath);
            this.logger?.log(`[INFO] Copied attachment ${imgName} to ${targetDir}`);

            changed = true;

            // 返回修改后的 Markdown 路径（相对 Hexo md 文件的同名目录）
            return `![](${imgName})`;
        });

        if (changed) {
            this.logger?.log(`[INFO] Attachments processed for ${file.name}`);
        }

        return { content: newContent, changed };
    }
}
