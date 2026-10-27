@echo off
echo ========================================================
echo Starting DecentraSocial Full-Stack Platform Services
echo ========================================================

set ROOT=%~dp0

echo [1/4] Starting Ganache Blockchain (Port 8545)...
start "1. Ganache Blockchain (Port 8545)" cmd /k "cd /d %ROOT%blockchain && npx ganache --port 8545 --deterministic"

timeout /t 6 /nobreak > nul

echo [2/4] Deploying Smart Contracts...
cd /d %ROOT%blockchain && npx hardhat run scripts/deploy.ts --network ganache

echo [3/4] Starting Express Backend (Port 5000)...
start "2. Backend API (Port 5000)" cmd /k "cd /d %ROOT%backend && npm run dev"

echo [4/4] Starting FastAPI ML Service (Port 8000)...
start "3. ML Service (Port 8000)" cmd /k "cd /d %ROOT%ml-service && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [5/5] Starting React Frontend (Port 5173)...
start "4. React Frontend (Port 5173)" cmd /k "cd /d %ROOT%frontend && npm run dev"

echo.
echo All services launched!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo ML API:   http://localhost:8000
echo Ganache:  http://127.0.0.1:8545
echo.
pause
