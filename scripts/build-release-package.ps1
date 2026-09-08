param(
    [Parameter(Mandatory = $true)]
    [string]$ThesisRepository,
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,
    [string]$ApplicationTag = 'tfg-v1.0.0',
    [string]$ThesisTag = 'tfg-v1.0.0'
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param([string]$Repository, [string[]]$Arguments)
    $result = & git -C $Repository @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed in $Repository"
    }
    return $result
}

function Get-PortableRelativePath {
    param([string]$BasePath, [string]$TargetPath)
    $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
    $target = [System.IO.Path]::GetFullPath($TargetPath)
    $baseUri = New-Object System.Uri($base)
    $targetUri = New-Object System.Uri($target)
    return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString())
}

$applicationRepository = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$thesisRepositoryPath = (Resolve-Path $ThesisRepository).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
$workspacePath = [System.IO.Path]::GetFullPath((Join-Path $applicationRepository '..'))

if (-not $outputPath.StartsWith($workspacePath + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'OutputDirectory must stay inside the shared workspace.'
}

$releaseName = 'metricas-tfg-1.0.0'
$stagingPath = Join-Path $outputPath $releaseName
$zipPath = Join-Path $outputPath "$releaseName.zip"
$applicationArchive = Join-Path $outputPath 'application-source.zip'
$thesisArchive = Join-Path $outputPath 'thesis-source.zip'

if (Test-Path -LiteralPath $stagingPath) {
    $resolvedStaging = [System.IO.Path]::GetFullPath($stagingPath)
    if (-not $resolvedStaging.StartsWith($outputPath + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing to remove a staging directory outside OutputDirectory.'
    }
    Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $outputPath, $stagingPath | Out-Null
Remove-Item -LiteralPath $applicationArchive, $thesisArchive, $zipPath -Force -ErrorAction SilentlyContinue

$applicationCommit = (Invoke-Git $applicationRepository @('rev-list', '-n', '1', $ApplicationTag)).Trim()
$thesisCommit = (Invoke-Git $thesisRepositoryPath @('rev-list', '-n', '1', $ThesisTag)).Trim()
if ((Invoke-Git $applicationRepository @('rev-parse', 'HEAD')).Trim() -ne $applicationCommit) {
    throw 'The application checkout must be at ApplicationTag before packaging evidence.'
}
if ((Invoke-Git $thesisRepositoryPath @('rev-parse', 'HEAD')).Trim() -ne $thesisCommit) {
    throw 'The thesis checkout must be at ThesisTag before packaging evidence.'
}

Invoke-Git $applicationRepository @('archive', '--format=zip', '--output', $applicationArchive, $ApplicationTag) | Out-Null
Invoke-Git $thesisRepositoryPath @('archive', '--format=zip', '--output', $thesisArchive, $ThesisTag) | Out-Null

$applicationPath = Join-Path $stagingPath 'codigo-aplicacion'
$thesisPath = Join-Path $stagingPath 'memoria-fuentes'
Expand-Archive -LiteralPath $applicationArchive -DestinationPath $applicationPath
Expand-Archive -LiteralPath $thesisArchive -DestinationPath $thesisPath

$evidencePath = Join-Path $stagingPath 'evidencias'
New-Item -ItemType Directory -Force -Path $evidencePath | Out-Null
foreach ($relativeEvidencePath in @('reports\verification', 'reports\quality', 'reports\e2e', 'coverage', 'playwright-report')) {
    $source = Join-Path $applicationRepository $relativeEvidencePath
    if (Test-Path -LiteralPath $source) {
        Copy-Item -LiteralPath $source -Destination $evidencePath -Recurse
    }
}
$evidenceManifest = Join-Path $applicationRepository 'reports\evidence-manifest.json'
if (Test-Path -LiteralPath $evidenceManifest) {
    Copy-Item -LiteralPath $evidenceManifest -Destination $evidencePath
}

$deliverablesPath = Join-Path $stagingPath 'entregables'
New-Item -ItemType Directory -Force -Path $deliverablesPath | Out-Null
Copy-Item -LiteralPath (Join-Path $thesisPath 'output\Memoria_TFG_Miguel_Martinez_Mestre_final.pdf') -Destination $deliverablesPath
Copy-Item -LiteralPath (Join-Path $thesisPath 'output\Presentacion_TFG_Miguel_Martinez_Mestre_final.pptx') -Destination $deliverablesPath

$files = Get-ChildItem -LiteralPath $stagingPath -Recurse -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{
        path = Get-PortableRelativePath $stagingPath $_.FullName
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
$manifest = [ordered]@{
    schemaVersion = 1
    release = $releaseName
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    application = [ordered]@{ tag = $ApplicationTag; commit = $applicationCommit }
    thesis = [ordered]@{ tag = $ThesisTag; commit = $thesisCommit }
    files = $files
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$manifestPath = Join-Path $stagingPath 'manifest.json'
[System.IO.File]::WriteAllText($manifestPath, (($manifest | ConvertTo-Json -Depth 6) + [Environment]::NewLine), $utf8NoBom)

$hashLines = Get-ChildItem -LiteralPath $stagingPath -Recurse -File | Sort-Object FullName | ForEach-Object {
    $relative = Get-PortableRelativePath $stagingPath $_.FullName
    "$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $relative"
}
[System.IO.File]::WriteAllLines((Join-Path $stagingPath 'SHA256SUMS.txt'), [string[]]$hashLines, $utf8NoBom)

Compress-Archive -Path (Join-Path $stagingPath '*') -DestinationPath $zipPath -CompressionLevel Optimal
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText("$zipPath.sha256", "$zipHash  $releaseName.zip$([Environment]::NewLine)", $utf8NoBom)
Remove-Item -LiteralPath $applicationArchive, $thesisArchive -Force

Write-Output "Package: $zipPath"
Write-Output "SHA-256: $zipHash"
