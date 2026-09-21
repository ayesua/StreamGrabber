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

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    # We construct the 2 crossed downward arrows directly with explicit points:
    # An "X" has two diagonal lines:
    # Diagonal 1 (\): starts top-left, goes down-right.
    # Diagonal 2 (/): starts top-right, goes down-left.
    # At the BOTTOM of each diagonal is a downward-pointing arrowhead!
    # BOTH arrows point downward and are completely separated at the bottom!

    # Normalized scale: center is at (s/2, s/2)
    # Let's define:
    # Center = (s/2, s/2)
    # Arrow 1 (\):
    # Shaft starts at top-left: (-0.26*s, -0.28*s)
    # Arrowhead tip at bottom-right: (+0.25*s, +0.27*s)
    
    # Arrow 2 (/):
    # Shaft starts at top-right: (+0.26*s, -0.28*s)
    # Arrowhead tip at bottom-left: (-0.25*s, +0.27*s)

    # Notice the separation at the bottom:
    # Tip 1 is at X = +0.25*s
    # Tip 2 is at X = -0.25*s
    # Total distance between bottom tips = 0.50 * s (over 64 pixels apart on 128x128!)
    # And at the top:
    # Shaft 1 is at X = -0.26*s
    # Shaft 2 is at X = +0.26*s
    # Total distance between top shafts = 0.52 * s
    # They cross exactly in the center (0, 0)!
    # This forms a classic, bold, balanced 'X'!

    # Let's create the arrow polygon in local coordinates along its direction vector, then rotate and place:
    # For an arrow pointing along the diagonal:
    # Direction angle for Arrow 1 (\): 45 degrees clockwise from +Y axis (downward-right)
    # Wait, in standard math / GDI+:
    # If arrow is created pointing DOWN (along +Y):
    # Top of shaft is at (0, -L_tail)
    # Tip of arrow is at (0, +L_head)
    # In GDI+, Matrix.Rotate(theta):
    # For theta = +135 deg? Let's check rotation matrix:
    # [x', y'] = [x*cos(th) - y*sin(th), x*sin(th) + y*cos(th)]
    # If (x=0, y=1) [down]:
    # Rotate(+45 deg):
    # x' = -1 * sin(45) = -0.707 (LEFT!)
    # y' = 1 * cos(45) = +0.707 (DOWN!)
    # So Rotate(+45) turned DOWN into DOWN-LEFT!
    # That is why Rotate(+45) pointed to the bottom-left!
    # And Rotate(-45):
    # x' = -1 * sin(-45) = +0.707 (RIGHT!)
    # y' = 1 * cos(-45) = +0.707 (DOWN!)
    # So Rotate(-45) turned DOWN into DOWN-RIGHT!

    # NOW: Why did the previous heads touch?
    # Because if arrow 1 has tail at top-left and head at bottom-right...
    # WAIT! Look at what was at the top:
    # At (0, -0.32), rotated by -45:
    # x' = -(-0.32)*sin(-45) = -0.32*0.707 = -0.22 (top-left)
    # y' = -0.32*cos(-45) = -0.22 (top)
    # And head was at (0, +0.34):
    # x' = -(0.34)*sin(-45) = +0.24 (bottom-right)
    # y' = +0.24 (bottom)
    # But in the previous code:
    # $headBotY was 0.34, and $headTopY was 0.10.
    # $headHw was 0.105.
    # The head wings were at Y = 0.10, X = +-0.105!
    # Rotated by -45:
    # x' for wing (-0.105, 0.10):
    # x' = -0.105*0.707 - 0.10*(-0.707) = -0.074 + 0.070 = 0!
    # The inner wing of Arrow 1 was at X = 0!
    # And the inner wing of Arrow 2 was at X = 0!
    # They touched at X = 0 (the center line)!

    # To separate the heads at the bottom:
    # 1. We shorten the arrowheads so they are positioned further along the arms, or
    # 2. We shift the arrows slightly outward from the vertical axis, or
    # 3. We use a steeper angle or a more compact arrowhead!
    # Better yet, let's calculate:
    # If we shift the centers of the two arrows:
    # Arrow 1 shifted by (+shift, 0) or perpendicular to its axis?
    # Or simply: make the angle 45 degrees, shaft bold ($hw = 0.06 * s),
    # and adjust the arrowhead so the inner wing stays far away from the center line!

    function Build-ArrowPath {
        param([float]$scale, [float]$angle, [float]$shiftX, [float]$shiftY)
        $p = New-Object System.Drawing.Drawing2D.GraphicsPath
        
        $hw = $scale * 0.062         # Bold shaft (width = 12.4% of icon)
        $topY = -$scale * 0.33       # Starts near top
        $headTopY = $scale * 0.16    # Arrowhead begins at +16% (further down so inner wings don't touch!)
        $headBotY = $scale * 0.36    # Arrowhead tip at +36%
        $headHw = $scale * 0.130     # Arrowhead wing width

        # Vertices of downward arrow:
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
        $m.Translate([float]($scale / 2.0 + $shiftX), [float]($scale / 2.0 + $shiftY))
        $m.Rotate($angle)
        $p.Transform($m)
        $m.Dispose()
        return $p
    }

    # Arrow 1: Top-Left to Bottom-Right (rotated -45 deg)
    $path1 = Build-ArrowPath $s -45.0 0.0 0.0
    # Arrow 2: Top-Right to Bottom-Left (rotated +45 deg)
    $path2 = Build-ArrowPath $s 45.0 0.0 0.0

    # Draw both arrows
    $g.FillPath($whiteBrush, $path1)
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
