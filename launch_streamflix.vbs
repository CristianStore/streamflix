Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = "C:\Users\CRISTIAN\.gemini\antigravity\scratch\streaming_app\backend"

' Verificar si el servidor ya esta corriendo en el puerto 3000
Set objExec = WshShell.Exec("cmd /c netstat -aon | findstr "":3000 "" | findstr ""LISTENING""")
strOut = objExec.StdOut.ReadAll()

If InStr(strOut, "LISTENING") = 0 Then
    ' Iniciar servidor Node.js en segundo plano sin ventana
    WshShell.CurrentDirectory = appDir
    WshShell.Run "node src/server.js", 0, False
    WScript.Sleep 1500
End If

' Buscar ejecutable de Google Chrome o Edge
chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
chromePath86 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
edgePath64 = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"

browserExe = ""
If fso.FileExists(chromePath) Then
    browserExe = chromePath
ElseIf fso.FileExists(chromePath86) Then
    browserExe = chromePath86
ElseIf fso.FileExists(edgePath) Then
    browserExe = edgePath
ElseIf fso.FileExists(edgePath64) Then
    browserExe = edgePath64
End If

If browserExe <> "" Then
    ' Abrir en modo Programa de Escritorio (Standalone Window App)
    appCmd = """" & browserExe & """ --app=""http://localhost:3000"" --window-size=1400,900"
    WshShell.Run appCmd, 1, False
Else
    ' Fallback abrir navegador predeterminado
    WshShell.Run "http://localhost:3000", 1, False
End If
