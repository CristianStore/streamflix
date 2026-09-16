@echo off
title Compilador de APK StreamFlix - Android
color 0A
echo ========================================================
echo   StreamFlix - Compilador de APK para Android / TV
echo ========================================================
echo.

cd /d "%~dp0frontend"

echo [1/3] Verificando dependencias de Flutter...
call flutter pub get
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se encontro Flutter en el sistema o hubo un fallo en pub get.
    echo Asegurate de tener Flutter SDK instalado y agregado al PATH.
    pause
    exit /b 1
)

echo.
echo [2/3] Compilando APK de Lanzamiento (Release APK)...
call flutter build apk --release

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo la compilacion del APK.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   ¡EXITO! APK generado satisfactoriamente en:
echo   frontend\build\app\outputs\flutter-apk\app-release.apk
echo ========================================================
echo.
pause
