param([Parameter(Mandatory=$true)][string]$Data)
$ErrorActionPreference='Stop'
$taskResolved=[IO.Path]::GetFullPath($Data)
if([IO.Path]::GetFileName($taskResolved) -notmatch '^local-native-\d+$'){throw 'Not a named test fixture'}
$taskHostSettings=Get-ItemProperty 'HKCU:/Software/TightVNC/Server' -ErrorAction SilentlyContinue
if($taskHostSettings -and $taskHostSettings.MyRemoteData -eq $taskResolved){
 if(Get-Process tvnserver -ErrorAction SilentlyContinue){throw 'Test host must stop before registry cleanup'}
 Remove-Item -LiteralPath 'HKCU:/Software/TightVNC/Server' -Recurse
}
