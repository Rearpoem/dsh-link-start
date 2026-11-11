# dsh-link-start

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件：把 DSH 的启动画面换成一段约 18 秒、动画风格的 **Link Start** 连线动画，中间几步显示的是你这台 DSH 的真实状态。

> 非官方同人作品，灵感来自动画中的 Link Start 场景，与原作及其版权方、DeepSeek 官方均无关联。画面、动画和光效全部由本仓库代码原创绘制，不包含原作的图片、Logo、字体、音频或台词。

English summary: a DSH plugin that replaces the startup screen with an ~18 s anime-style "Link Start" dive. The checks, language, log-in and confirmation scenes show your own DSH state (profile, loaded plugins, default model, workspaces, sessions, UI language). Click or press any key to skip. Unofficial fan work; all visuals are drawn by this code, no original assets are included.

## 画面

1. 黑屏中出现 `Link Start!`
2. 白色空间里，彩色光束从中心旋转出现，再加速冲向镜头
3. Host / Plugins / Model / Workspaces / Sessions 五个圆盘依次飞过，标签变为 OK
4. 右侧叠起五个检测图标，旁边标出实际值：profile 名、已加载插件数、默认模型、工作区数、会话数；变绿后散开
5. `Language ▶ 简体中文`：取 DSH 的界面语言设置，没设置时跟随系统，显示该语言自己的名字
6. `Log in` 面板：`:account` 打出你的用户名，`:api key` 打出 `sk-` 加一串星号（只是动画，不读取也不显示真实密钥）
7. 工作区确认面板：显示最近使用的工作区名，YES 高亮；读不到工作区时改为显示账号名
8. 灰色背景上 `Welcome to / DeepSeek Harness !`，缓慢放大
9. 欢迎语冲过镜头，蓝色光束从中心爆开、铺满画面，褪成淡紫白，然后白屏淡出进入 DSH

**点击或按任意键可跳过**（Cmd / Ctrl / Alt 组合键不拦截）。

系统开启“减少动态效果”时（Windows 的“动画效果”关掉、或性能选项选了“调整为最佳性能”也算），默认播放约 10 秒的平缓版：检测、语言、登录、工作区确认和欢迎语都在，只是去掉了光束、飞过的圆盘和蓝色收尾，场景之间只做淡入淡出。想不管系统设置、始终播放完整动画，把配置里的 `motion` 设为 `full`。

低性能机器上：
- DSH 启动卡住时，画面会停在 `Link Start!`，等卡顿过去再从头往下播，不会跳过场景。
- 动画一卡就自动降低画质（降低分辨率，去掉光晕和颗粒，减少粒子）。

## 安装

需要 DSH `0.2.2-rc.1` 及以上、`0.3.0` 以下。装好后完全退出并重新打开 DSH。

**方式一：插件索引（可在 DSH 里浏览和一键安装）**

1. 打开 DSH 侧栏的**插件**，在**实验性插件**下启用**自定义插件索引**。
2. 在**发现**标签页添加索引地址：

   ```
   https://raw.githubusercontent.com/Rearpoem/dsh-link-start/main/plugin-index.json
   ```

3. 在列表里找到 **Link Start 启动画面**，安装。

**方式二：命令行**

```sh
dsh plugin --profile desktop add https://github.com/Rearpoem/dsh-link-start/releases/download/v0.1.1/dsh-link-start-0.1.1.tgz
```

`desktop` 换成你要装进去的 profile 名（如 `web`）。

## 配置

都可以不填。在 profile 的 `cordis.patch.yml` 里给 `dsh-link-start` 条目加 `config`：

```yaml
- id: dsh-link-start
  name: dsh-link-start
  config:
    account: Player          # Log in 面板里的用户名，默认取系统用户名，最多 24 个字符
    welcome: "Welcome to\nDeepSeek Harness !"   # 欢迎语，用 \n 换行，最多 3 行、60 个字符
    everyReload: false       # true：每次页面重载都播放
    motion: auto             # auto：跟随系统“减少动态效果”；full：始终完整播放；gentle：始终播放平缓版
    quality: auto            # auto：卡了自动降画质；high：始终最高画质；low：始终低画质（老机器可直接用）
```

改配置后需要重启 DSH。

## 原理

插件只有 Host 端。它监听 `webserver/index-inject`，往启动页注入一段样式和一段脚本：

- 桌面版：Host 启动完成时把注入行随启动载荷发给窗口，页面在 React 界面挂载前执行它们。
- Web 版：注入行直接渲染进 `index.html`，位于 `#root` 之前。

所以遮罩会在 DSH 自己的界面出来之前就盖上去。`Link Start!` 会停到 DSH 界面开始渲染（最多 5 秒），再开始后面的场景，免得和 DSH 抢启动时间。动画播完后，如果 DSH 界面还没渲染，会在白屏多停最多 4 秒。

场景按自己的时钟推进：主线程被卡住时，时钟最多前进 0.1 秒，卡顿过去后接着播，所以慢机器上不会一下跳到后面的场景。CSS 里还有兜底：脚本停止推进 26 秒后，遮罩会自动消失，不会挡住界面。

同一个窗口只播放一次（用 `sessionStorage` 记录），页面重载不会重播；重启 DSH 后会重新播放。

DSH 信息在每次生成启动页时由 Host 读取（profile、插件加载列表、默认模型服务、工作区登记表、语言插件的设置），只用于画面显示，不会发往任何地方。任何一项读不到，那一项就只显示标签，不影响动画。

## 开发

```sh
npm install
npm run check   # 类型检查
npm run build   # 构建 dist/index.js
```

| 文件 | 作用 |
| --- | --- |
| `src/index.ts` | Host 入口：读取 `assets/`，读取 DSH 状态，填入配置，注册启动页注入 |
| `assets/link-start.js` | 浏览器端运行时：搭 DOM、按时间线切换场景、画光束、HUD 圆盘和蓝色收尾 |
| `assets/link-start.css` | 全部样式，作用域限制在 `#sao-ls` 下 |
| `plugin-index.json` | DSH 插件索引（格式 1），由 `npm run index -- <commit>` 生成 |

改 `assets/` 不需要重新构建，重启 DSH 即可生效；改 `src/` 需要 `npm run build`。`dist/` 随仓库提交，从 Git 安装时不需要构建。

## 许可

[MIT](LICENSE)
