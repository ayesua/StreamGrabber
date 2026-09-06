# StreamGrabber - Chrome Web Store Production Packaging Script
$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $workspace) { $workspace = Get-Location }
Set-Location $workspace

$manifestJson = Get-Content -Raw "manifest.json" | ConvertFrom-Json
$version = $manifestJson.version
$zipFileName = "StreamGrabber-v$version.zip"
$zipPath = Join-Path $workspace $zipFileName

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Packing StreamGrabber v$version for CWS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$runtimeFiles = @(
    "manifest.json",
    "background.js",
    "content.js",
    "hls.light.min.js",
    "hlsEngine.js",
    "offscreen.html",
    "offscreen.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js",
    "premium.html",
    "success.html",
    "styles.css",
    "icon16.png",
    "icon48.png",
    "icon128.png"
)

$stagingDir = Join-Path $env:TEMP "streamgrabber_pkg_$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stagingDir | Out-Null

try {
    foreach ($file in $runtimeFiles) {
        $destPath = Join-Path $stagingDir $file
        $destDir = Split-Path -Parent $destPath
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path (Join-Path $workspace $file) -Destination $destPath
    }

    if (Test-Path $zipPath) {
        Remove-Item -Force $zipPath
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    $zipItem = Get-Item $zipPath
    $zipSizeKB = [Math]::Round($zipItem.Length / 1024, 2)

    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Archive created: $zipPath" -ForegroundColor Green
    Write-Host "Archive size:    $zipSizeKB KB" -ForegroundColor Green
    Write-Host "Packaged files:  $($runtimeFiles.Count) files" -ForegroundColor Green
}
finally {
    if (Test-Path $stagingDir) {
        Remove-Item -Recurse -Force $stagingDir
    }
}
