Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$scratchDir = "C:\Users\CRISTIAN\.gemini\antigravity\scratch"
$appDir = "$scratchDir\streaming_app"
$buildDir = "$scratchDir\apk_build"
$desktop = [System.Environment]::GetFolderPath('Desktop')

$baseApk = "$buildDir\StreamFlix.apk"
$workApk = "$buildDir\CineNova_unsigned.apk"
Copy-Item $baseApk $workApk -Force

Write-Output "Abriendo APK en modo actualización ZIP en memoria..."
$zip = [System.IO.Compression.ZipFile]::Open($workApk, [System.IO.Compression.ZipArchiveMode]::Update)

# 1. Actualizar resources.arsc
Write-Output "1. Modificando resources.arsc..."
$arscEntry = $zip.GetEntry("resources.arsc")
if ($arscEntry) {
    $ms = New-Object System.IO.MemoryStream
    $s = $arscEntry.Open()
    $s.CopyTo($ms)
    $s.Close()
    $arscBytes = $ms.ToArray()
    $ms.Close()

    $target = [System.Text.Encoding]::UTF8.GetBytes("StreamFlix")
    $replaced = $false
    for ($i = 0; $i -le $arscBytes.Length - $target.Length - 2; $i++) {
        if ($arscBytes[$i] -eq 0x0A -and $arscBytes[$i+1] -eq 0x0A) {
            $match = $true
            for ($j = 0; $j -lt $target.Length; $j++) {
                if ($arscBytes[$i + 2 + $j] -ne $target[$j]) { $match = $false; break }
            }
            if ($match) {
                $arscBytes[$i] = [byte]8
                $arscBytes[$i+1] = [byte]8
                $novaBytes = [System.Text.Encoding]::UTF8.GetBytes("CineNova")
                for ($k = 0; $k -lt $novaBytes.Length; $k++) {
                    $arscBytes[$i + 2 + $k] = $novaBytes[$k]
                }
                $arscBytes[$i + 2 + 8] = [byte]0
                $arscBytes[$i + 2 + 9] = [byte]0
                $arscBytes[$i + 2 + 10] = [byte]0
                $replaced = $true
                Write-Output "Nombre cambiado a 'CineNova' en offset $i"
                break
            }
        }
    }

    if ($replaced) {
        $arscEntry.Delete()
        $newEntry = $zip.CreateEntry("resources.arsc", [System.IO.Compression.CompressionLevel]::Optimal)
        $w = $newEntry.Open()
        $w.Write($arscBytes, 0, $arscBytes.Length)
        $w.Close()
    }
}

# 1.1 Actualizar res/Wo.json (Manifest embebido en APK)
$jsonEntry = $zip.GetEntry("res/Wo.json")
if ($jsonEntry) {
    Write-Output "1.1 Modificando res/Wo.json con metadata de CineNova..."
    $cinenovaManifest = '{"name":"CineNova - Tu Cine en Casa","short_name":"CineNova","description":"El nuevo universo del streaming en películas, series y TV en vivo","start_url":"/","display":"standalone","orientation":"any","background_color":"#141414","theme_color":"#E50914","icons":[{"src":"https://cdn-icons-png.flaticon.com/512/2503/2503508.png","sizes":"192x192","type":"image/png","purpose":"any maskable"},{"src":"https://cdn-icons-png.flaticon.com/512/2503/2503508.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}'
    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($cinenovaManifest)
    $jsonEntry.Delete()
    $newJsonEntry = $zip.CreateEntry("res/Wo.json", [System.IO.Compression.CompressionLevel]::Optimal)
    $w = $newJsonEntry.Open()
    $w.Write($jsonBytes, 0, $jsonBytes.Length)
    $w.Close()
    Write-Output "res/Wo.json actualizado a CineNova exitosamente."
}

# 2. Reemplazar iconos y banners dentro del ZIP
Write-Output "2. Reemplazando iconos y banners con gráficos CineNova..."
$cinenovaIcon = [System.Drawing.Image]::FromFile("$appDir\cinenova.png")
$cinenovaBanner = [System.Drawing.Image]::FromFile("$appDir\tv_banner.png")

function Get-Resized-Bytes($srcImage, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($srcImage, 0, 0, $w, $h)
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return $bytes
}

