const {test}=require('node:test'),assert=require('node:assert/strict');
const {Support,pinHash,pinVerify,equal}=require('../engine/security.cjs');
test('secret comparison handles malformed Unicode without throwing',()=>{
 assert.equal(equal('é','x'),false);assert.equal(equal(undefined,'x'),false);
 assert.equal(equal('same','same'),true);assert.equal(equal('same','diff'),false);
});
test('support code requires owner approval, is single use, expires and revokes',()=>{
 let now=1000;const s=new Support(()=>now),c=s.create('owner-a','node-a');
 const token=s.redeem(c.code,'Helper','client');assert.equal(s.guest(token).status,'requested');
 assert.throws(()=>s.approve('owner-b',c.id));assert.throws(()=>s.redeem(c.code,'Other','client'));
 s.approve('owner-a',c.id);assert.equal(s.guest(token).nodeid,'node-a');
 now+=1800001;assert.equal(s.guest(token),null);
 const d=s.create('owner-a','node-b'),t=s.redeem(d.code,'Helper','another');s.approve('owner-a',d.id);s.revoke('owner-a',d.id);assert.equal(s.guest(t),null);
});
test('brute force is rate limited and expired invitation cannot redeem',()=>{
 let now=0;const s=new Support(()=>now),c=s.create('a','b');for(let i=0;i<5;i++)assert.throws(()=>s.redeem('000000000','x','one'));
 assert.throws(()=>s.redeem(c.code,'x','one'),/Too many/);now=300001;assert.throws(()=>s.redeem(c.code,'x','two'));s.prune();assert.equal(s.codes.size,0);
});
test('PINs have random salts, validate and reject incorrect and oversized input',()=>{
 const a=pinHash('654321'),b=pinHash('654321');assert.notEqual(a.salt,b.salt);assert.ok(pinVerify('654321',a));assert.ok(!pinVerify('654322',a));assert.ok(!pinVerify('1'.repeat(1000),a));assert.throws(()=>pinHash('123'));
});
