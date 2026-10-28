'use strict';
const crypto=require('node:crypto');
const random=()=>crypto.randomBytes(32).toString('hex');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function pinHash(pin,salt=crypto.randomBytes(16).toString('hex')){
 if(!/^\d{6,16}$/.test(pin))throw Error('Choose a PIN with 6–16 digits.');
 return {salt,value:crypto.scryptSync(pin,salt,32).toString('hex')};
}
function pinVerify(pin,record){return typeof pin==='string'&&pin.length<=16&&record&&equal(crypto.scryptSync(pin,record.salt,32).toString('hex'),record.value);}
class Support {
 constructor(now=()=>Date.now()){this.now=now;this.codes=new Map();this.guests=new Map();this.failures=new Map();}
 create(owner,nodeid){this.prune();if(this.codes.size>=100)throw Error('Too many support requests.');this.revokeNode(owner,nodeid);let code;do{code=String(crypto.randomInt(100000000,1000000000));}while([...this.codes.values()].some(x=>x.codeHash===hash(code)));const item={id:random(),codeHash:hash(code),owner,nodeid,created:this.now(),expires:this.now()+300000,status:'waiting'};this.codes.set(item.id,item);return {...item,code};}
 redeem(code,name,client){
  const f=this.failures.get(client)||{count:0,until:this.now()+60000};if(f.until<=this.now()){f.count=0;f.until=this.now()+60000;}this.failures.set(client,f);
  if(++f.count>5)throw Error('Too many attempts. Try again in a minute.');
  const item=[...this.codes.values()].find(x=>x.codeHash===hash(code)&&x.status==='waiting'&&x.expires>this.now());
  if(!item)throw Error('This code is invalid, expired or already used.');
  if(typeof name!=='string'||!name.trim()||name.length>80)throw Error('Enter your name.');
  item.status='requested';item.name=name.trim();const token=random();item.guest=hash(token);this.guests.set(item.guest,item);return token;
 }
 approve(owner,id){const item=this.codes.get(id);if(!item||item.owner!==owner||item.status!=='requested'||item.expires<=this.now())throw Error('This request has expired.');item.status='approved';item.expires=this.now()+1800000;return item;}
 guest(token){const item=this.guests.get(hash(token||''));return item&&item.expires>this.now()&&item.status!=='revoked'?item:null;}
 revoke(owner,id){const item=this.codes.get(id);if(!item||item.owner!==owner)throw Error('Request not found.');item.status='revoked';return item;}
 revokeNode(owner,nodeid){for(const item of this.codes.values())if(item.owner===owner&&item.nodeid===nodeid)item.status='revoked';}
 prune(){for(const [id,x] of this.codes)if(x.expires<=this.now()){this.codes.delete(id);if(x.guest)this.guests.delete(x.guest);}for(const [id,x] of this.failures)if(x.until<=this.now())this.failures.delete(id);}
}
module.exports={random,hash,equal,pinHash,pinVerify,Support};
