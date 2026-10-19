@echo off
chcp 65001 >nul
title KHỞI ĐỘNG CỬA HÀNG LAPTOP99 (FRONTEND KHÁCH HÀNG + BACKEND API)
echo ========================================================
echo     ĐANG KHỞI ĐỘNG CỬA HÀNG KHÁCH HÀNG LAPTOP99
echo ========================================================
echo.

echo 1. Kiểm tra MySQL (Cổng 3306)...
netstat -aon | findstr ":3306" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo    MySQL chưa chạy, đang khởi động từ XAMPP...
  start "" "c:\xampp\mysql_start.bat"
  timeout /t 3 /nobreak >nul
) else (
  echo    MySQL đã đang chạy sẵn sàng (Cổng 3306).
)

echo 2. Kiểm tra Backend API (Cổng 4000)...
netstat -aon | findstr ":4000" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo    Đang khởi động Backend API...
  start "Laptop Shop - Backend API (Cổng 4000)" cmd /k "cd /d %~dp0laptop-shop-admin-backend\laptop-shop-admin-backend && npm start"
  timeout /t 2 /nobreak >nul
) else (
  echo    Backend API đã đang chạy sẵn sàng (Cổng 4000).
)

echo 3. Mở Giao diện Khách hàng Laptop99 (index.html)...
start "" "%~dp0index.html"

echo.
echo ========================================================
echo    HỆ THỐNG CỬA HÀNG ĐÃ SẴN SÀNG!
echo    - Trang khách hàng: index.html (đã mở trên trình duyệt)
echo    - Backend API:       http://localhost:4000/api/client
echo    - Tài khoản demo:    khach@demo.vn / 123456
echo      (Hoặc đăng ký tài khoản mới trực tiếp trên giao diện)
echo ========================================================
echo.
pause
