import * as fs from 'fs';
import * as path from 'path';
import {Logger} from "./logger";

export class HexoContentService {

    constructor(
        private hexoRootDir: string,
        private logger?: Logger,
    ) {}

    /* ===========================
     * 路径工具
     * =========================== */

    private get postsDir(): string {
        return path.join(this.hexoRootDir, 'source', '_posts');
    }

    private get imagesDir(): string {
        return path.join(this.hexoRootDir, 'source', 'images');
    }

    private get backupRootDir(): string {
        return path.join(this.hexoRootDir, '.hexo-sync-backup');
    }

    /* ===========================
     * 校验
     * =========================== */

    /**
     * 确保 Hexo source 目录结构存在
     * 不存在则抛异常
     */
    public ensureHexoSourceStructure(): void {
        if (!fs.existsSync(this.postsDir)) {
            throw new Error('Hexo source/_posts 不存在');
        }

        if (!fs.existsSync(this.imagesDir)) {
            throw new Error('Hexo source/images 不存在');
        }
    }

    /* ===========================
     * 备份
     * =========================== */

    /**
     * 备份 source/_posts 和 source/images
     * @returns 本次备份目录路径
     */
    public backupHexoSource(): string {
        this.ensureHexoSourceStructure();

        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-');

        const backupDir = path.join(this.backupRootDir, timestamp);

        fs.mkdirSync(backupDir, { recursive: true });

        fs.cpSync(
            this.postsDir,
            path.join(backupDir, '_posts'),
            { recursive: true }
        );

        fs.cpSync(
            this.imagesDir,
            path.join(backupDir, 'images'),
            { recursive: true }
        );

        this.logger?.info(
            `[HexoBackup] source backed up to ${backupDir}`
        );

        return backupDir;
    }

    /* ===========================
     * 清空
     * =========================== */

    /**
     * 清空 Hexo source 内容
     * 仅限 _posts 和 images
     */
    public clearHexoSource(): void {
        this.ensureHexoSourceStructure();

        this.safeRemoveDir(this.postsDir);
        this.safeRemoveDir(this.imagesDir);

        fs.mkdirSync(this.postsDir, { recursive: true });
        fs.mkdirSync(this.imagesDir, { recursive: true });

        this.logger?.warn(
            '[HexoClean] source/_posts and source/images cleared'
        );
    }

    /**
     * 安全删除目录
     * 防止误删 hexoRootDir
     */
    private safeRemoveDir(dir: string): void {
        if (!dir.startsWith(this.hexoRootDir)) {
            throw new Error(`拒绝删除非 Hexo 目录: ${dir}`);
        }

        fs.rmSync(dir, {
            recursive: true,
            force: true
        });
    }

    /* ===========================
     * 高级组合操作
     * =========================== */

    /**
     * 全量重建准备
     * 备份 + 清空
     */
    public prepareForFullRebuild(): string {
        this.logger?.info('[Hexo] Preparing full rebuild');

        const backupPath = this.backupHexoSource();
        this.clearHexoSource();

        return backupPath;
    }

    /* ===========================
     * 诊断 / dry-run
     * =========================== */

    /**
     * 列出即将被删除的文件（不执行删除）
     * 用于调试或未来 dry-run
     */
    public listFilesToBeDeleted(): {
        posts: string[];
        images: string[];
    } {
        return {
            posts: this.listFilesRecursively(this.postsDir),
            images: this.listFilesRecursively(this.imagesDir)
        };
    }

    private listFilesRecursively(dir: string): string[] {
        if (!fs.existsSync(dir)) return [];

        const result: string[] = [];

        for (const entry of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                result.push(...this.listFilesRecursively(fullPath));
            } else {
                result.push(fullPath);
            }
        }

        return result;
    }
}
