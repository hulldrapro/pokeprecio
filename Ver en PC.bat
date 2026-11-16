@echo off
chcp 65001 >nul
title PokéPrecio en el PC
cd /d "%~dp0"

rem tesseract (lector OCR) se instala FUERA de OneDrive, una sola vez
if not exist "%LOCALAPPDATA%\PokePrecio\node_modules\tesseract.js" (
  echo Instalando el lector de cartas por primera vez...
  if not exist "%LOCALAPPDATA%\PokePrecio" mkdir "%LOCALAPPDATA%\PokePrecio"
  pushd "%LOCALAPPDATA%\PokePrecio"
  call npm install tesseract.js@7.0.0 --no-audit --no-fund
  popd
)

rem servidor local en segundo plano
start "PokéPrecio servidor" /min node "%~dp0scripts\servidor-pc.js"
timeout /t 2 /nobreak >nul

rem ventana tamaño celular (Edge en modo app)
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if exist "%EDGE%" (
  start "" "%EDGE%" --app=http://localhost:8765 --window-size=430,920 --user-data-dir="%LOCALAPPDATA%\PokePrecio\edge"
) else (
  start "" http://localhost:8765
)
echo.
echo PokéPrecio abierto en http://localhost:8765
echo Cierra la ventana minimizada "PokéPrecio servidor" para apagarlo.
timeout /t 4 >nul
