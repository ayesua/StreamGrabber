# StreamGrabber - Chrome Web Store Production Packaging Script
# Bundles strictly the production runtime files into StreamGrabber-v<version>.zip

$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $workspace) { $workspace = Get-Location }
Set-Location $workspace

# Read version from manifest.json
$manifestJson = Get-Content -Raw "manifest.json" | ConvertFrom-Json
$version = $manifestJson.version
$zipFileName = "StreamGrabber-v$version.zip"
$zipPath = Join-Path $workspace $zipFileName

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Packing StreamGrabber v$version for CWS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Define strict whitelist of runtime extension files
$runtimeFiles = @(
    "manifest.json",
    "background.js",
    "content.js",
    "hlsEngine.js",
    "hls.light.min.js",
    "offscreen.html",
    "offscreen.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js",
    "styles.css",
    "icon16.png",
    "icon48.png",
    "icon128.png"
)

# Verify all required files exist
$missingFiles = @()
foreach ($file in $runtimeFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "ERROR: Missing required runtime files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

# Create temporary packaging directory
$stagingDir = Join-Path $env:TEMP "streamgrabber_pkg_31173c6cd60c41959b545c76079b9caf"
New-Item -ItemType Directory -Path $stagingDir | Out-Null

try {
    foreach ($file in $runtimeFiles) {
        Copy-Item -Path (Join-Path $workspace $file) -Destination (Join-Path $stagingDir $file)
    }

    # Remove existing zip if present
    if (Test-Path $zipPath) {
        Remove-Item -Force $zipPath
    }

    # Compress archive using standard .NET ZipFile
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    $zipItem = Get-Item $zipPath
    $zipSizeKB = [Math]::Round($zipItem.Length / 1024, 2)

    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Archive created: $zipPath" -ForegroundColor Green
    Write-Host "Archive size:    $zipSizeKB KB" -ForegroundColor Green
    Write-Host "Packaged files:  $($runtimeFiles.Count) files" -ForegroundColor Green

    Write-Host "
Contents included:" -ForegroundColor Yellow
    $runtimeFiles | ForEach-Object { Write-Host " [x] $_" -ForegroundColor DarkGray }
}
finally {
    # Cleanup staging directory
    if (Test-Path $stagingDir) {
        Remove-Item -Recurse -Force $stagingDir
    }
}
