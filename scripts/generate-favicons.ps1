Add-Type -AssemblyName System.Drawing

function Draw-GSTBroIcon {
    param(
        [int]$size
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    [float]$scale = [float]$size / 64.0

    # 1. Dark Background with rounded corners
    [float]$cornerRad = [Math]::Max([float]2.0, [float](14.0 * $scale))
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 19, 43)) # #0B132B
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    [float]$diam = $cornerRad * 2.0
    $path.AddArc([float]0.0, [float]0.0, $diam, $diam, [float]180.0, [float]90.0)
    $path.AddArc([float]($size - $diam), [float]0.0, $diam, $diam, [float]270.0, [float]90.0)
    $path.AddArc([float]($size - $diam), [float]($size - $diam), $diam, $diam, [float]0.0, [float]90.0)
    $path.AddArc([float]0.0, [float]($size - $diam), $diam, $diam, [float]90.0, [float]90.0)
    $path.CloseFigure()
    $g.FillPath($bgBrush, $path)

    # 2. Border
    [float]$penWidth = [Math]::Max([float]1.0, [float](2.0 * $scale))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 30, 41, 59), $penWidth) # #1E293B
    $borderPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    [float]$bDiam = [Math]::Max([float]1.0, [float](($cornerRad - $penWidth) * 2.0))
    $borderPath.AddArc($penWidth, $penWidth, $bDiam, $bDiam, [float]180.0, [float]90.0)
    $borderPath.AddArc([float]($size - $penWidth - $bDiam), $penWidth, $bDiam, $bDiam, [float]270.0, [float]90.0)
    $borderPath.AddArc([float]($size - $penWidth - $bDiam), [float]($size - $penWidth - $bDiam), $bDiam, $bDiam, [float]0.0, [float]90.0)
    $borderPath.AddArc($penWidth, [float]($size - $penWidth - $bDiam), $bDiam, $bDiam, [float]90.0, [float]90.0)
    $borderPath.CloseFigure()
    $g.DrawPath($borderPen, $borderPath)

    # 3. Shield shape with gradient: 2563EB to 06B6D4
    $shieldPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pts = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF([float](32.0 * $scale), [float](10.0 * $scale))),
        (New-Object System.Drawing.PointF([float](48.0 * $scale), [float](18.0 * $scale))),
        (New-Object System.Drawing.PointF([float](48.0 * $scale), [float](34.0 * $scale))),
        (New-Object System.Drawing.PointF([float](32.0 * $scale), [float](54.0 * $scale))),
        (New-Object System.Drawing.PointF([float](16.0 * $scale), [float](34.0 * $scale))),
        (New-Object System.Drawing.PointF([float](16.0 * $scale), [float](18.0 * $scale)))
    )
    $shieldPath.AddPolygon($pts)

    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF([float]0.0, [float]0.0)),
        (New-Object System.Drawing.PointF([float]$size, [float]$size)),
        ([System.Drawing.Color]::FromArgb(255, 37, 99, 235)),  # #2563EB
        ([System.Drawing.Color]::FromArgb(255, 6, 182, 212))   # #06B6D4
    )
    $g.FillPath($gradBrush, $shieldPath)

    # 4. ₹ Symbol in the center
    [float]$fontSize = [float](18.0 * $scale)
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF([float]0.0, [float](10.0 * $scale), [float]$size, [float](40.0 * $scale))
    $g.DrawString([char]0x20B9, $font, $textBrush, $textRect, $sf)

    $g.Dispose()
    return $bmp
}

# Create standard Windows ICO file from multiple PNG buffers
function Write-IcoFile {
    param(
        [System.Drawing.Bitmap[]]$bitmaps,
        [string]$outputPath
    )

    $fs = [System.IO.File]::Create($outputPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR header
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type (1 = ICO)
    $bw.Write([uint16]$bitmaps.Count) # Image count

    $pngBytesList = New-Object System.Collections.Generic.List[byte[]]
    foreach ($bmp in $bitmaps) {
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngBytesList.Add($ms.ToArray())
        $ms.Dispose()
    }

    [uint32]$offset = [uint32](6 + (16 * $bitmaps.Count))
    for ($i = 0; $i -lt $bitmaps.Count; $i++) {
        $bmp = $bitmaps[$i]
        $bytes = $pngBytesList[$i]

        [byte]$w = if ($bmp.Width -ge 256) { [byte]0 } else { [byte]$bmp.Width }
        [byte]$h = if ($bmp.Height -ge 256) { [byte]0 } else { [byte]$bmp.Height }

        $bw.Write([byte]$w)
        $bw.Write([byte]$h)
        $bw.Write([byte]0)   # Colors
        $bw.Write([byte]0)   # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32)# Bits per pixel
        $bw.Write([uint32]$bytes.Length) # Size in bytes
        $bw.Write([uint32]$offset)       # File offset

        $offset += [uint32]$bytes.Length
    }

    foreach ($bytes in $pngBytesList) {
        $bw.Write($bytes)
    }

    $bw.Dispose()
    $fs.Dispose()
}

$destDir = "apps/web/public"

Write-Host "Generating icons in $destDir..."

$bmp16 = Draw-GSTBroIcon 16
$bmp16.Save("$destDir/favicon-16x16.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp32 = Draw-GSTBroIcon 32
$bmp32.Save("$destDir/favicon-32x32.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp48 = Draw-GSTBroIcon 48
$bmp48.Save("$destDir/favicon-48x48.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp96 = Draw-GSTBroIcon 96
$bmp96.Save("$destDir/favicon-96x96.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp180 = Draw-GSTBroIcon 180
$bmp180.Save("$destDir/apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp192 = Draw-GSTBroIcon 192
$bmp192.Save("$destDir/favicon-192x192.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp512 = Draw-GSTBroIcon 512
$bmp512.Save("$destDir/favicon-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-IcoFile @($bmp16, $bmp32, $bmp48, $bmp96) "$destDir/favicon.ico"

Write-Host "All icons generated successfully!"
