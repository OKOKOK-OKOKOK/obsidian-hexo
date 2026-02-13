import { exec, spawn, ChildProcessWithoutNullStreams } from 'child_process';

export class HexoRunnerService {

    private serverProcess: ChildProcessWithoutNullStreams | null = null;

    /**
     * 增加一个状态量，因为setTimeOut是延时的回调函数
     * @private
     */
    private stopping = false;


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

        // this.serverProcess = spawn(
        //     'hexo',
        //     ['server'],
        //     {
        //         cwd: this.hexoRootDir,
        //         shell: true,          // Windows 必须
        //         stdio: 'pipe'
        //     }
        // );
        this.serverProcess = spawn(
            'npx',
            ['hexo','server'],{
                cwd: this.hexoRootDir,
                shell:false,
            })

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
     * 实际上killport之前的代码完全没有关掉端口，
     */
    public async stopServer(): Promise<void> {
        if (!this.serverProcess) {
            this.logger?.warn('[Hexo] No running server to stop');
            return;
        }

        this.logger?.info('[Hexo] Stopping hexo server...');
        // this.serverProcess.kill();
        // this.serverProcess = null;
        this.serverProcess.kill('SIGINT'); // 比 SIGTERM 更像 Ctrl+C
        // 兜底：500ms 后强制释放端口
        setTimeout(() => {
            this.killPort(4000);
        }, 500);

        this.serverProcess.once('close', () => {
            this.stopping = false;
            this.serverProcess = null;
            this.logger?.info('[Hexo] Server fully stopped');
        });
    }

    /**
     * 端口兜底清理
     * @param port
     * @private
     * learn Windows 信号机制 -> shell 包裹 -> 进程树 vs JS 引用
     * todo 无法关闭端口需要处理 bug
     */
    private killPort(port: number) {
        exec(
            `netstat -ano | findstr :${port}`,
            (err, stdout) => {
                if (!stdout) return;

                const lines = stdout.trim().split('\n');
                for (const line of lines) {
                    const pid = line.trim().split(/\s+/).pop();
                    if (pid) {
                        exec(`taskkill /PID ${pid} /F`);
                    }
                }
            }
        );
    }

    /** 查询服务器状态（给 UI 用） */
    public isServerRunning(): boolean {
        return this.serverProcess !== null && !this.stopping;
    }
}
