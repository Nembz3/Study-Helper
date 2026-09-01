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
  echo Install Git for Windows, then run this updater again.
  pause
  exit /b 1
)

if exist ".git" (
  echo Git repository detected.
  echo Checking for updates...
  git pull origin main
  if errorlevel 1 (
    echo.
    echo Update failed. Check your internet connection and GitHub access.
    pause
    exit /b 1
  )
  echo.
  echo =====================================
  echo Update complete!
  echo You can now reload Study Helper in edge://extensions
  echo =====================================
  pause
  exit /b 0
)

echo This folder was installed from a ZIP file.
echo.
echo The updater needs to convert it into a Git clone once.
echo Your existing files will be replaced with the latest version.
echo.
set /p choice=Set up automatic updates now? (Y/N): 

if /I not "%choice%"=="Y" (
  echo Setup cancelled.
  pause
  exit /b 0
)

echo.
echo Setting up Git repository...
git init
if errorlevel 1 goto :error

git remote add origin https://github.com/Nembz3/Study-Helper.git 2>nul
git fetch origin main
if errorlevel 1 goto :error

git reset --hard origin/main
if errorlevel 1 goto :error

git branch -M main
git branch --set-upstream-to=origin/main main >nul 2>&1

echo.
echo =====================================
echo Automatic updates are now configured!
echo =====================================
echo.
echo From now on, double-click update.bat to get updates.
echo.
pause
exit /b 0

:error
echo.
echo =====================================
echo Setup failed.
echo Make sure you have access to the private GitHub repository.
echo =====================================
pause
exit /b 1