Add-Type -AssemblyName System.Drawing

$baseDir = "c:\Users\yesua\PY\Browser\Extension"
$highResIconPath = Join-Path $baseDir "icon512.png"
if (-not (Test-Path $highResIconPath)) {
    $highResIconPath = Join-Path $baseDir "icon128.png"
}
$highResIcon = if (Test-Path $highResIconPath) { [System.Drawing.Image]::FromFile($highResIconPath) } else { $null }

function Save-StoreImage($bitmap, $baseName) {
    # Save to Extension directory
    $jpgPath = Join-Path $baseDir "$baseName.jpg"
    $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]96)
    $bitmap.Save($jpgPath, $jpgEncoder, $encoderParams)

    $pngPath = Join-Path $baseDir "$baseName.png"
    $bmp24 = New-Object System.Drawing.Bitmap($bitmap.Width, $bitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g24 = [System.Drawing.Graphics]::FromImage($bmp24)
    $g24.DrawImage($bitmap, 0, 0, $bitmap.Width, $bitmap.Height)
    $g24.Dispose()
    $bmp24.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp24.Dispose()

    # Also mirror to ExtremeShield directory
    $mirrorDir = "c:\Users\yesua\PY\Browser\ExtremeShield"
    if (Test-Path $mirrorDir) {
        Copy-Item $jpgPath (Join-Path $mirrorDir "$baseName.jpg") -Force
        Copy-Item $pngPath (Join-Path $mirrorDir "$baseName.png") -Force
    }

    Write-Host "[OK] Saved: $baseName.jpg and $baseName.png" -ForegroundColor Green
}

# StreamGrabber Unified Palette
$colBgDark = [System.Drawing.Color]::FromArgb(11, 24, 52)         # Navy #0b1834
$colBgCard = [System.Drawing.Color]::FromArgb(15, 23, 42)         # #0f172a
$colBgCardLight = [System.Drawing.Color]::FromArgb(24, 34, 58)
$colRed = [System.Drawing.Color]::FromArgb(223, 66, 82)           # Crimson Red #df4252
$colRedBright = [System.Drawing.Color]::FromArgb(244, 63, 94)      # Rose #f43f5e
$colCyan = [System.Drawing.Color]::FromArgb(0, 135, 205)          # Cyan Blue #0087cd
$colAmber = [System.Drawing.Color]::FromArgb(245, 158, 11)        # Gold #f59e0b
$colEmerald = [System.Drawing.Color]::FromArgb(0, 166, 61)        # Green #00a63d
$colWhite = [System.Drawing.Color]::FromArgb(248, 250, 252)
$colGray = [System.Drawing.Color]::FromArgb(148, 163, 184)
$colMuted = [System.Drawing.Color]::FromArgb(100, 116, 139)

$brushWhite = New-Object System.Drawing.SolidBrush($colWhite)
$brushRed = New-Object System.Drawing.SolidBrush($colRed)
$brushRedBright = New-Object System.Drawing.SolidBrush($colRedBright)
$brushCyan = New-Object System.Drawing.SolidBrush($colCyan)
$brushAmber = New-Object System.Drawing.SolidBrush($colAmber)
$brushEmerald = New-Object System.Drawing.SolidBrush($colEmerald)
$brushGray = New-Object System.Drawing.SolidBrush($colGray)
$brushMuted = New-Object System.Drawing.SolidBrush($colMuted)

$penRed = New-Object System.Drawing.Pen($colRed, 2)
$penRedBright = New-Object System.Drawing.Pen($colRedBright, 2)
$penCyan = New-Object System.Drawing.Pen($colCyan, 2)
$penCard = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(30, 41, 59), 1.5)

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
    [System.Drawing.Color]::FromArgb(18, 14, 32)
)
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

$glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 223, 66, 82))
$g.FillEllipse($glowBrush, -40, -40, 220, 220)
$g.FillEllipse($glowBrush, ($w - 140), ($h - 140), 200, 200)
$g.DrawRectangle($penRed, 1, 1, ($w - 2), ($h - 2))

if ($highResIcon) {
    $iconRect = New-Object System.Drawing.Rectangle(24, 28, 76, 76)
    $g.DrawImage($highResIcon, $iconRect)
}

$fontTitle = New-Object System.Drawing.Font("Segoe UI", 21, [System.Drawing.FontStyle]::Bold)
$fontSubtitle = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$fontBadge = New-Object System.Drawing.Font("Segoe UI", 7.5, [System.Drawing.FontStyle]::Bold)
$fontDesc = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Regular)

$g.DrawString("XtremeShld", $fontTitle, $brushWhite, 112, 26)
$g.DrawString("(formerly ExtremeShield)", $fontSubtitle, $brushRedBright, 114, 58)

$badgeRect = New-Object System.Drawing.Rectangle(114, 80, 260, 20)
$badgeBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 223, 66, 82))
$g.FillRectangle($badgeBg, $badgeRect)
$g.DrawRectangle($penRed, $badgeRect)
$g.DrawString("PRIVACY, POP-UP & AD BLOCKER (v1.0.31)", $fontBadge, $brushWhite, 118, 83)

$g.DrawString("[+] Zero Popups, Popunders & Fullscreen Traps", $fontSub, $brushWhite, 24, 122)
$g.DrawString("[+] Anti-Redirect & History Trapping Defense", $fontSub, $brushCyan, 24, 148)
$g.DrawString("[+] Video Pre-roll & VAST Defuser (Error 224003)", $fontSub, $brushRedBright, 24, 174)
$g.DrawString("[+] Anti-Tracking, Canvas Spoofing & Shadow DOM", $fontSub, $brushEmerald, 24, 200)
$g.DrawString("[+] Light & Dark Tone  |  4 Languages (EN/ES/ZH/RU)", $fontSub, $brushAmber, 24, 226)
$g.DrawString("100% Free - Manifest V3 - Zero Telemetry - StreamGrabber 2 Companion", $fontDesc, $brushGray, 24, 256)

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
    $colBgDark,
    [System.Drawing.Color]::FromArgb(20, 14, 36)
)
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

$glowBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 223, 66, 82))
$glowBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 0, 135, 205))
$g.FillEllipse($glowBrush1, -120, -120, 520, 520)
$g.FillEllipse($glowBrush2, ($w - 380), ($h - 380), 550, 550)

$borderPen3 = New-Object System.Drawing.Pen($colRed, 3)
$g.DrawRectangle($borderPen3, 2, 2, ($w - 4), ($h - 4))

if ($highResIcon) {
    $iconRect = New-Object System.Drawing.Rectangle(75, 55, 165, 165)
    $g.DrawImage($highResIcon, $iconRect)
}

$fontHero = New-Object System.Drawing.Font("Segoe UI", 42, [System.Drawing.FontStyle]::Bold)
$fontFormer = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$fontTagline = New-Object System.Drawing.Font("Segoe UI", 17, [System.Drawing.FontStyle]::Bold)
$fontCardTitle = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$fontCardDesc = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
$fontPill = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)

$g.DrawString("XtremeShld", $fontHero, $brushWhite, 260, 50)
$g.DrawString("(formerly ExtremeShield)", $fontFormer, $brushRedBright, 610, 66)
$g.DrawString("Ultimate Privacy, Pop-up & Ad Blocker (Manifest V3)", $fontTagline, $brushCyan, 265, 126)
$g.DrawString("Ultra-Fast Local DNR Engine - Zero Paywalls - Zero Telemetry - StreamGrabber 2 Companion", $fontCardDesc, $brushGray, 268, 168)

