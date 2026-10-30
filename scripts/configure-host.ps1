param([Parameter(Mandatory=$true)][string]$Data,[Parameter(Mandatory=$true)][string]$Runtime,[int]$Port=9136,[string]$LegacyData,[string]$LegacyExe,[string]$Origin)
$ErrorActionPreference='Stop'
$Data=[IO.Path]::GetFullPath($Data)
$Runtime=[IO.Path]::GetFullPath($Runtime)
$taskHost=Join-Path $Runtime 'host/tvnserver.exe'
if ((Get-FileHash -LiteralPath $taskHost -Algorithm SHA256).Hash -ne '68BE8F45403AFBD5BC2312B39E40689FAC9A0F00986F1E5773BA8845B2B050E8') { throw 'Unexpected Windows host binary' }
if ((Get-AuthenticodeSignature -LiteralPath $taskHost).Status -ne 'Valid') { throw 'Windows host signature is not valid' }

$taskKey='HKCU:/Software/TightVNC/Server'
if (Test-Path $taskKey) {
 $taskExisting=Get-ItemProperty $taskKey
 if ($taskExisting.MyRemoteData -ne $Data) {
  if (!$LegacyData -or !$LegacyExe -or $taskExisting.MyRemoteData -ne [IO.Path]::GetFullPath($LegacyData)) { throw 'Existing TightVNC settings are not owned by this installation' }
  $taskLegacyMarker=Get-Content -LiteralPath (Join-Path $LegacyData 'app.json') -Raw | ConvertFrom-Json
  if($taskLegacyMarker.id -ne 'remote'){throw 'Legacy data does not belong to My Remote'}
  $taskLegacySettings=Join-Path $LegacyData 'remote-settings.json'
  if((Test-Path $taskLegacySettings) -and (Get-Content $taskLegacySettings -Raw | ConvertFrom-Json).owner){throw 'An enrolled standalone host requires explicit data migration'}
  # Retire only the documented, unconfigured per-user preview. All data is kept.
  Get-CimInstance Win32_Process -Filter "Name='MyRemote.exe'" | Where-Object {$_.ExecutablePath -eq $LegacyExe} | ForEach-Object {Stop-Process -Id $_.ProcessId}
  for($i=0;$i -lt 30 -and (Get-Process tvnserver -ErrorAction SilentlyContinue);$i++){Start-Sleep -Milliseconds 100}
  $taskOldShortcut=Join-Path ([Environment]::GetFolderPath('Startup')) 'My Remote.lnk'
  if(Test-Path $taskOldShortcut){
   $taskShell=New-Object -ComObject WScript.Shell
   $taskLink=$taskShell.CreateShortcut($taskOldShortcut)
   if($taskLink.Arguments.Contains((Split-Path $LegacyExe -Parent))){
    $taskSavedShortcut=Join-Path $LegacyData ('startup-before-managed-'+[DateTime]::UtcNow.ToString('yyyyMMddHHmmss')+'.lnk')
    Move-Item -LiteralPath $taskOldShortcut -Destination $taskSavedShortcut
   }
  }
 }
}
if(Get-Process tvnserver -ErrorAction SilentlyContinue){throw 'A TightVNC host is already running'}
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
