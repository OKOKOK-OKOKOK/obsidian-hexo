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
import {HexoRunnerService} from "./services/hexo-runner";
import {ConfirmModal} from "./ui/confirmModal";
import {HexoContentService} from "./services/hexocontent-service";
import {FullMarkdownSyncService} from "./core/fullmarkdown-sync-service";

/**
 * todo 添加日志
 * todo 使用 use case对 main 进行重构
 * todo hexo 的部分， 结构不太对，需要再重构
 */
export default class HexoSyncPlugin extends Plugin {

    /**
     * 单独的工具类
     * @private
     */
    private resolvedPathsService!: ResolvedPathsService;

    /**
     * 单独的logger，日志实例
     */
    private logger!: Logger;

    /**
     * 同步单个md文档
     */
    private syncSingleMarkdownService!: SingleMarkdownSyncService;

    /**
     * 批量同步处理md文档
     */
    private fullMarkdownSyncService!:FullMarkdownSyncService;

    /**
     * setting 设置相关
     */
    public settings!: HexoSyncSettings;

    /**
     * services 的声明
     * @private
     */
    private frontMatter!: FrontMatterService;
    private attachmentService!: AttachmentService;
    private markdownTransform!: MarkdownTransformService;
    private hexoRunnerService!: HexoRunnerService;
    private hexoContentService!:HexoContentService;

    async onload() {

        await this.loadSettings();

        try {
            /**
             * 两个基础组件先初始化
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
        this.hexoRunnerService=new HexoRunnerService(this.settings.hexoRootDir,this.logger);
        this.hexoContentService=new HexoContentService(this.settings.hexoRootDir,this.logger);

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

        this.fullMarkdownSyncService=new FullMarkdownSyncService(
            this.app,
            this.syncSingleMarkdownService,
            this.logger
        )
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
     * question 不设置hotkey的应该是可以在命令界面查看到，但是不会分配默认热键？
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
        /**
         * 打开本地服务器的命令
         */
        this.addCommand({
            id: 'hexo-start-server',
            name: 'Hexo: Start local server',
            callback: () => {
                this.startHexoServer();
            }
        });

        this.addCommand({
            id: 'hexo-stop-server',
            name: 'Hexo: Stop local server',
            callback: () => {
                this.stopHexoServer();
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

        this.registerAutoSyncOnModify();
    }

    private registerAutoSyncOnModify() {
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (!this.isMarkdownFile(file)) return;
                this.handleMarkdownModified(file);
            })
        );
    }

    private isMarkdownFile(file: unknown): file is TFile {
        return file instanceof TFile && file.extension === 'md';
    }

    private handleMarkdownModified(file: TFile) {
        this.logger.info(`[OBS2HEXO] File modified: ${file.path}`);
        this.syncSingleMarkdownService.syncSingleMarkdown(file);
    }

    /**
     * 部署 Hexo 博客
     * clean -> generate -> deploy
     */
    public async deployHexo() {
        this.logger.info('[Hexo] Deploy started');

        await this.hexoRunnerService.run('hexo clean');
        await this.hexoRunnerService.run('hexo generate');
        await this.hexoRunnerService.run('hexo deploy');

        this.logger.info('[Hexo] Deploy finished');
    }

    /**
     * 启动 Hexo 本地预览服务器
     * 等同于执行：hexo server
     *
     * 这是一个长期运行的进程
     */
    public async startHexoServer() {
        this.logger.info('[Hexo] Server starting');

        await this.hexoRunnerService.runServer();

        this.logger.info('[Hexo] Server started');
    }

    /**
     * 停止 Hexo 本地预览服务器
     * 当前版本可能需要用户手动关闭
     * todo 怎么个手动关闭法啊？
     */
    public async stopHexoServer() {
        this.logger.info('[Hexo] Server stop requested');

        await this.hexoRunnerService.stopServer?.();

        this.logger.info('[Hexo] Server stopped');
    }

    /**
     * 清理 Hexo 生成文件
     * 等同于执行：hexo clean
     */
    public async cleanHexo() {
        this.logger.info('[Hexo] Clean started');

        await this.hexoRunnerService.run('hexo clean');

        this.logger.info('[Hexo] Clean finished');
    }

    /**
     * Hexo 本地服务器是否运行中
     */
    public isHexoServerRunning(): boolean {
        return this.hexoRunnerService.isServerRunning();
    }

    /**
     * confirm 用于调用二次确认和取消的ui界面
     * @param title
     * @param message
     */
    public async confirm(title: string, message: string): Promise<boolean> {
        const modal = new ConfirmModal(this.app, title, message);
        return modal.openAndWait();
    }

    /**
     * 从 Obsidian 全量重建 Hexo 内容
     * 1. 备份 Hexo source 目录
     * 2. 清空 _posts / images
     * 3. 重新同步 Obsidian 内容
     */
    public async rebuildHexoFromObsidian() {
        this.logger.info('[Hexo] Full rebuild started');

        await this.hexoContentService.backupHexoSource();
        await this.hexoContentService.clearHexoSource();
        /**
         * 这里是要对所有md文档进行批量转换
         */
        await this.fullMarkdownSyncService.syncAllFromObsidian();

        this.logger.info('[Hexo] Full rebuild finished');
    }



}
