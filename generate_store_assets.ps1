Add-Type -AssemblyName System.Drawing

$baseDir = "c:\Users\yesua\PY\Browser\ExtremeShield"
$highResIconPath = Join-Path $baseDir "icon_high_res.jpg"
$highResIcon = if (Test-Path $highResIconPath) { [System.Drawing.Image]::FromFile($highResIconPath) } else { $null }

function Save-StoreImage($bitmap, $baseName) {
    # 1. Save as JPG (96% quality)
    $jpgPath = Join-Path $baseDir "$baseName.jpg"
    $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]96)
    $bitmap.Save($jpgPath, $jpgEncoder, $encoderParams)

    # 2. Save as 24-bit PNG (Format24bppRgb, strictly no alpha channel)
    $pngPath = Join-Path $baseDir "$baseName.png"
    $bmp24 = New-Object System.Drawing.Bitmap($bitmap.Width, $bitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g24 = [System.Drawing.Graphics]::FromImage($bmp24)
    $g24.DrawImage($bitmap, 0, 0, $bitmap.Width, $bitmap.Height)
    $g24.Dispose()
    $bmp24.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp24.Dispose()

    Write-Host "[OK] Saved: $baseName.jpg and $baseName.png" -ForegroundColor Green
}

# Common Color Palette
$colBgDark = [System.Drawing.Color]::FromArgb(9, 13, 22)
$colBgCard = [System.Drawing.Color]::FromArgb(18, 26, 42)
$colEmerald = [System.Drawing.Color]::FromArgb(16, 185, 129)
$colCyan = [System.Drawing.Color]::FromArgb(6, 182, 212)
$colAmber = [System.Drawing.Color]::FromArgb(245, 158, 11)
$colRose = [System.Drawing.Color]::FromArgb(244, 63, 94)
$colWhite = [System.Drawing.Color]::FromArgb(248, 250, 252)
$colGray = [System.Drawing.Color]::FromArgb(148, 163, 184)
$colMuted = [System.Drawing.Color]::FromArgb(100, 116, 139)

$brushWhite = New-Object System.Drawing.SolidBrush($colWhite)
$brushEmerald = New-Object System.Drawing.SolidBrush($colEmerald)
$brushCyan = New-Object System.Drawing.SolidBrush($colCyan)
$brushAmber = New-Object System.Drawing.SolidBrush($colAmber)
$brushRose = New-Object System.Drawing.SolidBrush($colRose)
$brushGray = New-Object System.Drawing.SolidBrush($colGray)
$brushMuted = New-Object System.Drawing.SolidBrush($colMuted)

$penEmerald = New-Object System.Drawing.Pen($colEmerald, 2)
$penCyan = New-Object System.Drawing.Pen($colCyan, 2)
$penCard = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 55, 80), 1.5)

# =============================================================================
# 1. SMALL PROMO TILE (440x280)
# =============================================================================
$w = 440
$h = 280
$bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($w, $h)),
    $colBgDark,
    [System.Drawing.Color]::FromArgb(15, 28, 48)
)
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

$glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 16, 185, 129))
$g.FillEllipse($glowBrush, -40, -40, 180, 180)
$g.FillEllipse($glowBrush, ($w - 140), ($h - 140), 180, 180)
$g.DrawRectangle($penEmerald, 1, 1, ($w - 2), ($h - 2))

if ($highResIcon) {
    $iconRect = New-Object System.Drawing.Rectangle(24, 40, 84, 84)
    $g.DrawImage($highResIcon, $iconRect)
    $g.DrawRectangle($penCyan, $iconRect)
}

$fontTitle = New-Object System.Drawing.Font("Segoe UI", 21, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$fontBadge = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold)
$fontDesc = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)

$g.DrawString("ExtremeShield", $fontTitle, $brushWhite, 122, 40)

$badgeRect = New-Object System.Drawing.Rectangle(124, 82, 195, 22)
$badgeBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 16, 185, 129))
$g.FillRectangle($badgeBg, $badgeRect)
$g.DrawRectangle($penEmerald, $badgeRect)
$g.DrawString("TOP SECURITY PRIVACY ARMOR", $fontBadge, $brushEmerald, 127, 85)

