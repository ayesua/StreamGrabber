Add-Type -AssemblyName System.Drawing

$dir = "C:\Users\yesua\PY\Browser\StreamGrabber"

function Save-ImageDual($bmp, $baseName) {
    $pngPath = Join-Path $dir "$baseName.png"
    $jpgPath = Join-Path $dir "$baseName.jpg"

    # Save PNG (24-bit RGB)
    $bmp24 = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g24 = [System.Drawing.Graphics]::FromImage($bmp24)
    $g24.DrawImage($bmp, 0, 0, $bmp.Width, $bmp.Height)
    $g24.Dispose()
    $bmp24.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp24.Dispose()

    # Save JPG (quality 96)
    $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]96)
    $bmp.Save($jpgPath, $jpgEncoder, $encoderParams)

    Write-Host "[OK] Saved: $baseName.png and $baseName.jpg"
}

function Draw-XtremeGrbrIcon([System.Drawing.Graphics]$g, [float]$iconX, [float]$iconY, [float]$iconSize) {
    $circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 135, 205))
    $g.FillEllipse($circleBrush, $iconX, $iconY, $iconSize, $iconSize)
    $circleBrush.Dispose()

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $cx = $iconX + ($iconSize / 2.0)
    $cy = $iconY + ($iconSize / 2.0)

    function Get-Arrow([float]$scale, [float]$angle, [float]$cenX, [float]$cenY) {
        $p = New-Object System.Drawing.Drawing2D.GraphicsPath
        $hw = $scale * 0.062
        $topY = -$scale * 0.33
        $headTopY = $scale * 0.16
        $headBotY = $scale * 0.36
        $headHw = $scale * 0.130
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
        $m.Translate($cenX, $cenY)
        $m.Rotate($angle)
        $p.Transform($m)
        $m.Dispose()
        return $p
    }

    $p1 = Get-Arrow $iconSize -45.0 $cx $cy
    $p2 = Get-Arrow $iconSize 45.0 $cx $cy
    $g.FillPath($whiteBrush, $p1)
    $g.FillPath($whiteBrush, $p2)

    $p1.Dispose()
    $p2.Dispose()
    $whiteBrush.Dispose()
}

# =============================================================================
# 1. SMALL PROMO TILE (440x280)
# =============================================================================
$w = 440
$h = 280
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Background
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(11, 17, 32),
    [System.Drawing.Color]::FromArgb(15, 23, 42),
    45.0
)
$g.FillRectangle($bgBrush, 0, 0, $w, $h)
$bgBrush.Dispose()

# Radial glow accents
$glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 0, 135, 205))
$g.FillEllipse($glowBrush, -40, -40, 220, 220)
$g.FillEllipse($glowBrush, ($w - 180), ($h - 180), 220, 220)
$glowBrush.Dispose()

# Icon at (34, 76), size 96
Draw-XtremeGrbrIcon $g 34 76 96

# Typography
$fTitle = New-Object System.Drawing.Font('Segoe UI', 21, [System.Drawing.FontStyle]::Bold)
$fSub = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$fFeatures = New-Object System.Drawing.Font('Segoe UI', 9.5, [System.Drawing.FontStyle]::Regular)
$fBadge = New-Object System.Drawing.Font('Segoe UI', 8.5, [System.Drawing.FontStyle]::Bold)

# Badge: FORMERLY STREAMGRABBER
$badgeBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 2, 132, 199))
$g.FillRectangle($badgeBgBrush, 150, 48, 240, 22)
$badgeBgBrush.Dispose()
$badgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(2, 132, 199), 1)
$g.DrawRectangle($badgePen, 150, 48, 240, 22)
$badgePen.Dispose()

$cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(203, 213, 225))
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))

$g.DrawString('FORMERLY STREAMGRABBER - v3.5.1', $fBadge, $cyanBrush, 154, 51)
$g.DrawString('XtremeGrbr', $fTitle, $whiteBrush, 148, 74)
$g.DrawString('Ultimate Video Stream Downloader', $fSub, $cyanBrush, 150, 112)

$g.DrawString('>>  HLS (.m3u8), DASH (.mpd) and MP4', $fFeatures, $grayBrush, 150, 144)
$g.DrawString('>>  Live Popup Preview and Video Rotation', $fFeatures, $grayBrush, 150, 168)
$g.DrawString('>>  Dark and Light Mode - Multi-Language', $fFeatures, $grayBrush, 150, 192)
$g.DrawString('>>  100% Free - No Ads - Zero Tracking', $fFeatures, $greenBrush, 150, 216)

