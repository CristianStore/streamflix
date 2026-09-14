@echo off
REM Script rápido para convertir cualquier video MP4 a HLS (.m3u8)
if "%~1"=="" (
    echo.
    echo =======================================================
    echo Convertidor de Video a HLS para StreamFlix
    echo =======================================================
    echo Uso: convert.bat ^<video.mp4^> [carpeta_salida]
    echo.
    echo Ejemplo: convert.bat sintel.mp4 streams\sintel
    echo =======================================================
    exit /b 1
)

set INPUT_FILE=%~1
set OUTPUT_DIR=%~2
if "%OUTPUT_DIR%"=="" set OUTPUT_DIR=streams\output

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Convirtiendo %INPUT_FILE% a streaming HLS...
ffmpeg -i "%INPUT_FILE%" -codec:v libx264 -preset veryfast -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "%OUTPUT_DIR%\segmento_%%03d.ts" "%OUTPUT_DIR%\playlist.m3u8"

echo.
echo Proceso finalizado. Manifiesto: %OUTPUT_DIR%\playlist.m3u8