$g.DrawString("🚫 Anti-Popups & Popunders", $fontSub, $brushWhite, 24, 144)
$g.DrawString("🕵️ Anti-Tracking & Fingerprint Spoofing", $fontSub, $brushCyan, 24, 172)
$g.DrawString("⚡ Core Element Zapper (Alt+Shift+Z)", $fontSub, $brushEmerald, 24, 200)
$g.DrawString("100% Free • Manifest V3 • Zero Telemetry", $fontDesc, $brushGray, 24, 242)

$g.Dispose()
Save-StoreImage $bmp "small_promo_tile_440x280"
$bmp.Dispose()

# =============================================================================
# 2. MARQUEE PROMO TILE (1400x560)
# =============================================================================
$w = 1400
$h = 560
$bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($w, $h)),
    [System.Drawing.Color]::FromArgb(7, 10, 18),
    [System.Drawing.Color]::FromArgb(15, 23, 42)
)
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

$glowBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 16, 185, 129))
$glowBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 6, 182, 212))
$g.FillEllipse($glowBrush1, -100, -100, 450, 450)
$g.FillEllipse($glowBrush2, ($w - 350), ($h - 350), 500, 500)

$borderPen3 = New-Object System.Drawing.Pen($colEmerald, 3)
$g.DrawRectangle($borderPen3, 2, 2, ($w - 4), ($h - 4))

if ($highResIcon) {
    $iconRect = New-Object System.Drawing.Rectangle(80, 75, 150, 150)
    $g.DrawImage($highResIcon, $iconRect)
    $g.DrawRectangle($borderPen3, $iconRect)
}

$fontHero = New-Object System.Drawing.Font("Segoe UI", 42, [System.Drawing.FontStyle]::Bold)
$fontTagline = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$fontCardTitle = New-Object System.Drawing.Font("Segoe UI", 13.5, [System.Drawing.FontStyle]::Bold)
$fontCardDesc = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Regular)
$fontPill = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)

$g.DrawString("ExtremeShield", $fontHero, $brushWhite, 260, 75)
$g.DrawString("Ultimate Tracker, Popup & Fingerprint Defense", $fontTagline, $brushEmerald, 265, 145)
$g.DrawString("Combining the power of uBlock, Privacy Badger & Ghostery in pure Manifest V3 speed", $fontCardDesc, $brushGray, 265, 185)

$cards = @(
    @{ title = "🚫 Anti-Popups & Popunders"; desc = "Intercepts 100% of unprompted window spawns & synthetic click exploits."; col = $colEmerald },
    @{ title = "🔀 Anti-Redirect Shield"; desc = "Neutralizes timer-based redirects and background tab-under hijacks."; col = $colCyan },
    @{ title = "🕵️ Fingerprint Spoofing"; desc = "Deterministic noise injection on Canvas 2D & AudioContext APIs."; col = $colAmber },
    @{ title = "⚡ Core Element Zapper"; desc = "Point, click and vaporize annoying banners permanently with laser UI."; col = $colEmerald }
)

$cardW = 285
$cardH = 160
$cardY = 265
$startX = 80
$gap = 25

for ($i = 0; $i -lt $cards.Count; $i++) {
    $cx = $startX + ($i * ($cardW + $gap))
    $cRect = New-Object System.Drawing.Rectangle($cx, $cardY, $cardW, $cardH)
    
    $cardBg = New-Object System.Drawing.SolidBrush($colBgCard)
    $g.FillRectangle($cardBg, $cRect)
    
    $cBorder = New-Object System.Drawing.Pen($cards[$i].col, 1.5)
    $g.DrawRectangle($cBorder, $cRect)
    
    $cTitleBrush = New-Object System.Drawing.SolidBrush($cards[$i].col)
    $g.DrawString($cards[$i].title, $fontCardTitle, $cTitleBrush, ($cx + 14), ($cardY + 14))
    
    $rectText = New-Object System.Drawing.RectangleF([float]($cx + 14), [float]($cardY + 48), [float]($cardW - 28), [float]($cardH - 58))
    $g.DrawString($cards[$i].desc, $fontCardDesc, $brushGray, $rectText)
}

