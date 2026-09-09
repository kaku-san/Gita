/** Immutable media release. The previous site stays available until every object is verified. */
export function createAssetServer(release){
 const prefix=`geeta/${release.id}/`,readyKey=prefix+'ready',expected=new Map(Object.values(release.files).map(f=>[f.sha256,f]));
 let active=false;
 const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
 const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
 async function authorized(request,env){
  const token=request.headers.get('x-geeta-publish-token');
  if(!token||!env.GEETA_PUBLISH_TOKEN)return false;
  const encode=new TextEncoder();return await digest(encode.encode(token))===await digest(encode.encode(env.GEETA_PUBLISH_TOKEN));
 }
 async function inventory(bucket){
  const found=new Map();let cursor;
  do{const page=await bucket.list({prefix:prefix+'objects/',limit:1000,cursor,include:['customMetadata']});
   for(const object of page.objects)found.set(object.key.slice((prefix+'objects/').length),object);
   cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  return found;
 }
 async function admin(request,env,path){
  if(!await authorized(request,env))return json({error:'Unauthorized'},401);
  if(!env.BUCKET)return json({error:'Storage unavailable'},503);
  if(path==='/_publish/status'&&request.method==='GET'){
   const found=await inventory(env.BUCKET),missing=[...expected].filter(([sha,f])=>found.get(sha)?.size!==f.bytes||found.get(sha)?.customMetadata?.sha256!==sha).map(([sha])=>sha);
   return json({release:release.id,files:Object.keys(release.files).length,objects:expected.size,missing,active:!!await env.BUCKET.head(readyKey)});
  }
  if(path==='/_publish/activate'&&request.method==='POST'){
   const found=await inventory(env.BUCKET);
   const missing=[...expected].filter(([sha,f])=>found.get(sha)?.size!==f.bytes||found.get(sha)?.customMetadata?.sha256!==sha);
   if(missing.length)return json({error:'Release incomplete',missing:missing.length},409);
   await env.BUCKET.put(readyKey,JSON.stringify({release:release.id,files:Object.keys(release.files).length,activated:new Date().toISOString()}),{httpMetadata:{contentType:'application/json'}});
   active=true;return json({release:release.id,active:true,files:Object.keys(release.files).length});
  }
  const sha=path.slice('/_publish/objects/'.length),file=expected.get(sha);
  if(!path.startsWith('/_publish/objects/')||!file)return json({error:'Unknown object'},404);
  if(request.method!=='PUT')return json({error:'Method not allowed'},405);
  if(Number(request.headers.get('content-length'))!==file.bytes)return json({error:'Incorrect size'},400);
  const existing=await env.BUCKET.head(prefix+'objects/'+sha);
  if(existing?.size===file.bytes&&existing.customMetadata?.sha256===sha)return json({sha256:sha,reused:true});
  const data=await request.arrayBuffer();
  if(data.byteLength!==file.bytes||await digest(data)!==sha)return json({error:'Incorrect checksum'},422);
  await env.BUCKET.put(prefix+'objects/'+sha,data,{sha256:sha,httpMetadata:{contentType:file.type},customMetadata:{sha256:sha}});
  return json({sha256:sha,stored:true});
 }
 function rangeFor(header,size){
  if(!header)return null;
  const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||!match[1]&&!match[2])return false;
  let start,end;
  if(!match[1]){const count=Number(match[2]);if(!Number.isSafeInteger(count)||count<1)return false;start=Math.max(0,size-count);end=size-1;}
  else{start=Number(match[1]);end=match[2]?Math.min(size-1,Number(match[2])):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return false;
  return {offset:start,length:end-start+1};
 }
 async function fetch(request,env){
  try{
   const url=new URL(request.url),path=url.pathname;
   if(path.startsWith('/_publish/'))return await admin(request,env,path);
   if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
   if(!active&&env.BUCKET)active=!!await env.BUCKET.head(readyKey);
   if(!active){
    if(!env.ASSETS)return new Response('The site is updating. Please try again shortly.',{status:503,headers:{'retry-after':'10','cache-control':'no-store'}});
    const old=new URL(url);old.pathname='/_previous'+(path==='/'?'/index.html':path);
    return env.ASSETS.fetch(new Request(old,request));
   }
   const file=release.files[path==='/'?'/index.html':path];
   if(!file)return new Response('Not found',{status:404});
   const etag='"'+file.sha256+'"',headers=new Headers({'content-type':file.type,'etag':etag,'accept-ranges':'bytes','cache-control':'private, max-age=0, must-revalidate','x-content-type-options':'nosniff','x-geeta-release':release.id});
   if(request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers});
   let range=null;
   if(request.method==='GET'&&(!request.headers.has('if-range')||request.headers.get('if-range')===etag))range=rangeFor(request.headers.get('range'),file.bytes);
   if(range===false){headers.set('content-range','bytes */'+file.bytes);return new Response(null,{status:416,headers});}
   headers.set('content-length',String(range?.length??file.bytes));
   if(range)headers.set('content-range',`bytes ${range.offset}-${range.offset+range.length-1}/${file.bytes}`);
   if(request.method==='HEAD')return new Response(null,{headers});
   const object=await env.BUCKET.get(prefix+'objects/'+file.sha256,range?{range}:undefined);
   if(!object?.body)return new Response('Media temporarily unavailable',{status:503,headers:{'retry-after':'5','cache-control':'no-store'}});
   return new Response(object.body,{status:range?206:200,headers});
  }catch(error){console.error('Geeta media request failed',error?.name||'Error');return new Response('The site is temporarily unavailable.',{status:503,headers:{'retry-after':'10','cache-control':'no-store'}});}
 }
 return {fetch};
}
