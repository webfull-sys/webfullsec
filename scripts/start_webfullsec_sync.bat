@echo off
title WebfullSec — Agente de Sincronização Local
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║  WebfullSec — Agente de Sincronização   ║
echo  ║  Webfull (https://webfull.com.br)        ║
echo  ╚══════════════════════════════════════════╝
echo.
echo  Monitorando:
echo  [LocalWP]  C:\Users\LuizFerreira\Local Sites
echo  [Projetos] D:\ProjetosWebfull
echo.
echo  Conectando ao WebfullSec em:
echo  https://webfullsec.webfullvps.com.br
echo.
echo  Pressione Ctrl+C para parar.
echo  ─────────────────────────────────────────────
echo.

node D:\ProjetosWebfull\WebfullSec\scripts\watch-and-sync.js
