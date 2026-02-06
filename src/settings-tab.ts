import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import HexoSyncPlugin from './main';
import * as path from 'path';
import * as fs from 'fs';


/**
 * SettingTab 的职责只有三个
 *
 * 画 UI
 * 读写 plugin.settings
 * 触发 saveSettings
 */
/**
 * fixme 这里要不要打日志？
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

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        /**
         * todo 关于路径设置,应该还可以添加打开文件管理器读取路径的功能
         */
        /* ===========================
         * 基础路径设置
         * =========================== */

        new Setting(containerEl)
            .setName('Obsidian 博客目录')
            .setDesc('你在 Obsidian 中存放 Hexo 博客 Markdown 的根目录')
            .addText(text =>
                text
                    .setPlaceholder('D:\\Obsidian\\PluginTest\\Blog')
                    .setValue(this.plugin.settings.obsidianBlogDir)
                    .onChange(async value => {
                        this.plugin.settings.obsidianBlogDir = value.trim();
                        await this.plugin.saveSettings();
                        this.plugin.refreshBySettings();
                    })
            );

        new Setting(containerEl)
            .setName('Hexo 项目根目录')
            .setDesc('包含 source、_config.yml 等文件的 Hexo 根目录')
            .addText(text =>
                text
                    .setPlaceholder('F:\\Blog\\hexo-blog')
                    .setValue(this.plugin.settings.hexoRootDir)
                    .onChange(async value => {
                        this.plugin.settings.hexoRootDir = value.trim();
                        await this.plugin.saveSettings();
                        this.plugin.refreshBySettings();
                    })
            );

        /* ===========================
         * 附件设置
         * =========================== */

        new Setting(containerEl)
            .setName('附件目录名')
            .setDesc('相对于 Obsidian 博客目录的附件文件夹名称')
            .addText(text =>
                text
                    .setPlaceholder('attachment')
                    .setValue(this.plugin.settings.obsidianAttachmentDirName)
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
    private checkHexoStructure() {
        const root = this.plugin.settings.hexoRootDir;

        if (!root) {
            new Notice('请先填写 Hexo 项目根目录');
            return;
        }

        const posts = path.join(root, 'source', '_posts');
        const images = path.join(root, 'source', 'images');

        if (!fs.existsSync(posts)) {
            new Notice('未找到 source/_posts');
            return;
        }

        if (!fs.existsSync(images)) {
            new Notice('未找到 source/images');
            return;
        }

        new Notice('Hexo 目录结构正常');
    }
}
