@echo off
chcp 65001 >nul
cd /d "%~dp0"
node src/build.mjs || (echo. & echo 生成失败，请看上面的报错。 & pause & exit /b 1)
node serve.mjs --open
