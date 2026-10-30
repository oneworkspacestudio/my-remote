param([string]$LegacyData,[string]$LegacyExe,[string]$WorkspaceURL)
$ErrorActionPreference='Stop'
if(!$LegacyData -or !$LegacyExe -or !(Test-Path -LiteralPath (Join-Path $LegacyData 'app.json'))){exit 0}
$taskMarker=Get-Content -LiteralPath (Join-Path $LegacyData 'app.json') -Raw | ConvertFrom-Json
if($taskMarker.id -ne 'remote'){exit 0}
$taskState=Join-Path $LegacyData 'remote-settings.json'
if((Test-Path $taskState) -and (Get-Content -LiteralPath $taskState -Raw | ConvertFrom-Json).owner){exit 0}
$taskURL=[Uri]$WorkspaceURL
if(!$taskURL.IsAbsoluteUri -or $taskURL.Scheme -notin @('http','https') -or ($taskURL.Scheme -eq 'http' -and !$taskURL.IsLoopback)){throw 'Invalid managed Workspace address'}
$taskLegacyRoot=Split-Path $LegacyExe -Parent
# An unconfigured preview has no enrolled desktop or support grants. Keep all data.
Get-CimInstance Win32_Process -Filter "Name='MyRemote.exe'" | Where-Object {$_.ExecutablePath -eq $LegacyExe} | ForEach-Object {Stop-Process -Id $_.ProcessId}
$taskShell=New-Object -ComObject WScript.Shell
$taskBackup=Join-Path $LegacyData 'managed-launcher-migration'
$taskPaths=@(
 @{path=(Join-Path ([Environment]::GetFolderPath('Startup')) 'My Remote.lnk');retire=$true},
 @{path=(Join-Path ([Environment]::GetFolderPath('Desktop')) 'My Remote.lnk');retire=$false},
 @{path=(Join-Path ([Environment]::GetFolderPath('Programs')) 'My Remote/My Remote.lnk');retire=$false},
 @{path=(Join-Path ([Environment]::GetFolderPath('Programs')) 'My Remote/Stop My Remote.lnk');retire=$true}
)
foreach($taskEntry in $taskPaths){
 if(!(Test-Path -LiteralPath $taskEntry.path)){continue}
 $taskLink=$taskShell.CreateShortcut($taskEntry.path)
 if(!$taskLink.Arguments.Contains($taskLegacyRoot)){continue}
 New-Item -ItemType Directory -Force -Path $taskBackup | Out-Null
 $taskSave=Join-Path $taskBackup (([Guid]::NewGuid().ToString('N'))+'-'+[IO.Path]::GetFileName($taskEntry.path))
 if($taskEntry.retire){Move-Item -LiteralPath $taskEntry.path -Destination $taskSave}
 else{
  Copy-Item -LiteralPath $taskEntry.path -Destination $taskSave
  $taskLink.TargetPath=Join-Path $env:SystemRoot 'explorer.exe'
  $taskLink.Arguments=$taskURL.AbsoluteUri.TrimEnd('/')+'/_workspace/open/remote'
  $taskLink.Description='My Remote in One Workspace'
  $taskLink.WorkingDirectory=Split-Path $taskLink.TargetPath -Parent
  $taskLink.Save()
 }
}
