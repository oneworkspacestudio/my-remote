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
