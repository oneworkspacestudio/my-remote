param([Parameter(Mandatory=$true)][string]$Data,[Parameter(Mandatory=$true)][string]$Runtime,[int]$Port=9136)
$ErrorActionPreference='Stop'
$Data=[IO.Path]::GetFullPath($Data)
$Runtime=[IO.Path]::GetFullPath($Runtime)
$taskHost=Join-Path $Runtime 'host/tvnserver.exe'
if ((Get-FileHash -LiteralPath $taskHost -Algorithm SHA256).Hash -ne '68BE8F45403AFBD5BC2312B39E40689FAC9A0F00986F1E5773BA8845B2B050E8') { throw 'Unexpected Windows host binary' }
if ((Get-AuthenticodeSignature -LiteralPath $taskHost).Status -ne 'Valid') { throw 'Windows host signature is not valid' }
if (Get-Process tvnserver -ErrorAction SilentlyContinue) { throw 'A TightVNC host is already running. Preserve it; do not overwrite its configuration.' }
$taskKey='HKCU:/Software/TightVNC/Server'
if (Test-Path $taskKey) {
 $taskExisting=Get-ItemProperty $taskKey
 if ($taskExisting.MyRemoteData -ne $Data) { throw 'Existing TightVNC settings are not owned by this installation' }
}
New-Item -ItemType Directory -Path $Data -Force | Out-Null
$taskSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $Data /inheritance:r /grant:r "*${taskSid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not protect private host data' }
$taskConfigPath=Join-Path $Data 'host-secret.json'
if (!(Test-Path $taskConfigPath)) {
 & (Join-Path $Runtime 'node.exe') (Join-Path $Runtime 'scripts/create-host-secret.cjs') $taskConfigPath $Port
 if ($LASTEXITCODE -ne 0) { throw 'Could not create host authentication' }
}
$taskConfig=Get-Content -LiteralPath $taskConfigPath -Raw | ConvertFrom-Json
if ($taskConfig.port -ne $Port) { throw 'Host port does not match existing private configuration' }
New-Item -Path $taskKey -Force | Out-Null
(@{RfbPort=$Port;AcceptRfbConnections=1;UseVncAuthentication=1;AllowLoopback=1;LoopbackOnly=1;AcceptHttpConnections=0;EnableFileTransfers=0;UseControlAuthentication=0;RemoveWallpaper=0;DisableTrayIcon=0}).GetEnumerator() | ForEach-Object { New-ItemProperty -Path $taskKey -Name $_.Key -PropertyType DWord -Value $_.Value -Force | Out-Null }
[byte[]]$taskPasswordBytes=for($i=0;$i -lt $taskConfig.registryPassword.Length;$i+=2){[Convert]::ToByte($taskConfig.registryPassword.Substring($i,2),16)}
New-ItemProperty -Path $taskKey -Name Password -PropertyType Binary -Value $taskPasswordBytes -Force | Out-Null
New-ItemProperty -Path $taskKey -Name MyRemoteData -PropertyType String -Value $Data -Force | Out-Null
Write-Host 'Configured authenticated Windows host for loopback access only.'