$cards = @(
    @{ title = "Anti-Popups & Fullscreen"; desc = "Intercepts window.open at document_start, defuses popunders and deceptive full-screen traps."; col = $colRedBright },
    @{ title = "Anti-Redirect & History Trap"; desc = "Neutralizes timer-based redirects and history.pushState loops that freeze the Back button."; col = $colCyan },
    @{ title = "Video & VAST Defuser"; desc = "Fixes Error 224003 on JWPlayer/HTML5 and automatically skips video pre-roll ad timers."; col = $colAmber },
    @{ title = "Shadow DOM & Fingerprinting"; desc = "Deep recursive open shadow root scanner plus Canvas & Audio micro-noise spoofing."; col = $colEmerald }
)

$cardW = 285
$cardH = 160
$cardY = 265
$startX = 75
$gap = 25

for ($i = 0; $i -lt $cards.Count; $i++) {
    $cx = $startX + ($i * ($cardW + $gap))
    $cRect = New-Object System.Drawing.Rectangle($cx, $cardY, $cardW, $cardH)
    
    $cardBg = New-Object System.Drawing.SolidBrush($colBgCard)
    $g.FillRectangle($cardBg, $cRect)
    
    $cBorder = New-Object System.Drawing.Pen($cards[$i].col, 1.5)
    $g.DrawRectangle($cBorder, $cRect)
    
    $cTitleBrush = New-Object System.Drawing.SolidBrush($cards[$i].col)
    $g.DrawString($cards[$i].title, $fontCardTitle, $cTitleBrush, ($cx + 12), ($cardY + 14))
    
    $rectText = New-Object System.Drawing.RectangleF([float]($cx + 12), [float]($cardY + 46), [float]($cardW - 24), [float]($cardH - 54))
    $g.DrawString($cards[$i].desc, $fontCardDesc, $brushGray, $rectText)
}

# Pills on the top right
$p1 = New-Object System.Drawing.Rectangle(1050, 50, 270, 34)
$pBg1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 223, 66, 82))
$g.FillRectangle($pBg1, $p1)
$g.DrawRectangle($penRed, $p1)
$g.DrawString("100% FREE & ZERO-LOG", $fontPill, $brushRedBright, 1078, 57)

$p2 = New-Object System.Drawing.Rectangle(1050, 95, 270, 34)
$pBg2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 0, 135, 205))
$g.FillRectangle($pBg2, $p2)
$penCyan15 = New-Object System.Drawing.Pen($colCyan, 1.5)
$g.DrawRectangle($penCyan15, $p2)
$g.DrawString("LIGHT & DARK THEME", $fontPill, $brushCyan, 1070, 102)

$p3 = New-Object System.Drawing.Rectangle(1050, 140, 270, 34)
$pBg3 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 0, 166, 61))
$g.FillRectangle($pBg3, $p3)
$penEmerald = New-Object System.Drawing.Pen($colEmerald, 1.5)
$g.DrawRectangle($penEmerald, $p3)
$g.DrawString("4 LANGUAGES: EN/ES/ZH/RU", $fontPill, $brushEmerald, 1066, 147)

$g.DrawString("Core Element Zapper (Alt+Shift+Z)  |  Cookie Wall Auto-Dismissal  |  Scroll-Lock Recovery  |  StreamGrabber 2 Companion", $fontCardDesc, $brushGray, 75, 485)

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
        [System.Drawing.Color]::FromArgb(18, 14, 30)
    )
    $sg.FillRectangle($sBgBrush, 0, 0, $sw, $sh)

    $sgGlow1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 223, 66, 82))
    $sgGlow2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 0, 135, 205))
    $sg.FillEllipse($sgGlow1, -120, -120, 500, 500)
    $sg.FillEllipse($sgGlow2, ($sw - 380), ($sh - 380), 500, 500)

    $sBorder = New-Object System.Drawing.Pen($colRed, 2)
    $sg.DrawRectangle($sBorder, 1, 1, ($sw - 2), ($sh - 2))

    $fHead = New-Object System.Drawing.Font("Segoe UI", 25, [System.Drawing.FontStyle]::Bold)
    $fSub = New-Object System.Drawing.Font("Segoe UI", 13.5, [System.Drawing.FontStyle]::Regular)
    $fBrand = New-Object System.Drawing.Font("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)

    if ($highResIcon) {
        $iconMini = New-Object System.Drawing.Rectangle(50, 36, 48, 48)
        $sg.DrawImage($highResIcon, $iconMini)
    }

    $sg.DrawString("XtremeShld (formerly ExtremeShield)", $fBrand, $brushRedBright, 110, 38)
    $sg.DrawString($title, $fHead, $brushWhite, 108, 56)
    $sg.DrawString($subtitle, $fSub, $brushCyan, 110, 106)

    return @{ Bitmap = $sbmp; Graphics = $sg }
}

