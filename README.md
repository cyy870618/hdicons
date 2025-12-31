# HD-Icons 图标库 v2.0 (重构版)

> 高清图标管理系统 - 基于 React + Flask 的现代化重构版本

## 功能特性

### 原有功能 (完整保留)
- ✅ 主题切换 (明/暗模式)
- ✅ 本地/云端模式切换
- ✅ GitHub 图标仓库自动同步
- ✅ 缩略图自动生成
- ✅ 自动检查更新
- ✅ 图标分类展示 (圆角/圆形/矢量)
- ✅ 图标搜索
- ✅ 一键复制图标地址
- ✅ 图片上传/删除
- ✅ 图片放大预览
- ✅ 移动端适配
- ✅ 懒加载

### 新增功能
- ✅ 用户认证系统 (JWT)
- ✅ 角色权限控制 (管理员/普通用户)
- ✅ 三种展示样式 (卡片/列表/瀑布流)
- ✅ 图标扩展属性 (项目名、官网、教程等)
- ✅ 一键复制/下载 JSON
- ✅ GitHub 代理支持
- ✅ 缩略图重试机制

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 5 (构建工具)
- shadcn/ui (UI 组件库)
- TailwindCSS (样式框架)
- Zustand (状态管理)
- React Query (服务端状态)
- React Router (路由)

### 后端
- Python 3.9+
- Flask 2.3
- SQLite + SQLAlchemy
- Flask-JWT-Extended
- Pillow (图片处理)
- Gunicorn (生产服务器)

## 快速开始

### Docker 部署 (推荐)

```bash
# 克隆项目
git clone https://github.com/your-repo/hd-icons-refactor.git
cd hd-icons-refactor

# 构建并启动
cd docker
docker-compose up -d

# 访问
http://localhost:50560
```

### 手动部署

#### 后端
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

#### 前端
```bash
cd frontend
npm install
npm run dev
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| TITLE | 网站标题 | 小迪的图标库 |
| ALL_PROXY | HTTP 代理地址 | 空 |
| CUSTOM_URL | 自定义复制地址前缀 | GitHub Raw |
| GITHUB_PROXY_URL | GitHub 代理地址 | 空 |
| DEFAULT_USERNAME | 默认管理员用户名 | admin |
| DEFAULT_PASSWORD | 默认管理员密码 | hdicons |
| JWT_SECRET_KEY | JWT 密钥 | 随机生成 |

## 默认账号

- 用户名: `admin`
- 密码: `hdicons`

**生产环境请务必修改默认密码!**

## 项目结构

```
hd-icons-refactor/
├── frontend/           # 前端代码 (React)
│   ├── src/
│   │   ├── components/ # 组件
│   │   ├── pages/      # 页面
│   │   ├── stores/     # 状态管理
│   │   ├── services/   # API 服务
│   │   └── lib/        # 工具函数
│   └── package.json
├── backend/            # 后端代码 (Flask)
│   ├── app/
│   │   ├── routes/     # 路由
│   │   ├── services/   # 业务服务
│   │   ├── models/     # 数据模型
│   │   └── utils/      # 工具函数
│   └── requirements.txt
├── docker/             # Docker 配置
│   ├── Dockerfile
│   └── docker-compose.yml
└── docs/               # 文档
    ├── 项目重构全量报告.md
    └── 项目重构分步实施手册.md
```

## API 文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户
- `POST /api/auth/change-password` - 修改密码

### 图标接口
- `GET /api/icons` - 获取图标列表
- `POST /api/icons/upload` - 上传图标
- `DELETE /api/icons/:filename` - 删除图标
- `POST /api/icons/json` - 生成 JSON
- `GET /api/check-update` - 检查更新

### 用户管理 (管理员)
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

## 权限说明

| 操作 | 未登录 | 普通用户 | 管理员 |
|------|--------|----------|--------|
| 浏览/搜索 | ✅ | ✅ | ✅ |
| 复制/JSON | ❌ | ✅ | ✅ |
| 上传图标 | ❌ | ✅ | ✅ |
| 删除自己上传 | ❌ | ✅ | ✅ |
| 删除他人上传 | ❌ | ❌ | ✅ |
| 编辑图标属性 | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |

## 许可证

MIT License

## 致谢

- 原项目: [xushier/HD-Icons](https://github.com/xushier/HD-Icons)
- UI 组件: [shadcn/ui](https://ui.shadcn.com/)
