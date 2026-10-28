param([switch]$NoStart)
$ErrorActionPreference='Stop'
$taskPackage=[IO.Path]::GetFullPath($PSScriptRoot)
$taskManifest=Get-Content -LiteralPath (Join-Path $taskPackage 'manifest.json') -Raw | ConvertFrom-Json
foreach($taskEntry in $taskManifest.files){
 $taskFile=[IO.Path]::GetFullPath((Join-Path $taskPackage $taskEntry.path))
 if(!$taskFile.StartsWith($taskPackage+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid package path'}
 if((Get-FileHash -LiteralPath $taskFile -Algorithm SHA256).Hash -ne $taskEntry.sha256){throw ('Integrity check failed: '+$taskEntry.path)}
}
$taskVersion=$taskManifest.version
if($taskVersion -notmatch '^0\.1\.0-preview\.\d+$'){throw 'Unexpected package version'}
$taskPrograms=Join-Path $env:LOCALAPPDATA 'Programs/OneWorkspace/MyRemote'
$taskTarget=Join-Path $taskPrograms $taskVersion
$taskData=Join-Path $env:LOCALAPPDATA 'OneWorkspace/MyRemote'
if((Test-Path $taskData) -and !(Test-Path (Join-Path $taskData 'app.json')) -and (Get-ChildItem -LiteralPath $taskData -Force | Select-Object -First 1)){throw 'Existing data folder is not a My Remote installation'}
if(Test-Path $taskTarget){throw 'This version is already present. Open My Remote from the Start menu.'}
if(Get-Process tvnserver -ErrorAction SilentlyContinue){throw 'An existing TightVNC host is running. Preserve it before installing My Remote.'}
if(Test-Path 'HKCU:/Software/TightVNC/Server'){
 $taskExisting=Get-ItemProperty 'HKCU:/Software/TightVNC/Server'
 if($taskExisting.MyRemoteData -ne [IO.Path]::GetFullPath($taskData)){throw 'Existing TightVNC settings belong to another installation'}
}
New-Item -ItemType Directory -Force -Path $taskTarget,$taskData | Out-Null
Copy-Item -LiteralPath (Join-Path $taskPackage 'MyRemote.exe'),(Join-Path $taskPackage 'install.ps1'),(Join-Path $taskPackage 'launch.ps1'),(Join-Path $taskPackage 'stop.ps1'),(Join-Path $taskPackage 'manifest.json') -Destination $taskTarget
Copy-Item -LiteralPath (Join-Path $taskPackage 'remote-runtime'),(Join-Path $taskPackage 'licenses') -Destination $taskTarget -Recurse
if(!(Test-Path (Join-Path $taskData 'app.json'))){'{"schema":1,"id":"remote"}' | Set-Content -LiteralPath (Join-Path $taskData 'app.json') -Encoding ascii}
& (Join-Path $taskTarget 'remote-runtime/scripts/configure-host.ps1') -Data $taskData -Runtime (Join-Path $taskTarget 'remote-runtime') -Port 9136
if($LASTEXITCODE -ne 0){throw 'Host configuration failed'}
$taskPowerShell=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
$taskShell=New-Object -ComObject WScript.Shell
$taskMenu=Join-Path ([Environment]::GetFolderPath('Programs')) 'My Remote'
New-Item -ItemType Directory -Force -Path $taskMenu | Out-Null
$taskShortcut=$taskShell.CreateShortcut((Join-Path $taskMenu 'My Remote.lnk'))
$taskShortcut.TargetPath=$taskPowerShell
$taskShortcut.Arguments='-NoProfile -WindowStyle Hidden -File "'+(Join-Path $taskTarget 'launch.ps1')+'"'
$taskShortcut.WorkingDirectory=$taskTarget
$taskShortcut.Description='My Remote — access this PC while signed in'
$taskShortcut.Save()
$taskStop=$taskShell.CreateShortcut((Join-Path $taskMenu 'Stop My Remote.lnk'))
$taskStop.TargetPath=$taskPowerShell
$taskStop.Arguments='-NoProfile -WindowStyle Hidden -File "'+(Join-Path $taskTarget 'stop.ps1')+'"'
$taskStop.WorkingDirectory=$taskTarget
$taskStop.Save()
$taskStartup=$taskShell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'My Remote.lnk'))
$taskStartup.TargetPath=$taskPowerShell
$taskStartup.Arguments=$taskShortcut.Arguments+' -NoBrowser'
$taskStartup.WorkingDirectory=$taskTarget
$taskStartup.Save()
if(!$NoStart){& (Join-Path $taskTarget 'launch.ps1') -NoBrowser}
Write-Host 'Installed My Remote for your Windows account. Open My Remote from the Start menu to create your owner account and PIN.'
