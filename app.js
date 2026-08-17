const KEY='gets_rfi_records_v1';
const USER_KEY='gets_rfi_users_v1';
const DRIVE_KEY='gets_rfi_drive_settings_v1';
const CURRENT_USER_KEY='gets_rfi_current_user_v1';
const statuses=['Draft','Open','Pending Response','Answered','Closed','Cancelled'];
const disciplines=['Architecture','Interior','Structure','MEP','QS','Landscape','Signage','Operator','Client / Owner','Contractor','Other'];
const phases=['Concept','Schematic Design','Design Development','Detailed Design / DED','Tender','Construction','Post-Construction'];
const priorities=['Normal','High','Critical'];
const impacts=['Design','Schedule','Cost','Scope','Quality','Coordination','Design + Schedule','Design + Cost','Schedule + Cost','No Impact Identified'];
let records=loadJSON(KEY,[]), users=loadJSON(USER_KEY,[]), currentDetailId=null;
function currentUser(){const id=localStorage.getItem(CURRENT_USER_KEY);return users.find(u=>u.id===id)||users.find(u=>u.role==='Administrator')||users[0]||null}
function isAdmin(){return currentUser()?.role==='Administrator'}
const $=id=>document.getElementById(id);
function loadJSON(k,fallback){try{return JSON.parse(localStorage.getItem(k))||fallback}catch{return fallback}}
function saveRecords(){localStorage.setItem(KEY,JSON.stringify(records))}
function saveUsers(){localStorage.setItem(USER_KEY,JSON.stringify(users))}
function esc(s=''){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function dateISO(){return new Date().toISOString().slice(0,10)}
function daysLate(due,status){if(!due||['Closed','Cancelled'].includes(status))return 0;return Math.max(0,Math.floor((new Date(dateISO()+'T00:00:00')-new Date(due+'T00:00:00'))/86400000))}
function optionize(id,arr,blank){$(id).innerHTML=(blank?`<option value="">${blank}</option>`:'')+arr.map(v=>`<option>${v}</option>`).join('')}
function safeFileName(s){return String(s||'RFI').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,130)}

