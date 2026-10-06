// TuitionHub – loads data from a local backend when available and falls back to localStorage.
const $=s=>document.querySelector(s), KEY='tuitionhub_db', SES='tuitionhub_session';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fd=e=>Object.fromEntries(new FormData(e.target));
let db=null, F={q:'',loc:'',fee:'',mode:''};

const updateDbStatus=async()=>{
  try{
    const res=await fetch('/api/db-status');
    if(!res.ok)return;
    const s=await res.json();
    const el=$('#db-indicator');
    if(!el)return;
    if(s.connected){
      el.innerHTML=`<span class="badge bg-success" style="font-size:0.8rem;padding:6px 12px">● Database: MySQL connected (${esc(s.config.database)})</span>`;
    }else{
      el.innerHTML=`<span class="badge bg-secondary" style="font-size:0.8rem;padding:6px 12px" title="${esc(s.error||'')}">● Database: Local JSON fallback (MySQL offline)</span>`;
    }
  }catch(err){}
};

const loadFromServer=async()=>{
  updateDbStatus();
  try{
    const res=await fetch('/api/data');
    if(res.ok){
      const next=await res.json();
      db=next;
      localStorage.setItem(KEY,JSON.stringify(next));
      return next;
    }
  }catch(err){}

  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  db=stored||{users:[],requests:[],reviews:[]};
  return db;
};

