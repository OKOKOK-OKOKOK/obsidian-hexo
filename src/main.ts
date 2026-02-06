import {Plugin, Notice, TFile, FileSystemAdapter,setIcon,App, Modal} from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';
import {Logger} from './logger';
import {FrontMatterService} from './frontmatter';
import {MarkdownTransformService} from "./markdown-transform-service";
import {AttachmentService} from "./attachment-service";
import { HexoSyncSettings, DEFAULT_SETTINGS } from './settings';
import { HexoSyncSettingTab } from './settings-tab';

interface ResolvedPaths {
    /**
     * 原来ob中的md文件绝对路径
     */
    absoluteSrcPath: string;
    /**
     * 附件最后要去的文件夹
     */
    targetDir: string;
    /**
     * md文件最后要去的路径
     */
    targetFilePath: string;
}

export default class HexoSyncPlugin extends Plugin {

    /**
     * setting 设置相关
     */
    public settings!: HexoSyncSettings;
    private logger!: Logger;
    private attachmentService!: AttachmentService;
    private frontMatter!: FrontMatterService;
    private markdownTransform!: MarkdownTransformService;

    async onload() {

        await this.loadSettings();

        try {
            this.initLogger();
            this.initServices();
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
    async loadSettings(){
        this.settings=Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    /**
     * 将当前设置里的数据保存到 data 里面去
     */
    async saveSettings(){
        await this.saveData(this.settings);
    }

    /**
     * 当设置变更时调用
     */
    refreshBySettings() {
        this.initLogger();
        this.initServices();
    }

    /**
     * 假如把iniLogger放进iniService里面，
     * 功能上可以，但是语义上不好
     */
    /**
     * 初始化 Logger（可随设置动态变）
     */
    private initLogger() {
        const logDir = path.join(
            /**
             * get base Path已经被封装，需要将其他地方的函数也修改，
             * 只有两处使用这个函数，生成logger实例和resolvePath
             * Obsidian 的Plugin基类为每个插件提供了两个核心路径属性，无需手动拼接：
             * this.pluginDir	插件的根目录
             * this.dataPath	插件的 data 目录（自动创建，用于存储插件数据 / 日志）
             * 错误的，上面是ai瞎编的吗，为什么会报错
             * D:\Obsidian\PluginTest\.obsidian\plugins\obsidian-hexo\data
             */
            this.getVaultBasePath(),
            'data',
        );
        this.logger = new Logger(logDir, this.settings.enableDebugLog);
    }

    /**
     * 初始化所有 Service
     *
     */
    private initServices() {
        const attachmentDir = path.join(
            this.settings.obsidianBlogDir,
            this.settings.obsidianAttachmentDirName
        );

        /*
        实例全都给了main ts，所以不会被销毁
         */
        /**
         * fixme 刚刚把第二个参数不小心删掉了，但是构造函数内部有完整信息，所以好像不需要传参，没有报错
         */
        this.attachmentService = new AttachmentService(this.logger,);
        this.frontMatter = new FrontMatterService(this.logger);
        this.markdownTransform = new MarkdownTransformService(this.logger);
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
                this.syncSingleMarkdown(file);
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
                    this.syncSingleMarkdown(file);
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
                this.syncSingleMarkdown(file);
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
            this.logger.info(`[OBS2HEXO] Sync start: ${file.path}`);

            /**
             * 只是起到一个借助该方法检测是否是本地数据库的作用；
             */
            this.getVaultBasePath();

            /**
             * paths接受所有路径
             */
            const paths = this.resolvePaths(file);

            if (!paths) return;

            const rawContent = fs.readFileSync(paths.absoluteSrcPath, 'utf8');


            //===============================fm流程

            //忽略changed字段返回值
            const {content,changed: _} = this.processFrontMatter(file, rawContent);
            this.logger.info(`[FM] FM successfully: ${file.path}`);

            //==============================附件处理

            this.attachmentService.processAttachments(file, content, paths.targetDir);
            this.logger.info(`[AS] Attachment modified: ${file.path}`);

            //==============================语法清洗

            /**
             * todo 这里还可以改成接受单个返回值然后忽略另外一个返回值
             */
            const transformedContent = this.markdownTransform.transform(file,content);
            this.logger.info(`[MD] MarkdownTransformed: ${file.path}`);

            // ========================复制md文件

            this.writeToHexo(paths, transformedContent.content);

            this.logger.info(`[OBS2HEXO] Sync success: ${file.name}`);
            new Notice('Hexo sync OK');

        } catch (error) {
            this.logger.error(
                `[OBS2HEXO] Sync failed for ${file.path}: ${String(error)}`
            );
            new Notice('Hexo sync failed');
        }

    }

    /**
     * 检测是否是本地数据库，并且返回该数据库路径
     * @private
     */
    private getVaultBasePath(): string {
        const adapter = this.app.vault.adapter;

        if (!(adapter instanceof FileSystemAdapter)) {
            throw new Error('Only local vault is supported');
        }

        return adapter.getBasePath();
    }

    /**
     * 纯处理路径
     * @param file
     * @private
     */
    private resolvePaths(file: TFile): ResolvedPaths | null {
        /**
         * ob数据库的位置
         */
        const vaultBasePath = this.getVaultBasePath();

        /**
         *  ob中md文件的绝对路径
         */
        const absoluteSrcPath = path.join(vaultBasePath, file.path);

        // 只同步 Obsidian Blog 目录
        /**
         * fixme starts with windows路径有bug
         */
        if (!absoluteSrcPath.startsWith(this.settings.obsidianBlogDir+path.sep)) {
            this.logger.debug(
                `[OBS2HEXO] Skip non-blog file: ${absoluteSrcPath}`
            );
            return null;
        }

        /** Hexo root */
        const hexoRootDir = path.normalize(
            path.resolve(this.settings.hexoRootDir)
        );

        /** Hexo _posts 目录 */
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
         * 文件名字（无扩展名）
         */
        const fileNameWithoutExt = path.basename(file.name, '.md');

        /** 该 md 对应的附件目录 */
        const targetDir = path.join(
            hexoImageRootDir,
            fileNameWithoutExt
        );

        /** 目标 md 文件路径 */
        const targetFilePath = path.join(
            hexoPostDir,
            file.name
        );

        return {
            absoluteSrcPath,//ob md文件绝对路径
            targetDir,//需要创建的同名文件夹绝对路径
            targetFilePath//md文件最后要去的绝对路径
        }
        /**
         * todo 还可以继续拆分
         * 把这些路径拆成：
         * interface ObsidianPaths {}
         * interface HexoPaths {}
         */
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
        const fmResult = this.frontMatter.ensureAndNormalize(file, rawContent);

        /**
         * 将规范化的fm写入原本的obs 的 md文档中
         */
        if (fmResult.changed) {
            this.app.vault.modify(file, fmResult.content);
            this.logger.info(`[FM] write back to obsidian | ${file.path}`);
        }
        return fmResult;

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
