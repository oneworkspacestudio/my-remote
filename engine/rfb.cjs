'use strict';
// RFB 3.8 authentication adapter. Only a fixed loopback target is accepted.
// The browser never receives the native host password.
const net = require('node:net');
const crypto = require('node:crypto');
function reverseByte(n) { let out=0; for(let i=0;i<8;i++){out=(out<<1)|(n&1);n>>=1;}return out; }
function des(data,key) {
 const k=Buffer.from(key.map(reverseByte));
 const cipher=crypto.createCipheriv('des-ede3',Buffer.concat([k,k,k]),null);
 cipher.setAutoPadding(false);return Buffer.concat([cipher.update(data),cipher.final()]);
}
function response(challenge,password) {const key=Buffer.alloc(8);Buffer.from(password,'ascii').copy(key,0,0,8);return des(challenge,key);}
function storedPassword(password) {const plain=Buffer.alloc(8);Buffer.from(password,'ascii').copy(plain);return des(plain,Buffer.from([23,82,107,6,35,78,88,7]));}
function attach(ws,{port,password,onBytes=()=>{}}) {
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid loopback port');
 const target=net.connect({host:'127.0.0.1',port});target.setNoDelay(true);
 let buf=Buffer.alloc(0),clientBuf=Buffer.alloc(0),stage='version',clientStage='waiting',closing=false;
 const timer=setTimeout(()=>close('Host handshake timed out'),10000);
 function close(reason){if(closing)return;closing=true;if(reason)console.error('Desktop bridge:',reason,'at',stage,'/',clientStage);clearTimeout(timer);target.destroy();ws.close(1000,reason||'Desktop disconnected');}
 function send(data){if(ws.readyState===1){if(ws.bufferedAmount>16*1024*1024)return close('Slow connection');ws.send(data);}}
 target.on('error',()=>close('Windows host unavailable'));target.on('close',()=>close());ws.on('close',()=>close());ws.on('error',()=>close());
 target.on('data',data=>{
  if(stage==='stream'){onBytes(data.length);send(data);return;}
  buf=Buffer.concat([buf,data]);
  try {while(true){
   if(stage==='version'){if(buf.length<12)return;const v=buf.subarray(0,12).toString();if(!/^RFB 003\.00[78]\n$/.test(v))throw Error('Unsupported host protocol');buf=buf.subarray(12);target.write('RFB 003.008\n');stage='types';}
   else if(stage==='types'){if(buf.length<1)return;const n=buf[0];if(!n||n>32)throw Error('Host security unavailable');if(buf.length<1+n)return;if(!buf.subarray(1,1+n).includes(2))throw Error('Host must require authentication');buf=buf.subarray(1+n);target.write(Buffer.from([2]));stage='challenge';}
   else if(stage==='challenge'){if(buf.length<16)return;target.write(response(buf.subarray(0,16),password));buf=buf.subarray(16);stage='result';}
   else if(stage==='result'){if(buf.length<4)return;if(buf.readUInt32BE(0)!==0)throw Error('Host authentication failed');buf=buf.subarray(4);stage='ready';clientStage='version';send(Buffer.from('RFB 003.008\n'));return;}
   else return;
  }}catch(e){close(e.message);}
 });
 ws.on('message',(data,binary)=>{
  if(!binary)return close('Binary desktop protocol required');
  clientBuf=Buffer.concat([clientBuf,data]);if(clientBuf.length>1024*1024)return close('Desktop message too large');
  try {while(true){
   if(clientStage==='waiting'){if(clientBuf.length)throw Error('Host is not ready');return;}
   if(clientStage==='version'){if(clientBuf.length<12)return;if(clientBuf.subarray(0,12).toString()!=='RFB 003.008\n')throw Error('Unsupported viewer protocol');clientBuf=clientBuf.subarray(12);clientStage='security';send(Buffer.from([1,1]));}
   else if(clientStage==='security'){if(clientBuf.length<1)return;if(clientBuf[0]!==1)throw Error('Invalid viewer security');clientBuf=clientBuf.subarray(1);send(Buffer.alloc(4));clientStage='init';}
   else if(clientStage==='init'){if(clientBuf.length<1)return;clientBuf=clientBuf.subarray(1);stage='stream';clientStage='stream';clearTimeout(timer);target.write(Buffer.from([1]));if(buf.length){send(buf);buf=Buffer.alloc(0);}}
   else {
    if(!clientBuf.length)return;let length;
    switch(clientBuf[0]){
     case 0:length=20;break;
     case 2:if(clientBuf.length<4)return;const count=clientBuf.readUInt16BE(2);if(count>256)throw Error('Too many encodings');length=4+count*4;break;
     case 3:length=10;break;
     case 4:length=8;break;
     case 5:length=6;break;
     case 6:if(clientBuf.length<8)return;const size=clientBuf.readInt32BE(4);if(size<0||size>8192)throw Error('Unsupported clipboard data');length=8+size;break;
     case 150:length=10;break;
     case 248:if(clientBuf.length<9)return;length=9+clientBuf[8];break;
     case 255:length=12;break;
     default:throw Error('Unsupported desktop command');
    }
    if(clientBuf.length<length)return;
    const message=clientBuf.subarray(0,length);clientBuf=clientBuf.subarray(length);
    if(target.writableLength>1024*1024)throw Error('Host is too slow');target.write(message);
   }
  }}catch(e){close(e.message);}
 });
 return {close};
}
module.exports={attach,response,storedPassword};
