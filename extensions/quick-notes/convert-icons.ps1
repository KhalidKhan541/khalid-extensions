# Quick Notes - Icon Conversion Script
# Converts SVG icons to PNG format for Chrome extension

Write-Host "Quick Notes Icon Converter" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

$iconsDir = Join-Path $PSScriptRoot "icons"
$svgFiles = Get-ChildItem -Path $iconsDir -Filter "*.svg"

if ($svgFiles.Count -eq 0) {
    Write-Host "No SVG files found in icons directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($svgFiles.Count) SVG files" -ForegroundColor Green
Write-Host ""

# Check if Inkscape is available
$inkscapePath = $null
$possiblePaths = @(
    "C:\Program Files\Inkscape\inkscape.exe",
    "C:\Program Files (x86)\Inkscape\inkscape.exe",
    "${env:LOCALAPPDATA}\Programs\Inkscape\inkscape.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $inkscapePath = $path
        break
    }
}

# Check if ImageMagick is available
$magickPath = $null
if (Get-Command "magick" -ErrorAction SilentlyContinue) {
    $magickPath = "magick"
}

# Check if node with sharp is available
$nodeAvailable = Get-Command "node" -ErrorAction SilentlyContinue

Write-Host "Conversion methods available:" -ForegroundColor Yellow
if ($inkscapePath) { Write-Host "  - Inkscape: $inkscapePath" -ForegroundColor Green }
if ($magickPath) { Write-Host "  - ImageMagick: Available" -ForegroundColor Green }
if ($nodeAvailable) { Write-Host "  - Node.js: Available" -ForegroundColor Green }

Write-Host ""

foreach ($svg in $svgFiles) {
    $baseName = $svg.BaseName
    $pngPath = Join-Path $iconsDir "$baseName.png"
    
    Write-Host "Converting: $($svg.Name)" -ForegroundColor White
    
    if ($inkscapePath) {
        # Use Inkscape
        & $inkscapePath --export-filename=$pngPath --export-dpi=300 $svg.FullName 2>$null
        if (Test-Path $pngPath) {
            Write-Host "  -> Created: $baseName.png (via Inkscape)" -ForegroundColor Green
            continue
        }
    }
    
    if ($magickPath) {
        # Use ImageMagick
        & $magickPath convert -background none -density 300 $svg.FullName $pngPath 2>$null
        if (Test-Path $pngPath) {
            Write-Host "  -> Created: $baseName.png (via ImageMagick)" -ForegroundColor Green
            continue
        }
    }
    
    if ($nodeAvailable) {
        # Use Node.js with sharp or canvas
        $nodeScript = @"
const fs = require('fs');
const path = require('path');

try {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync('$($svg.FullName.Replace('\', '\\'))');
    sharp(svgBuffer)
        .resize(parseInt('$($baseName -replace 'icon', '')'))
        .toFile('$($pngPath.Replace('\', '\\'))')
        .then(() => console.log('OK'))
        .catch(err => console.error(err.message));
} catch (e) {
    console.error('sharp not available');
}
"@
        $result = $nodeScript | node 2>&1
        if ($result -eq "OK") {
            Write-Host "  -> Created: $baseName.png (via Node.js/sharp)" -ForegroundColor Green
            continue
        }
    }
    
    Write-Host "  -> Skipped: No conversion tool available" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Conversion complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: The extension now uses SVG icons directly, which are supported" -ForegroundColor Gray
Write-Host "by Chrome Manifest V3. PNG files are optional but recommended for" -ForegroundColor Gray
Write-Host "better compatibility with some Chrome features." -ForegroundColor Gray
