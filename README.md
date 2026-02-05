# 环境

npm config set registry https://registry.npmmirror.com

npm install --save-dev @types/node

npm install obsidian --save-dev

需要esbuild来帮助生成单个mainjs文件

# 功能

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
使用 hexo new 会让 fluid 会自动创建同名文件夹，现在已经不需要这一个功能了，需要关闭；
先基础功能，然后补充日志，最后再调试

使用hexo和fluid的话，附件名字中不能带有空格，可以有中文

插件ui页面，按钮最后做，优先完善功能代码；

路径修改可选，

按键提供一键全体初始化功能，这样就不用手动保存每个文件才能生成fm了
```
尝试了没有用
：关闭 Fancybox 图片增强

在 themes/fluid/_config.yml 里：

post:
image_zoom:
enable: false
```
```
hexo解析路径和md文档逻辑写的不一样
_posts/
├─ test.md
├─ test/
│  └─ image.png
并且在 test.md 里：

![](image.png)
```
//manifest有可能需要同步到ob里面，或者人为修改main为mainjs

/*
然后再在纯净版本解决附件问题，
链接的图片附件，ob中统一放在同级别的attachment文件夹中，hexo是放在各自对应的同名文件夹中，
需要在复制md时，从ob的attachment文件夹中准确找出对应附件然后复制到hexo对应的同名文件夹中，
其中md content部分在fm部分有涉及到，是需要合在一起编写该功能，还是说另外创建ts单独写
*/

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