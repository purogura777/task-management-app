!include "FileFunc.nsh"
!include "LogicLib.nsh"

Var StartMenuFolder

!macro preInit
  StrCpy $StartMenuFolder "TaskManagerDesktop"
!macroend

!macro customInit
  ; Close running instances to avoid file lock
  nsExec::ExecToStack 'taskkill /F /IM TaskManagerDesktop.exe'
  Pop $0
  nsExec::ExecToStack 'taskkill /F /IM TaskManagerDesktop.Portable.exe'
  Pop $1
!macroend

!macro customInstall
  ; Create Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
  CreateShortCut "$SMPROGRAMS\$StartMenuFolder\TaskManagerDesktop.lnk" "$INSTDIR\TaskManagerDesktop.exe"
!macroend

!macro customUnInstall
  ; Remove Start Menu shortcut
  Delete "$SMPROGRAMS\$StartMenuFolder\TaskManagerDesktop.lnk"
  RMDir "$SMPROGRAMS\$StartMenuFolder"
!macroend
