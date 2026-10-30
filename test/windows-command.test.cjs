const {test}=require('node:test'),assert=require('node:assert/strict');
const {commandEnvironment}=require('../engine/windows-command.cjs');
test('restricted worker receives native command extensions and trusted system paths',()=>{
 const input={SystemRoot:'C:\\Windows',TEMP:'C:\\fixture',MY_REMOTE_SECRET:'fixture',Path:'C:\\untrusted',PathExt:'.TXT'};
 const env=commandEnvironment(input);
 assert.equal(env.PATHEXT,'.COM;.EXE;.BAT;.CMD');
 assert.equal(env.PATH,'C:\\Windows\\System32;C:\\Windows\\System32\\WindowsPowerShell\\v1.0;C:\\Windows');
 assert.equal(env.TEMP,input.TEMP);assert.equal(env.MY_REMOTE_SECRET,input.MY_REMOTE_SECRET);
 assert.equal(env.Path,undefined);assert.equal(env.PathExt,undefined);assert.equal(input.Path,'C:\\untrusted');
});
test('Windows PowerShell can execute icacls in the restricted worker environment',{skip:process.platform!=='win32'},()=>{
 const {spawnSync}=require('node:child_process'),path=require('node:path');
 const root=process.env.SystemRoot||'C:\\Windows';
 const minimal={SystemRoot:root,WINDIR:root,TEMP:process.env.TEMP,TMP:process.env.TMP};
 const args=['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; & icacls.exe /? | Out-Null; exit $LASTEXITCODE"];
 const exe=path.win32.join(root,'System32','WindowsPowerShell','v1.0','powershell.exe');
 const before=spawnSync(exe,args,{env:minimal,windowsHide:true,encoding:'utf8'});
 assert.notEqual(before.status,0);assert.match(before.stderr,/CantActivateDocumentInPipeline/);
 const after=spawnSync(exe,args,{env:commandEnvironment(minimal),windowsHide:true,encoding:'utf8'});
 assert.equal(after.status,0,after.stderr);
});