$p1 = New-Object System.Drawing.Rectangle(1050, 75, 270, 36)
$pBg1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 16, 185, 129))
$g.FillRectangle($pBg1, $p1)
$g.DrawRectangle($penEmerald, $p1)
$g.DrawString("🛡️ 100% FREE & ZERO-LOG", $fontPill, $brushEmerald, 1065, 82)

$p2 = New-Object System.Drawing.Rectangle(1050, 125, 270, 36)
$pBg2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 6, 182, 212))
$g.FillRectangle($pBg2, $p2)
$penCyan = New-Object System.Drawing.Pen($colCyan, 1.5)
$g.DrawRectangle($penCyan, $p2)
$g.DrawString("⚡ MANIFEST V3 HIGH SPEED", $fontPill, $brushCyan, 1065, 132)

$g.DrawString("Zero Paywalls • Cookie Walls Auto-Dismissed • WebRTC Leak Protection • CPU & RAM Ultra Optimized", $fontCardDesc, $brushGray, 80, 480)

$g.Dispose()
Save-StoreImage $bmp "marquee_promo_tile_1400x560"
$bmp.Dispose()

# =============================================================================
# HELPER: SCREENSHOT BASE SHELL (1280x800)
# =============================================================================
function New-ScreenshotBase($title, $subtitle) {
    $sw = 1280
    $sh = 800
    $sbmp = New-Object System.Drawing.Bitmap($sw, $sh, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $sg = [System.Drawing.Graphics]::FromImage($sbmp)
    $sg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $sg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $sBgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($sw, $sh)),
        $colBgDark,
        [System.Drawing.Color]::FromArgb(15, 24, 40)
    )
    $sg.FillRectangle($sBgBrush, 0, 0, $sw, $sh)

    $sgGlow1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 16, 185, 129))
    $sgGlow2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 6, 182, 212))
    $sg.FillEllipse($sgGlow1, -120, -120, 500, 500)
    $sg.FillEllipse($sgGlow2, ($sw - 380), ($sh - 380), 500, 500)

    $sBorder = New-Object System.Drawing.Pen($colEmerald, 2)
    $sg.DrawRectangle($sBorder, 1, 1, ($sw - 2), ($sh - 2))

    $fHead = New-Object System.Drawing.Font("Segoe UI", 25, [System.Drawing.FontStyle]::Bold)
    $fSub = New-Object System.Drawing.Font("Segoe UI", 13.5, [System.Drawing.FontStyle]::Regular)
    $fBrand = New-Object System.Drawing.Font("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)

    if ($highResIcon) {
        $iconMini = New-Object System.Drawing.Rectangle(50, 36, 48, 48)
        $sg.DrawImage($highResIcon, $iconMini)
        $sg.DrawRectangle($penEmerald, $iconMini)
    }

    $sg.DrawString("ExtremeShield", $fBrand, $brushEmerald, 110, 38)
    $sg.DrawString($title, $fHead, $brushWhite, 108, 56)
    $sg.DrawString($subtitle, $fSub, $brushCyan, 110, 106)

    return @{ Bitmap = $sbmp; Graphics = $sg }
}

# =============================================================================
# SCREENSHOT 1: COMMAND & CONTROL CENTER (1280x800)
# =============================================================================
$res = New-ScreenshotBase "Command & Control Center" "Real-time master defense, live telemetry counters, and instant power switch"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$pw = 420
$ph = 590
$px = 430
$py = 160

$popupBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$sg.FillRectangle($popupBg, $px, $py, $pw, $ph)
$penPop = New-Object System.Drawing.Pen($colEmerald, 2)
$sg.DrawRectangle($penPop, $px, $py, $pw, $ph)

$fPopTitle = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$fPopSub = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
$fVal = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$fValLbl = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold)

$sg.DrawString("🛡️ ExtremeShield Active", $fPopTitle, $brushWhite, ($px + 20), ($py + 18))
$sg.DrawString("example.com • Protected", $fPopSub, $brushEmerald, ($px + 22), ($py + 44))

