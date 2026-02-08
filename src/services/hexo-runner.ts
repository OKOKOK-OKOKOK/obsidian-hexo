import { exec, spawn, ChildProcessWithoutNullStreams } from 'child_process';

export class HexoRunnerService {

    private serverProcess: ChildProcessWithoutNullStreams | null = null;

    constructor(
        private hexoRootDir: string,
        private logger?: any
    ) {}

    public run(command: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(
                command,
                { cwd: this.hexoRootDir },
                (error, stdout, stderr) => {
                    if (stdout) this.logger?.info(stdout);
                    if (stderr) this.logger?.warn(stderr);

                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * 启动 Hexo 本地服务器
     * 等同于：hexo server
     */
    public async runServer(): Promise<void> {
        if (this.serverProcess) {
            this.logger?.warn('[Hexo] Server already running');
            return;
        }

        this.logger?.info('[Hexo] Starting hexo server...');

        this.serverProcess = spawn(
            'hexo',
            ['server'],
            {
                cwd: this.hexoRootDir,
                shell: true,          // Windows 必须
                stdio: 'pipe'
            }
        );

        this.serverProcess.stdout.on('data', (data) => {
            this.logger?.info(`[hexo server] ${data.toString()}`);
        });

        this.serverProcess.stderr.on('data', (data) => {
            this.logger?.warn(`[hexo server] ${data.toString()}`);
        });

        this.serverProcess.on('close', (code) => {
            this.logger?.info(`[Hexo] Server stopped (code=${code})`);
            this.serverProcess = null;
        });
    }

    /**
     * 停止 Hexo 本地服务器
     */
    public async stopServer(): Promise<void> {
        if (!this.serverProcess) {
            this.logger?.warn('[Hexo] No running server to stop');
            return;
        }

        this.logger?.info('[Hexo] Stopping hexo server...');
        this.serverProcess.kill();
        this.serverProcess = null;
    }
}
