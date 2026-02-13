import { exec, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from "path";

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
     * todo 当启动失败时，无法检测到失败结果，仍然会继续打印成功日志，不确定是无法检测，还是因为ui改变根本没有检测实际状态就进行变化
     */
    public async runServer(): Promise<void> {
        if (this.serverProcess) {
            this.logger?.warn('[Hexo] Server already running');
            return;
        }

        if (!this.hexoRootDir) {
            this.logger?.error('[Hexo] hexoRootDir not set');
            return;
        }

        const hexoCmd = path.join(
            this.hexoRootDir,
            'node_modules',
            '.bin',
            'hexo.cmd'
        );

        this.logger?.info('[Hexo] Starting hexo server...');

        this.serverProcess = spawn(
            hexoCmd,
            ['server'],
            {
                cwd: this.hexoRootDir,
                shell: true,
                stdio: 'pipe'
            }
        );

        this.serverProcess.on('error', (err) => {
            this.logger?.error('[Hexo] Spawn failed: ' + err.message);
            this.serverProcess = null;
        });

        this.serverProcess.stdout.on('data', (data) => {
            const msg = data.toString();
            this.logger?.info(`[hexo] ${msg}`);

            if (msg.includes('Hexo is running at')) {
                this.logger?.info('[Hexo] Server started successfully');
            }
        });

        this.serverProcess.stderr.on('data', (data) => {
            this.logger?.warn(`[hexo error] ${data.toString()}`);
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

        const pid = this.serverProcess.pid;

        if (!pid) {
            this.logger?.error('[Hexo] Cannot stop server: PID undefined');
            this.serverProcess = null;
            return;
        }

        this.logger?.info(`[Hexo] Stopping server (pid=${pid})...`);

        return new Promise((resolve) => {
            this.serverProcess?.once('close', (code) => {
                this.logger?.info(`[Hexo] Server closed (code=${code})`);
                this.serverProcess = null;
                resolve();
            });

            if (process.platform === 'win32') {
                exec(`taskkill /PID ${pid} /T /F`);
            } else {
                process.kill(-pid);
            }
        });
    }

    /**
     * 杀掉进程树
     * @param pid
     * @private
     */
    private killProcessTree(pid: number) {
        if (process.platform === 'win32') {
            exec(`taskkill /PID ${pid} /T /F`);
        } else {
            process.kill(-pid);
        }
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
                if (!stdout) {
                    this.logger?.warn('[Hexo] No process using port');
                    return;
                }

                const lines = stdout.trim().split('\n');

                for (const line of lines) {
                    const pid = line.trim().split(/\s+/).pop();

                    if (pid) {
                        exec(`taskkill /PID ${pid} /F`);
                        this.logger?.info(`[Hexo] Killed PID ${pid}`);
                    }
                }
            }
        );
    }

    /** 查询服务器状态（给 UI 用） */
    public isServerRunning(): boolean {
        return this.serverProcess !== null && !this.stopping;
    }

    /**
     * 查找项目内的hexo
     * @private
     */
    private getHexoExecutable(): string {
        if (process.platform === 'win32') {
            return path.join(this.hexoRootDir, 'node_modules', '.bin', 'hexo.cmd');
        }
        return path.join(this.hexoRootDir, 'node_modules', '.bin', 'hexo');
    }

}