# =============================================================================
# SCREENSHOT 1: COMMAND & CONTROL CENTER (1280x800)
# =============================================================================
$res = New-ScreenshotBase "Command & Control Center" "Real-time master defense, live tab telemetry, and StreamGrabber design system"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$pw = 420
$ph = 590
$px = 430
$py = 160

$popupBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$sg.FillRectangle($popupBg, $px, $py, $pw, $ph)
$penPop = New-Object System.Drawing.Pen($colRed, 2)
$sg.DrawRectangle($penPop, $px, $py, $pw, $ph)

$fPopTitle = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$fPopSub = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
$fVal = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$fValLbl = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold)

$sg.DrawString("XtremeShld Active", $fPopTitle, $brushWhite, ($px + 20), ($py + 18))
$sg.DrawString("example.com - Protected (v1.0.31)", $fPopSub, $brushRedBright, ($px + 22), ($py + 44))

# Theme indicator button on popup preview
$thBtnRect = New-Object System.Drawing.Rectangle(($px + 338), ($py + 18), 56, 26)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))), $thBtnRect)
$sg.DrawRectangle((New-Object System.Drawing.Pen($colCyan, 1)), $thBtnRect)
$sg.DrawString("DARK", (New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)), $brushCyan, ($px + 348), ($py + 22))

$zapRect = New-Object System.Drawing.Rectangle(($px + 20), ($py + 75), ($pw - 40), 64)
$zapBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 223, 66, 82))
$sg.FillRectangle($zapBg, $zapRect)
$zapPen = New-Object System.Drawing.Pen($colRed, 1.8)
$sg.DrawRectangle($zapPen, $zapRect)

$fZapTitle = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$fZapDesc = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Regular)
$fZapBadge = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)

$sg.DrawString("[ZAP] Element Zapper", $fZapTitle, $brushWhite, ($px + 32), ($py + 85))
$sg.DrawString("Point & click to vaporize any annoying banner", $fZapDesc, $brushGray, ($px + 32), ($py + 109))
$sg.DrawString("Alt+Shift+Z", $fZapBadge, $brushRedBright, ($px + 290), ($py + 88))

$statData = @(
    @{ l = "Popups Blocked"; v = "24"; c = $colRedBright },
    @{ l = "Trackers Blocked"; v = "86"; c = $colCyan },
    @{ l = "Pre-rolls Defused"; v = "12"; c = $colAmber },
    @{ l = "Bandwidth Saved"; v = "6.4 MB"; c = $colEmerald }
)
$sCardW = [int](($pw - 52) / 2)
$sCardH = 68

for ($i = 0; $i -lt 4; $i++) {
    $scx = $px + 20 + ($i % 2) * ($sCardW + 12)
    $scy = $py + 152 + [int]([Math]::Floor($i / 2) * ($sCardH + 10))
    $scRect = New-Object System.Drawing.Rectangle($scx, $scy, $sCardW, $sCardH)
    
    $scBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 34, 58))
    $sg.FillRectangle($scBg, $scRect)
    $sg.DrawRectangle($penCard, $scRect)
    
    $bCol = New-Object System.Drawing.SolidBrush($statData[$i].c)
    $sg.DrawString($statData[$i].v, $fVal, $bCol, ($scx + 12), ($scy + 8))
    $sg.DrawString($statData[$i].l, $fValLbl, $brushGray, ($scx + 12), ($scy + 40))
}

