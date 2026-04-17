' ============================================
' WebfullSec — Agente de Sincronização Silencioso
' Roda o watch-and-sync.js em segundo plano (sem janela).
' Autoria: Webfull (https://webfull.com.br)
' Versão: 1.0.0
' ============================================
' Como usar:
'   Dê duplo clique neste arquivo, ou coloque-o
'   na pasta de Inicialização do Windows para
'   rodar automaticamente sem aparecer nada.
' ============================================

Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' Parâmetro 0 = janela completamente oculta
' Parâmetro False = não aguarda o processo terminar (roda em background)
WshShell.Run "node D:\ProjetosWebfull\WebfullSec\scripts\watch-and-sync.js", 0, False

Set WshShell = Nothing