const save=async()=>{
  const payload=db||{users:[],requests:[],reviews:[]};
  localStorage.setItem(KEY,JSON.stringify(payload));
  try{
    await fetch('/api/data',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  }catch(err){}
  return payload;
};

const me=()=>db&&db.users.find(u=>u.id==localStorage.getItem(SES));
async function hash(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch{return btoa(s)}}
function toast(m,t='success'){$('#msg').innerHTML=`<div class="alert alert-${t} mt-3">${esc(m)}</div>`;setTimeout(()=>$('#msg').innerHTML='',4500)}

async function seed(){
  if(db)return;
  const fromServer=await loadFromServer();
  if(fromServer && fromServer.users && fromServer.users.length) return;

  const tp=await hash('tutor123'),t=(i,name,subjects,classes,location,fee,edu,bio,mode)=>({id:i,name,email:name.split(' ')[0].toLowerCase()+'@mail.com',phone:'01711000'+i+'00',pass:tp,role:'tutor',status:'approved',subjects,classes,location,fee,edu,bio,mode});
  db={users:[
    {id:1,name:'Admin',email:'admin@tuitionhub.com',phone:'01700000000',pass:await hash('admin123'),role:'admin',status:'approved'},
    t(2,'Rahim Uddin','Math, Physics','Class 9-10, HSC','Dhaka',3000,'BSc in Mathematics, DU','Five years of teaching experience with a focus on exam practice.','Offline'),
    t(3,'Nusrat Jahan','English, Bangla','Class 6-8, SSC','Tangail',2000,'BA in English, JU','Friendly teacher who builds reading and writing confidence.','Online'),
    t(4,'Tanvir Hasan','Chemistry, Biology','SSC, HSC','Dhaka',3500,'MBBS student, DMC','Concept-first teaching with weekly tests.','Online'),
    t(5,'Mitu Akter','ICT, Math','Class 6-10','Mymensingh',1800,'BSc in CSE, MIST','Beginner-friendly ICT and programming basics.','Offline')],
    requests:[],reviews:[]};
  await save();
}

// ---------- helpers ----------
const rating=id=>{const r=db.reviews.filter(x=>x.tid===id);return r.length?'★ '+(r.reduce((a,b)=>a+b.rating,0)/r.length).toFixed(1)+' ('+r.length+')':'No reviews'};
const name=id=>(db.users.find(u=>u.id===id)||{name:'Deleted user'}).name;
const badge=s=>`<span class="badge badge-${s}">${s}</span>`;

function nav(){
  const u=me(),l=(h,t)=>`<li class="nav-item"><a class="nav-link" href="${h}">${t}</a></li>`;
  $('#nav').innerHTML=`<div class="container"><a class="navbar-brand brand" href="#/">Tuition<i>Hub</i></a>
  <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#menu" aria-label="Menu"><span class="navbar-toggler-icon"></span></button>
  <div class="collapse navbar-collapse" id="menu"><ul class="navbar-nav ms-auto">${l('#/','Home')}${l('#/tutors','Find Tutors')}
  ${u?l('#/dashboard','Dashboard')+`<li class="nav-item"><a class="nav-link" href="#" onclick="A.logout()">Logout (${esc(u.name.split(' ')[0])})</a></li>`:l('#/login','Login')+l('#/register','Register')}</ul></div></div>`;
}

// ---------- pages ----------
const home=()=>`<section class="hero"><h1>Find a tutor who fits your class, subject and budget.</h1>
<p>Search tutors by subject, location and fee. Send a request and start learning.</p>
<form class="d-flex gap-2" onsubmit="F.q=this.q.value;location.hash='#/tutors';return false"><input name="q" class="form-control" placeholder="Subject or tutor name" aria-label="Search"><button class="btn btn-primary">Search tutors</button></form></section>
<div class="row g-3"><div class="col-md-4"><div class="stat"><b>${db.users.filter(u=>u.role==='tutor'&&u.status==='approved').length}</b><div>Approved tutors</div></div></div>
<div class="col-md-4"><div class="stat"><b>${db.users.filter(u=>u.role==='student').length}</b><div>Students</div></div></div>
<div class="col-md-4"><div class="stat"><b>${db.requests.length}</b><div>Tuition requests</div></div></div></div>`;

const card=u=>`<div class="col-md-6 col-lg-4"><div class="card h-100 p-3"><h5>${esc(u.name)}</h5><div class="text-muted small mb-2">${esc(u.edu || 'Tutor')}</div>
<p class="mb-1"><b>Subjects:</b> ${esc(u.subjects || 'General / All subjects')}</p><p class="mb-1"><b>Classes:</b> ${esc(u.classes || 'All classes')}</p>
<p class="mb-1">${esc(u.location || 'All locations')}, ${esc(u.mode || 'Offline')}</p><p class="mb-3">৳${esc(u.fee || 0)} per month <span class="star ms-2">${rating(u.id)}</span></p>
<a class="btn btn-outline-primary mt-auto" href="#/tutor/${u.id}">View profile</a></div></div>`;

function list(){
  const q=F.q.toLowerCase().trim();
  const r=db.users.filter(u=>{
    if(u.role!=='tutor'||u.status!=='approved') return false;
    const searchable=(u.name+' '+(u.subjects||'')+' '+(u.classes||'')+' '+(u.location||'')).toLowerCase();
    if(q && !searchable.includes(q)) return false;
    if(F.loc && u.location && u.location!==F.loc) return false;
    if(F.fee && u.fee && Number(u.fee)>+F.fee) return false;
    if(F.mode && u.mode && u.mode!==F.mode) return false;
    return true;
  });
  $('#list').innerHTML=r.map(card).join('')||'<p class="text-muted">No tutors match these filters. Try removing one.</p>';
}
const tutors=()=>{
  const locs=[...new Set(db.users.filter(u=>u.role==='tutor'&&u.status==='approved'&&u.location).map(u=>u.location))];
  return `<h3 class="mt-4">Find tutors</h3><div class="row g-2 my-3">
  <div class="col-md-4"><input class="form-control" placeholder="Subject, class or name" value="${esc(F.q)}" oninput="F.q=this.value;list()"></div>
  <div class="col-md-3"><select class="form-select" onchange="F.loc=this.value;list()"><option value="">All locations</option>${locs.map(l=>`<option ${F.loc===l?'selected':''}>${esc(l)}</option>`).join('')}</select></div>
  <div class="col-md-3"><input type="number" min="0" class="form-control" placeholder="Max fee (৳)" value="${esc(F.fee)}" oninput="F.fee=this.value;list()"></div>
  <div class="col-md-2"><select class="form-select" onchange="F.mode=this.value;list()"><option value="">Any mode</option><option ${F.mode==='Online'?'selected':''}>Online</option><option ${F.mode==='Offline'?'selected':''}>Offline</option></select></div></div><div class="row g-3" id="list"></div>`;
};

const tutorPage=id=>{
  const t=db.users.find(u=>u.id==id&&u.role==='tutor');if(!t)return'<p class="mt-4">Tutor not found.</p>';
  const u=me(),rv=db.reviews.filter(r=>r.tid===t.id),isS=u&&u.role==='student';
  const canRev=isS&&db.requests.some(r=>r.sid===u.id&&r.tid===t.id&&r.status==='Accepted');
  const side=!u?`<div class="card p-3">Please <a href="#/login">log in</a> as a student to send a request.</div>`:!isS?'':
  `<form class="card p-3 mb-3" onsubmit="A.sendReq(event,${t.id})"><h5>Send a request</h5>
  <input name="subject" class="form-control mb-2" placeholder="Subject needed" required>
  <textarea name="msg" class="form-control mb-2" rows="3" placeholder="Class, preferred days, anything else" required></textarea><button class="btn btn-primary">Send request</button></form>`
  +(canRev?`<form class="card p-3" onsubmit="A.addReview(event,${t.id})"><h5>Rate this tutor</h5>
  <select name="rating" class="form-select mb-2"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select>
  <input name="comment" class="form-control mb-2" placeholder="Your review" required><button class="btn btn-primary">Post review</button></form>`:'');
  return `<div class="row g-4 mt-2"><div class="col-md-7"><div class="card p-4"><h3>${esc(t.name)}</h3><div class="text-muted mb-2">${esc(t.edu || 'Tutor')}</div><p>${esc(t.bio || 'Dedicated educator ready to assist students.')}</p>
  <p class="mb-1"><b>Subjects:</b> ${esc(t.subjects || 'General / All subjects')}</p><p class="mb-1"><b>Classes:</b> ${esc(t.classes || 'All classes')}</p><p class="mb-1"><b>Location:</b> ${esc(t.location || 'All locations')} (${esc(t.mode || 'Offline')})</p>
  <p class="mb-0"><b>Fee:</b> ৳${esc(t.fee || 0)} per month <span class="star ms-2">${rating(t.id)}</span></p></div>
  <h5 class="mt-4">Reviews</h5>${rv.map(r=>`<div class="card p-3 mb-2"><span class="star">${'★'.repeat(r.rating)}</span> ${esc(r.comment)}<div class="small text-muted">${esc(name(r.sid))}</div></div>`).join('')||'<p class="text-muted">No reviews yet.</p>'}</div>
  <div class="col-md-5">${side}</div></div>`;
};

const loginPage=()=>`<form class="card p-4 mx-auto mt-4" style="max-width:420px" onsubmit="A.login(event)"><h3>Log in</h3>
<input name="email" type="email" class="form-control my-2" placeholder="Email" required><input name="password" type="password" class="form-control mb-3" placeholder="Password" required>
<button class="btn btn-primary">Log in</button><p class="mt-3 mb-0 small">New here? <a href="#/register">Create an account</a></p>
<p class="mt-2 mb-0 small text-muted">Demo: admin@tuitionhub.com / admin123 · rahim@mail.com / tutor123</p></form>`;

const registerPage=()=>`<form class="card p-4 mx-auto mt-4" style="max-width:480px" onsubmit="A.register(event)"><h3>Create an account</h3>
<input name="name" class="form-control my-2" placeholder="Full name" required><input name="email" type="email" class="form-control mb-2" placeholder="Email" required>
<input name="phone" class="form-control mb-2" placeholder="Phone (01XXXXXXXXX)" required><input name="password" type="password" class="form-control mb-2" placeholder="Password (min 6 characters)" required>
<input name="confirm" type="password" class="form-control mb-2" placeholder="Confirm password" required>
<select name="role" class="form-select mb-3"><option value="student">I am a student or guardian</option><option value="tutor">I am a tutor (needs admin approval)</option></select>
<button class="btn btn-primary">Register</button></form>`;

const profileForm=u=>`<form class="card p-3" onsubmit="A.saveProfile(event)"><h5>My profile</h5><div class="row g-2">
<div class="col-md-6"><input name="name" class="form-control" value="${esc(u.name)}" required></div><div class="col-md-6"><input name="phone" class="form-control" value="${esc(u.phone)}" required></div>
${u.role==='tutor'?`<div class="col-md-6"><input name="subjects" class="form-control" placeholder="Subjects (e.g. Math, Physics)" value="${esc(u.subjects)}" required></div>
<div class="col-md-6"><input name="classes" class="form-control" placeholder="Classes (e.g. Class 6-8)" value="${esc(u.classes)}" required></div>
<div class="col-md-4"><input name="location" class="form-control" placeholder="Location" value="${esc(u.location)}" required></div>
<div class="col-md-4"><input name="fee" type="number" min="0" class="form-control" placeholder="Fee per month (৳)" value="${esc(u.fee)}" required></div>
<div class="col-md-4"><select name="mode" class="form-select"><option ${u.mode==='Offline'?'selected':''}>Offline</option><option ${u.mode==='Online'?'selected':''}>Online</option></select></div>
<div class="col-12"><input name="edu" class="form-control" placeholder="Education" value="${esc(u.edu)}"></div>
<div class="col-12"><textarea name="bio" class="form-control" rows="2" placeholder="About you">${esc(u.bio)}</textarea></div>`:''}
</div><button class="btn btn-primary mt-3 align-self-start">Save changes</button></form>`;

const dashboard=()=>{
  const u=me();if(!u){location.hash='#/login';return''}
  if(u.role==='student'){const r=db.requests.filter(x=>x.sid===u.id);
    return `<h3 class="mt-4">Welcome, ${esc(u.name)}</h3><h5 class="mt-3">My requests</h5>
    <div class="table-responsive"><table class="table bg-white"><tr><th>Tutor</th><th>Subject</th><th>Status</th><th></th></tr>
    ${r.map(x=>`<tr><td><a href="#/tutor/${x.tid}">${esc(name(x.tid))}</a></td><td>${esc(x.subject)}</td><td>${badge(x.status)}</td><td><button class="btn btn-sm btn-outline-danger" onclick="A.delReq(${x.id})">Cancel</button></td></tr>`).join('')||'<tr><td colspan="4" class="text-muted">No requests yet. <a href="#/tutors">Find a tutor</a>.</td></tr>'}</table></div>${profileForm(u)}`}
  if(u.role==='tutor'){const r=db.requests.filter(x=>x.tid===u.id);
    return `<h3 class="mt-4">Welcome, ${esc(u.name)}</h3><h5 class="mt-3">Incoming requests</h5>
    <div class="table-responsive"><table class="table bg-white"><tr><th>Student</th><th>Subject</th><th>Message</th><th>Status</th><th></th></tr>
    ${r.map(x=>`<tr><td>${esc(name(x.sid))}${x.status==='Accepted'?'<br><small>'+esc((db.users.find(s=>s.id===x.sid)||{}).phone)+'</small>':''}</td><td>${esc(x.subject)}</td><td>${esc(x.msg)}</td><td>${badge(x.status)}</td>
    <td class="text-nowrap"><button class="btn btn-sm btn-primary" onclick="A.setReq(${x.id},'Accepted')">Accept</button> <button class="btn btn-sm btn-outline-danger" onclick="A.setReq(${x.id},'Rejected')">Reject</button></td></tr>`).join('')||'<tr><td colspan="5" class="text-muted">No requests yet.</td></tr>'}</table></div>${profileForm(u)}`}
  return `<h3 class="mt-4">Admin dashboard</h3><div class="row g-3 my-2">
  <div class="col-6 col-md-3"><div class="stat"><b>${db.users.filter(x=>x.role==='student').length}</b><div>Students</div></div></div>
  <div class="col-6 col-md-3"><div class="stat"><b>${db.users.filter(x=>x.role==='tutor').length}</b><div>Tutors</div></div></div>
  <div class="col-6 col-md-3"><div class="stat"><b>${db.users.filter(x=>x.status==='pending').length}</b><div>Awaiting approval</div></div></div>
  <div class="col-6 col-md-3"><div class="stat"><b>${db.requests.length}</b><div>Requests</div></div></div></div>
  <h5 class="mt-3">Users</h5><div class="table-responsive"><table class="table bg-white"><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
  ${db.users.filter(x=>x.role!=='admin').map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${x.role}</td><td>${x.status}</td><td class="text-nowrap">${x.status==='pending'?`<button class="btn btn-sm btn-primary" onclick="A.approve(${x.id})">Approve</button> `:''}<button class="btn btn-sm btn-outline-danger" onclick="A.delUser(${x.id})">Delete</button></td></tr>`).join('')}</table></div>
  <h5 class="mt-3">Reviews</h5><div class="table-responsive"><table class="table bg-white"><tr><th>Tutor</th><th>Rating</th><th>Comment</th><th></th></tr>
  ${db.reviews.map(x=>`<tr><td>${esc(name(x.tid))}</td><td>${x.rating}</td><td>${esc(x.comment)}</td><td><button class="btn btn-sm btn-outline-danger" onclick="A.delReview(${x.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="4" class="text-muted">No reviews yet.</td></tr>'}</table></div>`;
};

// ---------- actions ----------
const A={
  async register(e){e.preventDefault();const d=fd(e);
    if(!/^01\d{9}$/.test(d.phone))return toast('Enter a valid phone number like 01712345678.','danger');
    if(d.password.length<6)return toast('Password must be at least 6 characters.','danger');
    if(d.password!==d.confirm)return toast('Passwords do not match.','danger');
    if(db.users.some(u=>u.email===d.email.toLowerCase()))return toast('This email is already registered.','danger');
    const t=d.role==='tutor';
    db.users.push({id:Date.now(),name:d.name.trim(),email:d.email.toLowerCase(),phone:d.phone,pass:await hash(d.password),role:d.role,status:t?'pending':'approved',subjects:'',classes:'',location:'',fee:0,edu:'',bio:'',mode:'Offline'});
    await save();location.hash='#/login';toast(t?'Registered. You can log in after an admin approves your account.':'Registered. Please log in.')},
  async login(e){e.preventDefault();const d=fd(e),h=await hash(d.password);
    const u=db.users.find(x=>x.email===d.email.toLowerCase().trim()&&x.pass===h);
    if(!u)return toast('Invalid email or password.','danger');
    if(u.status==='pending')return toast('Your tutor account is waiting for admin approval.','warning');
    localStorage.setItem(SES,u.id);location.hash='#/dashboard';route()},
  logout(){localStorage.removeItem(SES);location.hash='#/';route()},
  async sendReq(e,tid){e.preventDefault();const d=fd(e);db.requests.push({id:Date.now(),sid:me().id,tid,subject:d.subject,msg:d.msg,status:'Pending'});await save();toast('Request sent.');location.hash='#/dashboard'},
  async setReq(id,s){const r=db.requests.find(x=>x.id==id);if(r){r.status=s;}await save();route()},
  async delReq(id){db.requests=db.requests.filter(r=>r.id!=id);await save();route()},
  async addReview(e,tid){e.preventDefault();const d=fd(e);db.reviews.push({id:Date.now(),sid:me().id,tid,rating:+d.rating,comment:d.comment});await save();toast('Review posted.');route()},
  async saveProfile(e){e.preventDefault();const d=fd(e),u=me();
    if(!/^01\d{9}$/.test(d.phone))return toast('Enter a valid phone number like 01712345678.','danger');
    Object.assign(u,d);if(d.fee!==undefined)u.fee=+d.fee;await save();toast('Profile saved.');nav()},
  async approve(id){
    const u=db.users.find(x=>x.id==id);
    if(u){
      u.status='approved';
      await save();
      toast(`${u.name} has been approved.`);
      route();
    }
  },
  async delUser(id){
    if(!confirm('Delete this user and their requests and reviews?'))return;
    db.users=db.users.filter(u=>u.id!=id);
    db.requests=db.requests.filter(r=>r.sid!=id&&r.tid!=id);
    db.reviews=db.reviews.filter(r=>r.sid!=id&&r.tid!=id);
    await save();
    route();
  },
  async delReview(id){
    db.reviews=db.reviews.filter(r=>r.id!=id);
    await save();
    route();
  }
};

// ---------- router ----------
function route(){
  nav();const[p,a]=location.hash.slice(2).split('/');
  const pages={'':home,tutors,tutor:()=>tutorPage(a),login:loginPage,register:registerPage,dashboard};
  $('#app').innerHTML=(pages[p]||home)();
  if(p==='tutors')list();window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
seed().then(route);
