@echo off
setlocal EnableExtensions
title Study Helper Updater
cd /d "%~dp0"

echo.
echo =====================================
echo        Study Helper Updater
echo =====================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git is not installed or is not in PATH.
  echo Install Git for Windows, then restart this updater.
  pause
  exit /b 1
)

if exist ".git" goto :update

echo This folder was installed from a ZIP file.
echo Automatic updates need a one-time Git setup.
echo.
set /p choice=Set up automatic updates now? (Y/N): 
if /I not "%choice%"=="Y" (
  echo Setup cancelled.
  pause
  exit /b 0
)

echo.
echo Connecting this folder to GitHub...
git init
if errorlevel 1 goto :error
git remote remove origin >nul 2>&1
git remote add origin https://github.com/Nembz3/Study-Helper.git
git fetch origin main
if errorlevel 1 goto :error

git checkout -B main origin/main
if errorlevel 1 goto :error

echo.
echo Automatic updates are now configured!
echo Future updates only require double-clicking update.bat.
pause
exit /b 0

:update
echo Git repository detected.
echo Checking for updates...
git pull --ff-only origin main
if errorlevel 1 (
  echo.
  echo Update failed.
  echo If you changed project files locally, move your changes elsewhere
  echo or use a fresh copy of the repository.
  pause
  exit /b 1
)

echo.
echo =====================================
echo Update complete!
echo Reload Study Helper in edge://extensions
echo then refresh the Seneca tab.
echo =====================================
pause
exit /b 0

:error
echo.
echo =====================================
echo Setup failed.
echo Make sure Git is installed, your internet works,
echo and this GitHub account has access to the private repository.
echo =====================================
pause
exit /b 1