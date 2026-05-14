# QFactor A股量化驾驶舱

面向 A股的多用户量化分析网站。用户登录后输入股票代码，系统拉取行情、计算规则信号、生成回测，再调用服务端 DeepSeek API 输出中文研究报告。

## 功能

- 多用户登录：Supabase Auth + Postgres + RLS。
- A股搜索、行情、日线 K线和成交量图。
- 量化评分：趋势、动量、量能、风险、估值、流动性，总分 0-100。
- 操作建议：买入、试仓、持有、观望、减仓、止损，包含仓位、入场、止损、止盈和失效条件。
- DeepSeek 报告：API Key 只放服务端环境变量，不暴露给浏览器；未配置或失败时自动降级规则报告。
- 自选股、历史报告、选股器、订阅额度页、管理员后台、设置页。
- 简化回测：收盘后信号、次日开盘执行，单边 0.15% 成本假设。

## 本地启动

```bash
npm install
copy .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

## 环境变量

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-for-admin-api-only

DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro

TUSHARE_TOKEN=

ADMIN_EMAILS=owner@example.com
LOCAL_ADMIN_EMAIL=owner@example.com
```

`TUSHARE_TOKEN` 可选。未配置时系统使用服务端公开行情接口，并在接口不可用时使用 demo 数据兜底，保证页面可用。

`ADMIN_EMAILS` 用逗号分隔站长邮箱，只有这些账号能看到 `/settings` 和侧边栏“设置”。普通付费用户不会看到运行时配置。`LOCAL_ADMIN_EMAIL` 只用于本地未配置 Supabase 时临时查看设置页。

`SUPABASE_SERVICE_ROLE_KEY` 只用于服务端管理员后台读取和更新全站订阅数据，不能以 `NEXT_PUBLIC_` 开头，也不能暴露给浏览器。

## Supabase 初始化

1. 创建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/schema.sql`。
3. 在 Authentication 设置里开启 Email 登录。
4. 将 Project URL 和 Publishable/Anon Key 填入 `.env.local` 或 Vercel 环境变量。

## Vercel 上线

1. 将项目推到 Git 仓库。
2. 在 Vercel 导入项目。
3. 添加上面的环境变量，并把你的站长邮箱填入 `ADMIN_EMAILS`。
4. 部署后访问 `/auth/login` 注册账号。

## 付费网站建议

- 普通用户只开放驾驶舱、选股器、自选股和历史报告。
- 站长后台使用 `ADMIN_EMAILS` 控制，隐藏 DeepSeek、Supabase、Tushare 等运行时配置。
- 已新增 `subscriptions` 表保存套餐、到期时间、每日分析次数，并在 `/api/analysis/run` 里按用户套餐限流。
- 已新增 `usage_counters` 表统计每日分析次数，`/billing` 展示用户额度，`/admin` 展示后台订阅和用量。
- 支付可接 Stripe、Paddle 或国内支付服务；支付成功后由 webhook 更新用户订阅状态。

## 常用命令

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

## 免责声明

本项目输出仅用于量化研究和学习，不构成个性化投资建议，不连接券商、不自动下单。公开行情接口可能延迟或变更，实盘前请核对权威行情与交易规则。
