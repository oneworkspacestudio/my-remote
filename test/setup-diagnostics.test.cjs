const {test}=require('node:test'),assert=require('node:assert/strict');
const {setupDiagnosticCommand,setupDiagnostics,setupFailure,commandEnvironment,bundledPowerShellArguments}=require('../engine/lifecycle.cjs');

test('setup failures expose bounded reason codes without command or credential content',()=>{
 const secret='synthetic-secret-that-must-stay-private';
 const cases=[
  ['PSSecurityException: running scripts is disabled','SCRIPT_POLICY'],
  ['Existing TightVNC settings are not owned by this installation','HOST_CONFLICT'],
  ['Windows host signature is not valid','HOST_SIGNATURE'],
  ['Could not protect private host data','PRIVATE_PERMISSIONS'],
  ['CantActivateDocumentInPipeline','COMMAND_ENVIRONMENT'],
  ['unexpected failure','SETUP_FAILED']
 ];
 for(const [stderr,code]of cases){const result=setupFailure({stderr:stderr+' '+secret});assert.equal(result.code,code);assert.ok(!JSON.stringify(result).includes(secret));}
 assert.equal(setupFailure({code:'ETIMEDOUT'}).code,'SETUP_TIMEOUT');
});

test('support diagnostics discard arbitrary output and retain only approved enums',()=>{
 const raw={effectivePolicy:'Restricted',machinePolicy:'Undefined',userPolicy:'Undefined',languageMode:'FullLanguage',hostSignature:'Valid',privateFileSystem:'NTFS',secret:'private'};
 assert.deepEqual(setupDiagnostics(raw),{effectivePolicy:'Restricted',machinePolicy:'Undefined',userPolicy:'Undefined',languageMode:'FullLanguage',hostSignature:'Valid',privateFileSystem:'NTFS'});
 const unknown=setupDiagnostics(Object.fromEntries(Object.keys(raw).map(k=>[k,'private'])));
 assert.ok(Object.values(unknown).every(v=>v==='Unknown'));assert.equal(Object.keys(unknown).length,6);
});

test('Windows read-only diagnostics run with script files restricted',{skip:process.platform!=='win32'},()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'my-remote-diagnostics-'));
 try{
  const host=path.join(root,'unsigned.exe');fs.writeFileSync(host,'synthetic unsigned fixture');
  const system=process.env.SystemRoot||'C:\\Windows';
  const env=commandEnvironment({SystemRoot:system,WINDIR:system,TEMP:root,TMP:root,MY_REMOTE_DATA:root,MY_REMOTE_DIAGNOSTIC_HOST:host,MY_REMOTE_SECRET:'synthetic-private-marker'});
  const exe=path.join(system,'System32/WindowsPowerShell/v1.0/powershell.exe');
  const file=path.join(root,'fixture.ps1');fs.writeFileSync(file,"Write-Output 'fixture'");
  const blocked=spawnSync(exe,['-NoProfile','-NonInteractive','-ExecutionPolicy','Restricted','-File',file],{env,windowsHide:true,encoding:'utf8'});
  assert.notEqual(blocked.status,0);assert.equal(setupFailure(blocked).code,'SCRIPT_POLICY',blocked.stderr);
  const policyBefore=spawnSync(exe,['-NoProfile','-NonInteractive','-Command','Get-ExecutionPolicy -List | ConvertTo-Json -Compress'],{env,windowsHide:true,encoding:'utf8'});
  const embedded=spawnSync(exe,bundledPowerShellArguments(file),{env:{...env,PSExecutionPolicyPreference:'Restricted'},windowsHide:true,encoding:'utf8'});
  assert.equal(embedded.status,0,embedded.stderr);assert.equal(embedded.stdout.trim(),'fixture');
  const policyAfter=spawnSync(exe,['-NoProfile','-NonInteractive','-Command','Get-ExecutionPolicy -List | ConvertTo-Json -Compress'],{env,windowsHide:true,encoding:'utf8'});
  assert.equal(policyAfter.stdout,policyBefore.stdout,'Machine and user policies must not change');
  const result=spawnSync(exe,['-NoProfile','-NonInteractive','-ExecutionPolicy','Restricted','-Command',setupDiagnosticCommand],{env,windowsHide:true,encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);
  const diagnostics=setupDiagnostics(JSON.parse(result.stdout.replace(/^\uFEFF/,'')));
  assert.equal(diagnostics.effectivePolicy,'Restricted');assert.notEqual(diagnostics.privateFileSystem,'Unknown');assert.notEqual(diagnostics.hostSignature,'Valid');
  assert.ok(!result.stdout.includes('synthetic-private-marker'));
 }finally{assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(root).startsWith('my-remote-diagnostics-'));fs.rmSync(root,{recursive:true,force:true});}
});

test('bundled host configuration succeeds with a restricted parent and isolated registry',{skip:process.platform!=='win32'||!process.env.MY_REMOTE_QA_RUNTIME},()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'my-remote-host-policy-'));
 const key='HKCU:/Software/OneWorkspaceTests/RemotePolicy'+crypto.randomBytes(8).toString('hex');
 const system=process.env.SystemRoot||'C:\\Windows',exe=path.join(system,'System32/WindowsPowerShell/v1.0/powershell.exe');
 const env=commandEnvironment({SystemRoot:system,WINDIR:system,TEMP:root,TMP:root,PSExecutionPolicyPreference:'Restricted'});
 try{
  const file=path.join(root,'configure-fixture.ps1'),data=path.join(root,'private');
  const source=fs.readFileSync(path.join(__dirname,'../scripts/configure-host.ps1'),'utf8');
  assert.ok(source.includes("$taskKey='HKCU:/Software/TightVNC/Server'"));
  fs.writeFileSync(file,source.replace("$taskKey='HKCU:/Software/TightVNC/Server'",`$taskKey='${key}'`));
  const result=spawnSync(exe,bundledPowerShellArguments(file,'-Data',data,'-Runtime',process.env.MY_REMOTE_QA_RUNTIME,'-Port','29927'),{env,windowsHide:true,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr);
  const secret=JSON.parse(fs.readFileSync(path.join(data,'host-secret.json'),'utf8'));assert.equal(secret.port,29927);assert.equal(secret.password.length,8);
  const registry=spawnSync(exe,['-NoProfile','-NonInteractive','-Command',`Get-ItemProperty -LiteralPath '${key}' | Select-Object MyRemoteData,RfbPort,LoopbackOnly,UseVncAuthentication,AcceptHttpConnections,EnableFileTransfers | ConvertTo-Json -Compress`],{env,windowsHide:true,encoding:'utf8'});
  assert.equal(registry.status,0,registry.stderr);
  assert.deepEqual(JSON.parse(registry.stdout),{MyRemoteData:data,RfbPort:29927,LoopbackOnly:1,UseVncAuthentication:1,AcceptHttpConnections:0,EnableFileTransfers:0});
 }finally{
  assert.match(key,/^HKCU:\/Software\/OneWorkspaceTests\/RemotePolicy[a-f0-9]{16}$/);
  const cleanup=spawnSync(exe,['-NoProfile','-NonInteractive','-Command',`if(Test-Path -LiteralPath '${key}'){Remove-Item -LiteralPath '${key}' -Recurse -Force}`],{env,windowsHide:true,encoding:'utf8'});
  assert.equal(cleanup.status,0,cleanup.stderr);
  assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(root).startsWith('my-remote-host-policy-'));fs.rmSync(root,{recursive:true,force:true});
 }
});
