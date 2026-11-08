# app/ — uni-app 正式工程（M1 阶段生成）

不在这里手写脚手架代码。M1 时用 uni-app 官方预设一键生成，避免重复造轮子：

```bash
# 在项目根目录执行（Box 或本地均可，Box 需先装好 npm 依赖环境）
npx degit dcloudio/uni-preset-vue#vite-ts app
cd app && npm install
```

生成后这样对接本仓库资产：

- `data/questions.json`、`data/animals.json` → 复制到 `app/src/common/data/`
- `core/scoring.js` → 迁为 `app/src/common/scoring.ts`（纯函数，改动仅为补类型）
- 页面规划（`pages.json` 注册三页，与 `prototype/` 一一对应）：
  - `pages/index/index` 首页（钩子 + 开始 + 图鉴预览）
  - `pages/quiz/quiz` 答题页（进度条 + 二选一 + 回退）
  - `pages/result/result` 结果页（萌兽 + 四维图 + 海报分享）
- 编译目标：微信小程序（首发）、H5（同步上线）、支付宝/抖音小程序与 App（同一套代码后续开启）

运行与发布命令见官方预设生成的 `app/package.json`（`dev:mp-weixin`、`dev:h5`、`build:mp-weixin`、`build:h5`）。
