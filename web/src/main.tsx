import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Remote} from './generated/Remote';
import {Session} from './generated/Session';
import {Fields} from './components/ui';
import '@fontsource/roboto/400.css';import '@fontsource/roboto/500.css';import '@fontsource/roboto/700.css';
import './styles.css';
declare global{interface Window{CreateAgentRedirect:any;CreateAgentRemoteDesktop:any;urlargs:any;}}
window.urlargs={};
const base=location.pathname.replace(/\/$/,''),h=React.createElement;
function Art(){return h('div',{className:'hero-art','aria-hidden':true},h('div',{className:'art-circle'}),h('div',{className:'art-monitor'},h('div',{className:'art-window'},h('div',{className:'art-window-bar'}),h('div',{className:'art-lines'})),h('div',{className:'art-stand'})),h('div',{className:'art-phone'},h('div',{className:'art-phone-screen'})),h('span',{className:'art-link'},'↔'))}
function App(){
 const [me,setMe]=useState<any>(null),[boot,setBoot]=useState<any>({}),[devices,setDevices]=useState<any[]>([]),[tab,setTab]=useState(location.hash==='#support'?'support':'access');
 const [fields,setFields]=useState<any>({fit:true,viewOnly:false,quality:'70',display:'65535'}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [modal,setModal]=useState(''),[modalError,setModalError]=useState(''),[code,setCode]=useState(''),[requests,setRequests]=useState<any[]>([]),[guestState,setGuestState]=useState<any>(null),[connected,setConnected]=useState<any>(null),[status,setStatus]=useState('Connecting…'),[options,setOptions]=useState(true),[displays,setDisplays]=useState<any[]>([{value:'65535',label:'All displays'}]);
 const selected=useRef(''),canvas=useRef<HTMLCanvasElement>(null),control=useRef<WebSocket|null>(null),desktop=useRef<any>(null),fieldRef=useRef(fields);fieldRef.current=fields;
 function field(name:string,value:any){setFields((f:any)=>({...f,[name]:value}));}
 async function api(route:string,body?:any){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':me?.csrf||'','X-Workspace-Expected-Account':me?.user.id||''},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.error||'The request could not finish.');return v;}
 async function refresh(){if(!me)return;try{const v=await api('/api/remote/devices');setDevices(v.devices);setError('');if(!fieldRef.current.supportNode&&v.devices[0])field('supportNode',v.devices[0].id);}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{Promise.all([fetch(base+'/api/bootstrap').then(r=>r.json()),fetch(base+'/api/me').then(r=>r.ok?r.json():null)]).then(([b,m])=>{setBoot(b);setMe(m);if(!m)setLoading(false)}).catch(()=>{setError('My Remote is unreachable. Reload to try again.');setLoading(false)});},[]);
 useEffect(()=>{if(!me)return;refresh();const t=setInterval(refresh,6000);return()=>clearInterval(t)},[me]);
 useEffect(()=>{if(tab!=='support')return;let gone=false;const poll=async()=>{try{if(me){const v=await api('/api/remote/support');if(!gone)setRequests(v.requests);}const g=await api('/support-api/status');if(!gone){setGuestState(g);if(g.status==='approved')setConnected((old:any)=>old||{id:g.nodeid,name:'Support session',guest:true});}}catch{}};poll();const t=setInterval(poll,2500);return()=>{gone=true;clearInterval(t)}},[tab,me]);
 useEffect(()=>{if(!connected||!canvas.current)return;
  const ws=new WebSocket(location.origin.replace(/^http/,'ws')+base+'/control.ashx');control.current=ws;let timer:any;
  const stop=()=>{desktop.current?.Stop();desktop.current=null;clearTimeout(timer)};
  ws.onopen=()=>{const mod=window.CreateAgentRemoteDesktop(canvas.current);mod.onDisplayinfo=(_:any,list:any,current:any)=>{setDisplays([{value:'65535',label:'All displays'},...Object.entries(list).map(([id,label])=>({value:id,label:String(label)}))]);field('display',String(current));};
   const redir=window.CreateAgentRedirect({send:(v:any)=>ws.readyState===1&&ws.send(JSON.stringify(v))},mod,null,null,null,base+'/');desktop.current=redir;
   redir.onStateChanged=(_:any,state:number)=>{setStatus(['Disconnected','Connecting…','Waiting for computer…','Connected'][state]||'Connecting…');if(state===3){mod.SendCompressionLevel(1,Number(fieldRef.current.quality),1024,100);mod.stopInput=!!fieldRef.current.viewOnly;canvas.current?.focus();clearTimeout(timer);}};
   redir.onConsoleMessageChange=(_:any,msg:string)=>setNotice(msg||'');redir.Start(connected.id);
   timer=setTimeout(()=>{if(redir.State!==3){stop();setStatus('Connection timed out');setNotice('Check that the host is running and try connecting again.');}},30000);
  };
  ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.action==='msg'&&m.type==='clipboard'){field('clipboard',m.data||'');setNotice('Remote clipboard received.');}}catch{}};
  ws.onclose=()=>{stop();setStatus('Disconnected')};ws.onerror=()=>setNotice('Connection unavailable. Check the host and reconnect.');
  return()=>{stop();ws.close();control.current=null};
 },[connected?.id]);
 useEffect(()=>{const m=desktop.current?.m;if(!m)return;m.stopInput=!!fields.viewOnly;m.SendCompressionLevel(1,Number(fields.quality),1024,100);m.SetDisplay(Number(fields.display));},[fields.quality,fields.viewOnly,fields.display]);
 async function start(){const d=devices.find(x=>x.id===selected.current);if(!d)throw Error('Computer no longer available.');await api('/api/remote/connect',{nodeid:d.id,pin:fields.pin});setModal('');setNotice('');setConnected(d);}
 function show(type:string){setModalError('');setModal(type)}
 async function action(name:string){setError('');setModalError('');try{setBusy(true);
  if(name==='access'||name==='support'){setTab(name);location.hash=name;}
  else if(name==='refresh')await refresh();
  else if(name==='setup'||name==='account')show(name);
  else if(name==='close')setModal('');
  else if(name==='edit'){const d=devices.find(x=>x.id===selected.current);setFields((f:any)=>({...f,deviceName:d.name,newPin:'',deviceDisabled:d.disabled}));show('edit');}
  else if(name==='saveDevice'){await api('/api/remote/device',{nodeid:selected.current,name:fields.deviceName,pin:fields.newPin,disabled:fields.deviceDisabled});setModal('');setNotice('Computer settings saved.');await refresh();}
  else if(name==='connect'){field('pin','');const d=devices.find(x=>x.id===selected.current);if(d.pin)show('pin');else await start();}
  else if(name==='start')await start();
  else if(name==='generate'){const c=await api('/api/remote/support/create',{nodeid:fields.supportNode});setCode(c.code.replace(/(\d{3})(\d{3})(\d{3})/,'$1 $2 $3'));}
  else if(name==='copycode'){await navigator.clipboard.writeText(code);setNotice('Code copied.');}
  else if(name==='redeem'){await api('/support-api/redeem',{code:fields.accessCode,name:fields.helperName});setGuestState({status:'requested'});}
  else if(name==='approve')await api('/api/remote/support/approve',{id:selected.current});
  else if(name==='revoke'){await api('/api/remote/support/revoke',{id:selected.current});setCode('');setNotice('Sharing stopped.');}
  else if(name==='disconnect'){if(connected?.guest)await api('/support-api/stop',{});setConnected(null);setNotice('Remote session ended.');}
  else if(name==='options')setOptions(x=>!x);
  else if(name==='fullscreen'){if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  else if(name==='cad')desktop.current?.m.SendCtrlAltDelMsg();
  else if(name==='escape')desktop.current?.m.SendKeyMsgKC([[1,27],[2,27]]);
  else if(name==='winkey')desktop.current?.m.SendKeyMsgKC([[3,91],[4,91]]);
  else if(name==='sendClipboard'){control.current?.send(JSON.stringify({action:'msg',type:'setclip',nodeid:connected.id,data:fields.clipboard||''}));setNotice('Clipboard text sent.');}
  else if(name==='getClipboard')control.current?.send(JSON.stringify({action:'msg',type:'getclip',nodeid:connected.id}));
  else if(name==='logout'){await api('/auth/logout',{});location.reload();}
  else if(name==='localLogin'){const token=location.hash.startsWith('#setup/')?location.hash.slice(7):null;const r=await fetch(base+(boot.needsSetup?'/api/setup':'/api/login'),{method:'POST',headers:{'Content-Type':'application/json',...(token?{'X-Setup-Token':token}:{})},body:JSON.stringify({email:fields.email,password:fields.password})});const v=await r.json();if(!r.ok)throw Error(v.error);location.href=base+'/';}
 }catch(e:any){if(modal)setModalError(e.message);else setError(e.message)}finally{setBusy(false)}}
 const data:any={workspace:boot.workspace||'/',login:boot.oidc?base+'/auth/login':'#signin',loginLabel:boot.oidc?'Sign in with MyAccounts':'Sign in',logout:'#logout',initial:me?.user.name?.[0]?.toUpperCase()||'?',accountName:me?.user.name||'Not signed in',signedIn:!!me,access:tab==='access',accessVariant:tab==='access'?'nav-active':'nav',supportVariant:tab==='support'?'nav-active':'nav',error,notice,loading,empty:!loading&&devices.length===0,deviceCount:devices.length,devices:devices.map(d=>({...d,status:d.disabled?'Disabled':d.online?'Online':'Offline',tone:d.online&&!d.disabled?'online':'neutral',unavailable:!d.online||d.disabled})),deviceOptions:devices.map(d=>({value:d.id,label:d.name})),modal:!!modal,setup:modal==='setup',edit:modal==='edit',pin:modal==='pin',account:modal==='account',localLogin:modal==='localLogin',modalTitle:({setup:'Set up remote access',edit:'Computer settings',pin:'Connect to computer',account:'Your account',localLogin:boot.needsSetup?'Create your owner account':'Sign in'} as any)[modal],modalError,agentDownload:base+'/api/remote/agent',code,requests:requests.filter(x=>x.status!=='waiting').map(x=>({...x,name:x.name||'Support request',approved:x.status==='approved',description:x.status==='approved'?'Sharing is active. You can stop it here.':'Would like to view and control your computer.'})),guestStatus:guestState?.status==='requested'?'Waiting for the host to approve your request…':guestState?.status==='approved'?'Host approved. Connecting…':''};
 const input=(method:string,e:any)=>{if(!fields.viewOnly&&desktop.current?.State===3){canvas.current?.focus();desktop.current.m[method](e.nativeEvent);e.preventDefault();}};
 const widgets:any={'hero-art':h(Art),'desktop-canvas':h('div',{className:'desktop-wrap'+(fields.fit?' fit':'' )},h('canvas',{id:'remote-desktop',ref:canvas,tabIndex:0,'aria-label':'Remote desktop',onContextMenu:(e:any)=>e.preventDefault(),onMouseDown:(e:any)=>input('mousedown',e),onMouseMove:(e:any)=>input('mousemove',e),onMouseUp:(e:any)=>input('mouseup',e),onWheel:(e:any)=>input('mousewheel',e),onKeyDown:(e:any)=>input('xxKeyDown',e),onKeyUp:(e:any)=>input('xxKeyUp',e),onKeyPress:(e:any)=>input('xxKeyPress',e),onBlur:()=>desktop.current?.m.handleReleaseKeys(),onPointerDown:(e:any)=>{if(e.pointerType==='touch')input('mousedown',e)},onPointerMove:(e:any)=>{if(e.pointerType==='touch')input('mousemove',e)},onPointerUp:(e:any)=>{if(e.pointerType==='touch')input('mouseup',e)}}),status!=='Connected'?h('div',{className:'connection-status',role:'status'},status):null)};
 useEffect(()=>{const onHash=()=>{if(location.hash==='#logout')action('logout');if(location.hash==='#signin')show('localLogin')};onHash();if(location.hash.startsWith('#setup/'))show('localLogin');window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[me]);
 return h(Fields.Provider,{value:{fields,setField:field,busy,select:(id?:string)=>{if(id!==undefined)selected.current=id},dismiss:()=>setModal(''),widgets}},connected?h(Session,{data:{name:connected.name,status,tone:status==='Connected'?'online':'neutral',options,displays,qualities:[{value:'40',label:'Faster connection'},{value:'70',label:'Balanced'},{value:'90',label:'Best picture'}],notice,guest:!!connected.guest},onAction:action}):h(Remote,{data,onAction:action}));
}
createRoot(document.getElementById('root')!).render(h(App));
