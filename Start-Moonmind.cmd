@echo off
setlocal
cd /d "%~dp0"
set "MOONMIND_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined MOONMIND_NODE set "MOONMIND_NODE=%%N"
if not defined MOONMIND_NODE (
  for /d %%R in ("%LOCALAPPDATA%\OpenAI\Codex\runtimes\cua_node\*") do (
    if exist "%%~fR\bin\node.exe" set "MOONMIND_NODE=%%~fR\bin\node.exe"
  )
)
if not defined MOONMIND_NODE (
  echo Install Node.js 24 or later, then run this file again.
  pause
  exit /b 1
)
echo Starting MOONMIND locally. Ctrl+C stops the server.
"%MOONMIND_NODE%" "%~dp0scripts\local.mjs"
set "MOONMIND_EXIT=%ERRORLEVEL%"
if not "%MOONMIND_EXIT%"=="0" pause
exit /b %MOONMIND_EXIT%