$zapRect = New-Object System.Drawing.Rectangle(($px + 20), ($py + 80), ($pw - 40), 68)
$zapBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 16, 185, 129))
$sg.FillRectangle($zapBg, $zapRect)
$zapPen = New-Object System.Drawing.Pen($colEmerald, 1.8)
$sg.DrawRectangle($zapPen, $zapRect)

$fZapTitle = New-Object System.Drawing.Font("Segoe UI", 12.5, [System.Drawing.FontStyle]::Bold)
$fZapDesc = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Regular)
$fZapBadge = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)

$sg.DrawString("⚡ Zap Element on Page", $fZapTitle, $brushWhite, ($px + 36), ($py + 92))
$sg.DrawString("Point & click to vaporize any annoying banner", $fZapDesc, $brushGray, ($px + 36), ($py + 116))
$sg.DrawString("Alt+Shift+Z", $fZapBadge, $brushEmerald, ($px + 290), ($py + 95))

$statData = @(
    @{ l = "Popups Blocked"; v = "18"; c = $colEmerald },
    @{ l = "Trackers Blocked"; v = "64"; c = $colCyan },
    @{ l = "Annoyances Dismissed"; v = "9"; c = $colAmber },
    @{ l = "Bandwidth Saved"; v = "4.2 MB"; c = $colWhite }
)
$sCardW = [int](($pw - 52) / 2)
$sCardH = 70

for ($i = 0; $i -lt 4; $i++) {
    $scx = $px + 20 + ($i % 2) * ($sCardW + 12)
    $scy = $py + 165 + [int]([Math]::Floor($i / 2) * ($sCardH + 12))
    $scRect = New-Object System.Drawing.Rectangle($scx, $scy, $sCardW, $sCardH)
    
    $scBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 34, 54))
    $sg.FillRectangle($scBg, $scRect)
    $sg.DrawRectangle($penCard, $scRect)
    
    $bCol = New-Object System.Drawing.SolidBrush($statData[$i].c)
    $sg.DrawString($statData[$i].v, $fVal, $bCol, ($scx + 12), ($scy + 8))
    $sg.DrawString($statData[$i].l, $fValLbl, $brushGray, ($scx + 12), ($scy + 42))
}

$quickTools = @("🚫 Popups", "🔀 Redirects", "🍪 Cookie Walls", "🛡️ Anti-Adblock", "🕵️ Fingerprint", "⏸️ Pause 15m")
$qBtnW = [int](($pw - 56) / 3)
for ($i = 0; $i -lt 6; $i++) {
    $qcx = $px + 20 + ($i % 3) * ($qBtnW + 8)
    $qcy = $py + 345 + [int]([Math]::Floor($i / 3) * 44)
    $qRect = New-Object System.Drawing.Rectangle($qcx, $qcy, $qBtnW, 36)
    
    $qBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 34, 54))
    $sg.FillRectangle($qBg, $qRect)
    $qPen = New-Object System.Drawing.Pen($colEmerald, 1.2)
    $sg.DrawRectangle($qPen, $qRect)
    
    $fTool = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold)
    $sg.DrawString($quickTools[$i], $fTool, $brushWhite, ($qcx + 6), ($qcy + 8))
}

$fCalloutHead = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$fCalloutBody = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)

$lRect = New-Object System.Drawing.Rectangle(50, 240, 330, 180)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $lRect)
$sg.DrawRectangle($penEmerald, $lRect)
$sg.DrawString("⚡ 100% Native Speed", $fCalloutHead, $brushEmerald, 70, 260)
$sg.DrawString("Built entirely on Chrome's Declarative Net Request (DNR) engine for zero-lag page loading with minimal CPU usage.", $fCalloutBody, $brushGray, (New-Object System.Drawing.RectangleF(70.0, 305.0, 290.0, 95.0)))

$rRect = New-Object System.Drawing.Rectangle(900, 240, 330, 180)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $rRect)
$sg.DrawRectangle($penCyan, $rRect)
$sg.DrawString("🔒 Zero-Log & Free", $fCalloutHead, $brushCyan, 920, 260)
$sg.DrawString("No user data collection, no telemetry analytics, and zero paywalls. Everything is processed 100% locally on your computer.", $fCalloutBody, $brushGray, (New-Object System.Drawing.RectangleF(920.0, 305.0, 290.0, 95.0)))

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_1_control_center_1280x800"
$sbmp.Dispose()

