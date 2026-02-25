@echo off
cd /d D:\GOTHYXAN
set ADMIN_PASSWORD=ChangeMe123!
npm.cmd --workspace backend run start:dev > backend.runtime.out.log 2> backend.runtime.err.log
