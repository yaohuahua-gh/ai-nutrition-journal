# AI Nutrition Journal

移动端优先的营养记录 Web App 原型：拍照上传食物，OpenAI Vision 做初筛，USDA FoodData Central / Open Food Facts 做标准数据校准，用户确认后写入每日饮食记录，并生成日报。

## 功能

- 手机拍照或上传食物照片
- AI 输出食材名称、重量、热量、蛋白质、脂肪、碳水、纤维和置信度
- 每个食材都可手动修改
- 显示 AI 估算 vs 标准数据库差异
- 保存到当天饮食记录
- 今日总热量、三大营养素、每餐明细和目标完成度
- 每日饮食复盘和明天建议
- 常吃组合保存与一键添加
- 包装食品条形码查询 Open Food Facts

## 运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

没有配置密钥时，接口会自动返回演示数据，方便先验证产品流程。

## 手机上使用

开发测试时，电脑和手机连同一个 Wi-Fi，然后在电脑上运行：

```bash
npm run dev -- --hostname 0.0.0.0
```

手机打开电脑的局域网地址，例如 `http://192.168.1.23:3000`。

想要随时使用，需要部署到一个公开的 HTTPS 地址。GitHub 不是必须的，但它是连接 Vercel、Netlify、Cloudflare Pages 这类部署平台最方便的方式。部署后，用手机浏览器打开网址：

- iPhone：Safari 分享按钮 → 添加到主屏幕
- Android：Chrome 菜单 → 添加到主屏幕 / 安装应用

本项目已经包含 PWA 配置：

- `app/manifest.ts`：应用名称、图标、启动方式
- `public/sw.js`：基础离线缓存
- `public/icons/`：主屏幕图标

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
USDA_API_KEY=
DEMO_USER_ID=
```

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

- `POST /api/analyze-photo`：OpenAI Vision 识别照片并匹配标准库
- `POST /api/match-nutrition`：按食材名称和重量查询 USDA / Open Food Facts
- `POST /api/barcode`：按条形码查询 Open Food Facts
- `GET /api/entries`：读取今日记录
- `POST /api/entries`：保存确认后的饮食记录
- `GET /api/favorites`：读取常吃组合
- `POST /api/favorites`：保存常吃组合
- `POST /api/daily-report`：生成每日复盘

## 下一步

- 接 Supabase Auth，把 `DEMO_USER_ID` 替换为当前登录用户
- 上传照片到 Supabase Storage，并把 `photo_url` 写入 `meal_entries`
- 加入目标设置保存
- 增加历史日历、趋势图和体重记录
- 给 OpenAI 输出加更严格的 schema guard 和低置信度提醒
