Add-Type -AssemblyName System.Drawing

$sizes = @(16, 48, 128)
$dir = "C:\Users\yesua\PY\Browser\StreamGrabber"

function Create-CrossingArrowsIcon([int]$s) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Circle badge in single color modern blue #0087cd
    $circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 135, 205))
    $g.FillEllipse($circleBrush, 0, 0, ($s - 1), ($s - 1))
    $circleBrush.Dispose()

    # White brush for arrows
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    # Let Arrow 1 go from top-left to bottom-right, tilted by +40 degrees
    # Let Arrow 2 go from top-right to bottom-left, tilted by -40 degrees
    # Arrowhead tip at bottom:
    # Shaft top: -0.32 * s
    # Arrowhead base: +0.10 * s
    # Arrowhead tip: +0.33 * s
    # Arrowhead half-width: 0.10 * s
    # Shaft half-width: 0.038 * s

    function Get-ArrowPath {
        param([float]$scale, [float]$angle)
        $p = New-Object System.Drawing.Drawing2D.GraphicsPath
        
        $hw = $scale * 0.038
        $topY = -$scale * 0.32
        $headTopY = $scale * 0.10
        $headBotY = $scale * 0.34
        $headHw = $scale * 0.105

        $pts = @(
            (New-Object System.Drawing.PointF(-$hw, $topY)),
            (New-Object System.Drawing.PointF($hw, $topY)),
            (New-Object System.Drawing.PointF($hw, $headTopY)),
            (New-Object System.Drawing.PointF($headHw, $headTopY)),
            (New-Object System.Drawing.PointF(0, $headBotY)),
            (New-Object System.Drawing.PointF(-$headHw, $headTopY)),
            (New-Object System.Drawing.PointF(-$hw, $headTopY))
        )
        $p.AddPolygon([System.Drawing.PointF[]]$pts)

        $m = New-Object System.Drawing.Drawing2D.Matrix
        $m.Translate([float]($scale / 2.0), [float]($scale / 2.0))
        $m.Rotate($angle)
        $p.Transform($m)
        $m.Dispose()
        return $p
    }

    $path1 = Get-ArrowPath $s 42.0
    $path2 = Get-ArrowPath $s -42.0

    # Draw arrow 1
    $g.FillPath($whiteBrush, $path1)
    # Draw arrow 2 (they intersect cleanly and form the X)
    $g.FillPath($whiteBrush, $path2)

    $path1.Dispose()
    $path2.Dispose()
    $whiteBrush.Dispose()
    $g.Dispose()

    return $bmp
}

foreach ($s in $sizes) {
    $bmp = Create-CrossingArrowsIcon $s
    $outPath = Join-Path $dir "icon$s.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $outPath ($s x $s)"
}
