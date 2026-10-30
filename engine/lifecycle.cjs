const {pinHash}=require('./security.cjs');
function updateDevice(state,body,ensureHost){
 const next={...state};
 if(typeof body.name==='string'){if(!body.name.trim()||body.name.length>80)throw Error('Use 1-80 characters for the computer name');next.name=body.name.trim();}
 if(body.pin)next.pin=pinHash(body.pin);
 if(typeof body.disabled==='boolean')next.disabled=body.disabled;
 // Validate first; a failed activation must not persist an enabled state.
 if(!next.disabled)ensureHost();
 return next;
}
function revokeOwnerStreams(leases,sockets){leases.clear();for(const x of sockets)if(x.ctx.owner&&!x.ctx.guest)x.ws.terminate();}
module.exports={updateDevice,revokeOwnerStreams};

const path=require('node:path');
// apphost.Service deliberately omits the interactive shell environment.
// Windows PowerShell needs PATHEXT to classify native EXEs as commands.
function commandEnvironment(env=process.env){
 const root=env.SystemRoot||env.WINDIR||'C:\\Windows';
 const result={...env};
 for(const key of Object.keys(result))if(/^(path|pathext)$/i.test(key))delete result[key];
 result.PATH=[path.win32.join(root,'System32'),path.win32.join(root,'System32','WindowsPowerShell','v1.0'),root].join(';');
 result.PATHEXT='.COM;.EXE;.BAT;.CMD';
 return result;
}

module.exports.commandEnvironment=commandEnvironment;

// These are immutable scripts delivered inside this app's verified package.
// Windows' process-only option supports application-hosted scripts without
// changing CurrentUser/LocalMachine settings. Group Policy keeps precedence.
function bundledPowerShellArguments(...args){
 return ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',...args];
}
module.exports.bundledPowerShellArguments=bundledPowerShellArguments;

// Read-only support information. Return only bounded enums, never paths, errors,
// registry values, account identifiers or environment secrets.
const setupDiagnosticCommand=`$ErrorActionPreference='Stop'
$policies=Get-ExecutionPolicy -List
$drive=New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($env:MY_REMOTE_DATA))
[pscustomobject]@{
 effectivePolicy=(Get-ExecutionPolicy).ToString()
 machinePolicy=($policies|Where-Object Scope -eq MachinePolicy).ExecutionPolicy.ToString()
 userPolicy=($policies|Where-Object Scope -eq UserPolicy).ExecutionPolicy.ToString()
 languageMode=$ExecutionContext.SessionState.LanguageMode.ToString()
 hostSignature=(Get-AuthenticodeSignature -LiteralPath $env:MY_REMOTE_DIAGNOSTIC_HOST).Status.ToString()
 privateFileSystem=$drive.DriveFormat
}|ConvertTo-Json -Compress`;
function setupDiagnostics(raw){
 const pick=(key,values)=>values.includes(raw?.[key])?raw[key]:'Unknown';
 const policies=['AllSigned','Bypass','RemoteSigned','Restricted','Undefined','Unrestricted'];
 return {
  effectivePolicy:pick('effectivePolicy',policies),
  machinePolicy:pick('machinePolicy',policies),
  userPolicy:pick('userPolicy',policies),
  languageMode:pick('languageMode',['FullLanguage','RestrictedLanguage','ConstrainedLanguage','NoLanguage']),
  hostSignature:pick('hostSignature',['Valid','NotSigned','HashMismatch','NotTrusted','NotSupportedFileFormat','Incompatible','UnknownError']),
  privateFileSystem:pick('privateFileSystem',['NTFS','ReFS','FAT','FAT32','exFAT'])
 };
}
function setupFailure(error){
 const text=String(error?.stderr||'');
 const cases=[
  ['SCRIPT_POLICY',/PSSecurityException|running\s+scripts\s+is\s+disabled|not\s+digitally\s+signed/i,'Windows blocked My Remote\'s setup script.'],
  ['HOST_CONFLICT',/already running|owned by|enrolled/i,'An existing desktop host must be stopped or migrated before enabling this computer.'],
  ['HOST_INTEGRITY',/Unexpected Windows host binary/i,'The Windows host files failed their integrity check. Update or repair My Remote.'],
  ['HOST_SIGNATURE',/Windows host signature is not valid/i,'Windows could not validate the desktop host publisher signature.'],
  ['PRIVATE_PERMISSIONS',/Could not protect private host data/i,'Windows could not protect My Remote\'s private data.'],
  ['HOST_PORT',/Host port does not match/i,'The existing desktop host uses a different private port.'],
  ['COMMAND_ENVIRONMENT',/CantActivateDocumentInPipeline|CommandNotFoundException/i,'A required Windows setup command could not run.']
 ];
 const match=cases.find(([,pattern])=>pattern.test(text));
 const code=match?.[0]||(error?.code==='ETIMEDOUT'?'SETUP_TIMEOUT':'SETUP_FAILED');
 const message=match?.[2]||(code==='SETUP_TIMEOUT'?'Windows host setup timed out.':'Windows host setup failed.');
 return {code,message:`${message} (${code})`};
}
Object.assign(module.exports,{setupDiagnosticCommand,setupDiagnostics,setupFailure});
