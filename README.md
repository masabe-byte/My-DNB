# Dual N-Back

自用 Dual N-Back 训练应用，基于旧网页版本整理为 Tauri 桌面应用。目标是提供稳定、离线、低干扰的工作记忆训练环境，并可靠保存训练等级、统计记录和个人配置。

## 核心功能

- 视觉位置 + 听觉字母的 Dual N-Back 训练。
- 键盘响应：视觉匹配可用 `a` / `d` / `j`，听觉匹配可用 `;` / `f` / `k`。
- 自动按成绩调整 N 等级，也可在设置中锁定等级。
- 统计页展示训练次数、等级趋势、反应延迟、连续训练天数等数据。
- Tauri 版本使用应用数据目录保存 `stats.json`、`N.json` 和 `config.json`，浏览器版本回退到 `localStorage`。
- 所有训练所需音频和脚本均本地化，避免 CDN 或网络波动影响训练。

## 启动

```powershell
npm install
npm start
```

也可以双击 `启动DNB.vbs` 静默启动开发版。

## 构建

```powershell
npm run build
```

Windows 构建 Tauri 安装包需要 Visual Studio Build Tools，并安装 MSVC 与 Windows SDK 组件。没有这些组件时，网页打包和前端检查仍可运行，但 `tauri build` / `cargo check` 会在链接阶段失败。

## 验证

```powershell
node --check js/logic.js
node --check js/storage.js
node --check js/timer.js
node --check js/mkcharts.js
npm run prepare-dist
npm audit --audit-level=high
npx tauri info
```

`npm run prepare-dist` 会把前端资源复制到 `dist/`，供 Tauri 使用。`dist/`、`node_modules/`、`src-tauri/target/`、`src-tauri/gen/` 和本地 `data/` 都是生成物或个人数据，不应提交。
