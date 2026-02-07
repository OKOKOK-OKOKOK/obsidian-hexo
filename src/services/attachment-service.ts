import { TFile } from 'obsidian';
import * as path from 'path';
import { Logger } from './logger';
import {ResolvedPaths} from "../utils/path-utils";
import * as fs from "node:fs";


export interface AttachmentProcessResult {
    content: string; // 处理后的 md 内容
    changed: boolean; // 是否修改过路径
}

export class AttachmentService {

    constructor(private logger?: Logger,) {}

    /**
     * 主入口：处理 Markdown 中引用的附件
     * @param file 当前 md 文件（仅用于日志）
     * @param content md 内容
     * @param paths 从路径处理函数哪来的paths接口
     */
    processAttachments(
        file: TFile,
        content: string,
        paths:ResolvedPaths,
        /**
         * 关于地址的处理，直接传入paths这个三个变量，然后再拆分使用
         */
    ): AttachmentProcessResult {


        /**
         * 检验paths.targetAttachmentDir是否存在
         */
        if (!paths?.targetAttachmentDir) {
            this.logger?.error('[AS] Invalid paths: targetAttachmentDir is empty');
            return { content, changed: false };
        }

        let changed = false;
        let newContent = content;


        /**
         * 同时匹配：
         * 1. ![](xxx)
         * 2. ![[xxx]]
         */
        const imageRegex =
            /!\[\[(.+?)]]|!\[[^\]]*]\((.+?)\)/g;

        // newContent = newContent.replace(
        //     imageRegex,
        //     (_, obsidianPath, markdownPath) => {
        //
        //         /**
        //          * 原始路径（Obsidian 优先）
        //          */
        //         const rawPath = obsidianPath ?? markdownPath;
        //         if (!rawPath) return _;
        //
        //         /**
        //          * 真实文件名（此阶段不做任何清洗）
        //          */
        //         const imgName = path.basename(rawPath);
        //
        //         /**
        //          * 源路径：Obsidian attachment
        //          */
        //         const srcPath = path.join(paths.targetAttachmentDir, imgName);
        //
        //         /**
        //          * 目标路径：Hexo images/<mdName>/
        //          */
        //         //const destPath = path.join(targetDir, imgName);
        //
        //         /**
        //          * 安全目标路径
        //          */
        //         const safeDestPath = path.join(paths.targetAttachmentDir, this.normalizeFileName(imgName));
        //             //this.normalizeFileName(destPath);
        //
        //
        //         /**
        //          * 创建目标目录
        //          * 如果有还需要另外打日志
        //           */
        //
        //         if (!fs.existsSync(paths.targetAttachmentDir)) {
        //             fs.mkdirSync(paths.targetAttachmentDir, { recursive: true });
        //             this.logger?.debug(
        //                 `[AS] Created target directory: ${paths.targetAttachmentDir}`
        //             );
        //         }
        //
        //         // 附件不存在：保持原样（非常重要）
        //         if (!fs.existsSync(srcPath)) {
        //             this.logger?.debug(
        //                 `[AS] Attachment not found: ${srcPath}`
        //             );
        //             return _;
        //         }
        //
        //         // 幂等复制
        //         if (!fs.existsSync(safeDestPath)) {
        //             fs.copyFileSync(srcPath, safeDestPath);
        //             this.logger?.debug(
        //                 `[AS] Copied attachment ${imgName}`
        //             );
        //         }
        //
        //         changed = true;
        //
        //         /**
        //          * 注意：
        //          * 此时只负责改成 Hexo 路径
        //          * 不关心格式是否最终规范
        //          */
        //         return `![](/images/${file.basename}/${imgName})`;
        //     }
        // );

        newContent = newContent.replace(
            imageRegex,
            (full, obsidianPath, markdownPath) => {
                /**
                 * learn ?? 表示优先级
                 */
                const rawPath = obsidianPath ?? markdownPath;
                if (!rawPath) {
                    this.logger?.debug(
                        `[AS] Empty image path, skipped (file=${file.path})`
                    );
                    return full;
                }
                const result = this.processSingleAttachment(
                    file,
                    rawPath,
                    paths
                );

                if (result.changed) changed = true;
                return result.replacement ?? full;
            }
        );

        this.logger?.debug(
            `[AS] Attachment processing finished (file=${file.path}, changed=${changed})`
        );

        return { content: newContent, changed };
    }

    /**
     * 将附件文件名转换为 Web / Hexo 安全格式
     * 不应该移动到工具类里面
     * 工具类里需要尽量避免出现出现带业务倾向的方法，
     * 工具类里面应该是泛用多个 service 的方法
     */
    private normalizeFileName(fileName: string): string {
        return fileName
            .trim()
            .replace(/\s+/g, '_')      // 空格 → _
            .replace(/[^\w.-]/g, '');  // 移除非法字符
    }

    private processSingleAttachment(
        file: TFile,
        rawPath: string,
        paths: ResolvedPaths
    ): { changed: boolean; replacement?: string } {

        this.logger?.debug(
            `[AS] Start processing attachments for: ${file.path}`
        );


        /**
         * 基础校验（Fail Fast）
         */
        if (!paths?.targetAttachmentDir) {
            this.logger?.error(
                '[AS] Invalid paths: targetAttachmentDir is empty');
            return { changed: false };
        }

        /**
         * 解析文件名
         * rawPath 只用于“定位”，不用于输出
         */
        const imgName = path.basename(rawPath);
        const safeName = this.normalizeFileName(imgName);
        if (imgName !== safeName) {
            this.logger?.debug(
                `[AS] Normalized filename: ${imgName} -> ${safeName}`
            );
        }

        /**
         * 构造源 / 目标路径
         * 这里仍然假设附件统一存放于 targetAttachmentDir
         */
        const srcPath = path.join(paths.absoluteAttachmentPath, imgName);
        const destDir = paths.targetAttachmentDir;
        const destPath = path.join(destDir, safeName);
        this.logger?.debug(
            `[AS] Resolved paths: src=${srcPath}, dest=${destPath}`
        );

        /**
         * 源文件不存在 → 不修改 Markdown（非常重要）
         */
        if (!fs.existsSync(srcPath)) {
            this.logger?.debug(
                `[AS] Attachment not found, skipped: ${srcPath}`
            );
            return { changed: false };
        }

        /**
         * 确保目标目录存在（幂等）
         */
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
            this.logger?.debug(
                `[AS] Created attachment directory: ${destDir}`
            );
        }

        /**
         * 幂等复制
         * - 已存在：不覆盖
         * - 不存在：复制
         */
        if (!fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
            this.logger?.debug(
                `[AS] Copied attachment: ${imgName} -> ${safeName}`
            );
        } else {
            this.logger?.debug(
                `[AS] Attachment already exists, skipped copy: ${safeName}`
            );
        }

        /**
         * 返回 Markdown 替换结果
         * 注意：
         * - 这里只负责“Hexo 路径”
         * - 不关心 Markdown 风格是否最终规范
         */
        return {
            changed: true,
            replacement: `![](/images/${file.basename}/${safeName})`
        };
    }





}
