@echo off
rem ============================================
rem  CiYi Dictionary Server Launcher (import save)
rem  Kills old serve.js, restarts local server(8377)
rem  in a HIDDEN window, opens browse-dict.html.
rem  ASCII-only file (avoids codepage crashes).
rem ============================================
setlocal
cd /d "%~dp0"

rem --- hide this cmd window via a tiny VBS ---
set "SELF=%TEMP%\ciyi_hide_%RANDOM%.vbs"
> "%SELF%" (
  echo Set sh = CreateObject("WScript.Shell")
  echo For Each w In sh.Windows
  echo   If InStr(1, w.FullName, "cmd.exe", 1) ^> 0 Then w.Visible = False
  echo Next
)
cscript //nologo "%SELF%" >nul 2>&1
del /q "%SELF%" >nul 2>&1

echo [1/3] Stopping old dictionary server (node serve.js)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'serve\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo Done.

echo [2/3] Starting dictionary server (hidden) http://localhost:8377 ...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo.
    timeout /t 5 /nobreak >nul
    exit /b 1
)
rem launch node hidden via a VBS window (no console window)
set "RUNVBS=%TEMP%\ciyi_run_%RANDOM%.vbs"
> "%RUNVBS%" (
  echo Set sh = CreateObject("WScript.Shell")
  echo sh.CurrentDirectory = "%~dp0"
  echo sh.Run "node ""%~dp0serve.js""", 0, False
)
cscript //nologo "%RUNVBS%" >nul 2>&1
del /q "%RUNVBS%" >nul 2>&1

rem wait for the port to be ready
timeout /t 2 /nobreak >nul

echo [3/3] Opening dictionary import page ...
start "" "%~dp0browse-dict.html"

echo.
echo All done. Import a MDX, then click "Save to data directory".
echo The dictionary server keeps running hidden in the background.
timeout /t 3 /nobreak >nul
endlocal