function init(){
 optionize('status',statuses);optionize('discipline',disciplines);optionize('projectPhase',phases);optionize('priority',priorities);optionize('impact',impacts);
 optionize('statusFilter',statuses,'All Status');optionize('disciplineFilter',disciplines,'All Discipline');optionize('phaseFilter',phases,'All Phase');
 $('dateRaised').value=dateISO();$('status').value='Open';$('priority').value='Normal';
 if(!users.length){users=[{id:crypto.randomUUID(),name:'Administrator',username:'admin',role:'Administrator',discipline:'All',status:'Active'}];saveUsers()}
 if(!localStorage.getItem(CURRENT_USER_KEY)&&users[0])localStorage.setItem(CURRENT_USER_KEY,users[0].id);
 loadDriveSettings();bind();render();renderUsers();
}
function bind(){
 document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>showView(b.dataset.view));
 $('newRfiTop').onclick=newForm;$('cancelForm').onclick=()=>showView('register');
 $('rfiForm').onsubmit=e=>{e.preventDefault();upsert(false)};$('saveDraftBtn').onclick=()=>upsert(true);
 ['searchInput','statusFilter','disciplineFilter','phaseFilter'].forEach(id=>$(id).addEventListener(id==='searchInput'?'input':'change',render));
 $('closeModal').onclick=()=>$('detailModal').classList.add('hidden');$('printBtn').onclick=()=>window.print();$('pdfBtn').onclick=generatePDF;
 $('editBtn').onclick=()=>{const r=records.find(x=>x.id===currentDetailId);if(r){$('detailModal').classList.add('hidden');editForm(r)}};$('exportBtn').onclick=exportCSV;
 $('moduleRegister').onclick=()=>showView('register');$('moduleManual').onclick=()=>showView('manual');$('moduleRefresh').onclick=refreshApp;$('moduleUsers').onclick=()=>showView('users');$('moduleDrive').onclick=()=>showView('drive');
 $('addUserBtn').onclick=()=>openUserForm();$('closeUserModal').onclick=closeUserForm;$('cancelUser').onclick=closeUserForm;$('userForm').onsubmit=saveUser;
 $('saveDriveBtn').onclick=saveDriveSettings;
 $('backupDriveBtn').onclick=backupToDrive;$('downloadBackupBtn').onclick=downloadBackup;$('importBackupInput').onchange=importBackup;
}
function showView(name){
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));$(name+'View').classList.add('active-view');
 document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));
 const map={register:'moduleRegister',manual:'moduleManual',users:'moduleUsers',drive:'moduleDrive'};document.querySelectorAll('.module-btn').forEach(b=>b.classList.remove('active'));if(map[name])$(map[name]).classList.add('active');
}
function refreshApp(){records=loadJSON(KEY,[]);users=loadJSON(USER_KEY,[]);loadDriveSettings();render();renderUsers();showView('register');toast('Data refreshed')}
function newForm(){$('rfiForm').reset();$('recordId').value='';$('dateRaised').value=dateISO();$('status').value='Open';$('priority').value='Normal';$('formTitle').textContent='New RFI';showView('form')}
function nextNo(code){const c=(code||'PRJ').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);const nums=records.filter(r=>r.projectCode===c).map(r=>Number((r.rfiNo||'').match(/(\d+)$/)?.[1]||0));return `GETS-${c}-RFI-${(Math.max(0,...nums)+1).toString().padStart(3,'0')}`}
function val(id){return $(id).value.trim()}
function upsert(asDraft){
 const id=val('recordId')||crypto.randomUUID(),projectCode=val('projectCode').toUpperCase();
 const data={id,projectName:val('projectName'),projectCode,rfiNo:val('rfiNo')||nextNo(projectCode),dateRaised:val('dateRaised'),raisedBy:val('raisedBy'),assignedTo:val('assignedTo'),discipline:val('discipline'),projectPhase:val('projectPhase'),dueDate:val('dueDate'),priority:val('priority'),status:asDraft?'Draft':val('status'),companyParty:val('companyParty'),subject:val('subject'),background:val('background'),question:val('question'),reference:val('reference'),recommendation:val('recommendation'),impact:val('impact'),impactRemarks:val('impactRemarks'),response:val('response'),respondedBy:val('respondedBy'),responseDate:val('responseDate'),responseParty:val('responseParty'),requiredAction:val('requiredAction'),relatedTask:val('relatedTask'),relatedDrawing:val('relatedDrawing'),attachmentRef:val('attachmentRef'),closedBy:val('closedBy'),closedDate:val('closedDate'),updatedAt:new Date().toISOString()};
 if(!asDraft&&(!data.projectName||!data.projectCode||!data.dateRaised||!data.raisedBy||!data.assignedTo||!data.discipline||!data.projectPhase||!data.subject||!data.background||!data.question)){alert('Please complete all required fields.');return}
 const i=records.findIndex(r=>r.id===id);if(i>=0)records[i]=data;else records.unshift(data);saveRecords();render();showView('register');toast(asDraft?'Draft saved':'RFI saved');autoBackup('save')
}
function render(){
 const q=$('searchInput').value.toLowerCase(),sf=$('statusFilter').value,df=$('disciplineFilter').value,pf=$('phaseFilter').value;
 const filtered=records.filter(r=>(!sf||r.status===sf)&&(!df||r.discipline===df)&&(!pf||r.projectPhase===pf)&&(!q||[r.rfiNo,r.subject,r.assignedTo,r.raisedBy,r.projectName].some(v=>(v||'').toLowerCase().includes(q))));
 $('statTotal').textContent=records.length;$('statOpen').textContent=records.filter(r=>['Open','Pending Response','Answered'].includes(r.status)).length;$('statOverdue').textContent=records.filter(r=>daysLate(r.dueDate,r.status)>0).length;$('statClosed').textContent=records.filter(r=>r.status==='Closed').length;
 $('emptyState').style.display=filtered.length?'none':'block';
 $('rfiTableBody').innerHTML=filtered.map(r=>{const late=daysLate(r.dueDate,r.status);return `<tr><td><button class="link-btn" onclick="openDetail('${r.id}')">${esc(r.rfiNo)}</button></td><td>${esc(r.dateRaised)}</td><td><b>${esc(r.subject)}</b><br><span class="muted">${esc(r.projectName)}</span></td><td>${esc(r.discipline)}</td><td>${esc(r.assignedTo)}</td><td class="${late?'overdue-text':''}">${esc(r.dueDate||'—')}${late?`<br>${late} day(s) overdue`:''}</td><td><span class="impact-pill">${esc(r.impact||'—')}</span></td><td><span class="status-pill ${late?'status-overdue':''}">${esc(r.status)}</span></td><td><div class="row-actions"><button class="btn" onclick="openDetail('${r.id}')">View</button>${isAdmin()?`<button class="btn btn-danger" onclick="deleteRFI('${r.id}')">Delete</button>`:''}</div></td></tr>`}).join('');
}
window.openDetail=function(id){
 const r=records.find(x=>x.id===id);if(!r)return;currentDetailId=id;$('detailTitle').textContent=`${r.rfiNo} — ${r.subject}`;
 const txt=v=>esc(v||''),show=v=>txt(v)||'&nbsp;';
 const field=(label,value,cls='')=>`<div class="pdf-label ${cls}">${label}</div><div class="pdf-value ${cls}">${show(value)}</div>`;
 const big=(label,value,cls='')=>`<div class="pdf-big ${cls}"><div class="pdf-big-label">${label}</div><div class="pdf-big-value">${show(value)}</div></div>`;
 const section=t=>`<div class="pdf-section-title">${t}</div>`;const statusText=r.status||'';
 $('detailContent').innerHTML=`<div class="rfi-pdf" id="rfiPdf">
 <section class="pdf-page pdf-page-1"><div class="pdf-logo-wrap"><img class="pdf-logo" src="gets-logo.png" alt="GeTs Architects logo"></div><div class="pdf-title-rule"></div><div class="pdf-main-title">REQUEST FOR INFORMATION</div>
 ${section('A. GENERAL INFORMATION')}<div class="pdf-grid general-grid">${field('Project Name',r.projectName)}${field('RFI No.',r.rfiNo)}${field('Date Raised',r.dateRaised)}${field('Required Response',r.dueDate)}${field('Raised By',r.raisedBy)}${field('Assigned To',r.assignedTo)}${field('Discipline',r.discipline)}${field('Project Phase',r.projectPhase)}${field('Priority',r.priority)}${field('Status',statusText)}</div>
 ${section('B. RFI SUBJECT')}${big('Subject / Title:',r.subject,'subject-box')}${section('C. DESCRIPTION / INFORMATION REQUIRED')}${big('Background / Issue',r.background,'desc-box')}${big('Question / Clarification Required',r.question,'desc-box')}${big('Reference Documents / Drawings / Location',r.reference,'reference-box')}${section('D. PROPOSED RECOMMENDATION')}${big('Proposed Solution / Recommendation (Optional)',r.recommendation,'recommendation-box')}${section('E. POTENTIAL IMPACT')}<div class="pdf-grid impact-grid">${field('Impact Category',r.impact)}${field('Potential Impact / Remarks',r.impactRemarks)}</div><div class="pdf-footer">GeTs Architects&nbsp;&nbsp;|&nbsp;&nbsp;Request for Information (RFI)</div></section>
 <section class="pdf-page pdf-page-2"><div class="pdf-logo-wrap"><img class="pdf-logo" src="gets-logo.png" alt="GeTs Architects logo"></div>${section('F. RESPONSE / DECISION')}<div class="response-table">${big('Response / Decision',r.response,'response-box')}<div class="pdf-grid single-grid">${field('Responded By',r.respondedBy)}</div><div class="pdf-grid single-grid">${field('Company / Discipline',r.responseParty)}</div><div class="pdf-grid single-grid">${field('Response Date',r.responseDate)}</div></div>${section('G. REQUIRED ACTION / CLOSURE')}${big('Instruction / Required Action',r.requiredAction,'action-box')}<div class="pdf-grid single-grid">${field('Related Task / Milestone',r.relatedTask)}</div><div class="pdf-grid single-grid">${field('Related Drawing / Revision',r.relatedDrawing)}</div><div class="pdf-grid single-grid">${field('Closed By / Closed Date',[r.closedBy,r.closedDate].filter(Boolean).join(' / '))}</div><div class="pdf-grid single-grid">${field('Final Status',statusText)}</div>${section('H. ATTACHMENTS')}<div class="pdf-grid single-grid">${field('Attachment(s)',r.attachmentRef)}</div><div class="pdf-grid single-grid">${field('File Reference',r.attachmentRef)}</div><div class="control-note"><b>CONTROL NOTE</b><br>RFI shall be used for formal clarification or decisions that may affect design, scope, cost, schedule, quality, or interdisciplinary coordination. An RFI is considered closed only after the required response and follow-up action have been completed.</div><div class="pdf-footer">GeTs Architects&nbsp;&nbsp;|&nbsp;&nbsp;Request for Information (RFI)</div></section></div>`;
 $('deleteBtn').style.display=isAdmin()?'inline-flex':'none';
 $('detailModal').classList.remove('hidden');
}
window.deleteRFI=function(id){if(!isAdmin()){alert('Only Administrator can delete RFI.');return}const r=records.find(x=>x.id===id);if(!r)return;if(!confirm(`Delete ${r.rfiNo} — ${r.subject}?\n\nThis action cannot be undone.`))return;records=records.filter(x=>x.id!==id);saveRecords();if(currentDetailId===id){currentDetailId=null;$('detailModal').classList.add('hidden')}render();toast('RFI deleted');autoBackup('delete')}
function editForm(r){Object.keys(r).forEach(k=>{const el=$(k);if(el)el.value=r[k]??''});$('formTitle').textContent='Edit RFI';showView('form')}
function exportCSV(){const cols=['rfiNo','projectName','dateRaised','subject','discipline','projectPhase','raisedBy','assignedTo','dueDate','priority','impact','status','responseDate','relatedTask','relatedDrawing'];const rows=records.map(r=>cols.map(c=>`"${String(r[c]||'').replace(/"/g,'""')}"`).join(','));const blob=new Blob([[cols.join(','),...rows].join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='GeTs_RFI_Register.csv';a.click();URL.revokeObjectURL(a.href)}
async function generatePDF(){
 const r=records.find(x=>x.id===currentDetailId),el=$('rfiPdf');if(!r||!el)return;
 if(typeof html2pdf==='undefined'){alert('PDF generator belum termuat. Gunakan Print / Save PDF atau cek koneksi internet.');window.print();return}
 const settings=loadJSON(DRIVE_KEY,{});let pattern=settings.pdfPattern||'[RFI No.]_[Subject].pdf';let filename=pattern.replaceAll('[RFI No.]',r.rfiNo||'RFI').replaceAll('[Subject]',r.subject||'').replaceAll('[Project Code]',r.projectCode||'');filename=safeFileName(filename.replace(/\.pdf$/i,''))+'.pdf';
 const btn=$('pdfBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='Generating...';
 try{await html2pdf().set({margin:0,filename,image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(el).save()}catch(e){console.error(e);alert('Generate PDF gagal. Gunakan Print / Save PDF sebagai fallback.')}finally{btn.disabled=false;btn.textContent=old}
}
function renderUsers(){$('userTableBody').innerHTML=users.map(u=>`<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.username)}</td><td>${esc(u.role)}</td><td>${esc(u.discipline||'—')}</td><td><span class="status-pill">${esc(u.status)}</span></td><td><div class="row-actions"><button class="btn" onclick="editUser('${u.id}')">Edit</button>${isAdmin()&&u.id!==currentUser()?.id?`<button class="btn btn-danger" onclick="deleteUser('${u.id}')">Delete</button>`:''}</div></td></tr>`).join('')}
function openUserForm(u=null){$('userForm').reset();$('userId').value=u?.id||'';$('userName').value=u?.name||'';$('userUsername').value=u?.username||'';$('userRole').value=u?.role||'Architect';$('userDiscipline').value=u?.discipline||'';$('userStatus').value=u?.status||'Active';$('userModalTitle').textContent=u?'Edit User':'Add User';$('userModal').classList.remove('hidden')}
function closeUserForm(){$('userModal').classList.add('hidden')}
window.editUser=function(id){openUserForm(users.find(u=>u.id===id))}
window.deleteUser=function(id){if(!isAdmin()){alert('Only Administrator can delete users.');return}const u=users.find(x=>x.id===id);if(!u)return;if(u.id===currentUser()?.id){alert('Active Administrator cannot delete their own account.');return}if(!confirm(`Delete user ${u.name} (${u.username})?`))return;users=users.filter(x=>x.id!==id);saveUsers();renderUsers();toast('User deleted');autoBackup('delete-user')}
function saveUser(e){e.preventDefault();const id=val('userId')||crypto.randomUUID();const u={id,name:val('userName'),username:val('userUsername'),role:val('userRole'),discipline:val('userDiscipline'),status:val('userStatus')};const i=users.findIndex(x=>x.id===id);if(i>=0)users[i]=u;else users.push(u);saveUsers();renderUsers();closeUserForm();toast('User saved')}
function loadDriveSettings(){const s=loadJSON(DRIVE_KEY,{driveRoot:'',drivePattern:'[Project Code]/RFI/[RFI No.]',pdfPattern:'[RFI No.]_[Subject].pdf',appsScriptUrl:'',backupFile:'GeTs_RFI_Backup.json',autoBackup:false});$('driveRoot').value=s.driveRoot||'';$('drivePattern').value=s.drivePattern||'[Project Code]/RFI/[RFI No.]';$('pdfPattern').value=s.pdfPattern||'[RFI No.]_[Subject].pdf';$('appsScriptUrl').value=s.appsScriptUrl||'';$('backupFile').value=s.backupFile||'GeTs_RFI_Backup.json';$('autoBackup').checked=!!s.autoBackup}
function saveDriveSettings(){localStorage.setItem(DRIVE_KEY,JSON.stringify({driveRoot:val('driveRoot'),drivePattern:val('drivePattern'),pdfPattern:val('pdfPattern'),appsScriptUrl:val('appsScriptUrl'),backupFile:val('backupFile')||'GeTs_RFI_Backup.json',autoBackup:$('autoBackup').checked}));toast('Drive settings saved')}
function backupPayload(reason='manual'){return {app:'GeTs RFI Control',version:'v4',reason,backupAt:new Date().toISOString(),records,users,driveSettings:loadJSON(DRIVE_KEY,{})}}
function downloadBackup(){const payload=backupPayload('download');const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`GeTs_RFI_Backup_${dateISO()}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup JSON downloaded')}
async function importBackup(e){const file=e.target.files?.[0];if(!file)return;if(!isAdmin()){alert('Only Administrator can restore backup.');e.target.value='';return}try{const data=JSON.parse(await file.text());if(!Array.isArray(data.records)||!Array.isArray(data.users))throw new Error('Invalid backup');if(!confirm(`Restore backup from ${data.backupAt||file.name}? Current local data will be replaced.`))return;records=data.records;users=data.users;saveRecords();saveUsers();render();renderUsers();toast('Backup restored')}catch(err){console.error(err);alert('Backup file is invalid.')}finally{e.target.value=''}}
async function backupToDrive(reason='manual'){const s=loadJSON(DRIVE_KEY,{});if(!s.appsScriptUrl){alert('Isi Apps Script Web App URL terlebih dahulu pada Drive Settings.');return false}const payload=backupPayload(reason);payload.folderUrl=s.driveRoot||'';payload.fileName=s.backupFile||'GeTs_RFI_Backup.json';const btn=$('backupDriveBtn'),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Backing up...'}try{await fetch(s.appsScriptUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});localStorage.setItem('gets_rfi_last_backup',new Date().toISOString());$('lastBackup').textContent=new Date().toLocaleString();toast('Backup request sent to Google Drive');return true}catch(err){console.error(err);alert('Backup to Drive gagal. Periksa Apps Script URL / deployment.');return false}finally{if(btn){btn.disabled=false;btn.textContent=old}}}
function autoBackup(reason){const s=loadJSON(DRIVE_KEY,{});if(s.autoBackup&&s.appsScriptUrl)backupToDrive(reason)}
const lb=localStorage.getItem('gets_rfi_last_backup');if(lb&&$('lastBackup'))$('lastBackup').textContent=new Date(lb).toLocaleString();
function toast(message){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
init();
