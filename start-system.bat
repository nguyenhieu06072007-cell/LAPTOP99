@echo off
chcp 65001 >nul
title KHOI DONG HE THONG LAPTOP SHOP
echo ========================================================
echo     DANG KHOI DONG HE THONG LAPTOP SHOP
echo ========================================================
echo.

echo 1. Kiem tra va khoi dong MySQL (Cong 3306)...
netstat -ano | findstr ":3306" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo    - MySQL chua chay. Dang tu dong bat MySQL XAMPP...
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        ping 127.0.0.1 -n 3 >nul
    ) else (
        echo    [CANH BAO] Khong tim thay C:\xampp\mysql. Vui long bat MySQL trong XAMPP!
    )
) else (
    echo    - MySQL dang hoat dong binh thuong tren cong 3306.
)

echo 2. Tu dong giai phong cong 4000 va 5173 neu bi chiem...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
ping 127.0.0.1 -n 2 >nul

echo 3. Khoi dong Backend API (Cong 4000)...
start "Laptop Shop - Backend API (Cong 4000)" cmd /k "cd /d %~dp0laptop-shop-admin-backend\laptop-shop-admin-backend && npm start"
ping 127.0.0.1 -n 3 >nul

echo 4. Khoi dong Frontend Admin (Cong 5173)...
start "Laptop Shop - Frontend Admin (Cong 5173)" cmd /k "cd /d %~dp0laptop-shop-admin && npm run dev"
ping 127.0.0.1 -n 3 >nul

echo 5. Tu dong mo trinh duyet...
start http://localhost:5173

echo.
echo ========================================================
echo    HE THONG DA KHOI DONG THANH CONG!
echo    - Storefront Khach hang: %~dp0index.html
echo    - Frontend Admin:        http://localhost:5173
echo    - Backend API:           http://localhost:4000/api/admin
echo    - Tai khoan dang nhap:   admin@laptopshop.vn
echo    - Mat khau dang nhap:    Admin@123456
echo ========================================================
echo.
pause
