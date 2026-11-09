const $=s=>document.querySelector(s),R=Calc.rm,VERSION='Phase 2 · app version 3';
let sel=Calc.todayISO(),lastToday=sel,busy=false,base={t:'',q:'',n:''};
const dirty=()=>$('#f-total').value!==base.t||$('#f-qr').value!==base.q||$('#f-notes').value!==base.n;
const okLeave=()=>!dirty()||confirm('You have unsaved changes to this sales entry.\n\nOK = discard the changes and continue\nCancel = stay and keep editing');
const parts=(iso,o)=>{const[y,m,d]=iso.split('-').map(Number);return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',...o}).formatToParts(new Date(Date.UTC(y,m-1,d))).map(x=>[x.type,x.value]))};
const longOf=iso=>{const p=parts(iso,{weekday:'long',day:'numeric',month:'long',year:'numeric'});return `${p.weekday}, ${p.day} ${p.month} ${p.year}`};
const shortOf=iso=>{const p=parts(iso,{weekday:'short',day:'numeric',month:'short',year:'numeric'});return `${p.weekday}, ${p.day} ${p.month} ${p.year}`};
const shift=(iso,n)=>{const[y,m,d]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10)};
function toast(t,ok=true){const e=$('#toast');e.textContent=t;e.className='show '+(ok?'':'err');clearTimeout(toast.t);toast.t=setTimeout(()=>e.className='',3500)}
const cashPoOn=(pays,d)=>pays.filter(p=>p.paymentDate===d&&p.method==='Cash').reduce((a,p)=>a+p.amountCents,0);
async function render(keep){
 const all=await DB.all('dailySales'),pays=await DB.all('poPayments'),s=all.find(r=>r.date===sel);
 const t=s?s.totalCents:0,q=s?s.qrCents:0,po=cashPoOn(pays,sel),cash=Calc.cashOnHand(t,q,po);
 $('#date').textContent=longOf(sel);$('#pick').value=sel;$('#today').hidden=sel!==Calc.todayISO();
 $('#d-total').textContent=$('#c-t').textContent=R(t);$('#d-qr').textContent=$('#c-q').textContent=R(q);
 $('#c-cs').textContent=R(Calc.cashSales(t,q));$('#d-po').textContent=$('#c-p').textContent=R(po);
 $('#d-cash').textContent=$('#c-c').textContent=R(cash);
 $('#d-cash').classList.toggle('neg',cash<0);$('#d-warn').hidden=cash>=0;$('#d-empty').hidden=!!s;
 if(!(keep&&dirty())){$('#f-total').value=s?(t/100).toFixed(2):'';$('#f-qr').value=s?(q/100).toFixed(2):'';$('#f-notes').value=s?s.notes||'':'';
  base={t:$('#f-total').value,q:$('#f-qr').value,n:$('#f-notes').value}}
 $('#f-title').textContent=s?'Edit sales':'Add sales';$('#f-save').textContent=s?'Update sales':'Save sales';$('#f-del').hidden=!s;
 const h=$('#hist');h.textContent='';
 if(!all.length){const p=document.createElement('p');p.className='note';p.textContent='No sales saved yet. Add your first day above.';h.append(p)}
 all.sort((a,b)=>b.date.localeCompare(a.date)).forEach(r=>{const b=document.createElement('button');b.className='hrow'+(r.date===sel?' on':'');
  const c=Calc.cashOnHand(r.totalCents,r.qrCents,cashPoOn(pays,r.date));
  b.innerHTML='<span></span><b></b><small></small><small></small>';const[a,tt,l,cc]=b.children;
  a.textContent=shortOf(r.date);tt.textContent=R(r.totalCents);l.textContent=r.notes||'';cc.textContent='Cash On Hand '+R(c);cc.style.textAlign='right';
  b.onclick=()=>go(r.date,1);h.append(b)})}
function go(d,top){if(d===sel)return;if(!okLeave()){$('#pick').value=sel;return}sel=d;render();if(top)scrollTo({top:0,behavior:'smooth'})}
async function save(){
 if(busy)return;const ts=$('#f-total').value.trim(),qs=$('#f-qr').value.trim();
 const t=Calc.toCents(ts),q=qs===''?0:Calc.toCents(qs);
 if(t===null)return toast('Enter Total Sales as a number, for example 366.90.',0);
 if(q===null)return toast('QR Payment must be a number, or leave it empty.',0);
 if(q>t)return toast('QR Payment cannot be more than Total Sales. Nothing was saved.',0);
 busy=true;$('#f-save').disabled=true;
 try{const old=await DB.get('dailySales',sel),now=new Date().toISOString();
  await DB.put('dailySales',{...old,date:sel,totalCents:t,qrCents:q,notes:$('#f-notes').value.trim(),createdAt:old?.createdAt||now,updatedAt:now});
  toast((old?'Updated: ':'Saved: ')+longOf(sel));await render();backupStatus()}
 catch(e){toast('Could not save: '+e.message,0)}finally{busy=false;$('#f-save').disabled=false}}
async function del(){
 if(!confirm(`Delete the sales record for ${longOf(sel)}?\n\nThis cannot be undone. Save a backup first if you are unsure.`))return;
 try{await DB.del('dailySales',sel);toast('Record deleted.');render()}catch(e){toast('Could not delete: '+e.message,0)}}
function showTab(t){document.querySelectorAll('.tab').forEach(e=>e.hidden=e.id!=='tab-'+t);
 document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===t))}
async function backupStatus(){const s=await Backup.status(),e=$('#b-status');e.textContent=s.text;e.classList.toggle('warn',s.warn)}
function msg(t,ok){const m=$('#msg');m.textContent=t;m.className=ok?'ok':'err'}
document.querySelectorAll('nav button').forEach(b=>b.onclick=async()=>{const leaving=!$('#tab-sales').hidden&&b.dataset.tab!=='sales';
 if(leaving){const d=dirty();if(!okLeave())return;if(d)await render()}showTab(b.dataset.tab)});
addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue=''}});
$('#prev').onclick=()=>go(shift(sel,-1));$('#next').onclick=()=>go(shift(sel,1));
$('#pick').onchange=e=>e.target.value&&go(e.target.value);
$('#f-save').onclick=save;$('#f-del').onclick=del;
$('#b-save').onclick=async()=>{try{if(await Backup.save()){msg('Backup saved.',1);backupStatus()}}catch(e){msg('Backup failed: '+e.message)}};
$('#b-restore').onclick=()=>$('#b-file').click();
$('#b-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!okLeave())return;
 try{if(await Backup.restore(f)){msg('Restore complete.',1);render();backupStatus()}else msg('Restore cancelled. Nothing was changed.',1)}catch(x){msg(x.message)}};
document.addEventListener('visibilitychange',()=>{const n=Calc.todayISO();if(n!==lastToday){if(sel===lastToday&&!dirty())sel=n;lastToday=n}render(1)});
$('#ver').textContent=VERSION;
render().then(backupStatus).catch(()=>toast('Storage is unavailable. Private Browsing blocks saving.',0));
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
