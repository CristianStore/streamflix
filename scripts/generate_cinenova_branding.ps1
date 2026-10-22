Add-Type -AssemblyName System.Drawing

function Create-CineNova-Icon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Transparent background
    $g.Clear([System.Drawing.Color]::Transparent)

    # Outer squircle / rounded badge
    $pad = $size * 0.05
    $rect = New-Object System.Drawing.RectangleF $pad, $pad, ($size - 2*$pad), ($size - 2*$pad)
    
    # Gradient background
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 14, 14, 22),
        [System.Drawing.Color]::FromArgb(255, 24, 16, 36),
        45.0
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radius = $size * 0.22
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    
    $g.FillPath($bgBrush, $path)

    # Border neon glow
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, 168, 85, 247), ($size * 0.025))
    $g.DrawPath($borderPen, $path)

    # Inner Cosmic Supernova Glow
    $center = $size / 2
    $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
    $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(120, 229, 9, 20)
    $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $g.FillEllipse($glowBrush, ($center - $size*0.35), ($center - $size*0.35), ($size*0.7), ($size*0.7))

    # Supernova Star / Cross light behind play icon
    $starBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF ($center - $size*0.35), $center),
        (New-Object System.Drawing.PointF ($center + $size*0.35), $center),
        [System.Drawing.Color]::FromArgb(0, 168, 85, 247),
        [System.Drawing.Color]::FromArgb(220, 255, 255, 255)
    )
    $starPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(190, 192, 132, 252), ($size * 0.015))
    $g.DrawLine($starPen, ($center - $size*0.28), $center, ($center + $size*0.28), $center)
    $g.DrawLine($starPen, $center, ($center - $size*0.28), $center, ($center + $size*0.28))

    # Bold 3D Cinematic Play Triangle
    $p1 = New-Object System.Drawing.PointF ($center - $size * 0.12), ($center - $size * 0.22)
    $p2 = New-Object System.Drawing.PointF ($center + $size * 0.22), $center
    $p3 = New-Object System.Drawing.PointF ($center - $size * 0.12), ($center + $size * 0.22)
    $pts = [System.Drawing.PointF[]]@($p1, $p2, $p3)

    $playBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.RectangleF ($center - $size*0.15), ($center - $size*0.25), ($size*0.4), ($size*0.5)),
        [System.Drawing.Color]::FromArgb(255, 240, 20, 40),
        [System.Drawing.Color]::FromArgb(255, 168, 85, 247),
        65.0
    )
    $g.FillPolygon($playBrush, $pts)

    # Edge highlight on Play
    $playBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(240, 255, 255, 255), ($size * 0.02))
    $g.DrawPolygon($playBorder, $pts)

    # Small Nova Spark in upper corner of triangle
    $sparkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($sparkBrush, ($center + $size * 0.10), ($center - $size * 0.18), ($size * 0.04), ($size * 0.04))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generado icono: $outputPath"
}

function Create-CineNova-TV-Banner($outputPath) {
    $width = 1280
    $height = 720
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    # Background: Cinematic gradient with subtle spotlight
    $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 10, 10, 16),
        [System.Drawing.Color]::FromArgb(255, 22, 14, 34),
        30.0
    )
    $g.FillRectangle($bgBrush, $rect)

    # Ambient glow in center
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowPath.AddEllipse(200, 100, 880, 520)
    $pGlow = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
    $pGlow.CenterColor = [System.Drawing.Color]::FromArgb(80, 168, 85, 247)
    $pGlow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $g.FillPath($pGlow, $glowPath)

    # Draw Emblem at (width * 0.28, height * 0.5)
    $iconSize = 240
    $ix = 200
    $iy = ($height - $iconSize) / 2
    
    # Save a temp icon to draw directly
    $tempIcon = [System.IO.Path]::GetTempFileName() + ".png"
    Create-CineNova-Icon 256 $tempIcon
    $iconImg = [System.Drawing.Image]::FromFile($tempIcon)
    $g.DrawImage($iconImg, $ix, $iy, $iconSize, $iconSize)
    $iconImg.Dispose()
    Remove-Item -Force $tempIcon

    # Typography: "CINE" + "NOVA"
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $fontTitle = New-Object System.Drawing.Font($fontFamily, 86, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fontSub = New-Object System.Drawing.Font($fontFamily, 22, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

    $tx = $ix + $iconSize + 40
    $ty = $iy + 25

    # "CINE" in White
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.DrawString("CINE", $fontTitle, $whiteBrush, $tx, $ty)

    # Measure CINE width to append NOVA
    $cineSize = $g.MeasureString("CINE", $fontTitle)
    
    # "NOVA" in Radiant Violet / Magenta Gradient
    $novaRect = New-Object System.Drawing.RectangleF ($tx + $cineSize.Width - 10), $ty, 350, 120
    $novaBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $novaRect,
        [System.Drawing.Color]::FromArgb(255, 192, 132, 252),
        [System.Drawing.Color]::FromArgb(255, 229, 9, 20),
        0.0
    )
    $g.DrawString("NOVA", $fontTitle, $novaBrush, ($tx + $cineSize.Width - 10), $ty)

    # Slogan / Tagline
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 200, 210))
    $g.DrawString("EL NUEVO UNIVERSO DEL STREAMING • ANDROID TV & MOVIL", $fontSub, $subBrush, ($tx + 6), ($ty + $cineSize.Height - 10))

    # Badge: 4K ULTRA HD / DOLBY
    $badgeRect = New-Object System.Drawing.RectangleF ($tx + 6), ($ty + $cineSize.Height + 35), 180, 32
    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
    $g.FillRectangle($badgeBrush, $badgeRect)
    $badgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 168, 85, 247), 1.5)
    $g.DrawRectangle($badgePen, $badgeRect.X, $badgeRect.Y, $badgeRect.Width, $badgeRect.Height)

    $badgeFont = New-Object System.Drawing.Font($fontFamily, 14, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 215, 0))
    $g.DrawString("4K ULTRA HD", $badgeFont, $goldBrush, ($badgeRect.X + 32), ($badgeRect.Y + 7))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generado TV Banner: $outputPath"
}

# Run generation
$appDir = "C:\Users\CRISTIAN\.gemini\antigravity\scratch\streaming_app"
Create-CineNova-Icon 512 "$appDir\backend\public\icon.png"
Create-CineNova-Icon 512 "$appDir\cinenova.png"
Create-CineNova-TV-Banner "$appDir\tv_banner.png"
Create-CineNova-TV-Banner "$appDir\frontend\android\app\src\main\res\drawable\tv_banner.png"
