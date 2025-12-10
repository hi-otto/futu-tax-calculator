#!/bin/bash
#
# 富途税务计算器 - Docker Compose 配置生成脚本
# 
# 使用方法:
#   curl -fsSL https://raw.githubusercontent.com/hi-otto/futu-tax-calculator/main/docker-compose-setup.sh | bash
#
# 或者:
#   curl -fsSL https://raw.githubusercontent.com/hi-otto/futu-tax-calculator/main/docker-compose-setup.sh -o setup.sh
#   chmod +x setup.sh && ./setup.sh
#   docker-compose up -d
#

set -e

# 配置
PORT="${PORT:-3020}"
IMAGE="ghcr.io/hi-otto/futu-tax-calculator:latest"

echo "🧮 富途税务计算器 - Docker 部署"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装！请先安装: https://docs.docker.com/get-docker/"
    exit 1
fi

# 生成 docker-compose.yml
cat > docker-compose.yml << EOF
# 富途税务计算器 Docker Compose 配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
#
# 启动: docker-compose up -d
# 停止: docker-compose down
# 日志: docker-compose logs -f

version: '3.8'

services:
  futu-tax:
    image: ${IMAGE}
    container_name: futu-tax-calculator
    ports:
      - "${PORT}:80"
    restart: unless-stopped
EOF

echo "✅ docker-compose.yml 已生成"
echo ""
echo "下一步，运行以下命令启动服务:"
echo ""
echo "  docker-compose up -d"
echo ""
echo "启动后访问: http://localhost:${PORT}"
echo ""
