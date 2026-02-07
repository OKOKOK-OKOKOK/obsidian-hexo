import {Plugin, Notice, TFile} from 'obsidian';
import * as path from 'path';
import {Logger} from './services/logger';
import {FrontMatterService} from './services/frontmatter-service';
import {MarkdownTransformService} from "./services/markdown-transform-service";
import {AttachmentService} from "./services/attachment-service";
import {HexoSyncSettings, DEFAULT_SETTINGS} from './settings/settings';
import {HexoSyncSettingTab} from './settings/settings-tab';
import {SingleMarkdownSyncService} from "./core/hexo-sync-service";
import {ResolvedPathsService} from "./utils/path-utils";

/**
 * todo 添加日志
 */
export default class HexoSyncPlugin extends Plugin {

    /**
     * 单独的工具类
     * @private
     */
    private resolvedPathsService!: ResolvedPathsService;

    /**
     * 单独的logger
     */
    private logger!: Logger;

    /**
     * setting 设置相关
     */
    private syncSingleMarkdownService!: SingleMarkdownSyncService;

    public settings!: HexoSyncSettings;


    /**
     * services 的声明
     * @private
     */
    private frontMatter!: FrontMatterService;
    private attachmentService!: AttachmentService;
    private markdownTransform!: MarkdownTransformService;

    async onload() {

        await this.loadSettings();

        try {
            /**
             * 两个基础组件首先初始化
             */
            this.initUtils();
            this.initLogger();

            /**
             * 服务实例后初始化
             */
            this.initServices();
            this.initCore()
            this.initOtherServices();

            this.addSettingTab(new HexoSyncSettingTab(this.app, this));
            this.registerCommands();
            this.registerEvents();

            new Notice('Hexo Sync Plugin loaded');

        } catch (err) {
            console.error('Plugin load failed:', err);
        }

    }

    /**
     * 加载 data 里面保存的设置相关的数据
     */
    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    /**
     * 将当前设置里的数据保存到 data 里面去
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * 当设置变更时调用
     *
     * 职责：
     * 1. 应用 logger 的运行时配置
     * 2. 重建依赖 settings 的服务
     *
     * 不负责：
     * - new Logger
     * - 异常提示（由 SettingTab 负责）
     */
    refreshBySettings() {
        if (!this.settings) return;

        // 应用 Debug 开关（运行时可变）
        if (this.logger) {
            this.logger.setDebugEnabled(this.settings.enableDebugLog);
            this.logger.info(
                `[Settings] refreshed, debug=${this.settings.enableDebugLog}`
            );
        }

        // 重建依赖 settings 的服务
        this.initServices();

    }


    /**
     * 初始化工具类，必须在logger之前，因为里面用到了路径工具
     * @private
     */
    private initUtils(){
        /**
         * question 为什么setting明明是后挂依赖的，但是没有报错
         */
        this.resolvedPathsService = new ResolvedPathsService(this.app,this.settings)
    }

    /**
     * 假如把iniLogger放进iniService里面，
     * 功能上可以，但是语义上不好
     */
    /**
     * 初始化 Logger（可随设置动态变）
     */
    private initLogger() {
        /**
         * logger文件的位置
         */
        const logDir = path.join(
            /**
             * 路径应该是D:\Obsidian\PluginTest\.obsidian\plugins\obsidian-hexo\data
             */
            this.resolvedPathsService.getVaultBasePath(),
            '.obsidian',
            'plugins' ,
            'obsidian-hexo',
            'data',
        );
        this.logger = new Logger(logDir, this.settings.enableDebugLog);
    }

    /**
     * 初始化基础 Service
     *
     */
    private initServices() {
        this.frontMatter = new FrontMatterService(this.logger);
        this.attachmentService = new AttachmentService(this.logger,);
        this.markdownTransform = new MarkdownTransformService(this.logger);

    }

    /**
     * 初始化 core 的服务
     * 目前只有同步md的功能，以后还可以继续加功能
     * @private
     */
    private initCore(){
        this.syncSingleMarkdownService =new SingleMarkdownSyncService(
            this.logger,
            this.frontMatter,
            this.attachmentService,
            this.markdownTransform,
            this.resolvedPathsService)
    }

    /**
     * 注册图标
     * @private
     * question 没用的图标，以后再用
     */
    private initOtherServices() {
        // Ribbon 图标
        this.addRibbonIcon('refresh-cw', 'Hexo Sync: Sync current file', () => {
            const file = this.app.workspace.getActiveFile();
            if (file && file.extension === 'md') {
                this.syncSingleMarkdownService.syncSingleMarkdown(file);
            } else {
                new Notice('No active markdown file');
            }
        });
    }

    /**
     * 注册命令
     * @private
     * question 后续添加命令,如果没有 hotkey 应该怎么触发命令
     */
    private registerCommands() {

        /** 手动同步当前文件 */
        this.addCommand({
            id: 'hexo-sync-current-file',
            name: 'Hexo Sync: Sync current file',
            editorCallback: () => {
                const file = this.app.workspace.getActiveFile();
                if (file && file.extension === 'md') {
                    this.syncSingleMarkdownService.syncSingleMarkdown(file);
                } else {
                    new Notice('No active markdown file');
                }
            }
        });

        /** 打开 Hexo 根目录 */
        this.addCommand({
            id: 'hexo-open-root',
            name: 'Hexo Sync: Open Hexo root directory',
            callback: () => {
                const hexoRoot = this.settings.hexoRootDir;
                if (!hexoRoot) {
                    new Notice('Hexo root directory not configured');
                    return;
                }
                // 核心修改：用类型断言绕过TS检查
                /**
                 * learn 类型断言跳过检测
                 */
                (this.app as any).openWithDefaultApp(hexoRoot);
            }
        });
    }

    /**
     * 注册事件，监听，防止内存泄漏；
     * 当插件被卸载 / 禁用时，Obsidian 会自动取消通过registerEvent注册的所有监听，避免内存泄漏，
     * 如果直接用this.app.vault.on而不手动off，插件卸载后监听仍会存在，导致内存泄漏；
     * @private
     */
    private registerEvents() {

        // 文件保存时自动同步
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (!(file instanceof TFile)) return;
                if (file.extension !== 'md') return;

                this.logger.info(`[OBS2HEXO] File modified: ${file.path}`);
                this.syncSingleMarkdownService.syncSingleMarkdown(file);
            })
        );

    }

    /**
     * 同步 md 文件
     * @deprecated 应该使用core里面的同步函数
     * learn 学习更多类似注解
     */

}
