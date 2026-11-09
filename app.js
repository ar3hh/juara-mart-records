const $=s=>document.querySelector(s);
function showTab(t){document.querySelectorAll('.tab').forEach(e=>e.hidden=e.id!=='tab-'+t);
 document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===t))}
async function dashboard(){
 const d=Calc.todayISO(),s=(await DB.get('dailySales',d))||{totalCents:0,qrCents:0};
 const po=(await DB.all('poPayments')).filter(p=>p.paymentDate===d&&p.method==='Cash').reduce((a,p)=>a+p.amountCents,0);
 const cash=Calc.cashOnHand(s.totalCents,s.qrCents,po),R=Calc.rm;
 $('#d-total').textContent=$('#c-t').textContent=R(s.totalCents);
 $('#d-qr').textContent=$('#c-q').textContent=R(s.qrCents);
 $('#c-p').textContent=R(po);$('#d-cash').textContent=$('#c-c').textContent=R(cash)}
async function backupStatus(){const s=await Backup.status(),e=$('#b-status');e.textContent=s.text;e.classList.toggle('warn',s.warn)}
function msg(t,ok){const m=$('#msg');m.textContent=t;m.className=ok?'ok':'err'}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('#b-save').onclick=async()=>{try{if(await Backup.save()){msg('Backup saved.',1);backupStatus()}}catch(e){msg('Backup failed: '+e.message)}};
$('#b-restore').onclick=()=>$('#b-file').click();
$('#b-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 try{if(await Backup.restore(f)){msg('Restore complete.',1);dashboard();backupStatus()}else msg('Restore cancelled. Nothing was changed.',1)}catch(x){msg(x.message)}};
function tick(){$('#date').textContent=Calc.longDate()}
tick();setInterval(tick,6e4);document.addEventListener('visibilitychange',()=>{tick();dashboard()});
dashboard().then(backupStatus).catch(()=>msg('Storage is unavailable. Private Browsing blocks saving.'));
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
