import {App, FileSystemAdapter, TFile} from "obsidian";
import path from "path";
import {HexoSyncSettings} from "../settings/settings";

export interface ResolvedPaths {
    /**
     * 原来ob中的md文件绝对路径
     */
    absoluteSrcPath: string;
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
     * 创建了实例之后就可以在其他类里面使用这里面的public方法
     *
     * learn 不能依赖logger，否则会形成循环依赖，工具只能是单纯的工具，可以用throw处理意外
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
        /**
         * 当前ob数据库的位置
         */
        const vaultBasePath = this.getVaultBasePath();

        /**
         *  ob中md文件的绝对路径
         */
        const absoluteSrcPath = path.join(vaultBasePath, file.path);

        // 只同步 Obsidian Blog 目录
        /**
         * learn starts with windows路径可能有bug,windows路径容易出bug
         */
        // 如果是 blogDir 内的文件：
        // relative 不以 '..' 开头，也不是绝对路径
        /**
         * todo 先关了再试试
         */
        // const relative = path.relative(this.settings.obsidianBlogDir, absoluteSrcPath);
        // if (relative.startsWith('..') || path.isAbsolute(relative)) {
        //     throw new Error(
        //         `[OBS2HEXO] Skip non-blog file: ${absoluteSrcPath}`
        //     );
        // }

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

        /** 该 md 对应的附件目录 */
        const targetAttachmentDir = path.join(
            hexoImageRootDir,
            fileNameWithoutExt
        );

        /** 目标 md 文件路径 */
        const targetMarkdownFilePath = path.join(
            hexoPostDir,
            file.name
        );

        return {
            absoluteSrcPath,//ob md文件绝对路径
            targetAttachmentDir,//需要创建的同名文件夹绝对路径
            targetMarkdownFilePath//md文件最后要去的绝对路径
        }
    }


    public getVaultBasePath(): string {
        const adapter = this.app.vault.adapter;

        if (!(adapter instanceof FileSystemAdapter)) {
            throw new Error('Only local vault is supported');
        }

        return adapter.getBasePath();
    }
}