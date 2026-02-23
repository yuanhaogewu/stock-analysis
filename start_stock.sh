#!/bin/zsh

# 获取当前脚本所在目录
BASE_DIR="/Users/apple/stock"

echo "正在启动股票分析工具..."

# 启动后端服务 (在新终端窗口中)
osascript -e "tell application \"Terminal\" to do script \"cd $BASE_DIR/backend && source venv/bin/activate && python main.py\""

# 启动前端服务 (在新终端窗口中)
osascript -e "tell application \"Terminal\" to do script \"cd $BASE_DIR/frontend && npm run dev -- -p 3002\""

echo "启动指令已开启。请查看新打开的终端窗口。"
echo "稍后您可以访问：http://localhost:3002"
