# 萌兽性格测试 — uni-app 正式工程（M1）

由 uni-app 官方预设 `uni-preset-vue#vite-ts` 生成（degit），一套代码多端：
微信小程序 / 支付宝小程序 / 抖音小程序 / H5 / App。

## 结构

- `src/pages/index/index.vue` 首页：钩子 + 18 只萌兽图鉴 + 开始按钮
- `src/pages/quiz/quiz.vue` 答题页：进度条 + 四选一 + 回退，答完本地计分
- `src/pages/result/result.vue` 结果页：萌兽 + 四维图 + 海报（Canvas 绘制）+ 转发/复制分享
- `src/common/scoring.ts` 计分引擎 v2 的 TypeScript 版（与仓库根 `core/scoring.js` 同一算法）
- `src/common/data/` 题库与萌兽数据（源头在仓库根 `data/`，改数据后同步复制过来）

## 常用命令

```bash
npm install
npm run dev:h5          # H5 开发
npm run dev:mp-weixin   # 微信小程序开发（用微信开发者工具打开 dist/dev/mp-weixin）
npm run build:h5        # H5 构建 -> dist/build/h5
npm run build:mp-weixin # 微信小程序构建 -> dist/build/mp-weixin
npm run type-check      # 类型检查
```

## 上线前待办

- `src/manifest.json` 的 `mp-weixin.appid` 还是空的：提审微信小程序前填入你自己的小程序 AppID；支付宝/抖音同理。
- 结果页海报目前是 Canvas 基础版（emoji + 文案），M2 换定制插画素材（Twemoji SVG / 定制图）后升级海报模板。
