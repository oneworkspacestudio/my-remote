'use strict';
// Only generated accounts and synthetic devices in a fresh task-owned NTFS folder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const {chromium,request}=require('../web/node_modules/@playwright/test');
const {WebSocket}=require('ws');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../native-'+Date.now()),base='http://localhost:29734/remote',owner='owner@example.invalid',password=crypto.randomBytes(24).toString('hex');
const user=crypto.createHash('sha256').update('local:remote\0'+owner).digest('hex'),mid='mesh/remote/'+crypto.createHash('sha384').update('my-remote:'+user).digest('base64').replace(/\+/g,'@').replace(/\//g,'$');
const nid='node/remote/'+crypto.randomBytes(48).toString('base64').replace(/\+/g,'@').replace(/\//g,'$');
fs.mkdirSync(path.join(fixture,'mesh'),{recursive:true});
fs.writeFileSync(path.join(fixture,'app.json'),JSON.stringify({schema:1,id:'remote'}));
fs.writeFileSync(path.join(fixture,'mesh/meshcentral.db'),JSON.stringify({_id:nid,type:'node',domain:'remote',meshid:mid,name:'Studio PC',osdesc:'Windows 11',agent:{id:4,caps:31,ver:1}})+'\n');
// No agent binaries are downloaded or copied into synthetic fixtures.
const log=fs.openSync(path.join(fixture,'host.log'),'a'),child=spawn(path.join(root,'dist/MyRemote.exe'),['--data',fixture,'--listen','127.0.0.1:29734','--origin',base,'--no-browser','--bootstrap-email',owner],{windowsHide:true,cwd:root,env:{...process.env,MY_REMOTE_RUNTIME:root,WORKSPACE_BOOTSTRAP_PASSWORD:password},stdio:['ignore',log,log]});
fs.writeFileSync(path.join(fixture,'pid.json'),JSON.stringify({pid:child.pid}));
let browser,ctx,guest;const results=[];const check=(name)=>{results.push(name);console.log('PASS '+name)};
async function wsResult(cookie,origin=base.replace('/remote','')){return await new Promise(resolve=>{const ws=new WebSocket(base.replace('http','ws')+'/control.ashx',{headers:{Cookie:cookie,Origin:origin}});const timer=setTimeout(()=>{ws.close();resolve('timeout')},5000);ws.on('open',()=>{clearTimeout(timer);ws.close();resolve('open')});ws.on('unexpected-response',(_,r)=>{clearTimeout(timer);resolve(r.statusCode);ws.terminate()});ws.on('error',()=>{});});}
(async()=>{try{
 for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,500));if(child.exitCode!==null)throw Error('Native host stopped');try{if((await fetch(base+'/healthz')).ok)break;}catch{}}
 ctx=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:'http://localhost:29734'}});
 assert.equal((await ctx.get(base+'/api/remote/devices',{headers:{'X-Remote-Owner':user,'X-Remote-Broker':'forged'}})).status(),401);check('anonymous and forged identity denied');
 assert.equal((await ctx.post(base+'/api/login',{data:{email:owner,password}})).status(),200);
 const me=await (await ctx.get(base+'/api/me')).json();assert.equal(me.user.role,'owner');
 const headers={'X-CSRF-Token':me.csrf,'X-Workspace-Expected-Account':me.user.id};
 let ready;for(let i=0;i<90;i++){const r=await ctx.get(base+'/api/remote/devices');if(r.ok()){ready=await r.json();break;}await new Promise(r=>setTimeout(r,1000));}
 assert.ok(ready,'Mesh engine readiness');assert.equal(ready.devices[0].name,'Studio PC');check('native host and pinned engine serve synthetic devices');
 const post=(route,data,extra={})=>ctx.post(base+route,{headers:{...headers,...extra},data});
 assert.equal((await post('/api/remote/connect',{nodeid:nid})).status(),400);check('unenrolled PIN cannot open a desktop lease');
 assert.equal((await ctx.post(base+'/api/remote/device',{data:{nodeid:nid,name:'Forged'}})).status(),403);check('mutations require CSRF');
 assert.equal((await post('/api/remote/device',{nodeid:nid,name:'Studio PC',pin:'654321'}, {'X-Workspace-Expected-Account':'another'})).status(),409);check('changed account rejected');
 assert.equal((await post('/api/remote/device',{nodeid:nid,name:'Studio PC',pin:'654321'})).status(),200);
 assert.equal((await post('/api/remote/connect',{nodeid:nid,pin:'000000'})).status(),400);
 assert.equal((await post('/api/remote/connect',{nodeid:nid,pin:'654321'})).status(),200);check('PIN stored and enforced');
 const ownCookie=(await ctx.storageState()).cookies.map(c=>c.name+'='+c.value).join('; ');
 assert.equal(await wsResult(ownCookie,'https://unrelated.invalid'),403);assert.equal(await wsResult(ownCookie),'open');check('control socket authenticates owner and rejects cross-origin');
 assert.equal((await post('/api/local-users',{email:'member@example.invalid',password})).status(),201);
 const member=await request.newContext({extraHTTPHeaders:{Origin:'http://localhost:29734'}});await member.post(base+'/api/login',{data:{email:'member@example.invalid',password}});assert.equal((await member.get(base+'/api/remote/devices')).status(),403);await member.dispose();check('non-owner cannot access desktop management');
 const c=await(await post('/api/remote/support/create',{nodeid:nid})).json();assert.equal(c.code.length,9);
 guest=await request.newContext({extraHTTPHeaders:{Origin:'http://localhost:29734'}});assert.equal((await guest.post(base+'/support-api/redeem',{data:{code:c.code,name:'Test Helper'}})).status(),200);
 assert.equal((await guest.get(base+'/support-api/status').then(r=>r.json())).status,'requested');
 const guestCookie=(await guest.storageState()).cookies.map(c=>c.name+'='+c.value).join('; ');assert.equal(await wsResult(guestCookie),403);
 assert.equal((await guest.post(base+'/support-api/redeem',{data:{code:c.code,name:'Second Helper'}})).status(),400);check('support requires approval and code is single-use');
 assert.equal((await post('/api/remote/support/approve',{id:c.id})).status(),200);assert.equal(await wsResult(guestCookie),'open');
 assert.equal((await post('/api/remote/support/revoke',{id:c.id})).status(),200);assert.equal(await wsResult(guestCookie),403);check('approved support grant revokes');
 assert.equal((await post('/api/remote/connect',{nodeid:nid})).status(),400);
 const agent=await ctx.get(base+'/api/remote/agent');const payload=await agent.body();const agentDownloadPassed=agent.status()===200&&payload.subarray(0,2).toString()==='MZ'&&payload.length>3000000;if(agentDownloadPassed)check('real Windows host download served');else console.log('BLOCKED Windows host download; HTTP '+agent.status()+' (inspect engine/security logs; not an accepted release)');
 browser=await chromium.launch({channel:'chrome',headless:true});const bc=await browser.newContext({storageState:await ctx.storageState(),viewport:{width:1440,height:1000}}),page=await bc.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const anon=await browser.newContext(),loginPage=await anon.newPage();await loginPage.goto(base+'/');await loginPage.getByRole('link',{name:'Sign in',exact:true}).click();await loginPage.getByLabel('Email',{exact:true}).fill(owner);await loginPage.getByLabel('Password',{exact:true}).fill(password);await loginPage.getByRole('button',{name:'Sign in',exact:true}).click();await loginPage.getByRole('heading',{name:'Studio PC'}).waitFor();await anon.close();check('standalone browser sign-in works');
 await page.goto(base+'/');await page.getByRole('heading',{name:'Studio PC'}).waitFor();await page.screenshot({path:path.join(fixture,'access-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Computer settings'}).click();await page.getByLabel('Computer name',{exact:true}).fill('Editing workstation');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('heading',{name:'Editing workstation'}).waitFor();check('native UI edits persist through backend');
 await page.getByRole('button',{name:'Remote Support',exact:true}).click();await page.getByRole('heading',{name:'Get support'}).waitFor();await page.screenshot({path:path.join(fixture,'support-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(fixture,'support-phone.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:'Remote Access',exact:true}).click();await page.screenshot({path:path.join(fixture,'access-phone.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);check('desktop and phone UI render without errors or horizontal overflow');
 fs.writeFileSync(path.join(fixture,'acceptance.json'),JSON.stringify({passed:results,agentDownloadPassed,releaseAccepted:false,fixture,screenshots:['access-desktop.png','support-desktop.png','access-phone.png','support-phone.png'],limits:['Synthetic devices; no real desktop pixels or input tested','No production identity/data used']},null,2));console.log('RESULT '+fixture);if(!agentDownloadPassed)process.exitCode=2;
}finally{if(browser)await browser.close();if(ctx)await ctx.dispose();if(guest)await guest.dispose();child.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
