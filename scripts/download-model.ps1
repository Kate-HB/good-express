$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$modelRoot = Join-Path $projectRoot 'models'
$archivePath = Join-Path $env:TEMP 'expression-trainer-sherpa-model.tar.bz2'
$partialPath = "$archivePath.partial"
$modelUrl = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20.tar.bz2'
$expectedBytes = 511274346
$expectedSha256 = '27FFBD9EE24AD186D99ACC2F6354D7992B27BCAB490812510665FA8F9389C5F8'

New-Item -ItemType Directory -Force -Path $modelRoot | Out-Null
if (Test-Path -LiteralPath $archivePath) {
  $existing = Get-Item -LiteralPath $archivePath
  $existingHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
  if ($existing.Length -ne $expectedBytes -or $existingHash -ne $expectedSha256) {
    Remove-Item -LiteralPath $archivePath
  }
}
if (-not (Test-Path -LiteralPath $archivePath)) {
  Write-Host 'Downloading the bilingual streaming ASR model (488 MB)...'
  Invoke-WebRequest -Uri $modelUrl -OutFile $partialPath
  $download = Get-Item -LiteralPath $partialPath
  $downloadHash = (Get-FileHash -LiteralPath $partialPath -Algorithm SHA256).Hash
  if ($download.Length -ne $expectedBytes -or $downloadHash -ne $expectedSha256) {
    Remove-Item -LiteralPath $partialPath
    throw 'Model archive verification failed. Please retry on a stable network.'
  }
  Move-Item -LiteralPath $partialPath -Destination $archivePath
} else {
  Write-Host 'Using the verified model archive in the temporary directory.'
}
tar -xjf $archivePath -C $modelRoot
Write-Host "Model extracted to $modelRoot"
Write-Host 'Select the extracted model directory in application settings.'
