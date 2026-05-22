@echo off
setlocal

set ROOT=%~dp0..
cd /d "%ROOT%"

if "%URBAN_ANNOTATION_HOST%"=="" set URBAN_ANNOTATION_HOST=127.0.0.1
if "%URBAN_ANNOTATION_PORT%"=="" set URBAN_ANNOTATION_PORT=7860
if "%UAIV_BROWSE_ROOTS%"=="" set UAIV_BROWSE_ROOTS=%ROOT%\sample_data
if "%UAIV_DEFAULT_BROWSE_PATH%"=="" set UAIV_DEFAULT_BROWSE_PATH=%ROOT%\sample_data
if "%UAIV_QA_ROOT%"=="" set UAIV_QA_ROOT=%ROOT%\sample_data\qa
set UAIV_OFFLINE_DEMO=1

echo Starting UAIV-Labeler Offline Demo
echo Root: %ROOT%
echo Browse roots: %UAIV_BROWSE_ROOTS%
echo Open: http://%URBAN_ANNOTATION_HOST%:%URBAN_ANNOTATION_PORT%

python app/server.py

