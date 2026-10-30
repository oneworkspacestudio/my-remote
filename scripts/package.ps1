param([Parameter(Mandatory=$true)][string]$Output,[Parameter(Mandatory=$true)][string]$HostDirectory,[Parameter(Mandatory=$true)][string]$NodeExe,[Parameter(Mandatory=$true)][string]$NodeLicense,[string]$Go='go')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskVersion=(Get-Content (Join-Path $taskRoot 'package.json') -Raw | ConvertFrom-Json).version
$taskOut=[IO.Path]::GetFullPath($Output)
if(Test-Path $taskOut){throw 'Use a new output directory; release payloads are immutable'}
if((Get-FileHash -LiteralPath $NodeExe -Algorithm SHA256).Hash -ne '23062343AD39FC79F12AE39CFB324E93A20CED5F1D342E7B850C148C022DDBCA'){throw 'Expected official Node 26.8.2 x64 runtime'}
if((Get-AuthenticodeSignature -LiteralPath $NodeExe).Status -ne 'Valid'){throw 'Invalid Node publisher signature'}
if((Get-FileHash -LiteralPath (Join-Path $HostDirectory 'tvnserver.exe') -Algorithm SHA256).Hash -ne '68BE8F45403AFBD5BC2312B39E40689FAC9A0F00986F1E5773BA8845B2B050E8'){throw 'Unexpected TightVNC host'}
if((Get-AuthenticodeSignature -LiteralPath (Join-Path $HostDirectory 'tvnserver.exe')).Status -ne 'Valid'){throw 'Invalid TightVNC publisher signature'}
New-Item -ItemType Directory -Force -Path $taskOut,(Join-Path $taskOut 'remote-runtime/engine'),(Join-Path $taskOut 'remote-runtime/host'),(Join-Path $taskOut 'remote-runtime/scripts'),(Join-Path $taskOut 'remote-runtime/node_modules'),(Join-Path $taskOut 'licenses') | Out-Null
Copy-Item -LiteralPath (Join-Path $taskRoot 'dist/MyRemote.exe') -Destination $taskOut
Copy-Item -LiteralPath (Join-Path $taskRoot 'compatibility.json') -Destination $taskOut
Copy-Item -LiteralPath (Join-Path $taskRoot 'LICENSE'),(Join-Path $taskRoot 'NOTICE') -Destination $taskOut
Copy-Item -LiteralPath (Join-Path $taskRoot 'docs/third-party-notices.md') -Destination (Join-Path $taskOut 'THIRD-PARTY-LICENSES.txt')
Copy-Item -LiteralPath $NodeExe -Destination (Join-Path $taskOut 'remote-runtime/node.exe')
foreach($taskFile in @('local-server.cjs','rfb.cjs','security.cjs')){Copy-Item -LiteralPath (Join-Path $taskRoot ('engine/'+$taskFile)) -Destination (Join-Path $taskOut 'remote-runtime/engine')}
foreach($taskScript in @('configure-host.ps1','verify-host.ps1','create-host-secret.cjs','migrate-launchers.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $taskScript) -Destination (Join-Path $taskOut 'remote-runtime/scripts')}
Copy-Item -LiteralPath (Join-Path $taskRoot 'node_modules/ws') -Destination (Join-Path $taskOut 'remote-runtime/node_modules') -Recurse
foreach($taskFile in @('tvnserver.exe','hookldr.exe','sas.dll','screenhooks32.dll','screenhooks64.dll','LICENSE.txt')){Copy-Item -LiteralPath (Join-Path $HostDirectory $taskFile) -Destination (Join-Path $taskOut 'remote-runtime/host')}
Copy-Item -LiteralPath $NodeLicense -Destination (Join-Path $taskOut 'licenses/Node-LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $taskRoot 'LICENSE'),(Join-Path $taskRoot 'NOTICE') -Destination (Join-Path $taskOut 'licenses')
Copy-Item -LiteralPath (Join-Path $taskRoot 'docs/third-party-notices.md') -Destination (Join-Path $taskOut 'licenses')
$taskNoticeCount=0
foreach($taskBase in @((Join-Path $taskRoot 'node_modules'),(Join-Path $taskRoot 'web/node_modules'))){
 foreach($taskLicence in (Get-ChildItem -LiteralPath $taskBase -Recurse -File | Where-Object {$_.Name -match '^(LICENSE|LICENCE|COPYING|NOTICE|OFL)(\.|$|-)'})){
  $taskNoticeCount++
  $taskRelative=$taskLicence.FullName.Substring($taskBase.Length+1) -replace '[\\/:]','_'
  Copy-Item -LiteralPath $taskLicence.FullName -Destination (Join-Path $taskOut ('licenses/npm-'+$taskNoticeCount+'-'+$taskRelative))
 }
}
Push-Location $taskRoot
try{$taskModules=& $Go list -m -f '{{.Dir}}' all;if($LASTEXITCODE -ne 0){throw 'Cannot enumerate Go module licences'}}finally{Pop-Location}
foreach($taskModule in $taskModules){if(!$taskModule){continue};foreach($taskLicence in (Get-ChildItem -LiteralPath $taskModule -File | Where-Object {$_.Name -match '^(LICENSE|LICENCE|COPYING|NOTICE)(\.|$|-)'})){$taskNoticeCount++;Copy-Item -LiteralPath $taskLicence.FullName -Destination (Join-Path $taskOut ('licenses/go-'+$taskNoticeCount+'-'+$taskLicence.Name))}}
$taskFiles=@(Get-ChildItem -LiteralPath $taskOut -Recurse -File | ForEach-Object { @{path=$_.FullName.Substring($taskOut.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower();size=$_.Length} })
@{version=$taskVersion;files=$taskFiles;host='TightVNC 2.8.90 GPL';node='26.8.2';scope='Managed One Workspace app; owner opt-in host'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskOut 'manifest.json') -Encoding utf8
Compress-Archive -Path (Join-Path $taskOut '*') -DestinationPath ($taskOut+'.zip') -CompressionLevel Optimal
Write-Host ('Packaged '+$taskOut+'.zip')
