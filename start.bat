@echo off
echo Iniciando Sistema Financeiro 3C Engenharia...
cd /d %~dp0
set PATH=C:\Program Files\nodejs;%PATH%

echo Verificando banco de dados...
npx prisma migrate deploy

echo Iniciando servidor...
npm start
