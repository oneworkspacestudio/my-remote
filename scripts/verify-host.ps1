param([Parameter(Mandatory=$true)][string]$Data,[int]$Port)
$ErrorActionPreference='Stop'
$taskHostSettings=Get-ItemProperty 'HKCU:/Software/TightVNC/Server'
if($taskHostSettings.MyRemoteData -ne [IO.Path]::GetFullPath($Data) -or $taskHostSettings.RfbPort -ne $Port -or $taskHostSettings.LoopbackOnly -ne 1 -or $taskHostSettings.UseVncAuthentication -ne 1 -or $taskHostSettings.AcceptHttpConnections -ne 0 -or $taskHostSettings.EnableFileTransfers -ne 0){throw 'Windows host configuration must remain authenticated and loopback-only'}
if(Get-Process tvnserver -ErrorAction SilentlyContinue){throw 'Another TightVNC instance is already running'}
