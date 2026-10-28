const {test}=require('node:test'),assert=require('node:assert/strict'),net=require('node:net'),{EventEmitter}=require('node:events');
const {attach,response}=require('../engine/rfb.cjs');
test('bridge authenticates native host without disclosing password; forwards only desktop commands',async()=>{
 const password='xY7mP2qR',challenge=Buffer.alloc(16,42),commands=[];
 let peer;
 const server=net.createServer(s=>{peer=s;s.write('RFB 003.008\n');let stage=0,buffer=Buffer.alloc(0);s.on('data',d=>{buffer=Buffer.concat([buffer,d]);while(true){const need=[12,1,16,1][stage]||8;if(buffer.length<need)return;const chunk=buffer.subarray(0,need);buffer=buffer.subarray(need);if(stage===0){assert.equal(chunk.toString(),'RFB 003.008\n');s.write(Buffer.from([1,2]));}else if(stage===1){assert.equal(chunk[0],2);s.write(challenge.subarray(0,5));s.write(challenge.subarray(5));}else if(stage===2){assert.deepEqual(chunk,response(challenge,password));s.write(Buffer.alloc(4));}else if(stage===3){assert.equal(chunk[0],1);}else{commands.push(chunk);}stage++;}});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const ws=new EventEmitter();ws.readyState=1;ws.bufferedAmount=0;const output=[];
 let closed;const ended=new Promise(r=>closed=r);ws.close=()=>{ws.readyState=3;ws.emit('close');closed();};
 let seen=0;ws.send=d=>{output.push(Buffer.from(d));if(seen++===0)setImmediate(()=>ws.emit('message',Buffer.from('RFB 003.008\n'),true));else if(seen===2)setImmediate(()=>ws.emit('message',Buffer.from([1]),true));else if(seen===3)setImmediate(()=>{ws.emit('message',Buffer.from([1]),true);ws.emit('message',Buffer.from([4,1,0,0,0,0,0,65]),true);setTimeout(()=>ws.emit('message',Buffer.from([130]),true),30);});};
 try{attach(ws,{port:server.address().port,password});await ended;assert.equal(commands.length,1);assert.equal(commands[0][0],4);assert.ok(!Buffer.concat(output).includes(Buffer.from(password)));}finally{peer?.destroy();await new Promise(r=>server.close(r));}
});
test('bridge refuses a native server offering unauthenticated access',async()=>{
 let peer;const server=net.createServer(s=>{peer=s;s.write('RFB 003.008\n');s.once('data',()=>s.write(Buffer.from([1,1])));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const ws=new EventEmitter();ws.readyState=1;ws.bufferedAmount=0;let sent=0,done;ws.send=()=>sent++;const ended=new Promise(r=>done=r);ws.close=()=>{ws.readyState=3;done()};
 try{attach(ws,{port:server.address().port,password:'ignored1'});await ended;assert.equal(sent,0);}finally{peer?.destroy();await new Promise(r=>server.close(r));}
});
