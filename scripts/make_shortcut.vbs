Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDesktop = WshShell.SpecialFolders("Desktop")

appDir = "C:\Users\CRISTIAN\.gemini\antigravity\scratch\streaming_app"
electronExe = appDir & "\node_modules\electron\dist\electron.exe"
iconPath = appDir & "\streamflix.ico, 0"

' 1. Acceso directo principal: StreamFlix.lnk
shortcutPath1 = strDesktop & "\StreamFlix.lnk"
Set o1 = WshShell.CreateShortcut(shortcutPath1)
o1.TargetPath = electronExe
o1.Arguments = "."
o1.WorkingDirectory = appDir
o1.WindowStyle = 1
o1.IconLocation = iconPath
o1.Description = "StreamFlix - Tu cine en casa (Nativo y Fluido)"
o1.Save
WScript.Echo "Actualizado: " & shortcutPath1

' 2. Acceso directo secundario: StreamFlix Desktop.lnk
shortcutPath2 = strDesktop & "\StreamFlix Desktop.lnk"
Set o2 = WshShell.CreateShortcut(shortcutPath2)
o2.TargetPath = electronExe
o2.Arguments = "."
o2.WorkingDirectory = appDir
o2.WindowStyle = 1
o2.IconLocation = iconPath
o2.Description = "StreamFlix - Tu cine en casa (Nativo y Fluido)"
o2.Save
WScript.Echo "Actualizado: " & shortcutPath2

' 3. Actualizar StreamFlix (1).lnk también para que funcione directamente
shortcutPath3 = strDesktop & "\StreamFlix (1).lnk"
If fso.FileExists(shortcutPath3) Then
    Set o3 = WshShell.CreateShortcut(shortcutPath3)
    o3.TargetPath = electronExe
    o3.Arguments = "."
    o3.WorkingDirectory = appDir
    o3.WindowStyle = 1
    o3.IconLocation = iconPath
    o3.Description = "StreamFlix - Tu cine en casa (Nativo y Fluido)"
    o3.Save
    WScript.Echo "Actualizado: " & shortcutPath3
End If
