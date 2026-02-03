import { Plugin, Notice, TFile, FileSystemAdapter } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { FrontMatterService } from './frontmatter';


export default class HexoSyncPlugin extends Plugin {

  /**
   * Obsidian 中写博客的目录
   */
  private OBSIDIAN_BLOG_DIR = 'D:\\Obsidian\\PluginTest\\Blog';

  /**
   * Hexo 的 _posts 目录
   */
  private HEXO_POST_DIR = 'F:\\Blog\\hexo-blog\\source\\_posts';

  /**
   * 声明logger
   */
  private logger!: Logger;

  /**
   * 声明前文
   */
  private frontMatter!: FrontMatterService;

  async onload() {

    try {
      const adapter = this.app.vault.adapter;

      if (adapter instanceof FileSystemAdapter) {
        /**
         * 插件数据目录,实际上就是log文件位置
         */
        const pluginDataDir = path.join(
          adapter.getBasePath(),
          '.obsidian',
          'plugins',
          'obsidian-hexo',
          'data'
        );

        this.logger = new Logger(pluginDataDir);
        /**
         * 需要先初始化logger再初始化fm，不然报错
         */
        this.frontMatter = new FrontMatterService(this.logger);

        this.logger.log('[INFO] Plugin loaded');
      }

      new Notice('Hexo Sync Plugin loaded');
    } catch (err) {
      console.error('Plugin load failed:', err);
    }

    // 监听文件保存（modify）
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.logger.log(`[INFO] File modified: ${file.path}`);
          this.syncSingleMarkdown(file);
        }
      })
    );

  }

  /**
   * 纯处理路径
   * @param file
   * @private
   */
  private resolvePaths(file: TFile): ResolvedPaths | null  {/**
   * 同步开始
   */
  this.logger.log(`[INFO] Sync start: ${file.path}`);

    const adapter = this.app.vault.adapter;

    if (!(adapter instanceof FileSystemAdapter)) {
      new Notice('Hexo Sync only supports local vaults');
      return null;
    }
    /**
     * ob数据库的位置
     */
    const vaultBasePath = adapter.getBasePath();

    /**
     *  ob中md文件的绝对路径
     */
    const absoluteSrcPath = path.join(vaultBasePath, file.path);

    // 只同步 Obsidian Blog 目录
    if (!absoluteSrcPath.startsWith(this.OBSIDIAN_BLOG_DIR)) {
      this.logger.log(
          `[INFO] Skip non-blog file: ${absoluteSrcPath}`
      );
      return null;
    }

    /**
     * 文件名字（无扩展名）
     */
    const fileNameWithoutExt = path.basename(file.name, '.md');

    /**
     * 需要创建的同名目标文件夹
     */
    const targetDir = path.join(
        this.HEXO_POST_DIR,
        fileNameWithoutExt
    );

    /**
     * md需要去的文件路径
     */
    const targetFilePath = path.join(
        this.HEXO_POST_DIR,
        file.name
    );
    return {
      absoluteSrcPath,//ob md文件绝对路径
      targetDir,//需要创建的同名文件夹绝对路径
      targetFilePath//md文件最后要去的绝对路径
    }
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
  ): { content: string; changed: boolean }{
    /**
     * 解析并规范化Front Matter
     */
    const result =this.frontMatter.ensureAndNormalize(file, rawContent);

    /**
     * 将fm是否改变 写入日志
     */
    this.logger.log(
        result.changed
            ? `[INFO] Front Matter updated: ${file.name}`
            : `[INFO] Front Matter unchanged: ${file.name}`
    );
    return result;

  }
  /**
   * 同步 md 文件
   */
  private syncSingleMarkdown(file: TFile) {

    try {
      /**
       * 同步开始
       */
      this.logger.log(`[INFO] Sync start: ${file.path}`);

      const adapter = this.app.vault.adapter;

      if (!(adapter instanceof FileSystemAdapter)) {
        new Notice('Hexo Sync only supports local vaults');
        return;
      }

//===========================查找数据库，文件路径

//===============================fm流程
      /**
       * 读取md文件内容
       * 几个函数都需要这个数据，所以不单独放在一个函数里面
       */
      const rawContent = fs.readFileSync(absoluteSrcPath, 'utf-8');

//==============================创建同名文件夹

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        this.logger.log(
            `[INFO] Created post directory: ${targetDir}`
        );
      }

      new Notice(`tips:${this.HEXO_POST_DIR}`);

//=================================复制md文件
      /**
       * 写入md文件内容
       */
      fs.writeFileSync(targetFilePath, result.content, 'utf-8');

      /**
       * 同步成功写入日志
       */
      this.logger.log(
        `[INFO] Sync success: ${file.name}`
      );

      /**
       * 同步成功提示
       */
      new Notice('Hexo sync  OK');
    } catch (error) {
      this.logger.log(
        `[ERROR] Sync failed for ${file.path}: ${String(error)}`
      );
      new Notice('Hexo sync failed');
    }
  }

}
