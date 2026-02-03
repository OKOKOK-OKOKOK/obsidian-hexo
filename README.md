# 环境

npm config set registry https://registry.npmmirror.com

npm install --save-dev @types/node

npm install obsidian --save-dev

# 功能

添加功能：
使用`hexo_id`、`uuid`解决重命名问题；
v4uid
细节功能，提供一键全体初始化功能，这样就不用手动保存每个文件才能生成fm了

插件ui页面，按钮最后做，优先完善功能代码；

（静态渲染之后添加动态渲染功能；）

**统一成 Hexo 目录文章（index.md + assets）**  
链接的图片附件，ob中统一放在attachment中，hexo是放在各自对应的文件夹中，
转换时，主要需要读取md content中的附件信息，
然后去attachment中精准复制对应文件到hexo中新创建的对应同名文件夹；

**插件设置页（开关这些行为）**
需要看ob官方教程；

可以在 IDEA 配置 File Watcher：保存 TS 自动执行 npm run dev

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

增加新功能的日志填写