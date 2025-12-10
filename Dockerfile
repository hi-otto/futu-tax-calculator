# 富途税务计算器 Docker 配置
# 使用多阶段构建：Bun 构建 + Nginx 静态服务
#
# 构建: docker build -t futu-tax-calculator .
# 运行: docker run -d -p 3020:80 futu-tax-calculator

# ========== 构建阶段 ==========
FROM oven/bun:1 AS builder
WORKDIR /app

# 安装依赖
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 复制源代码
COPY . .

# 构建静态文件到 dist 目录
RUN bun run build

# ========== 生产阶段 ==========
FROM nginx:alpine-slim AS production

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制静态文件到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
