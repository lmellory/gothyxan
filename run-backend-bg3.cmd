@echo off
cd /d D:\GOTHYXAN
set ADMIN_PASSWORD=ChangeMe123!
set OUTFIT_QUEUE_ENABLED=false
npm.cmd --workspace backend run start:dev > backend.runtime3.out.log 2> backend.runtime3.err.log
