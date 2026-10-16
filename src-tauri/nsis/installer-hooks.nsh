; AS x11 — tema moderno (oscuro) del instalador NSIS/MUI2.
; Este archivo se incluye antes de definir las paginas del asistente.

!define MUI_ABORTWARNING

; Fondo oscuro para las paginas de bienvenida y finalizacion.
!define MUI_BGCOLOR "0E1116"

; Coloca la marca grafica a la derecha en las paginas interiores.
!define MUI_HEADERIMAGE_RIGHT

; --- Pagina de bienvenida ---
!define MUI_WELCOMEPAGE_TITLE "Instala AS x11"
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_WELCOMEPAGE_TEXT "El configurador moderno para tu raton Attack Shark X11: DPI, iluminacion, botones, macros, perfiles y bateria.$\r$\n$\r$\nSe instala en tu carpeta de usuario, sin pedir permisos de administrador."

; --- Pagina final ---
!define MUI_FINISHPAGE_TITLE "Todo listo"
!define MUI_FINISHPAGE_TITLE_3LINES
!define MUI_FINISHPAGE_TEXT "AS x11 se ha instalado correctamente.$\r$\n$\r$\nPulsa Finalizar para empezar a configurar tu raton."
!define MUI_FINISHPAGE_RUN_TEXT "Abrir AS x11"

; Preserve opt-in at upgrade time, before the new app is first launched.
!macro NSIS_HOOK_POSTINSTALL
  ReadRegStr $R8 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AS x11"
  ${If} $R8 != ""
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AS x11" '$\"$INSTDIR\openshark.exe$\" --background'
  ${EndIf}
!macroend