# =============================================================================
# SCREENSHOT 2: PROMINENT ELEMENT ZAPPER (1280x800)
# =============================================================================
$res = New-ScreenshotBase "⚡ Prominent Element Zapper" "Laser-targeted point & click to vaporize intrusive banners, modals, and overlays"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$pageRect = New-Object System.Drawing.Rectangle(80, 160, 1120, 570)
$pageBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$sg.FillRectangle($pageBg, $pageRect)
$sg.DrawRectangle($penCard, $pageRect)

$wpHeader = New-Object System.Drawing.Rectangle(80, 160, 1120, 50)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))), $wpHeader)
$sg.DrawString("🌐 news-portal-example.com/article", (New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)), $brushGray, 105, 175)

$zapTarget = New-Object System.Drawing.Rectangle(240, 270, 800, 280)
$zapTargetBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 239, 68, 68))
$sg.FillRectangle($zapTargetBg, $zapTarget)
$penLaser = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(239, 68, 68), 3)
$sg.DrawRectangle($penLaser, $zapTarget)

$sg.DrawString("🚨 INTRUSIVE FLOATING AD BANNER / NEWSLETTER POPUP", (New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)), $brushRose, 320, 360)
$sg.DrawString("Target Selector: div#floating-newsletter-modal.sticky-ad", (New-Object System.Drawing.Font("Consolas", 12, [System.Drawing.FontStyle]::Regular)), $brushWhite, 360, 410)

$hudRect = New-Object System.Drawing.Rectangle(360, 590, 560, 80)
$hudBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 13, 22))
$sg.FillRectangle($hudBg, $hudRect)
$sg.DrawRectangle($penEmerald, $hudRect)

$sg.DrawString("⚡ ExtremeShield Element Zapper", (New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)), $brushEmerald, 385, 605)
$sg.DrawString("Click element to vaporize permanently • Press ESC to cancel", (New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Regular)), $brushGray, 385, 635)

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_2_element_zapper_1280x800"
$sbmp.Dispose()

# =============================================================================
# SCREENSHOT 3: ANTI-REDIRECT & TAB-UNDER DEFENSE (1280x800)
# =============================================================================
$res = New-ScreenshotBase "🔀 Anti-Redirect & Tab-Under Hijack Defense" "Neutralizes timer-based redirects, fake download buttons, and background tab hijacks"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$colW = 345
$colH = 540
$colY = 170
$colStartX = 80
$colGap = 42

$redirectFeatures = @(
    @{
        icon = "🔀";
        title = "Timer-Based Redirects";
        sub = "Neutralizes Location.replace";
        desc = "Traps unprompted redirects triggered by hidden setTimeout and setInterval scripts that try to bounce you across ad networks.";
        accent = $colEmerald
    },
    @{
        icon = "📑";
        title = "Tab-Under Hijacking";
        sub = "Protects Inactive Background Tabs";
        desc = "Prevents shady websites from quietly navigating your current tab to an advertising landing page while opening new tabs behind your back.";
        accent = $colCyan
    },
    @{
        icon = "🛡️";
        title = "Fake Download Traps";
        sub = "Defuses Synthetic Anchor Clicks";
        desc = "Stops malicious synthetic click exploits on invisible <a> tags with target='_blank' that bypass default browser popup blockers.";
        accent = $colAmber
    }
)