$quickTools = @("Popups", "Redirects", "Cookies", "Anti-Adblock", "Fingerprint", "Pre-rolls")
$qBtnW = [int](($pw - 56) / 3)
for ($i = 0; $i -lt 6; $i++) {
    $qcx = $px + 20 + ($i % 3) * ($qBtnW + 8)
    $qcy = $py + 318 + [int]([Math]::Floor($i / 3) * 42)
    $qRect = New-Object System.Drawing.Rectangle($qcx, $qcy, $qBtnW, 34)
    
    $qBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 34, 58))
    $sg.FillRectangle($qBg, $qRect)
    $qPen = New-Object System.Drawing.Pen($colRed, 1.2)
    $sg.DrawRectangle($qPen, $qRect)
    
    $fTool = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold)
    $sg.DrawString($quickTools[$i], $fTool, $brushWhite, ($qcx + 6), ($qcy + 8))
}

# StreamGrabber 2 Companion Banner in Popup
$sgAdRect = New-Object System.Drawing.Rectangle(($px + 20), ($py + 416), ($pw - 40), 72)
$sgAdGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point($sgAdRect.X, $sgAdRect.Y)),
    (New-Object System.Drawing.Point(($sgAdRect.X + $sgAdRect.Width), ($sgAdRect.Y + $sgAdRect.Height))),
    [System.Drawing.Color]::FromArgb(37, 99, 235),
    [System.Drawing.Color]::FromArgb(2, 132, 199)
)
$sg.FillRectangle($sgAdGrad, $sgAdRect)
$sg.DrawRectangle((New-Object System.Drawing.Pen($colCyan, 1.5)), $sgAdRect)
$sg.DrawString("Try StreamGrabber 2", (New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)), $brushWhite, ($px + 32), ($py + 424))
$sg.DrawString("Download streaming videos & m3u8 playlists at max speed", (New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Regular)), $brushWhite, ($px + 32), ($py + 448))
$sg.DrawString("100% Free Companion Extension", (New-Object System.Drawing.Font("Segoe UI", 7.5, [System.Drawing.FontStyle]::Bold)), $brushAmber, ($px + 32), ($py + 466))

$fCalloutHead = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$fCalloutBody = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)

$lRect = New-Object System.Drawing.Rectangle(50, 240, 330, 200)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $lRect)
$sg.DrawRectangle($penRed, $lRect)
$sg.DrawString("Dual Tone Themes", $fCalloutHead, $brushRedBright, 70, 260)
$sg.DrawString("Instant 1-click toggle between Light Tone and Dark Tone styled after the streamlined StreamGrabber design system.", $fCalloutBody, $brushGray, (New-Object System.Drawing.RectangleF(70.0, 305.0, 290.0, 115.0)))

$rRect = New-Object System.Drawing.Rectangle(900, 240, 330, 200)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $rRect)
$sg.DrawRectangle($penCyan, $rRect)
$sg.DrawString("Zero-Log & Free", $fCalloutHead, $brushCyan, 920, 260)
$sg.DrawString("Zero user data collection, zero telemetry analytics, and zero paywalls. Everything is processed 100% locally on your computer.", $fCalloutBody, $brushGray, (New-Object System.Drawing.RectangleF(920.0, 305.0, 290.0, 115.0)))

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_1_control_center_1280x800"
$sbmp.Dispose()

