$ErrorActionPreference='Stop'
$taskExe=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'MyRemote.exe'))
Get-CimInstance Win32_Process -Filter "Name='MyRemote.exe'" | Where-Object {$_.ExecutablePath -eq $taskExe} | ForEach-Object {Stop-Process -Id $_.ProcessId}
Write-Host 'My Remote stopped. Its supervised Windows host stops with it.'
