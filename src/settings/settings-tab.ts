import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import HexoSyncPlugin from '../main';
import * as path from 'path';
import * as fs from 'fs';

/**
 * SettingTab 的职责只有三个
 *
 * 画 UI
 * 读写 plugin.settings
 * 触发 saveSettings
 *
 * 这里面的异常直接用 Notice 报告给用户即可
 */
export class HexoSyncSettingTab extends PluginSettingTab {

    plugin: HexoSyncPlugin;

    constructor(app: App, plugin: HexoSyncPlugin) {
        /**
         * learn 看一下这里的super用法的讲解
         */
        super(app, plugin);
        this.plugin = plugin;
    }

    public display(): void {
        const { containerEl } = this;
        containerEl.empty();
        /**
         * 用于展示当前使用的ob博客内容文件夹路径
         * .setName('Obsidian 博客目录')
         * .setDesc(currentObsBlogDir
         *      ? `你在 Obsidian 中存放 Hexo 博客 Markdown 的根目录\n当前路径：${currentObsBlogDir}`
         *      : '你在 Obsidian 中存放 Hexo 博客 Markdown 的根目录（尚未设置）'
         */
        const currentObsBlogDir = this.plugin.settings.obsidianBlogDir;

        /**
         * 
         */
        const currentHexoRootDir=this.plugin.settings.hexoRootDir;

        /**
         *
         */
        const currentObsidianAttachmentDirName=this.plugin.settings.obsidianAttachmentDirName
        /* ===========================
         * 基础路径设置
         * =========================== */

        /**
         * todo setPlaceholder('attachment')这一部分读取上一次保存的信息，从而容易差错
         * todo 对于读取信息进行检验
         */
        new Setting(containerEl)
            .setName('Obsidian 博客目录')
            .setDesc(currentObsBlogDir
                ? `你在 Obsidian 中存放 Hexo 博客 Markdown 的根目录\n当前路径：\n${currentObsBlogDir}`
                : '你在 Obsidian 中存放 Hexo 博客 Markdown 的根目录（尚未设置）'
            )
            .addText(text =>
                text
                    .setPlaceholder('D:\\Obsidian\\PluginTest\\Blog')
                    .setValue(this.plugin.settings.obsidianBlogDir)
                    .onChange(async value => {
                        this.plugin.settings.obsidianBlogDir = value.trim();
                        await this.plugin.saveSettings();
                        this.plugin.refreshBySettings();
                    }))
            .addButton(button =>{
                button
                    .setButtonText('浏览文件夹')
                    .onClick(async () => {
                        const { dialog } = (window as any).require('electron').remote;

                        const result = await dialog.showOpenDialog({
                            properties: ['openDirectory']
                        });

                        if (!result.canceled && result.filePaths.length > 0) {
                            const selectedPath = result.filePaths[0];

                            this.plugin.settings.obsidianBlogDir =
                                path.normalize(selectedPath);

                            await this.plugin.saveSettings();
                            this.plugin.refreshBySettings();
                            this.display();
                        }
                    })

            })

        new Setting(containerEl)
            .setName('Hexo 项目根目录')
            .setDesc(currentHexoRootDir
            ?`当前使用的Hexo 项目根目录是 \n${currentHexoRootDir}`
            :'你在 Hexo 博客根目录（尚未设置）'
            )
            .addText(text =>
                text
                    .setPlaceholder('F:\\Blog\\hexo-blog')
                    .setValue(this.plugin.settings.hexoRootDir)
                    .onChange(async value => {
                        this.plugin.settings.hexoRootDir = value.trim();
                        /**
                         * 直接加一步顺手自动检验hexo目录是否正确
                         */
                        if (!this.checkHexoStructure()) {
                            return;
                        }
                        await this.plugin.saveSettings();
                        this.plugin.refreshBySettings();
                    })
            )
            .addButton(button => {
                button
                    .setButtonText('浏览文件夹')
                    .onClick(async () => {
                        const electron = (window as any).require?.('electron');
                        if (!electron?.remote?.dialog) {
                            new Notice('当前平台不支持选择本地目录');
                            return;
                        }

                        const { dialog } = electron.remote;

                        const result = await dialog.showOpenDialog({
                            properties: ['openDirectory']
                        });

                        if (!result.canceled && result.filePaths.length > 0) {
                            this.plugin.settings.hexoRootDir  = path.normalize(result.filePaths[0]);
                            await this.plugin.saveSettings();
                            this.plugin.refreshBySettings();
                            this.display();
                        }
                    });
            })


        /* ===========================
         * 附件设置
         * =========================== */

        new Setting(containerEl)
            .setName('附件目录名')
            .setDesc(currentObsidianAttachmentDirName
            ?`当前使用的附件目录名 \n${currentObsidianAttachmentDirName}`
            :'你为存放附件的文件夹命名(尚未命名)')
            .addText(text =>
                text
                    .setPlaceholder('attachment')
                    .setValue(this.plugin.settings.obsidianAttachmentDirName)
                    /**
                     * onChange 这一步实际上obs内部已经自动完成变化，然后再传出了继续函数
                     */
                    .onChange(async value => {
                        this.plugin.settings.obsidianAttachmentDirName = value.trim();
                        await this.plugin.saveSettings();
                        this.plugin.refreshBySettings();
                    })
            );

        /* ===========================
         * 日志设置
         * =========================== */

        new Setting(containerEl)
            .setName('启用 Debug 日志')
            .setDesc('开启后会在本地写入调试日志')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.enableDebugLog)
                    .onChange(async value => {
                        this.plugin.settings.enableDebugLog = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshBySettings();
                    })
            );

        /* ===========================
         * 工具 / 校验
         * =========================== */

        new Setting(containerEl)
            .setName('校验 Hexo 目录结构')
            .setDesc('检查 _posts 和 source/images 是否存在')
            .addButton(button =>
                button
                    .setButtonText('检查')
                    .onClick(() => {
                        this.checkHexoStructure();
                    })
            );

        new Setting(containerEl)
            .setHeading()
            .setName('Hexo 操作（高级）')
            .setDesc('以下操作会直接影响 Hexo 项目文件，请谨慎使用');

        /**
         * 本地预览博客
         */
        new Setting(containerEl)
            .setName('本地预览博客')
            .setDesc(
                '在 Hexo 项目根目录中启动本地预览服务器\n' +
                '等同于执行：hexo server\n\n' +
                '这是一个阻塞进程，请手动关闭终端或停止服务'
            )
            .addButton(button =>
                button
                    .setButtonText('启动预览')
                    .onClick(async () => {
                        // 基础校验
                        const hexoRoot = this.plugin.settings.hexoRootDir;
                        if (!hexoRoot) {
                            new Notice('请先配置 Hexo 项目根目录');
                            return;
                        }

                        const confirmed = await this.plugin.confirm(
                            '启动 Hexo 本地预览？',
                            '这将运行 hexo server，并占用一个本地端口'
                        );
                        if (!confirmed) return;

                        try {
                            await this.plugin.startHexoServer();
                            new Notice('Hexo server 已启动');
                        } catch (e) {
                            new Notice('启动 Hexo server 失败，请查看日志');
                        }
                    })
            );

        /**
         * 清理hexo生成文件
         * 调用hexo clean
         */
        new Setting(containerEl)
            .setName('清理 Hexo 生成文件')
            .setDesc(
                '执行 hexo clean\n' +
                '会删除 public 目录和缓存文件\n' +
                '不会影响 Markdown'
            )
            .addButton(button =>
                button
                    .setButtonText('执行 clean')
                    .setWarning()
                    .onClick(async () => {
                        /**
                         * 这个confirm 是该在main里面写还是ui文件里面写
                         */
                        const confirmed = await this.plugin.confirm(
                            '确认执行 hexo clean？',
                            '该操作会删除 public 目录'
                        );
                        if (!confirmed) return;

                        try {
                            await this.plugin.deployHexo();
                            new Notice('Hexo 部署完成');
                        } catch {
                            new Notice('Hexo 部署失败，请查看日志');
                        }
                    })
            );


        /**
         * 部署博客
         * 调用 hexo deploy
         */
        new Setting(containerEl)
            .setName('生成并部署博客')
            .setDesc(
                '将按顺序执行：\n' +
                '1. hexo clean\n' +
                '2. hexo generate\n' +
                '3. hexo deploy\n\n' +
                '会清空 public 目录，但不会影响 Markdown'
            )
            .addButton(button =>
                button
                    .setButtonText('部署')
                    .setWarning()
                    .onClick(async () => {
                        // 二次确认
                        const confirmed = await this.plugin.confirm(
                            '确认部署博客？',
                            '这将执行 hexo clean + generate + deploy'
                        );
                        if (!confirmed) return;

                        try {
                            await this.plugin.deployHexo();
                            new Notice('Hexo 部署完成');
                        } catch {
                            new Notice('Hexo 部署失败，请查看日志');
                        }
                    })
            );
    }

    /**
     * 检查hexo目录和文件夹完整性
     * @private
     */
    private checkHexoStructure() :boolean{
        const root = this.plugin.settings.hexoRootDir;

        if (!root) {
            new Notice('请先填写 Hexo 项目根目录');
            return false;
        }

        const posts = path.join(root, 'source', '_posts');
        const images = path.join(root, 'source', 'images');

        if (!fs.existsSync(posts)) {
            new Notice('未找到 source/_posts');
            return false;
        }

        if (!fs.existsSync(images)) {
            new Notice('未找到 source/images');
            return false;
        }

        new Notice('Hexo 目录结构正常');
        return true;
    }

    /**
     * 初步检验输入是否合法
     * @param dir
     * @param desc
     * @private
     * todo 这个函数还没用起来
     */
    // private validateDirectory(
    //     dir: string,
    //     desc: string
    // ): boolean {
    //     if (!dir) {
    //         new Notice(`${desc} 不能为空`);
    //         return false;
    //     }
    //
    //     if (!fs.existsSync(dir)) {
    //         new Notice(`${desc} 不存在`);
    //         return false;
    //     }
    //
    //     if (!fs.statSync(dir).isDirectory()) {
    //         new Notice(`${desc} 不是文件夹`);
    //         return false;
    //     }
    //
    //     return true;
    // }

}
