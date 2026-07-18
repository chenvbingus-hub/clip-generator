@echo off
rem Windows 启动脚本：双击运行后自动打开浏览器
cd /d %~dp0
start "" http://localhost:8137
echo 服务已启动: http://localhost:8137  (关闭本窗口即停止)
python -m http.server 8137
