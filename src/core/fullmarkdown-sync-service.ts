import { App, TFile } from 'obsidian';
import { Logger } from '../services/logger';
import { SingleMarkdownSyncService } from './hexo-sync-service';

export class FullMarkdownSyncService {

    constructor(
        private app: App,
        private singleSyncService: SingleMarkdownSyncService,
        private logger: Logger
    ) {}

    /**
     * 全量同步 Obsidian 中的 Markdown 到 Hexo
     * question Promise 有什么用
     */
    public async syncAllFromObsidian(): Promise<void> {
        this.logger.info('[OBS2HEXO] Full sync started');

        const files = this.collectMarkdownFiles();

        this.logger.info(
            `[OBS2HEXO] Found ${files.length} markdown files`
        );

        for (const file of files) {
            try {
                this.singleSyncService.syncSingleMarkdown(file);
            } catch (e) {
                this.logger.error(
                    `[OBS2HEXO] Failed: ${file.path}`
                );
            }
        }

        this.logger.info('[OBS2HEXO] Full sync finished');
    }

    /**
     * 收集 Obsidian 中所有 md 文件
     */
    private collectMarkdownFiles(): TFile[] {
        return this.app.vault
            .getMarkdownFiles()
            .filter(file => !file.path.startsWith('.obsidian/'));
    }
}
