const V="kd-v7",META="kudukka-meta",F=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","icon.svg","apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==META).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
});

/* daily reminder for days with nothing noted (Android, installed app, best effort) */
const pad=n=>String(n).padStart(2,"0"),iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const addD=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return iso(d)};
const fd=s=>s.slice(8)+"-"+s.slice(5,7)+"-"+s.slice(0,4);
async function dailyCheck(){
  const c=await caches.open(META),r=await c.match("meta");if(!r)return;
  const m=await r.json(),t=iso(new Date()),n=await c.match("notified"),last=n?await n.text():"";
  if(last===t)return;
  const noted=new Set(m.noted||[]),from=m.start>addD(t,-7)?m.start:addD(t,-7),miss=[];
  for(let d=from;d<t;d=addD(d,1))if(!noted.has(d))miss.push(d);
  const late=new Date().getHours()>=20,todayOpen=m.start<=t&&!noted.has(t);
  let body="";
  if(miss.length)body=miss.length===1?`Nothing noted for ${fd(miss[0])}. Add it, or mark it as no spending.`:`${miss.length} days with nothing noted (${miss.slice(-3).map(fd).join(", ")}). Tap to catch up.`;
  else if(late&&todayOpen)body="Nothing noted today yet. Add today's spending, or mark it as no spending.";
  if(!body)return;
  await c.put("notified",new Response(t));
  await self.registration.showNotification("Kudukka",{body,icon:"icon-192.png",badge:"icon-192.png",tag:"kudukka-daily"});
}
self.addEventListener("periodicsync",e=>{if(e.tag==="kudukka-daily")e.waitUntil(dailyCheck())});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{
    for(const w of l)if("focus" in w)return w.focus();
    return clients.openWindow("./");
  }));
});