$squareIcons = @(
    @{ Path="res/AE.png"; W=1200; H=1200 },
    @{ Path="res/9X.png"; W=900; H=900 },
    @{ Path="res/h7.png"; W=600; H=600 },
    @{ Path="res/4d.png"; W=450; H=450 },
    @{ Path="res/QI.png"; W=328; H=328 },
    @{ Path="res/yj.png"; W=300; H=300 },
    @{ Path="res/-N.png"; W=246; H=246 },
    @{ Path="res/o-.png"; W=192; H=192 },
    @{ Path="res/ky.png"; W=164; H=164 },
    @{ Path="res/RJ.png"; W=144; H=144 },
    @{ Path="res/Rm.png"; W=123; H=123 },
    @{ Path="res/7g.png"; W=96; H=96 },
    @{ Path="res/FS.png"; W=96; H=96 },
    @{ Path="res/ex.png"; W=82; H=82 },
    @{ Path="res/yn.png"; W=72; H=72 },
    @{ Path="res/oW.png"; W=72; H=72 },
    @{ Path="res/9w.png"; W=48; H=48 },
    @{ Path="res/rj.png"; W=48; H=48 }
)

foreach ($item in $squareIcons) {
    $entry = $zip.GetEntry($item.Path)
    if ($entry) {
        $bytes = Get-Resized-Bytes $cinenovaIcon $item.W $item.H
        $entry.Delete()
        $newE = $zip.CreateEntry($item.Path, [System.IO.Compression.CompressionLevel]::Optimal)
        $w = $newE.Open()
        $w.Write($bytes, 0, $bytes.Length)
        $w.Close()
        Write-Output "Icono actualizado: $($item.Path) ($($item.W)x$($item.H))"
    }
}

$bannerIcons = @(
    @{ Path="res/u3.png"; W=176; H=88 },
    @{ Path="res/MQ.png"; W=176; H=88 },
    @{ Path="res/Z8.png"; W=132; H=66 },
    @{ Path="res/UR.png"; W=132; H=66 },
    @{ Path="res/-N1.png"; W=88; H=44 },
    @{ Path="res/Wr.png"; W=88; H=44 },
    @{ Path="res/2P.png"; W=66; H=33 },
    @{ Path="res/te.png"; W=66; H=33 },
    @{ Path="res/xH.png"; W=44; H=22 },
    @{ Path="res/H-.png"; W=44; H=22 }
)

foreach ($item in $bannerIcons) {
    $entry = $zip.GetEntry($item.Path)
    if ($entry) {
        $bytes = Get-Resized-Bytes $cinenovaBanner $item.W $item.H
        $entry.Delete()
        $newE = $zip.CreateEntry($item.Path, [System.IO.Compression.CompressionLevel]::Optimal)
        $w = $newE.Open()
        $w.Write($bytes, 0, $bytes.Length)
        $w.Close()
        Write-Output "Banner TV actualizado: $($item.Path) ($($item.W)x$($item.H))"
    }
}

$cinenovaIcon.Dispose()
$cinenovaBanner.Dispose()

# 3. Eliminar firmas anteriores de META-INF
Write-Output "3. Limpiando firmas antiguas en META-INF..."
$toDelete = @()
foreach ($e in $zip.Entries) {
    if ($e.FullName -like "META-INF/*.SF" -or $e.FullName -like "META-INF/*.RSA" -or $e.FullName -like "META-INF/*.DSA" -or $e.FullName -eq "META-INF/MANIFEST.MF") {
        $toDelete += $e
    }
}
foreach ($e in $toDelete) {
    $e.Delete()
}

$zip.Dispose()
Write-Output "APK CineNova modificado guardado exitosamente."

# 4. Firmar con uber-apk-signer
Write-Output "4. Firmando con clave oficial (V1 + V2 + V3)..."
$signerJar = "$scratchDir\uber-apk-signer.jar"
$keystore = "$buildDir\signing.keystore"
$outDir = "$buildDir\signed"
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$signCmd = "java -jar `"$signerJar`" -a `"$workApk`" --ks `"$keystore`" --ksAlias my-key-alias --ksPass 8ATV41K_3P1w --ksKeyPass 8ATV41K_3P1w --allowResign -o `"$outDir`""
Invoke-Expression $signCmd

$signedApk = Get-ChildItem -Path $outDir -Filter "*.apk" | Select-Object -First 1
if ($signedApk) {
    $finalDesktopApk = Join-Path $desktop "CineNova_Universal_TV_Celular.apk"
    Copy-Item -Path $signedApk.FullName -Destination $finalDesktopApk -Force
    Write-Output "=========================================================="
    Write-Output "¡EXITO TOTAL! APK universal listo en el Escritorio:"
    Write-Output "Archivo: $finalDesktopApk"
    Write-Output "Tamaño:  $([Math]::Round((Get-Item $finalDesktopApk).Length / 1MB, 2)) MB"
    Write-Output "=========================================================="
} else {
    Write-Error "Fallo la firma del APK"
}