# =============================================================================
# SCREENSHOT 2: PROMINENT ELEMENT ZAPPER (1280x800)
# =============================================================================
$res = New-ScreenshotBase "Prominent Element Zapper" "Laser-targeted point & click to vaporize intrusive banners, modals, and overlays"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$pageRect = New-Object System.Drawing.Rectangle(80, 160, 1120, 570)
$pageBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$sg.FillRectangle($pageBg, $pageRect)
$sg.DrawRectangle($penCard, $pageRect)

$wpHeader = New-Object System.Drawing.Rectangle(80, 160, 1120, 50)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 38, 54))), $wpHeader)
$sg.DrawString("news-portal-example.com/article", (New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)), $brushGray, 105, 175)

$zapTarget = New-Object System.Drawing.Rectangle(240, 260, 800, 280)
$zapTargetBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 223, 66, 82))
$sg.FillRectangle($zapTargetBg, $zapTarget)
$penZapLase = New-Object System.Drawing.Pen($colRed, 2.5)
$penZapLase.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$sg.DrawRectangle($penZapLase, $zapTarget)

$bannerBox = New-Object System.Drawing.Rectangle(320, 300, 640, 190)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))), $bannerBox)
$sg.DrawString("INTRUSIVE OVERLAY / NEWSLETTER POPUP", (New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)), $brushRedBright, 440, 340)
$sg.DrawString("XtremeShld laser target locked on element: div.newsletter-modal-backdrop", (New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Regular)), $brushGray, 380, 385)
$sg.DrawString("Click anywhere to permanently vaporize this element from this domain", (New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Italic)), $brushCyan, 410, 420)

$hudRect = New-Object System.Drawing.Rectangle(410, 580, 460, 65)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 28, 44))), $hudRect)
$sg.DrawRectangle($penRed, $hudRect)
$sg.DrawString("ZAPPER HUD ACTIVE", (New-Object System.Drawing.Font("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)), $brushRedBright, 430, 592)
$sg.DrawString("Click: Zap Element  -  Esc: Cancel  -  Alt+Shift+Z", (New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)), $brushWhite, 430, 616)

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_2_element_zapper_1280x800"
$sbmp.Dispose()

# =============================================================================
# SCREENSHOT 3: ANTI-REDIRECT & HISTORY TRAPPING (1280x800)
# =============================================================================
$res = New-ScreenshotBase "Anti-Redirect & History Trapping Shield" "Neutralizes timer redirects, background tab-under exploits, and back-button pushState loops"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$tRect = New-Object System.Drawing.Rectangle(80, 165, 1120, 565)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $tRect)
$sg.DrawRectangle($penCyan, $tRect)

$thRect = New-Object System.Drawing.Rectangle(80, 165, 1120, 50)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 38, 54))), $thRect)
$fTh = New-Object System.Drawing.Font("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)
$sg.DrawString("DEFENSE ENGINE", $fTh, $brushWhite, 110, 180)
$sg.DrawString("HIJACK VECTOR TRAPPED", $fTh, $brushWhite, 460, 180)
$sg.DrawString("DEFENSE STATUS", $fTh, $brushWhite, 940, 180)

$rowsRedirect = @(
    @{ e = "History Back-Button Trap"; v = "history.pushState flood (>5 calls in 500ms defused)"; s = "TRAPPED & SUPPRESSED"; c = $colRedBright },
    @{ e = "Deceptive Fullscreen Hijack"; v = "requestFullscreen() called without user media gesture"; s = "REJECTED (NotAllowed)"; c = $colAmber },
    @{ e = "Background Tab-Under"; v = "Window refocus & opener hijack to spam landing page"; s = "NEUTRALIZED"; c = $colCyan },
    @{ e = "Delayed Timer Redirect"; v = "window.location.replace / href redirect hijack"; s = "INTERCEPTED (0ms)"; c = $colRedBright },
    @{ e = "Meta Refresh Hijack"; v = "<meta http-equiv='refresh' content='0;url=...'>"; s = "REMOVED FROM DOM"; c = $colEmerald },
    @{ e = "Synthetic Anchor Click"; v = "el.dispatchEvent(fakeClick) targeting ad network"; s = "CLICK DISARMED"; c = $colCyan },
    @{ e = "JWPlayer VAST Ad Preroll"; v = "fetch / XHR VAST ad request causing Error 224003"; s = "EMPTY VAST RETURNED"; c = $colEmerald }
)

$fRowE = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$fRowV = New-Object System.Drawing.Font("Consolas", 10.5, [System.Drawing.FontStyle]::Regular)
$fRowS = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)

