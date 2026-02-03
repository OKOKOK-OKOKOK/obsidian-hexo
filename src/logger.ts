import * as fs from 'fs';
import * as path from 'path';

/**
 * 简单日志工具类
 */
export class Logger {
  private logFilePath: string;

  /**
   *
   * @param logDir log文件所在的文件夹位置
   * todo 以后还需要根据日期生成不同的log
   * todo log分级别
   */
  constructor(logDir: string) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logFilePath = path.join(logDir, 'hexo-sync.log');
  }

  /**
   * 写入一条日志
   */
  log(message: string) {
    const time = new Date().toISOString();
    const line = `[${time}] ${message}\n`;

    try {
      fs.appendFileSync(this.logFilePath, line, 'utf-8');
    } catch (err) {
      // 日志失败不能影响主流程
      console.error('Logger failed:', err);
    }
  }
}

/*package
{
  "name": "obsidian-hexo",
  "version": "1.0.0",
  "description": "",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "sync": "powershell Copy-Item -Recurse -Force dist\\* \"D:\\Obsidian\\PluginTest\\.obsidian\\plugins\\obsidian-hexo\"",
    "dev": "npm run build && npm run sync",
    "clean": "rimraf dist"
  },
  "keywords": ["obsidian", "hexo", "plugin"],
  "author": "OKOKOK-OKOKOK",
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^25.2.0",
    "obsidian": "^1.11.4",
    "typescript": "^5.5.3"
  },
  "private": true
}

 */

/*tsconfig
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node", "obsidian"],     // 引入 Node.js 和 Obsidian 类型声明
    "outDir": "dist",                  // 编译输出目录
    "rootDir": "src",                  // TS 源码根目录
  },
  "include": ["src"],                  // 编译 src 下的所有 TS 文件
  "exclude": ["node_modules", "dist"]  // 排除 node_modules 和 dist
}

 */