param(
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")),
  [int]$MinimumDelaySeconds = 1,
  [int]$MaximumRetries = 2
)

$ErrorActionPreference = "Stop"
$sources = @(
  @{ Slug="aviation-safety-act"; EncodedTitle="%ED%95%AD%EA%B3%B5%EC%95%88%EC%A0%84%EB%B2%95"; Seq="281945"; Effective="20260701" },
  @{ Slug="aviation-safety-act-enforcement-decree"; EncodedTitle="%ED%95%AD%EA%B3%B5%EC%95%88%EC%A0%84%EB%B2%95%20%EC%8B%9C%ED%96%89%EB%A0%B9"; Seq="287495"; Effective="20260709" },
  @{ Slug="aviation-safety-act-enforcement-rule"; EncodedTitle="%ED%95%AD%EA%B3%B5%EC%95%88%EC%A0%84%EB%B2%95%20%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99"; Seq="287951"; Effective="20260701" },
  @{ Slug="aviation-business-act"; EncodedTitle="%ED%95%AD%EA%B3%B5%EC%82%AC%EC%97%85%EB%B2%95"; Seq="280131"; Effective="20260603" },
  @{ Slug="aviation-business-act-enforcement-decree"; EncodedTitle="%ED%95%AD%EA%B3%B5%EC%82%AC%EC%97%85%EB%B2%95%20%EC%8B%9C%ED%96%89%EB%A0%B9"; Seq="286173"; Effective="20260603" },
  @{ Slug="aviation-business-act-enforcement-rule"; EncodedTitle="%ED%95%AD%EA%B3%B5%EC%82%AC%EC%97%85%EB%B2%95%20%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99"; Seq="282207"; Effective="20251230" }
)

$log = @()
foreach ($source in $sources) {
  $root = Join-Path $RepositoryRoot "data/sources/drone-license/official-law/$($source.Slug)"
  @("original", "attachments", "normalized", "metadata", "extraction", "validation") | ForEach-Object {
    New-Item -ItemType Directory -Force -Path (Join-Path $root $_) | Out-Null
  }
  $encodedTitle = $source.EncodedTitle
  $requests = @(
    @{ Kind="official-page"; Url="https://www.law.go.kr/%EB%B2%95%EB%A0%B9/$encodedTitle"; Path=(Join-Path $root "original/official-page.html") },
    @{ Kind="full-text-html"; Url="https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=$($source.Seq)&efYd=$($source.Effective)"; Path=(Join-Path $root "original/current-full-text.html") },
    @{ Kind="full-text-pdf"; Url="https://www.law.go.kr/LSW/lsPdfPrint.do?ancYnChk=0&bylChaChk=Y&efGubun=Y&efYd=$($source.Effective)&joAllCheck=Y&joEfOutPutYn=on&lsiSeq=$($source.Seq)&mokChaChk=N"; Path=(Join-Path $root "original/current-full-text.pdf") }
  )
  foreach ($request in $requests) {
    $attempt = 0
    $success = $false
    $httpCode = "000"
    while (-not $success -and $attempt -le $MaximumRetries) {
      $attempt++
      Start-Sleep -Seconds $MinimumDelaySeconds
      $tempPath = "$($request.Path).partial"
      $httpCode = & curl.exe -L --silent --show-error --max-time 90 --output $tempPath --write-out "%{http_code}" $request.Url
      if ($LASTEXITCODE -eq 0 -and $httpCode -eq "200" -and (Test-Path $tempPath) -and (Get-Item $tempPath).Length -gt 0) {
        Move-Item -Force -LiteralPath $tempPath -Destination $request.Path
        $success = $true
      } elseif (Test-Path $tempPath) {
        Remove-Item -Force -LiteralPath $tempPath
      }
    }
    $checksum = if ($success) { "sha256-" + (Get-FileHash -Algorithm SHA256 -LiteralPath $request.Path).Hash.ToLowerInvariant() } else { $null }
    $log += [ordered]@{
      requestedAt = (Get-Date).ToUniversalTime().ToString("o")
      sourceId = "official-$($source.Slug)"
      requestType = $request.Kind
      urlHash = "sha256-" + ([BitConverter]::ToString(([Security.Cryptography.SHA256]::Create()).ComputeHash([Text.Encoding]::UTF8.GetBytes($request.Url))).Replace("-", "").ToLowerInvariant())
      httpStatus = [int]$httpCode
      downloadSucceeded = $success
      checksum = $checksum
      retryCount = $attempt - 1
      finalStatus = if ($success) { "DOWNLOADED" } else { "DOWNLOAD_FAILED" }
    }
  }
}

$logPath = Join-Path $RepositoryRoot "work/source-inventory/source-batch-001-execution.json"
New-Item -ItemType Directory -Force -Path (Split-Path $logPath) | Out-Null
$log | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 -LiteralPath $logPath
Write-Output $logPath
