@echo off
setlocal EnableExtensions
title Study Helper Updater
cd /d "%~dp0"

echo.
echo =====================================
echo        Study Helper Updater
echo =====================================
echo.

REM Find Git even when the installer did not add it to PATH.
where git >nul 2>&1
if not errorlevel 1 goto :git_found
if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" set "PATH=%ProgramFiles(x86)%\Git\cmd;%PATH%"
if exist "%LocalAppData%\Programs\Git\cmd\git.exe" set "PATH=%LocalAppData%\Programs\Git\cmd;%PATH%"
where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git could not be found.
  echo.
  echo Install Git for Windows from https://git-scm.com/download/win
  echo Then close and reopen this updater.
  pause
  exit /b 1
)
:git_found
for /f "delims=" %%G in ('git --version 2^>nul') do echo %%G

echo.
if exist ".git\HEAD" goto :existing_repo

echo This folder is not connected to Git yet.
echo The updater will connect it to the public Study Helper repository.
echo Existing project files will be replaced by the latest repository version.
echo.
set /p choice=Set up automatic updates now? (Y/N): 
if /I not "%choice%"=="Y" (
  echo Setup cancelled.
  pause
  exit /b 0
)

git init
if errorlevel 1 goto :error
git remote remove origin >nul 2>&1
git remote add origin https://github.com/Nembz3/Study-Helper.git
if errorlevel 1 goto :error
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
echo From now on, double-click update.bat to update Study Helper.
goto :done

:existing_repo
echo Git repository detected.
git remote get-url origin >nul 2>&1
if errorlevel 1 git remote add origin https://github.com/Nembz3/Study-Helper.git

git fetch origin main
if errorlevel 1 goto :error
git checkout -B main origin/main
if errorlevel 1 goto :error
git reset --hard origin/main
if errorlevel 1 goto :error

echo.
echo =====================================
echo Update complete!
echo =====================================
echo.
echo Reload Study Helper at edge://extensions, then reopen Seneca.
goto :done

:error
echo.
echo =====================================
echo Update failed.
echo =====================================
echo Check your internet connection and GitHub access.
echo.
pause
exit /b 1

:done
pause
exit /b 0
