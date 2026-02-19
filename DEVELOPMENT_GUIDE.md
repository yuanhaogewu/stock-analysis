# A股专业股票分析工具 - 开发与复现指南

本标准开发文档旨在提供完整的项目定义、架构说明及环境配置流程。当您在新的 Antigravity 环境中导入本项目时，请按照以下指南执行，以确保功能与原始版本完全一致。

---

## 1. 项目概览
本项目是一款专为中国 A 股市场设计的专业化分析工具，采用 **React (Next.js)** 前端与 **FastAPI (Python)** 后端的全栈方案。

### 核心功能列表：
- **实时行情查询**：支持全市场指数、排行榜、个股报价展示。
- **专业 K 线图表**：集成轻量级图表库，支持成交量显示。
- **AI 智能深度诊断**：支持 DeepSeek 等大模型，按技术形态、资金行为进行结构化分析。
- **管理员后台**：提供 API 配置、用户管理（有效期控制）、密码找回等功能。
- **用户自选同步**：实现跨设备、基于云端数据库的自选股同步功能。

---

## 2. 技术栈架构

### 前端 (Frontend)
- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript
- **样式**: Vanilla CSS + Glassmorphism 风格
- **图表**: Lightweight Charts
- **状态管理**: React Hooks (useState/useEffect) + UserToken 鉴权

### 后端 (Backend)
- **框架**: FastAPI (Python 3.10+)
- **数据库**: SQLite (轻量级本地持久化)
- **数据源**: AkShare + 东财/新浪实时接口
- **AI 引擎**: 支持 OpenAI 标准协议的大模型 (原生支持 DeepSeek)

---

## 3. 数据库设计 (stock_system.db)

项目包含三个核心数据表：
1. **admin**: 存储管理员凭证与找回密码的预设答案（赵双江）。
2. **users**: 存储普通用户信息、账号状态（is_active）及 VIP 到期时间（expires_at）。
3. **system_config**: 动态存储 LLM 的 API_KEY, MODEL_ID, BASE_URL。
4. **watchlist**: 实现用户 ID 与股票代码的云端关联。

---

## 4. 复现步骤 (针对 Antigravity)

### 步骤 A：环境初始化
1. **克隆仓库**: `git clone https://github.com/yuanhaogewu/stock-analysis.git`
2. **后端准备**:
   - `cd backend`
   - 创建虚拟环境: `python -m venv venv`
   - 激活环境: `source venv/bin/activate` (Mac/Linux) 或 `venv\Scripts\activate` (Win)
   - 安装依赖: `pip install fastapi uvicorn akshare pandas sqlalchemy pydantic requests requests_cache`
3. **前端准备**:
   - `cd ../frontend`
   - 安装依赖: `npm install`

### 步骤 B：初始化运行
1. **启动后端**:
   - 在 `backend` 目录下执行: `./venv/bin/python main.py`
   - *注意：首次运行会自动根据 `database.py` 初始化 SQLite 数据库。*
2. **启动前端**:
   - 在 `frontend` 目录下执行: `npm run dev -- -p 3002` (建议使用 3002 端口)

### 步骤 C：管理员初始化
- 访问 `http://localhost:3002/manage`
- 使用默认账号登录：`xinsiwei` / `Xinsiwei2026@`
- 在后台配置大模型参数，否则 AI 诊断功能将无法使用。

---

## 5. 关键业务逻辑 (复现核心)

### 1. 验证码与过期拦截 (ClientLayout.tsx)
前端通过 `ClientLayout` 拦截所有二级页面。
- 如果检测到未登录（localStorage 无 token），强制跳转 `/login`。
- 后端在登录接口中严格校验 `expires_at` 时间点。

### 2. 云端自选逻辑
- **添加/移除**：前端调用 `POST /api/user/watchlist/add|remove`，传递 `user_id`。
- **列表显示**：通过 `GET /api/user/watchlist/{user_id}` 获取代码数组，再并发请求个股行情。

### 3. AI 提示词与响应
- 后端 `get_deepseek_analysis` 函数使用了增强的系统 Prompt。
- 逻辑：先进行本地量价诊断（Stage 分类），然后将数据喂给 AI 进行结构化（JSON）输出。

---

## 6. 配置参数说明
项目使用 `.env` 文件作为本地备选手动配置，但**优先从 SQLite 数据库获取**后台管理的配置项。
- **管理员找回密码问题**: "这个系统的开发者是谁?"
- **预设答案**: "赵双江"

---

## 7. 开发规范
- **标识符**: 代码中采用全英文命名。
- **回复语言**: 所有前端 UI 与 Antigravity 的回复必须使用 **简体中文**。
- **设计风格**: 深蓝至紫色的渐变背景，卡片采用半透明玻璃质感 (`backdrop-filter: blur`)。
