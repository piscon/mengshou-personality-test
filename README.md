# 性格测试，看看你是哪种萌兽

三分钟、十道题，把你的性格测成一只毛茸茸的小动物。

一个全端（微信/支付宝/抖音小程序 + H5 + App）趣味性格测试，老少皆宜：10 道四选一情景题（带分支选项）→ 四维人格画像 + 分支亲和 → 匹配 18 只萌兽之一 → 生成可分享的结果卡。

## 快速开始（H5 原型，零依赖）

```bash
cd mengshou-personality-test
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/prototype/
```

原型直接引用 `data/` 的题库与萌兽数据、`core/` 的计分引擎，无构建步骤。

## 计分引擎自测

```bash
node core/scoring.test.mjs
# 期望输出: archetype cases: 18/18 passed + ALL SCORING TESTS PASSED（附 2000 次随机作答的结果分布）
```

## 目录

| 路径 | 内容 |
|---|---|
| `docs/立项书.md` | 产品定义、内容模型、技术选型、里程碑、风险 |
| `docs/复用清单.md` | 借用了哪些现成轮子及其授权（不重复造轮子登记表） |
| `data/questions.json` | 10 道四选一情景题（每选项带维度分 + 萌兽亲和）+ 四维模型定义 |
| `data/animals.json` | 18 只萌兽：维度签名、解析文案、配色、稀有度 |
| `core/scoring.js` | 框架无关的计分引擎 v2（维度层 + 分支亲和层，纯函数，各端共用） |
| `core/scoring.test.mjs` | 引擎自测（典型画像命中 + 随机分布） |
| `prototype/` | 零依赖 H5 原型（立项验证） |
| `app/` | uni-app 正式工程说明（M1 用官方预设生成） |

## 技术路线

uni-app（Vue 3 + TS）一套代码多端发布；MVP 零后端、本地计分、免登录；二期 uniCloud 做结果统计。详见立项书。

## 资产与授权

- 本项目自研代码与文案：MIT（见 `LICENSE`）
- 第三方素材与借用：见 `NOTICE.md` 与 `docs/复用清单.md`（Twemoji 为 CC BY 4.0 等）

## 状态

M0 立项完成（2026-11-08）：立项书、数据（18 只萌兽 / 10 题四选一）、引擎 v2、自测（18/18 画像命中）、原型就绪，资产已入 GitHub；下一步 M1 用 uni-app 官方预设搭正式工程。