for ($i = 0; $i -lt 3; $i++) {
    $cx = $colStartX + ($i * ($colW + $colGap))
    $cRect = New-Object System.Drawing.Rectangle($cx, $colY, $colW, $colH)
    
    $cBg = New-Object System.Drawing.SolidBrush($colBgCard)
    $sg.FillRectangle($cBg, $cRect)
    $cPen = New-Object System.Drawing.Pen($redirectFeatures[$i].accent, 2)
    $sg.DrawRectangle($cPen, $cRect)
    
    $fIcon = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Regular)
    $fColTitle = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $fColSub = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $fColDesc = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)
    
    $sg.DrawString($redirectFeatures[$i].icon, $fIcon, $brushWhite, ($cx + 25), ($colY + 25))
    
    $tBrush = New-Object System.Drawing.SolidBrush($redirectFeatures[$i].accent)
    $sg.DrawString($redirectFeatures[$i].title, $fColTitle, $tBrush, ($cx + 25), ($colY + 95))
    $sg.DrawString($redirectFeatures[$i].sub, $fColSub, $brushWhite, ($cx + 25), ($colY + 130))
    
    $descRect = New-Object System.Drawing.RectangleF([float]($cx + 25), [float]($colY + 175), [float]($colW - 50), 200.0)
    $sg.DrawString($redirectFeatures[$i].desc, $fColDesc, $brushGray, $descRect)
    
    $pillRect = New-Object System.Drawing.Rectangle(($cx + 25), ($colY + 460), ($colW - 50), 42)
    $pillBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 16, 185, 129))
    $sg.FillRectangle($pillBg, $pillRect)
    $sg.DrawRectangle($penEmerald, $pillRect)
    $sg.DrawString("PROTECTION ACTIVE", (New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)), $brushEmerald, ($cx + 85), ($colY + 472))
}

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_3_anti_redirect_1280x800"
$sbmp.Dispose()

# =============================================================================
# SCREENSHOT 4: LIVE TRACKER INSPECTOR (1280x800)
# =============================================================================
$res = New-ScreenshotBase "🕵️ Live Tracker Telemetry & Inspector" "Real-time breakdown of advertising trackers, behavioral profiling, and analytics beacons"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$tRect = New-Object System.Drawing.Rectangle(80, 165, 1120, 565)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $tRect)
$sg.DrawRectangle($penCyan, $tRect)

$thRect = New-Object System.Drawing.Rectangle(80, 165, 1120, 50)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))), $thRect)
$fTh = New-Object System.Drawing.Font("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)
$sg.DrawString("TRACKER / TELEMETRY DOMAIN", $fTh, $brushWhite, 110, 180)
$sg.DrawString("CATEGORY", $fTh, $brushWhite, 650, 180)
$sg.DrawString("ACTION TAKEN", $fTh, $brushWhite, 940, 180)

$rows = @(
    @{ d = "google-analytics.com / analytics.js"; cat = "Analytics & Telemetry"; act = "BLOCKED (0ms)"; c = $colEmerald },
    @{ d = "connect.facebook.net / signals / config"; cat = "Social Tracking Pixel"; act = "BLOCKED (0ms)"; c = $colCyan },
    @{ d = "doubleclick.net / pagead / id"; cat = "Advertising Profile Network"; act = "BLOCKED (0ms)"; c = $colAmber },
    @{ d = "criteo.net / event / tag"; cat = "Behavioral Retargeting"; act = "BLOCKED (0ms)"; c = $colAmber },
    @{ d = "clarity.ms / s / 0.7.2 / clarity.js"; cat = "Session Recording & Heatmap"; act = "BLOCKED (0ms)"; c = $colEmerald },
    @{ d = "utm_source, fbclid, gclid, mc_cid"; cat = "URL Parameter Tokens"; act = "STRIPPED"; c = $colRose },
    @{ d = "Canvas 2D / AudioContext Fingerprint"; cat = "Device Identity Hash"; act = "RANDOMIZED NOISE"; c = $colCyan }
)

$fRow = New-Object System.Drawing.Font("Consolas", 11, [System.Drawing.FontStyle]::Regular)
$fRowCat = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
$fRowAct = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)

for ($i = 0; $i -lt $rows.Count; $i++) {
    $ry = 225 + ($i * 68)
    $rBg = if ($i % 2 -eq 0) { [System.Drawing.Color]::FromArgb(20, 28, 44) } else { [System.Drawing.Color]::FromArgb(16, 23, 38) }
    $sg.FillRectangle((New-Object System.Drawing.SolidBrush($rBg)), 82, $ry, 1116, 64)
    
    $sg.DrawString($rows[$i].d, $fRow, $brushWhite, 110, ($ry + 20))
    $sg.DrawString($rows[$i].cat, $fRowCat, $brushGray, 650, ($ry + 20))
    
    $actBrush = New-Object System.Drawing.SolidBrush($rows[$i].c)
    $sg.DrawString($rows[$i].act, $fRowAct, $actBrush, 940, ($ry + 20))
}

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_4_tracker_inspector_1280x800"
$sbmp.Dispose()

