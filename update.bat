@echo off
setlocal
echo.
echo =====================================
echo        Study Helper Updater
echo =====================================
echo.
if not exist ".git" (
  echo Git repository not configured yet.
  echo Clone the private GitHub repository first.
  pause
  exit /b 1
)
git pull origin main
echo.
echo Update complete.
pause