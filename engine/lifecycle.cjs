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
module.exports={updateDevice};
