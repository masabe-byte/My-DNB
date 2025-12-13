' Dual-N-Back 启动脚本
' 双击运行即可启动服务器并打开浏览器

Set WshShell = CreateObject("WScript.Shell")

' 获取脚本所在目录
strPath = Replace(WScript.ScriptFullName, WScript.ScriptName, "")

' 启动服务器 (隐藏命令行窗口)
WshShell.Run "cmd /c cd /d """ & strPath & """ && npx -y serve -l 3000", 0, False

' 等待服务器启动
WScript.Sleep 2000

' 打开浏览器
WshShell.Run "http://localhost:3000"