# =============================================================================
# SCREENSHOT 5: ADVANCED SHIELDS & INFO MODALS (1280x800)
# =============================================================================
$res = New-ScreenshotBase "⚙️ Advanced Shields & Interactive Info Modals" "Detailed transparency on every protection engine with 1-click information popups"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$setRect = New-Object System.Drawing.Rectangle(80, 165, 580, 565)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $setRect)
$sg.DrawRectangle($penEmerald, $setRect)

$sg.DrawString("Core Defense Engines", (New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)), $brushEmerald, 110, 185)

$setItems = @(
    "Aggressive Popup & Popunder Blocker",
    "Anti-Redirect & Tab-Under Hijack Shield",
    "Tracking & Telemetry Armor (DNR)",
    "Canvas & Audio Fingerprint Randomizer",
    "WebRTC IP Leak Defense",
    "Cookie Consent Banner Auto-Dismissal",
    "Anti-Adblock Defuser & Stubs"
)

$fSet = New-Object System.Drawing.Font("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)
for ($i = 0; $i -lt $setItems.Count; $i++) {
    $sy = 230 + ($i * 64)
    $sg.DrawString($setItems[$i], $fSet, $brushWhite, 110, $sy)
    
    # ℹ️ info button
    $iBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 16, 185, 129))
    $sg.FillEllipse($iBg, 510, ($sy - 2), 26, 26)
    $sg.DrawEllipse($penEmerald, 510, ($sy - 2), 26, 26)
    $sg.DrawString("i", (New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)), $brushEmerald, 519, ($sy + 1))
    
    # Toggle switch (ON)
    $swRect = New-Object System.Drawing.Rectangle(560, $sy, 44, 22)
    $sg.FillRectangle((New-Object System.Drawing.SolidBrush($colEmerald)), $swRect)
    $sg.FillEllipse($brushWhite, 582, ($sy + 1), 20, 20)
}

# Modal Popup Preview on Right
$mRect = New-Object System.Drawing.Rectangle(710, 165, 490, 565)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))), $mRect)
$sg.DrawRectangle($penCyan, $mRect)

$sg.DrawString("ℹ️ Feature Information Modal", (New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)), $brushCyan, 735, 190)

$mCards = @(
    @{ title = "🔍 ¿Qué hace?"; desc = "Intercepta llamadas a window.open, bloquea redirecciones forzadas por temporizadores y neutraliza popunders antes de abrirse."; col = $colWhite; bg = [System.Drawing.Color]::FromArgb(24, 34, 54) },
    @{ title = "🛡️ Beneficio de Privacidad"; desc = "Elimina el 100% de ventanas engañosas, publicidad invasiva y evita el rastreo cruzado entre páginas web."; col = $colEmerald; bg = [System.Drawing.Color]::FromArgb(25, 16, 185, 129) },
    @{ title = "⚙️ Compatibilidad"; desc = "Las ventanas legítimas que abras conscientemente (inicios de sesión con Google/GitHub) siguen funcionando normalmente."; col = $colCyan; bg = [System.Drawing.Color]::FromArgb(25, 6, 182, 212) }
)

for ($i = 0; $i -lt 3; $i++) {
    $my = 245 + ($i * 145)
    $mcRect = New-Object System.Drawing.Rectangle(735, $my, 440, 130)
    $sg.FillRectangle((New-Object System.Drawing.SolidBrush($mCards[$i].bg)), $mcRect)
    $sg.DrawRectangle((New-Object System.Drawing.Pen($mCards[$i].col, 1.2)), $mcRect)
    
    $sg.DrawString($mCards[$i].title, (New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush($mCards[$i].col)), 750, ($my + 12))
    $sg.DrawString($mCards[$i].desc, (New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Regular)), $brushWhite, (New-Object System.Drawing.RectangleF(750.0, [float]($my + 44), 410.0, 75.0)))
}

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_5_advanced_shields_1280x800"
$sbmp.Dispose()

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " SUCCESS: All Store Promo Tiles and Screenshots Generated!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
