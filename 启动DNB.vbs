' Dual-N-Back startup script
' Silently starts the local Tauri development app.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Use the folder that contains this script as the app root.
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = scriptDir
WshShell.Run "npm start", 0, False

Set WshShell = Nothing
Set fso = Nothing
