const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {request,chromium}=require('../web/node_modules/@playwright/test');
const root=process.env.MY_REMOTE_QA_ROOT;if(!root)throw Error('Set MY_REMOTE_QA_ROOT to a fresh named NTFS test root');fs.mkdirSync(root,{recursive:true});
const data=path.join(root,'private'),exe=process.env.MY_REMOTE_QA_EXE;if(!exe||fs.existsSync(data))throw Error('Provide an exact package and a fresh data root');fs.mkdirSync(data);
const password=crypto.randomBytes(24).toString('hex'),base='http://localhost:29734/remote',out=fs.openSync(path.join(root,'native.log'),'a');
const child=spawn(exe,['--data',data,'--listen','127.0.0.1:29734','--origin',base,'--no-browser','--bootstrap-email','owner@example.invalid'],{windowsHide:true,env:{...process.env,LOCALAPPDATA:path.join(root,'local-app-data'),WORKSPACE_BOOTSTRAP_PASSWORD:password},stdio:['ignore',out,out]});
let ctx,browser;
(async()=>{try{
 for(let i=0;i<60;i++){if(child.exitCode!==null)throw Error('App stopped');try{if((await fetch(base+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 ctx=await request.newContext({extraHTTPHeaders:{Origin:'http://localhost:29734'}});
 assert.equal((await ctx.get(base+'/api/remote/devices')).status(),401);
 assert.equal((await ctx.post(base+'/api/login',{data:{email:'owner@example.invalid',password}})).status(),200);
 const me=await(await ctx.get(base+'/api/me')).json(),headers={'X-CSRF-Token':me.csrf,'X-Workspace-Expected-Account':me.user.id};
 let v;for(let i=0;i<30;i++){const r=await ctx.get(base+'/api/remote/devices');if(r.ok()){v=await r.json();break;}await new Promise(r=>setTimeout(r,500));}assert.deepEqual(v.devices,[]);
 assert.equal((await ctx.post(base+'/api/remote/enroll',{data:{pin:'654321'}})).status(),403);
 assert.equal((await ctx.post(base+'/api/remote/enroll',{headers,data:{pin:'1'}})).status(),400);
 assert.ok(!fs.existsSync(path.join(data,'host-secret.json')),'Unconfigured app must not create host credentials');
 browser=await chromium.launch({channel:'msedge',headless:true});const bc=await browser.newContext({storageState:await ctx.storageState(),viewport:{width:390,height:844}}),page=await bc.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');await page.getByRole('button',{name:'Set up remote access',exact:true}).waitFor();await page.screenshot({path:path.join(root,'idle-phone.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(root,'acceptance.json'),JSON.stringify({freshPrivateData:true,unconfiguredStartupHealthy:true,noHostCredentialsCreated:true,ownerAndCSRFEnforced:true,invalidPINDoesNotConfigureHost:true,mobileNoErrorsOrOverflow:true,ownerDataUsed:false,actualDesktopCaptureRetested:false},null,2));console.log('PASS exact managed package starts idle, auth/CSRF/PIN enforced, no host configuration side effects, mobile UI');
 }finally{if(browser)await browser.close();if(ctx)await ctx.dispose();child.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
