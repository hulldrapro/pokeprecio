@echo off
chcp 65001 >nul
title Celular en el PC (scrcpy)
echo ================================================================
echo  Ver y manejar tu celular Android en el PC (scrcpy)
echo ================================================================
echo  La primera vez, en el celular:
echo   1. Ajustes ^> Acerca del telefono ^> toca 7 veces "Numero de compilacion"
echo   2. Ajustes ^> Sistema ^> Opciones de desarrollador ^> activa "Depuracion USB"
echo   3. Conecta el cable USB y acepta "Permitir depuracion USB" en el celular
echo.
echo  Truco: arrastra PokePrecio.apk a la ventana del celular para instalarlo.
echo ================================================================
echo.
set SCRCPY=%LOCALAPPDATA%\Microsoft\WinGet\Links\scrcpy.exe
if not exist "%SCRCPY%" set SCRCPY=scrcpy
"%SCRCPY%" --window-title "Mi celular" --stay-awake
if errorlevel 1 (
  echo.
  echo No se encontro el celular. Revisa el cable y que aceptaste la depuracion USB.
  pause
)
