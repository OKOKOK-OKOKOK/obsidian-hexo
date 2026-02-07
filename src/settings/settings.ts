/**
 * 设置的数据是存放在 data.json 里面的
 */
export interface HexoSyncSettings {
    /**
     * 这里面就是配置里面可以设置的属性
     */
    /**
     * Obsidian 中写 Hexo 博客的根目录
     * 'D:\\Obsidian\\PluginTest\\Blog\\attachment'
     */
    obsidianBlogDir: string;

    /**
     * Hexo 项目根目录
     * 'F:\Blog\hexo-blog'
     */
    hexoRootDir: string;

    /**
     * Obsidian 附件目录名（相对于 obsidianBlogDir）
     * 'attachment'
     */
    obsidianAttachmentDirName: string;

    /** 是否启用 Debug 日志 */
    enableDebugLog: boolean;
}

/**
 * 用于设置的默认配置，兜底用
 */
export const DEFAULT_SETTINGS: HexoSyncSettings = {
    obsidianBlogDir: '',
    hexoRootDir: '',
    obsidianAttachmentDirName: 'attachment',
    enableDebugLog: true,
};
