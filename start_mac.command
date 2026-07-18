#!/bin/bash
# Mac 启动脚本：双击运行后自动打开浏览器
cd "$(dirname "$0")"
PORT=8137
( sleep 1 && open "http://localhost:$PORT" ) &
echo "服务已启动: http://localhost:$PORT  (按 Ctrl+C 停止)"
python3 -m http.server $PORT
