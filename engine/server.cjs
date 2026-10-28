'use strict';
// Private loopback broker. Workspace apphost authenticates users before forwarding.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {WebSocket,WebSocketServer}=require('ws');
const {random,hash,equal,pinHash,pinVerify,Support}=require('./security.cjs');
const data=process.env.MY_REMOTE_DATA,secret=process.env.MY_REMOTE_SECRET,origin=process.env.MY_REMOTE_ORIGIN;
if(!data||!secret||secret.length<48||!origin)throw Error('Start My Remote through its authenticated host.');
const publicURL=new URL(origin),base=publicURL.pathname.replace(/\/$/,''),domain=base.slice(1)||'remote';
if(!/^[a-z][a-z0-9-]*$/.test(domain))throw Error('My Remote needs a single path segment.');
const enginePort=Number(process.env.MY_REMOTE_ENGINE_PORT),brokerPort=Number(process.env.MY_REMOTE_BROKER_PORT);
const engineData=path.join(data,'mesh'),statePath=path.join(data,'remote-settings.json');fs.mkdirSync(engineData,{recursive:true});
let settings={pins:{},disabled:{}};if(fs.existsSync(statePath))settings=JSON.parse(fs.readFileSync(statePath,'utf8'));
const save=()=>{fs.writeFileSync(statePath+'.new',JSON.stringify(settings),{mode:0o600});fs.renameSync(statePath+'.new',statePath);};
const config={settings:{cert:publicURL.hostname,port:enginePort,portBind:'127.0.0.1',aliasPort:Number(publicURL.port||443),redirPort:0,mpsPort:0,exactPorts:true,wanOnly:true,tlsOffload:'127.0.0.1',trustedProxy:'127.0.0.1',selfUpdate:false,meshScanner:false,amtScanner:false,webRTC:false,noserverbackup:true,agentDownloads:{enabled:false,fetchReleases:false},datapath:engineData,filespath:path.join(data,'engine-files')},domains:{'':{newAccounts:false},[domain]:{title:'My Remote',title2:'One Workspace',newAccounts:false,guestDeviceSharing:false,userSessionIdleTimeout:60,agentCustomization:{displayName:'My Remote Host',description:'Remote desktop for One Workspace',companyName:'One Workspace'}}}};
if(publicURL.protocol==='https:')config.domains[domain].certUrl=publicURL.origin;
fs.writeFileSync(path.join(engineData,'config.json'),JSON.stringify(config),{mode:0o600});
process.argv=[process.argv[0],require.resolve('meshcentral'),'--datapath',engineData];
const mesh=require('meshcentral');mesh.mainStart();
const support=new Support(),leases=new Map(),pinAttempts=new Map(),sockets=new Set();
function server(){const m=mesh.workspaceInstance;if(!m?.webserver?.users||!m.loginCookieEncryptionKey||!m.webserver.meshes)throw Error('Remote desktop engine is starting. Please retry.');return m;}
const dbGet=id=>new Promise((resolve,reject)=>server().db.Get(id,(e,v)=>e?reject(e):resolve(v[0])));
const dbSet=v=>new Promise((resolve,reject)=>server().db.Set(v,e=>e?reject(e):resolve()));
const dbNodes=()=>new Promise((resolve,reject)=>server().db.GetAllType('node',(e,v)=>e?reject(e):resolve(v)));
function owner(req){const id=req.headers['x-remote-owner'];if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw Error('Sign in as the Workspace owner.');return id;}
function guest(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('remote_guest='))?.slice(13);return support.guest(token);}
function identity(req){const id=req.headers['x-remote-owner'];if(id)return {owner:owner(req),session:req.headers['x-remote-session'],expires:Number(req.headers['x-remote-expires']||0),cookie:(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('remote_session='))};const g=guest(req);if(g?.status==='approved')return {owner:g.owner,session:g.guest,guest:g};throw Error('This remote session is not authorized.');}
function userFor(id){
 const m=server(),uid='user/'+domain+'/'+id,mid='mesh/'+domain+'/'+crypto.createHash('sha384').update('my-remote:'+id).digest('base64').replace(/\+/g,'@').replace(/\//g,'$');
 if(!m.webserver.users[uid]){const u={type:'user',_id:uid,name:'Workspace owner',domain,siteadmin:0,creation:Math.floor(Date.now()/1000),links:{[mid]:{rights:4294967295}}};m.webserver.users[uid]=u;m.db.SetUser(u);}
 if(!m.webserver.meshes[mid]){const v={type:'mesh',_id:mid,name:'My computers',mtype:2,domain,links:{[uid]:{name:'Workspace owner',rights:4294967295}},creation:Date.now(),creatorid:uid};m.webserver.meshes[mid]=v;m.db.Set(v);}
 return {uid,mid};
}
function cookieFor(ctx){const {uid}=userFor(ctx.owner);return server().encodeCookie({userid:uid,domainid:domain},server().loginCookieEncryptionKey);}
async function nodeFor(ctx,id){const node=await dbGet(id),{mid}=userFor(ctx.owner);if(!node||node.meshid!==mid||node.domain!==domain||ctx.guest&&ctx.guest.nodeid!==id)throw Error('Computer not found.');return node;}
function canConnect(ctx,id){if(settings.disabled[id])return false;if(ctx.guest)return ctx.guest.status==='approved'&&ctx.guest.nodeid===id&&ctx.guest.expires>Date.now();return !settings.disabled[id]&&(leases.get(ctx.session+'|'+id)||0)>Date.now();}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){let buf='';for await(const part of req){buf+=part;if(buf.length>16384)throw Error('Request too large.');}return buf?JSON.parse(buf):{};}
function closeNode(id){for(const x of sockets)if(x.nodeid===id||x.ctx?.guest?.nodeid===id)x.client.close(1000,'Remote access stopped');}
function closeGrant(id){for(const x of sockets)if(x.ctx?.guest?.id===id)x.client.close(1000,'Support ended');}
function authorize(req){return equal(req.headers['x-remote-broker'],secret);}
const broker=http.createServer(async(req,res)=>{
 if(!authorize(req)){res.writeHead(403);res.end();return;}
 try{
  const url=new URL(req.url,'http://localhost'),route=url.pathname.replace(base,'');
  if(route==='/internal/ready'){server();json(res,200,{ready:true});return;}
  if(route==='/support-api/redeem'&&req.method==='POST'){
   const b=await body(req),token=support.redeem(String(b.code||'').replace(/\s/g,''),b.name,'global');
   res.setHeader('Set-Cookie',`remote_guest=${token}; Path=${base}/; HttpOnly; SameSite=Strict; Max-Age=2100${publicURL.protocol==='https:'?'; Secure':''}`);json(res,200,{status:'requested'});return;
  }
  if(route==='/support-api/status'){const g=guest(req);json(res,200,g?{status:g.status,nodeid:g.status==='approved'?g.nodeid:undefined,name:g.name,expires:g.expires}:{status:'expired'});return;}
  if(route==='/support-api/stop'&&req.method==='POST'){const g=guest(req);if(g){g.status='revoked';closeGrant(g.id);}json(res,200,{ok:true});return;}
  const ctx=identity(req);
  if(route==='/api/remote/devices'&&req.method==='GET'){
   const {mid}=userFor(ctx.owner),nodes=(await dbNodes()).filter(n=>n.meshid===mid&&(!ctx.guest||n._id===ctx.guest.nodeid));
   json(res,200,{devices:nodes.map(n=>({id:n._id,name:n.name||n.rname||'Computer',online:!!(server().connectivityByNode[n._id]?.connectivity&1),platform:n.osdesc||'Windows',pin:!!settings.pins[n._id],disabled:!!settings.disabled[n._id]})),engine:'MeshCentral 1.3.1'});return;
  }
  if(ctx.guest)throw Error('This action requires the Workspace owner.');
  if(route==='/api/remote/support'&&req.method==='GET'){json(res,200,{requests:[...support.codes.values()].filter(x=>x.owner===ctx.owner&&x.expires>Date.now()&&x.status!=='revoked').map(({id,nodeid,name,status,expires})=>({id,nodeid,name,status,expires}))});return;}
  const b=await body(req);
  if(route==='/api/remote/support/approve'&&req.method==='POST'){const g=support.approve(ctx.owner,b.id);json(res,200,{status:g.status});return;}
  if(route==='/api/remote/support/revoke'&&req.method==='POST'){const g=support.revoke(ctx.owner,b.id);closeGrant(g.id);json(res,200,{ok:true});return;}
  if(route==='/api/remote/support/create'&&req.method==='POST'){await nodeFor(ctx,b.nodeid);if(settings.disabled[b.nodeid])throw Error('Enable this computer first.');if(support.codes.size>100)throw Error('Too many support requests.');const x=support.create(ctx.owner,b.nodeid);json(res,200,{id:x.id,code:x.code,expires:x.expires});return;}
  if(route==='/api/remote/connect'&&req.method==='POST'){
   await nodeFor(ctx,b.nodeid);if(settings.disabled[b.nodeid])throw Error('Remote connections are disabled for this computer.');
   const key=ctx.owner+'|'+b.nodeid,f=pinAttempts.get(key)||{count:0,until:Date.now()+60000};if(f.until<Date.now()){f.count=0;f.until=Date.now()+60000;}pinAttempts.set(key,f);
   if(f.count>=5)throw Error('Too many PIN attempts. Try again in a minute.');
   if(!settings.pins[b.nodeid])throw Error('Set an access PIN in computer settings before connecting.');
   if(!pinVerify(b.pin,settings.pins[b.nodeid])){f.count++;throw Error('Incorrect PIN.');}
   leases.set(ctx.session+'|'+b.nodeid,Date.now()+3600000);json(res,200,{ok:true});return;
  }
  if(route==='/api/remote/device'&&req.method==='POST'){
   const n=await nodeFor(ctx,b.nodeid);if(typeof b.name==='string'){if(!b.name.trim()||b.name.length>80)throw Error('Choose a name with 1–80 characters.');n.name=b.name.trim();await dbSet(n);}
   if(typeof b.pin==='string'&&b.pin){settings.pins[n._id]=pinHash(b.pin);for(const key of leases.keys())if(key.endsWith('|'+n._id))leases.delete(key);closeNode(n._id);}
   if(typeof b.disabled==='boolean'){settings.disabled[n._id]=b.disabled;if(b.disabled){support.revokeNode(ctx.owner,n._id);closeNode(n._id);}}
   save();json(res,200,{ok:true});return;
  }
  if(route==='/api/remote/agent'&&req.method==='GET'){
   json(res,503,{error:'The Windows host package has not passed release validation. No host is available in this development build.'});return;
  }
  if(route==='/internal/enrollment'&&req.method==='GET'){
   const {mid}=userFor(ctx.owner);json(res,200,{meshid:mid,serverid:server().webserver.agentCertificateHashHex,server:origin.replace(/^http/,'ws')+'/agent.ashx'});return;
  }
  json(res,404,{error:'Not found'});
 }catch(e){json(res,400,{error:e.message||'Remote request failed.'});}
});
function proxyHTTP(req,res,p){const upstream=http.request({hostname:'127.0.0.1',port:enginePort,path:p,method:req.method,headers:{host:publicURL.host}},r=>{res.writeHead(r.statusCode,{'Content-Type':r.headers['content-type']||'application/octet-stream','Cache-Control':'no-store','Content-Disposition':'attachment; filename="MyRemoteHost.exe"'});r.pipe(res);});upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);}
const wss=new WebSocketServer({noServer:true,maxPayload:4*1024*1024});
broker.on('upgrade',async(req,socket,head)=>{
 if(!authorize(req)){socket.destroy();return;}
 try{
  const url=new URL(req.url,'http://localhost'),route=url.pathname.replace(base,''),agent=route==='/agent.ashx'||route==='/meshrelay.ashx'&&!url.searchParams.has('browser');
  let ctx,nodeid=url.searchParams.get('nodeid');
  if(!agent){
   if(req.headers.origin!==publicURL.origin)throw Error('Origin mismatch');ctx=identity(req);
   if(route!=='/control.ashx'&&route!=='/meshrelay.ashx')throw Error('Unsupported socket');
   if(route==='/meshrelay.ashx'){await nodeFor(ctx,nodeid);if(!canConnect(ctx,nodeid)||url.searchParams.get('p')!=='2')throw Error('Connect to this computer first.');}
   const allowed=route==='/control.ashx'?[]:['browser','nodeid','id','p'];for(const key of [...url.searchParams.keys()])if(!allowed.includes(key))url.searchParams.delete(key);url.searchParams.set('auth',cookieFor(ctx));
  }
  if(agent){if(req.headers.origin||url.searchParams.has('auth'))throw Error('Native agent endpoint');if(route==='/meshrelay.ashx'&&url.searchParams.get('p')!=='2')throw Error('Desktop only');}
  // Anonymous peers are authenticated by MeshAgent's certificate handshake/relay protocol.
  // No client-supplied authentication or forwarded headers reach the engine.
  wss.handleUpgrade(req,socket,head,client=>{
   const upstream=new WebSocket('ws://127.0.0.1:'+enginePort+url.pathname+url.search,{headers:{host:publicURL.host}}),entry={client,upstream,nodeid,ctx};sockets.add(entry);
   const pending=[];let queued=0;
   upstream.on('open',()=>{for(const [v,b]of pending)upstream.send(v,{binary:b});pending.length=0;});
   client.on('message',async(data,binary)=>{
    try{
     if(route==='/control.ashx'){
      if(binary||data.length>16384)throw Error('Invalid control');let c=JSON.parse(data);
      if(c.action==='ping'){client.send('{"action":"pong"}');return;}
      if(c.action==='msg'&&['tunnel','getclip','setclip'].includes(c.type)){
       await nodeFor(ctx,c.nodeid);if(!canConnect(ctx,c.nodeid))throw Error('Computer authorization expired');
       if(c.type==='tunnel'){
        const u=new URL(String(c.value).replace(/^\*/,''),'http://localhost');const id=u.searchParams.get('id');if(!/^[a-z0-9]{5,40}$/.test(id||'')||u.searchParams.get('p')!=='2')throw Error('Invalid desktop tunnel');
        c={action:'msg',type:'tunnel',nodeid:c.nodeid,usage:2,value:'*'+base+'/meshrelay.ashx?p=2&nodeid='+encodeURIComponent(c.nodeid)+'&id='+id};entry.nodeid=c.nodeid;
       }else{if(ctx.guest)throw Error('Clipboard sharing is disabled for support sessions.');c={action:'msg',type:c.type,nodeid:c.nodeid,data:typeof c.data==='string'?c.data.slice(0,8192):undefined};}
      }else if(['nodes','meshes','authcookie'].includes(c.action)){c={action:c.action};}else throw Error('Unsupported control');
      data=Buffer.from(JSON.stringify(c));
     }
     if(upstream.readyState===WebSocket.OPEN)upstream.send(data,{binary});else if(upstream.readyState===WebSocket.CONNECTING){queued+=data.length;if(queued>4*1024*1024)throw Error('Queue limit');pending.push([data,binary]);}
    }catch{client.close(1008,'Remote request denied');}
   });
   upstream.on('message',(data,binary)=>{
    if(client.readyState!==WebSocket.OPEN)return;
    if(route==='/control.ashx'&&!binary){try{const c=JSON.parse(data);if(c.action==='authcookie')return;if(ctx.guest){if(c.action==='nodes'){for(const key in c.nodes)c.nodes[key]=c.nodes[key].filter(n=>n._id===ctx.guest.nodeid);}else if(c.action!=='msg'&&c.action!=='pong')return;}data=Buffer.from(JSON.stringify(c));}catch{return;}}
    client.send(data,{binary});
   });
   const close=()=>{sockets.delete(entry);client.close();upstream.close();};client.on('close',close);upstream.on('close',close);client.on('error',close);upstream.on('error',close);
  });
 }catch{socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();}
});
setInterval(()=>{support.prune();for(const [k,v]of leases)if(v<Date.now())leases.delete(k);for(const [k,v]of pinAttempts)if(v.until<Date.now())pinAttempts.delete(k);for(const x of sockets)if(x.ctx&&(x.ctx.guest?!canConnect(x.ctx,x.nodeid||x.ctx.guest.nodeid):(x.ctx.expires<Date.now()||(x.nodeid&&!canConnect(x.ctx,x.nodeid)))))x.client.close(1000,'Remote session ended');},1000).unref();
setInterval(async()=>{const owners=new Map();for(const x of sockets)if(x.ctx&&!x.ctx.guest)owners.set(x.ctx.session,x.ctx);for(const [id,ctx]of owners){let valid=false;try{const r=await fetch('http://127.0.0.1:'+(brokerPort-101)+base+'/api/me',{headers:{cookie:ctx.cookie||''},signal:AbortSignal.timeout(5000)});const v=await r.json();valid=r.ok&&v.user?.id===ctx.owner&&v.user?.role==='owner';}catch{}if(!valid)for(const x of sockets)if(x.ctx?.session===id)x.client.close(1000,'Sign-in ended');}},15000).unref();
broker.listen(brokerPort,'127.0.0.1',()=>console.log('My Remote private broker ready'));
