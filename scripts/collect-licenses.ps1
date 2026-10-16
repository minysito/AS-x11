# SPDX-License-Identifier: GPL-3.0-or-later
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskDest = Join-Path $taskRoot 'LICENSES/dependencies'
New-Item -ItemType Directory -Force -Path $taskDest | Out-Null
$taskInventory = [Collections.Generic.List[object]]::new()
function Copy-LicenseFiles($taskName, $taskVersion, $taskLicense, $taskDir) {
    $taskSafe = ($taskName + '-' + $taskVersion) -replace '[^a-zA-Z0-9._-]', '_'
    $taskFiles = @(Get-ChildItem -LiteralPath $taskDir -File | Where-Object { $_.Name -match '^(LICENSE|LICENCE|COPYING|NOTICE|UNLICENSE)' })
    if (Test-Path -LiteralPath (Join-Path $taskDir 'LICENSES')) {
        $taskFiles += Get-ChildItem -LiteralPath (Join-Path $taskDir 'LICENSES') -Recurse -File
    }
    if ($taskFiles.Count) {
        $taskTarget = Join-Path $taskDest $taskSafe
        New-Item -ItemType Directory -Force -Path $taskTarget | Out-Null
        foreach ($taskFile in $taskFiles) { Copy-Item -LiteralPath $taskFile.FullName -Destination (Join-Path $taskTarget $taskFile.Name) }
    }
    $taskInventory.Add([PSCustomObject]@{ package=$taskName; version=$taskVersion; license=$taskLicense; texts=$taskFiles.Count })
}
Push-Location $taskRoot
try {
    $taskMetaRaw = cargo metadata --locked --format-version 1 --manifest-path src-tauri/Cargo.toml
    if ($LASTEXITCODE) { throw 'cargo metadata failed' }
    $taskMeta = ($taskMetaRaw -join "`n") | ConvertFrom-Json
    foreach ($taskPkg in $taskMeta.packages) {
        if ($taskPkg.name -ne 'openshark') { Copy-LicenseFiles ('cargo-' + $taskPkg.name) $taskPkg.version $taskPkg.license (Split-Path $taskPkg.manifest_path -Parent) }
    }
    Get-ChildItem -LiteralPath node_modules -Recurse -Filter package.json -File | ForEach-Object {
        $taskPkg = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
        if ($taskPkg.name -and $taskPkg.version) { Copy-LicenseFiles ('npm-' + $taskPkg.name) $taskPkg.version $taskPkg.license $_.DirectoryName }
    }
    $taskInventory | Sort-Object package,version -Unique | Export-Csv (Join-Path $taskDest 'inventory.csv') -NoTypeInformation -Encoding utf8
} finally { Pop-Location }
