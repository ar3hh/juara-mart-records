// IndexedDB with numbered migrations. To change the database later: raise VERSION and
// add a new MIGRATIONS entry that ADDS or converts data. Never delete existing data.
const DB=(()=>{
 const NAME='juara-mart',VERSION=1,STORES=['dailySales','purchaseOrders','poPayments','settings'];
 const MIGRATIONS={
  1(db){db.createObjectStore('dailySales',{keyPath:'date'});
   db.createObjectStore('purchaseOrders',{keyPath:'id',autoIncrement:true});
   db.createObjectStore('poPayments',{keyPath:'id',autoIncrement:true});
   db.createObjectStore('settings',{keyPath:'key'})}
 };
 let p;
 const open=()=>p||(p=new Promise((ok,no)=>{const r=indexedDB.open(NAME,VERSION);
  r.onupgradeneeded=e=>{for(let v=e.oldVersion+1;v<=VERSION;v++)MIGRATIONS[v](r.result,r.transaction)};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}));
 const tx=(s,mode,fn)=>open().then(db=>new Promise((ok,no)=>{const t=db.transaction(s,mode);let out;
  fn(t,v=>out=v);t.oncomplete=()=>ok(out);t.onerror=t.onabort=()=>no(t.error)}));
 return{VERSION,STORES,
  all:s=>tx(s,'readonly',(t,set)=>{const r=t.objectStore(s).getAll();r.onsuccess=()=>set(r.result)}),
  get:(s,k)=>tx(s,'readonly',(t,set)=>{const r=t.objectStore(s).get(k);r.onsuccess=()=>set(r.result)}),
  put:(s,v)=>tx(s,'readwrite',t=>t.objectStore(s).put(v)),
  del:(s,k)=>tx(s,'readwrite',t=>t.objectStore(s).delete(k)),
  // All-or-nothing: if anything fails, the old data stays untouched.
  replaceAll:d=>tx(STORES,'readwrite',t=>STORES.forEach(s=>{const o=t.objectStore(s);o.clear();(d[s]||[]).forEach(v=>o.put(v))}))}
})();
