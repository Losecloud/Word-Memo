#!/bin/bash

# 词忆 - 局域网服务器启动工具（Mac/Linux）

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "════════════════════════════════════════"
echo "   词忆 - 局域网服务器启动工具"
echo "════════════════════════════════════════"
echo ""

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 检查Python环境
echo "[1/3] 正在检查Python环境..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    echo -e "${GREEN}✅ Python环境正常${NC}"
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
    echo -e "${GREEN}✅ Python环境正常${NC}"
else
    echo -e "${RED}❌ 错误：未安装Python${NC}"
    echo "请先安装Python3"
    exit 1
fi

# 获取本机IP
echo ""
echo "[2/3] 正在获取本机IP地址..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac OS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi
echo -e "${GREEN}✅ 本机IP：$IP${NC}"

# 启动服务器
echo ""
echo "[3/3] 正在启动服务器..."
echo ""
echo "════════════════════════════════════════"
echo "   服务器已启动！"
echo "════════════════════════════════════════"
echo ""
echo -e "${BLUE}📱 手机访问地址：${NC}"
echo "   http://$IP:8000"
echo ""
echo -e "${BLUE}💻 PC访问地址（推荐）：${NC}"
echo "   http://$IP:8000"
echo ""
echo -e "${YELLOW}📝 提示：${NC}"
echo "   1. 确保手机和PC连接同一个WiFi"
echo "   2. PC和手机都用上面的IP地址访问"
echo "   3. 请保持此窗口打开"
echo "   4. 按Ctrl+C可停止服务器"
echo "════════════════════════════════════════"
echo ""

# 启动HTTP服务器
$PYTHON_CMD -m http.server 8000

echo ""
echo "服务器已停止"

