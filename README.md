# 环境

npm config set registry https://registry.npmmirror.com

npm install --save-dev @types/node

npm install obsidian --save-dev

# 功能

```
raw md
  ↓
FrontMatterService
  - parse
  - normalize
  ↓
MarkdownTransformService   清洗语法污染
  - Obsidian → 标准 Markdown
  ↓
AttachmentService          简单、可控
  - find ![](...)
  - copy files
  ↓
write file

```
按键提供一键全体初始化功能，这样就不用手动保存每个文件才能生成fm了

插件ui页面，按钮最后做，优先完善功能代码；

解决ob的附件语法问题，

然后再在纯净版本解决附件问题，
链接的图片附件，ob中统一放在同级别的attachment文件夹中，hexo是放在各自对应的同名文件夹中，
需要在复制md时，从ob的attachment文件夹中准确找出对应附件然后复制到hexo对应的同名文件夹中，
其中md content部分在fm部分有涉及到，是需要合在一起编写该功能，还是说另外创建ts单独写


有了uuid之后，备份和更新的逻辑就需要重新修改了，应该怎么修改，

代码重构；

# 代码

在 JavaScript / TypeScript 里，
“访问一个不存在的对象属性”是完全合法的，结果是 undefined。

在 JS 中：
value == null
等价于：
value === null || value === undefined

Obsidian 插件不是 Node 项目，它不会做模块解析
main.js 里有 require('./logger')，
但 Obsidian 只保证能加载 main.js 本身，
不会自动加载同目录下的其他 JS 模块，
必须全部打包成一个mainjs
"build": "node esbuild.config.mjs",

增加新功能的日志填写,先基础功能，然后补充日志，最后再调试

//manifest有可能需要同步到ob里面，或者人为修改main为mainjs

我在本地添加了一个新分支，如何将该分支同步到github

transform里面本来没有用到file，是不是可以不要这个参数？

```
//构造函数
        constructor(private logger?: Logger) {}


//用‘？’避免undefined
        this.logger?.log(
            `[INFO] Markdown transformed (obsidian → hexo): ${file.name}`
        );
```