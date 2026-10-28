param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$taskProgram=$PSScriptRoot
$taskData=Join-Path $env:LOCALAPPDATA 'OneWorkspace/MyRemote'
$taskUrl='http://localhost:9034/remote'
$taskLog=Join-Path $taskData 'launch.log'
function Get-LocalJson([string]$Path){
 $taskRequest=[Net.HttpWebRequest]::Create('http://127.0.0.1:9034/remote'+$Path)
 $taskRequest.Proxy=$null
 $taskRequest.Timeout=2000
 $taskResponse=$taskRequest.GetResponse()
 try{$taskReader=New-Object IO.StreamReader($taskResponse.GetResponseStream());try{return ($taskReader.ReadToEnd() | ConvertFrom-Json)}finally{$taskReader.Dispose()}}finally{$taskResponse.Dispose()}
}
$taskReady=$false
try{$taskResponse=Get-LocalJson '/healthz';$taskReady=$taskResponse.status -eq 'ok' -and $taskResponse.app -eq 'remote'}catch{}
if(!$taskReady){
 $taskArgs=@('--data',('"'+$taskData+'"'),'--listen','127.0.0.1:9034','--origin',$taskUrl,'--no-browser')
 Start-Process -FilePath (Join-Path $taskProgram 'MyRemote.exe') -ArgumentList $taskArgs -WorkingDirectory $taskProgram -WindowStyle Hidden -RedirectStandardOutput $taskLog -RedirectStandardError (Join-Path $taskData 'launch-errors.log') | Out-Null
 for($taskAttempt=0;$taskAttempt -lt 40;$taskAttempt++){
  Start-Sleep -Milliseconds 250
  try{$taskResponse=Get-LocalJson '/healthz';if($taskResponse.status -eq 'ok' -and $taskResponse.app -eq 'remote'){$taskReady=$true;break}}catch{}
 }
 if(!$taskReady){throw 'My Remote did not start. See the private launch-errors.log.'}
}
if(!$NoBrowser){
 $taskOpen=$taskUrl+'/'
 $taskBootstrap=Get-LocalJson '/api/bootstrap'
 if($taskBootstrap.id -ne 'remote'){throw 'Port 9034 belongs to another application'}
 if($taskBootstrap.needsSetup){
  $taskMatch=Get-Content -LiteralPath $taskLog | Select-String -Pattern '^My Remote: (http://localhost:9034/remote/#setup/[a-f0-9]+)$' | Select-Object -Last 1
  if(!$taskMatch){throw 'Owner setup link unavailable. Restart My Remote, then open it again.'}
  $taskOpen=$taskMatch.Matches[0].Groups[1].Value
 }
 Start-Process $taskOpen
}
Write-Host 'My Remote is running at http://localhost:9034/remote/'
