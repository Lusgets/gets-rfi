const KEY='gets_rfi_records_v1';
const statuses=['Draft','Open','Pending Response','Answered','Closed','Cancelled'];
const disciplines=['Architecture','Interior','Structure','MEP','QS','Landscape','Signage','Operator','Client / Owner','Contractor','Other'];
const phases=['Concept','Schematic Design','Design Development','Detailed Design / DED','Tender','Construction','Post-Construction'];
const priorities=['Normal','High','Critical'];
const impacts=['Design','Schedule','Cost','Scope','Quality','Coordination','Design + Schedule','Design + Cost','Schedule + Cost','No Impact Identified'];
let records=load(); let currentDetailId=null;

const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(records))}
function esc(s=''){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function dateISO(){return new Date().toISOString().slice(0,10)}
function daysLate(due,status){if(!due||['Closed','Cancelled'].includes(status)) return 0; const a=new Date(due+'T00:00:00'),b=new Date(dateISO()+'T00:00:00'); return Math.max(0,Math.floor((b-a)/86400000));}
function optionize(id, arr, blank){$(id).innerHTML=(blank?`<option value="">${blank}</option>`:'')+arr.map(v=>`<option>${v}</option>`).join('')}

function init(){
 optionize('status',statuses); optionize('discipline',disciplines); optionize('projectPhase',phases); optionize('priority',priorities); optionize('impact',impacts);
 optionize('statusFilter',statuses,'All Status'); optionize('disciplineFilter',disciplines,'All Discipline'); optionize('phaseFilter',phases,'All Phase');
 $('dateRaised').value=dateISO(); $('status').value='Open'; $('priority').value='Normal';
 bind(); render();
}
function bind(){
 document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>showView(b.dataset.view));
 $('newRfiTop').onclick=()=>newForm(); $('cancelForm').onclick=()=>showView('register');
 $('rfiForm').onsubmit=e=>{e.preventDefault(); upsert(false)}; $('saveDraftBtn').onclick=()=>upsert(true);
 ['searchInput','statusFilter','disciplineFilter','phaseFilter'].forEach(id=>$(id).addEventListener(id==='searchInput'?'input':'change',render));
 $('closeModal').onclick=()=>$('detailModal').classList.add('hidden');
 $('printBtn').onclick=()=>window.print(); $('editBtn').onclick=()=>{const r=records.find(x=>x.id===currentDetailId); if(r){$('detailModal').classList.add('hidden'); editForm(r)}};
 $('exportBtn').onclick=exportCSV;
}
function showView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view')); $(name+'View').classList.add('active-view'); document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));}
function newForm(){ $('rfiForm').reset(); $('recordId').value=''; $('dateRaised').value=dateISO(); $('status').value='Open'; $('priority').value='Normal'; $('formTitle').textContent='New RFI'; showView('form');}
function nextNo(code){const c=(code||'PRJ').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8); const nums=records.filter(r=>r.projectCode===c).map(r=>Number((r.rfiNo||'').match(/(\d+)$/)?.[1]||0)); const n=(Math.max(0,...nums)+1).toString().padStart(3,'0'); return `GETS-${c}-RFI-${n}`}
function val(id){return $(id).value.trim()}
function upsert(asDraft){
 const id=val('recordId')||crypto.randomUUID(); const projectCode=val('projectCode').toUpperCase();
 const data={id,projectName:val('projectName'),projectCode,rfiNo:val('rfiNo')||nextNo(projectCode),dateRaised:val('dateRaised'),raisedBy:val('raisedBy'),assignedTo:val('assignedTo'),discipline:val('discipline'),projectPhase:val('projectPhase'),dueDate:val('dueDate'),priority:val('priority'),status:asDraft?'Draft':val('status'),companyParty:val('companyParty'),subject:val('subject'),background:val('background'),question:val('question'),reference:val('reference'),recommendation:val('recommendation'),impact:val('impact'),impactRemarks:val('impactRemarks'),response:val('response'),respondedBy:val('respondedBy'),responseDate:val('responseDate'),responseParty:val('responseParty'),requiredAction:val('requiredAction'),relatedTask:val('relatedTask'),relatedDrawing:val('relatedDrawing'),attachmentRef:val('attachmentRef'),closedBy:val('closedBy'),closedDate:val('closedDate'),updatedAt:new Date().toISOString()};
 if(!asDraft && (!data.projectName||!data.projectCode||!data.dateRaised||!data.raisedBy||!data.assignedTo||!data.discipline||!data.projectPhase||!data.subject||!data.background||!data.question)){alert('Please complete all required fields.');return}
 const i=records.findIndex(r=>r.id===id); if(i>=0) records[i]=data; else records.unshift(data); save(); render(); showView('register');
}
function render(){
 const q=$('searchInput').value.toLowerCase(),sf=$('statusFilter').value,df=$('disciplineFilter').value,pf=$('phaseFilter').value;
 const filtered=records.filter(r=>(!sf||r.status===sf)&&(!df||r.discipline===df)&&(!pf||r.projectPhase===pf)&&(!q||[r.rfiNo,r.subject,r.assignedTo,r.raisedBy,r.projectName].some(v=>(v||'').toLowerCase().includes(q))));
 $('statTotal').textContent=records.length; $('statOpen').textContent=records.filter(r=>['Open','Pending Response','Answered'].includes(r.status)).length; $('statOverdue').textContent=records.filter(r=>daysLate(r.dueDate,r.status)>0).length; $('statClosed').textContent=records.filter(r=>r.status==='Closed').length;
 $('emptyState').style.display=filtered.length?'none':'block';
 $('rfiTableBody').innerHTML=filtered.map(r=>{const late=daysLate(r.dueDate,r.status);return `<tr><td><button class="link-btn" onclick="openDetail('${r.id}')">${esc(r.rfiNo)}</button></td><td>${esc(r.dateRaised)}</td><td><b>${esc(r.subject)}</b><br><span class="muted">${esc(r.projectName)}</span></td><td>${esc(r.discipline)}</td><td>${esc(r.assignedTo)}</td><td class="${late?'overdue-text':''}">${esc(r.dueDate||'—')}${late?`<br>${late} day(s) overdue`:''}</td><td><span class="impact-pill">${esc(r.impact||'—')}</span></td><td><span class="status-pill ${late?'status-overdue':''}">${esc(r.status)}</span></td><td><div class="row-actions"><button class="btn" onclick="openDetail('${r.id}')">View</button></div></td></tr>`}).join('');
}
window.openDetail=function(id){
 const r=records.find(x=>x.id===id); if(!r)return; currentDetailId=id;
 $('detailTitle').textContent=`${r.rfiNo} — ${r.subject}`;
 const txt=v=>esc(v||'');
 const show=v=>txt(v)||'&nbsp;';
 const field=(label,value,cls='')=>`<div class="pdf-label ${cls}">${label}</div><div class="pdf-value ${cls}">${show(value)}</div>`;
 const big=(label,value,cls='')=>`<div class="pdf-big ${cls}"><div class="pdf-big-label">${label}</div><div class="pdf-big-value">${show(value)}</div></div>`;
 const section=t=>`<div class="pdf-section-title">${t}</div>`;
 const statusText=r.status||'';
 const impactText=[r.impact,r.impactRemarks].filter(Boolean).join(' — ');
 $('detailContent').innerHTML=`
 <div class="rfi-pdf" id="rfiPdf">
   <section class="pdf-page pdf-page-1">
     <div class="pdf-logo-wrap"><img class="pdf-logo" src="gets-logo.png" alt="GeTs Architects logo"></div>
     <div class="pdf-title-rule"></div>
     <div class="pdf-main-title">REQUEST FOR INFORMATION</div>
     ${section('A. GENERAL INFORMATION')}
     <div class="pdf-grid general-grid">
       ${field('Project Name',r.projectName)}${field('RFI No.',r.rfiNo)}
       ${field('Date Raised',r.dateRaised)}${field('Required Response',r.dueDate)}
       ${field('Raised By',r.raisedBy)}${field('Assigned To',r.assignedTo)}
       ${field('Discipline',r.discipline)}${field('Project Phase',r.projectPhase)}
       ${field('Priority',r.priority)}${field('Status',statusText)}
     </div>
     ${section('B. RFI SUBJECT')}
     ${big('Subject / Title:',r.subject,'subject-box')}
     ${section('C. DESCRIPTION / INFORMATION REQUIRED')}
     ${big('Background / Issue',r.background,'desc-box')}
     ${big('Question / Clarification Required',r.question,'desc-box')}
     ${big('Reference Documents / Drawings / Location',r.reference,'reference-box')}
     ${section('D. PROPOSED RECOMMENDATION')}
     ${big('Proposed Solution / Recommendation (Optional)',r.recommendation,'recommendation-box')}
     ${section('E. POTENTIAL IMPACT')}
     <div class="pdf-grid impact-grid">
       ${field('Impact Category',r.impact)}
       ${field('Potential Impact / Remarks',r.impactRemarks)}
     </div>
     <div class="pdf-footer">GeTs Architects&nbsp;&nbsp;|&nbsp;&nbsp;Request for Information (RFI)</div>
   </section>

   <section class="pdf-page pdf-page-2">
     <div class="pdf-logo-wrap"><img class="pdf-logo" src="gets-logo.png" alt="GeTs Architects logo"></div>
     ${section('F. RESPONSE / DECISION')}
     <div class="response-table">
       ${big('Response / Decision',r.response,'response-box')}
       <div class="pdf-grid single-grid">${field('Responded By',r.respondedBy)}</div>
       <div class="pdf-grid single-grid">${field('Company / Discipline',r.responseParty)}</div>
       <div class="pdf-grid single-grid">${field('Response Date',r.responseDate)}</div>
     </div>
     ${section('G. REQUIRED ACTION / CLOSURE')}
     ${big('Instruction / Required Action',r.requiredAction,'action-box')}
     <div class="pdf-grid single-grid">${field('Related Task / Milestone',r.relatedTask)}</div>
     <div class="pdf-grid single-grid">${field('Related Drawing / Revision',r.relatedDrawing)}</div>
     <div class="pdf-grid single-grid">${field('Closed By / Closed Date',[r.closedBy,r.closedDate].filter(Boolean).join(' / '))}</div>
     <div class="pdf-grid single-grid">${field('Final Status',statusText)}</div>
     ${section('H. ATTACHMENTS')}
     <div class="pdf-grid single-grid">${field('Attachment(s)',r.attachmentRef)}</div>
     <div class="pdf-grid single-grid">${field('File Reference',r.attachmentRef)}</div>
     <div class="control-note"><b>CONTROL NOTE</b><br>RFI shall be used for formal clarification or decisions that may affect design, scope, cost, schedule, quality, or interdisciplinary coordination. An RFI is considered closed only after the required response and follow-up action have been completed.</div>
     <div class="pdf-footer">GeTs Architects&nbsp;&nbsp;|&nbsp;&nbsp;Request for Information (RFI)</div>
   </section>
 </div>`;
 $('detailModal').classList.remove('hidden');
}
function editForm(r){Object.keys(r).forEach(k=>{const el=$(k);if(el)el.value=r[k]??''});$('formTitle').textContent='Edit RFI';showView('form')}
function exportCSV(){const cols=['rfiNo','projectName','dateRaised','subject','discipline','projectPhase','raisedBy','assignedTo','dueDate','priority','impact','status','responseDate','relatedTask','relatedDrawing']; const head=cols.join(','); const rows=records.map(r=>cols.map(c=>`"${String(r[c]||'').replace(/"/g,'""')}"`).join(',')); const blob=new Blob([[head,...rows].join('\n')],{type:'text/csv'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='GeTs_RFI_Register.csv';a.click();URL.revokeObjectURL(a.href)}
init();
