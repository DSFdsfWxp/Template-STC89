@echo off

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 goto f
echo Error: No Node.js runtime found.
echo # Failed.
exit 1

:f
node ./compiler.js ../project.json