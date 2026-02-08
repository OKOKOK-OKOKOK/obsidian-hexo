# Obsidian Hexo Sync

一个用于 将 Obsidian 中的 Markdown 笔记及其附件，同步到 Hexo 博客项目 的 Obsidian 插件。

插件只负责 内容与资源同步，以及hexo命令的调用，
HTML 的生成、清理与发布完全由 Hexo 本身负责。

# 功能

1.同步 Obsidian 中的 Markdown 文件到 Hexo _posts 目录

2.自动处理并复制 Markdown 中引用的附件（如图片），不会影响obsidian中的文件

3.对 Markdown 内容进行必要的路径与语法调整

4.附件文件名自动适配 Hexo / Fluid 主题规则

5.提供调试日志，方便排查同步问题

6.对hexo的命令打包到obsidian插件设置页面中

7.当尝试使用插件进行清除hexo时会自动备份一次避免意外

# 安装

克隆本仓库

安装依赖
```
npm install
```

构建插件
```
npm run build
```

将以下文件复制到你的 Obsidian 插件目录：
```
.obsidian/plugins/obsidian-hexo/
├─ main.js
└─ manifest.json
```

在 Obsidian 中启用插件

# 构建说明

Obsidian 插件 只会加载一个入口文件 main.js，
不会自动解析或加载其他 JavaScript 文件。

因此，本插件在构建阶段会：

将所有 TypeScript 代码

打包为 单个 main.js 文件

构建使用 esbuild，这是 Obsidian 插件开发中最常见、最稳定的方案之一。

# 附件与文件名规则

在 Hexo + Fluid 主题环境中：

附件文件名 不能包含空格

可以包含中文

插件会自动处理上述问题：

Obsidian 中可自由命名文件

同步到 Hexo 时，将空格替换为下划线 _

# 调试与日志

正常流程会输出 info warn 日志，报错有error

设置界面可打开debug日志开关，方便查看详细信息

# 卸载与安全性

直接删了就行

# 注意事项

在设置界面打开hexo本地服务器之后记得关，不然一直占用端口4000


# License

ISC

# 其他

因为是第一次边学编写，所以里面可能还残留了一些拿来当笔记用的注释