$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0, 135, 205), 1.5)
$g.DrawRectangle($borderPen, 0, 0, ($w - 1), ($h - 1))
$borderPen.Dispose()

$g.Dispose()
Save-ImageDual $bmp "small_promo_tile_440x280"
$bmp.Dispose()

# =============================================================================
# 2. MARQUEE PROMO TILE (1400x560)
# =============================================================================
$mw = 1400
$mh = 560
$mbmp = New-Object System.Drawing.Bitmap($mw, $mh)
$mg = [System.Drawing.Graphics]::FromImage($mbmp)
$mg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$mg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Tech dark background
$mrect = New-Object System.Drawing.Rectangle(0, 0, $mw, $mh)
$mbgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $mrect,
    [System.Drawing.Color]::FromArgb(10, 15, 29),
    [System.Drawing.Color]::FromArgb(15, 23, 42),
    30.0
)
$mg.FillRectangle($mbgBrush, 0, 0, $mw, $mh)
$mbgBrush.Dispose()

# Glowing background circles
$mglow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 0, 135, 205))
$mg.FillEllipse($mglow, -100, -100, 500, 500)
$mg.FillEllipse($mglow, ($mw - 400), ($mh - 400), 500, 500)
$mglow.Dispose()

# Draw Large Icon (160x160) at (100, 180)
Draw-XtremeGrbrIcon $mg 100 180 160

# Fonts for Marquee
$mfBadge = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$mfTitle = New-Object System.Drawing.Font('Segoe UI', 46, [System.Drawing.FontStyle]::Bold)
$mfSub = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Bold)
$mfCardH = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$mfBullet = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Regular)

# Badge
$mbadgeBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 2, 132, 199))
$mg.FillRectangle($mbadgeBg, 310, 95, 450, 36)
$mbadgeBg.Dispose()
$mbadgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(2, 132, 199), 1.5)
$mg.DrawRectangle($mbadgePen, 310, 95, 450, 36)
$mbadgePen.Dispose()
$mg.DrawString('FORMERLY STREAMGRABBER - OFFICIAL v3.5.1', $mfBadge, $cyanBrush, 322, 101)

# Title and Subtitle
$mg.DrawString('Video Downloader - XtremeGrbr', $mfTitle, $whiteBrush, 305, 142)
$mg.DrawString('Fast HLS (.m3u8) and Video Stream Sniffer with In-Popup Preview', $mfSub, $cyanBrush, 312, 222)

# Feature grid cards
$boxPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(51, 65, 85), 1.5)
$boxBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))

# Card 1: HLS
$mg.FillRectangle($boxBg, 312, 285, 480, 80)
$mg.DrawRectangle($boxPen, 312, 285, 480, 80)
$mg.DrawString('Multi-Threaded HLS Engine', $mfCardH, $whiteBrush, 328, 298)
$mg.DrawString('Parallel segment downloads and AES-128 crypto assembly', $mfBullet, $grayBrush, 328, 328)

# Card 2: Preview
$mg.FillRectangle($boxBg, 820, 285, 480, 80)
$mg.DrawRectangle($boxPen, 820, 285, 480, 80)
$mg.DrawString('Live Preview and MP4 Rotation', $mfCardH, $whiteBrush, 836, 298)
$mg.DrawString('Test stream before saving + lossless 90/180 rotation', $mfBullet, $grayBrush, 836, 328)

# Card 3: Theme and i18n
$mg.FillRectangle($boxBg, 312, 385, 480, 80)
$mg.DrawRectangle($boxPen, 312, 385, 480, 80)
$mg.DrawString('Dark and Light Theme + Languages', $mfCardH, $whiteBrush, 328, 398)
$mg.DrawString('1-Click toggle + English, Spanish, Chinese, Russian', $mfBullet, $grayBrush, 328, 428)

# Card 4: Free
$mg.FillRectangle($boxBg, 820, 385, 480, 80)
$mg.DrawRectangle($boxPen, 820, 385, 480, 80)
$mg.DrawString('100% Free and Open Model', $mfCardH, $greenBrush, 836, 398)
$mg.DrawString('Zero paywalls, zero telemetry, no ads or tracking', $mfBullet, $grayBrush, 836, 428)

# Outer border
$mborderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0, 135, 205), 2)
$mg.DrawRectangle($mborderPen, 0, 0, ($mw - 1), ($mh - 1))
$mborderPen.Dispose()

$mg.Dispose()
Save-ImageDual $mbmp "marquee_promo_tile_1400x560"
$mbmp.Dispose()

Write-Host "All promotional banners generated successfully!"
