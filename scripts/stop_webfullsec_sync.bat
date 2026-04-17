@echo off
title WebfullSec — Parando Agente
echo Encerrando o agente WebfullSec...
taskkill /F /FI "WINDOWTITLE eq WebfullSec*" /T >nul 2>&1
taskkill /F /IM "node.exe" /FI "COMMANDLINE eq *watch-and-sync*" >nul 2>&1
:: Fallback: encerra qualquer node.exe que esteja rodando o script
wmic process where "name='node.exe' and commandline like '%%watch-and-sync%%'" delete >nul 2>&1
echo Agente encerrado com sucesso.
timeout /t 2 /nobreak >nul