for ($i = 0; $i -lt $rowsRedirect.Count; $i++) {
    $ry = 225 + ($i * 68)
    $rBg = if ($i % 2 -eq 0) { [System.Drawing.Color]::FromArgb(22, 30, 46) } else { [System.Drawing.Color]::FromArgb(17, 24, 38) }
    $sg.FillRectangle((New-Object System.Drawing.SolidBrush($rBg)), 82, $ry, 1116, 64)
    
    $sg.DrawString($rowsRedirect[$i].e, $fRowE, $brushWhite, 110, ($ry + 20))
    $sg.DrawString($rowsRedirect[$i].v, $fRowV, $brushGray, 460, ($ry + 22))
    
    $actBrush = New-Object System.Drawing.SolidBrush($rowsRedirect[$i].c)
    $sg.DrawString($rowsRedirect[$i].s, $fRowS, $actBrush, 940, ($ry + 20))
}

$sg.Dispose()
Save-StoreImage $sbmp "screenshot_3_anti_redirect_1280x800"
$sbmp.Dispose()

# =============================================================================
# SCREENSHOT 4: CATEGORIZED TRACKER INSPECTOR & SHADOW DOM (1280x800)
# =============================================================================
$res = New-ScreenshotBase "Categorized Tracker Inspector & Shadow DOM" "Transparent real-time telemetry breakdown of every blocked pixel, beacon, and deep shadow tree"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$tRect = New-Object System.Drawing.Rectangle(80, 165, 1120, 565)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $tRect)
$sg.DrawRectangle($penCyan, $tRect)

$thRect = New-Object System.Drawing.Rectangle(80, 165, 1120, 50)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 38, 54))), $thRect)
$fTh = New-Object System.Drawing.Font("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)
$sg.DrawString("TRACKER / TELEMETRY DOMAIN", $fTh, $brushWhite, 110, 180)
$sg.DrawString("CATEGORY", $fTh, $brushWhite, 650, 180)
$sg.DrawString("ACTION TAKEN", $fTh, $brushWhite, 940, 180)

$rows = @(
    @{ d = "google-analytics.com / analytics.js"; cat = "Analytics & Telemetry"; act = "BLOCKED (0ms)"; c = $colEmerald },
    @{ d = "connect.facebook.net / signals / config"; cat = "Social Tracking Pixel"; act = "BLOCKED (0ms)"; c = $colCyan },
    @{ d = "shadow-root: open > script[src*='adservice']"; cat = "Shadow DOM Embedded Tracker"; act = "BLOCKED (0ms)"; c = $colRedBright },
    @{ d = "doubleclick.net / pagead / id"; cat = "Advertising Profile Network"; act = "BLOCKED (0ms)"; c = $colAmber },
    @{ d = "criteo.net / event / tag"; cat = "Behavioral Retargeting"; act = "BLOCKED (0ms)"; c = $colAmber },
    @{ d = "utm_source, fbclid, gclid, mc_cid"; cat = "URL Parameter Tokens"; act = "STRIPPED"; c = $colRedBright },
    @{ d = "Canvas 2D / AudioContext Fingerprint"; cat = "Device Identity Hash"; act = "RANDOMIZED NOISE"; c = $colCyan }
)

$fRow = New-Object System.Drawing.Font("Consolas", 11, [System.Drawing.FontStyle]::Regular)
$fRowCat = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
$fRowAct = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)

