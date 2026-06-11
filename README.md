# BreathScape v2.0

BreathScape v2.0 是一个 Vite + React 的七日花园绘画 App。当前版本支持儿童在画布上自由绘画，系统会在本地等待多笔画完成后进行 QuickDraw 形状识别，再把识别到的类别整理成 BreathScape 花园里的柔和元素图案。

## 运行

```bash
npm install
npm run dev
```

打开：

```txt
http://127.0.0.1:5173/start
```

Windows PowerShell 如果阻止 `npm.ps1`，可使用：

```bash
npm.cmd install
npm.cmd run dev
```

## 构建

```bash
npm run build
```

或：

```bash
npm.cmd run build
```

## QuickDraw 识别模型

本项目参考 QuickDraw Dataset 的矢量笔触结构和快速涂鸦类别，用于本地形状识别。当前实现不上传儿童画作，不接入后端识别服务。

当前主识别模型：

- 类型：PyTorch 离线训练 CNN，前端纯 JavaScript 推理
- 输入：多笔画归一化后的 `32x32` 灰度栅格
- 输出：QuickDraw 类别，再映射为 BreathScape 元素
- 位置：`public/quickdraw-cnn/model.json` 和 `public/quickdraw-cnn/metadata.json`
- 当前训练样本：每类 3000 个训练样本，650 个验证样本，共 25 个主题类别映射到 BreathScape 工具
- 当前工具级模型验证准确率：约 `96.76%`
- 当前输入尺寸：`64x64`
- 当前网络：`resnet32-64-128-192-gap-dense192`
- 当前增强：随机旋转、缩放、平移、轻微噪声和轻微断线

训练脚本会把 `.ndjson` 中的矢量笔画栅格化后缓存到 `quickdraw_cache/`。第一次训练需要解析文本和构建缓存，之后相同参数会直接读取缓存，避免每次重新解析 QuickDraw ndjson。也可以先单独执行：

```bash
npm run quickdraw:cache
```

重新训练：

```bash
npm run quickdraw:train:cnn
```

也可以先训练轻量 softmax fallback：

```bash
npm run quickdraw:train
```

下载 QuickDraw 类别数据：

```bash
npm run quickdraw:download
```

下载完整 QuickDraw 类别：

```bash
npm run quickdraw:download:all
```

## 数据与授权说明

QuickDraw Dataset 不是儿童专属数据集。本项目不做心理诊断，不做绘画能力评分，不声称基于儿童数据训练。

如果直接使用或展示 QuickDraw 原始样本，需要遵守 QuickDraw Dataset 的 CC BY 4.0 归属要求。当前 App 的视觉输出仍以 BreathScape 自有花园元素为主，QuickDraw 主要用于本地识别训练。

## 安全边界

- 不接入登录
- 不上传儿童画作
- 不接入摄像头上传或人脸识别
- 不接入第三方统计、广告或画像
- 不做心理诊断
- 不做绘画能力评分
