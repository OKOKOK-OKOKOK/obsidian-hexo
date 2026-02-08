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
    private validateDirectory(
        dir: string,
        desc: string
    ): boolean {
        if (!dir) {
            new Notice(`${desc} 不能为空`);
            return false;
        }

        if (!fs.existsSync(dir)) {
            new Notice(`${desc} 不存在`);
            return false;
        }

        if (!fs.statSync(dir).isDirectory()) {
            new Notice(`${desc} 不是文件夹`);
            return false;
        }

        return true;
    }

}
