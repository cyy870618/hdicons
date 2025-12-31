# HD-Icons 重构版 Dockerfile
FROM python:3.9-slim

LABEL maintainer="xiaodi"
LABEL description="HD-Icons 高清图标管理系统"
LABEL version="2.0.0"

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    git \
    libjpeg-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ .

# 复制前端构建产物（CI/CD 会先构建前端）
COPY frontend/dist/ /app/static/

# 创建必要目录
RUN mkdir -p /app/icons /app/icons/upload /app/icons/thumbnails

# 设置环境变量
ENV FLASK_ENV=production
ENV TITLE="小迪的图标库"

# 暴露端口
EXPOSE 50560

# 设置数据卷
VOLUME /app/icons

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:50560/api/system/info || exit 1

# 启动命令
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:50560", "--timeout", "120", "app:app"]
