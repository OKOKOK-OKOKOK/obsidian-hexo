# 环境

npm config set registry https://registry.npmmirror.com

npm install --save-dev @types/node

npm install obsidian --save-dev

--out
编译多个文件并合并到一个输出的文件,能不能不适应esbuild需要esbuild来帮助生成单个mainjs文件

# 功能

README文件完善，

--out
编译多个文件并合并到一个输出的文件,能不能不适应esbuild

添加debug日志方便查错

防御性意外；




关于删除与生成
本插件只负责将 Obsidian 中的 Markdown 与附件同步到 Hexo 项目中。
HTML 的生成与清理由 Hexo 自身完成。

当插件被卸载 / 禁用时，Obsidian 会自动取消通过registerEvent注册的所有监听，避免内存泄漏，
如果直接用this.app.vault.on而不手动off，插件卸载后监听仍会存在，导致内存泄漏

async onunload() {
console.log('unloading plugin')
}

是否拆函数：
判断一个函数该放哪，问 3 个问题
1 它是否依赖 Obsidian 生命周期？
→ main.ts

2 它是否只是展示 / 表单 / UI？
→ SettingTab

3 它是否能脱离 Obsidian 单独测试？
→ services

constructor(
private logger?: Logger,
private app:App,
private settings:HexoSyncSettings,
) {}
如果里面有问号，说明接受没有实例的情况，之后的调用也要考虑没有实例的情况，也需要加问号，
要么都有问号，要么都没有问号
```
顺序替换，
md
md附件处理，
    原本清洗语法可以减少处理附件的代码逻辑量，但是顺序没法改变，
md语法清洗，
md回写

AttachmentService
    现实世界（磁盘）
    不关心 Hexo
MarkdownTransform
    纯文本
    不碰文件系统
SyncPipeline
    决定顺序
    保证信息不丢

任何会改变“文件名 / 路径 / 标识符”的操作，
都必须发生在“最后一次使用原始信息之后”。

```
使用hexo和fluid的话，附件名字中不能带有空格，可以有中文，
经过处理了，原md文档可以随便写，处理后空格会被替换成下划线

//manifest有可能需要同步到ob里面，或者人为修改main为mainjs

# 代码
```
打日志
感觉奇怪的地方用warn
感觉不可能出错的地方用error
```

```
在 JavaScript / TypeScript 里，
“访问一个不存在的对象属性”是完全合法的，结果是 undefined。
```

```
在 JS 中：
value == null
等价于：
value === null || value === undefined
```

```
Obsidian 插件不是 Node 项目，它不会做模块解析
main.js 里有 require('./logger')，
但 Obsidian 只保证能加载 main.js 本身，
不会自动加载同目录下的其他 JS 模块，
必须全部打包成一个mainjs
"build": "node esbuild.config.mjs",
```

```
//构造函数
        constructor(private logger?: Logger) {}


//用‘？’避免undefined
        this.logger?.log(
            `[INFO] Markdown transformed (obsidian → hexo): ${file.name}`
        );
```