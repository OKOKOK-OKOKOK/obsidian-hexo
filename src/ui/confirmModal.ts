import { App, Modal, Setting } from 'obsidian';

/**
 * 创建确认取消的 ui 框，脱离设置界面的纯 ui 部分
 */
export class ConfirmModal extends Modal {
    private resolve!: (value: boolean) => void;

    constructor(
        app: App,
        private titleText: string,
        private message: string
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h3', { text: this.titleText });
        contentEl.createEl('p', { text: this.message });

        new Setting(contentEl)
            .addButton(btn =>
                btn
                    .setButtonText('取消')
                    .onClick(() => {
                        this.close();
                        this.resolve(false);
                    })
            )
            .addButton(btn =>
                btn
                    .setButtonText('确认')
                    .setWarning()
                    .onClick(() => {
                        this.close();
                        this.resolve(true);
                    })
            );
    }

    onClose() {
        this.contentEl.empty();
    }

    public openAndWait(): Promise<boolean> {
        return new Promise(resolve => {
            this.resolve = resolve;
            this.open();
        });
    }
}
