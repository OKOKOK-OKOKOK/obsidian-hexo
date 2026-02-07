import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private logDir: string;
  /**
   * @private
   */
  private debugEnabled : boolean;

  constructor(logDir: string,debugEnabled: boolean) {
    this.logDir = logDir;
    this.debugEnabled = debugEnabled;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 获取当天的日志文件路径
   * hexo-sync-2026-02-04.log
   */
  private getLogFilePath(): string {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return path.join(this.logDir, `hexo-sync-${date}.log`);
  }

  /**
   * DEBUG 日志文件路径
   */
  private getDebugLogPath(): string {
    const date = new Date().toISOString().slice(0, 10);
    return path.join(this.logDir, `hexo-sync-debug-${date}.log`);
  }

  /**
   * 写日志
   * @param level
   * @param message
   * @private
   */
  private write(level: LogLevel, message: string) {
    const time = new Date().toISOString();
    const line = `[${time}][${level}] ${message}\n`;

    if(!(level===LogLevel.DEBUG)) {
      try {
        fs.appendFileSync(this.getLogFilePath(), line, 'utf-8');
      } catch (err) {
        // 日志失败不能影响主流程
        console.error('Logger failed:', err);
      }
    }else{
      try {
        fs.appendFileSync(this.getDebugLogPath(), line, 'utf-8');
      }catch (err){
        //debug日志失败
        console.error('LoggerDebug failed:', err);
      }
    }
  }
  public setDebugEnabled(debugEnabled: boolean) {
    this.debugEnabled = debugEnabled;
  }

  public debug(msg: string) {
    if (!this.debugEnabled) return;
    this.write(LogLevel.DEBUG, msg);
  }

  public info(msg: string) {
    this.write(LogLevel.INFO, msg);
  }

  public warn(msg: string) {
    this.write(LogLevel.WARN, msg);
  }

  public error(msg: string, err?: unknown) {
    this.write(
        LogLevel.ERROR,
        err ? `${msg} | ${String(err)}` : msg
    );
  }
}
