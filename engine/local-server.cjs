const {updateDevice,revokeOwnerStreams}=require('./lifecycle.cjs');
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),net=require('node:net'),os=require('node:os');
const {WebSocketServer}=require('ws');
const {random,hash,equal,pinHash,pinVerify,Support}=require('./security.cjs');
const {attach}=require('./rfb.cjs');
const data=process.env.MY_REMOTE_DATA,secret=process.env.MY_REMOTE_SECRET,origin=new URL(process.env.MY_REMOTE_ORIGIN);
if(!data||!secret||secret.length<48)throw Error('Start through My Remote');
const base=origin.pathname.replace(/\/$/,''),port=Number(process.env.MY_REMOTE_BROKER_PORT),hostPort=Number(process.env.MY_REMOTE_ENGINE_PORT);
const statePath=path.join(data,'remote-settings.json');
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{owner:null,name:os.hostname(),disabled:true};
const {spawn,execFileSync}=require('node:child_process');
const powershell=path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
if(process.env.MY_REMOTE_WORKSPACE){
 try{execFileSync(powershell,['-NoProfile','-NonInteractive','-File',path.join(__dirname,'../scripts/migrate-launchers.ps1'),'-LegacyData',process.env.MY_REMOTE_LEGACY_DATA||'', '-LegacyExe',process.env.MY_REMOTE_LEGACY_EXE||'', '-WorkspaceURL',process.env.MY_REMOTE_WORKSPACE],{windowsHide:true,stdio:'pipe',timeout:20000});}catch{console.error('Legacy My Remote launchers need migration review.');}
}
let native=null,host=null,hostError='';
function startHost(){
 if(host)return;
 const value=JSON.parse(fs.readFileSync(path.join(data,'host-secret.json'),'utf8'));
 if(value.port!==hostPort||typeof value.password!=='string'||value.password.length!==8)throw Error('Host configuration does not match');
 execFileSync(powershell,['-NoProfile','-NonInteractive','-File',path.join(__dirname,'../scripts/verify-host.ps1'),'-Data',data,'-Port',String(hostPort)],{windowsHide:true,stdio:'pipe'});
 native=value;host=spawn(path.join(__dirname,'../host/tvnserver.exe'),['-run'],{windowsHide:true,stdio:'ignore'});hostError='';
 host.on('error',()=>{host=null;hostError='The Windows host could not start. Check host configuration.';});
 host.on('exit',()=>{host=null;hostError='The Windows host stopped. Enable access again to restart it.';});
}
function configureHost(){
 const args=['-NoProfile','-NonInteractive','-File',path.join(__dirname,'../scripts/configure-host.ps1'),'-Data',data,'-Runtime',path.join(__dirname,'..'),'-Port',String(hostPort),'-Origin',origin.href];
 if(process.env.MY_REMOTE_LEGACY_DATA)args.push('-LegacyData',process.env.MY_REMOTE_LEGACY_DATA);
 if(process.env.MY_REMOTE_LEGACY_EXE)args.push('-LegacyExe',process.env.MY_REMOTE_LEGACY_EXE);
 try{execFileSync(powershell,args,{windowsHide:true,stdio:'pipe',timeout:30000});}catch(e){const text=String(e.stderr||'');if(text.includes('already running')||text.includes('owned by')||text.includes('enrolled'))throw Error('An existing desktop host must be stopped or migrated before enabling this computer.');throw Error('Windows host setup failed. Check private host logs and permissions.');}
 startHost();
}
if(state.owner&&!state.disabled){try{startHost();}catch{hostError='The desktop host needs setup. Enable access again to configure it.';}}
process.on('exit',()=>host?.kill());
const support=new Support(),leases=new Map(),attempts=new Map(),sockets=new Set();
const save=()=>{fs.writeFileSync(statePath+'.new',JSON.stringify(state),{mode:0o600});fs.renameSync(statePath+'.new',statePath);};
function owner(req){const id=req.headers['x-remote-owner'];if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw Error('Sign in as owner');return id;}
function guest(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('remote_guest='))?.slice(13);return support.guest(token);}
function context(req){if(req.headers['x-remote-owner'])return {owner:owner(req),session:req.headers['x-remote-session'],expires:Number(req.headers['x-remote-expires']),cookie:(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('remote_session='))};const g=guest(req);if(g?.status==='approved')return {owner:g.owner,guest:g};throw Error('Session is not authorized');}
function canConnect(ctx){return state.owner===ctx.owner&&!state.disabled&&(ctx.guest?ctx.guest.status==='approved'&&ctx.guest.expires>Date.now():(leases.get(ctx.session)||0)>Date.now()&&ctx.expires>Date.now());}
function owned(ctx,nodeid='local'){if(ctx.owner!==state.owner||nodeid!=='local')throw Error('Computer not found');}
function closeAll(){leases.clear();for(const x of sockets)x.ws.close(1000,'Remote access stopped');}
function closeGrant(id){for(const x of sockets)if(x.ctx.guest?.id===id)x.ws.close(1000,'Sharing stopped');}
function json(res,status,v){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(v));}
async function body(req){let b='';for await(const part of req){b+=part;if(b.length>16384)throw Error('Request too large');}return b?JSON.parse(b):{};}
async function online(){if(!host)return false;return new Promise(resolve=>{const s=net.connect({host:'127.0.0.1',port:hostPort});const done=v=>{s.destroy();resolve(v)};s.setTimeout(700,()=>done(false));s.once('connect',()=>done(true));s.once('error',()=>done(false));});}
const server=http.createServer(async(req,res)=>{
 if(!equal(req.headers['x-remote-broker'],secret)){res.writeHead(403);return res.end();}
 try{
  const route=new URL(req.url,'http://localhost').pathname.slice(base.length);
  if(route==='/_integration/revoke-owner-sessions'&&req.method==='POST'){revokeOwnerStreams(leases,sockets);return json(res,200,{ok:true});}
  if(route==='/internal/ready')return json(res,200,{ready:true,host:await online()});
  if(route==='/support-api/redeem'&&req.method==='POST'){const b=await body(req),token=support.redeem(String(b.code||'').replace(/\s/g,''),b.name,'global');res.setHeader('Set-Cookie',`remote_guest=${token}; Path=${base}/; HttpOnly; SameSite=Strict; Max-Age=2100${origin.protocol==='https:'?'; Secure':''}`);return json(res,200,{status:'requested'});}
  if(route==='/support-api/status'){const g=guest(req);return json(res,200,g?{status:g.status,nodeid:'local',name:g.name,expires:g.expires}:{status:'expired'});}
  if(route==='/support-api/stop'&&req.method==='POST'){const g=guest(req);if(g){g.status='revoked';closeGrant(g.id);}return json(res,200,{ok:true});}
  const ctx=context(req);if(ctx.guest)throw Error('Owner required');
  if(route==='/api/remote/devices')return json(res,200,{devices:state.owner===ctx.owner?[{id:'local',name:state.name,platform:'Windows • available while signed in',online:await online(),pin:!!state.pin,disabled:state.disabled}]:[],engine:'TightVNC 2.8.90 / noVNC 1.7.0',hostError});
  if(route==='/api/remote/support')return json(res,200,{requests:[...support.codes.values()].filter(x=>x.owner===ctx.owner&&x.status!=='revoked'&&x.expires>Date.now()).map(({id,nodeid,name,status,expires})=>({id,nodeid,name,status,expires}))});
  const b=await body(req);
  if(route==='/api/remote/enroll'&&req.method==='POST'){if(state.owner&&state.owner!==ctx.owner)throw Error('This computer already has an owner');const pin=pinHash(b.pin);if(!host)configureHost();state={owner:ctx.owner,name:String(b.name||os.hostname()).trim().slice(0,80),pin,disabled:false};save();closeAll();return json(res,200,{ok:true});}
  owned(ctx,b.nodeid||'local');
  if(route==='/api/remote/connect'&&req.method==='POST'){
   let a=attempts.get(ctx.owner);if(!a||a.until<Date.now())a={count:0,until:Date.now()+60000};attempts.set(ctx.owner,a);
   if(a.count>=5)throw Error('Too many PIN attempts. Try again in a minute');
   if(state.disabled)throw Error('Remote access is disabled');if(!pinVerify(b.pin,state.pin)){a.count++;throw Error('Incorrect PIN');}
   leases.set(ctx.session,Date.now()+3600000);return json(res,200,{ok:true});
  }
  if(route==='/api/remote/disconnect'&&req.method==='POST'){leases.delete(ctx.session);for(const x of sockets)if(x.ctx.session===ctx.session)x.ws.close(1000,'Disconnected');return json(res,200,{ok:true});}
  if(route==='/api/remote/device'&&req.method==='POST'){
   const updated=updateDevice(state,b,()=>{if(!host)configureHost();});
   state=updated;save();if(b.pin||state.disabled){support.revokeNode(ctx.owner,'local');closeAll();}return json(res,200,{ok:true});
  }
  if(route==='/api/remote/support/create'&&req.method==='POST'){if(state.disabled)throw Error('Enable remote access first');const g=support.create(ctx.owner,'local');return json(res,200,{id:g.id,code:g.code,expires:g.expires});}
  if(route==='/api/remote/support/approve'&&req.method==='POST'){if(state.disabled)throw Error('Remote access disabled');support.approve(ctx.owner,b.id);return json(res,200,{ok:true});}
  if(route==='/api/remote/support/revoke'&&req.method==='POST'){const g=support.revoke(ctx.owner,b.id);closeGrant(g.id);return json(res,200,{ok:true});}
  json(res,404,{error:'Not found'});
 }catch(e){json(res,400,{error:e.message});}
});
const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024});
server.on('upgrade',(req,socket,head)=>{
 try{
  if(!equal(req.headers['x-remote-broker'],secret)||req.headers.origin!==origin.origin)throw Error('Denied');
  const url=new URL(req.url,'http://localhost');if(url.pathname!==base+'/desktop'||url.searchParams.get('nodeid')!=='local')throw Error('Denied');
  const ctx=context(req);if(!canConnect(ctx))throw Error('Denied');
  if(sockets.size>=8)throw Error('Connection limit');
  wss.handleUpgrade(req,socket,head,ws=>{const entry={ws,ctx};sockets.add(entry);ws.on('close',()=>sockets.delete(entry));attach(ws,{port:hostPort,password:native.password});});
 }catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');}
});
setInterval(()=>{support.prune();for(const[k,v]of leases)if(v<Date.now())leases.delete(k);for(const x of sockets)if(!canConnect(x.ctx))x.ws.close(1000,'Authorization ended');},500).unref();
setInterval(async()=>{const owners=new Map();for(const x of sockets)if(!x.ctx.guest)owners.set(x.ctx.session,x.ctx);for(const[id,ctx]of owners){let valid=false;try{const r=await fetch(`http://127.0.0.1:${port-101}${base}/api/me`,{headers:{cookie:ctx.cookie||''},signal:AbortSignal.timeout(5000)});const v=await r.json();valid=r.ok&&v.user?.id===ctx.owner&&v.user?.role==='owner';}catch{}if(!valid){leases.delete(id);for(const x of sockets)if(x.ctx.session===id)x.ws.close(1000,'Sign-in ended');}}},10000).unref();
server.listen(port,'127.0.0.1',()=>console.log('My Remote local desktop broker ready'));
