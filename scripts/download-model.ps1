$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$modelRoot = Join-Path $projectRoot 'models'
$archivePath = Join-Path $env:TEMP 'expression-trainer-sherpa-model.tar.bz2'
$modelUrl = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20.tar.bz2'

New-Item -ItemType Directory -Force -Path $modelRoot | Out-Null
Write-Host 'Downloading the bilingual streaming ASR model (several hundred MB)...'
Invoke-WebRequest -Uri $modelUrl -OutFile $archivePath
tar -xjf $archivePath -C $modelRoot
Write-Host "Model extracted to $modelRoot"
Write-Host 'Select the extracted model directory in application settings.'
