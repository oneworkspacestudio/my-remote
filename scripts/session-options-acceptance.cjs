'use strict';
// Exercise the shipped UI against a synthetic API/framebuffer. No owner host,
// credentials, desktop capture, clipboard or input is used.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('../web/node_modules/@playwright/test');
const {WebSocketServer}=require('ws');
const dist=path.resolve(__dirname,'../internal/webui/dist'),out=process.env.MY_REMOTE_UI_QA_ROOT;
if(!out)throw Error('Set MY_REMOTE_UI_QA_ROOT to a task-owned artifact directory');
fs.mkdirSync(out,{recursive:true});
let pointerMessages=0,releaseDisconnect;
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.includes('/api/')){
  let result={};
  if(pathname.endsWith('/bootstrap'))result={workspace:'/'};
  else if(pathname.endsWith('/me'))result={user:{id:'synthetic-owner',name:'Test owner'},csrf:'synthetic-csrf'};
  else if(pathname.endsWith('/devices'))result={devices:[{id:'local',name:'Test computer',online:true,pin:false}]};
  else if(pathname.endsWith('/disconnect'))await new Promise(resolve=>{releaseDisconnect=resolve});
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));return;
 }
 const relative=pathname.replace(/^\/remote\/?/,'')||'index.html',file=path.resolve(dist,relative);
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 const ext=path.extname(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2'}[ext]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':type});fs.createReadStream(file).pipe(res);
});
const sockets=new WebSocketServer({server,path:'/remote/desktop'});
sockets.on('connection',ws=>{
 let stage=0;ws.send(Buffer.from('RFB 003.008\n'));
 ws.on('message',raw=>{
  const b=Buffer.from(raw);
  if(stage===0){stage++;ws.send(Buffer.from([1,1]));}
  else if(stage===1){stage++;ws.send(Buffer.alloc(4));}
  else if(stage===2){
   stage++;const name=Buffer.from('Synthetic desktop'),init=Buffer.alloc(24+name.length);
   init.writeUInt16BE(1280,0);init.writeUInt16BE(720,2);init[4]=32;init[5]=24;init[7]=1;
   init.writeUInt16BE(255,8);init.writeUInt16BE(255,10);init.writeUInt16BE(255,12);init[14]=16;init[15]=8;
   init.writeUInt32BE(name.length,20);name.copy(init,24);ws.send(init);
  }else if(b[0]===5)pointerMessages++;
 });
});
let browser;
(async()=>{try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/remote/`);
 const connect=()=>page.getByRole('button',{name:'Connect',exact:true}).click();
 await connect();
 try{await page.locator('.row--session-header .badge--online').waitFor({state:'attached',timeout:10000});}catch(error){await page.screenshot({path:path.join(out,'connection-failure.png')});console.log('Synthetic UI errors',errors,'Socket count',sockets.clients.size,'Page text',await page.locator('body').innerText());throw error;}
 const toggle=page.getByRole('button',{name:'Session options',exact:true}),panel=page.getByRole('region',{name:'Session options',exact:true});
 assert.equal(await panel.count(),0,'New session starts with options closed');
 assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 await page.screenshot({path:path.join(out,'session-phone-closed.png')});
 await toggle.tap();await panel.waitFor();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await page.screenshot({path:path.join(out,'session-phone-open.png')});
 const close=panel.getByRole('button',{name:'Close session options',exact:true});
 await close.tap();assert.equal(await panel.count(),0);
 await toggle.tap();const pointerBefore=pointerMessages;await page.getByRole('button',{name:'Dismiss session options'}).tap({position:{x:12,y:100}});
 assert.equal(await panel.count(),0);assert.equal(pointerMessages,pointerBefore,'Dismissal must not send remote pointer input');
 for(const viewport of [{width:320,height:640},{width:720,height:320},{width:1440,height:900}]){
  await page.setViewportSize(viewport);await toggle.tap();await panel.waitFor();
  await panel.evaluate(el=>{el.scrollTop=el.scrollHeight});
  const box=await close.boundingBox();assert.ok(box&&box.y>=64&&box.y+box.height<=viewport.height,'Close remains visible after scrolling');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  await close.tap();assert.equal(await panel.count(),0);
 }
 await page.setViewportSize({width:390,height:844});await toggle.tap();
 const disconnect=page.getByRole('button',{name:'Disconnect',exact:true});await disconnect.tap();
 await page.waitForFunction(()=>document.querySelector('.button--disconnect').disabled);
 assert.ok(await close.isEnabled(),'Close remains usable while a session request is pending');
 await close.tap();await toggle.tap();assert.equal(await panel.count(),1);
 releaseDisconnect();await page.getByRole('button',{name:'Connect',exact:true}).waitFor();
 await connect();await page.locator('.row--session-header .badge--online').waitFor({state:'attached'});
 assert.equal(await panel.count(),0,'Reconnect closes options again');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'session-options-acceptance.json'),JSON.stringify({syntheticAPIAndFramebuffer:true,defaultClosed:true,touchToggleAndClose:true,outsideTapDismissesWithoutRemoteInput:true,closeVisibleAfterScroll:true,pendingRequestDoesNotTrapPanel:true,reconnectStartsClosed:true,viewports:[[390,844],[320,640],[720,320],[1440,900]],noOverflowOrRuntimeErrors:true,ownerDataOrHostUsed:false},null,2)+'\n');
 console.log('PASS synthetic connected-session UI: default closed, touch toggle/close/backdrop, scroll, busy request, reconnect, mobile/landscape/desktop');
 }finally{
  releaseDisconnect?.();if(browser)await browser.close();for(const ws of sockets.clients)ws.terminate();await new Promise(resolve=>sockets.close(resolve));await new Promise(resolve=>server.close(resolve));
 }})().catch(error=>{console.error(error);process.exitCode=1});


