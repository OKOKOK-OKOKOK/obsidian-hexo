import {App, FileSystemAdapter, TFile} from "obsidian";
import path from "path";
import {HexoSyncSettings} from "../settings/settings";

export interface ResolvedPaths {
    /**
     * 原来ob中的md文件绝对路径
     */
    absoluteSrcPath: string;
    /**
     * 原本ob中的附件文件夹绝对路径
     */
    absoluteAttachmentPath: string;
    /**
     * 附件最后要去的文件夹
     */
    targetAttachmentDir: string;
    /**
     * md文件最后要去的路径
     */
    targetMarkdownFilePath: string;
}

/**
 * 工具是给服务用的，不能给logger用，
 * logger必须不依赖任何其他服务
 */
export class ResolvedPathsService {

    /**
     * constructor是创建实例时需要的各种参数，
     * 创建了实例之后就可以在其他类里面使用这里面的public方
     * Logger
     *   ↑
     *   │ uses
     *   │
     * ResolvedPathsService
     *   ↑
     *   │ constructed by
     *   │
     * HexoSyncPlugin
     *
     * @param app
     * @param settings
     */
    constructor(
        private app:App,
        private settings:HexoSyncSettings,
    ) {}

    public resolvedPaths(file:TFile): ResolvedPaths|null {

        const resolvedPaths = {
            absoluteSrcPath: '...',//ob md文件绝对路径
            absoluteAttachmentPath: '...',//ob 附件文件夹的绝对路径
            targetAttachmentDir: '...',//需要创建的同名文件夹绝对路径
            targetMarkdownFilePath: '...'//md文件最后要去的绝对路径
        };

        /**
         * 当前ob数据库的位置
         */
        const vaultBasePath = this.getVaultBasePath();

        /**
         * Hexo root
         *
         */
        const hexoRootDir = path.normalize(
            path.resolve(this.settings.hexoRootDir)
        );

        /**
         * Hexo _posts目录
         */
        const hexoPostDir = path.join(
            hexoRootDir,
            'source',
            '_posts'
        );

        /** Hexo images 目录 */
        const hexoImageRootDir = path.join(
            hexoRootDir,
            'source',
            'images'
        );

        /**
         * 文件名字（无扩展名）用于创建同名的附件文件夹
         */
        const fileNameWithoutExt = path.basename(file.name, '.md');

        /**
         *  ob中md文件的绝对路径
         */
        resolvedPaths.absoluteSrcPath = path.join(vaultBasePath, file.path);

        /**
         * Obsidian 中附件目录绝对路径
         * 规则：附件文件夹与 md 文件同级
         */
        resolvedPaths.absoluteAttachmentPath = path.join(
            vaultBasePath,
            path.dirname(file.path),
            this.settings.obsidianAttachmentDirName
        );
        /** 该 md 对应的附件目录 */
        resolvedPaths.targetAttachmentDir = path.join(
            hexoImageRootDir,
            fileNameWithoutExt
        );

        /** 目标 md 文件路径 */
        resolvedPaths.targetMarkdownFilePath = path.join(
            hexoPostDir,
            file.name
        );

        return resolvedPaths;

    }

    public getVaultBasePath(): string {
        const adapter = this.app.vault.adapter;

        if (!(adapter instanceof FileSystemAdapter)) {
            throw new Error('Only local vault is supported');
        }

        return adapter.getBasePath();
    }
}