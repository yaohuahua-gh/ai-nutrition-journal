# Coco AI营养记录

移动端优先的营养记录 PWA：拍照识别食物，匹配 USDA / Open Food Facts 标准营养数据，用户确认后保存到当天记录，并生成每日复盘。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

开发测试手机访问：

```bash
npm run dev -- --hostname 0.0.0.0
```

手机和电脑连同一个 Wi-Fi 后，用手机打开电脑局域网地址，例如 `http://192.168.1.23:3000`。

## Vercel 环境变量

基础配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
USDA_API_KEY=
DEMO_USER_ID=
```

AI 图片识别使用智谱 GLM-4V-Flash。

```bash
ZHIPU_API_KEY=你的智谱开放平台 API Key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_MODEL=glm-4v-flash
```

这是当前比较适合国内访问和低成本试验的方案。

## 手机安装

部署到 Vercel 后，用手机浏览器打开生产地址：

- iPhone：Safari 分享按钮 -> 添加到主屏幕
- Android：Chrome 菜单 -> 添加到主屏幕 / 安装应用

## Supabase

在 Supabase SQL Editor 执行：

```sql
-- see supabase/schema.sql
```

表结构包含：

- `profiles`：用户目标
- `meal_entries`：每日每餐记录
- `ingredients`：食材明细和标准库匹配结果
- `favorite_foods`：常吃组合
- `daily_reports`：日报
- `storage.buckets.meal-photos`：食物照片

## API Routes

- `POST /api/analyze-photo`：智谱 GLM-4V-Flash 识别照片并匹配标准库
- `POST /api/match-nutrition`：按食材名称和重量查询 USDA / Open Food Facts
- `POST /api/barcode`：按条形码查询 Open Food Facts
- `GET /api/entries`：读取今日记录
- `POST /api/entries`：保存确认后的饮食记录
- `GET /api/favorites`：读取常吃组合
- `POST /api/favorites`：保存常吃组合
- `POST /api/daily-report`：生成每日复盘
