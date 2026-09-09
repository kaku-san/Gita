import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAssetServer} from '../worker/asset-server.js';
const data=new TextEncoder().encode('0123456789'),sha=createHash('sha256').update(data).digest('hex');
const release={id:'test-release',files:{'/index.html':{sha256:sha,bytes:10,type:'text/html'},'/audio/en/test.mp3':{sha256:sha,bytes:10,type:'audio/mpeg'}}};
const objects=new Map(),prefix='geeta/test-release/objects/';let fallback;
const bucket={
 async head(key){const o=objects.get(key);return o?{key,size:o.data.length,customMetadata:o.customMetadata}:null;},
 async get(key,options){const o=objects.get(key);if(!o)return null;const r=options?.range;return {body:r?o.data.slice(r.offset,r.offset+r.length):o.data};},
 async put(key,value,options={}){const bytes=typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value);objects.set(key,{data:bytes,customMetadata:options.customMetadata});return {key,size:bytes.length};},
 async list(){return {objects:await Promise.all([...objects.keys()].filter(k=>k.startsWith(prefix)).map(k=>this.head(k))),truncated:false};}
};
const env={BUCKET:bucket,GEETA_PUBLISH_TOKEN:'test-token',ASSETS:{async fetch(request){fallback=new URL(request.url).pathname;return new Response('previous site');}}};
const api=createAssetServer(release);
const call=(path,method='GET',headers={},body)=>api.fetch(new Request('https://example.test'+path,{method,headers,body}),env);
assert.equal(await (await call('/')).text(),'previous site');assert.equal(fallback,'/_previous/index.html');
assert.equal((await call('/_publish/status')).status,401);
const auth={'x-geeta-publish-token':'test-token'};
assert.equal((await call('/_publish/activate','POST',auth)).status,409);
assert.equal((await call('/_publish/objects/'+sha,'PUT',{...auth,'content-length':'3'},'bad')).status,400);
assert.equal((await call('/_publish/objects/'+sha,'PUT',{...auth,'content-length':'10'},'bad-badbad')).status,422);
assert.equal((await call('/_publish/objects/'+sha,'PUT',{...auth,'content-length':'10'},data)).status,200);
assert.equal((await (await call('/_publish/objects/'+sha,'PUT',{...auth,'content-length':'10'},data)).json()).reused,true);
assert.equal((await (await call('/_publish/status','GET',auth)).json()).missing.length,0);
assert.equal((await call('/_publish/activate','POST',auth)).status,200);
assert.equal(await (await call('/')).text(),'0123456789');
let r=await call('/audio/en/test.mp3','GET',{range:'bytes=2-5'});assert.equal(r.status,206);assert.equal(await r.text(),'2345');assert.equal(r.headers.get('content-range'),'bytes 2-5/10');
r=await call('/audio/en/test.mp3','GET',{range:'bytes=-3'});assert.equal(await r.text(),'789');
assert.equal((await call('/audio/en/test.mp3','GET',{range:'bytes=20-'})).status,416);
assert.equal((await call('/audio/en/test.mp3','GET',{range:'bytes=0-1,4-5'})).status,416);
r=await call('/audio/en/test.mp3','HEAD');assert.equal(r.headers.get('content-length'),'10');assert.equal(await r.text(),'');
assert.equal((await call('/audio/en/test.mp3','GET',{'if-none-match':'"'+sha+'"'})).status,304);
r=await call('/audio/en/test.mp3','GET',{range:'bytes=2-5','if-range':'"old"'});assert.equal(r.status,200);assert.equal(await r.text(),'0123456789');
assert.equal((await call('/.env')).status,404);assert.equal((await call('/unknown')).status,404);
const another=createAssetServer(release);assert.equal(await (await another.fetch(new Request('https://example.test/'),env)).text(),'0123456789');
console.log(JSON.stringify({passed:true,checks:['previous site preserved before activation','authenticated fixed-object uploads','checksum and size validation','idempotent upload','incomplete release blocked','atomic activation','range and suffix seeking','HEAD and conditional cache requests','new worker sees activated release','unknown/private files denied']},null,2));
