$ErrorActionPreference = "Stop"

$Repo = if ($env:COMET_REPO) { $env:COMET_REPO } else { "fraiocc/comet" }
$InstallDir = if ($env:COMET_INSTALL_DIR) { $env:COMET_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "comet\bin" }
$ExePath = Join-Path $InstallDir "comet.exe"

Write-Host "Installing Comet CLI..." -ForegroundColor Cyan

$ApiUrl = "https://api.github.com/repos/$Repo/releases/latest"
$Headers = @{ "User-Agent" = "comet-installer" }

try {
    $Release = Invoke-RestMethod -Uri $ApiUrl -Headers $Headers
} catch {
    Write-Error "Failed to fetch latest release from $ApiUrl. Set COMET_REPO if using a custom fork."
    exit 1
}

$Asset = $Release.assets | Where-Object {
    $_.name -match "windows" -and ($_.name -match "\.zip$" -or $_.name -match "\.exe$")
} | Select-Object -First 1

if (-not $Asset) {
    Write-Error "No Windows release asset found in $($Release.tag_name)."
    exit 1
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$TempFile = Join-Path $env:TEMP $Asset.name

Write-Host "Downloading $($Asset.name) ($($Release.tag_name))..." -ForegroundColor DarkGray
Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $TempFile -UseBasicParsing

if ($Asset.name -match "\.zip$") {
    $ExtractDir = Join-Path $env:TEMP ("comet-extract-" + [guid]::NewGuid().ToString("N"))
    Expand-Archive -Path $TempFile -DestinationPath $ExtractDir -Force
    $Found = Get-ChildItem -Path $ExtractDir -Filter "comet.exe" -Recurse | Select-Object -First 1
    if (-not $Found) {
        Write-Error "comet.exe not found inside archive."
        exit 1
    }
    Copy-Item -Path $Found.FullName -Destination $ExePath -Force
    Remove-Item -Path $ExtractDir -Recurse -Force
} else {
    Move-Item -Path $TempFile -Destination $ExePath -Force
}

if (Test-Path $TempFile) {
    Remove-Item -Path $TempFile -Force
}

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not ($UserPath -split ";" | Where-Object { $_ -eq $InstallDir })) {
    $NewPath = if ($UserPath) { "$UserPath;$InstallDir" } else { $InstallDir }
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    $env:Path = "$env:Path;$InstallDir"
    Write-Host "Added $InstallDir to user PATH." -ForegroundColor DarkGray
}

Write-Host "Comet $($Release.tag_name) installed to $ExePath" -ForegroundColor Green
Write-Host "Restart your terminal and run: comet" -ForegroundColor Cyan