for ($i = 0; $i -lt $rows.Count; $i++) {
    $ry = 225 + ($i * 68)
    $rBg = if ($i % 2 -eq 0) { [System.Drawing.Color]::FromArgb(22, 30, 46) } else { [System.Drawing.Color]::FromArgb(17, 24, 38) }
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
# SCREENSHOT 5: MULTI-LANGUAGE SETTINGS & CORE ENGINES (1280x800)
# =============================================================================
$res = New-ScreenshotBase "Multi-Language Settings & Core Engines" "Instant language switcher (EN/ES/ZH/RU), tone selector (Light/Dark), and update checker"
$sg = $res.Graphics
$sbmp = $res.Bitmap

$setRect = New-Object System.Drawing.Rectangle(80, 165, 580, 565)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush($colBgCard)), $setRect)
$sg.DrawRectangle($penRed, $setRect)

# Top Bar inside Settings Card (Language + Tone + Update)
$barRect = New-Object System.Drawing.Rectangle(95, 180, 550, 46)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 34, 58))), $barRect)
$sg.DrawRectangle((New-Object System.Drawing.Pen($colCyan, 1)), $barRect)

$sg.DrawString("Tone: Light / Dark", (New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)), $brushWhite, 108, 194)
$sg.DrawString("Lang: EN | ES | ZH | RU", (New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)), $brushCyan, 275, 194)
$sg.DrawString("Update Now", (New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)), $brushEmerald, 525, 194)

$setItems = @(
    "Aggressive Popup & Fullscreen Blocker",
    "Anti-Redirect & History Trapping Shield",
    "Video Pre-roll & VAST Defuser (Error 224003)",
    "Tracking Armor & Deep Shadow DOM Scanner",
    "Canvas & Audio Fingerprint Randomizer",
    "WebRTC IP Leak Defense",
    "Cookie Consent Auto-Dismiss & Scroll Unlock"
)

$fSet = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
for ($i = 0; $i -lt $setItems.Count; $i++) {
    $sy = 245 + ($i * 64)
    $sg.DrawString($setItems[$i], $fSet, $brushWhite, 110, $sy)
    
    # info button
    $iBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 223, 66, 82))
    $sg.FillEllipse($iBg, 510, ($sy - 2), 26, 26)
    $sg.DrawEllipse($penRed, 510, ($sy - 2), 26, 26)
    $sg.DrawString("i", (New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)), $brushRedBright, 519, ($sy + 1))
    
    # Toggle switch (ON)
    $swRect = New-Object System.Drawing.Rectangle(560, $sy, 44, 22)
    $sg.FillRectangle((New-Object System.Drawing.SolidBrush($colEmerald)), $swRect)
    $sg.FillEllipse($brushWhite, 582, ($sy + 1), 20, 20)
}

# Modal Popup Preview on Right
$mRect = New-Object System.Drawing.Rectangle(710, 165, 490, 565)
$sg.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))), $mRect)
$sg.DrawRectangle($penCyan, $mRect)

$sg.DrawString("Interactive Feature Info Modal", (New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)), $brushCyan, 735, 190)

$mCards = @(
    @{ title = "What it does"; desc = "Intercepts window.open calls, neutralizes timer-based redirects, fullscreen hijacks, and rapid history.pushState loops."; col = $colWhite; bg = [System.Drawing.Color]::FromArgb(24, 34, 58) },
    @{ title = "Privacy & Security Benefit"; desc = "Eliminates 100% of deceptive popups, prevents scroll lockouts, and fixes video playback collapse like Error 224003."; col = $colRedBright; bg = [System.Drawing.Color]::FromArgb(35, 223, 66, 82) },
    @{ title = "Compatibility & Experience"; desc = "Legitimate navigation, SPAs (YouTube, Twitter), and Google/GitHub single sign-on logins continue functioning smoothly."; col = $colEmerald; bg = [System.Drawing.Color]::FromArgb(35, 0, 166, 61) }
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
