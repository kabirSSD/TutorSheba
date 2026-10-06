@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set LOGFILE=%~dp0setup_mysql.log
echo ============================================== > "%LOGFILE%"
echo Starting MySQL Automated Setup >> "%LOGFILE%"
echo Time: %DATE% %TIME% >> "%LOGFILE%"
echo ============================================== >> "%LOGFILE%"

:: Check for administrative rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    echo Requesting Administrator privileges... >> "%LOGFILE%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ==============================================
echo [1/8] Stopping existing MySQL service (if any)...
echo [1/8] Stopping existing MySQL service (if any)... >> "%LOGFILE%"
sc.exe stop MySQL80 >> "%LOGFILE%" 2>&1
timeout /t 2 /nobreak >nul
sc.exe delete MySQL80 >> "%LOGFILE%" 2>&1

echo [2/8] Cleaning old Data directory...
echo [2/8] Cleaning old Data directory... >> "%LOGFILE%"
if exist "C:\ProgramData\MySQL\MySQL Server 8.0" (
    rmdir /s /q "C:\ProgramData\MySQL\MySQL Server 8.0" >> "%LOGFILE%" 2>&1
)

echo [3/8] Installing MySQL Server (this takes about 15-20 seconds)...
echo [3/8] Installing MySQL Server from MSI package... >> "%LOGFILE%"
set MSI=C:\ProgramData\MySQL\MySQL Installer for Windows\Product Cache\mysql-8.0.46-winx64.msi
msiexec.exe /i "%MSI%" /qn /norestart >> "%LOGFILE%" 2>&1

:: Wait for mysqld.exe to appear
set /a count=0
:WAIT_LOOP
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" goto FOUND_MYSQLD
timeout /t 2 /nobreak >nul
set /a count+=1
if %count% geq 45 goto MYSQLD_TIMEOUT
goto WAIT_LOOP

:FOUND_MYSQLD
echo [4/8] MySQL Server installed successfully.
echo [4/8] MySQL Server installed successfully. >> "%LOGFILE%"

echo [5/8] Creating configuration file (my.ini)...
echo [5/8] Preparing configuration file (my.ini)... >> "%LOGFILE%"
mkdir "C:\ProgramData\MySQL\MySQL Server 8.0" >> "%LOGFILE%" 2>&1
mkdir "C:\ProgramData\MySQL\MySQL Server 8.0\Data" >> "%LOGFILE%" 2>&1

(
echo [mysqld]
echo port=3306
echo basedir="C:/Program Files/MySQL/MySQL Server 8.0/"
echo datadir="C:/ProgramData/MySQL/MySQL Server 8.0/Data"
echo max_connections=151
echo character-set-server=utf8mb4
echo default-storage-engine=INNODB
) > "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"

echo [6/8] Initializing database files...
echo [6/8] Initializing database files with blank root... >> "%LOGFILE%"
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --initialize-insecure --console >> "%LOGFILE%" 2>&1

echo [7/8] Installing and starting Windows service MySQL80...
echo [7/8] Installing and starting Windows service MySQL80... >> "%LOGFILE%"
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --install MySQL80 --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" >> "%LOGFILE%" 2>&1
net start MySQL80 >> "%LOGFILE%" 2>&1

timeout /t 3 /nobreak >nul

echo [8/8] Setting root password to kabir...
echo [8/8] Setting root password to kabir... >> "%LOGFILE%"
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'kabir'; FLUSH PRIVILEGES;" >> "%LOGFILE%" 2>&1

echo ==============================================
echo ============================================== >> "%LOGFILE%"
echo SUCCESS: MySQL Server is now running on port 3306!
echo Root Password is set to: kabir
echo ==============================================
echo ============================================== >> "%LOGFILE%"

echo SUCCESS > "%~dp0setup_success.flag"
echo.
echo Press any key to exit this window...
pause >nul
exit /b 0

:MYSQLD_TIMEOUT
echo.
echo ERROR: Installation timed out. Please check setup_mysql.log
echo ERROR: mysqld.exe not found after 90 seconds. >> "%LOGFILE%"
pause >nul
exit /b 1
