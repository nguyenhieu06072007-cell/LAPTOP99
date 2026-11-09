@echo off
chcp 65001 >nul
title KHOI DONG LAPTOP99 BANG DOCKER
echo ========================================================
echo     DANG KHOI DONG HE THONG LAPTOP99 BANG DOCKER
echo ========================================================
echo.
docker --version >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] Chua tim thay Docker CLI hoac Docker Desktop chua duoc bat.
    echo Vui long cai dat va mo Docker Desktop truoc khi chay:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b
)

echo Dang tu dong build va khoi dong cac container (MySQL, Backend, Admin, Storefront)...
docker compose up -d --build

echo.
echo ========================================================
echo    HE THONG LAPTOP99 DOCKER DA SAN SANG!
echo    - Trang Khach hang (Storefront): http://localhost:3000
echo    - Trang Quan tri (Admin):        http://localhost:5173
echo    - Backend REST API:             http://localhost:4000/api
echo ========================================================
echo.
pause

