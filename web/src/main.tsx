import RFB from '@novnc/novnc';
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Remote} from './generated/Remote';
import {Session} from './generated/Session';
import {Fields} from './components/ui';
import '@fontsource/roboto/400.css';import '@fontsource/roboto/500.css';import '@fontsource/roboto/700.css';
import './styles.css';
const base=location.pathname.replace(/\/$/,''),h=React.createElement;
function Art(){return h('div',{className:'hero-art','aria-hidden':true},h('div',{className:'art-circle'}),h('div',{className:'art-monitor'},h('div',{className:'art-window'},h('div',{className:'art-window-bar'}),h('div',{className:'art-lines'})),h('div',{className:'art-stand'})),h('div',{className:'art-phone'},h('div',{className:'art-phone-screen'})),h('span',{className:'art-link'},'↔'))}
function App(){
 const [me,setMe]=useState<any>(null),[boot,setBoot]=useState<any>({}),[devices,setDevices]=useState<any[]>([]),[tab,setTab]=useState(location.hash==='#support'?'support':'access');
 const [fields,setFields]=useState<any>({fit:true,viewOnly:false,quality:'70',display:'65535'}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [modal,setModal]=useState(''),[modalError,setModalError]=useState(''),[code,setCode]=useState(''),[requests,setRequests]=useState<any[]>([]),[guestState,setGuestState]=useState<any>(null),[connected,setConnected]=useState<any>(null),[status,setStatus]=useState('Connecting…'),[options,setOptions]=useState(true),[displays,setDisplays]=useState<any[]>([{value:'65535',label:'All displays'}]);
 const selected=useRef(''),canvas=useRef<HTMLDivElement>(null),control=useRef<WebSocket|null>(null),desktop=useRef<any>(null),fieldRef=useRef(fields);fieldRef.current=fields;
 function field(name:string,value:any){setFields((f:any)=>({...f,[name]:value}));}
 async function api(route:string,body?:any){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':me?.csrf||'','X-Workspace-Expected-Account':me?.user.id||''},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.error||'The request could not finish.');return v;}
 async function refresh(){if(!me)return;try{const v=await api('/api/remote/devices');setDevices(v.devices);setError(v.hostError||'');if(!fieldRef.current.supportNode&&v.devices[0])field('supportNode',v.devices[0].id);}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{Promise.all([fetch(base+'/api/bootstrap').then(r=>r.json()),fetch(base+'/api/me').then(r=>r.ok?r.json():null)]).then(([b,m])=>{setBoot(b);setMe(m);if(!m)setLoading(false)}).catch(()=>{setError('My Remote is unreachable. Reload to try again.');setLoading(false)});},[]);
 useEffect(()=>{if(!me)return;refresh();const t=setInterval(refresh,6000);return()=>clearInterval(t)},[me]);
 useEffect(()=>{if(tab!=='support')return;let gone=false;const poll=async()=>{try{if(me){const v=await api('/api/remote/support');if(!gone)setRequests(v.requests);}const g=await api('/support-api/status');if(!gone){setGuestState(g);if(g.status==='approved')setConnected((old:any)=>old||{id:g.nodeid,name:'Support session',guest:true});}}catch{}};poll();const t=setInterval(poll,2500);return()=>{gone=true;clearInterval(t)}},[tab,me]);
 useEffect(()=>{if(!connected||!canvas.current)return;
  setStatus('Connecting…');const rfb=new RFB(canvas.current,location.origin.replace(/^http/,'ws')+base+'/desktop?nodeid=local',{shared:true});desktop.current=rfb;
  rfb.scaleViewport=!!fieldRef.current.fit;rfb.resizeSession=false;rfb.viewOnly=!!fieldRef.current.viewOnly;rfb.qualityLevel=Math.round(Number(fieldRef.current.quality)/10);rfb.compressionLevel=6;
  rfb.addEventListener('connect',()=>{clearTimeout(timer);setStatus('Connected');rfb.focus();});
  rfb.addEventListener('disconnect',()=>setStatus('Disconnected'));
  rfb.addEventListener('securityfailure',()=>setNotice('Desktop authentication failed. Check the host configuration.'));
  rfb.addEventListener('clipboard',(e:any)=>{field('remoteClipboard',e.detail.text);});
  const timer=setTimeout(()=>{if(desktop.current===rfb&&rfb.connectionState!=='connected'){rfb.disconnect();setNotice('Connection timed out. Check that the Windows host is running.');}},30000);
  return()=>{clearTimeout(timer);rfb.disconnect();desktop.current=null;};
 },[connected?.id]);
 useEffect(()=>{const rfb=desktop.current;if(rfb){rfb.viewOnly=!!fields.viewOnly;rfb.scaleViewport=!!fields.fit;rfb.qualityLevel=Math.round(Number(fields.quality)/10);}},[fields.fit,fields.quality,fields.viewOnly]);
 async function start(){const d=devices.find(x=>x.id===selected.current);if(!d)throw Error('Computer no longer available.');await api('/api/remote/connect',{nodeid:d.id,pin:fields.pin});setModal('');setNotice('');setConnected(d);}
 function show(type:string){setModalError('');setModal(type)}
 async function action(name:string){setError('');setModalError('');try{setBusy(true);
  if(name==='access'||name==='support'){setTab(name);location.hash=name;}
  else if(name==='refresh')await refresh();
  else if(name==='setup'||name==='account'){if(name==='setup'){field('setupName','');field('setupPin','');}show(name);}
  else if(name==='enroll'){await api('/api/remote/enroll',{name:fields.setupName,pin:fields.setupPin});setModal('');await refresh();}
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
  else if(name==='disconnect'){if(connected?.guest)await api('/support-api/stop',{});else await api('/api/remote/disconnect',{});setConnected(null);setNotice('Remote session ended.');}
  else if(name==='options')setOptions(x=>!x);
  else if(name==='fullscreen'){if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  else if(name==='cad')desktop.current?.sendCtrlAltDel();
  else if(name==='escape')desktop.current?.sendKey(0xff1b,'Escape');
  else if(name==='winkey')desktop.current?.sendKey(0xffeb,'MetaLeft');
  else if(name==='sendClipboard'){desktop.current?.clipboardPasteFrom(fields.clipboard||'');setNotice('Clipboard text sent.');}
  else if(name==='getClipboard'){field('clipboard',fields.remoteClipboard||'');setNotice('Latest remote clipboard text shown below.');}
  else if(name==='logout'){await api('/auth/logout',{});location.reload();}
  else if(name==='localLogin'){const token=location.hash.startsWith('#setup/')?location.hash.slice(7):null;const r=await fetch(base+(boot.needsSetup?'/api/setup':'/api/login'),{method:'POST',headers:{'Content-Type':'application/json',...(token?{'X-Setup-Token':token}:{})},body:JSON.stringify({email:fields.email,password:fields.password})});const v=await r.json();if(!r.ok)throw Error(v.error);location.href=base+'/';}
 }catch(e:any){if(modal)setModalError(e.message);else setError(e.message)}finally{setBusy(false)}}
 const data:any={localNotice:boot.workspace?'Desktop access stays off until you enable it. This host is available while its Windows user is signed in.':['localhost','127.0.0.1'].includes(location.hostname)?'Local preview: internet access is not configured. This host runs while you are signed in to Windows.':'',loginHelp:boot.needsSetup?'Create your owner account. Use a password with at least 12 characters.':'Sign in to this My Remote server.',loginButton:boot.needsSetup?'Create owner account':'Sign in',workspace:boot.workspace||'/',login:boot.oidc?(boot.workspace?boot.workspace.replace(/\/$/,'')+'/_workspace/open/remote':base+'/auth/login'):'#signin',loginLabel:boot.oidc?'Sign in with MyAccounts':'Sign in',logout:'#logout',initial:me?.user.name?.[0]?.toUpperCase()||'?',accountName:me?.user.name||'Not signed in',signedIn:!!me,access:tab==='access',accessVariant:tab==='access'?'nav-active':'nav',supportVariant:tab==='support'?'nav-active':'nav',error,notice,loading,empty:!loading&&devices.length===0,deviceCount:devices.length,devices:devices.map(d=>({...d,status:d.disabled?'Disabled':d.online?'Online':'Offline',tone:d.online&&!d.disabled?'online':'neutral',unavailable:!d.online||d.disabled})),deviceOptions:devices.map(d=>({value:d.id,label:d.name})),modal:!!modal,setup:modal==='setup',edit:modal==='edit',pin:modal==='pin',account:modal==='account',localLogin:modal==='localLogin',modalTitle:({setup:'Set up remote access',edit:'Computer settings',pin:'Connect to computer',account:'Your account',localLogin:boot.needsSetup?'Create your owner account':'Sign in'} as any)[modal],modalError,agentDownload:base+'/api/remote/agent',code,requests:requests.filter(x=>x.status!=='waiting').map(x=>({...x,name:x.name||'Support request',approved:x.status==='approved',description:x.status==='approved'?'Sharing is active. You can stop it here.':'Would like to view and control your computer.'})),guestStatus:guestState?.status==='requested'?'Waiting for the host to approve your request…':guestState?.status==='approved'?'Host approved. Connecting…':''};
 const widgets:any={'hero-art':h(Art),'desktop-canvas':h('div',{className:'desktop-wrap'},h('div',{id:'remote-desktop',ref:canvas,'aria-label':'Remote desktop',style:{width:'100%',height:'100%',minHeight:'70vh'}}),status!=='Connected'?h('div',{className:'connection-status',role:'status'},status):null)};
 useEffect(()=>{const onHash=()=>{if(location.hash==='#logout')action('logout');if(location.hash==='#signin')show('localLogin')};onHash();if(location.hash.startsWith('#setup/'))show('localLogin');window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[me]);
 return h(Fields.Provider,{value:{fields,setField:field,busy,select:(id?:string)=>{if(id!==undefined)selected.current=id},dismiss:()=>setModal(''),widgets}},connected?h(Session,{data:{name:connected.name,status,tone:status==='Connected'?'online':'neutral',options,displays,qualities:[{value:'40',label:'Faster connection'},{value:'70',label:'Balanced'},{value:'90',label:'Best picture'}],notice,guest:!!connected.guest},onAction:action}):h(Remote,{data,onAction:action}));
}
createRoot(document.getElementById('root')!).render(h(App));
