Set WshShell = CreateObject("WScript.Shell")

REM Start server in background
WshShell.Run "cmd /c cd /d ""C:\Users\henry\OneDrive\Documents\Arduino\user-management-server"" && start /min node server.js", 0, False

REM Wait 3 seconds for server to start
WScript.Sleep 3000

REM Start tray monitor
WshShell.Run "cmd /c cd /d ""C:\Users\henry\OneDrive\Documents\Arduino\user-management-server"" && npx electron simple-tray.js", 0, False

