const fs = require('fs');
const { execSync } = require('child_process');

const ps = `
$sh = New-Object -ComObject WScript.Shell
$appDir = "C:\\Users\\CRISTIAN\\.gemini\\antigravity\\scratch\\streaming_app"
$vbsPath = "$appDir\\launch_streamflix.vbs"
$ico = "$appDir\\streamflix.ico,0"
$wscript = "C:\\Windows\\System32\\wscript.exe"

@("StreamFlix.lnk", "StreamFlix Desktop.lnk").ForEach({
    $lnkPath = Join-Path "C:\\Users\\CRISTIAN\\Desktop" $_
    $sc = $sh.CreateShortcut($lnkPath)
    $sc.TargetPath = $wscript
    $sc.Arguments = '"' + $vbsPath + '"'
    $sc.WorkingDirectory = $appDir
    $sc.IconLocation = $ico
    $sc.Description = "StreamFlix - Peliculas y Series Nativo"
    $sc.Save()
    Write-Output ("Configurado: " + $lnkPath)
})
`;

fs.writeFileSync('update_lnk.ps1', ps);
try {
  const out = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File update_lnk.ps1', { encoding: 'utf8' });
  console.log(out);
} finally {
  if (fs.existsSync('update_lnk.ps1')) fs.unlinkSync('update_lnk.ps1');
}
