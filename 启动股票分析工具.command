#!/bin/zsh

# 获取脚本所在文件夹的绝对路径
DIR=$(cd "$(dirname "$0")"; pwd)

echo "------------------------------------------"
echo "   股票分析工具 - 一键启动助手"
echo "------------------------------------------"
echo ""

# 启动后端服务
echo "[1/2] 正在打开后端服务窗口..."
osascript -e "tell application \"Terminal\" to do script \"cd '$DIR/backend' && source venv/bin/activate && python main.py\""

# 等待一秒避免窗口重叠太死
sleep 1

# 启动前端服务
echo "[2/2] 正在打开前端界面窗口..."
osascript -e "tell application \"Terminal\" to do script \"cd '$DIR/frontend' && npm run dev -- -p 3002\""

echo ""
echo "全部启动指令已发出！"
echo "请等待几秒钟，直到前端窗口显示 'Ready'。"
echo "然后访问: http://localhost:3002"
echo ""
echo "提示：您可以保持这些窗口开启。需要关闭时，直接关闭窗口即可。"
echo "------------------------------------------"

# 保持窗口开启一会儿，让用户看到信息
sleep 5
exit
