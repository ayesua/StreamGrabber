Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\yesua\.gemini\antigravity\brain\08ec004a-b763-4b46-8967-4449eae60c78"
$targetDir = "C:\Users\yesua\PY\Browser\StreamGrabber"

$images = @(
    @{ Pattern = "*screenshot1_detection*.jpg"; Out = "screenshot_1_detection_1280x800" },
    @{ Pattern = "*screenshot2_preview*.jpg";   Out = "screenshot_2_preview_1280x800" },
    @{ Pattern = "*screenshot3_floatingbtn*.jpg"; Out = "screenshot_3_floating_button_1280x800" },
    @{ Pattern = "*screenshot4_settings*.jpg";  Out = "screenshot_4_settings_1280x800" },
    @{ Pattern = "*screenshot5_speed*.jpg";     Out = "screenshot_5_speed_1280x800" }
)

foreach ($item in $images) {
    $file = Get-ChildItem -Path $brainDir -Filter $item.Pattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($file) {
        $bmp = [System.Drawing.Image]::FromFile($file.FullName)

        # 1. Save 1280x800 JPG
        $jpgOut = Join-Path $targetDir ($item.Out + ".jpg")
        $targetJpg = New-Object System.Drawing.Bitmap(1280, 800, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $gJpg = [System.Drawing.Graphics]::FromImage($targetJpg)
        $gJpg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gJpg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $gJpg.DrawImage($bmp, 0, 0, 1280, 800)
        $gJpg.Dispose()

        $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]96)
        $targetJpg.Save($jpgOut, $jpgEncoder, $encoderParams)
        $targetJpg.Dispose()

        # 2. Save 1280x800 PNG (Format24bppRgb)
        $pngOut = Join-Path $targetDir ($item.Out + ".png")
        $targetPng = New-Object System.Drawing.Bitmap(1280, 800, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $gPng = [System.Drawing.Graphics]::FromImage($targetPng)
        $gPng.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gPng.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $gPng.DrawImage($bmp, 0, 0, 1280, 800)
        $gPng.Dispose()
        $targetPng.Save($pngOut, [System.Drawing.Imaging.ImageFormat]::Png)
        $targetPng.Dispose()

        $bmp.Dispose()
        Write-Host "Exported $($item.Out) (.jpg and .png 1280x800)"
    }
}
Write-Host "All store screenshots formatted and exported successfully!"
