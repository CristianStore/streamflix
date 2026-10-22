Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\StreamFlix.lnk")
WScript.Echo "TargetPath: " & oShortcut.TargetPath
WScript.Echo "Arguments: " & oShortcut.Arguments
WScript.Echo "WorkingDir: " & oShortcut.WorkingDirectory
WScript.Echo "Icon: " & oShortcut.IconLocation
