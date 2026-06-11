# BreathScape 视觉资源与 Skills 上下文

## 当前目标

1. 绘画页右侧栏尽量不出现上下滚动，优先利用底部工具栏右侧的垂直空间。
2. 绘画页和其他页面的工具/推荐按钮图案统一替换为更美观的 SVG 控件图标。
3. 画布最终生成的元素 SVG 需要逐类优化，避免不同元素重复、错配或缺少元素特征。
4. 继续保持 BreathScape 的柔和纸质、儿童花园、低刺激视觉风格。

## 已采用资源

### Phosphor Icons React

- 包名：`@phosphor-icons/react`
- 许可证：MIT
- 当前用途：仅用于 UI 控件图标，例如工具栏按钮、Guide 推荐工具按钮。
- 当前不用于：画布中最终生成的儿童作品元素。
- 原因：Phosphor 的 duotone SVG 适合按钮语义表达，但画布作品层仍需要更手绘、更像 BreathScape 自身图案的元素。

### 导入策略

采用单图标路径导入：

```js
import { FlowerIcon as Flower } from '@phosphor-icons/react/dist/csr/Flower';
```

避免从包根入口一次性导入大量图标，降低构建扫描量。

## 网页 Skills 推荐分析

参考页面：

- https://openeuler.csdn.net/6a16c0bd662f9a54cb7797d8.html

该文推荐的 Skills 组合中，与 BreathScape 当前阶段最相关的是：

1. `create-plan`
   - 用于先拆解视觉/交互重构任务，避免直接大范围改代码。
2. `frontend-skill`
   - 用于提高页面视觉质量、布局一致性、组件审美。
3. `webapp-testing`
   - 用于对 `/start`、`/mood-scene`、`/guide`、`/garden`、`/breath`、`/diary-card`、`/diary-list` 做自动化 UI 验收。
4. `figma-implement-design`
   - 当前没有 Figma 源文件，暂不作为优先安装项。
5. `security-threat-model`
   - 当前涉及儿童绘画、本地模型、摄像头姿态识别，后续需要用于隐私和安全边界审查。

当前 Codex 环境已有 `playwright`、`imagegen`、`skill-installer` 等技能；后续如果要安装官方 curated skills，优先考虑：

```text
frontend-skill
webapp-testing
create-plan
```

## 右侧栏布局策略

当前画布页布局保持：

```text
左侧/中间：画布
右侧：反馈栏
底部：工具栏
```

调整策略：

1. 右侧反馈栏跨越画布行和底部工具栏行：`grid-row: 1 / 3`。
2. 画布页右侧隐藏重复灯脸说明，只保留：
   - 当前带来什么
   - 场景状态
   - 模型判断/64x64 preview
   - 两个操作按钮
3. 模型卡片缩小 raster preview 和标签，避免挤出。

## 画布生成元素 SVG 后续优化方案

当前主要问题：

1. 多个元素共享相似资产或别名资产，导致最终画布图案重复。
2. 部分工具映射到基础元素后，视觉没有体现元素描述。
3. 数据集风格 SVG 与 BreathScape 自身柔和场景风格不完全一致。

建议下一步按“工具级资产”重建，而不是只按 QuickDraw 类别共用：

| 工具 | 画布 SVG 应体现 | 建议资产策略 |
| --- | --- | --- |
| seed / memorySeed | 小种子、微光点 | 本地自生成手绘 seed SVG，避免用 circle 直接替代 |
| grass / reed / sprout | 向上短线、草簇、芦苇 | 每个工具独立 3-5 个 SVG 变体 |
| sunlight / breathLight | 光线、光晕、暖点 | 使用线描太阳/放射线，不用普通圆点 |
| rainDrop / rain / dew | 雨线或雨滴 | 按场景区分：雨为短斜线，露水为小圆点 |
| soilLine | 横向土纹 | 只用低矮横线/波线，不能像风线 |
| flower / firstFlower / bud | 花、花苞 | 明确花心和花瓣，避免种子形状 |
| cloud | 多弧云形 | 禁止共用风线 |
| windLine / softWind | 风痕、轻弧线 | 保持线性流动，不变成云或水线 |
| waterLine / ripple / puddle | 水纹、涟漪、水洼 | 分别使用横向水线、同心弧、水洼椭圆 |
| leafBoat / floatingLeaf | 叶船、飘叶 | 叶形要明显，有中脉 |
| bridge / signpost / stone | 桥板、路牌、石头 | 独立资产，不共用普通 line |
| lantern / windowLight | 灯笼、窗光 | 发光元素保留暖色 glow |
| star / constellationLine / moon | 星、星线、月 | 星线由小星+线组成 |
| mushroom | 菌盖+菌柄+斑点 | 禁止复用 stone |
| rainbow | 多层彩色弧 | 保留柔和低饱和多色 |

## 后续实施步骤

1. 盘点 `src/data/toolElementMap.js` 中每个工具当前 `assetVariants` 来源。
2. 对重复或错配工具建立 `public/breathscape-svg-assets/{toolId}/`。
3. 编写 `scripts/generateBreathScapeElementSvgs.mjs`：
   - 生成每个工具 3-5 个轻量 SVG。
   - 保持 `viewBox="0 0 256 256"`。
   - 使用 `currentColor`、圆角线帽、柔和低复杂度路径。
4. 更新 `src/data/quickdrawAssets.js`：
   - UI 控件可继续用 Phosphor。
   - 画布生成元素优先用 BreathScape 自生成 SVG。
   - QuickDraw 数据集继续用于识别，不再强制作为最终展示资产。
5. 对 `/garden` 做 Playwright 检查：
   - 每个工具绘制后最终图案是否符合工具名称。
   - 位置不偏移、不重叠过密。
   - 右侧栏无明显滚动。

