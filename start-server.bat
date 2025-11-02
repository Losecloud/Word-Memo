@echo off
chcp 65001 >nul
color 0A
echo.
echo ════════════════════════════════════════
echo    词忆 - 局域网服务器启动工具
echo ════════════════════════════════════════
echo.

REM 切换到脚本所在目录
cd /d "%~dp0"

echo [1/3] 正在检查Python环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到Python，尝试使用python3...
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 错误：未安装Python
        echo 请安装Python后再运行此脚本
        echo 下载地址：https://www.python.org/downloads/
        echo.
        pause
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)
echo ✅ Python环境正常

echo.
echo [2/3] 正在获取本机IP地址...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%
echo ✅ 本机IP：%IP%

echo.
echo [3/3] 正在启动服务器...
echo.
echo ════════════════════════════════════════
echo    服务器已启动！
echo ════════════════════════════════════════
echo.
echo 📱 手机访问地址：
echo    http://%IP%:8000
echo.
echo 💻 PC访问地址（推荐）：
echo    http://%IP%:8000
echo.
echo 📝 提示：
echo    1. 确保手机和PC连接同一个WiFi
echo    2. PC和手机都用上面的IP地址访问
echo    3. 请保持此窗口打开
echo    4. 按Ctrl+C可停止服务器
echo ════════════════════════════════════════
echo.

REM 启动服务器
%PYTHON_CMD% -m http.server 8000

echo.
echo 服务器已停止
pause

