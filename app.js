
'use strict';
const KEY='mybudget_supabase_config_v9';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const _loadedScripts={};
function loadScriptOnce(src){if(_loadedScripts[src])return _loadedScripts[src];_loadedScripts[src]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>resolve();s.onerror=()=>{delete _loadedScripts[src];reject(new Error('Failed to load '+src))};document.head.appendChild(s)});return _loadedScripts[src]}
const istParts=()=>{const p=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]))};
const localDate=d=>{if(typeof d==='string'&&/^\d{4}-\d{2}-\d{2}/.test(d))return d.slice(0,10);const x=d instanceof Date?d:new Date(d);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(x)}; const today=()=>{const p=istParts();return `${p.year}-${p.month}-${p.day}`}; const ym=()=>today().slice(0,7), ymOf=(y,m)=>`${y}-${String(m+1).padStart(2,'0')}`, money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}), uid=()=>crypto.randomUUID();
let sb=null,user=null,filter='All',authMode='signin',budgetPeriod='monthly',calCursor=null,selectedDate=today(),recoveryHandled=false,dataReady=false;
let txCategoryIndex=new Map(),txAccountIndex=new Map();
function rebuildIndexes(){txCategoryIndex=new Map();for(const x of state.transaction_categories||[]){if(!txCategoryIndex.has(x.transaction_id))txCategoryIndex.set(x.transaction_id,[]);txCategoryIndex.get(x.transaction_id).push(x)}txAccountIndex=new Map();for(const x of state.transaction_accounts||[]){if(!txAccountIndex.has(x.transaction_id))txAccountIndex.set(x.transaction_id,[]);txAccountIndex.get(x.transaction_id).push(x)}}
let splitMode='equal',splitRows=[],splitIncludeMe=true,yearChart=null,categoryChart=null,trendChart=null,dailySpendChart=null,monthlyCashflowChart=null,yearCategoryChart=null,topCategoryYearChart=null,insightMode='monthly',subCategoryCharts=[];
function destroySubCategoryCharts(){subCategoryCharts.forEach(c=>{try{c?.destroy()}catch(e){}});subCategoryCharts=[]}
let state={accounts:[],categories:[],transactions:[],budgets:[],people:[],goals:[],split_transactions:[],split_participants:[],reimbursements:[],goal_contributions:[],recurring_transactions:[],reminders:[],loans:[],loan_repayments:[],transaction_categories:[],money_held:[],transaction_accounts:[],recurring_occurrences:[]};
const dateObj=d=>new Date(String(d).slice(0,10)+'T12:00:00Z'), todayDate=()=>dateObj(today()), fmtDate=d=>dateObj(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}); if(!calCursor)calCursor=dateObj(today());
function periodLabel(d){return dateObj(d).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'});}
function cfg(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function nicknameKey(){return `mybudget_nickname_${user?.id||'local'}`}
function getNickname(){return (localStorage.getItem(nicknameKey())||'').trim()}

function showLoading(on=true,msg='Loading My Budget…'){$('loading').classList.toggle('hidden',!on);if(msg)$('loading').textContent=msg}function setAuthGate(isAuthenticated){document.body.classList.toggle('authenticated',Boolean(isAuthenticated));$('app').classList.toggle('hidden',!isAuthenticated);$('auth').classList.toggle('hidden',Boolean(isAuthenticated));$('loading').classList.add('hidden')}
function notice(msg,type='notice',target='authNotice'){const e=$(target);if(!e)return;e.className='notice '+type;e.textContent=msg;e.classList.remove('hidden')}
function initClient(){const c=cfg();if(!c.url||!c.key||!window.supabase)return false;try{sb=window.supabase.createClient(c.url.replace(/\/$/,''),c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage}});return true}catch{return false}}
async function requestPasswordReset(){
  if(!sb){openConfig();return}
  const email=$('email')?.value.trim()||'';
  if(!email){notice('Enter your email address first, then click Forgot password.','error');$('email')?.focus();return}
  try{
    const redirectTo=window.location.protocol==='file:'?null:(window.location.origin+window.location.pathname);
    const r=redirectTo?await sb.auth.resetPasswordForEmail(email,{redirectTo}):await sb.auth.resetPasswordForEmail(email);
    if(r.error)throw r.error;
    notice('Password reset email sent. Check your inbox and open the reset link.','success');
  }catch(e){notice(e?.message||'Could not send the password reset email.','error')}
}
function openResetPassword(){
  openModalRaw(`<h2>Set a new password</h2><p class="sub">Choose a new password for your My Budget account.</p><form id="resetPasswordForm"><label>New password</label><input id="newPassword" type="password" minlength="6" required autocomplete="new-password" placeholder="At least 6 characters"><label>Confirm password</label><input id="confirmPassword" type="password" minlength="6" required autocomplete="new-password" placeholder="Re-enter your password"><button class="primary">Update password</button></form>`);
  $('resetPasswordForm')?.addEventListener('submit',async e=>{e.preventDefault();const a=$('newPassword').value,b=$('confirmPassword').value;if(a!==b){notice('Passwords do not match.','error');return}try{const r=await sb.auth.updateUser({password:a});if(r.error)throw r.error;closeModal();history.replaceState(null,document.title,window.location.pathname+window.location.search);notice('Password updated successfully. You can now sign in with your new password.','success');await sb.auth.signOut();user=null;setAuthGate(false)}catch(err){notice(err?.message||'Could not update your password.','error')}});
}
function isRecoveryRedirect(){const h=String(location.hash||'');const q=String(location.search||'');return /(?:^|[&#?])type=recovery(?:[&#]|$)/i.test(h)||/(?:^|[&#?])access_token=[^&#]+/i.test(h)&&/(?:^|[&#?])type=recovery(?:[&#]|$)/i.test(h)||/type=recovery/i.test(q)}
function openRecoveryOnce(){if(recoveryHandled)return;recoveryHandled=true;setTimeout(()=>{if(sb&&user)openResetPassword()},50)}
function openConfig(){openModalRaw(`<h2>Supabase connection</h2><p class="sub">Use Project URL + Publishable key. Never use a service-role/secret key in a browser app.</p><form id="configForm"><label>Project URL</label><input id="cfgUrl" type="url" required placeholder="https://xxxx.supabase.co" value="${esc(cfg().url||'')}"><label>Publishable key</label><input id="cfgKey" type="password" required placeholder="sb_publishable_..." value="${esc(cfg().key||'')}"><button class="primary">Save & connect</button></form>`);$('configForm').onsubmit=async e=>{e.preventDefault();localStorage.setItem(KEY,JSON.stringify({url:$('cfgUrl').value.trim().replace(/\/$/,''),key:$('cfgKey').value.trim()}));closeModal();await boot()}}
function openModalRaw(h){$('modalBody').innerHTML=h;$('modal').classList.add('show')} function closeModal(){$('modal').classList.remove('show')}
function showPage(p){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(p).classList.add('active');document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.p===p));if(dataReady)render()}
const tables=['accounts','categories','transactions','transaction_categories','budgets','people','goals','split_transactions','split_participants','reimbursements','goal_contributions','recurring_transactions','recurring_occurrences','reminders','loans','loan_repayments','money_held'];
async function loadData(){const results=await Promise.all(tables.map(async t=>{const {data,error}=await sb.from(t).select('*');if(error)throw new Error(t+': '+error.message);return [t,data||[]]}));for(const [t,data] of results)state[t]=data;rebuildIndexes();}
function removeLocal(t,id){if(Array.isArray(state[t]))state[t]=state[t].filter(x=>x.id!==id)}
async function insert(t,row){const {data,error}=await sb.from(t).insert({...row,user_id:user.id}).select().single();if(error)throw error;return data}
async function update(t,id,row){const {data,error}=await sb.from(t).update(row).eq('id',id).select('*');if(error)throw error;if(!data||!data.length)throw new Error(`Could not update ${t}. The record may no longer exist or you may not have permission.`);return data[0]}
async function del(t,id){const {error}=await sb.from(t).delete().eq('id',id);if(error)throw error}
async function ensureBase(){const {data,error}=await sb.from('categories').select('id').limit(1);if(error)throw error;if(!data?.length){const parent=await insert('categories',{name:'Fixed Expenses',type:'expense',icon:'🏠',color:'#7666cf'});const rows=[['Rent','expense','🏠','#7666cf',parent.id],['Bills','expense','🧾','#6f98d8',parent.id],['Outing','expense','🍽️','#c9708b',parent.id],['Food','expense','🍔','#e5a15f',null],['Transport','expense','🚗','#5d8ed8',null],['Shopping','expense','🛍️','#c9708b',null],['Entertainment','expense','🎬','#8b7bd6',null],['Health','expense','💊','#59a77e',null],['Salary','income','💼','#59a77e',null],['Other Income','income','＋','#5d8ed8',null],['Both','both','🔄','#7666cf',null]];for(const r of rows)await insert('categories',{name:r[0],type:r[1],icon:r[2],color:r[3],parent_id:r[4],is_active:true})}}
async function boot(){
  showLoading(true,'Connecting to your secure cloud database…');
  setAuthGate(false);
  const recoveryRedirect=isRecoveryRedirect();
  const bootTimeout=setTimeout(()=>{if(!$('loading').classList.contains('hidden')){showLoading(false);setAuthGate(false);notice('The app could not connect to Supabase. Check your internet connection and try again.','error')}},15000);
  try{
    if(!initClient()){clearTimeout(bootTimeout);showLoading(false);setAuthGate(false);notice('Connect your Supabase Project URL and Publishable key to start.');return}
    if(!sb._myBudgetRecoveryListener){
      sb._myBudgetRecoveryListener=true;
      sb.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'&&session){user=session.user;openRecoveryOnce()}
      });
    }
    const {data,error}=await sb.auth.getSession();
    if(error)throw error;
    clearTimeout(bootTimeout);
    if(!data.session){showLoading(false);setAuthGate(false);return}

    // A valid Supabase session means the user is logged in. Keep the authenticated
    // shell visible, but NEVER render the initial empty in-memory state. The old
    // behavior briefly showed zero balances on refresh while the cloud queries
    // were still running, which looked like the user's data had disappeared.
    user=data.session.user;
    dataReady=false;
    setAuthGate(true);
    showLoading(true,'Loading your budget…');
    if(recoveryRedirect)openRecoveryOnce();

    try{
      // One parallel read gets the real cloud state first. Base categories are
      // created only when the cloud is genuinely empty, avoiding an unnecessary
      // extra query on every refresh.
      await loadData();
      if(!state.categories.length){
        await ensureBase();
        await loadData();
      }
      dataReady=true;
      showLoading(false);
      render();

      // Recurring generation is maintenance work; do it after the real data is
      // already on screen so reopening is not blocked by it. If it creates due
      // occurrences, refresh the in-memory state afterwards.
      try{
        const generated=await processRecurring(false);
        if(generated){await loadData();render();}
      }catch(recErr){console.warn('Recurring maintenance deferred:',recErr)}
    }catch(dataError){
      console.error('Initial data load failed:',dataError);
      // IMPORTANT: do not mark data ready and do not render empty arrays. Keep the
      // loading screen up so zero balances can never masquerade as real data.
      showLoading(true,'Could not load your budget data. Retrying…');
      setTimeout(()=>{if(user&&sb&&!dataReady)boot()},1200);
    }
  }catch(e){
    console.error(e);
    clearTimeout(bootTimeout);
    showLoading(false);
    setAuthGate(false);
    notice(e?.message||'Unable to connect. Check Supabase URL, key, schema and RLS.','error');
  }
}
$('toggleAuth').onclick=()=>{authMode=authMode==='signin'?'signup':'signin';$('authSubmit').textContent=authMode==='signin'?'Sign in':'Create account';$('toggleAuth').textContent=authMode==='signin'?'Create account':'Back to sign in';$('authText').textContent=authMode==='signin'?'Sign in to your budget. Your financial data is stored in your Supabase cloud database. Your secure login stays active on this device until you sign out.':'Create your My Budget login. Use an email and password you control.';$('authNotice').classList.add('hidden');$('forgotPassword')?.classList.toggle('hidden',authMode!=='signin')};
$('forgotPassword').onclick=requestPasswordReset;
$('authForm').onsubmit=async e=>{
  e.preventDefault();
  if(!sb){openConfig();return}
  const email=$('email').value.trim(),password=$('password').value;
  $('authSubmit').disabled=true;
  try{
    if(authMode==='signup'){
      const r=await sb.auth.signUp({email,password});
      if(r.error)throw r.error;
      if(r.data.session){
        user=r.data.user;
        dataReady=false;
        setAuthGate(true);showLoading(true,'Loading your budget…');
        try{await loadData();if(!state.categories.length){await ensureBase();await loadData()}dataReady=true;showLoading(false);render();try{const generated=await processRecurring(false);if(generated){await loadData();render()}}catch(recErr){console.warn('Recurring maintenance deferred:',recErr)}}catch(err){console.error('Initial data load failed:',err);showLoading(true,'Could not load your budget data. Retrying…');setTimeout(()=>{if(user&&sb&&!dataReady)boot()},1200)}
      }else notice('Account created. Check your email if confirmation is enabled, then sign in.','success')
    }else{
      const r=await sb.auth.signInWithPassword({email,password});
      if(r.error)throw r.error;
      user=r.data.user;
      dataReady=false;
      // Authentication succeeds immediately, but don't render the empty in-memory
      // state before Supabase data arrives. The authenticated shell can be shown
      // while the real cloud data loads, avoiding misleading zero/empty values.
      setAuthGate(true);showLoading(true,'Loading your budget…');
      try{await loadData();if(!state.categories.length){await ensureBase();await loadData()}dataReady=true;showLoading(false);render();try{const generated=await processRecurring(false);if(generated){await loadData();render()}}catch(recErr){console.warn('Recurring maintenance deferred:',recErr)}}catch(err){console.error('Initial data load failed:',err);showLoading(true,'Could not load your budget data. Retrying…');setTimeout(()=>{if(user&&sb&&!dataReady)boot()},1200)}
    }
  }catch(e){notice(e?.message||'Authentication failed.','error')}
  finally{$('authSubmit').disabled=false}
};
async function signOut(){try{await sb.auth.signOut()}finally{location.reload()}}
function accountName(id){return state.accounts.find(x=>x.id===id)?.name||'—'} function catName(id){return state.categories.find(x=>x.id===id)?.name||'Uncategorized'} function personName(id){return state.people.find(x=>x.id===id)?.name||'—'}
function splitMyShare(t){return Number(state.split_transactions.find(x=>x.transaction_id===t.id)?.my_share||0)}
function spending(t){return t.type==='split'?splitMyShare(t):t.type==='expense'?Number(t.amount||0):0}
function personalSpendingBetween(a,b){return state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=b&&(t.type==='expense'||t.type==='split')).reduce((s,t)=>s+spending(t),0)}
function sumType(type,prefix){return state.transactions.filter(t=>t.type===type&&(!prefix||String(t.transaction_date).startsWith(prefix))).reduce((s,t)=>s+Number(t.amount||0),0)}
function accountBalance(a){let b=Number(a.opening_balance||0);for(const t of state.transactions){const n=Number(t.amount||0);if(t.type==='transfer'){if(t.account_id===a.id)b-=n;if(t.to_account_id===a.id)b+=n}else if(t.account_id===a.id){if(t.type==='income'||t.type==='reimbursement')b+=n;if(t.type==='expense'||t.type==='split')b-=n}}for(const l of state.loans){const n=Number(l.amount||0);if(l.account_id===a.id)b+=l.direction==='borrow'?n:-n}for(const r of state.loan_repayments){const n=Number(r.amount||0);if(r.account_id===a.id)b+=r.direction==='received'?n:-n}for(const h of state.money_held){const n=Number(h.amount||0);if(h.account_id===a.id)b+=h.status==='pending'?n:-n}return b}
function totalBalance(){return state.accounts.reduce((s,a)=>s+accountBalance(a),0)}
function owedTotal(){return peopleBalances().reduce((s,p)=>s+p.balance,0)}
function peopleBalances(){return state.people.map(p=>{const splitGross=state.split_participants.filter(x=>x.person_id===p.id).reduce((s,x)=>s+Number(x.amount||0),0),splitOutstanding=state.split_participants.filter(x=>x.person_id===p.id).reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.amount_paid||0)),0),splitRep=state.reimbursements.filter(x=>x.person_id===p.id).reduce((s,x)=>s+Number(x.amount||0),0),loanLent=state.loans.filter(x=>x.person_id===p.id&&x.direction==='lend').reduce((s,x)=>s+Number(x.amount||0),0),loanBorrowed=state.loans.filter(x=>x.person_id===p.id&&x.direction==='borrow').reduce((s,x)=>s+Number(x.amount||0),0),loanPaid=state.loan_repayments.filter(x=>x.person_id===p.id&&x.direction==='received').reduce((s,x)=>s+Number(x.amount||0),0),loanRepaid=state.loan_repayments.filter(x=>x.person_id===p.id&&x.direction==='sent').reduce((s,x)=>s+Number(x.amount||0),0);const theyOwe=Math.max(0,splitOutstanding-splitRep)+Math.max(0,loanLent-loanPaid),iOwe=Math.max(0,loanBorrowed-loanRepaid);return {...p,balance:theyOwe,iOwe,totalOwed:splitGross,totalRepaid:splitRep,loanOwed:Math.max(0,loanLent-loanPaid),loanIowe:iOwe,loanLent,loanReceived:loanPaid}}).sort((a,b)=>(b.balance+b.iOwe)-(a.balance+a.iOwe))}

function greeting(){
  const nickname = (localStorage.getItem(nicknameKey()) || '').trim();
  const hour = Number(new Intl.DateTimeFormat('en-IN',{hour:'2-digit',hour12:false,timeZone:'Asia/Kolkata'}).format(new Date()));
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Hello, Good ${part}${nickname ? ', ' + nickname : ''}`;
}
function render(){const m=ym(),inc=sumType('income',m),spent=personalSpendingBetween(m+'-01',today()),saved=inc-spent,nowLabel=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());$('monthLabel').textContent=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());['transactionsDate','accountsDate','budgetsDate','calendarDate','goalsDate','peopleDate','insightsDate','moreDate','recurringDate','loansDate'].forEach(id=>{if($(id))$(id).textContent=nowLabel});if($('greetingText'))$('greetingText').textContent=greeting();$('totalBalance').textContent=money(totalBalance());$('monthIncome').textContent=money(inc);$('monthSpent').textContent=money(spent);$('monthSaved').textContent=money(saved);renderHome();renderTransactions();renderAccounts();renderBudgets();renderCalendar();renderGoals();renderPeople();renderLoans();renderInsights();renderRecurring()}
function budgetHTML(b){const s=budgetStatus(b),rem=Math.max(0,Number(b.amount)-s.used);return `<div class="row budget-row"><div class="budget-main"><div class="total-line"><span><b>${esc(b.name)}</b><div class="sub">${esc(budgetCategoryLabel(b))} · ${b.period}</div></span></div><div class="budget-progress-line"><div class="progress"><div class="bar ${s.cls}" style="width:${Math.min(100,s.pct)}%"></div></div><span class="badge status-${s.cls}">${s.pct.toFixed(0)}%</span></div><div class="budget-amounts"><span class="budget-amount budget-spent">Spent <b class="red">${money(s.used)}</b></span><span class="budget-amount budget-limit">Budget <b class="purple">${money(b.amount)}</b></span><span class="budget-amount budget-remaining ${rem>0?'':'budget-remaining-over'}">Remaining <b class="${rem>0?'green':'red'}">${money(rem)}</b></span></div></div><div class="action-row"><button class="smallbtn" onclick="editBudget('${b.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteBudget('${b.id}')">Delete</button></div></div>`}
function renderHome(){const now=todayDate(),b=state.budgets.find(x=>x.period==='monthly'&&(!x.year||x.year===now.getFullYear())&&(!x.month||x.month===now.getMonth()+1));$('homeBudget').innerHTML=b?budgetHTML(b):'<div class="empty">No monthly budget yet.</div>';const gs=state.goals.slice().sort((a,b)=>Number(b.is_completed)-Number(a.is_completed)).slice(0,1);$('homeGoals').innerHTML=gs.length?gs.map(goalHTML).join(''):'<div class="empty">No goals yet.</div>';const ps=peopleBalances().filter(x=>x.balance>0).slice(0,3);$('homePeople').innerHTML=ps.length?ps.map(personHTML).join(''):'<div class="empty">Nobody owes you right now.</div>';const rs=state.reminders.slice().sort((a,b)=>Number(Boolean(a.completed))-Number(Boolean(b.completed))||String(a.due_date).slice(0,10).localeCompare(String(b.due_date).slice(0,10)));$('homeReminders').innerHTML=rs.length?rs.map(reminderHTML).join(''):'<div class="empty">No reminders.</div>';const tx=state.transactions.slice().sort((a,b)=>String(b.transaction_date).slice(0,10).localeCompare(String(a.transaction_date).slice(0,10))||String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,5);$('homeRecent').innerHTML=tx.length?tx.map(txHTML).join(''):'<div class="empty">No transactions yet.</div>'}

function renderTransactions(){const types=['All','income','expense','transfer','split','reimbursement'];$('filters').innerHTML=types.map(x=>`<button class="chip ${filter===x?'active':''}" onclick="filter='${x}';renderTransactions()">${x==='All'?'All':x[0].toUpperCase()+x.slice(1)}</button>`).join('');let arr=state.transactions.slice().sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date))||String(b.created_at||'').localeCompare(String(a.created_at||'')));if(filter!=='All')arr=arr.filter(t=>t.type===filter);$('txList').innerHTML=arr.length?arr.map(txHTML).join(''):'<div class="empty">No transactions found.</div>'}
function renderAccounts(){const list=state.accounts.map(a=>{const inc=state.transactions.filter(t=>t.account_id===a.id&&t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0);const spent=state.transactions.filter(t=>t.account_id===a.id&&(t.type==='expense'||t.type==='split')).reduce((s,t)=>s+Number(t.amount||0),0);const bal=accountBalance(a);return `<div class="row"><div class="left"><div class="bubble">🏦</div><div><div class="name">${esc(a.name)}</div><div class="sub">${esc(a.type)} · ${esc(a.currency||'INR')}</div><div class="sub">Income ${money(inc)} · Spent ${money(spent)}</div></div></div><div style="text-align:right"><b>${money(bal)}</b><div style="margin-top:5px"><button class="smallbtn" onclick="editAccount('${a.id}')">✎</button> <button class="smallbtn" onclick="deleteAccount('${a.id}')">🗑</button></div></div></div>`}).join('');$('accountList').innerHTML=list||'<div class="empty">Add your first account.</div>'}
function renderBudgets(){$('budgetTabs').innerHTML=['weekly','monthly','yearly'].map(p=>`<button class="${budgetPeriod===p?'active':''}" onclick="budgetPeriod='${p}';renderBudgets()">${p[0].toUpperCase()+p.slice(1)}</button>`).join('');const now=todayDate(),cy=now.getFullYear(),cm=now.getMonth()+1;const arr=state.budgets.filter(b=>b.period===budgetPeriod&&(!b.year||b.year===cy)&&(budgetPeriod!=='monthly'||!b.month||b.month===cm));$('budgetList').innerHTML=arr.length?arr.map(budgetHTML).join(''):'<div class="empty">No ${budgetPeriod} budgets yet.</div>'}
function goalMonthlyNeed(g){const target=Number(g.target_amount||0),saved=Number(g.saved_amount||0),remain=Math.max(0,target-saved),months=Math.max(0,Number(g.duration_months||0));return months?remain/months:0}
function goalETA(g){const saved=Number(g.saved_amount||0),target=Number(g.target_amount||0),remain=Math.max(0,target-saved);if(remain<=0)return 'Completed';const months=[];for(let i=0;i<6;i++){const d=todayDate();d.setMonth(d.getMonth()-i);const p=localDate(d).slice(0,7);const end=localDate(new Date(d.getFullYear(),d.getMonth()+1,0));months.push(Math.max(0,sumType('income',p)-personalSpendingBetween(p+'-01',end)))}const avg=months.reduce((a,b)=>a+b,0)/(months.length||1);if(avg<=0)return 'Need a positive savings rate';const n=Math.ceil(remain/avg);return `At avg savings ${money(avg)}/mo · about ${n} month${n===1?'':'s'}`}
function goalHTML(g){const target=Number(g.target_amount||0),saved=Number(g.saved_amount||0),pct=Math.min(100,target?saved/target*100:0),months=Math.max(1,Number(g.duration_months||remainingMonthsThisYear())),need=target>saved?Math.max(0,target-saved)/months:0;return `<div class="row"><div class="left"><div class="bubble goal">${esc(g.icon||'🎯')}</div><div style="min-width:0;flex:1"><div class="name">${esc(g.name)}</div><div class="sub">${money(saved)} of ${money(target)} · ${goalETA(g)}</div><div class="goal-plan"><span>Plan: </span><input class="goal-month-input" id="goalMonths_${g.id}" type="number" min="1" step="1" value="${months}" aria-label="Months to reach ${esc(g.name)}"><button type="button" class="smallbtn goal-save-months" onclick="saveGoalDuration('${g.id}')">Save</button><span> · save <b>${money(need)}</b>/month</span></div><div class="progress"><div class="bar ${pct>=100?'full':pct>=50?'mid':'low'}" style="width:${pct}%"></div></div></div></div><div><button class="smallbtn" onclick="contribute('${g.id}')">＋ Add</button><br><button class="smallbtn" onclick="showGoalContrib('${g.id}')">History</button> <button class="smallbtn" onclick="editGoal('${g.id}')">✎</button> <button class="smallbtn" onclick="deleteGoal('${g.id}')">🗑</button></div></div>`}
function renderGoals(){$('goalList').innerHTML=state.goals.length?state.goals.map(goalHTML).join(''):'<div class="empty">No goals yet.</div>'}
function otherPersonIcon(){return `<span class="person-avatar person-avatar-other" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#f3d7ff"/><circle cx="24" cy="18" r="7" fill="#ff9f68"/><path d="M11 38c1.8-8.2 7-12 13-12s11.2 3.8 13 12" fill="#6c63d9"/></svg></span>`}function myPersonIcon(){return `<span class="person-avatar person-avatar-me" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#d8f7e8"/><circle cx="24" cy="17" r="7" fill="#f4b183"/><path d="M10 39c2-8.5 7.2-12.5 14-12.5S36 30.5 38 39" fill="#ef5da8"/><path d="M17 14c2-6 12-7 15 0-3-2-9-2-15 0" fill="#5b4bb7"/></svg></span>`}function personHTML(p){return `<div class="row"><div class="left"><div class="bubble person">${otherPersonIcon()}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${p.balance>0?'Owes you '+money(p.balance):'Settled'} · Owed ${money(p.totalOwed)} · Repaid ${money(Math.min(p.totalRepaid,p.totalOwed))}</div></div></div><div style="text-align:right"><b class="${p.balance>0?'red':'green'}">${money(p.balance)}</b><div style="margin-top:5px"><button class="smallbtn" onclick="openRepayment('${p.id}')">＋ Repay</button> <button class="smallbtn" onclick="editPerson('${p.id}')">✎</button> <button class="smallbtn" onclick="deletePerson('${p.id}')">🗑</button></div></div></div>`}
function loanPersonBalance(personId){const lent=state.loans.filter(x=>x.person_id===personId&&x.direction==='lend').reduce((s,x)=>s+Number(x.amount||0),0),borrowed=state.loans.filter(x=>x.person_id===personId&&x.direction==='borrow').reduce((s,x)=>s+Number(x.amount||0),0),received=state.loan_repayments.filter(x=>x.person_id===personId&&x.direction==='received').reduce((s,x)=>s+Number(x.amount||0),0),sent=state.loan_repayments.filter(x=>x.person_id===personId&&x.direction==='sent').reduce((s,x)=>s+Number(x.amount||0),0);return {theyOwe:Math.max(0,lent-received),iOwe:Math.max(0,borrowed-sent),lent,borrowed,received,sent}}
function renderLoans(){const balances=state.people.map(p=>({...p,...loanPersonBalance(p.id)})).filter(p=>p.theyOwe||p.iOwe||state.loans.some(l=>l.person_id===p.id));const owed=balances.reduce((s,p)=>s+p.theyOwe,0),owing=balances.reduce((s,p)=>s+p.iOwe,0);$('loansSummary').innerHTML=`<div class="loan-kpis"><div><span>THEY OWE YOU</span><b class="green">${money(owed)}</b></div><div><span>YOU OWE</span><b class="red">${money(owing)}</b></div></div>`;$('loanList').innerHTML=balances.length?balances.map(p=>`<div class="row"><div class="left"><div class="bubble loan">${otherPersonIcon()}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${p.theyOwe?`They owe you ${money(p.theyOwe)}`:p.iOwe?`You owe ${money(p.iOwe)}`:'Settled'}</div></div></div><div style="text-align:right"><b class="${p.theyOwe?'green':p.iOwe?'red':'green'}">${money(p.theyOwe||p.iOwe)}</b><div style="margin-top:5px">${p.theyOwe?`<button class="smallbtn" onclick="openLoanRepayment('${p.id}','received')">＋ Receive</button>`:''}${p.iOwe?`<button class="smallbtn" onclick="openLoanRepayment('${p.id}','sent')">＋ Repay</button>`:''}<button class="smallbtn" onclick="showLoanHistory('${p.id}')">History</button></div></div></div>`).join(''):'<div class="empty">No loans recorded.</div>'}
function openLoanRepayment(id,direction){openModal('loanRepayment',{person_id:id,direction})}
function showLoanHistory(id){
 const p=state.people.find(x=>x.id===id);
 const ls=state.loans.filter(x=>x.person_id===id).sort((a,b)=>String(b.loan_date).localeCompare(String(a.loan_date)));
 const rs=state.loan_repayments.filter(x=>x.person_id===id).sort((a,b)=>String(b.repayment_date).localeCompare(String(a.repayment_date)));
 let h='<h2>'+esc(p?.name||'Person')+' · Loan history</h2>';
 if(!ls.length&&!rs.length)h+='<div class="empty">No loan history.</div>';
 ls.forEach(l=>{h+='<div class="row"><div><b>'+(l.direction==='lend'?'Lent':'Borrowed')+' '+money(l.amount)+'</b><div class="sub">'+fmtDate(l.loan_date)+' · '+esc(l.notes||'')+'</div></div><div><button class="smallbtn" onclick="editLoan(\''+l.id+'\')">✎</button><button class="smallbtn dangerbtn" onclick="deleteLoan(\''+l.id+'\')">🗑</button></div></div>'});
 rs.forEach(r=>{h+='<div class="row"><div><b>'+(r.direction==='received'?'Received':'Repaid')+' '+money(r.amount)+'</b><div class="sub">'+fmtDate(r.repayment_date)+' · '+esc(r.notes||'')+'</div></div><div><button class="smallbtn" onclick="editLoanRepayment(\''+r.id+'\')">✎</button><button class="smallbtn dangerbtn" onclick="deleteLoanRepayment(\''+r.id+'\')">🗑</button></div></div>'});
 openModalRaw(h);
}
function renderPeople(){const all=state.people.map(p=>{const q=peopleBalances().find(x=>x.id===p.id);return q||p});$('peopleList').innerHTML=all.length?all.map(personHTML).join(''):'<div class="empty">Add people once; they will be suggested in split bills.</div>'}
function reminderHTML(r){const overdue=!r.completed&&String(r.due_date).slice(0,10)<=today(),cls=r.completed?'green':overdue?'red':'amber';return `<div class="row"><div class="left"><div class="bubble reminder">${r.completed?'✓':overdue?'⚠️':'🔔'}</div><div><div class="name">${esc(r.title)}</div><div class="sub">${fmtDate(r.due_date)} · <b class="${cls}">${overdue?'⚠️ ':''}${r.completed?'Completed':'Pending'}</b>${r.note?' · '+esc(r.note):''}</div></div></div><div><button class="smallbtn" onclick="toggleReminder('${r.id}',${!r.completed})">${r.completed?'Undo':'Done'}</button><button class="smallbtn" onclick="editReminder('${r.id}')">✎</button><button class="smallbtn dangerbtn" onclick="deleteReminder('${r.id}')">🗑</button></div></div>`}

function renderCalendar(){const y=calCursor.getUTCFullYear(),m=calCursor.getUTCMonth();$('calTitle').textContent=new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m,15)));if($('calendarDate'))$('calendarDate').textContent=periodLabel(selectedDate||today());const firstDay=new Date(Date.UTC(y,m,1)),start=(firstDay.getUTCDay()||7)-1,last=new Date(Date.UTC(y,m+1,0)).getUTCDate(),cells=[];for(let i=0;i<42;i++){const day=i-start+1,valid=day>=1&&day<=last,ds=valid?`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';const sp=valid?personalSpendingBetween(ds,ds):0,recurring=valid?state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,ds)).length:0,heat=sp===0?0:sp<1000?1:sp<3000?2:sp<7000?3:4;cells.push(`<div class="cal-cell heat${heat} ${!valid?'muted':''} ${ds===selectedDate?'selected':''}" ${valid?`data-date="${ds}" onclick="selectDate('${ds}')"`:''}><div class="cal-num">${valid?day:''}</div>${valid&&sp?`<div class="cal-spend red">−${money(sp)}</div>`:''}${recurring?`<span class="recurring-dot" title="${recurring} recurring item${recurring>1?'s':''}">•</span>`:''}</div>`)}$('calGrid').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="cal-day-name">${x}</div>`).join('')+cells.join('');const dayKey=String(selectedDate||today()).slice(0,10),tx=state.transactions.filter(t=>String(t.transaction_date).slice(0,10)===dayKey),income=sumType('income',dayKey),spent=personalSpendingBetween(dayKey,dayKey),transfer=sumType('transfer',dayKey),dayRecurring=state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,dayKey));$('selectedDay').innerHTML=`<div class="total-line"><b>${fmtDate(dayKey)}</b><span class="badge">${tx.length} record${tx.length===1?'':'s'}</span></div><div class="three"><div><div class="label">INCOME</div><b class="green">${money(income)}</b></div><div><div class="label">SPENT</div><b class="red">${money(spent)}</b></div><div><div class="label">TRANSFER</div><b class="purple">${money(transfer)}</b></div></div>${dayRecurring.length?`<div class="selected-recurring"><div class="day-recurring-title"><span>Recurring on this date</span></div>${dayRecurring.map(r=>`<div class="mini-stat"><span>${esc(r.name)}<small>${r.frequency} · ${r.type}</small></span><button class="smallbtn" onclick="useRecurring('${r.id}','${dayKey}')">Use</button></div>`).join('')}</div>`:''}${tx.length?'<div style="margin-top:10px">'+tx.map(txHTML).join('')+'</div>':'<div class="empty">No transactions on this date.</div>'}`;$('reminderList').innerHTML=state.reminders.slice().sort((a,b)=>Number(Boolean(a.completed))-Number(Boolean(b.completed))||String(a.due_date).slice(0,10).localeCompare(String(b.due_date).slice(0,10))).map(reminderHTML).join('')||'<div class="empty">No reminders.</div>'}
function recurringOccursOn(r,ds){const start=String(r.next_date).slice(0,10),d=dateObj(ds),s=dateObj(start);if(ds<start)return false;if(r.frequency==='daily')return true;if(r.frequency==='weekly')return Math.round((d-s)/86400000)%7===0;if(r.frequency==='monthly')return d.getUTCDate()===s.getUTCDate();if(r.frequency==='yearly')return d.getUTCDate()===s.getUTCDate()&&d.getUTCMonth()===s.getUTCMonth();return false}
function useRecurring(id,date=selectedDate){const r=state.recurring_transactions.find(x=>x.id===id);if(!r)return;const ds=String(date||r.next_date||today()).slice(0,10);window.__recurringUseDate=ds;openModal(r.type,null);setTimeout(()=>{const f=$('f');if(!f)return;const sel=$('recurringSelect');if(sel){sel.value=r.id;fillRecurringIntoForm(r.id);}if(f.elements.transaction_date)f.elements.transaction_date.value=ds;if($('recurringOccurrenceDate'))$('recurringOccurrenceDate').value=ds;},0)}

function selectDate(d){const key=String(d).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return;selectedDate=key;const [y,m]=key.split('-').map(Number);calCursor=new Date(Date.UTC(y,m-1,1,12));renderCalendar()}
function moveCal(n){calCursor=new Date(Date.UTC(calCursor.getUTCFullYear(),calCursor.getUTCMonth()+n,1,12));const todayKey=today(),currentKey=`${calCursor.getUTCFullYear()}-${String(calCursor.getUTCMonth()+1).padStart(2,'0')}`;selectedDate=currentKey===todayKey.slice(0,7)?todayKey:`${currentKey}-01`;renderCalendar()}
function monthlySeries(){const y=todayDate().getFullYear(),arr=[];for(let m=0;m<12;m++){const d=new Date(y,m,1),p=localDate(d).slice(0,7),end=new Date(y,m+1,0).toISOString().slice(0,10),inc=sumType('income',p),sp=personalSpendingBetween(p+'-01',end);arr.push({label:d.toLocaleDateString('en-IN',{month:'short'}),income:inc,spent:sp,saved:inc-sp})}return arr}
function setInsightMode(mode){insightMode=mode;renderInsights()}
function populateInsightPeriods(){const ms=$('insightMonth'),ys=$('insightYear');if(!ms||!ys)return;const current=ms.value||ym(),currentYear=ys.value||String(istParts().year),now=todayDate();let opts='';for(let i=0;i<24;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1),v=localDate(d).slice(0,7);opts+=`<option value="${v}">${d.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>`}ms.innerHTML=opts;ms.value=[...ms.options].some(o=>o.value===current)?current:ym();ys.innerHTML=Array.from({length:8},(_,i)=>{const y=now.getFullYear()-i;return `<option value="${y}">${y}</option>`}).join('');ys.value=[...ys.options].some(o=>o.value===currentYear)?currentYear:String(now.getFullYear());document.querySelectorAll('#insightTabs button').forEach((b,i)=>b.classList.toggle('active',(insightMode==='monthly'&&i===0)||(insightMode==='yearly'&&i===1)))}
function card(title,value,detail,cls=''){return `<div class="insight-card"><h3>${title}</h3><strong class="${cls}" style="display:block;font-size:20px;margin-bottom:6px">${value}</strong><p>${detail}</p></div>`}
function selectedInsightRange(){if(insightMode==='yearly'){const y=Number($('insightYear').value);return [`${y}-01-01`,`${y}-12-31`]}const v=$('insightMonth').value||ym(),[y,m]=v.split('-').map(Number);return [v+'-01',localDate(new Date(y,m,0))]}
function trendForCategory(c,month){const vals=[];const [y,m]=month.split('-').map(Number);for(let i=0;i<6;i++){const d=new Date(y,m-1-i,1),p=localDate(d).slice(0,7);vals.push(catSpent(c,[p+'-01',localDate(new Date(d.getFullYear(),d.getMonth()+1,0))]))}const old=vals[5]||0,cur=vals[0]||0;if(old===0)return cur?'New spending this period.':'No spending.';const pct=(cur-old)/old*100;return pct>10?`Rising ${pct.toFixed(0)}% over 6 months.`:pct<-10?`Falling ${Math.abs(pct).toFixed(0)}% over 6 months.`:'Stable over 6 months.'}
function destroyChart(c){try{c?.destroy()}catch(e){}}
function chartTheme(){return {text:getComputedStyle(document.body).getPropertyValue('--ink').trim()||'#1b1822',grid:getComputedStyle(document.body).getPropertyValue('--line').trim()||'#e7e1ed'}}
function pctTooltip(){return {callbacks:{label:ctx=>{const vals=ctx.dataset.data||[];const total=vals.reduce((a,b)=>a+Number(b||0),0);const v=Number(ctx.raw||0);return `${ctx.label}: ${money(v)} (${total?(v/total*100).toFixed(1):0}%)`}}}}
function rootCategory(c){let x=c,guard=0;while(x?.parent_id&&guard++<30){x=state.categories.find(q=>q.id===x.parent_id)||x;if(!x.parent_id)break}return x||c}
function categoryGroups(range){const cats=state.categories.filter(c=>c.type==='expense');const groups=new Map();for(const c of cats){const spent=catSpent(c,range);if(!spent)continue;const root=rootCategory(c);if(!groups.has(root.id))groups.set(root.id,{root,spent:0,items:[]});const g=groups.get(root.id);g.spent+=spent;g.items.push({...c,spent})}return [...groups.values()].sort((a,b)=>b.spent-a.spent)}
function parentGroups(range){return categoryGroups(range).filter(g=>g.spent>0&&state.categories.some(c=>c.type==='expense'&&c.parent_id===g.root.id))}
function dailySpendSeries(a,z){const start=dateObj(a),end=dateObj(z),arr=[];for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const ds=localDate(d);arr.push({label:String(d.getDate()),value:personalSpendingBetween(ds,ds)})}return arr}
function monthlyDailyCashflow(month){const [y,m]=month.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate(),arr=[];for(let day=1;day<=last;day++){const ds=`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`,income=sumType('income',ds),spent=personalSpendingBetween(ds,ds);arr.push({label:String(day),income,spent,saved:income-spent})}return arr}
function renderInsights(){
  populateInsightPeriods();
  const [a,z]=selectedInsightRange();
  const month=$('insightMonth')?.value||ym();
  const year=Number($('insightYear')?.value)||Number(istParts().year);
  const ms=$('insightMonth'),ys=$('insightYear');
  if(insightMode==='yearly'){ms?.classList.add('hidden');ys?.classList.remove('hidden');renderYearInsights(year);return}
  ms?.classList.remove('hidden');ys?.classList.add('hidden');
  destroyChart(categoryChart);destroyChart(trendChart);destroyChart(dailySpendChart);destroyChart(monthlyCashflowChart);destroyChart(yearCategoryChart);destroyChart(topCategoryYearChart);categoryChart=trendChart=dailySpendChart=monthlyCashflowChart=yearCategoryChart=topCategoryYearChart=null;destroySubCategoryCharts();
  const inc=sumType('income',month),sp=personalSpendingBetween(a,z),save=inc-sp,sr=inc?save/inc*100:0;
  const monthLabel=dateObj(month+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'});
  const groups=parentGroups([a,z]);const top=groups.slice(0,3);const total=sp||1;
  const unusual=groups.map(g=>{const vals=[];const [py,pm]=month.split('-').map(Number);for(let i=1;i<=6;i++){const d=new Date(py,pm-1-i,1),p=localDate(d).slice(0,7);vals.push(g.items.reduce((sum,c)=>sum+catSpent(c,[p+'-01',localDate(new Date(d.getFullYear(),d.getMonth()+1,0))]),0))}const avg=vals.reduce((x,y)=>x+y,0)/6;return avg>0&&g.spent>=avg*1.4?{g,pct:(g.spent/avg-1)*100}:null}).filter(Boolean).slice(0,4);
  const [py,pmm]=month.split('-').map(Number);const pd=new Date(py,pmm-2,1),prevKey=localDate(pd).slice(0,7),prevEnd=localDate(new Date(pd.getFullYear(),pd.getMonth()+1,0));const prevSp=personalSpendingBetween(prevKey+'-01',prevEnd),diff=sp-prevSp;
  const lastYearKey=`${py-1}-${String(pmm).padStart(2,'0')}`,lastYearEnd=localDate(new Date(py-1,pmm,0));const lastYearSp=personalSpendingBetween(lastYearKey+'-01',lastYearEnd);
  const budgetRows=state.budgets.filter(b=>b.period==='monthly'&&(!b.year||b.year===py)&&(!b.month||b.month===pmm)).map(b=>({...b,status:budgetStatusForRange(b,a,z)})).sort((x,y)=>y.status.pct-x.status.pct);const budgetOver=budgetRows.filter(b=>b.status.pct>100),budgetNear=budgetRows.filter(b=>b.status.pct>=80&&b.status.pct<=100);
  const goalCards=state.goals.filter(g=>!g.is_completed).slice(0,4).map(g=>{const remain=Math.max(0,Number(g.target_amount)-Number(g.saved_amount));const months=Math.max(1,Number(g.duration_months||remainingMonthsThisYear()));return `<div class="insight-card goal-insight"><h3>${esc(g.icon||'🎯')} ${esc(g.name)}</h3><strong class="purple">${money(remain)}</strong><p>${money(remain/months)}/month needed · ${months} month${months===1?'':'s'} planned.</p></div>`}).join('');
  const savingsMessage=sr>=20?'Excellent — you are meeting the 20% savings benchmark.':sr>=10?'Positive savings, but there is room to strengthen it.':'Savings are below the 20% benchmark; focus on the biggest flexible category first.';
  $('insightKpi').innerHTML=`<div class="card"><div class="label">INCOME</div><strong class="green">${money(inc)}</strong><div class="sub">${monthLabel}</div></div><div class="card"><div class="label">SPENT</div><strong class="red">${money(sp)}</strong><div class="sub">${inc?(sp/inc*100).toFixed(1):0}% of income</div></div><div class="card"><div class="label">SAVED</div><strong class="${save>=0?'green':'red'}">${money(save)}</strong><div class="sub">Savings rate ${sr.toFixed(1)}%</div></div>`;
  $('insightContent').innerHTML=`
    <div class="insight-period-banner"><b>${monthLabel}</b><span>Selected month · data below is only for this month</span></div>
    <div class="insight-section-title">Cash flow</div>
    <div class="insight-grid insight-feature-grid"><div class="insight-card chart-card"><h3>Daily income, expense & savings</h3><div class="chartbox"><canvas id="monthlyCashflowChart"></canvas></div></div><div class="insight-card"><h3>Savings rate</h3><strong class="${sr>=20?'green':sr>=10?'amber':'red'}">${sr.toFixed(1)}%</strong><p>${savingsMessage}</p><div class="benchmark"><span>20% benchmark</span><b>${sr>=20?'✓ On target':`${Math.max(0,20-sr).toFixed(1)} pts to target`}</b></div></div></div>
    <div class="insight-section-title">Where your money went</div>
    <div class="insight-grid insight-feature-grid"><div class="insight-card chart-card"><h3>Spending by parent category</h3><div class="chartbox doughnut-box"><canvas id="categoryChart"></canvas></div></div><div class="insight-card"><h3>Top 3 spending categories</h3>${top.map((g,i)=>`<div class="mini-stat"><span><b>#${i+1} ${esc(g.root.name)}</b><small>${(g.spent/total*100).toFixed(1)}% of spending</small></span><strong>${money(g.spent)}</strong></div>`).join('')||'<p>No spending data yet.</p>'}</div></div>
    ${groups.filter(g=>g.items.some(c=>c.id!==g.root.id)).map(g=>`<div class="insight-card chart-card category-drill"><div class="card-title-row"><h3>${esc(g.root.icon||'🏷️')} ${esc(g.root.name)}</h3><span class="badge">${money(g.spent)} · ${(g.spent/total*100).toFixed(1)}%</span></div><div class="chartbox small-doughnut"><canvas id="subChart_${g.root.id}"></canvas></div></div>`).join('')}
    <div class="insight-card chart-card"><h3>Daily spending — ${monthLabel}</h3><div class="chartbox"><canvas id="dailySpendChart"></canvas></div></div>
    <div class="insight-section-title">Budget & spending control</div>
    <div class="insight-grid"><div class="insight-card"><h3>Budget health</h3><strong class="${budgetOver.length?'red':budgetNear.length?'amber':'green'}">${budgetOver.length?budgetOver.length+' over budget':budgetNear.length?budgetNear.length+' near limit':'On track'}</strong><p>${budgetRows.length?budgetRows.slice(0,4).map(b=>`${esc(b.name)}: ${b.status.pct.toFixed(0)}% used`).join(' · '):'Create monthly budgets to see live budget health.'}</p></div><div class="insight-card"><h3>Budget overshoot warning</h3><strong class="${budgetOver.length?'red':budgetNear.length?'amber':'green'}">${budgetOver.length?'Action needed':budgetNear.length?'Watch closely':'No warning'}</strong><p>${budgetOver.length?budgetOver.map(b=>`${esc(b.name)} is ${b.status.pct.toFixed(0)}% used.`).join(' '):budgetNear.length?budgetNear.map(b=>`${esc(b.name)} is ${b.status.pct.toFixed(0)}% used.`).join(' '):'No category has crossed the 80% threshold.'}</p></div></div>
    <div class="insight-section-title">Patterns & comparisons</div>
    <div class="insight-grid"><div class="insight-card"><h3>Spending pattern</h3><strong>${weekdayInsightForRange(a,z).replace(/^Most spending: /,'')}</strong><p>${salaryWeekInsightForRange(a,z)}</p></div><div class="insight-card"><h3>Unusual spending</h3>${unusual.length?unusual.map(x=>`<div class="alert-row"><b>${esc(x.g.root.name)}</b><span class="red">+${x.pct.toFixed(0)}% vs 6-mo avg</span></div>`).join(''):'<p>No unusual spending spikes detected.</p>'}</div><div class="insight-card"><h3>Month-over-month</h3><strong class="${diff<=0?'green':'red'}">${money(Math.abs(diff))}</strong><p>You spent ${diff<=0?'less':'more'} than ${pd.toLocaleDateString('en-IN',{month:'long'})}. Biggest driver: ${compareDriverForRange(month,prevKey,a,z)}.</p></div><div class="insight-card"><h3>Year-over-year</h3><strong class="${lastYearSp?(sp<=lastYearSp?'green':'red'):''}">${lastYearSp?money(Math.abs(sp-lastYearSp)):'—'}</strong><p>${lastYearSp?`This month is ${sp<=lastYearSp?'lower':'higher'} than the same month last year.`:'Not enough data for the same month last year yet.'}</p></div></div>
    <div class="insight-section-title">Goals & next month</div>
    <div class="insight-grid">${goalCards||'<div class="insight-card"><p>No active goals. Add a goal to see the monthly amount required.</p></div>'}<div class="insight-card"><h3>Next-month forecast</h3><strong class="purple">${money(nextMonthPrediction())}</strong><p>Recurring expenses due next month plus recent variable-spend baseline.</p></div><div class="insight-card"><h3>Savings runway</h3><strong class="${runway().includes('Not enough')?'amber':'purple'}">${runway()}</strong><p>Net amount available ÷ average monthly personal spending. Credit-card balances are included through account balance.</p></div></div>`;
  if(window.Chart){const ct=chartTheme();
    const colors=['#5d8ed8','#c9708b','#e5a15f','#59a77e','#7666cf','#d89c45','#8b7bd6','#6f98d8','#b96b9a','#5ca8a0'];
    const cc=$('categoryChart');if(cc)categoryChart=new Chart(cc,{type:'doughnut',data:{labels:groups.map(g=>g.root.name),datasets:[{data:groups.map(g=>g.spent),backgroundColor:groups.map((g,i)=>colors[i%colors.length]),borderWidth:2,borderColor:getComputedStyle(document.body).getPropertyValue('--card').trim()}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:ct.text,generateLabels:chart=>{const ds=chart.data.datasets[0]||{data:[]};const total=ds.data.reduce((a,b)=>a+Number(b||0),0);return chart.data.labels.map((label,i)=>({text:`${label} ${total?(Number(ds.data[i]||0)/total*100).toFixed(1):'0.0'}%`,fillStyle:ds.backgroundColor[i],strokeStyle:ds.borderColor[i],lineWidth:1,hidden:false,index:i}))}}},tooltip:pctTooltip()}}});
    groups.filter(g=>g.items.some(c=>c.id!==g.root.id)).forEach((g,i)=>{const el=$(`subChart_${g.root.id}`);if(!el)return;const items=g.items.filter(c=>c.id!==g.root.id);const ch=new Chart(el,{type:'doughnut',data:{labels:items.map(c=>c.name),datasets:[{data:items.map(c=>c.spent),backgroundColor:items.map((c,j)=>colors[(i+j+2)%colors.length]),borderWidth:2,borderColor:getComputedStyle(document.body).getPropertyValue('--card').trim()}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:ct.text,generateLabels:chart=>{const ds=chart.data.datasets[0]||{data:[]};const total=ds.data.reduce((a,b)=>a+Number(b||0),0);return chart.data.labels.map((label,i)=>({text:`${label} ${total?(Number(ds.data[i]||0)/total*100).toFixed(1):'0.0'}%`,fillStyle:ds.backgroundColor[i],strokeStyle:ds.borderColor[i],lineWidth:1,hidden:false,index:i}))}}},tooltip:pctTooltip()}}});el._chart=ch;subCategoryCharts.push(ch)});
    const daily=dailySpendSeries(a,z),dc=$('dailySpendChart');if(dc)dailySpendChart=new Chart(dc,{type:'bar',data:{labels:daily.map(x=>x.label),datasets:[{label:'Spent',data:daily.map(x=>x.value),backgroundColor:ctx=>{const vals=ctx.chart.data.datasets[0]?.data||[];const v=Number(ctx.raw||0),mx=Math.max(...vals.map(Number),1),alpha=.18+.82*(v/mx);return `rgba(118,102,207,${alpha.toFixed(3)})`;},borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:ct.text}}},scales:{x:{ticks:{color:ct.text},grid:{color:ct.grid}},y:{beginAtZero:true,ticks:{color:ct.text},grid:{color:ct.grid}}}}});
    const dailyCash=monthlyDailyCashflow(month);const mc=$('monthlyCashflowChart');if(mc)monthlyCashflowChart=new Chart(mc,{type:'line',data:{labels:dailyCash.map(x=>x.label),datasets:[{label:'Income',data:dailyCash.map(x=>x.income),borderColor:'#5d8ed8',backgroundColor:'rgba(93,142,216,.08)',tension:.3,fill:false},{label:'Spent',data:dailyCash.map(x=>x.spent),borderColor:'#c95d5b',backgroundColor:'rgba(201,93,91,.08)',tension:.3,fill:false},{label:'Saved',data:dailyCash.map(x=>x.saved),borderColor:'#59a77e',backgroundColor:'rgba(89,167,126,.08)',tension:.3,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:ct.text}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${money(ctx.raw)}`}}},scales:{x:{ticks:{color:ct.text},grid:{color:ct.grid}},y:{beginAtZero:true,ticks:{color:ct.text},grid:{color:ct.grid}}}}});
  }
}
function renderYearInsights(year){
  destroyChart(categoryChart);destroyChart(trendChart);destroyChart(dailySpendChart);destroyChart(monthlyCashflowChart);destroyChart(yearCategoryChart);destroyChart(topCategoryYearChart);
  categoryChart=trendChart=dailySpendChart=monthlyCashflowChart=yearCategoryChart=topCategoryYearChart=null;destroySubCategoryCharts();
  const a=`${year}-01-01`,z=`${year}-12-31`,series=monthlySeriesForYear(year);
  const inc=series.reduce((s,x)=>s+x.income,0),sp=series.reduce((s,x)=>s+x.spent,0),save=inc-sp,sr=inc?save/inc*100:0;
  const groups=parentGroups([a,z]),total=sp||1,top=groups.slice(0,3);
  const best=series.reduce((x,y)=>y.saved>x.saved?y:x,series[0]||{label:'—',saved:0});
  const worst=series.reduce((x,y)=>y.spent>x.spent?y:x,series[0]||{label:'—',spent:0});
  const activeMonths=series.filter(x=>x.income||x.spent).length;const avgSpend=activeMonths?sp/activeMonths:0;
  const prevYear=year-1,prevSp=personalSpendingBetween(`${prevYear}-01-01`,`${prevYear}-12-31`);
  const consistency=series.filter(x=>x.income>0&&x.spent<=x.income).length;
  const goalCards=state.goals.filter(g=>!g.is_completed).slice(0,4).map(g=>{
    const remain=Math.max(0,Number(g.target_amount)-Number(g.saved_amount));
    const months=Math.max(1,Number(g.duration_months||remainingMonthsThisYear()));
    return `<div class="insight-card goal-insight"><h3>${esc(g.icon||'🎯')} ${esc(g.name)}</h3><strong class="purple">${money(remain)}</strong><p>${money(remain/months)}/month needed · ${months} month${months===1?'':'s'} planned.</p></div>`;
  }).join('');
  const bestMonth=best?.label||'—',worstMonth=worst?.label||'—';
  const yearTakeaway=sr>=20?`You saved ${sr.toFixed(1)}% of income this year — above the 20% benchmark.`:sr>0?`You saved ${sr.toFixed(1)}% of income this year. There is room to improve your savings rate.`:`Spending has matched or exceeded tracked income this year. Focus on reducing the largest categories.`;
  $('insightKpi').innerHTML=`<div class="card"><div class="label">TOTAL INCOME</div><strong class="green">${money(inc)}</strong><div class="sub">Year ${year}</div></div><div class="card"><div class="label">TOTAL SPENT</div><strong class="red">${money(sp)}</strong><div class="sub">${inc?(sp/inc*100).toFixed(1):0}% of income</div></div><div class="card"><div class="label">TOTAL SAVED</div><strong class="${save>=0?'green':'red'}">${money(save)}</strong><div class="sub">Savings rate ${sr.toFixed(1)}%</div></div>`;
  $('insightContent').innerHTML=`
    <div class="insight-period-banner"><b>Year ${year}</b><span>Selected year · data below is only for ${year}</span></div>
    <div class="insight-section-title">Annual cash flow</div>
    <div class="insight-grid insight-feature-grid">
      <div class="insight-card chart-card"><h3>Income, expense & savings by month</h3><div class="chartbox"><canvas id="yearCashflowChart"></canvas></div></div>
      <div class="insight-card chart-card"><h3>Savings rate by month</h3><div class="chartbox"><canvas id="yearSavingsChart"></canvas></div></div>
    </div>
    <div class="insight-grid insight-feature-grid">
      <div class="insight-card chart-card"><h3>Spending by parent category</h3><div class="chartbox doughnut-box"><canvas id="yearCategoryChart"></canvas></div></div>
      <div class="insight-card chart-card"><h3>Top 3 spending categories</h3>${top.map((g,i)=>`<div class="mini-stat"><span><b>#${i+1} ${esc(g.root.name)}</b><small>${(g.spent/total*100).toFixed(1)}% of spending</small></span><strong>${money(g.spent)}</strong></div>`).join('')||'<p>No spending data yet.</p>'}</div>
    </div>
    <div class="insight-card chart-card"><h3>Spending trend across ${year}</h3><div class="chartbox"><canvas id="yearTrendChart"></canvas></div></div>
    <div class="insight-section-title">Financial health</div>
    <div class="insight-grid">
      <div class="insight-card"><h3>Savings rate</h3><strong class="${sr>=20?'green':sr>0?'amber':'red'}">${sr.toFixed(1)}%</strong><p>${yearTakeaway}</p><div class="benchmark"><span>20% benchmark</span><b>${sr>=20?'✓ On target':`${Math.max(0,20-sr).toFixed(1)} pts to target`}</b></div></div>
      <div class="insight-card"><h3>Average monthly spending</h3><strong class="red">${money(avgSpend)}</strong><p>Average tracked personal spending across ${year}.</p></div>
      <div class="insight-card"><h3>Best savings month</h3><strong class="green">${bestMonth}</strong><p>${money(best?.saved||0)} saved in the strongest savings month.</p></div>
      <div class="insight-card"><h3>Highest spending month</h3><strong class="red">${worstMonth}</strong><p>${money(worst?.spent||0)} spent in the highest-spending month.</p></div>
      <div class="insight-card"><h3>Budget consistency</h3><strong class="${consistency>=10?'green':consistency>=6?'amber':'red'}">${consistency}/12 months</strong><p>Months where tracked spending did not exceed tracked income.</p></div>
      <div class="insight-card"><h3>Year-over-year</h3><strong class="${prevSp?(sp<=prevSp?'green':'red'):''}">${prevSp?money(Math.abs(sp-prevSp)):'—'}</strong><p>${prevSp?`You spent ${sp<=prevSp?'less':'more'} than ${prevYear} by ${money(Math.abs(sp-prevSp))}.`:`Not enough data for ${prevYear} yet.`}</p></div>
    </div>
    <div class="insight-section-title">Goals & outlook</div>
    <div class="insight-grid">${goalCards||'<div class="insight-card"><p>No active goals. Add a goal to see the monthly amount required.</p></div>'}<div class="insight-card"><h3>Financial takeaway</h3><strong class="${sr>=20?'green':sr>0?'amber':'red'}">${sr>=20?'On track':sr>0?'Needs attention':'Needs action'}</strong><p>${yearTakeaway}</p></div></div>`;
  if(window.Chart){
    const ct=chartTheme();
    const colors=['#5d8ed8','#c9708b','#e5a15f','#59a77e','#7666cf','#d89c45','#8b7bd6','#6f98d8','#b96b9a','#5ca8a0'];
    const border=getComputedStyle(document.body).getPropertyValue('--card').trim();
    const yc=$('yearCashflowChart');if(yc)monthlyCashflowChart=new Chart(yc,{type:'line',data:{labels:series.map(x=>x.label),datasets:[
      {label:'Income',data:series.map(x=>x.income),borderColor:'#5d8ed8',backgroundColor:'rgba(93,142,216,.12)',tension:.35},
      {label:'Spent',data:series.map(x=>x.spent),borderColor:'#c95d5b',backgroundColor:'rgba(201,93,91,.10)',tension:.35},
      {label:'Saved',data:series.map(x=>x.saved),borderColor:'#59a77e',backgroundColor:'rgba(89,167,126,.10)',tension:.35}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:ct.text}}},scales:{x:{ticks:{color:ct.text},grid:{color:ct.grid}},y:{beginAtZero:true,ticks:{color:ct.text},grid:{color:ct.grid}}}}});
    const ys=$('yearSavingsChart');if(ys)trendChart=new Chart(ys,{type:'bar',data:{labels:series.map(x=>x.label),datasets:[{label:'Savings rate',data:series.map(x=>x.income?Math.max(-100,x.saved/x.income*100):0),backgroundColor:'#59a77e',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:ct.text},grid:{display:false}},y:{beginAtZero:true,ticks:{color:ct.text,callback:v=>v+'%'},grid:{color:ct.grid}}}}});
    const yc2=$('yearCategoryChart');if(yc2)yearCategoryChart=new Chart(yc2,{type:'doughnut',data:{labels:groups.map(g=>g.root.name),datasets:[{data:groups.map(g=>g.spent),backgroundColor:groups.map((g,i)=>colors[i%colors.length]),borderWidth:2,borderColor:border}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:ct.text,generateLabels:chart=>{const ds=chart.data.datasets[0]||{data:[]};const total=ds.data.reduce((a,b)=>a+Number(b||0),0);return chart.data.labels.map((label,i)=>({text:`${label} ${total?(Number(ds.data[i]||0)/total*100).toFixed(1):'0.0'}%`,fillStyle:ds.backgroundColor[i],strokeStyle:ds.borderColor[i],lineWidth:1,hidden:false,index:i}))}}},tooltip:pctTooltip()}}});
    const yt=$('yearTrendChart');if(yt)topCategoryYearChart=new Chart(yt,{type:'line',data:{labels:series.map(x=>x.label),datasets:[{label:'Total spent',data:series.map(x=>x.spent),borderColor:'#c9708b',backgroundColor:'rgba(201,112,139,.10)',tension:.35,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:ct.text}}},scales:{x:{ticks:{color:ct.text},grid:{color:ct.grid}},y:{beginAtZero:true,ticks:{color:ct.text},grid:{color:ct.grid}}}}});
  }
}
function monthlySeriesForYear(y){const arr=[];for(let m=0;m<12;m++){const d=new Date(y,m,1),p=localDate(d).slice(0,7),end=localDate(new Date(y,m+1,0)),inc=sumType('income',p),sp=personalSpendingBetween(p+'-01',end);arr.push({label:d.toLocaleDateString('en-IN',{month:'short'}),income:inc,spent:sp,saved:inc-sp})}return arr}
function weekdayInsightForRange(a,z){const counts=[0,0,0,0,0,0,0];state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&(t.type==='expense'||t.type==='split')).forEach(t=>counts[dateObj(t.transaction_date).getDay()]+=spending(t));const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],max=Math.max(...counts);return max?`Most spending: <b>${names[counts.indexOf(max)]}</b> (${money(max)}).`:'Not enough data yet.'}
function salaryWeekInsightForRange(a,z){const by=[0,0,0,0];state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&(t.type==='expense'||t.type==='split')).forEach(t=>{const d=dateObj(t.transaction_date).getDate();by[Math.min(3,Math.floor((d-1)/7))]+=spending(t)});const i=by.indexOf(Math.max(...by));return `Highest spending week: <b>${['first','second','third','fourth'][i]}</b> week (${money(by[i])}).`}
function budgetWarningForMonth(month){const [y,m]=month.split('-').map(Number),bs=state.budgets.filter(b=>b.period==='monthly'&&(!b.year||b.year===y)&&(!b.month||b.month===m));if(!bs.length)return 'No monthly budgets created.';const daysInMonth=new Date(y,m,0).getDate(),daysLeft=month===ym()?daysInMonth-todayDate().getDate():0;const warnings=bs.map(b=>{const s=budgetStatus(b);return s.pct>=80&&daysLeft>0?`${esc(b.name)} is at <b>${s.pct.toFixed(0)}%</b> with ${daysLeft} days left.`:null}).filter(Boolean);return warnings.length?warnings.join(' '):'No 80% mid-month warning.'}

function trendText(cid){const vals=[];for(let i=0;i<3;i++){const d=todayDate();d.setMonth(d.getMonth()-i);const p=localDate(d).slice(0,7);vals.unshift(catSpent(state.categories.find(c=>c.id===cid),[p+'-01',localDate(new Date(d.getFullYear(),d.getMonth()+1,0))]))}if(vals[2]>vals[0]*1.15)return 'rising over the last 3 months.';if(vals[2]<vals[0]*.85)return 'falling over the last 3 months.';return 'roughly steady over the last 3 months.'}
function weekdayInsight(){const counts=[0,0,0,0,0,0,0];state.transactions.filter(t=>t.type==='expense'||t.type==='split').forEach(t=>counts[dateObj(t.transaction_date).getDay()]+=spending(t));const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];const max=Math.max(...counts);return max?`You spend most on <b>${names[counts.indexOf(max)]}</b> (${money(max)} in tracked spending).`:'Not enough data for weekday patterns.'}
function salaryWeekInsight(){const by=[0,0,0,0];state.transactions.filter(t=>t.type==='expense'||t.type==='split').forEach(t=>{const d=dateObj(t.transaction_date).getDate();by[Math.min(3,Math.floor((d-1)/7))]+=spending(t)});const i=by.indexOf(Math.max(...by));return `Spending is highest in the <b>${['first','second','third','fourth'][i]} week</b> of the month (${money(by[i])}).`}
function ratioFixed(){const m=ym(),fixedCats=state.categories.filter(c=>c.parent_id||/fixed/i.test(c.name)).map(c=>c.id);const total=personalSpendingBetween(m+'-01',today());const fixed=state.transactions.filter(t=>t.transaction_date>=m+'-01'&&t.transaction_date<=today()&&(t.type==='expense'||t.type==='split')&&fixedCats.includes(t.category_id)).reduce((s,t)=>s+spending(t),0);return {fixed:total?fixed/total*100:0,variable:total?100-fixed/total*100:0}}
function netWorth(){const receivable=peopleBalances().reduce((s,p)=>s+Number(p.balance||0),0);const payable=peopleBalances().reduce((s,p)=>s+Number(p.loanIowe||0),0);return Number(totalBalance()||0)+receivable-payable}
function runway(){const vals=[];const now=todayDate();for(let i=1;i<=6;i++){const d=new Date(now);d.setMonth(d.getMonth()-i);const p=localDate(d).slice(0,7),end=localDate(new Date(d.getFullYear(),d.getMonth()+1,0));const v=personalSpendingBetween(p+'-01',end);if(v>0)vals.push(v)}const current=personalSpendingBetween(ym()+'-01',today());if(current>0)vals.push(current);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;const net=Math.max(0,netWorth());if(avg<=0)return '0.0 months';return `${Math.max(0,net/avg).toFixed(1)} months`}
function monthCompare(){const d=todayDate();const cur=localDate(d).slice(0,7);d.setMonth(d.getMonth()-1);const prev=localDate(d).slice(0,7),a=personalSpendingBetween(cur+'-01',today()),b=personalSpendingBetween(prev+'-01',localDate(new Date(d.getFullYear(),d.getMonth()+1,0))),diff=b-a;return `Month-over-month: you spent <b>${money(Math.abs(diff))}</b> ${diff>=0?'less':'more'} than last month. Biggest category driver: ${compareDriver(cur,prev)}.`}
function compareDriverForRange(cur,prev,a,z){const ids=[...new Set(state.categories.filter(c=>c.type==='expense').map(c=>c.id))];let best={name:'—',diff:0};ids.forEach(id=>{const c=state.categories.find(x=>x.id===id);const aa=catSpent(c,[a,z]);const d=dateObj(prev+'-01'),bb=catSpent(c,[prev+'-01',localDate(new Date(d.getFullYear(),d.getMonth()+1,0))]),df=Math.abs(aa-bb);if(df>best.diff)best={name:c.name,diff:df}});return `${esc(best.name)} (${money(best.diff)} difference)`}
function compareDriver(cur,prev){const ids=[...new Set(state.categories.filter(c=>c.type==='expense').map(c=>c.id))];let best={name:'—',diff:0};ids.forEach(id=>{const c=state.categories.find(x=>x.id===id),a=catSpent(c,[cur+'-01',today()]),d=dateObj(prev+'-01'),b=catSpent(c,[prev+'-01',localDate(new Date(d.getFullYear(),d.getMonth()+1,0))]),df=Math.abs(a-b);if(df>best.diff)best={name:c.name,diff:df}});return `${esc(best.name)} (${money(best.diff)} difference)`}
function yearCompare(){const now=todayDate(),p=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'),old=(now.getFullYear()-1)+'-'+String(now.getMonth()+1).padStart(2,'0');if(!state.transactions.some(t=>String(t.transaction_date).startsWith(old)))return 'Year-over-year: not enough data for the same month last year yet.';const a=personalSpendingBetween(p+'-01',today()),b=personalSpendingBetween(old+'-01',localDate(new Date(now.getFullYear()-1,now.getMonth()+1,0)));return `Year-over-year: this month spending is ${money(Math.abs(a-b))} ${a<=b?'lower':'higher'} than the same month last year.`}
function nextMonthPrediction(){const recurring=state.recurring_transactions.filter(r=>r.active&&r.type==='expense'&&r.frequency==='monthly').reduce((s,r)=>s+Number(r.amount||0),0);let vals=[];for(let i=1;i<=3;i++){const d=todayDate();d.setMonth(d.getMonth()-i);const p=localDate(d).slice(0,7),end=localDate(new Date(d.getFullYear(),d.getMonth()+1,0));vals.push(personalSpendingBetween(p+'-01',end))}const avg=vals.reduce((a,b)=>a+b,0)/(vals.length||1);return Math.max(recurring,avg)}
function budgetWarning(){const b=state.budgets.find(x=>x.period==='monthly'&&x.category_id);if(!b)return 'Budget overshoot warning: create a monthly budget to get mid-month alerts.';const s=budgetStatus(b),days=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(),left=days-new Date().getDate();if(s.pct>=80&&left>0)return `⚠️ ${esc(b.name)} is at <b>${s.pct.toFixed(0)}%</b> with ${left} days left.`;return 'Budget overshoot warning: no current 80% mid-month warning.'}
function sel(name,items,value='',required=true){return `<select name="${name}" ${required?'required':''}><option value="">Select ${name.replace(/_/g,' ')}</option>${items.map(x=>`<option value="${esc(x.id)}" ${x.id===value?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`}
function categoryOptions(type,value='',includeAll=false){const cats=state.categories.filter(c=>c.type===type&&c.is_active!==false);return `<select name="category_id" ${includeAll?'':'required'}><option value="">${includeAll?'No category':'Select category'}</option>${cats.filter(c=>!c.parent_id).map(p=>`<option value="${p.id}" ${p.id===value?'selected':''}>${esc(p.icon||'')} ${esc(p.name)}</option>`).join('')}${cats.filter(c=>c.parent_id).map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>↳ ${esc(c.name)} (${esc(catName(c.parent_id))})</option>`).join('')}</select>`}
function remainingMonthsThisYear(){const p=istParts();return 12-Number(p.month)+1}
function updateGoalPlan(){const target=Number($('goalTarget')?.value||0),months=Math.max(1,Number($('goalMonths')?.value||remainingMonthsThisYear())),el=$('goalPlanPreview');if(!el)return;const saved=Number($('goalExisting')?.value??el.dataset.saved??0),remain=Math.max(0,target-saved);el.innerHTML=target>0?`Save <b>${money(remain/months)}</b> per month for ${months} month${months===1?'':'s'}.`:'Enter target amount to calculate monthly saving.';const p=istParts(),d=new Date(Date.UTC(Number(p.year),Number(p.month)-1,1,12));d.setUTCMonth(d.getUTCMonth()+months);d.setUTCDate(0);const td=$('goalTargetDate');if(td&&!td.dataset.manual)td.value=localDate(d)}
function openModal(type,data=null){if(type==='settings'){openSettings();return}let h='';if(type==='category')h=categoryModal();else if(type==='account')h=`<h2>${data?'Edit':'Add'} account</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Type</label><select name="type"><option value="bank">Bank</option><option value="cash">Cash</option><option value="card">Credit Card</option><option value="wallet">Wallet/UPI</option><option value="investment">Investment</option><option value="savings">Savings</option></select><label>Currency</label><input name="currency" value="${esc(data?.currency||'INR')}"><label>Opening balance</label><input name="opening_balance" type="number" step="0.01" value="${data?.opening_balance??0}"><button class="primary">Save account</button></form>`;
else if(type==='budget')h=`<h2>${data?'Edit':'Add'} budget</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Category</label>${categoryOptions('expense',data?.category_id)}<label>Amount</label><input name="amount" type="number" step="0.01" min="0" required value="${data?.amount??''}"><label>Period</label><select name="period"><option value="weekly" ${data?.period==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.period==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.period==='yearly'?'selected':''}>Yearly</option></select><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save budget</button></form>`;
else if(type==='goal')h=`<h2>${data?'Edit':'Add'} goal</h2><form id="f"><label>Goal name</label><input name="name" required value="${esc(data?.name||'')}" placeholder="Stocks"><label>Target amount</label><input id="goalTarget" name="target_amount" type="number" step="0.01" min="0.01" required value="${data?.target_amount??''}" oninput="updateGoalPlan()"><label>Number of months to reach goal</label><input id="goalMonths" name="duration_months" type="number" min="1" step="1" required value="${data?.duration_months??remainingMonthsThisYear()}" oninput="updateGoalPlan()"><div id="goalPlanPreview" class="goal-plan" data-saved="${data?.saved_amount||0}">Enter target amount to calculate monthly saving.</div><label>Target date</label><input id="goalTargetDate" name="target_date" type="date" value="${esc(data?.target_date||'')}" oninput="this.dataset.manual='1'"><label>Icon</label><input name="icon" value="${esc(data?.icon||'🎯')}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save goal</button></form>`;
else if(type==='loan')h=`<h2>${data?'Edit':'Record'} loan</h2><form id="f"><label>Type</label><select name="direction"><option value="lend" ${data?.direction==='lend'?'selected':''}>I lend money</option><option value="borrow" ${data?.direction==='borrow'?'selected':''}>I borrow money</option></select><label>Person</label>${sel('person_id',state.people,data?.person_id||'',true)}<label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Date</label><input name="loan_date" type="date" required value="${esc(data?.loan_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${data?'Update loan':'Save loan'}</button></form>`;else if(type==='loanRepayment')h=`<h2>Record loan repayment</h2><form id="f"><label>Person</label>${sel('person_id',state.people,data?.person_id||'',true)}<label>Direction</label><select name="direction"><option value="received" ${data?.direction==='received'?'selected':''}>I received money back</option><option value="sent" ${data?.direction==='sent'?'selected':''}>I repaid money</option></select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Date</label><input name="repayment_date" type="date" required value="${today()}"><label>Notes</label><textarea name="notes"></textarea><button class="primary">Save repayment</button></form>`;else if(type==='person')h=`<h2>${data?'Edit':'Add'} person</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}" placeholder="Sandy"><label>Phone</label><input name="phone" value="${esc(data?.phone||'')}"><label>Email</label><input name="email" type="email" value="${esc(data?.email||'')}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save person</button></form>`;
else if(type==='income'||type==='expense')h=`<h2>${data?'Edit':'Add'} ${type}</h2><form id="f"><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" required value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id)}<label>Category</label>${categoryOptions(type,data?.category_id)}<label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save transaction</button></form>`;
else if(type==='transfer')h=`<h2>${data?'Edit':'New'} transfer</h2><form id="f"><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>From account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>To account</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',true)}<label>Goal contribution (optional)</label>${sel('goal_id',state.goals,data?.goal_id||'',false)}<label>Date</label><input name="transaction_date" type="date" value="${esc(data?.transaction_date||today())}" required><label>Note</label><input name="description" value="${esc(data?.description||'Transfer')}"><label class="checkrow"><input type="checkbox" name="make_recurring" value="1"> Make this recurring</label><div class="recurring-options"><label>Frequency</label><select name="recurring_frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select><label>First due date</label><input name="recurring_next_date" type="date" value="${esc(data?.transaction_date||today())}"></div><button class="primary">${data?'Update transfer':'Save transfer'}</button></form>`;
else if(type==='split')h=splitForm(data);else if(type==='repayment'||type==='repaymentEdit')h=`<h2>${type==='repaymentEdit'?'Edit repayment':'Record repayment'}</h2><form id="f"><label>Person</label>${sel('person_id',state.people,data?.person_id||'',true)}<label>Amount received</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Account received into</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Date</label><input name="reimbursement_date" type="date" value="${esc(data?.reimbursement_date||data?.transaction_date||today())}" required><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${type==='repaymentEdit'?'Update repayment':'Save repayment'}</button></form>`;
else if(type==='reminder')h=`<h2>${data?'Edit':'Add'} reminder</h2><form id="f"><label>Title</label><input name="title" required value="${esc(data?.title||'')}" placeholder="Pay electricity bill"><label>Due date</label><input name="due_date" type="date" required value="${esc(data?.due_date||today())}"><label>Note</label><textarea name="note">${esc(data?.note||'')}</textarea><button class="primary">Save reminder</button></form>`;
else if(type==='recurring')h=`<h2>${data?'Edit':'Add'} recurring transaction</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}" placeholder="Netflix"><label>Type</label><select name="type"><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" required value="${esc(data?.description||'')}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>To account (transfer only)</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',false)}<label>Category</label>${categoryOptions('expense',data?.category_id,true)}<label>Frequency</label><select name="frequency"><option value="daily" ${data?.frequency==='daily'?'selected':''}>Daily</option><option value="weekly" ${data?.frequency==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.frequency==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.frequency==='yearly'?'selected':''}>Yearly</option></select><label>Next due date</label><input name="next_date" type="date" required value="${esc(data?.next_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save recurring</button></form>`;
else return;openModalRaw(h);$('f')?.addEventListener('submit',async e=>{e.preventDefault();await submitForm(type,data,e.target)});if(type==='split')renderSplitRows();if(type==='goal')updateGoalPlan()}
function categoryModal(){return `<h2>Categories</h2><form id="f"><label>Name</label><input name="name" required placeholder="Rent"><label>Type</label><select name="type"><option value="expense">Expense</option><option value="income">Income</option></select><label>Parent category (optional)</label>${categoryParentSelect()}<label>Icon</label><input name="icon" value="🏷️"><label>Color</label><input name="color" value="#7666cf"><button class="primary">Add category</button></form><div class="section"><h2>Existing categories</h2></div>${state.categories.filter(c=>!c.parent_id).map(p=>`<div class="row"><div class="left"><div class="bubble">${esc(p.icon||'🏷️')}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${esc(p.type)} · parent</div>${state.categories.filter(c=>c.parent_id===p.id).map(c=>`<div class="tree"><div class="row"><div><div class="name">↳ ${esc(c.name)}</div><div class="sub">${esc(c.type)} · subcategory</div></div><div><button type="button" class="smallbtn" onclick="editCategory('${c.id}')">✎</button> <button type="button" class="smallbtn" onclick="deleteCategory('${c.id}')">🗑</button></div></div></div>`).join('')}</div></div><div><button type="button" class="smallbtn" onclick="editCategory('${p.id}')">✎</button> <button type="button" class="smallbtn" onclick="deleteCategory('${p.id}')">🗑</button></div></div>`).join('')}`}
function categoryParentSelect(value='',type='expense',excludeId=''){const parents=state.categories.filter(c=>!c.parent_id&&c.id!==excludeId&&(c.type===type||c.type==='both'));return `<select name="parent_id"><option value="">No parent</option>${parents.map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>${esc(c.icon||'🏷️')} ${esc(c.name)}${c.type==='both'?' · Both':''}</option>`).join('')}</select>`}

function splitForm(data=null){
  splitMode=data?.split_type||'equal';
  splitIncludeMe=data?Number(data?.my_share||0)>0:true;
  splitRows=[];
  if(data?.id){
    splitRows=[{person_id:'__me__',amount:Number(data?.my_share||0),isMe:true},...state.split_participants.filter(x=>x.split_transaction_id===data.id).map(x=>({person_id:x.person_id,amount:Number(x.amount||0),isMe:false}))];
  }
  if(!splitRows.length)splitRows=[{person_id:'__me__',amount:0,isMe:true},{person_id:'',amount:0,isMe:false},{person_id:'',amount:0,isMe:false}];
  return `<h2>${data?'Edit':'Split'} bill</h2><form id="f"><label>Total bill</label><input id="splitTotal" name="total_amount" type="number" step="0.01" min="0.01" required value="${data?.total_amount??''}" oninput="recalcSplit()"><label>Description</label><input name="description" required value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><label>Paid from</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Category</label>${categoryOptions('expense',data?.category_id)}<label>Split type</label><div class="mode"><button type="button" id="eq" class="${splitMode==='equal'?'selected':''}" onclick="setSplitMode('equal')">Equal split</button><button type="button" id="uneq" class="${splitMode==='unequal'?'selected':''}" onclick="setSplitMode('unequal')">Unequal split</button></div><input type="hidden" name="split_type" id="splitType" value="${splitMode}"><label class="checkrow split-me-check"><input type="checkbox" id="splitIncludeMe" ${splitIncludeMe?'checked':''} onchange="splitIncludeMe=this.checked;recalcSplit()"> Include me in the split</label><div class="notice">Your name is taken from your nickname. Keep your share at ₹0 when you are not part of the bill. Equal split automatically recalculates every share when people are selected.</div><div id="peopleRows"></div><button type="button" class="secondary" onclick="addSplitPerson()">＋ Add person</button><div class="split-summary" id="splitPreview"></div><button class="primary">${data?'Update split':'Save split'}</button></form>`;
}
function setSplitMode(m){splitMode=m;if($('splitType'))$('splitType').value=m;$('eq')?.classList.toggle('selected',m==='equal');$('uneq')?.classList.toggle('selected',m==='unequal');renderSplitRows()}
function addSplitPerson(){splitRows.push({person_id:'',amount:0,isMe:false});renderSplitRows()}
function splitPersonOptions(index,value=''){
  return `<select id="split_person_${index}" aria-label="Split person ${index+1}" onchange="splitRows[${index}].person_id=this.value;recalcSplit()"><option value="">Select split person ${index+1}</option>${state.people.map(p=>`<option value="${esc(p.id)}" ${p.id===value?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`;
}
function renderSplitRows(){
  const el=$('peopleRows');if(!el)return;
  el.innerHTML=splitRows.map((r,i)=>{const isMe=r.isMe||r.person_id==='__me__';return `<div class="person-grid"><div class="split-person-label">${isMe?`${myPersonIcon()} <span>${esc(getNickname())}</span>`:splitPersonOptions(i,r.person_id)}</div><input id="split_amount_${i}" type="number" step="0.01" min="0" value="${r.amount||''}" placeholder="Share" ${splitMode==='equal'?'readonly':''} oninput="splitRows[${i}].amount=Number(this.value)||0;recalcSplit()"><button type="button" class="smallbtn" ${isMe?'disabled':''} onclick="splitRows.splice(${i},1);renderSplitRows()">×</button></div>`}).join('');
  recalcSplit();
}
function recalcSplit(){
  // Always take the current checkbox state from the DOM. This prevents stale
  // splitIncludeMe state when switching between Equal/Unequal modes.
  const meCheckbox=$('splitIncludeMe');
  if(meCheckbox)splitIncludeMe=!!meCheckbox.checked;
  const total=Math.round((Number($('splitTotal')?.value)||0)*100)/100;
  const me=splitRows.find(r=>r.isMe||r.person_id==='__me__');
  const others=splitRows.filter(r=>!(r.isMe||r.person_id==='__me__')&&r.person_id);
  if(me&&!splitIncludeMe)me.amount=0;
  if(splitMode==='equal'){
    const participants=others.length+(splitIncludeMe?1:0);
    if(participants){
      const cents=Math.round(total*100),base=Math.floor(cents/participants),remainder=cents-base*participants;
      let idx=0;
      if(splitIncludeMe&&me)me.amount=(base+(idx++<remainder?1:0))/100;
      others.forEach(r=>r.amount=(base+(idx++<remainder?1:0))/100);
      // Blank rows are intentionally not allocated until a person is selected.
      splitRows.filter(r=>!(r.isMe||r.person_id==='__me__')&&!r.person_id).forEach(r=>r.amount=0);
    }
  }
  splitRows.forEach((r,i)=>{const input=$(`split_amount_${i}`);if(input&&document.activeElement!==input)input.value=r.amount?Number(r.amount).toFixed(2):''});
  const mine=splitIncludeMe?Number(me?.amount||0):0;
  const sum=others.reduce((s,r)=>s+Number(r.amount||0),0);
  const combined=Math.round((mine+sum)*100)/100;
  const valid=Math.abs(total-combined)<.01;
  const preview=$('splitPreview');
  if(preview)preview.innerHTML=`<div class="split-preview-main"><span>Your share</span><b>${money(mine)}</b><span>Others owe you</span><b>${money(Math.max(0,sum))}</b></div><span class="${valid?'green':'red'}">${valid?'✓ Split balances':`⚠ Shares must add up to ${money(total)} · ${money(Math.max(0,total-combined))} remaining`}</span>`;
}
async function submitForm(type,data,f){const btn=f.querySelector('.primary');if(btn)btn.disabled=true;try{await saveModal(type,data,f);if(type==='category'){await loadData();render();openModal('category');return}closeModal();await loadData();render()}catch(e){alert(friendlyError(e))}finally{if(btn)btn.disabled=false}}
function friendlyError(e){const msg=String(e?.message||e||'Could not save.');if(/duplicate key value.*people.*name|people_user_id_name|people.*name.*unique/i.test(msg))return 'A person with this name already exists. Please use the existing person or choose a different name.';if(/duplicate key value.*categories/i.test(msg))return 'A category with this name and type already exists. Please choose a different name.';if(/permission denied/i.test(msg))return 'Permission denied. Please run the latest My Budget SQL migration in Supabase, then try again.';return msg}

async function saveModal(type,data,f){const x=Object.fromEntries(new FormData(f).entries());if(type==='account'){const row={name:x.name,type:x.type,currency:(x.currency||'INR').toUpperCase(),opening_balance:Number(x.opening_balance||0)};data?await update('accounts',data.id,row):await insert('accounts',{...row,is_active:true})}
else if(type==='category'){const row={name:x.name,type:x.type,parent_id:x.parent_id||null,icon:x.icon||'🏷️',color:x.color||'#7666cf'};data?await update('categories',data.id,row):await insert('categories',{...row,is_active:true})}
else if(type==='budget'){const now=todayDate();let row={name:x.name,category_id:x.category_id||null,amount:Number(x.amount),period:x.period,year:now.getFullYear(),month:x.period==='monthly'?now.getMonth()+1:null,start_date:null,end_date:null,notes:x.notes||null};if(x.period==='weekly'){const day=now.getDay()||7;const st=new Date(now);st.setDate(st.getDate()-day+1);const en=new Date(st);en.setDate(en.getDate()+6);row.year=st.getFullYear();row.month=null;row.start_date=localDate(st);row.end_date=localDate(en)}data?await update('budgets',data.id,row):await insert('budgets',row)}
else if(type==='goal'){const months=Math.max(1,Number(x.duration_months||0)),target=Number(x.target_amount),existing=Number(x.existing_amount||0),contrib=data?state.goal_contributions.filter(c=>c.goal_id===data.id).reduce((s,c)=>s+Number(c.amount||0),0):0,row={name:x.name,target_amount:target,existing_amount:existing,duration_months:months,target_date:x.target_date||null,icon:x.icon||'🎯',notes:x.notes||null,saved_amount:existing+contrib,is_completed:existing+contrib>=target};data?await update('goals',data.id,row):await insert('goals',row)}
else if(type==='loan'){const amount=Number(x.amount);const p=state.people.find(p=>p.id===x.person_id);if(!p)throw new Error('Select a person.');const row={person_id:x.person_id,direction:x.direction,amount,account_id:x.account_id,loan_date:String(x.loan_date).slice(0,10),notes:x.notes||null};data?await update('loans',data.id,row):await insert('loans',row)}
else if(type==='loanRepayment'){const p=state.people.find(p=>p.id===x.person_id);if(!p)throw new Error('Select a person.');const bal=loanPersonBalance(p.id);const amount=Number(x.amount);const available=x.direction==='received'?bal.theyOwe:bal.iOwe;if(amount>available+.01)throw new Error(`Repayment cannot exceed outstanding ${money(available)}.`);await insert('loan_repayments',{loan_id:null,person_id:x.person_id,direction:x.direction,amount,account_id:x.account_id,repayment_date:String(x.repayment_date).slice(0,10),notes:x.notes||null})}
else if(type==='loanRepaymentEdit'){const r=state.loan_repayments.find(q=>q.id===data?.id);if(!r)throw new Error('Repayment record not found.');await update('loan_repayments',r.id,{person_id:x.person_id,direction:x.direction,amount:Number(x.amount),account_id:x.account_id,repayment_date:String(x.repayment_date).slice(0,10),notes:x.notes||null})}else if(type==='person'){const row={name:x.name,phone:x.phone||null,email:x.email||null,notes:x.notes||null};data?await update('people',data.id,row):await insert('people',{...row,is_active:true})}
else if(type==='income'||type==='expense'){const row={amount:Number(x.amount),description:x.description||'',transaction_date:String(x.transaction_date).slice(0,10),account_id:x.account_id,category_id:null,notes:x.notes||null,type};const alloc=transactionCategoryData(row.amount,type);row.category_id=alloc[0]?.category_id||null;let recurringId=null;if(x.make_recurring&&!data){const r=await insert('recurring_transactions',{name:x.description||type,type,amount:Number(x.amount),description:x.description||type,account_id:x.account_id,to_account_id:null,category_id:row.category_id||null,frequency:x.recurring_frequency||'monthly',next_date:String(x.recurring_next_date||x.transaction_date).slice(0,10),notes:x.notes||null,active:true});recurringId=r.id}const tx=data?await update('transactions',data.id,row):await insert('transactions',{...row,recurring_id:recurringId});await saveTransactionCategoryRows(tx.id,alloc)}
else if(type==='transfer'){if(x.account_id===x.to_account_id)throw new Error('From and To accounts must be different.');const row={amount:Number(x.amount),description:x.description||'Transfer',transaction_date:String(x.transaction_date).slice(0,10),account_id:x.account_id,to_account_id:x.to_account_id,type:'transfer',goal_id:x.goal_id||null};let tx;if(x.make_recurring&&!data){const r=await insert('recurring_transactions',{name:x.description||'Transfer',type:'transfer',amount:Number(x.amount),description:x.description||'Transfer',account_id:x.account_id,to_account_id:x.to_account_id,category_id:null,frequency:x.recurring_frequency||'monthly',next_date:String(x.recurring_next_date||x.transaction_date).slice(0,10),notes:null,active:true});tx=await insert('transactions',{...row,recurring_id:r.id});}else tx=data?await update('transactions',data.id,row):await insert('transactions',row);const old=state.goal_contributions.find(g=>g.transaction_id===tx.id);if(x.goal_id){if(old)await update('goal_contributions',old.id,{goal_id:x.goal_id,amount:Number(x.amount),contribution_date:x.transaction_date,account_id:x.account_id,notes:'Goal contribution via transfer'});else await insert('goal_contributions',{goal_id:x.goal_id,amount:Number(x.amount),contribution_date:x.transaction_date,account_id:x.account_id,transaction_id:tx.id,notes:'Goal contribution via transfer'})}else if(old){await del('goal_contributions',old.id)}}
else if(type==='split'){const total=Number(x.total_amount),me=splitRows.find(r=>r.isMe||r.person_id==='__me__'),rows=splitRows.filter(r=>!(r.isMe||r.person_id==='__me__')&&r.person_id);if(!me)throw new Error('Your share row is required.');if(new Set(rows.map(r=>r.person_id)).size!==rows.length)throw new Error('Each person can appear only once.');const includeMe=splitIncludeMe!==false;if(splitMode==='equal'){const participants=includeMe?(rows.length+1):rows.length;if(!participants)throw new Error('Add at least one other person or include yourself.');const cents=Math.round(total*100),base=Math.floor(cents/participants),remainder=cents-base*participants;let idx=0;if(includeMe)me.amount=(base+(idx++<remainder?1:0))/100;else me.amount=0;rows.forEach(r=>r.amount=(base+(idx++<remainder?1:0))/100)}const myShare=includeMe?Math.max(0,Math.round(Number(me.amount||0)*100)/100):0,sum=rows.reduce((s,r)=>s+Number(r.amount||0),0),combined=Math.round((myShare+sum)*100)/100;if(Math.abs(total-combined)>.01)throw new Error(`Shares must add up to ${money(total)}.`);let tx,st;const alloc=transactionCategoryData(total,'expense');if(data){tx=await update('transactions',data.transaction_id,{amount:total,description:x.description||'',transaction_date:String(x.transaction_date).slice(0,10),account_id:x.account_id,category_id:alloc[0]?.category_id||null});await update('split_transactions',data.id,{split_type:splitMode,total_amount:total,my_share:myShare});await sb.from('split_participants').delete().eq('split_transaction_id',data.id);st={id:data.id}}else{tx=await insert('transactions',{amount:total,description:x.description||'',transaction_date:String(x.transaction_date).slice(0,10),account_id:x.account_id,category_id:alloc[0]?.category_id||null,type:'split'});st=await insert('split_transactions',{transaction_id:tx.id,split_type:splitMode,total_amount:total,my_share:myShare})}for(const r of rows)await insert('split_participants',{split_transaction_id:st.id,person_id:r.person_id,amount:Number(r.amount),amount_paid:0,status:'pending'});await saveTransactionCategoryRows(tx.id,alloc)}
else if(type==='repayment'){const p=peopleBalances().find(p=>p.id===x.person_id),amount=Number(x.amount);if(!p||amount>p.balance+.01)throw new Error(`Repayment cannot exceed outstanding ${money(p?.balance||0)}.`);const tx=await insert('transactions',{amount,description:`Reimbursement from ${p.name}`,transaction_date:x.reimbursement_date,account_id:x.account_id,type:'reimbursement',person_id:x.person_id,notes:x.notes||null});await insert('reimbursements',{person_id:x.person_id,amount,reimbursement_date:x.reimbursement_date,account_id:x.account_id,transaction_id:tx.id,notes:x.notes||null})}
else if(type==='repaymentEdit'){const r=data.reimbursement;if(!r)throw new Error('Repayment record not found.');const old=r.id;await update('transactions',data.id,{amount:Number(x.amount),description:`Reimbursement from ${personName(x.person_id)}`,transaction_date:x.reimbursement_date,account_id:x.account_id,person_id:x.person_id,notes:x.notes||null});await update('reimbursements',old,{person_id:x.person_id,amount:Number(x.amount),reimbursement_date:x.reimbursement_date,account_id:x.account_id,notes:x.notes||null})}
else if(type==='reminder'){const row={title:x.title,due_date:x.due_date,note:x.note||null};data?await update('reminders',data.id,row):await insert('reminders',{...row,completed:false})}
else if(type==='recurring'){const row={name:x.name,type:x.type,amount:Number(x.amount),description:x.description,account_id:x.account_id,to_account_id:x.to_account_id||null,category_id:x.category_id||null,frequency:x.frequency,next_date:x.next_date,notes:x.notes||null};data?await update('recurring_transactions',data.id,row):await insert('recurring_transactions',{...row,active:true})}}
function editTx(id){const t=state.transactions.find(x=>x.id===id);if(!t)return;if(t.type==='income'||t.type==='expense')openModal(t.type,t);else if(t.type==='transfer')openModal('transfer',t);else if(t.type==='split'){const st=state.split_transactions.find(s=>s.transaction_id===id);if(st)openModal('split',{...st,...t,id:st.id,transaction_id:id})}else if(t.type==='reimbursement')openModal('repaymentEdit',{...t,reimbursement:state.reimbursements.find(r=>r.transaction_id===id)})}
async function deleteTx(id){const t=state.transactions.find(x=>x.id===id);if(!t||!confirm('Delete this transaction?'))return;try{if(t.type==='split'){const st=state.split_transactions.find(s=>s.transaction_id===id);if(st){await del('split_transactions',st.id);removeLocal('split_transactions',st.id)}}if(t.type==='reimbursement'){const r=state.reimbursements.find(x=>x.transaction_id===id);if(r){await del('reimbursements',r.id);removeLocal('reimbursements',r.id)}}const gc=state.goal_contributions.find(x=>x.transaction_id===id);if(gc){await del('goal_contributions',gc.id);removeLocal('goal_contributions',gc.id)}await del('transactions',id);removeLocal('transactions',id);render()}catch(e){alert(friendlyError(e))}}
async function editLoan(id){const l=state.loans.find(x=>x.id===id);if(l)openModal('loan',l)}
async function deleteLoan(id){if(confirm('Delete this loan?')){await del('loans',id);removeLocal('loans',id);render()}}
async function editAccount(id){openModal('account',state.accounts.find(x=>x.id===id))}async function deleteAccount(id){if(confirm('Delete account? It must not be referenced by transactions.'))try{await del('accounts',id);removeLocal('accounts',id);render()}catch(e){alert(friendlyError(e))}}async function editBudget(id){openModal('budget',state.budgets.find(x=>x.id===id))}async function deleteBudget(id){if(confirm('Delete budget?'))try{await del('budgets',id);removeLocal('budgets',id);render()}catch(e){alert(friendlyError(e))}}async function editPerson(id){openModal('person',state.people.find(x=>x.id===id))}async function deletePerson(id){if(confirm('Delete person? Existing splits/reimbursements may prevent deletion.'))try{await del('people',id);removeLocal('people',id);render()}catch(e){alert(friendlyError(e))}}async function editGoal(id){openModal('goal',state.goals.find(x=>x.id===id))}async function deleteGoal(id){if(confirm('Delete goal and its contributions?'))try{const {error:gcErr}=await sb.from('goal_contributions').delete().eq('goal_id',id);if(gcErr)throw gcErr;state.goal_contributions=state.goal_contributions.filter(x=>x.goal_id!==id);await del('goals',id);removeLocal('goals',id);render()}catch(e){alert(friendlyError(e))}}
function editCategory(id){const c=state.categories.find(x=>x.id===id);if(!c)return;openModalRaw(`<h2>Edit category</h2><form id="f"><label>Name</label><input name="name" required value="${esc(c.name)}"><label>Type</label><select name="type"><option value="expense" ${c.type==='expense'?'selected':''}>Expense</option><option value="income" ${c.type==='income'?'selected':''}>Income</option><option value="both" ${c.type==='both'?'selected':''}>Both (income & expense)</option></select><label>Parent</label>${categoryParentSelect(c.parent_id||'',c.type,c.id)}<label>Icon</label><input name="icon" value="${esc(c.icon||'🏷️')}"><label>Color</label><input name="color" value="${esc(c.color||'#7666cf')}"><button class="primary">Update category</button></form>`);$('f').onsubmit=async e=>{e.preventDefault();try{const x=Object.fromEntries(new FormData(e.target));if(x.parent_id===id)x.parent_id='';await update('categories',id,{name:x.name,type:x.type,parent_id:x.parent_id||null,icon:x.icon,color:x.color});await loadData();render();openModal('category')}catch(err){alert(friendlyError(err))}}}
async function deleteCategory(id){if(confirm('Delete category? Existing transactions will keep their records but lose this category.'))try{await del('categories',id);await loadData();openModal('category')}catch(e){alert(friendlyError(e))}}
async function saveGoalDuration(id){const g=state.goals.find(x=>x.id===id),el=$(`goalMonths_${id}`);if(!g||!el)return;const months=Math.max(1,Math.round(Number(el.value)||remainingMonthsThisYear()));try{await update('goals',id,{duration_months:months});await loadData();render()}catch(e){alert('Could not save goal plan: '+(e?.message||e))}}
async function contribute(id){const g=state.goals.find(x=>x.id===id);if(!g)return;openModal('contribution',{goal_id:id})}
function showGoalContrib(id){const g=state.goals.find(x=>x.id===id);const rows=state.goal_contributions.filter(x=>x.goal_id===id).sort((a,b)=>b.contribution_date.localeCompare(a.contribution_date));openModalRaw(`<h2>${esc(g?.name||'Goal')} contributions</h2>${rows.length?rows.map(r=>`<div class="row"><div><b>${money(r.amount)}</b><div class="sub">${fmtDate(r.contribution_date)} · ${esc(accountName(r.account_id))}</div></div><div><button class="smallbtn" onclick="editContribution('${r.id}')">✎</button> <button class="smallbtn" onclick="deleteContribution('${r.id}')">🗑</button></div></div>`).join(''):'<div class="empty">No contributions yet.</div>'}`)}
async function editContribution(id){const r=state.goal_contributions.find(x=>x.id===id);if(!r)return;openModal('contribution',r)}async function deleteContribution(id){if(!confirm('Delete this goal contribution?'))return;try{await del('goal_contributions',id);removeLocal('goal_contributions',id);render();showGoalContrib(state.goals.find(g=>state.goal_contributions.some(x=>x.goal_id===g.id))?.id||'')}catch(e){alert(friendlyError(e))}}
function contributionForm(data){return `<h2>${data?.id?'Edit':'Add'} goal contribution</h2><form id="f"><label>Goal</label>${sel('goal_id',state.goals,data?.goal_id||'',true)}<label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Date</label><input name="contribution_date" type="date" required value="${esc(data?.contribution_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save contribution</button></form>`}
async function saveContribution(data,f){const x=Object.fromEntries(new FormData(f));const row={goal_id:x.goal_id,amount:Number(x.amount),account_id:x.account_id,contribution_date:x.contribution_date,notes:x.notes||null};if(data)await update('goal_contributions',data.id,row);else await insert('goal_contributions',row);await loadData();render();closeModal()}
function saveNickname(value){const name=String(value||'').trim().replace(/\s+/g,' ');if(name)localStorage.setItem(nicknameKey(),name);else localStorage.removeItem(nicknameKey());if($('greetingText'))$('greetingText').textContent=greeting();}
function openSettings(){const nickname=localStorage.getItem(nicknameKey())||'';openModalRaw(`<h2>Settings</h2><div class="notice success">Cloud storage: connected to Supabase.</div><h3>Personalisation</h3><form id="nicknameForm"><label>Nickname</label><input name="nickname" maxlength="40" value="${esc(nickname)}" placeholder="e.g. Janu"><div class="sub">This name is used in your greeting on the main page.</div><button class="primary">Save nickname</button></form><h3>Backup & restore</h3><button class="secondary" onclick="exportExcel()">Export Excel (.xlsx)</button><button class="secondary" onclick="exportPDF()">Export PDF</button><button class="secondary" onclick="exportJSON()">Export JSON backup</button><input id="importFile" type="file" accept=".json,.xlsx,.xls,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden" onchange="importDataFile(this.files[0])"><button class="secondary" onclick="$('importFile').click()">Import backup (.json / .xlsx)</button><button class="secondary danger" onclick="resetAllData()">Reset all data</button><div class="sub settings-note">Reset removes your financial records, budgets, goals, reminders, categories, people and accounts from this Supabase project. Your login remains active.</div><h3>Appearance</h3><div class="theme-row"><button type="button" onclick="setTheme('light')">☀️ Light</button><button type="button" onclick="setTheme('dark')">🌙 Dark</button><button type="button" onclick="setTheme('system')">◐ System</button></div><h3>Connection</h3><button class="secondary" onclick="openConfig()">Change Supabase connection</button><button class="secondary danger" onclick="signOut()">Sign out</button><div class="hint">Account currency is stored per account. Transaction amounts are the actual paid or received amounts.</div>`);$('nicknameForm').onsubmit=e=>{e.preventDefault();saveNickname(e.target.nickname.value);closeModal();}}
function resetOrder(){return ['loan_repayments','loans','money_held','split_participants','split_transactions','goal_contributions','reimbursements','transaction_categories','transactions','recurring_transactions','budgets','goals','people','categories','accounts']}
async function clearUserData(){
  const rpc=await sb.rpc('reset_my_budget_data');
  if(!rpc.error)return;
  // Backward-compatible fallback for projects that have not yet run the reset RPC migration.
  const msg=String(rpc.error.message||'');
  if(!/function.*reset_my_budget_data|does not exist/i.test(msg))throw rpc.error;
  for(const t of resetOrder()){const {error}=await sb.from(t).delete().eq('user_id',user.id);if(error)throw new Error(`${t}: ${error.message}`)}
}
async function resetAllData(){if(!user)return;if(!confirm('Reset ALL My Budget data? This cannot be undone. Export a backup first if you may need the data later.'))return;try{showLoading(true,'Resetting your data…');await clearUserData();state={accounts:[],categories:[],transactions:[],budgets:[],people:[],goals:[],split_transactions:[],split_participants:[],reimbursements:[],goal_contributions:[],recurring_transactions:[],reminders:[],loans:[],loan_repayments:[],transaction_categories:[],money_held:[],transaction_accounts:[],recurring_occurrences:[]};selectedDate=today();calCursor=todayDate();await ensureBase();await loadData();showLoading(false);closeModal();render();alert('All data has been reset. You can start fresh.')}catch(e){showLoading(false);alert('Reset failed: '+(e?.message||e))}}
function normalizeImportData(raw){if(raw?.data&&typeof raw.data==='object')return raw.data;if(raw&&typeof raw==='object')return raw;throw new Error('Invalid backup format.')}
function stripSystemFields(row){const x={...row};delete x.user_id;delete x.created_at;delete x.updated_at;return x}
async function importDataFile(file){if(!file)return;try{if(!confirm('Importing will replace your current data with the backup. Continue?'))return;showLoading(true,'Preparing import…');let data;if(/\.(xlsx|xls)$/i.test(file.name)){if(!window.XLSX){showLoading(true,'Loading Excel library…');try{await loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js')}catch(e){showLoading(false);return alert('Could not load the Excel library. Check your connection and try again.')}}const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});data={};for(const t of tables){const ws=wb.Sheets[t];data[t]=ws?XLSX.utils.sheet_to_json(ws,{defval:null}):[]}}else{data=normalizeImportData(JSON.parse(await file.text()))}for(const t of tables){if(!Array.isArray(data[t]))data[t]=[]}{try{await clearUserData()}catch(e){throw new Error(`Could not clear existing data: ${e?.message||e}`)}}const order=['accounts','categories','people','goals','recurring_transactions','budgets','transactions','transaction_categories','split_transactions','split_participants','reimbursements','goal_contributions','reminders','loans','loan_repayments','money_held'];for(const t of order){let rows=data[t].map(stripSystemFields).filter(r=>r&&r.id);if(t==='reminders'){rows=rows.map(r=>({...r,id:r.id||uid()}))}else{const seen=new Set();rows=rows.filter(r=>{if(seen.has(String(r.id)))return false;seen.add(String(r.id));return true})}rows=rows.map(r=>({...r,user_id:user.id}));if(rows.length){const {error}=await sb.from(t).upsert(rows,{onConflict:'id',ignoreDuplicates:false});if(error)throw new Error(`Could not import ${t}: ${error.message}`)}}await loadData();showLoading(false);closeModal();render();alert('Import completed successfully.')}catch(e){showLoading(false);alert('Import failed: '+(e?.message||e))}}
function setTheme(t){if(t==='dark')document.body.classList.add('dark');else if(t==='light')document.body.classList.remove('dark');else window.matchMedia('(prefers-color-scheme: dark)').matches?document.body.classList.add('dark'):document.body.classList.remove('dark');localStorage.setItem('mybudget_theme',t);if(typeof render==='function'&&user)render()}
function exportJSON(){download('my-budget-backup.json',JSON.stringify({exported_at:new Date().toISOString(),data:state},null,2),'application/json')}
function exportExcel(){if(!window.XLSX)return alert('Excel library is unavailable.');const wb=XLSX.utils.book_new();for(const t of tables){const rows=state[t];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{}]),t.slice(0,31))}XLSX.writeFile(wb,'my-budget.xlsx')}

function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function editLoanRepayment(id){const r=state.loan_repayments.find(x=>x.id===id);if(r)openModal('loanRepaymentEdit',r)}
async function deleteLoanRepayment(id){if(confirm('Delete this repayment?')){await del('loan_repayments',id);removeLocal('loan_repayments',id);render()}}
function openRepayment(id){openModal('repayment',{person_id:id})}function editReminder(id){openModal('reminder',state.reminders.find(r=>r.id===id))}async function toggleReminder(id,val){const updated=await update('reminders',id,{completed:val});const idx=state.reminders.findIndex(x=>x.id===id);if(idx>-1)state.reminders[idx]=updated;renderCalendar()}async function deleteReminder(id){if(confirm('Delete reminder?')){await del('reminders',id);removeLocal('reminders',id);renderCalendar()}}
async function editRecurring(id){openModal('recurring',state.recurring_transactions.find(r=>r.id===id))}async function deleteRecurring(id){if(confirm('Delete recurring transaction?')){await del('recurring_transactions',id);removeLocal('recurring_transactions',id);renderRecurring()}}function renderRecurring(){$('recurringList').innerHTML=state.recurring_transactions.length?state.recurring_transactions.map(r=>`<div class="row"><div><div class="name">${esc(r.name)}</div><div class="sub">${r.frequency} · ${money(r.amount)} · next ${fmtDate(r.next_date)} · ${r.active?'Active':'Paused'}</div></div><div><button class="smallbtn" onclick="editRecurring('${r.id}')">✎</button> <button class="smallbtn" onclick="deleteRecurring('${r.id}')">🗑</button></div></div>`).join(''):'<div class="empty">No recurring transactions.</div>'}
openModal=function(type,data=null){if(type==='settings'){openSettings();return}if(type==='contribution'){openModalRaw(contributionForm(data));$('f').onsubmit=async e=>{e.preventDefault();try{await saveContribution(data,e.target)}catch(err){alert(friendlyError(err))}};return}let h='';if(type==='category')h=categoryModal();else if(type==='account')h=`<h2>${data?'Edit':'Add'} account</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Type</label><select name="type"><option value="bank">Bank</option><option value="cash">Cash</option><option value="card">Credit Card</option><option value="wallet">Wallet/UPI</option><option value="investment">Investment</option><option value="savings">Savings</option></select><label>Currency</label><input name="currency" value="${esc(data?.currency||'INR')}"><label>Opening balance</label><input name="opening_balance" type="number" step="0.01" value="${data?.opening_balance??0}"><button class="primary">Save account</button></form>`;else if(type==='budget')h=`<h2>${data?'Edit':'Add'} budget</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Category</label>${categoryOptions('expense',data?.category_id)}<label>Amount</label><input name="amount" type="number" step="0.01" min="0" required value="${data?.amount??''}"><label>Period</label><select name="period"><option value="weekly" ${data?.period==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.period==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.period==='yearly'?'selected':''}>Yearly</option></select><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save budget</button></form>`;else if(type==='goal')h=`<h2>${data?'Edit':'Add'} goal</h2><form id="f"><label>Goal name</label><input name="name" required value="${esc(data?.name||'')}" placeholder="Stocks"><label>Target amount</label><input id="goalTarget" name="target_amount" type="number" step="0.01" min="0.01" required value="${data?.target_amount??''}" oninput="updateGoalPlan()"><label>Existing amount</label><input id="goalExisting" name="existing_amount" type="number" step="0.01" min="0" value="${data?.existing_amount??0}" oninput="updateGoalPlan()"><div class="sub">Amount already saved before future goal contributions.</div><label>Number of months to reach goal</label><input id="goalMonths" name="duration_months" type="number" min="1" step="1" required value="${data?.duration_months??remainingMonthsThisYear()}" oninput="updateGoalPlan()"><div id="goalPlanPreview" class="goal-plan" data-saved="${data?.saved_amount||0}">Enter target amount to calculate monthly saving.</div><label>Target date</label><input id="goalTargetDate" name="target_date" type="date" value="${esc(data?.target_date||'')}" oninput="this.dataset.manual='1'"><label>Icon</label><input name="icon" value="${esc(data?.icon||'🎯')}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save goal</button></form>`;else if(type==='loan')h=`<h2>${data?'Edit':'Record'} loan</h2><form id="f"><label>Type</label><select name="direction"><option value="lend" ${data?.direction==='lend'?'selected':''}>I lend money</option><option value="borrow" ${data?.direction==='borrow'?'selected':''}>I borrow money</option></select><label>Person</label>${sel('person_id',state.people,data?.person_id||'',true)}<label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Date</label><input name="loan_date" type="date" required value="${esc(data?.loan_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${data?'Update loan':'Save loan'}</button></form>`;else if(type==='loanRepayment'||type==='loanRepaymentEdit')h=`<h2>${type==='loanRepaymentEdit'?'Edit':'Record'} loan repayment</h2><form id="f"><label>Person</label>${sel('person_id',state.people,data?.person_id||'',true)}<label>Direction</label><select name="direction"><option value="received" ${data?.direction==='received'?'selected':''}>I received money back</option><option value="sent" ${data?.direction==='sent'?'selected':''}>I repaid money</option></select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Date</label><input name="repayment_date" type="date" required value="${esc(data?.repayment_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${type==='loanRepaymentEdit'?'Update':'Save'} repayment</button></form>`;else if(type==='person')h=`<h2>${data?'Edit':'Add'} person</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Phone</label><input name="phone" value="${esc(data?.phone||'')}"><label>Email</label><input name="email" type="email" value="${esc(data?.email||'')}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save person</button></form>`;else if(type==='income'||type==='expense')h=`<h2>${data?'Edit':'Add'} ${type}</h2><form id="f"><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" required value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id)}<label>Category</label>${categoryOptions(type,data?.category_id)}<label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><label class="checkrow"><input type="checkbox" name="make_recurring" value="1"> Make this recurring</label><div class="recurring-options"><label>Frequency</label><select name="recurring_frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select><label>First due date</label><input name="recurring_next_date" type="date" value="${esc(data?.transaction_date||today())}"></div><button class="primary">Save transaction</button></form>`;else if(type==='transfer')h=`<h2>${data?'Edit':'New'} transfer</h2><form id="f"><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>From account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>To account</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',true)}<label>Goal contribution (optional)</label>${sel('goal_id',state.goals,data?.goal_id||'',false)}<label>Date</label><input name="transaction_date" type="date" value="${esc(data?.transaction_date||today())}" required><label>Note</label><input name="description" value="${esc(data?.description||'Transfer')}"><label class="checkrow"><input type="checkbox" name="make_recurring" value="1"> Make this recurring</label><div class="recurring-options"><label>Frequency</label><select name="recurring_frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select><label>First due date</label><input name="recurring_next_date" type="date" value="${esc(data?.transaction_date||today())}"></div><button class="primary">${data?'Update transfer':'Save transfer'}</button></form>`;else if(type==='split')h=splitForm(data);else if(type==='repayment'||type==='repaymentEdit')h=`<h2>${type==='repaymentEdit'?'Edit repayment':'Record repayment'}</h2><form id="f"><label>Person</label>${sel('person_id',state.people,data?.person_id||'',true)}<label>Amount received</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Account received into</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Date</label><input name="reimbursement_date" type="date" value="${esc(data?.reimbursement_date||data?.transaction_date||today())}" required><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${type==='repaymentEdit'?'Update repayment':'Save repayment'}</button></form>`;else if(type==='reminder')h=`<h2>${data?'Edit':'Add'} reminder</h2><form id="f"><label>Title</label><input name="title" required value="${esc(data?.title||'')}"><label>Due date</label><input name="due_date" type="date" required value="${esc(data?.due_date||today())}"><label>Note</label><textarea name="note">${esc(data?.note||'')}</textarea><button class="primary">Save reminder</button></form>`;else if(type==='recurring')h=`<h2>${data?'Edit':'Add'} recurring transaction</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Type</label><select name="type"><option value="expense" ${data?.type==='expense'?'selected':''}>Expense</option><option value="income" ${data?.type==='income'?'selected':''}>Income</option><option value="transfer" ${data?.type==='transfer'?'selected':''}>Transfer</option></select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" required value="${esc(data?.description||'')}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>To account</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',false)}<label>Category</label>${categoryOptions('expense',data?.category_id,true)}<label>Frequency</label><select name="frequency"><option value="daily" ${data?.frequency==='daily'?'selected':''}>Daily</option><option value="weekly" ${data?.frequency==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.frequency==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.frequency==='yearly'?'selected':''}>Yearly</option></select><label>Next due date</label><input name="next_date" type="date" required value="${esc(data?.next_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save recurring</button></form>`;else return;openModalRaw(h);$('f')?.addEventListener('submit',async e=>{e.preventDefault();await submitForm(type,data,e.target)});if(type==='split')renderSplitRows();if(type==='goal')updateGoalPlan()}
setTheme(localStorage.getItem('mybudget_theme')||'system');
function startApp(){
  $('insightMonth')?.addEventListener('change',renderInsights);
  $('insightYear')?.addEventListener('change',renderInsights);
  if(isRecoveryRedirect())document.body.dataset.recovery='1';
  boot();
}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',startApp,{once:true});else startApp();function periodRange(period,b={}){
  const now=todayDate();
  if(period==='weekly'){
    const start=new Date(now);
    const day=start.getUTCDay()||7;
    start.setUTCDate(start.getUTCDate()-(day-1));
    const end=new Date(start); end.setUTCDate(end.getUTCDate()+6);
    return [localDate(start),localDate(end)];
  }
  if(period==='yearly'){
    const y=Number(b.year)||now.getUTCFullYear();
    return [`${y}-01-01`,`${y}-12-31`];
  }
  const y=Number(b.year)||now.getUTCFullYear();
  const m=Number(b.month)||now.getUTCMonth()+1;
  const start=`${y}-${String(m).padStart(2,'0')}-01`;
  const endDate=new Date(Date.UTC(y,m,0,12));
  return [start,localDate(endDate)];
}
function categoryMatchesBudget(txCategoryId,budgetCategoryId){
  if(!txCategoryId||!budgetCategoryId)return false;
  if(txCategoryId===budgetCategoryId)return true;
  let c=state.categories.find(x=>x.id===txCategoryId),guard=0;
  while(c?.parent_id&&guard++<30){
    if(c.parent_id===budgetCategoryId)return true;
    c=state.categories.find(x=>x.id===c.parent_id);
  }
  return false;
}
function budgetStatusForRange(b,a,z){
  const used=state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&(t.type==='expense'||t.type==='split')).reduce((sum,t)=>sum+txAllocations(t).filter(x=>categoryMatchesBudget(x.category_id,b.category_id)).reduce((sub,x)=>{
    if(t.type!=='split')return sub+Number(x.amount||0);
    const total=Number(t.amount||0),mine=spending(t);
    return sub+(total>0?Number(x.amount||0)*(mine/total):0);
  },0),0);
  const amount=Number(b.amount||0);
  return {used,pct:amount>0?used/amount*100:0,cls:used>amount?'over':used>=amount*.8?'near':'good'};
}
function budgetStatus(b){const [a,z]=periodRange(b.period,b);return budgetStatusForRange(b,a,z)}
function budgetSpent(b){const [a,z]=periodRange(b.period,b);return state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&(t.type==='expense'||t.type==='split')).reduce((sum,t)=>sum+txAllocations(t).filter(x=>categoryMatchesBudget(x.category_id,b.category_id)).reduce((a,x)=>a+(t.type==='split'?Math.min(x.amount,spending(t)):x.amount),0),0)}



/* ===== My Budget vNext feature layer ===== */
function txAllocations(t){const rows=txCategoryIndex.get(t.id)||[];return rows.length?rows.map(x=>({category_id:x.category_id,amount:Number(x.amount||0)})):(t.category_id?[{category_id:t.category_id,amount:Number(t.amount||0)}]:[])}
function categoryPool(type){return state.categories.filter(c=>c.is_active!==false&&(c.type===type||c.type==='both'))}
function parentCategoryOptions(type,value=''){return `<option value="">Select category</option>`+categoryPool(type).filter(c=>!c.parent_id).map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>${esc(c.icon||'🏷️')} ${esc(c.name)}</option>`).join('')}
function subcategoryOptions(type,parent,value=''){if(!parent)return '<option value="">Select subcategory</option>';const p=state.categories.find(c=>c.id===parent);return `<option value="${parent}" ${value===parent?'selected':''}>Use ${esc(p?.name||'parent')} directly</option>`+categoryPool(type).filter(c=>c.parent_id===parent).map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>${esc(c.icon||'↳')} ${esc(c.name)}</option>`).join('')}
let transactionCategoryMode='single',transactionCategoryRows=[];
function categoryFields(type,data=null){const alloc=state.transaction_categories.filter(x=>x.transaction_id===data?.id);transactionCategoryMode=alloc.length>1?'multiple':'single';const first=alloc[0]||{category_id:data?.category_id||''};const rr=first.category_id?rootCategory(state.categories.find(c=>c.id===first.category_id)):null;transactionCategoryRows=alloc.length?alloc.map(x=>{const root=rootCategory(state.categories.find(c=>c.id===x.category_id));return {parent_id:root?.id||'',category_id:x.category_id,amount:Number(x.amount||0)}}):[{parent_id:rr?.id||'',category_id:first.category_id||'',amount:Number(data?.amount||0)}];return `<div class="field-block"><label>Category allocation</label><div class="mode"><button type="button" id="catSingle" class="${transactionCategoryMode==='single'?'selected':''}" onclick="setTransactionCategoryMode('single','${type}')">Single category</button><button type="button" id="catMultiple" class="${transactionCategoryMode==='multiple'?'selected':''}" onclick="setTransactionCategoryMode('multiple','${type}')">Multiple categories</button></div><div id="categoryAllocation"></div></div>`}
function setTransactionCategoryMode(mode,type){transactionCategoryMode=mode;if(mode==='multiple'&&!transactionCategoryRows.length)transactionCategoryRows=[{parent_id:'',category_id:'',amount:0},{parent_id:'',category_id:'',amount:0}];renderTransactionCategoryRows(type)}
function renderTransactionCategoryRows(type){const el=$('categoryAllocation');if(!el)return;$('catSingle')?.classList.toggle('selected',transactionCategoryMode==='single');$('catMultiple')?.classList.toggle('selected',transactionCategoryMode==='multiple');if(transactionCategoryMode==='single'){const r=transactionCategoryRows[0]||{parent_id:'',category_id:''};el.innerHTML=`<div class="category-grid"><div><label>Category</label><select name="parent_category_id" onchange="transactionCategoryRows[0].parent_id=this.value;transactionCategoryRows[0].category_id='';renderTransactionCategoryRows('${type}')">${parentCategoryOptions(type,r.parent_id)}</select></div><div><label>Subcategory</label><select name="category_id" onchange="transactionCategoryRows[0].category_id=this.value">${subcategoryOptions(type,r.parent_id,r.category_id)}</select></div></div>`}else{el.innerHTML=transactionCategoryRows.map((r,i)=>`<div class="category-grid allocation-row"><div><label>Category</label><select onchange="transactionCategoryRows[${i}].parent_id=this.value;transactionCategoryRows[${i}].category_id='';renderTransactionCategoryRows('${type}')">${parentCategoryOptions(type,r.parent_id)}</select></div><div><label>Subcategory</label><select onchange="transactionCategoryRows[${i}].category_id=this.value">${subcategoryOptions(type,r.parent_id,r.category_id)}</select></div><input class="allocation-amount" type="number" min="0" step="0.01" value="${r.amount||''}" placeholder="Amount" oninput="transactionCategoryRows[${i}].amount=Number(this.value)||0"></div>`).join('')+`<button type="button" class="secondary" onclick="transactionCategoryRows.push({parent_id:'',category_id:'',amount:0});renderTransactionCategoryRows('${type}')">＋ Add category</button>`}}
function transactionCategoryData(total,type){if(transactionCategoryMode==='single'){const r=transactionCategoryRows[0]||{};if(!r.category_id)throw new Error('Please select a category.');return [{category_id:r.category_id,amount:Number(total)}]}const rows=transactionCategoryRows.filter(r=>r.category_id&&Number(r.amount)>0);const sum=Math.round(rows.reduce((s,r)=>s+Number(r.amount||0),0)*100)/100;if(Math.abs(sum-Number(total))>.01)throw new Error(`Category amounts must add up to ${money(total)}. Currently allocated ${money(sum)}.`);return rows.map(r=>({category_id:r.category_id,amount:Number(r.amount)}))}
async function saveTransactionCategoryRows(txId,rows){const {error:de}=await sb.from('transaction_categories').delete().eq('transaction_id',txId);if(de)throw de;if(rows.length){const {error}=await sb.from('transaction_categories').insert(rows.map(r=>({...r,transaction_id:txId,user_id:user.id})));if(error)throw error}}
function budgetSpent(b){const [a,z]=periodRange(b.period,b);return state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&(t.type==='expense'||t.type==='split')).reduce((sum,t)=>sum+txAllocations(t).filter(x=>categoryMatchesBudget(x.category_id,b.category_id)).reduce((a,x)=>a+(t.type==='split'?Math.min(x.amount,spending(t)):x.amount),0),0)}
function txHTML(t){const icon={income:'↑',expense:'−',transfer:'⇄',split:'🔀',reimbursement:'↩'}[t.type]||'•',cls=t.type==='income'||t.type==='reimbursement'?'income':t.type,sign=t.type==='income'||t.type==='reimbursement'?'+':t.type==='expense'||t.type==='split'?'−':'',other=t.type==='transfer'?` → ${esc(accountName(t.to_account_id))}`:'',share=t.type==='split'?` · ${esc(getNickname())} share ${money(splitMyShare(t))}`:'',cats=txAllocations(t).map(a=>catName(a.category_id)).filter(Boolean);return `<div class="row transaction-row"><div class="left"><div class="bubble ${cls}">${icon}</div><div class="tx-content"><div class="name">${esc(t.description||'(No description)')}</div><div class="sub">${fmtDate(t.transaction_date)} · ${esc(accountName(t.account_id))}${other}${share}</div>${cats.length?`<div class="sub">Category: ${esc(cats.join(', '))}</div>`:''}${t.notes?`<div class="sub">${esc(t.notes)}</div>`:''}</div></div><div class="tx-right" style="text-align:right"><b class="${sign==='+'?'green':sign==='−'?'red':''}">${sign}${money(t.amount)}</b><div class="action-row"><button class="smallbtn" onclick="editTx('${t.id}')">✎</button><button class="smallbtn dangerbtn" onclick="deleteTx('${t.id}')">🗑</button></div></div></div>`}
function friendlyError(e){const msg=String(e?.message||e||'Could not complete the action.');if(/duplicate key value.*people.*name|people_user_id_name|people.*name.*unique/i.test(msg))return 'A person with this name already exists. Please use the existing person or choose a different name.';if(/duplicate key value.*categories/i.test(msg))return 'A category with this name and type already exists. Please choose a different name.';if(/permission denied/i.test(msg))return 'Permission denied. Please run the latest My Budget migration in Supabase, then try again.';return msg}
function fillRecurringIntoForm(id){const r=state.recurring_transactions.find(x=>x.id===id),f=$('f');if(!r||!f)return;const current=String(f.elements.transaction_date?.value||'').slice(0,10);const ds=current||((selectedDate&&recurringOccursOn(r,selectedDate))?selectedDate:r.next_date);if(f.elements.amount)f.elements.amount.value=r.amount;if(f.elements.description)f.elements.description.value=r.description||r.name;if(f.elements.account_id)f.elements.account_id.value=r.account_id||'';if(f.elements.to_account_id)f.elements.to_account_id.value=r.to_account_id||'';if(f.elements.transaction_date)f.elements.transaction_date.value=ds;if($('recurringOccurrenceDate'))$('recurringOccurrenceDate').value=ds;if(f.elements.recurring_next_date)f.elements.recurring_next_date.value=r.next_date;transactionAccountRows=[{account_id:r.account_id,amount:Number(r.amount)}];transactionAccountMode='single';renderTransactionAccountRows(r.type);const root=rootCategory(state.categories.find(c=>c.id===r.category_id));if(transactionCategoryRows.length){transactionCategoryRows[0].parent_id=root?.id||'';transactionCategoryRows[0].category_id=r.category_id||'';transactionCategoryRows[0].amount=Number(r.amount);renderTransactionCategoryRows(r.type)}}
function recurringOccursOn(r,ds){const start=String(r.next_date).slice(0,10),d=dateObj(ds),s=dateObj(start);if(ds<start)return false;if(r.frequency==='daily')return true;if(r.frequency==='weekly')return Math.round((d-s)/86400000)%7===0;if(r.frequency==='monthly')return d.getUTCDate()===s.getUTCDate();if(r.frequency==='yearly')return d.getUTCDate()===s.getUTCDate()&&d.getUTCMonth()===s.getUTCMonth();return false}
function useRecurring(id,date=selectedDate){const r=state.recurring_transactions.find(x=>x.id===id);if(!r)return;const ds=String(date||r.next_date||today()).slice(0,10);window.__recurringUseDate=ds;openModal(r.type,null);setTimeout(()=>{const f=$('f');if(!f)return;const sel=$('recurringSelect');if(sel){sel.value=r.id;fillRecurringIntoForm(r.id);}if(f.elements.transaction_date)f.elements.transaction_date.value=ds;if($('recurringOccurrenceDate'))$('recurringOccurrenceDate').value=ds;},0)}
function moneyHeldOutstanding(){return state.money_held.filter(h=>h.status==='pending').reduce((s,h)=>s+Number(h.amount||0),0)}
function heldHTML(h){const settled=h.status==='settled';return `<div class="row"><div class="left"><div class="bubble person">${otherPersonIcon()}</div><div><div class="name">${esc(personName(h.person_id))}</div><div class="sub">${esc(h.purpose||'Money held for others')} · Received ${fmtDate(h.received_date)}</div><div class="sub"><b class="${settled?'green':'amber'}">${settled?'Settled':'Pending'}</b>${settled&&h.settled_date?' · Settled on '+fmtDate(h.settled_date):''}${h.notes?' · '+esc(h.notes):''}</div></div></div><div style="text-align:right"><b class="${settled?'green':'amber'}">${money(h.amount)}</b><div style="margin-top:5px"><button class="smallbtn" onclick="editMoneyHeld('${h.id}')">✎</button><button class="smallbtn" onclick="toggleMoneyHeld('${h.id}')">${settled?'Undo':'Settle'}</button><button class="smallbtn dangerbtn" onclick="deleteMoneyHeld('${h.id}')">🗑</button></div></div></div>`}
function renderMoneyHeld(){const rows=state.money_held.slice().sort((a,b)=>Number(a.status==='settled')-Number(b.status==='settled')||String(b.received_date).localeCompare(String(a.received_date)));$('moneyHeldSummary').innerHTML=`<div class="loan-kpis"><div><span>HELD FOR OTHERS</span><b class="amber">${money(moneyHeldOutstanding())}</b></div><div><span>OPEN ITEMS</span><b>${rows.filter(x=>x.status==='pending').length}</b></div></div>`;$('moneyHeldList').innerHTML=rows.length?rows.map(heldHTML).join(''):'<div class="empty">No money held for others.</div>'}
function openMoneyHeld(data=null){openModal('moneyHeld',data)}
async function toggleMoneyHeld(id){const h=state.money_held.find(x=>x.id===id);if(!h)return;if(h.status==='pending'){openModalRaw(`<h2>Settle money held</h2><p class="sub">The amount will be deducted from <b>${esc(accountName(h.account_id))}</b>. The settlement date defaults to today and can be edited.</p><form id="f"><label>Held in account</label><input value="${esc(accountName(h.account_id))}" disabled><label>Settled date</label><input name="settled_date" type="date" value="${today()}" required><button class="primary">Mark as settled</button></form>`);$('f').onsubmit=async e=>{e.preventDefault();try{const x=Object.fromEntries(new FormData(e.target));await update('money_held',id,{status:'settled',settled_date:String(x.settled_date).slice(0,10)});closeModal();await loadData();render()}catch(err){alert(friendlyError(err))}}}else{try{await update('money_held',id,{status:'pending',settled_date:null});await loadData();render()}catch(e){alert(friendlyError(e))}}}
async function editMoneyHeld(id){openModal('moneyHeld',state.money_held.find(x=>x.id===id))}
async function deleteMoneyHeld(id){if(confirm('Delete this Money Held record?')){await del('money_held',id);removeLocal('money_held',id);render()}}
function splitListHTML(){$('splitList').innerHTML=state.transactions.filter(t=>t.type==='split').sort((a,b)=>String(b.created_at||b.transaction_date||'').localeCompare(String(a.created_at||a.transaction_date||''))).map(txHTML).join('')||'<div class="empty">No split transactions yet.</div>'}
function renderMoneyHeldAndSplit(){if($('moneyHeldList'))renderMoneyHeld();if($('splitList'))splitListHTML()}


/* vNext modal overrides */
const legacyOpenModal=openModal;
openModal=function(type,data=null){
  if(type==='category'){
    openModalRaw(`<h2>Categories</h2><form id="f"><label>Name</label><input name="name" required placeholder="Rent"><label>Type</label><select name="type" id="newCategoryType"><option value="expense">Expense</option><option value="income">Income</option><option value="both">Both (income & expense)</option></select><label>Parent category (optional)</label><div id="newCategoryParent">${categoryParentSelect()}</div><label>Icon</label><input name="icon" value="🏷️"><label>Color</label><input name="color" value="#7666cf"><button class="primary">Add category</button></form><div class="section"><h2>Existing categories</h2></div>${state.categories.filter(c=>!c.parent_id).map(p=>`<div class="row"><div class="left"><div class="bubble">${esc(p.icon||'🏷️')}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${esc(p.type)} · parent</div>${state.categories.filter(c=>c.parent_id===p.id).map(c=>`<div class="tree"><div class="row"><div><div class="name">↳ ${esc(c.name)}</div><div class="sub">${esc(c.type)} · subcategory</div></div><div><button type="button" class="smallbtn" onclick="editCategory('${c.id}')">✎</button><button type="button" class="smallbtn dangerbtn" onclick="deleteCategory('${c.id}')">🗑</button></div></div></div>`).join('')}</div></div><div><button type="button" class="smallbtn" onclick="editCategory('${p.id}')">✎</button><button type="button" class="smallbtn dangerbtn" onclick="deleteCategory('${p.id}')">🗑</button></div></div>`).join('')}`);
    $('newCategoryType').onchange=e=>{$('newCategoryParent').innerHTML=categoryParentSelect(' ',e.target.value).replace('value=" " selected','value=""')};
    $('f').onsubmit=async e=>{e.preventDefault();try{await saveModal('category',null,e.target);await loadData();render();openModal('category')}catch(err){alert(friendlyError(err))}};
    return;
  }
  if(type==='moneyHeld'){
    openModalRaw(`<h2>${data?'Edit':'Add'} money held</h2><p class="sub">Money belonging to someone else. While pending it increases the selected account balance, but it never counts as your income or expense.</p><form id="f"><label>Person</label>${sel('person_id',state.people,data?.person_id||'',true)}<label>Amount</label><input name="amount" type="number" min="0.01" step="0.01" required value="${data?.amount??''}"><label>Purpose</label><input name="purpose" value="${esc(data?.purpose||'')}" placeholder="Rent"><label>Held in account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>Received date</label><input name="received_date" type="date" required value="${esc(data?.received_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${data?'Update':'Save'} money held</button></form>`);
    $('f').onsubmit=async e=>{e.preventDefault();try{const x=Object.fromEntries(new FormData(e.target)),row={person_id:x.person_id,amount:Number(x.amount),purpose:x.purpose||null,account_id:x.account_id,received_date:String(x.received_date).slice(0,10),notes:x.notes||null};if(data)await update('money_held',data.id,row);else await insert('money_held',{...row,status:'pending',settled_date:null});closeModal();await loadData();render()}catch(err){alert(friendlyError(err))}};
    return;
  }
  if(type==='income'||type==='expense'){
    transactionCategoryRows=[];const recs=state.recurring_transactions.filter(r=>r.active&&r.type===type);
    openModalRaw(`<h2>${data?'Edit':'Add'} ${type}</h2><form id="f"><label>Recurring entry (optional)</label><select id="recurringSelect" name="use_recurring_id" onchange="fillRecurringIntoForm(this.value)"><option value="">Manual entry</option>${recs.map(r=>`<option value="${r.id}">${esc(r.name)} · ${money(r.amount)} · ${r.frequency}</option>`).join('')}</select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}${categoryFields(type,data)}<label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><label class="checkrow"><input type="checkbox" name="make_recurring" value="1"> Make this recurring</label><div class="recurring-options"><label>Frequency</label><select name="recurring_frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select><label>First due date</label><input name="recurring_next_date" type="date" value="${esc(data?.transaction_date||today())}"></div><button class="primary">${data?'Update':'Save transaction'}</button></form>`);
    $('f').onsubmit=async e=>{e.preventDefault();await submitForm(type,data,e.target)};renderTransactionCategoryRows(type);return;
  }
  if(type==='split'){
    splitMode=data?.split_type||'equal';splitIncludeMe=data?Number(data?.my_share||0)>0:true;splitRows=[];if(data?.id)splitRows=[{person_id:'__me__',amount:Number(data?.my_share||0),isMe:true},...state.split_participants.filter(x=>x.split_transaction_id===data.id).map(x=>({person_id:x.person_id,amount:Number(x.amount||0),isMe:false}))];if(!splitRows.length)splitRows=[{person_id:'__me__',amount:0,isMe:true},{person_id:'',amount:0,isMe:false}];
    openModalRaw(`<h2>${data?'Edit':'Split'} bill</h2><form id="f"><label>Total bill</label><input id="splitTotal" name="total_amount" type="number" step="0.01" min="0.01" required value="${data?.total_amount??''}" oninput="recalcSplit()"><label>Description</label><input name="description" value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><label>Paid from</label>${sel('account_id',state.accounts,data?.account_id||'',true)}${categoryFields('expense',data)}<label>Split type</label><div class="mode"><button type="button" id="eq" class="${splitMode==='equal'?'selected':''}" onclick="setSplitMode('equal')">Equal share</button><button type="button" id="uneq" class="${splitMode==='unequal'?'selected':''}" onclick="setSplitMode('unequal')">Unequal share</button></div><input type="hidden" name="split_type" id="splitType" value="${splitMode}"><label class="checkrow split-me-check"><input type="checkbox" id="splitIncludeMe" ${splitIncludeMe?'checked':''} onchange="splitIncludeMe=this.checked;recalcSplit()"> Include me (${esc(getNickname())})</label><div class="notice">If you are not part of the bill, turn this off — your share becomes ₹0 and the others are split equally.</div><div id="peopleRows"></div><button type="button" class="secondary" onclick="addSplitPerson()">＋ Add person</button><div class="split-summary" id="splitPreview"></div><button class="primary">${data?'Update split':'Save split'}</button></form>`);
    $('f').onsubmit=async e=>{e.preventDefault();await submitForm('split',data,e.target)};renderSplitRows();renderTransactionCategoryRows('expense');return;
  }
  if(type==='goal'){
    openModalRaw(`<h2>${data?'Edit':'Add'} goal</h2><form id="f"><label>Goal name</label><input name="name" required value="${esc(data?.name||'')}" placeholder="Stocks"><label>Target amount</label><input id="goalTarget" name="target_amount" type="number" step="0.01" min="0.01" required value="${data?.target_amount??''}" oninput="updateGoalPlan()"><label>Existing amount</label><input id="goalExisting" name="existing_amount" type="number" step="0.01" min="0" value="${data?.existing_amount??data?.saved_amount??0}" oninput="updateGoalPlan()"><div class="sub">Existing amount is preserved separately from future goal contributions.</div><label>Number of months to reach goal</label><input id="goalMonths" name="duration_months" type="number" min="1" step="1" required value="${data?.duration_months??remainingMonthsThisYear()}" oninput="updateGoalPlan()"><div id="goalPlanPreview" class="goal-plan" data-saved="${data?.saved_amount||0}"></div><label>Target date</label><input id="goalTargetDate" name="target_date" type="date" value="${esc(data?.target_date||'')}" oninput="this.dataset.manual='1'"><label>Icon</label><input name="icon" value="${esc(data?.icon||'🎯')}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">Save goal</button></form>`);
    $('f').onsubmit=async e=>{e.preventDefault();await submitForm('goal',data,e.target)};updateGoalPlan();return;
  }
  return legacyOpenModal(type,data);
};


/* ===== Final behavior overrides ===== */
function goalHTML(g){const target=Number(g.target_amount||0),saved=Number(g.saved_amount||0),pct=Math.min(100,target?saved/target*100:0),months=Math.max(1,Number(g.duration_months||remainingMonthsThisYear())),need=target>saved?Math.max(0,target-saved)/months:0;return `<div class="row"><div class="left"><div class="bubble goal">${esc(g.icon||'🌱')}</div><div style="min-width:0;flex:1"><div class="name">${esc(g.name)}</div><div class="sub">Existing ${money(g.existing_amount||0)} · Saved ${money(saved)} of ${money(target)}</div><div class="goal-plan"><span>Plan:</span><input class="goal-month-input" id="goalMonths_${g.id}" type="number" min="1" step="1" value="${months}" aria-label="Months to reach ${esc(g.name)}"><button type="button" class="smallbtn goal-save-months" onclick="saveGoalDuration('${g.id}')">Save</button><span>save <b>${money(need)}</b>/month</span></div><div class="progress"><div class="bar ${pct>=100?'full':pct>=50?'mid':'low'}" style="width:${pct}%"></div></div></div></div><div class="goal-actions"><button class="smallbtn" onclick="contribute('${g.id}')">＋ Add</button><button class="smallbtn" onclick="showGoalContrib('${g.id}')">History</button><button class="smallbtn" onclick="editGoal('${g.id}')">✎</button><button class="smallbtn dangerbtn" onclick="deleteGoal('${g.id}')">🗑</button></div></div>`}
function renderTransactions(){const types=['All','income','expense','transfer','split','reimbursement'];const active=filter;$('filters').innerHTML=types.map(x=>`<button class="chip ${active===x?'active':''}" onclick="filter='${x}';renderTransactions()">${x==='All'?'All':x[0].toUpperCase()+x.slice(1)}</button>`).join('')+`<button class="chip ${active==='description'?'active':''}" onclick="filter='description';renderTransactions()">Description</button><button class="chip ${active==='held'?'active':''}" onclick="filter='held';renderTransactions()">Held for others</button><button class="chip ${active==='lendborrow'?'active':''}" onclick="filter='lendborrow';renderTransactions()">Lend / Borrow</button>`;let arr=state.transactions.slice().sort((a,b)=>String(b.transaction_date).slice(0,10).localeCompare(String(a.transaction_date).slice(0,10)));if(types.includes(active)&&active!=='All')arr=arr.filter(t=>t.type===active);else if(active==='description')arr=arr.filter(t=>String(t.description||t.notes||'').trim());else if(active==='held'){$('txList').innerHTML=state.money_held.length?state.money_held.slice().sort((a,b)=>String(b.received_date).localeCompare(String(a.received_date))).map(h=>`<div class="row"><div class="left"><div class="bubble person">${otherPersonIcon()}</div><div><div class="name">Money held for ${esc(personName(h.person_id))}</div><div class="sub">${esc(h.purpose||'Money held for others')} · ${fmtDate(h.received_date)} · ${h.status==='settled'?'Settled':'Pending'}</div></div></div><b class="amber">${money(h.amount)}</b></div>`).join(''):'<div class="empty">No Money Held records.</div>';return}else if(active==='lendborrow'){const rows=[...state.loans.map(l=>({date:l.loan_date,name:(l.direction==='lend'?'Lent to ':'Borrowed from ')+personName(l.person_id),amount:l.amount,notes:l.notes})),...state.loan_repayments.map(r=>({date:r.repayment_date,name:(r.direction==='received'?'Repayment received from ':'Repayment sent to ')+personName(r.person_id),amount:r.amount,notes:r.notes}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('txList').innerHTML=rows.length?rows.map(r=>`<div class="row"><div><div class="name">${esc(r.name)}</div><div class="sub">${fmtDate(r.date)}${r.notes?' · '+esc(r.notes):''}</div></div><b>${money(r.amount)}</b></div>`).join(''):'<div class="empty">No lend/borrow records.</div>';return}$('txList').innerHTML=arr.length?arr.map(txHTML).join(''):'<div class="empty">No transactions found.</div>'}
function netWorth(){const held=typeof moneyHeldOutstanding==='function'?moneyHeldOutstanding():0;const receivable=peopleBalances().reduce((s,p)=>s+Number(p.balance||0),0),payable=peopleBalances().reduce((s,p)=>s+Number(p.iOwe||0),0);return Number(totalBalance()||0)-held+receivable-payable}
function runway(){const vals=[],now=todayDate();for(let i=1;i<=6;i++){const d=new Date(now);d.setMonth(d.getMonth()-i);const p=localDate(d).slice(0,7),end=localDate(new Date(d.getFullYear(),d.getMonth()+1,0));const v=personalSpendingBetween(p+'-01',end);if(v>0)vals.push(v)}const cur=personalSpendingBetween(ym()+'-01',today());if(cur>0)vals.push(cur);const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,net=Math.max(0,netWorth());if(!vals.length||avg<=0)return 'Not enough spending history';return `${(net/avg).toFixed(1)} months`}
function render(){const m=ym(),inc=sumType('income',m),spent=personalSpendingBetween(m+'-01',today()),saved=inc-spent,nowLabel=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());$('monthLabel').textContent=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());['transactionsDate','accountsDate','budgetsDate','calendarDate','goalsDate','peopleDate','insightsDate','moreDate','recurringDate','loansDate','splitDate','moneyHeldDate'].forEach(id=>{if($(id))$(id).textContent=nowLabel});if($('greetingText'))$('greetingText').textContent=greeting();$('totalBalance').textContent=money(totalBalance());$('monthIncome').textContent=money(inc);$('monthSpent').textContent=money(spent);$('monthSaved').textContent=money(saved);renderHome();renderTransactions();renderAccounts();renderBudgets();renderCalendar();renderGoals();renderPeople();renderLoans();renderInsights();renderRecurring();if($('moneyHeldList'))renderMoneyHeld();if($('splitList'))splitListHTML()}
function splitForm(data=null){splitMode=data?.split_type||'equal';splitIncludeMe=data?Number(data?.my_share||0)>0:true;splitRows=[];if(data?.id)splitRows=[{person_id:'__me__',amount:Number(data?.my_share||0),isMe:true},...state.split_participants.filter(x=>x.split_transaction_id===data.id).map(x=>({person_id:x.person_id,amount:Number(x.amount||0),isMe:false}))];if(!splitRows.length)splitRows=[{person_id:'__me__',amount:0,isMe:true},{person_id:'',amount:0,isMe:false}];return `<h2>${data?'Edit':'Split'} bill</h2><form id="f"><label>Total bill</label><input id="splitTotal" name="total_amount" type="number" step="0.01" min="0.01" required value="${data?.total_amount??''}" oninput="recalcSplit()"><label>Description</label><input name="description" value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><label>Paid from</label>${sel('account_id',state.accounts,data?.account_id||'',true)}${categoryFields('expense',data)}<label>Split type</label><div class="mode"><button type="button" id="eq" class="${splitMode==='equal'?'selected':''}" onclick="setSplitMode('equal')">Equal share</button><button type="button" id="uneq" class="${splitMode==='unequal'?'selected':''}" onclick="setSplitMode('unequal')">Unequal share</button></div><input type="hidden" name="split_type" id="splitType" value="${splitMode}"><label class="checkrow split-me-check"><input type="checkbox" id="splitIncludeMe" ${splitIncludeMe?'checked':''} onchange="splitIncludeMe=this.checked;recalcSplit()"> Include me (${esc(getNickname())})</label><div class="notice">If you are not part of the bill, turn this off — your share becomes ₹0 and the others are split equally.</div><div id="peopleRows"></div><button type="button" class="secondary" onclick="addSplitPerson()">＋ Add person</button><div class="split-summary" id="splitPreview"></div><button class="primary">${data?'Update split':'Save split'}</button></form>`}
function recurringForm(data=null){const typ=data?.type||'expense',recs=state.recurring_transactions;return `<h2>${data?'Edit':'Add'} recurring transaction</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Type</label><div class="mode"><button type="button" class="${typ==='expense'?'selected':''}" onclick="this.form.dataset.type='expense';openRecurringType('expense')">Expense</button><button type="button" class="${typ==='income'?'selected':''}" onclick="this.form.dataset.type='income';openRecurringType('income')">Income</button></div><select name="type" id="recurringType" class="hidden"><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" required value="${esc(data?.description||'')}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>To account (transfer only)</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',false)}<label>Category</label><select name="category_id">${categoryPool(typ).filter(c=>!c.parent_id).map(c=>`<option value="${c.id}" ${c.id===data?.category_id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><label>Frequency</label><select name="frequency"><option value="daily" ${data?.frequency==='daily'?'selected':''}>Daily</option><option value="weekly" ${data?.frequency==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.frequency==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.frequency==='yearly'?'selected':''}>Yearly</option></select><label>Next due date</label><input name="next_date" type="date" required value="${esc(data?.next_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${data?'Update':'Save'} recurring</button></form>`}
function openRecurringType(type){const f=$('f');if(!f)return;f.elements.type.value=type;const old=f.elements.category_id?.value||'';if(f.elements.category_id)f.elements.category_id.outerHTML=`<select name="category_id">${categoryPool(type).filter(c=>!c.parent_id).map(c=>`<option value="${c.id}" ${c.id===old?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`}
function exportPDF(){if(!window.jspdf)return alert('PDF library is unavailable.');const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'});let y=42;const W=595,H=842,M=34,clean=s=>String(s??'').replace(/[^\x20-\x7E₹]/g,'');const head=t=>{if(y>H-70){doc.addPage();y=42}doc.setFontSize(15);doc.setFont(undefined,'bold');doc.text(clean(t),M,y);y+=22;doc.setFont(undefined,'normal')};const line=s=>{for(const p of doc.splitTextToSize(clean(s),W-M*2)){if(y>H-42){doc.addPage();y=42}doc.setFontSize(8.5);doc.text(p,M,y);y+=12}};doc.setFontSize(21);doc.setFont(undefined,'bold');doc.text('My Budget - Financial Report',M,y);y+=20;doc.setFont(undefined,'normal');line('Generated '+new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}));head('Summary');line('Net balance: '+money(totalBalance()));line('Current month income: '+money(sumType('income',ym())));line('Current month spent: '+money(personalSpendingBetween(ym()+'-01',today())));line('Current month saved: '+money(sumType('income',ym())-personalSpendingBetween(ym()+'-01',today())));line('People who owe you: '+money(owedTotal()));line('Money held for others: '+money(moneyHeldOutstanding()));head('All transactions');state.transactions.slice().sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date))).forEach((t,i)=>line(`${i+1}. ${t.transaction_date} | ${t.type} | ${t.description||'(No description)'} | ${money(t.amount)} | ${accountName(t.account_id)}${t.to_account_id?' -> '+accountName(t.to_account_id):''} | ${txAllocations(t).map(x=>catName(x.category_id)+' '+money(x.amount)).join(', ')}`));head('Budgets');state.budgets.forEach(b=>{const s=budgetStatus(b);line(`${b.name} | ${b.period} | ${catName(b.category_id)} | Budget ${money(b.amount)} | Used ${money(s.used)} | ${s.pct.toFixed(0)}%`)});head('Goals');state.goals.forEach(g=>line(`${g.name} | Target ${money(g.target_amount)} | Existing ${money(g.existing_amount||0)} | Saved ${money(g.saved_amount)} | ${g.duration_months} months | ${goalETA(g)}`));head('Goal contributions');state.goal_contributions.forEach(g=>line(`${g.contribution_date} | ${g.name||g.goal_id} | ${money(g.amount)} | ${accountName(g.account_id)}`));head('Reminders');state.reminders.forEach(r=>line(`${r.due_date} | ${r.completed?'Completed':'Pending'} | ${r.title}${r.note?' | '+r.note:''}`));head('People');peopleBalances().forEach(p=>line(`${p.name} | They owe you ${money(p.balance)} | You owe them ${money(p.iOwe||0)} | Total owed ${money((p.totalOwed||0)+(p.loanLent||0))} | Repaid ${money((p.totalRepaid||0)+(p.loanReceived||0))}`));head('Lend & Borrow');state.loans.forEach(l=>line(`${l.loan_date} | ${personName(l.person_id)} | ${l.direction} | ${money(l.amount)} | ${accountName(l.account_id)}`));state.loan_repayments.forEach(r=>line(`${r.repayment_date} | ${personName(r.person_id)} | ${r.direction} | ${money(r.amount)} | ${accountName(r.account_id)}`));head('Money Held');state.money_held.forEach(h=>line(`${h.received_date} | ${personName(h.person_id)} | ${money(h.amount)} | ${h.purpose||''} | ${h.status}${h.settled_date?' | Settled '+h.settled_date:''} | ${accountName(h.account_id)}`));head('Recurring');state.recurring_transactions.forEach(r=>line(`${r.name} | ${r.type} | ${money(r.amount)} | ${r.frequency} | Next due ${r.next_date} | ${r.active?'Active':'Paused'}`));head('Categories');state.categories.forEach(c=>line(`${c.name} | ${c.type} | ${c.parent_id?catName(c.parent_id):'Parent'}`));head('Insights');const m=ym(),mi=sumType('income',m),me=personalSpendingBetween(m+'-01',today()),sv=mi-me;line(`Current month (${m}): income ${money(mi)}, spent ${money(me)}, saved ${money(sv)}, savings rate ${mi?(sv/mi*100).toFixed(1):0}%`);categoryGroups([m+'-01',today()]).forEach(g=>line(`${g.root.name}: ${money(g.spent)} (${me?(g.spent/me*100).toFixed(1):0}% of spending)`));line(weekdayInsightForRange(m+'-01',today()));line(salaryWeekInsightForRange(m+'-01',today()));line('Savings runway: '+runway());line('Next-month forecast: '+money(nextMonthPrediction()));head('Accounts');state.accounts.forEach(a=>line(`${a.name} | ${a.type} | Balance ${money(accountBalance(a))}`));doc.save('my-budget-financial-report.pdf')}

/* final list/report calculations */
function renderTransactions(){const types=['All','income','expense','transfer','split','reimbursement'];const active=filter;$('filters').innerHTML=types.map(x=>`<button class="chip ${active===x?'active':''}" onclick="filter='${x}';renderTransactions()">${x==='All'?'All':x[0].toUpperCase()+x.slice(1)}</button>`).join('')+`<button class="chip ${active==='description'?'active':''}" onclick="filter='description';renderTransactions()">Description</button><button class="chip ${active==='held'?'active':''}" onclick="filter='held';renderTransactions()">Held for others</button><button class="chip ${active==='lendborrow'?'active':''}" onclick="filter='lendborrow';renderTransactions()">Lend / Borrow</button>`;let arr=state.transactions.slice().sort((a,b)=>String(b.transaction_date).slice(0,10).localeCompare(String(a.transaction_date).slice(0,10)));if(types.includes(active)&&active!=='All')arr=arr.filter(t=>t.type===active);if(active==='description')arr=arr.filter(t=>String(t.description||t.notes||'').trim());if(active==='held'){const rows=state.money_held.slice().sort((a,b)=>String(b.received_date).localeCompare(String(a.received_date)));$('txList').innerHTML=rows.length?rows.map(h=>`<div class="row"><div class="left"><div class="bubble person">${otherPersonIcon()}</div><div><div class="name">Held for ${esc(personName(h.person_id))}</div><div class="sub">${esc(h.purpose||'Money held for others')} · ${fmtDate(h.received_date)} · ${h.status==='settled'?'Settled':'Pending'}${h.settled_date?' · Settled '+fmtDate(h.settled_date):''}</div></div></div><div><b class="amber">${money(h.amount)}</b><button class="smallbtn" onclick="editMoneyHeld('${h.id}')">✎</button></div></div>`).join(''):'<div class="empty">No Money Held records.</div>';return}if(active==='lendborrow'){const rows=[...state.loans.map(l=>({kind:'loan',id:l.id,date:l.loan_date,label:(l.direction==='lend'?'Lent to ':'Borrowed from ')+personName(l.person_id),amount:l.amount})),...state.loan_repayments.map(r=>({kind:'repayment',id:r.id,date:r.repayment_date,label:(r.direction==='received'?'Repayment received from ':'Repayment sent to ')+personName(r.person_id),amount:r.amount}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('txList').innerHTML=rows.length?rows.map(r=>`<div class="row"><div><div class="name">${esc(r.label)}</div><div class="sub">${fmtDate(r.date)}</div></div><div><b>${money(r.amount)}</b><button class="smallbtn" onclick="${r.kind==='loan'?`editLoan('${r.id}')`:`editLoanRepayment('${r.id}')`}">✎</button><button class="smallbtn dangerbtn" onclick="${r.kind==='loan'?`deleteLoan('${r.id}')`:`deleteLoanRepayment('${r.id}')`}">🗑</button></div></div>`).join(''):'<div class="empty">No lend/borrow records.</div>';return}$('txList').innerHTML=arr.length?arr.map(txHTML).join(''):'<div class="empty">No transactions found.</div>'}
function netWorth(){const held=state.money_held?.filter(h=>h.status==='pending').reduce((s,h)=>s+Number(h.amount||0),0)||0;const ps=peopleBalances(),receivable=ps.reduce((s,p)=>s+Number(p.balance||0),0),payable=ps.reduce((s,p)=>s+Number(p.iOwe||0),0);return Number(totalBalance()||0)-held+receivable-payable}
function runway(){const vals=[],now=todayDate();for(let i=1;i<=6;i++){const d=new Date(now);d.setMonth(d.getMonth()-i);const p=localDate(d).slice(0,7),end=localDate(new Date(d.getFullYear(),d.getMonth()+1,0));const v=personalSpendingBetween(p+'-01',end);if(v>0)vals.push(v)}const cur=personalSpendingBetween(ym()+'-01',today());if(cur>0)vals.push(cur);if(!vals.length)return 'Not enough spending history';const avg=vals.reduce((a,b)=>a+b,0)/vals.length,net=Math.max(0,netWorth());return `${(net/avg).toFixed(1)} months`}
function render(){const m=ym(),inc=sumType('income',m),spent=personalSpendingBetween(m+'-01',today()),saved=inc-spent,nowLabel=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());$('monthLabel').textContent=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());['transactionsDate','accountsDate','budgetsDate','calendarDate','goalsDate','peopleDate','insightsDate','moreDate','recurringDate','loansDate','splitDate','moneyHeldDate'].forEach(id=>{if($(id))$(id).textContent=nowLabel});if($('greetingText'))$('greetingText').textContent=greeting();$('totalBalance').textContent=money(totalBalance());$('monthIncome').textContent=money(inc);$('monthSpent').textContent=money(spent);$('monthSaved').textContent=money(saved);renderHome();renderTransactions();renderAccounts();renderBudgets();renderCalendar();renderGoals();renderPeople();renderLoans();renderInsights();renderRecurring();if($('moneyHeldList'))renderMoneyHeld();if($('splitList'))splitListHTML()}

const openModalFinal=openModal;
openModal=function(type,data=null){
  if(type!=='recurring')return openModalFinal(type,data);
  const typ=data?.type||'expense', parents=categoryPool(typ);
  openModalRaw(`<h2>${data?'Edit':'Add'} recurring transaction</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}"><label>Type</label><div class="mode"><button type="button" id="recExpense" class="${typ==='expense'?'selected':''}" onclick="openRecurringType('expense')">Expense</button><button type="button" id="recIncome" class="${typ==='income'?'selected':''}" onclick="openRecurringType('income')">Income</button><button type="button" id="recTransfer" class="${typ==='transfer'?'selected':''}" onclick="openRecurringType('transfer')">Transfer</button></div><input type="hidden" name="type" id="recurringType" value="${typ}"><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" required value="${esc(data?.description||'')}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>To account (for transfers)</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',false)}<label>Category</label><select name="category_id" id="recurringCategory"><option value="">No category</option>${parents.filter(c=>!c.parent_id).map(c=>`<option value="${c.id}" ${c.id===data?.category_id?'selected':''}>${esc(c.icon||'🏷️')} ${esc(c.name)}</option>`).join('')}</select><label>Frequency</label><select name="frequency"><option value="daily" ${data?.frequency==='daily'?'selected':''}>Daily</option><option value="weekly" ${data?.frequency==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.frequency==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.frequency==='yearly'?'selected':''}>Yearly</option></select><label>Next due date</label><input name="next_date" type="date" required value="${esc(data?.next_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${data?'Update':'Save'} recurring</button></form>`);
  $('f').onsubmit=async e=>{e.preventDefault();await submitForm('recurring',data,e.target)};
};
function openRecurringType(type){const f=$('f');if(!f)return;f.elements.type.value=type;['expense','income','transfer'].forEach(x=>$(`rec${x[0].toUpperCase()+x.slice(1)}`)?.classList.toggle('selected',x===type));const el=$('recurringCategory');if(el)el.innerHTML='<option value="">No category</option>'+categoryPool(type).filter(c=>!c.parent_id).map(c=>`<option value="${c.id}">${esc(c.icon||'🏷️')} ${esc(c.name)}</option>`).join('')}

function catSpent(c,range){return state.transactions.filter(t=>t.transaction_date>=range[0]&&t.transaction_date<=range[1]&&(t.type==='expense'||t.type==='split')).reduce((s,t)=>s+txAllocations(t).filter(x=>x.category_id===c.id).reduce((a,x)=>{if(t.type!=='split')return a+x.amount;const total=Number(t.amount||0),mine=spending(t);return a+(total>0?x.amount*(mine/total):0)},0),0)}
function budgetSpent(b){const [a,z]=periodRange(b.period,b);return state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&(t.type==='expense'||t.type==='split')).reduce((sum,t)=>sum+txAllocations(t).filter(x=>categoryMatchesBudget(x.category_id,b.category_id)).reduce((a,x)=>{if(t.type!=='split')return a+x.amount;const total=Number(t.amount||0),mine=spending(t);return a+(total>0?x.amount*(mine/total):0)},0),0)}

function renderLoans(){const balances=state.people.map(p=>({...p,...loanPersonBalance(p.id)})).filter(p=>p.theyOwe||p.iOwe||state.loans.some(l=>l.person_id===p.id));const owed=balances.reduce((s,p)=>s+p.theyOwe,0),owing=balances.reduce((s,p)=>s+p.iOwe,0);$('loansSummary').innerHTML=`<div class="loan-kpis"><div><span>THEY OWE YOU</span><b class="green">${money(owed)}</b></div><div><span>YOU OWE</span><b class="red">${money(owing)}</b></div></div>`;$('loanList').innerHTML=balances.length?balances.map(p=>`<div class="row"><div class="left"><div class="bubble loan">${otherPersonIcon()}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${p.theyOwe?`They owe you ${money(p.theyOwe)}`:p.iOwe?`You owe ${money(p.iOwe)}`:'Settled'}</div></div></div><div style="text-align:right">${p.theyOwe?`<button class="smallbtn" onclick="openLoanRepayment('${p.id}','received')">＋ Receive</button>`:''}${p.iOwe?`<button class="smallbtn" onclick="openLoanRepayment('${p.id}','sent')">＋ Repay</button>`:''}<button class="smallbtn" onclick="showLoanHistory('${p.id}')">History</button>${state.loans.filter(l=>l.person_id===p.id).map(l=>`<button class="smallbtn" onclick="editLoan('${l.id}')">✎</button><button class="smallbtn dangerbtn" onclick="deleteLoan('${l.id}')">🗑</button>`).join('')}</div></div>`).join(''):'<div class="empty">No loans recorded.</div>'}

function categoryOptions(type,value='',includeAll=false){const cats=state.categories.filter(c=>c.is_active!==false&&(c.type===type||c.type==='both'));return `<select name="category_id" ${includeAll?'':'required'}><option value="">${includeAll?'No category':'Select category'}</option>${cats.filter(c=>!c.parent_id).map(p=>`<option value="${p.id}" ${p.id===value?'selected':''}>${esc(p.icon||'')} ${esc(p.name)}</option>`).join('')}${cats.filter(c=>c.parent_id).map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>↳ ${esc(c.name)} (${esc(catName(c.parent_id))})</option>`).join('')}</select>`}
/* ===== My Budget vNext+ final feature patch ===== */
let transactionAccountMode='single', transactionAccountRows=[];
async function loadData(){
  for(const t of tables){
    const {data,error}=await sb.from(t).select('*');
    if(error) throw new Error(t+': '+error.message);
    state[t]=data||[];
  }
  const a=await sb.from('transaction_accounts').select('*');
  if(a.error && !/does not exist/i.test(a.error.message)) throw a.error;
  state.transaction_accounts=a.data||[];
  const o=await sb.from('recurring_occurrences').select('*');
  if(o.error && !/does not exist/i.test(o.error.message)) throw o.error;
  state.recurring_occurrences=o.data||[];
}
function mbToast(msg,type='success'){let e=$('mbToast');if(!e){e=document.createElement('div');e.id='mbToast';document.body.appendChild(e)}e.className='mb-toast '+type;e.textContent=msg;e.classList.add('show');clearTimeout(window.__mbToastTimer);window.__mbToastTimer=setTimeout(()=>e.classList.remove('show'),2600)}
function mbBusy(){} function mbBusyOff(){}
const MB_insert=insert,MB_update=update,MB_del=del;
insert=async function(t,row){return await MB_insert(t,row)};
update=async function(t,id,row){return await MB_update(t,id,row)};
del=async function(t,id){return await MB_del(t,id)};
function mbAccountRowsFor(txId,fallback,amount){const r=(state.transaction_accounts||[]).filter(x=>x.transaction_id===txId).map(x=>({account_id:x.account_id,amount:Number(x.amount||0)}));return r.length?r:[{account_id:fallback||'',amount:Number(amount||0)}]}
function accountAllocationFields(data,type){const rows=mbAccountRowsFor(data?.id||data?.transaction_id,data?.account_id,data?.amount);transactionAccountRows=rows;transactionAccountMode=rows.length>1?'multiple':'single';return `<div class="field-block account-allocation"><label>Account allocation</label><div class="mode"><button type="button" id="acctSingle" class="${transactionAccountMode==='single'?'selected':''}" onclick="setTransactionAccountMode('single','${type}')">Single account</button><button type="button" id="acctMultiple" class="${transactionAccountMode==='multiple'?'selected':''}" onclick="setTransactionAccountMode('multiple','${type}')">Multiple accounts</button></div><input type="hidden" name="account_id" id="primaryAccountId" value="${esc(rows[0]?.account_id||'')}"><div id="accountAllocation"></div></div>`}
function setTransactionAccountMode(mode,type){transactionAccountMode=mode;if(mode==='multiple'&&transactionAccountRows.length<2)transactionAccountRows=[...(transactionAccountRows.length?transactionAccountRows:[{account_id:'',amount:0}]),{account_id:'',amount:0}];renderTransactionAccountRows(type)}
function renderTransactionAccountRows(type){const e=$('accountAllocation');if(!e)return;$('acctSingle')?.classList.toggle('selected',transactionAccountMode==='single');$('acctMultiple')?.classList.toggle('selected',transactionAccountMode==='multiple');if(transactionAccountMode==='single'){const r=transactionAccountRows[0]||{account_id:'',amount:0};e.innerHTML=`<div class="category-grid"><div><label>Account</label>${sel('account_pick',state.accounts,r.account_id,true)}</div><div class="allocation-total"><span>Allocated</span><b>${money(Number($('f')?.elements.amount?.value||r.amount||0))}</b></div></div>`;$('account_pick')?.addEventListener('change',e=>{$('primaryAccountId').value=e.target.value;transactionAccountRows[0].account_id=e.target.value})}else{e.innerHTML=transactionAccountRows.map((r,i)=>`<div class="category-grid allocation-row"><div><label>Account ${i+1}</label>${sel('account_pick_'+i,state.accounts,r.account_id,true)}</div><div><label>Amount</label><input class="allocation-amount" type="number" min="0" step="0.01" value="${r.amount||''}" oninput="transactionAccountRows[${i}].amount=Number(this.value)||0"></div></div>`).join('')+`<button type="button" class="secondary" onclick="transactionAccountRows.push({account_id:'',amount:0});renderTransactionAccountRows('${type}')">＋ Add account</button>`;transactionAccountRows.forEach((r,i)=>$(`account_pick_${i}`)?.addEventListener('change',e=>{transactionAccountRows[i].account_id=e.target.value;$('primaryAccountId').value=transactionAccountRows[0]?.account_id||''}))}}
function transactionAccountData(total){if(transactionAccountMode==='single'){const id=transactionAccountRows[0]?.account_id||$('primaryAccountId')?.value;if(!id)throw new Error('Please select an account.');return [{account_id:id,amount:Number(total)}]}const rows=transactionAccountRows.filter(r=>r.account_id&&Number(r.amount)>0),sum=Math.round(rows.reduce((s,r)=>s+Number(r.amount||0),0)*100)/100;if(Math.abs(sum-Number(total))>.01)throw new Error(`Account amounts must add up to ${money(total)}. Currently allocated ${money(sum)}.`);return rows.map(r=>({account_id:r.account_id,amount:Number(r.amount)}))}
async function saveTransactionAccountRows(txId,rows){const q=await sb.from('transaction_accounts').delete().eq('transaction_id',txId);if(q.error)throw q.error;if(rows.length){const {error}=await sb.from('transaction_accounts').insert(rows.map(r=>({...r,transaction_id:txId,user_id:user.id})));if(error)throw error}}
function accountAllocationSummary(t){const rows=(state.transaction_accounts||[]).filter(x=>x.transaction_id===t.id);return rows.length?rows.map(r=>`${accountName(r.account_id)} ${money(r.amount)}`).join(', '):accountName(t.account_id)}
function accountBalance(a){let b=Number(a.opening_balance||0);for(const t of state.transactions){const n=Number(t.amount||0);if(t.type==='transfer'){if(t.account_id===a.id)b-=n;if(t.to_account_id===a.id)b+=n}else{const rows=txAccountIndex.get(t.id);const alloc=rows?rows.filter(x=>x.account_id===a.id).reduce((s,x)=>s+Number(x.amount||0),0):0,used=alloc||((t.account_id===a.id)?n:0);if(t.type==='income'||t.type==='reimbursement')b+=used;if(t.type==='expense'||t.type==='split')b-=used}}for(const l of state.loans){const n=Number(l.amount||0);if(l.account_id===a.id)b+=l.direction==='borrow'?n:-n}for(const r of state.loan_repayments){const n=Number(r.amount||0);if(r.account_id===a.id)b+=r.direction==='received'?n:-n}for(const h of state.money_held){if(h.account_id===a.id)b+=Math.max(0,Number(h.amount||0)-Number(h.settled_amount||0))}return b}
function budgetCategoryLabel(b){const p=b.category_id?catName(b.category_id):'All categories',s=b.subcategory_id?catName(b.subcategory_id):'';return s?`${p} → ${s}`:p}
function budgetCategoryFields(data){const c=data?.category_id?state.categories.find(x=>x.id===data.category_id):null,p=c?.parent_id?rootCategory(c):c,sid=data?.subcategory_id||(c?.parent_id?c.id:'');return `<div class="category-grid"><div><label>Category</label><select id="budgetParent" name="category_id"><option value="">All categories</option>${categoryPool('expense').filter(c=>!c.parent_id).map(c=>`<option value="${c.id}" ${c.id===p?.id?'selected':''}>${esc(c.icon||'🏷️')} ${esc(c.name)}</option>`).join('')}</select></div><div><label>Subcategory</label><select id="budgetSubcategory" name="subcategory_id"><option value="">Use parent directly</option>${p?categoryPool('expense').filter(c=>c.parent_id===p.id).map(c=>`<option value="${c.id}" ${c.id===sid?'selected':''}>${esc(c.icon||'↳')} ${esc(c.name)}</option>`).join(''):''}</select></div></div>`}
function refreshBudgetSubcategories(){const p=$('budgetParent')?.value||'',e=$('budgetSubcategory');if(!e)return;e.innerHTML='<option value="">Use parent directly</option>'+(p?categoryPool('expense').filter(c=>c.parent_id===p).map(c=>`<option value="${c.id}">${esc(c.icon||'↳')} ${esc(c.name)}</option>`).join(''):'')}
const MB_baseSaveModal=saveModal;
saveModal=async function(type,data,f){
 if(type==='budget'){const x=Object.fromEntries(new FormData(f).entries()),now=todayDate();let row={name:x.name,category_id:x.category_id||null,subcategory_id:x.subcategory_id||null,amount:Number(x.amount),period:x.period,year:now.getFullYear(),month:x.period==='monthly'?now.getMonth()+1:null,start_date:null,end_date:null,notes:x.notes||null};if(x.period==='weekly'){const day=now.getDay()||7,st=new Date(now);st.setDate(st.getDate()-day+1);const en=new Date(st);en.setDate(en.getDate()+6);row.year=st.getFullYear();row.month=null;row.start_date=localDate(st);row.end_date=localDate(en)}data?await update('budgets',data.id,row):await insert('budgets',row);return}
 if(type==='income'||type==='expense'){const x=Object.fromEntries(new FormData(f).entries()),amount=Number(x.amount),acc=transactionAccountData(amount),cats=transactionCategoryData(amount,type),primary=acc[0].account_id;let recurringId=data?.recurring_id||null;if(x.make_recurring&&!data){const r=await insert('recurring_transactions',{name:x.description||type,type,amount,description:x.description||type,account_id:primary,to_account_id:null,category_id:cats[0]?.category_id||null,frequency:x.recurring_frequency||'monthly',next_date:String(x.recurring_next_date||x.transaction_date).slice(0,10),notes:x.notes||null,active:true});recurringId=r.id}const row={amount,description:x.description||'',transaction_date:String(x.transaction_date).slice(0,10),account_id:primary,category_id:cats[0]?.category_id||null,notes:x.notes||null,type};const tx=data?await update('transactions',data.id,row):await insert('transactions',{...row,recurring_id:recurringId});await saveTransactionCategoryRows(tx.id,cats);await saveTransactionAccountRows(tx.id,acc);await mbRecordRecurringOccurrence(x.use_recurring_id||data?.recurring_id,tx.id,x.recurring_occurrence_date||x.transaction_date);return tx}
 if(type==='split'){const x=Object.fromEntries(new FormData(f).entries()),total=Number(x.total_amount),acc=transactionAccountData(total);x.account_id=acc[0].account_id;await MB_baseSaveModal(type,data,f);let tx=data?.transaction_id?state.transactions.find(t=>t.id===data.transaction_id):null;if(!tx){const {data:rows,error}=await sb.from('transactions').select('*').eq('user_id',user.id).eq('transaction_date',String(x.transaction_date).slice(0,10)).eq('type','split').order('created_at',{ascending:false}).limit(1);if(error)throw error;tx=rows?.[0]}if(tx?.id)await saveTransactionAccountRows(tx.id,acc);return tx}
 if(type==='recurring'){const x=Object.fromEntries(new FormData(f).entries()),row={name:x.name,type:x.type,amount:Number(x.amount),description:x.description||x.name,account_id:x.account_id,to_account_id:x.to_account_id||null,category_id:x.category_id||null,frequency:x.frequency,next_date:x.next_date,notes:x.notes||null};if(data)await update('recurring_transactions',data.id,row);else await insert('recurring_transactions',{...row,active:true});return}
 return MB_baseSaveModal(type,data,f)
}
function openTransactionModalWithAccounts(type,data=null){transactionCategoryRows=[];const recs=state.recurring_transactions.filter(r=>r.active&&r.type===type),txId=data?.id,existing=txId?(state.transaction_accounts||[]).filter(x=>x.transaction_id===txId):[];transactionAccountRows=existing.length?existing.map(x=>({account_id:x.account_id,amount:Number(x.amount||0)})):[{account_id:data?.account_id||'',amount:Number(data?.amount||0)}];transactionAccountMode=existing.length>1?'multiple':'single';openModalRaw(`<h2>${data?'Edit':'Add'} ${type}</h2><form id="f"><label>Recurring entry (optional)</label><select id="recurringSelect" name="use_recurring_id" onchange="fillRecurringIntoForm(this.value)"><option value="">Manual entry</option>${recs.map(r=>`<option value="${r.id}">${esc(r.name)} · ${money(r.amount)} · ${r.frequency}</option>`).join('')}</select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}" oninput="renderTransactionAccountRows('${type}')"><label>Description</label><input name="description" value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><input type="hidden" name="recurring_occurrence_date" id="recurringOccurrenceDate" value=""><label>Account</label>${accountAllocationFields(data,type)}${categoryFields(type,data)}<label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><label class="checkrow"><input type="checkbox" name="make_recurring" value="1"> Make this recurring</label><div class="recurring-options"><label>Frequency</label><select name="recurring_frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select><label>First due date</label><input name="recurring_next_date" type="date" value="${esc(data?.transaction_date||today())}"></div><button class="primary">${data?'Update':'Save'} transaction</button></form>`);$('f').onsubmit=async e=>{e.preventDefault();await submitForm(type,data,e.target)};renderTransactionAccountRows(type);renderTransactionCategoryRows(type)}
function openSplitModalWithAccounts(data=null){splitMode=data?.split_type||'equal';splitIncludeMe=data?Number(data?.my_share||0)>0:true;splitRows=[];if(data?.id)splitRows=[{person_id:'__me__',amount:Number(data?.my_share||0),isMe:true},...state.split_participants.filter(x=>x.split_transaction_id===data.id).map(x=>({person_id:x.person_id,amount:Number(x.amount||0),isMe:false}))];if(!splitRows.length)splitRows=[{person_id:'__me__',amount:0,isMe:true},{person_id:'',amount:0,isMe:false}];const tx=data?.transaction_id?state.transactions.find(t=>t.id===data.transaction_id):data;transactionAccountRows=(state.transaction_accounts||[]).filter(x=>x.transaction_id===tx?.id).map(x=>({account_id:x.account_id,amount:Number(x.amount||0)}));if(!transactionAccountRows.length)transactionAccountRows=[{account_id:tx?.account_id||'',amount:Number(data?.total_amount||tx?.amount||0)}];transactionAccountMode=transactionAccountRows.length>1?'multiple':'single';transactionCategoryRows=[];openModalRaw(`<h2>${data?'Edit':'Add'} split bill</h2><form id="f"><label>Total bill</label><input id="splitTotal" name="total_amount" type="number" step="0.01" min="0.01" required value="${data?.total_amount??''}" oninput="recalcSplit();renderTransactionAccountRows('split')"><label>Description</label><input name="description" value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}">${accountAllocationFields({id:tx?.id,account_id:tx?.account_id,amount:data?.total_amount||tx?.amount},'split')}${categoryFields('expense',data)}<label>Split type</label><div class="mode"><button type="button" id="eq" class="${splitMode==='equal'?'selected':''}" onclick="setSplitMode('equal')">Equal share</button><button type="button" id="uneq" class="${splitMode==='unequal'?'selected':''}" onclick="setSplitMode('unequal')">Unequal share</button></div><input type="hidden" name="split_type" id="splitType" value="${splitMode}"><label class="checkrow split-me-check"><input type="checkbox" id="splitIncludeMe" ${splitIncludeMe?'checked':''} onchange="splitIncludeMe=this.checked;recalcSplit()"> Include me (${esc(getNickname())})</label><div class="notice">If you are not part of the bill, turn this off — your share becomes ₹0.</div><div id="peopleRows"></div><button type="button" class="secondary" onclick="addSplitPerson()">＋ Add person</button><div class="split-summary" id="splitPreview"></div><button class="primary">${data?'Update split':'Save split'}</button></form>`);$('f').onsubmit=async e=>{e.preventDefault();await submitForm('split',data,e.target)};renderSplitRows();renderTransactionAccountRows('split');renderTransactionCategoryRows('expense')}
const MB_openModal2=openModal;
openModal=function(type,data=null){
 if(type==='budget'){openModalRaw(`<h2>${data?'Edit':'Add'} budget</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}">${budgetCategoryFields(data)}<label>Amount</label><input name="amount" type="number" step="0.01" min="0" required value="${data?.amount??''}"><label>Period</label><select name="period"><option value="weekly" ${data?.period==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.period==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.period==='yearly'?'selected':''}>Yearly</option></select><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${data?'Update':'Save'} budget</button></form>`);$('budgetParent').onchange=refreshBudgetSubcategories;$('f').onsubmit=async e=>{e.preventDefault();await submitForm('budget',data,e.target)};return}
 if(type==='income'||type==='expense'){openTransactionModalWithAccounts(type,data);return}
 if(type==='split'){openSplitModalWithAccounts(data);return}
 MB_openModal2(type,data)
}
function goalHTML(g){const target=Number(g.target_amount||0),saved=Number(g.saved_amount||0),pct=Math.min(100,target?saved/target*100:0),months=Math.max(1,Number(g.duration_months||remainingMonthsThisYear())),need=target>saved?Math.max(0,target-saved)/months:0;return `<div class="goal-card"><div class="goal-head"><div class="left"><div class="bubble goal">${esc(g.icon||'🎯')}</div><div><div class="name">${esc(g.name)}</div><div class="sub">Target ${money(target)} · Existing ${money(g.existing_amount||0)}</div></div></div><div class="goal-actions"><button class="smallbtn" onclick="contribute('${g.id}')">＋ Add</button><button class="smallbtn" onclick="showGoalContrib('${g.id}')">History</button><button class="smallbtn" onclick="editGoal('${g.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteGoal('${g.id}')">Delete</button></div></div><div class="goal-progress-line"><div class="progress"><div class="bar ${pct>=100?'full':pct>=50?'mid':'low'}" style="width:${pct}%"></div></div><b>${pct.toFixed(0)}%</b></div><div class="goal-amounts"><span>Existing <b>${money(g.existing_amount||0)}</b></span><span>Saved <b>${money(saved)}</b></span><span>Target <b>${money(target)}</b></span><span>Remaining <b>${money(Math.max(0,target-saved))}</b></span></div><div class="goal-plan"><span>Plan: ${months} month${months===1?'':'s'}</span><input class="goal-month-input" id="goalMonths_${g.id}" type="number" min="1" step="1" value="${months}"><button type="button" class="smallbtn" onclick="saveGoalDuration('${g.id}')">Save</button><span>${money(need)}/month</span></div></div>`}
function peopleBalances(){return state.people.map(p=>{const sp=state.split_participants.filter(x=>x.person_id===p.id),splitGross=sp.reduce((s,x)=>s+Number(x.amount||0),0),splitOutstanding=sp.reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.amount_paid||0)),0),splitRep=state.reimbursements.filter(x=>x.person_id===p.id).reduce((s,x)=>s+Number(x.amount||0),0),lent=state.loans.filter(x=>x.person_id===p.id&&x.direction==='lend').reduce((s,x)=>s+Number(x.amount||0),0),borrowed=state.loans.filter(x=>x.person_id===p.id&&x.direction==='borrow').reduce((s,x)=>s+Number(x.amount||0),0),received=state.loan_repayments.filter(x=>x.person_id===p.id&&x.direction==='received').reduce((s,x)=>s+Number(x.amount||0),0),sent=state.loan_repayments.filter(x=>x.person_id===p.id&&x.direction==='sent').reduce((s,x)=>s+Number(x.amount||0),0),held=state.money_held.filter(x=>x.person_id===p.id),heldTotal=held.reduce((s,x)=>s+Number(x.amount||0),0),heldPending=held.reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.settled_amount||0)),0);return {...p,balance:Math.max(0,splitOutstanding-splitRep)+Math.max(0,lent-received),iOwe:Math.max(0,borrowed-sent),totalOwed:splitGross,totalRepaid:splitRep,splitPending:Math.max(0,splitOutstanding-splitRep),splitSettled:Math.max(0,splitGross-splitOutstanding),loanLent:lent,loanBorrowed:borrowed,loanReceived:received,loanSent:sent,loanOwed:Math.max(0,lent-received),loanIowe:Math.max(0,borrowed-sent),heldTotal,heldPending,heldSettled:Math.max(0,heldTotal-heldPending)}}).sort((a,b)=>(b.balance+b.iOwe)-(a.balance+a.iOwe))}
function personHTML(p){return `<div class="person-card"><div class="row"><div class="left"><div class="bubble person">${otherPersonIcon()}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${p.balance?`They owe you ${money(p.balance)}`:p.iOwe?`You owe them ${money(p.iOwe)}`:'Settled'}</div></div></div><div class="action-row"><button class="smallbtn" onclick="editPerson('${p.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deletePerson('${p.id}')">Delete</button></div></div><div class="person-metrics"><span>Split pending <b>${money(p.splitPending)}</b></span><span>Split repaid <b>${money(p.totalRepaid)}</b></span><span>Held pending <b>${money(p.heldPending)}</b></span><span>Held settled <b>${money(p.heldSettled)}</b></span><span>Lent outstanding <b>${money(p.loanOwed)}</b></span><span>Borrowed outstanding <b>${money(p.loanIowe)}</b></span><span>Loan received <b>${money(p.loanReceived)}</b></span><span>Loan repaid <b>${money(p.loanSent)}</b></span></div></div>`}
function renderPeople(){$('peopleList').innerHTML=peopleBalances().map(personHTML).join('')||'<div class="empty">No people yet.</div>'}
function renderLoans(){const bs=peopleBalances().filter(p=>p.loanLent||p.loanBorrowed||p.loanReceived||p.loanSent);$('loansSummary').innerHTML=`<div class="loan-kpis"><div><span>THEY OWE YOU</span><b class="green">${money(bs.reduce((s,p)=>s+p.loanOwed,0))}</b></div><div><span>YOU OWE</span><b class="red">${money(bs.reduce((s,p)=>s+p.loanIowe,0))}</b></div></div>`;$('loanList').innerHTML=bs.length?bs.map(p=>`<div class="loan-person-card"><div class="name">${esc(p.name)}</div><div class="loan-direction-grid"><div><span class="label">LEND</span><b class="green">${money(p.loanLent)}</b><small>Received back ${money(p.loanReceived)} · Outstanding ${money(p.loanOwed)}</small><div class="loan-actions"><button class="smallbtn" onclick="openLoanRepayment('${p.id}','received')">Receive</button><button class="smallbtn" onclick="showLoanHistory('${p.id}')">History</button></div></div><div><span class="label">BORROW</span><b class="red">${money(p.loanBorrowed)}</b><small>Repaid ${money(p.loanSent)} · Outstanding ${money(p.loanIowe)}</small><div class="loan-actions"><button class="smallbtn" onclick="openLoanRepayment('${p.id}','sent')">Repay</button><button class="smallbtn" onclick="showLoanHistory('${p.id}')">History</button></div></div></div>${state.loans.filter(l=>l.person_id===p.id).map(l=>`<div class="loan-record"><span>${l.direction==='lend'?'LEND':'BORROW'} · ${money(l.amount)} · ${fmtDate(l.loan_date)}</span><span><button class="smallbtn" onclick="editLoan('${l.id}')">Edit loan</button><button class="smallbtn dangerbtn" onclick="deleteLoan('${l.id}')">Delete loan</button></span></div>`).join('')}</div>`).join(''):'<div class="empty">No lend or borrow records.</div>'}
function moneyHeldOutstanding(){return state.money_held.reduce((s,h)=>s+Math.max(0,Number(h.amount||0)-Number(h.settled_amount||0)),0)}
function heldHTML(h){const out=Math.max(0,Number(h.amount||0)-Number(h.settled_amount||0)),settled=out<=.009;return `<div class="row"><div class="left"><div class="bubble person">${otherPersonIcon()}</div><div><div class="name">${esc(personName(h.person_id))}</div><div class="sub">${esc(h.purpose||'Money held for others')} · Received ${fmtDate(h.received_date)}</div><div class="sub"><b class="${settled?'green':'amber'}">${settled?'Settled':'Pending'}</b> · ${money(out)} remaining${h.settled_date?' · Last settled '+fmtDate(h.settled_date):''}</div></div></div><div style="text-align:right"><b class="${settled?'green':'amber'}">${money(h.amount)}</b><div class="action-row"><button class="smallbtn" onclick="editMoneyHeld('${h.id}')">Edit</button>${out>0?`<button class="smallbtn" onclick="toggleMoneyHeld('${h.id}')">Settle</button>`:''}<button class="smallbtn dangerbtn" onclick="deleteMoneyHeld('${h.id}')">Delete</button></div></div></div>`}
async function toggleMoneyHeld(id){const h=state.money_held.find(x=>x.id===id);if(!h)return;const out=Math.max(0,Number(h.amount||0)-Number(h.settled_amount||0));if(out<=.009){return}openModalRaw(`<h2>Settle money held</h2><p class="sub">${money(out)} remains in ${esc(accountName(h.account_id))}. Enter the amount actually settled now.</p><form id="f"><label>Settlement amount</label><input name="settlement_amount" type="number" min="0.01" max="${out.toFixed(2)}" step="0.01" value="${out.toFixed(2)}" required><label>Settlement date</label><input name="settled_date" type="date" value="${today()}" required><button class="primary">Mark settlement</button></form>`);$('f').onsubmit=async e=>{e.preventDefault();try{const x=Object.fromEntries(new FormData(e.target)),amt=Number(x.settlement_amount),newSettled=Number(h.settled_amount||0)+amt;if(amt>out+.01)throw new Error('Settlement amount cannot exceed the remaining held amount.');const updated=await update('money_held',id,{settled_amount:newSettled,status:newSettled>=Number(h.amount)-.009?'settled':'pending',settled_date:String(x.settled_date).slice(0,10)});const idx=state.money_held.findIndex(x=>x.id===id);if(idx>-1)state.money_held[idx]=updated;closeModal();render();mbToast(newSettled>=Number(h.amount)-.009?'Money held fully settled.':'Partial settlement saved.')}catch(err){mbToast(friendlyError(err),'error')}}}
function mbNextDate(ds,f){const d=dateObj(ds);if(f==='daily')d.setUTCDate(d.getUTCDate()+1);else if(f==='weekly')d.setUTCDate(d.getUTCDate()+7);else if(f==='yearly')d.setUTCFullYear(d.getUTCFullYear()+1);else d.setUTCMonth(d.getUTCMonth()+1);return localDate(d)}
function recurringOccursOn(r,ds){const start=String(r.next_date).slice(0,10),d=dateObj(ds),s=dateObj(start);if(ds<start)return false;if(r.frequency==='daily')return true;if(r.frequency==='weekly')return Math.round((d-s)/86400000)%7===0;if(r.frequency==='monthly')return d.getUTCDate()===s.getUTCDate();if(r.frequency==='yearly')return d.getUTCDate()===s.getUTCDate()&&d.getUTCMonth()===s.getUTCMonth();return false}
async function mbRecordRecurringOccurrence(recurringId,txId,occDate){if(!recurringId)return;const o=(state.recurring_occurrences||[]).find(x=>x.recurring_id===recurringId&&String(x.due_date).slice(0,10)===String(occDate).slice(0,10));if(o)await update('recurring_occurrences',o.id,{status:'recorded',transaction_id:txId})}
async function processRecurring(show){let n=0;for(const r of state.recurring_transactions.filter(x=>x.active)){let d=String(r.next_date).slice(0,10),guard=0;const batch=[];while(d<=today()&&guard++<366){if(!(state.recurring_occurrences||[]).some(o=>o.recurring_id===r.id&&String(o.due_date).slice(0,10)===d)){batch.push({recurring_id:r.id,due_date:d,status:'due',transaction_id:null,user_id:user.id})}d=mbNextDate(d,r.frequency)}if(batch.length){const {error}=await sb.from('recurring_occurrences').insert(batch);if(error)throw error;n+=batch.length}if(d!==String(r.next_date).slice(0,10))await update('recurring_transactions',r.id,{next_date:d,last_generated_date:today()})}if(show){await loadData();render();mbToast(n?`${n} due recurring item${n===1?'':'s'} created.`:'Nothing new is due.')}return n}
function useRecurring(id,date=selectedDate){const r=state.recurring_transactions.find(x=>x.id===id);if(!r)return;const ds=String(date||r.next_date||today()).slice(0,10);window.__recurringUseDate=ds;openModal(r.type,null);setTimeout(()=>{const f=$('f');if(!f)return;const sel=$('recurringSelect');if(sel){sel.value=r.id;fillRecurringIntoForm(r.id);}if(f.elements.transaction_date)f.elements.transaction_date.value=ds;if($('recurringOccurrenceDate'))$('recurringOccurrenceDate').value=ds;},0)}
function fillRecurringIntoForm(id){const r=state.recurring_transactions.find(x=>x.id===id),f=$('f');if(!r||!f)return;const ds=selectedDate&&recurringOccursOn(r,selectedDate)?selectedDate:r.next_date;if(f.elements.amount)f.elements.amount.value=r.amount;if(f.elements.description)f.elements.description.value=r.description||r.name;if(f.elements.transaction_date)f.elements.transaction_date.value=ds;if($('recurringOccurrenceDate'))$('recurringOccurrenceDate').value=ds;if(f.elements.recurring_next_date)f.elements.recurring_next_date.value=r.next_date;transactionAccountRows=[{account_id:r.account_id,amount:Number(r.amount)}];transactionAccountMode='single';renderTransactionAccountRows(r.type);const root=rootCategory(state.categories.find(c=>c.id===r.category_id));if(transactionCategoryRows.length){transactionCategoryRows[0].parent_id=root?.id||'';transactionCategoryRows[0].category_id=r.category_id||'';transactionCategoryRows[0].amount=Number(r.amount);renderTransactionCategoryRows(r.type)}}
function renderRecurring(){const rows=state.recurring_transactions,occ=state.recurring_occurrences||[],due=occ.filter(x=>x.status==='due');$('recurringList').innerHTML=rows.length?rows.map(r=>{const ds=occ.filter(o=>o.recurring_id===r.id&&o.status==='due').sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));return `<div class="recurring-card"><div><div class="name">${esc(r.name)}</div><div class="sub">${r.frequency} · ${money(r.amount)} · Next due ${fmtDate(r.next_date)} · ${r.active?'Active':'Paused'}</div>${ds.length?`<div class="due-list"><b>${ds.length} due</b>${ds.slice(0,5).map(o=>`<button class="smallbtn" onclick="useRecurring('${r.id}','${o.due_date}')">${fmtDate(o.due_date)} · Use</button>`).join('')}</div>`:'<div class="sub">No due items.</div>'}</div><div class="action-row"><button class="smallbtn" onclick="editRecurring('${r.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteRecurring('${r.id}')">Delete</button></div></div>`}).join(''):'<div class="empty">No recurring schedules.</div>';if($('generateDueLabel'))$('generateDueLabel').textContent=`Generate due items${due.length?' · '+due.length+' pending':''}`}

function renderCalendar(){const y=calCursor.getUTCFullYear(),m=calCursor.getUTCMonth();$('calTitle').textContent=new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m,15)));const firstDay=new Date(Date.UTC(y,m,1)),start=(firstDay.getUTCDay()||7)-1,last=new Date(Date.UTC(y,m+1,0)).getUTCDate(),cells=[];for(let i=0;i<42;i++){const day=i-start+1,valid=day>=1&&day<=last,ds=valid?`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';const sp=valid?personalSpendingBetween(ds,ds):0,ro=valid?(state.recurring_occurrences||[]).filter(o=>String(o.due_date).slice(0,10)===ds).length:0,rf=valid?state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,ds)).length:0,rm=valid?state.reminders.filter(r=>!r.completed&&String(r.due_date).slice(0,10)===ds).length:0;cells.push(`<div class="cal-cell heat${sp===0?0:sp<1000?1:sp<3000?2:sp<7000?3:4} ${!valid?'muted':''} ${ds===selectedDate?'selected':''}" ${valid?`onclick="selectDate('${ds}')"`:''}><div class="cal-num">${valid?day:''}</div>${valid&&sp?`<div class="cal-spend red">−${money(sp)}</div>`:''}${ro||rf?'<span class="calendar-dot recurring-dot">•</span>':''}${rm?'<span class="calendar-dot reminder-dot">🔔</span>':''}</div>`)}$('calGrid').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="cal-day-name">${x}</div>`).join('')+cells.join('');const dayKey=String(selectedDate||today()).slice(0,10),tx=state.transactions.filter(t=>String(t.transaction_date).slice(0,10)===dayKey),due=(state.recurring_occurrences||[]).filter(o=>String(o.due_date).slice(0,10)===dayKey&&o.status==='due'),scheduled=state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,dayKey)),dayRem=state.reminders.filter(r=>String(r.due_date).slice(0,10)===dayKey);$('selectedDay').innerHTML=`<div class="total-line"><b>${fmtDate(dayKey)}</b><span class="badge">${tx.length} transaction${tx.length===1?'':'s'}</span></div><div class="three"><div><div class="label">INCOME</div><b class="green">${money(sumType('income',dayKey))}</b></div><div><div class="label">SPENT</div><b class="red">${money(personalSpendingBetween(dayKey,dayKey))}</b></div><div><div class="label">TRANSFER</div><b class="purple">${money(sumType('transfer',dayKey))}</b></div></div>${(due.length||scheduled.length)?`<div class="selected-recurring"><div class="day-recurring-title"><span>Recurring on this date</span></div>${(due.length?due:scheduled.map(r=>({recurring_id:r.id,due_date:dayKey}))).map(o=>{const r=state.recurring_transactions.find(x=>x.id===o.recurring_id);return r?`<div class="mini-stat"><span>${esc(r.name)}<small>${r.frequency} · ${r.type} · ${money(r.amount)}</small></span><button class="smallbtn" onclick="useRecurring('${r.id}','${dayKey}')">Use</button></div>`:''}).join('')}</div>`:''}${dayRem.length?`<div class="selected-reminders"><b>Reminders on this date</b>${dayRem.map(reminderHTML).join('')}</div>`:''}${tx.length?'<div style="margin-top:10px">'+tx.map(txHTML).join('')+'</div>':'<div class="empty">No transactions on this date.</div>'}`}
function renderRemindersPage(){const e=$('remindersPageList');if(!e)return;const p=state.reminders.filter(r=>!r.completed).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))),c=state.reminders.filter(r=>r.completed).sort((a,b)=>String(b.due_date).localeCompare(String(a.due_date)));e.innerHTML=`<div class="section-title-inline">Pending <span>${p.length}</span></div>${p.map(reminderHTML).join('')||'<div class="empty">No pending reminders.</div>'}<div class="section-title-inline">Completed <span>${c.length}</span></div>${c.map(reminderHTML).join('')||'<div class="empty">No completed reminders.</div>'}`}
function renderHome(){const now=todayDate(),b=state.budgets.find(x=>x.period==='monthly'&&(!x.year||x.year===now.getFullYear())&&(!x.month||x.month===now.getMonth()+1));$('homeBudget').innerHTML=b?budgetHTML(b):'<div class="empty">No monthly budget yet.</div>';const gs=state.goals.slice().sort((a,b)=>Number(b.is_completed)-Number(a.is_completed)).slice(0,1);$('homeGoals').innerHTML=gs.length?gs.map(goalHTML).join(''):'<div class="empty">No goals yet.</div>';const ps=peopleBalances().filter(x=>x.balance>0||x.iOwe>0).slice(0,3);$('homePeople').innerHTML=ps.length?ps.map(personHTML).join(''):'<div class="empty">No outstanding people balances.</div>';const rs=state.reminders.filter(r=>!r.completed).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));$('homeReminders').innerHTML=rs.length?rs.map(reminderHTML).join(''):'<div class="empty">No pending reminders.</div>';const tx=state.transactions.slice().sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date))).slice(0,5);$('homeRecent').innerHTML=tx.length?tx.map(txHTML).join(''):'<div class="empty">No transactions yet.</div>'}
let mbFilter={type:'All',from:'',to:'',category:'',subcategory:'',account:'',person:'',description:'',kind:'all'};
function openTransactionFilters(){openModalRaw(`<h2>Filter transactions</h2><form id="filterForm"><label>From date</label><input type="date" name="from" value="${esc(mbFilter.from)}"><label>To date</label><input type="date" name="to" value="${esc(mbFilter.to)}"><label>Type</label><select name="type"><option>All</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option><option value="split">Split</option><option value="reimbursement">Reimbursement</option></select><label>Category</label><select name="category"><option value="">All categories</option>${categoryPool('expense').filter(c=>!c.parent_id).map(c=>`<option value="${c.id}" ${mbFilter.category===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><label>Account</label>${sel('account',state.accounts,mbFilter.account,false)}<label>Person</label>${sel('person',state.people,mbFilter.person,false)}<label>Description contains</label><input name="description" value="${esc(mbFilter.description)}"><label>Special</label><select name="kind"><option value="all">All</option><option value="held">Held for others</option><option value="lendborrow">Lend / Borrow</option><option value="recurring">Recurring-linked</option></select><div class="action-row"><button type="button" class="secondary" onclick="mbFilter={type:'All',from:'',to:'',category:'',subcategory:'',account:'',person:'',description:'',kind:'all'};closeModal();renderTransactions()">Clear</button><button class="primary">Apply filters</button></div></form>`);$('filterForm').onsubmit=e=>{e.preventDefault();mbFilter={...mbFilter,...Object.fromEntries(new FormData(e.target))};closeModal();renderTransactions()}}
function renderTransactions(){const types=['All','income','expense','transfer','split','reimbursement'],active=mbFilter.type||'All';$('filters').innerHTML=types.map(x=>`<button class="chip ${active===x?'active':''}" onclick="mbFilter.type='${x}';renderTransactions()">${x==='All'?'All':x[0].toUpperCase()+x.slice(1)}</button>`).join('')+'<button class="chip filter-button" onclick="openTransactionFilters()">⚙ Filters</button>';let arr=state.transactions.slice().sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date)));if(active!=='All')arr=arr.filter(t=>t.type===active);if(mbFilter.from)arr=arr.filter(t=>String(t.transaction_date)>=mbFilter.from);if(mbFilter.to)arr=arr.filter(t=>String(t.transaction_date)<=mbFilter.to);if(mbFilter.category)arr=arr.filter(t=>txAllocations(t).some(x=>rootCategory(state.categories.find(c=>c.id===x.category_id))?.id===mbFilter.category||x.category_id===mbFilter.category));if(mbFilter.account)arr=arr.filter(t=>t.account_id===mbFilter.account||(state.transaction_accounts||[]).some(x=>x.transaction_id===t.id&&x.account_id===mbFilter.account));if(mbFilter.person)arr=arr.filter(t=>t.person_id===mbFilter.person||state.split_participants.some(x=>{const st=state.split_transactions.find(s=>s.transaction_id===t.id);return st&&x.split_transaction_id===st.id&&x.person_id===mbFilter.person}));if(mbFilter.description)arr=arr.filter(t=>String(t.description||'').toLowerCase().includes(mbFilter.description.toLowerCase()));if(mbFilter.kind==='recurring')arr=arr.filter(t=>t.recurring_id);if(mbFilter.kind==='held'){const rows=state.money_held.slice().sort((a,b)=>String(b.received_date).localeCompare(String(a.received_date)));$('txList').innerHTML=rows.map(heldHTML).join('')||'<div class="empty">No Money Held records.</div>';return}if(mbFilter.kind==='lendborrow'){const rows=[...state.loans.map(l=>({kind:'loan',id:l.id,date:l.loan_date,label:(l.direction==='lend'?'Lend · ':'Borrow · ')+personName(l.person_id),amount:l.amount})),...state.loan_repayments.map(r=>({kind:'repayment',id:r.id,date:r.repayment_date,label:(r.direction==='received'?'Received · ':'Repaid · ')+personName(r.person_id),amount:r.amount}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('txList').innerHTML=rows.map(r=>`<div class="row"><div><div class="name">${esc(r.label)}</div><div class="sub">${fmtDate(r.date)}</div></div><div><b>${money(r.amount)}</b><button class="smallbtn" onclick="${r.kind==='loan'?`editLoan('${r.id}')`:`editLoanRepayment('${r.id}')`}">Edit</button><button class="smallbtn dangerbtn" onclick="${r.kind==='loan'?`deleteLoan('${r.id}')`:`deleteLoanRepayment('${r.id}')`}">Delete</button></div></div>`).join('')||'<div class="empty">No lend/borrow records.</div>';return}$('txList').innerHTML=arr.map(txHTML).join('')||'<div class="empty">No transactions found.</div>'}
function txHTML(t){const icon={income:'↑',expense:'−',transfer:'⇄',split:'🔀',reimbursement:'↩'}[t.type]||'•',sign=t.type==='income'||t.type==='reimbursement'?'+':t.type==='expense'||t.type==='split'?'−':'',other=t.type==='transfer'?` → ${esc(accountName(t.to_account_id))}`:'',share=t.type==='split'?` · ${esc(getNickname())} share ${money(splitMyShare(t))}`:'',cats=txAllocations(t).map(a=>catName(a.category_id)).filter(Boolean);return `<div class="row transaction-row"><div class="left"><div class="bubble ${t.type==='income'||t.type==='reimbursement'?'income':t.type}">${icon}</div><div class="tx-content"><div class="name">${esc(t.description||'(No description)')}</div><div class="sub">${fmtDate(t.transaction_date)} · ${esc(accountAllocationSummary(t))}${other}${share}</div>${cats.length?`<div class="sub">Category: ${esc(cats.join(', '))}</div>`:''}${t.notes?`<div class="sub">${esc(t.notes)}</div>`:''}</div></div><div class="tx-right" style="text-align:right"><b class="${sign==='+'?'green':sign==='−'?'red':''}">${sign}${money(t.amount)}</b><div class="action-row"><button class="smallbtn" onclick="editTx('${t.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteTx('${t.id}')">Delete</button></div></div></div>`}
async function submitForm(type,data,f){const btn=f.querySelector('.primary');if(btn)btn.disabled=true;try{await saveModal(type,data,f);if(type==='category'){await loadData();render();openModal('category');mbToast(data?'Category updated.':'Category added.');return}closeModal();await loadData();render();mbToast(type==='budget'?(data?'Budget updated.':'Budget added.'):type==='goal'?(data?'Goal updated.':'Goal added.'):(data?'Updated successfully.':'Saved successfully.'))}catch(e){mbToast(friendlyError(e),'error');throw e}finally{if(btn)btn.disabled=false}}
const MB_pdfBase=exportPDF;
function exportPDF(){if(!window.jspdf)return mbToast('PDF library is unavailable.','error');const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'}),W=595,M=36,H=842;let y=44;const text=s=>String(s??'').replace(/[^\x20-\x7E]/g,'');const m=n=>'INR '+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});const page=()=>{doc.addPage();y=44};const ensure=h=>{if(y+h>H-40)page()};const head=t=>{ensure(28);doc.setFontSize(17);doc.setFont(undefined,'bold');doc.text(text(t),M,y);y+=24;doc.setFont(undefined,'normal')};const line=(s,b=false)=>{ensure(16);doc.setFontSize(8.5);doc.setFont(undefined,b?'bold':'normal');doc.text(text(s),M,y);y+=13};doc.setFontSize(24);doc.setFont(undefined,'bold');doc.text('My Budget',M,y);y+=22;doc.setFontSize(11);doc.setFont(undefined,'normal');doc.text('Financial Report · '+text(new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})),M,y);y+=28;const inc=sumType('income',ym()),sp=personalSpendingBetween(ym()+'-01',today()),sav=inc-sp;[['MONTHLY INCOME',m(inc)],['MONTHLY SPENT',m(sp)],['MONTHLY SAVED',m(sav)]].forEach((q,i)=>{const x=M+i*176;doc.roundedRect(x,y,165,54,8,8);doc.setFontSize(8);doc.text(q[0],x+10,y+17);doc.setFontSize(15);doc.setFont(undefined,'bold');doc.text(text(q[1]),x+10,y+39);doc.setFont(undefined,'normal')});y+=70;head('Financial summary');line('Net balance: '+m(totalBalance()),true);line('People receivable: '+m(owedTotal()));line('Money held for others: '+m(moneyHeldOutstanding()));head('Spending by category');categoryGroups([ym()+'-01',today()]).forEach(g=>line(`${g.root.name}: ${m(g.spent)} · ${sp?(g.spent/sp*100).toFixed(1):0}%`));head('Budgets');state.budgets.forEach(b=>{const q=budgetStatus(b);line(`${b.name} · ${budgetCategoryLabel(b)} · ${m(q.used)} / ${m(b.amount)} · ${q.pct.toFixed(0)}%`)});head('Goals');state.goals.forEach(g=>line(`${g.name} · Existing ${m(g.existing_amount)} · Saved ${m(g.saved_amount)} / ${m(g.target_amount)} · ${(g.target_amount?g.saved_amount/g.target_amount*100:0).toFixed(0)}%`));head('Reminders');state.reminders.forEach(r=>line(`${r.due_date} · ${r.completed?'Completed':'Pending'} · ${r.title}${r.note?' · '+r.note:''}`));head('People');peopleBalances().forEach(p=>line(`${p.name} · They owe ${m(p.balance)} · You owe ${m(p.iOwe)} · Split repaid ${m(p.totalRepaid)} · Held pending ${m(p.heldPending)} · Loan received ${m(p.loanReceived)} · Loan repaid ${m(p.loanSent)}`));head('Lend & Borrow');state.loans.forEach(l=>line(`${l.loan_date} · ${l.direction==='lend'?'LEND':'BORROW'} · ${personName(l.person_id)} · ${m(l.amount)} · ${accountName(l.account_id)}`));state.loan_repayments.forEach(r=>line(`${r.repayment_date} · ${r.direction==='received'?'RECEIVED':'REPAID'} · ${personName(r.person_id)} · ${m(r.amount)} · ${accountName(r.account_id)}`));head('Money Held');state.money_held.forEach(h=>line(`${h.received_date} · ${personName(h.person_id)} · ${m(h.amount)} · Settled ${m(h.settled_amount||0)} · ${h.status}`));head('Recurring schedules');state.recurring_transactions.forEach(r=>line(`${r.name} · ${r.frequency} · ${m(r.amount)} · next ${r.next_date} · ${r.active?'Active':'Paused'}`));head('All Transactions');state.transactions.slice().sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date))).forEach((t,i)=>line(`${i+1}. ${t.transaction_date} · ${t.type} · ${t.description||'(No description)'} · ${m(t.amount)} · ${accountAllocationSummary(t)} · ${txAllocations(t).map(x=>catName(x.category_id)).join(', ')}`));head('Insights');line(`Savings rate: ${inc?(sav/inc*100).toFixed(1):0}%`);line(weekdayInsightForRange(ym()+'-01',today()));line(salaryWeekInsightForRange(ym()+'-01',today()));line('Savings runway: '+runway());line('Next month forecast: '+m(nextMonthPrediction()));doc.save('my-budget-professional-report.pdf');mbToast('Professional PDF report created.')}
const MB_openModal3=openModal;
openModal=function(type,data=null){
 if(type==='category'){
  openModalRaw(`<h2>Categories</h2><form id="f"><label>Name</label><input name="name" required placeholder="Rent"><label>Type</label><select name="type" id="newCategoryType"><option value="expense">Expense</option><option value="income">Income</option><option value="both">Both (income & expense)</option></select><label>Parent category (optional)</label><div id="newCategoryParent">${categoryParentSelect('','expense')}</div><label>Icon</label><input name="icon" value="🏷️"><label>Color</label><input name="color" value="#7666cf"><button class="primary">Add category</button></form><div class="section"><h2>Existing categories</h2></div>${state.categories.filter(c=>!c.parent_id).map(p=>`<div class="row"><div class="left"><div class="bubble">${esc(p.icon||'🏷️')}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${esc(p.type)} · parent</div>${state.categories.filter(c=>c.parent_id===p.id).map(c=>`<div class="tree"><div class="row"><div><div class="name">↳ ${esc(c.name)}</div><div class="sub">${esc(c.type)} · subcategory</div></div><div class="action-row"><button type="button" class="smallbtn" onclick="editCategory('${c.id}')">Edit</button><button type="button" class="smallbtn dangerbtn" onclick="deleteCategory('${c.id}')">Delete</button></div></div></div>`).join('')}</div></div><div class="action-row"><button type="button" class="smallbtn" onclick="editCategory('${p.id}')">Edit</button><button type="button" class="smallbtn dangerbtn" onclick="deleteCategory('${p.id}')">Delete</button></div></div>`).join('')}`);$('newCategoryType').onchange=e=>{$('newCategoryParent').innerHTML=categoryParentSelect(' ',e.target.value).replace('value=" " selected','value=""')};$('f').onsubmit=async e=>{e.preventDefault();try{await submitForm('category',null,e.target)}catch{}};return
 }
 if(type==='reminder'){return MB_openModal3(type,data)}
 MB_openModal3(type,data)
}
async function deleteCategory(id){if(!confirm('Delete this category? Existing transactions will keep their stored category allocation.'))return;try{await del('categories',id);removeLocal('categories',id);render();openModal('category');mbToast('Category deleted.')}catch(e){mbToast(friendlyError(e),'error')}}
function editCategory(id){const c=state.categories.find(x=>x.id===id);if(!c)return;openModalRaw(`<h2>Edit category</h2><form id="f"><label>Name</label><input name="name" required value="${esc(c.name)}"><label>Type</label><select name="type"><option value="expense" ${c.type==='expense'?'selected':''}>Expense</option><option value="income" ${c.type==='income'?'selected':''}>Income</option><option value="both" ${c.type==='both'?'selected':''}>Both</option></select><label>Parent</label>${categoryParentSelect(c.parent_id||'',c.type,c.id)}<label>Icon</label><input name="icon" value="${esc(c.icon||'🏷️')}"><label>Color</label><input name="color" value="${esc(c.color||'#7666cf')}"><button class="primary">Update category</button></form>`);$('f').onsubmit=async e=>{e.preventDefault();try{await submitForm('category',c,e.target)}catch{}}}
function renderGoals(){const el=$('goalList');if(!el)return;el.innerHTML=state.goals.length?state.goals.map(goalHTML).join(''):'<div class="empty">No goals yet.</div>'}
function renderBudgetPage(){renderBudgets()}
function renderRemindersPage(){const e=$('remindersPageList');if(!e)return;const p=state.reminders.filter(r=>!r.completed).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))),c=state.reminders.filter(r=>r.completed).sort((a,b)=>String(b.due_date).localeCompare(String(a.due_date)));e.innerHTML=`<div class="section-title-inline">Pending <span>${p.length}</span></div>${p.map(reminderHTML).join('')||'<div class="empty">No pending reminders.</div>'}<div class="section-title-inline">Completed <span>${c.length}</span></div>${c.map(reminderHTML).join('')||'<div class="empty">No completed reminders.</div>'}`}
const MB_renderBase=render;let mbRenderDepth=0;render=function(){if(mbRenderDepth>0)return;mbRenderDepth++;try{MB_renderBase();renderRemindersPage()}finally{mbRenderDepth--}}
function mbInstallUI(){const q=document.querySelector('.quick');if(q&&!document.getElementById('quickHeld'))q.insertAdjacentHTML('beforeend',`<button id="quickHeld" onclick="openMoneyHeld()"><span>💼</span>Held</button><button onclick="openModal('loan')"><span>🤝</span>Lend / Borrow</button>`);const more=document.querySelector('#more .card');if(more&&!document.getElementById('moreReminders'))more.insertAdjacentHTML('beforeend',`<div id="moreReminders" class="row" onclick="showPage('reminders')"><div class="left"><div class="bubble">🔔</div><div><div class="name">Reminders</div><div class="sub">All pending and completed reminders</div></div></div><b>›</b></div>`);if(!document.getElementById('reminders')){const moreSec=document.getElementById('more');moreSec?.insertAdjacentHTML('afterend',`<section id="reminders" class="page"><div class="section"><div class="section-heading"><h2>Reminders</h2><span class="page-date" id="remindersDate"></span></div><button class="icon" onclick="openModal('reminder')">＋</button></div><div class="card" id="remindersPageList"></div></section>`)}const goalIcon=document.querySelector('#more .bubble.goal');if(goalIcon)goalIcon.textContent='🎯'}
const MB_showPage=showPage;showPage=function(p){MB_showPage(p);if(p==='reminders')renderRemindersPage()}
const MB_startApp=startApp;let mbStarted=false;startApp=function(){if(mbStarted)return;mbStarted=true;mbInstallUI();MB_startApp()}
/* Consistent feedback for destructive actions. */
deleteAccount=async function(id){if(!confirm('Delete account? It must not be referenced by transactions.'))return;try{await del('accounts',id);await loadData();render();mbToast('Account deleted.')}catch(e){mbToast(friendlyError(e),'error')}};
deletePerson=async function(id){if(!confirm('Delete person? Existing splits, reimbursements or loans may prevent deletion.'))return;try{await del('people',id);await loadData();render();mbToast('Person deleted.')}catch(e){mbToast(friendlyError(e),'error')}};
deleteGoal=async function(id){if(!confirm('Delete goal and its contributions?'))return;try{await del('goals',id);await loadData();render();mbToast('Goal deleted.')}catch(e){mbToast(friendlyError(e),'error')}};
deleteReminder=async function(id){if(!confirm('Delete reminder?'))return;try{await del('reminders',id);await loadData();render();mbToast('Reminder deleted.')}catch(e){mbToast(friendlyError(e),'error')}};
deleteRecurring=async function(id){if(!confirm('Delete recurring schedule? Existing recorded transactions will remain.'))return;try{await del('recurring_transactions',id);await loadData();render();mbToast('Recurring schedule deleted.')}catch(e){mbToast(friendlyError(e),'error')}};
deleteLoan=async function(id){if(!confirm('Delete this loan?'))return;try{await del('loans',id);await loadData();render();mbToast('Loan deleted.')}catch(e){mbToast(friendlyError(e),'error')}};
deleteLoanRepayment=async function(id){if(!confirm('Delete this repayment?'))return;try{await del('loan_repayments',id);await loadData();render();mbToast('Repayment deleted.')}catch(e){mbToast(friendlyError(e),'error')}};
/* Backup/export support for the two new tables. */
exportExcel=async function(){if(!window.XLSX){mbToast('Loading Excel export…');try{await loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js')}catch(e){return mbToast('Could not load the Excel library. Check your connection and try again.','error')}}const wb=XLSX.utils.book_new(),allTables=[...tables,'transaction_accounts','recurring_occurrences'];for(const t of allTables){const rows=state[t]||[];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{}]),t.slice(0,31))}XLSX.writeFile(wb,'my-budget.xlsx');mbToast('Excel backup exported.')};
/* Final PDF pass: include simple vector charts so the report is useful even without Chart.js canvases. */
exportPDF=async function(){if(!window.jspdf){mbToast('Loading PDF export…');try{await loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')}catch(e){return mbToast('Could not load the PDF library. Check your connection and try again.','error')}}const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'}),W=595,M=36,H=842;let y=44;const text=s=>String(s??'').replace(/[^\x20-\x7E]/g,'');const moneyPdf=n=>'INR '+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});const newPage=()=>{doc.addPage();y=44};const ensure=h=>{if(y+h>H-42)newPage()};const head=t=>{ensure(28);doc.setFontSize(17);doc.setFont(undefined,'bold');doc.text(text(t),M,y);y+=24;doc.setFont(undefined,'normal')};const line=(s,b=false)=>{ensure(16);doc.setFontSize(8.5);doc.setFont(undefined,b?'bold':'normal');doc.text(text(s),M,y);y+=13};const barChart=(title,items)=>{ensure(190);head(title);const data=items.slice(0,8),max=Math.max(1,...data.map(x=>Number(x.value||0))),left=M,top=y+4,bw=410,bh=12,gap=20;data.forEach((x,i)=>{const yy=top+i*gap;doc.setFontSize(7);doc.text(text(x.label).slice(0,24),left,yy+9);doc.rect(left+100,yy,bw,10);doc.rect(left+100,yy,Math.max(1,bw*(Number(x.value||0)/max)),10,'F');doc.text(text(moneyPdf(x.value)),left+100+bw+8,yy+9)});y=top+data.length*gap+18};doc.setFontSize(24);doc.setFont(undefined,'bold');doc.text('My Budget',M,y);y+=22;doc.setFontSize(11);doc.setFont(undefined,'normal');doc.text('Professional Financial Report · '+text(new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})),M,y);y+=30;const inc=sumType('income',ym()),sp=personalSpendingBetween(ym()+'-01',today()),sav=inc-sp;[['MONTHLY INCOME',inc],['MONTHLY SPENT',sp],['MONTHLY SAVED',sav]].forEach((q,i)=>{const x=M+i*176;doc.roundedRect(x,y,165,54,8,8);doc.setFontSize(8);doc.text(q[0],x+10,y+17);doc.setFontSize(15);doc.setFont(undefined,'bold');doc.text(text(moneyPdf(q[1])),x+10,y+39);doc.setFont(undefined,'normal')});y+=72;barChart('Spending by parent category',categoryGroups([ym()+'-01',today()]).map(g=>({label:g.root.name,value:g.spent})));ensure(20);head('Budgets');state.budgets.forEach(b=>{const q=budgetStatus(b);line(`${b.name} · ${budgetCategoryLabel(b)} · ${moneyPdf(q.used)} / ${moneyPdf(b.amount)} · ${q.pct.toFixed(0)}%`)});head('Goals');state.goals.forEach(g=>line(`${g.name} · Existing ${moneyPdf(g.existing_amount)} · Saved ${moneyPdf(g.saved_amount)} / ${moneyPdf(g.target_amount)} · ${(g.target_amount?g.saved_amount/g.target_amount*100:0).toFixed(0)}%`));barChart('Goal progress',state.goals.map(g=>({label:g.name,value:g.target_amount?Number(g.saved_amount||0)/Number(g.target_amount)*100:0})));head('Reminders');state.reminders.forEach(r=>line(`${r.due_date} · ${r.completed?'Completed':'Pending'} · ${r.title}${r.note?' · '+r.note:''}`));head('People');peopleBalances().forEach(p=>line(`${p.name} · They owe ${moneyPdf(p.balance)} · You owe ${moneyPdf(p.iOwe)} · Split repaid ${moneyPdf(p.totalRepaid)} · Held pending ${moneyPdf(p.heldPending)} · Loan received ${moneyPdf(p.loanReceived)} · Loan repaid ${moneyPdf(p.loanSent)}`));head('Lend & Borrow');state.loans.forEach(l=>line(`${l.loan_date} · ${l.direction==='lend'?'LEND':'BORROW'} · ${personName(l.person_id)} · ${moneyPdf(l.amount)} · ${accountName(l.account_id)}`));state.loan_repayments.forEach(r=>line(`${r.repayment_date} · ${r.direction==='received'?'RECEIVED':'REPAID'} · ${personName(r.person_id)} · ${moneyPdf(r.amount)} · ${accountName(r.account_id)}`));head('Money Held');state.money_held.forEach(h=>line(`${h.received_date} · ${personName(h.person_id)} · ${moneyPdf(h.amount)} · Settled ${moneyPdf(h.settled_amount||0)} · Remaining ${moneyPdf(Math.max(0,Number(h.amount||0)-Number(h.settled_amount||0)))} · ${h.status}`));head('Recurring schedules');state.recurring_transactions.forEach(r=>line(`${r.name} · ${r.frequency} · ${moneyPdf(r.amount)} · next ${r.next_date} · ${r.active?'Active':'Paused'}`));head('Recurring occurrences');(state.recurring_occurrences||[]).forEach(o=>line(`${o.due_date} · ${o.status} · ${state.recurring_transactions.find(r=>r.id===o.recurring_id)?.name||o.recurring_id}`));head('Categories');state.categories.forEach(c=>line(`${c.name} · ${c.type} · ${c.parent_id?catName(c.parent_id):'Parent'}`));head('All Transactions');state.transactions.slice().sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date))).forEach((t,i)=>line(`${i+1}. ${t.transaction_date} · ${t.type} · ${t.description||'(No description)'} · ${moneyPdf(t.amount)} · ${accountAllocationSummary(t)} · ${txAllocations(t).map(x=>catName(x.category_id)).join(', ')}`));head('Insights');line(`Savings rate: ${inc?(sav/inc*100).toFixed(1):0}%`);line(weekdayInsightForRange(ym()+'-01',today()));line(salaryWeekInsightForRange(ym()+'-01',today()));line('Savings runway: '+runway());line('Next month forecast: '+moneyPdf(nextMonthPrediction()));head('Accounts');state.accounts.forEach(a=>line(`${a.name} · ${a.type} · Balance ${moneyPdf(accountBalance(a))}`));doc.save('my-budget-professional-report.pdf');mbToast('Professional PDF report created.')}


/* ===== vNext+Plus final UX/data corrections ===== */
const MB_finalOpenModalBase = openModal;
const MB_finalSaveModalBase = saveModal;

function budgetScopeKey(b){
  const cat=String(b.category_id||'ALL'), sub=String(b.subcategory_id||'');
  const period=String(b.period||'monthly');
  if(period==='monthly') return `${period}|${cat}|${sub}|${b.year||''}|${b.month||''}`;
  if(period==='yearly') return `${period}|${cat}|${sub}|${b.year||''}`;
  return `${period}|${cat}|${sub}|${b.start_date||''}`;
}
function checkBudgetDuplicate(x,data=null){
  const now=todayDate(),period=x.period||'monthly';
  const temp={category_id:x.category_id||null,subcategory_id:x.subcategory_id||null,period,year:now.getFullYear(),month:period==='monthly'?now.getMonth()+1:null,start_date:null};
  if(period==='weekly'){const day=now.getDay()||7,st=new Date(now);st.setDate(st.getDate()-day+1);temp.start_date=localDate(st);temp.year=st.getFullYear();temp.month=null}
  const key=budgetScopeKey(temp);
  const duplicate=state.budgets.find(b=>b.id!==data?.id&&budgetScopeKey(b)===key);
  if(duplicate)throw new Error(`A ${period} budget already exists for ${budgetCategoryLabel(duplicate)}. Please edit the existing budget instead.`);
}

function budgetStatusForRangePlus(b,a,z){
  const target=b.subcategory_id||b.category_id;
  const used=state.transactions.filter(t=>t.transaction_date>=a&&t.transaction_date<=z&&(t.type==='expense'||t.type==='split')).reduce((sum,t)=>sum+txAllocations(t).filter(x=>{
    if(!target)return true;
    return categoryMatchesBudget(x.category_id,target);
  }).reduce((sub,x)=>{
    if(t.type!=='split')return sub+Number(x.amount||0);
    const total=Number(t.amount||0),mine=spending(t);
    return sub+(total>0?Number(x.amount||0)*(mine/total):0);
  },0),0);
  const amount=Number(b.amount||0);return {used,pct:amount?used/amount*100:0,cls:used>amount?'over':used>=amount*.8?'near':'good'};
}
function budgetStatus(b){const [a,z]=periodRange(b.period,b);return budgetStatusForRangePlus(b,a,z)}

function renderHomePlus(){
  const now=todayDate();
  const b=state.budgets.find(x=>x.period==='monthly'&&(!x.year||x.year===now.getFullYear())&&(!x.month||x.month===now.getMonth()+1));
  $('homeBudget').innerHTML=b?budgetHTML(b):'<div class="empty">No monthly budget yet.</div>';
  const gs=state.goals.slice().sort((a,b)=>Number(b.is_completed)-Number(a.is_completed)).slice(0,1);
  $('homeGoals').innerHTML=gs.length?gs.map(goalHTML).join(''):'<div class="empty">No goals yet.</div>';
  const ps=peopleBalances().filter(x=>x.balance>0||x.iOwe>0).slice(0,1);
  $('homePeople').innerHTML=ps.length?ps.map(personHTML).join(''):'<div class="empty">No outstanding people balances.</div>';
  const rs=state.reminders.filter(r=>!r.completed).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
  $('homeReminders').innerHTML=rs.length?rs.map(reminderHTML).join(''):'<div class="empty">No pending reminders.</div>';
  const splitPending=state.split_participants.reduce((sum,r)=>sum+Math.max(0,Number(r.amount||0)-Number(r.amount_paid||0)),0);
  const held=moneyHeldOutstanding();
  const lend=peopleBalances().reduce((sum,p)=>sum+Number(p.loanOwed||0),0);
  const borrow=peopleBalances().reduce((sum,p)=>sum+Number(p.loanIowe||0),0);
  const el=$('homePeopleStats');
  const toReceive=splitPending+lend;
  const toPay=borrow;
  if(el)el.innerHTML=`<div class="split"><span>Split pending</span><b>${money(splitPending)}</b></div><div class="held"><span>Money held</span><b>${money(held)}</b></div><div class="lend"><span>They owe you</span><b>${money(lend)}</b></div><div class="owe"><span>You owe</span><b>${money(borrow)}</b></div><div class="receivable"><span>To receive</span><b>${money(toReceive)}</b></div><div class="payable"><span>To pay</span><b>${money(toPay)}</b></div>`;
  const tx=state.transactions.slice().sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date))).slice(0,5);
  $('homeRecent').innerHTML=tx.length?tx.map(txHTML).join(''):'<div class="empty">No transactions yet.</div>';
}
renderHome=renderHomePlus;

function renderPeoplePlus(){
  const ps=peopleBalances();
  const splitPending=ps.reduce((s,p)=>s+Number(p.splitPending||0),0);
  const splitSettled=ps.reduce((s,p)=>s+Number(p.splitSettled||0),0);
  const heldPending=ps.reduce((s,p)=>s+Number(p.heldPending||0),0);
  const heldSettled=ps.reduce((s,p)=>s+Number(p.heldSettled||0),0);
  const lend=ps.reduce((s,p)=>s+Number(p.loanOwed||0),0);
  const borrow=ps.reduce((s,p)=>s+Number(p.loanIowe||0),0);
  const toReceive=splitPending+lend;
  const toPay=borrow;
  if($('peopleSummary'))$('peopleSummary').innerHTML=`<div class="people-summary-grid"><div><span>Split pending</span><b class="amber">${money(splitPending)}</b></div><div><span>Split settled</span><b class="green">${money(splitSettled)}</b></div><div><span>Money held</span><b class="amber">${money(heldPending)}</b></div><div><span>Held settled (total)</span><b class="green">${money(heldSettled)}</b></div><div><span>They owe you</span><b class="green">${money(lend)}</b></div><div><span>You owe</span><b class="red">${money(borrow)}</b></div><div><span>To receive</span><b class="green">${money(toReceive)}</b></div><div><span>To pay</span><b class="red">${money(toPay)}</b></div><div><span>Total people</span><b>${ps.length}</b></div></div>`;
  if($('peopleOverview'))$('peopleOverview').innerHTML=ps.length?ps.map(p=>personHTML(p)).join(''):'<div class="empty">No people yet.</div>';
  if($('peopleList'))$('peopleList').innerHTML=ps.length?ps.map(p=>`<div class="contact-row"><div class="left"><div class="bubble person">${otherPersonIcon()}</div><div><div class="name">${esc(p.name)}</div><div class="sub">${esc(p.phone||'')}${p.email?' · '+esc(p.email):''}</div></div></div><div class="action-row"><button class="smallbtn" onclick="editPerson('${p.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deletePerson('${p.id}')">Delete</button></div></div>`).join(''):'<div class="empty">No contacts yet.</div>';
}
renderPeople=renderPeoplePlus;

function clearAllTransactionFilters(){mbFilter={type:'All',from:'',to:'',category:'',subcategory:'',account:'',person:'',description:'',kind:'all'};filter='All';renderTransactions();}
function renderTransactionsPlus(){
  const active=mbFilter.type||'All',kind=mbFilter.kind||'all';
  $('filters').innerHTML=['All','income','expense','transfer','split','reimbursement'].map(x=>`<button class="chip ${kind==='all'&&active===x?'active':''}" onclick="mbFilter.type='${x}';mbFilter.kind='all';renderTransactions()">${x==='All'?'All':x[0].toUpperCase()+x.slice(1)}</button>`).join('')+`<button class="chip ${kind==='held'?'active':''}" onclick="mbFilter.kind='held';renderTransactions()">Held for others</button><button class="chip ${kind==='lendborrow'?'active':''}" onclick="mbFilter.kind='lendborrow';renderTransactions()">Lend / Borrow</button><button class="chip filter-button" onclick="openTransactionFilters()">⚙ Filters</button><button class="chip" onclick="clearAllTransactionFilters()">Clear filters</button>`;
  // Build the unified "All" feed. Loans/borrowings and Money Held live in their
  // own tables, so they must be represented here as transaction-like rows too.
  // Split records normally have a linked transactions row; only add a synthetic
  // split row when that link is missing, preventing duplicates.
  let arr;
  if(kind==='all' && active==='All') {
    const base = state.transactions.slice();
    const linkedSplitIds = new Set(state.split_transactions.map(st=>st.transaction_id).filter(Boolean));
    const syntheticSplits = state.split_transactions
      .filter(st=>st.transaction_id && !base.some(t=>t.id===st.transaction_id))
      .map(st=>({
        id: st.transaction_id,
        type: 'split',
        amount: Number(st.total_amount||0),
        description: st.description || 'Split transaction',
        transaction_date: st.transaction_date || st.created_at || today(),
        account_id: st.account_id || null,
        __special: 'split',
        __specialId: st.id
      }));
    const syntheticLoans = state.loans.map(l=>({
      id: `loan-${l.id}`, type: 'loan', amount: Number(l.amount||0),
      description: l.direction==='lend' ? `Lent to ${personName(l.person_id)}` : `Borrowed from ${personName(l.person_id)}`,
      transaction_date: l.loan_date || l.created_at || today(), account_id:l.account_id||null,
      notes:l.notes||'', __special:'loan', __specialId:l.id, direction:l.direction, person_id:l.person_id
    }));
    const syntheticRepayments = state.loan_repayments.map(r=>({
      id: `loan-repayment-${r.id}`, type: 'loan_repayment', amount: Number(r.amount||0),
      description: r.direction==='received' ? `Repayment received from ${personName(r.person_id)}` : `Repayment sent to ${personName(r.person_id)}`,
      transaction_date: r.repayment_date || r.created_at || today(), account_id:r.account_id||null,
      notes:r.notes||'', __special:'loan_repayment', __specialId:r.id, direction:r.direction, person_id:r.person_id
    }));
    const syntheticHeld = state.money_held.map(h=>({
      id:`held-${h.id}`, type:'money_held', amount:Number(h.amount||0),
      description:`Money held for ${personName(h.person_id)}`,
      transaction_date:h.received_date || h.created_at || today(), account_id:h.account_id||null,
      notes:h.purpose || h.notes || '', __special:'held', __specialId:h.id, status:h.status
    }));
    arr = [...base, ...syntheticSplits, ...syntheticLoans, ...syntheticRepayments, ...syntheticHeld]
      .sort((a,b)=>String(b.transaction_date).slice(0,10).localeCompare(String(a.transaction_date).slice(0,10)) || String(b.created_at||'').localeCompare(String(a.created_at||'')));
  } else {
    arr=state.transactions.slice().sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date)));
  }
  if(kind==='all'&&active!=='All')arr=arr.filter(t=>t.type===active);
  if(mbFilter.from)arr=arr.filter(t=>String(t.transaction_date)>=mbFilter.from);
  if(mbFilter.to)arr=arr.filter(t=>String(t.transaction_date)<=mbFilter.to);
  if(mbFilter.category)arr=arr.filter(t=>txAllocations(t).some(x=>{const c=state.categories.find(c=>c.id===x.category_id);return x.category_id===mbFilter.category||rootCategory(c)?.id===mbFilter.category}));
  if(mbFilter.subcategory)arr=arr.filter(t=>txAllocations(t).some(x=>x.category_id===mbFilter.subcategory));
  if(mbFilter.account)arr=arr.filter(t=>t.account_id===mbFilter.account);
  if(mbFilter.person)arr=arr.filter(t=>t.person_id===mbFilter.person||state.split_participants.some(x=>x.person_id===mbFilter.person&&state.split_transactions.some(st=>st.id===x.split_transaction_id&&st.transaction_id===t.id)));
  if(mbFilter.description)arr=arr.filter(t=>String(t.description||t.notes||'').toLowerCase().includes(mbFilter.description.toLowerCase()));
  if(mbFilter.kind==='recurring')arr=arr.filter(t=>t.recurring_id);
  if(mbFilter.kind==='held'){const rows=state.money_held.slice().sort((a,b)=>String(b.received_date).localeCompare(String(a.received_date)));$('txList').innerHTML=rows.map(heldHTML).join('')||'<div class="empty">No Money Held records.</div>';return}
  if(mbFilter.kind==='lendborrow'){const rows=[...state.loans.map(l=>({kind:'loan',id:l.id,date:l.loan_date,label:(l.direction==='lend'?'Lend · ':'Borrow · ')+personName(l.person_id),amount:l.amount})),...state.loan_repayments.map(r=>({kind:'repayment',id:r.id,date:r.repayment_date,label:(r.direction==='received'?'Received · ':'Repaid · ')+personName(r.person_id),amount:r.amount}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('txList').innerHTML=rows.map(r=>`<div class="row"><div><div class="name">${esc(r.label)}</div><div class="sub">${fmtDate(r.date)}</div></div><div><b>${money(r.amount)}</b><button class="smallbtn" onclick="${r.kind==='loan'?`editLoan('${r.id}')`:`editLoanRepayment('${r.id}')`}">Edit</button><button class="smallbtn dangerbtn" onclick="${r.kind==='loan'?`deleteLoan('${r.id}')`:`deleteLoanRepayment('${r.id}')`}">Delete</button></div></div>`).join('')||'<div class="empty">No lend/borrow records.</div>';return}
  const specialRowHTML=t=>{
    if(!t.__special)return txHTML(t);
    const meta=t.__special==='held' ? `${t.status==='settled'?'Settled':'Pending'} · Money Held`
      : t.__special==='loan' ? (t.direction==='lend'?'Lend':'Borrow')
      : t.__special==='loan_repayment' ? (t.direction==='received'?'Loan repayment received':'Loan repayment sent')
      : 'Split';
    const icon=t.__special==='held'?'💰':t.__special==='loan'?'↔':t.__special==='loan_repayment'?'↩':'🔀';
    const cls=t.__special==='held'?'amber':t.__special==='loan'?'transfer':t.__special==='loan_repayment'?'income':'split';
    let actions='';
    if(t.__special==='held') actions=`<button class="smallbtn" onclick="editMoneyHeld('${t.__specialId}')">Edit</button><button class="smallbtn" onclick="toggleMoneyHeld('${t.__specialId}')">${t.status==='settled'?'Undo':'Settle'}</button><button class="smallbtn dangerbtn" onclick="deleteMoneyHeld('${t.__specialId}')">Delete</button>`;
    else if(t.__special==='loan') actions=`<button class="smallbtn" onclick="editLoan('${t.__specialId}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteLoan('${t.__specialId}')">Delete</button>`;
    else if(t.__special==='loan_repayment') actions=`<button class="smallbtn" onclick="editLoanRepayment('${t.__specialId}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteLoanRepayment('${t.__specialId}')">Delete</button>`;
    else if(t.__special==='split' && t.__specialId) actions=`<button class="smallbtn" onclick="editSplitSpecial('${t.__specialId}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteSplitSpecial('${t.__specialId}')">Delete</button>`;
    const stamp=`<div class="sub timestamp-meta">Recorded ${esc(fmtDateTime(t.created_at))}${t.updated_at?' · Updated '+esc(fmtDateTime(t.updated_at)):''}</div>`;
    return `<div class="row transaction-row"><div class="left"><div class="bubble ${cls}">${icon}</div><div class="tx-content"><div class="name">${esc(t.description)}</div><div class="sub">${fmtDate(t.transaction_date)}${t.account_id?' · '+esc(accountName(t.account_id)):''} · ${esc(meta)}</div>${t.notes?`<div class="sub">${esc(t.notes)}</div>`:''}${stamp}</div></div><div class="tx-right" style="text-align:right"><b>${money(t.amount)}</b><div class="action-row">${actions}</div></div></div>`;
  };
  $('txList').innerHTML=arr.map(specialRowHTML).join('')||'<div class="empty">No transactions found.</div>';
}
async function editSplitSpecial(id){const st=state.split_transactions.find(x=>x.id===id);if(!st)return;const tx=state.transactions.find(x=>x.id===st.transaction_id);if(tx)return editTx(tx.id);mbToast('This split record has no linked transaction to edit.','error')}
async function deleteSplitSpecial(id){const st=state.split_transactions.find(x=>x.id===id);if(!st)return;if(!confirm('Delete this split transaction?'))return;try{const txId=st.transaction_id;await sb.from('split_participants').delete().eq('split_transaction_id',id);await del('split_transactions',id);if(txId){await del('transactions',txId);removeLocal('transactions',txId)}removeLocal('split_transactions',id);state.split_participants=(state.split_participants||[]).filter(x=>x.split_transaction_id!==id);render();mbToast('Split transaction deleted.')}catch(e){mbToast(friendlyError(e),'error')}}
renderTransactions=renderTransactionsPlus;

function recurringFieldsHTML(data){
  const type=data?.type||'expense', cat=data?.category_id?state.categories.find(c=>c.id===data.category_id):null, root=cat?.parent_id?rootCategory(cat):cat;
  const transfer=type==='transfer';
  return `<div class="recurring-account-row" id="recurringAccounts"><div><label>${transfer?'From account':'Account'}</label>${sel('account_id',state.accounts,data?.account_id||'',true)}</div>${transfer?`<div><label>To account</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',true)}</div>`:''}</div><div id="recurringCategoryBlock" class="field-block" style="${transfer?'display:none':''}"><label>Category & subcategory</label><div class="category-grid"><div><select id="recurringParent" name="category_id" aria-label="Recurring category"><option value="">Select category</option>${categoryPool(type==='income'?'income':'expense').filter(c=>!c.parent_id).map(c=>`<option value="${c.id}" ${c.id===root?.id?'selected':''}>${esc(c.icon||'🏷️')} ${esc(c.name)}</option>`).join('')}</select></div><div><select id="recurringSubcategory" name="subcategory_id" aria-label="Recurring subcategory"><option value="">Use parent directly</option>${root?categoryPool(type==='income'?'income':'expense').filter(c=>c.parent_id===root.id).map(c=>`<option value="${c.id}" ${c.id===data?.category_id?'selected':''}>${esc(c.icon||'↳')} ${esc(c.name)}</option>`).join(''):''}</select></div></div></div>`;
}
function toggleRecurringType(type){
  const f=$('f');if(!f)return;
  const data={type,account_id:f.elements.account_id?.value||'',to_account_id:f.elements.to_account_id?.value||'',category_id:f.elements.category_id?.value||''};
  const wrap=$('recurringDynamic');if(wrap)wrap.innerHTML=recurringFieldsHTML(data);
  const parent=$('recurringParent'),sub=$('recurringSubcategory');if(parent)parent.onchange=()=>{const pool=categoryPool(type==='income'?'income':'expense');if(sub)sub.innerHTML='<option value="">Use parent directly</option>'+pool.filter(c=>c.parent_id===parent.value).map(c=>`<option value="${c.id}">${esc(c.icon||'↳')} ${esc(c.name)}</option>`).join('')};
}
function openRecurringModalPlus(data=null){
  const type=data?.type||'expense';
  openModalRaw(`<h2>${data?'Edit':'Add'} recurring transaction</h2><form id="f"><label>Name</label><input name="name" required value="${esc(data?.name||'')}" placeholder="Rent / Salary"><label>Type</label><div class="mode"><button type="button" class="${type==='expense'?'selected':''}" onclick="document.querySelectorAll('#recTypeButtons button').forEach(x=>x.classList.remove('selected'));this.classList.add('selected');$('recurringType').value='expense';toggleRecurringType('expense')">Expense</button><button type="button" class="${type==='income'?'selected':''}" onclick="document.querySelectorAll('#recTypeButtons button').forEach(x=>x.classList.remove('selected'));this.classList.add('selected');$('recurringType').value='income';toggleRecurringType('income')">Income</button><button type="button" class="${type==='transfer'?'selected':''}" onclick="document.querySelectorAll('#recTypeButtons button').forEach(x=>x.classList.remove('selected'));this.classList.add('selected');$('recurringType').value='transfer';toggleRecurringType('transfer')">Transfer</button></div><div id="recTypeButtons" style="display:none"></div><input type="hidden" name="type" id="recurringType" value="${type}"><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" value="${esc(data?.description||'')}" placeholder="Optional description"><div id="recurringDynamic">${recurringFieldsHTML(data)}</div><label>Frequency</label><select name="frequency"><option value="daily" ${data?.frequency==='daily'?'selected':''}>Daily</option><option value="weekly" ${data?.frequency==='weekly'?'selected':''}>Weekly</option><option value="monthly" ${data?.frequency==='monthly'||!data?'selected':''}>Monthly</option><option value="yearly" ${data?.frequency==='yearly'?'selected':''}>Yearly</option></select><label>Next due date</label><input name="next_date" type="date" required value="${esc(data?.next_date||today())}"><label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><button class="primary">${data?'Update':'Save'} recurring</button></form>`);
  const parent=$('recurringParent'),sub=$('recurringSubcategory');if(parent)parent.onchange=()=>{const pool=categoryPool(type==='income'?'income':'expense');if(sub)sub.innerHTML='<option value="">Use parent directly</option>'+pool.filter(c=>c.parent_id===parent.value).map(c=>`<option value="${c.id}">${esc(c.icon||'↳')} ${esc(c.name)}</option>`).join('')};
  $('f').onsubmit=async e=>{e.preventDefault();await submitForm('recurring',data,e.target)};
}

const MB_openModalBeforePlus = openModal;
openModal=function(type,data=null){
  if(type==='recurring'){openRecurringModalPlus(data);return;}
  if(type==='income'||type==='expense'){
    transactionCategoryRows=[];const recs=state.recurring_transactions.filter(r=>r.active&&r.type===type);
    openModalRaw(`<h2>${data?'Edit':'Add'} ${type}</h2><form id="f"><label>Recurring entry (optional)</label><select id="recurringSelect" name="use_recurring_id" onchange="fillRecurringIntoForm(this.value)"><option value="">Manual entry</option>${recs.map(r=>`<option value="${r.id}">${esc(r.name)} · ${money(r.amount)} · ${r.frequency}</option>`).join('')}</select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>Description</label><input name="description" value="${esc(data?.description||'')}"><label>Date</label><input name="transaction_date" type="date" required value="${esc(data?.transaction_date||today())}"><input type="hidden" name="recurring_occurrence_date" id="recurringOccurrenceDate" value="${esc(data?.recurring_occurrence_date||'')}"><label>Account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}${categoryFields(type,data)}<label>Notes</label><textarea name="notes">${esc(data?.notes||'')}</textarea><label class="checkrow"><input type="checkbox" id="makeRecurring" name="make_recurring" value="1" onchange="document.getElementById('recurringInlineOptions').classList.toggle('hidden',!this.checked)"> Make this recurring</label><div id="recurringInlineOptions" class="recurring-options hidden"><label>Frequency</label><select name="recurring_frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select><label>First due date</label><input name="recurring_next_date" type="date" value="${esc(data?.transaction_date||today())}"></div><button class="primary">${data?'Update':'Save'} transaction</button></form>`);
    $('f').onsubmit=async e=>{e.preventDefault();await submitForm(type,data,e.target)};renderTransactionCategoryRows(type);return;
  }
  if(type==='split'){
    openModalRaw(splitForm(data));$('f').onsubmit=async e=>{e.preventDefault();await submitForm('split',data,e.target)};renderSplitRows();return;
  }
  if(type==='transfer'){
    const recs=state.recurring_transactions.filter(r=>r.active&&r.type==='transfer');
    openModalRaw(`<h2>${data?'Edit':'New'} transfer</h2><form id="f"><label>Recurring entry (optional)</label><select name="use_recurring_id" onchange="fillRecurringIntoForm(this.value)"><option value="">Manual transfer</option>${recs.map(r=>`<option value="${r.id}">${esc(r.name)} · ${money(r.amount)} · ${r.frequency}</option>`).join('')}</select><label>Amount</label><input name="amount" type="number" step="0.01" min="0.01" required value="${data?.amount??''}"><label>From account</label>${sel('account_id',state.accounts,data?.account_id||'',true)}<label>To account</label>${sel('to_account_id',state.accounts,data?.to_account_id||'',true)}<label>Date</label><input name="transaction_date" type="date" value="${esc(data?.transaction_date||today())}" required><label>Description</label><input name="description" value="${esc(data?.description||'Transfer')}"><label class="checkrow"><input type="checkbox" name="make_recurring" value="1" onchange="document.getElementById('transferRecurringOptions').classList.toggle('hidden',!this.checked)"> Make this recurring</label><div id="transferRecurringOptions" class="recurring-options hidden"><label>Frequency</label><select name="recurring_frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option></select><label>First due date</label><input name="recurring_next_date" type="date" value="${esc(data?.transaction_date||today())}"></div><button class="primary">${data?'Update transfer':'Save transfer'}</button></form>`);$('f').onsubmit=async e=>{e.preventDefault();await submitForm('transfer',data,e.target)};return;
  }
  MB_openModalBeforePlus(type,data);
};

const MB_saveModalBeforePlus=saveModal;
saveModal=async function(type,data,f){
  if(type==='budget'){
    const x=Object.fromEntries(new FormData(f).entries());checkBudgetDuplicate(x,data);
    const now=todayDate();let row={name:x.name,category_id:x.category_id||null,subcategory_id:x.subcategory_id||null,amount:Number(x.amount),period:x.period,year:now.getFullYear(),month:x.period==='monthly'?now.getMonth()+1:null,start_date:null,end_date:null,notes:x.notes||null};
    if(x.period==='weekly'){const day=now.getDay()||7,st=new Date(now);st.setDate(st.getDate()-day+1);const en=new Date(st);en.setDate(en.getDate()+6);row.year=st.getFullYear();row.month=null;row.start_date=localDate(st);row.end_date=localDate(en)}
    if(data)await update('budgets',data.id,row);else await insert('budgets',row);return;
  }
  if(type==='recurring'){
    const x=Object.fromEntries(new FormData(f).entries());let categoryId=null;
    if(x.type!=='transfer')categoryId=x.subcategory_id||x.category_id||null;
    if(x.type==='transfer'&&x.account_id===x.to_account_id)throw new Error('From and To accounts must be different.');
    const row={name:x.name,type:x.type,amount:Number(x.amount),description:x.description||x.name,account_id:x.account_id,to_account_id:x.type==='transfer'?(x.to_account_id||null):null,category_id:categoryId,frequency:x.frequency,next_date:String(x.next_date).slice(0,10),notes:x.notes||null};
    if(data)await update('recurring_transactions',data.id,row);else await insert('recurring_transactions',{...row,active:true});return;
  }
  if(type==='income'||type==='expense'){
    transactionAccountRows=[{account_id:f.elements.account_id.value,amount:Number(f.elements.amount.value)}];transactionAccountMode='single';
    return MB_saveModalBeforePlus(type,data,f);
  }
  if(type==='split'){
    transactionAccountRows=[{account_id:f.elements.account_id.value,amount:Number(f.elements.total_amount.value)}];transactionAccountMode='single';
    return MB_saveModalBeforePlus(type,data,f);
  }
  if(type==='transfer'){
    const x=Object.fromEntries(new FormData(f).entries());const result=await MB_saveModalBeforePlus(type,data,f);if(x.use_recurring_id)await mbRecordRecurringOccurrence(x.use_recurring_id,result?.id||data?.id,x.recurring_occurrence_date||x.transaction_date);return result;
  }
  return MB_saveModalBeforePlus(type,data,f);
};

function fillRecurringIntoFormPlus(id){
  const r=state.recurring_transactions.find(x=>x.id===id),f=$('f');if(!r||!f)return;
  const ds=(window.__recurringUseDate&&/^\d{4}-\d{2}-\d{2}$/.test(window.__recurringUseDate))?window.__recurringUseDate:(selectedDate&&recurringOccursOn(r,selectedDate)?selectedDate:r.next_date);
  if(f.elements.amount)f.elements.amount.value=r.amount;
  if(f.elements.description)f.elements.description.value=r.description||r.name;
  if(f.elements.account_id)f.elements.account_id.value=r.account_id||'';
  if(f.elements.to_account_id)f.elements.to_account_id.value=r.to_account_id||'';
  if(f.elements.transaction_date)f.elements.transaction_date.value=ds;
  if($('recurringOccurrenceDate'))$('recurringOccurrenceDate').value=ds;
  if(transactionCategoryRows.length){const root=rootCategory(state.categories.find(c=>c.id===r.category_id));transactionCategoryRows[0].parent_id=root?.id||'';transactionCategoryRows[0].category_id=r.category_id||'';transactionCategoryRows[0].amount=Number(r.amount);renderTransactionCategoryRows(r.type)}
}
fillRecurringIntoForm=fillRecurringIntoFormPlus;
useRecurring=function(id,date=selectedDate){const r=state.recurring_transactions.find(x=>x.id===id);if(!r)return;const ds=String(date||today()).slice(0,10);window.__recurringUseDate=ds;openModal(r.type,{...r,transaction_date:ds,recurring_id:r.id,use_recurring_id:r.id,recurring_occurrence_date:ds});if($('recurringSelect'))$('recurringSelect').value=r.id};

function renderCalendarPlus(){
  const y=calCursor.getUTCFullYear(),m=calCursor.getUTCMonth();$('calTitle').textContent=new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m,15)));const first=new Date(Date.UTC(y,m,1)),start=(first.getUTCDay()||7)-1,last=new Date(Date.UTC(y,m+1,0)).getUTCDate(),cells=[];
  for(let i=0;i<42;i++){const day=i-start+1,valid=day>=1&&day<=last,ds=valid?`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';const sp=valid?personalSpendingBetween(ds,ds):0,ro=valid?(state.recurring_occurrences||[]).filter(o=>String(o.due_date).slice(0,10)===ds&&o.status==='due').length:0,rf=valid?state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,ds)).length:0,rm=valid?state.reminders.filter(r=>!r.completed&&String(r.due_date).slice(0,10)===ds).length:0;cells.push(`<div class="cal-cell heat${sp===0?0:sp<1000?1:sp<3000?2:sp<7000?3:4} ${!valid?'muted':''} ${ds===selectedDate?'selected':''}" ${valid?`onclick="selectDate('${ds}')"`:''}><div class="cal-num">${valid?day:''}</div>${sp?`<div class="cal-spend red">−${money(sp)}</div>`:''}${ro||rf?'<span class="calendar-dot recurring-dot">•</span>':''}${rm?'<span class="calendar-dot reminder-dot">🔔</span>':''}</div>`)}
  $('calGrid').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="cal-day-name">${x}</div>`).join('')+cells.join('');
  const dayKey=String(selectedDate||today()).slice(0,10),tx=state.transactions.filter(t=>String(t.transaction_date).slice(0,10)===dayKey),due=(state.recurring_occurrences||[]).filter(o=>String(o.due_date).slice(0,10)===dayKey&&o.status==='due'),scheduled=state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,dayKey)),dayRem=state.reminders.filter(r=>String(r.due_date).slice(0,10)===dayKey);
  $('selectedDay').innerHTML=`<div class="total-line"><b>${fmtDate(dayKey)}</b><span class="badge">${tx.length} transaction${tx.length===1?'':'s'}</span></div><div class="three"><div><div class="label">INCOME</div><b class="green">${money(sumType('income',dayKey))}</b></div><div><div class="label">SPENT</div><b class="red">${money(personalSpendingBetween(dayKey,dayKey))}</b></div><div><div class="label">TRANSFER</div><b class="purple">${money(sumType('transfer',dayKey))}</b></div></div>${(due.length||scheduled.length)?`<div class="selected-recurring"><div class="day-recurring-title"><span>Recurring on this date</span></div>${(due.length?due:scheduled.map(r=>({recurring_id:r.id,due_date:dayKey}))).map(o=>{const r=state.recurring_transactions.find(x=>x.id===o.recurring_id);return r?`<div class="mini-stat"><span>${esc(r.name)}<small>${r.frequency} · ${r.type} · ${money(r.amount)}</small></span><button class="smallbtn" onclick="useRecurring('${r.id}','${dayKey}')">Use</button></div>`:''}).join('')}</div>`:''}${dayRem.length?`<div class="selected-reminders"><b>Reminders on this date</b>${dayRem.map(reminderHTML).join('')}</div>`:''}${tx.length?'<div style="margin-top:10px">'+tx.map(txHTML).join('')+'</div>':'<div class="empty">No transactions on this date.</div>'}`;
}
renderCalendar=renderCalendarPlus;

function saveNicknamePlus(value){const name=String(value||'').trim().replace(/\s+/g,' ');localStorage.setItem(nicknameKey(),name);if(user&&sb){const meta={...(user.user_metadata||{})};if(name)meta.nickname=name;else delete meta.nickname;sb.auth.updateUser({data:meta}).then(({data,error})=>{if(!error&&data?.user)user=data.user;}).catch(()=>{});}if($('greetingText'))$('greetingText').textContent=greeting();}
saveNickname=saveNicknamePlus;
function greeting(){const nickname=String(localStorage.getItem(nicknameKey())||user?.user_metadata?.nickname||'').trim();const hour=Number(new Intl.DateTimeFormat('en-IN',{hour:'2-digit',hour12:false,timeZone:'Asia/Kolkata'}).format(new Date()));const part=hour<12?'morning':hour<17?'afternoon':'evening';return `Hello, Good ${part}${nickname?', '+nickname:''}`;}

function exportPDFPlus(){
 if(!window.jspdf)return mbToast('PDF library is unavailable.','error');const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'}),W=595,H=842,M=36;let pageNo=1,y=48;
 const txt=v=>String(v??'').replace(/[^\x20-\x7E]/g,'');const mp=n=>'INR '+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
 const footer=()=>{doc.setFontSize(8);doc.setFont(undefined,'normal');doc.text(`My Budget · Page ${pageNo}`,M,H-22);doc.text(new Date().toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}),W-M-65,H-22)};
 const newPage=()=>{footer();doc.addPage();pageNo++;y=48};const ensure=h=>{if(y+h>H-48)newPage()};
 const head=t=>{ensure(32);doc.setFontSize(16);doc.setFont(undefined,'bold');doc.text(txt(t),M,y);y+=24;doc.setFont(undefined,'normal')};
 const line=(v,b=false)=>{ensure(15);doc.setFontSize(8.5);doc.setFont(undefined,b?'bold':'normal');doc.text(txt(v),M,y);y+=13};
 const bar=(title,items,percent=false)=>{ensure(180);head(title);const a=items.slice(0,8),max=Math.max(1,...a.map(x=>Number(x.value||0))),bw=330; a.forEach((x,i)=>{const yy=y+i*20;doc.setFontSize(7);doc.text(txt(x.label).slice(0,23),M,yy+8);doc.rect(M+100,yy,bw,9);doc.rect(M+100,yy,Math.max(1,bw*Number(x.value||0)/max),9,'F');doc.text(txt(percent?`${Number(x.value||0).toFixed(0)}%`:mp(x.value)),M+440,yy+8)});y+=a.length*20+18};
 doc.setFontSize(24);doc.setFont(undefined,'bold');doc.text('My Budget',M,y);y+=20;doc.setFontSize(10);doc.setFont(undefined,'normal');doc.text('Professional financial report · '+new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),M,y);y+=30;
 const inc=sumType('income',ym()),sp=personalSpendingBetween(ym()+'-01',today()),sav=inc-sp;
 [['Income',inc],['Expense',sp],['Saved',sav],['Net balance',totalBalance()]].forEach((q,i)=>{const x=M+(i%2)*260,yy=y+Math.floor(i/2)*62;doc.roundedRect(x,yy,240,50,8,8);doc.setFontSize(8);doc.text(q[0].toUpperCase(),x+10,yy+16);doc.setFontSize(15);doc.setFont(undefined,'bold');doc.text(txt(mp(q[1])),x+10,yy+36);doc.setFont(undefined,'normal')});y+=140;
 bar('Spending by parent category',categoryGroups([ym()+'-01',today()]).map(g=>({label:g.root.name,value:g.spent})));
 head('People & held money');const ps=peopleBalances();line(`They owe you: ${mp(ps.reduce((s,p)=>s+p.balance,0))}`,true);line(`You owe: ${mp(ps.reduce((s,p)=>s+p.iOwe,0))}`);line(`Money held pending: ${mp(moneyHeldOutstanding())}`);line(`Split pending: ${mp(ps.reduce((s,p)=>s+p.splitPending,0))}`);
 head('Budgets');state.budgets.forEach(b=>{const q=budgetStatus(b);line(`${b.name} · ${budgetCategoryLabel(b)} · ${mp(q.used)} / ${mp(b.amount)} · ${q.pct.toFixed(0)}%`)});
 head('Goals');bar('Goal progress',state.goals.map(g=>({label:g.name,value:g.target_amount?Number(g.saved_amount||0)/Number(g.target_amount)*100:0})),true);state.goals.forEach(g=>line(`${g.name} · Existing ${mp(g.existing_amount)} · Saved ${mp(g.saved_amount)} / ${mp(g.target_amount)} · ${g.target_amount?(g.saved_amount/g.target_amount*100).toFixed(0):0}%`));
 head('Reminders');state.reminders.forEach(r=>line(`${r.due_date} · ${r.completed?'Completed':'Pending'} · ${r.title}${r.note?' · '+r.note:''}`));
 head('Recurring schedules');state.recurring_transactions.forEach(r=>line(`${r.name} · ${r.type} · ${r.frequency} · ${mp(r.amount)} · next ${r.next_date} · ${r.active?'Active':'Paused'}`));
 head('Categories');state.categories.forEach(c=>line(`${c.parent_id?'  ↳ ':' '}${c.name} · ${c.type}`));
 head('All transactions');state.transactions.slice().sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date))).forEach((t,i)=>line(`${i+1}. ${t.transaction_date} · ${t.type} · ${t.description||'(No description)'} · ${mp(t.amount)} · ${accountName(t.account_id)} · ${txAllocations(t).map(x=>catName(x.category_id)).join(', ')}`));
 head('Accounts');state.accounts.forEach(a=>line(`${a.name} · ${a.type} · Balance ${mp(accountBalance(a))}`));footer();doc.save('my-budget-professional-report.pdf');mbToast('Professional PDF report created.');
}
exportPDF=exportPDFPlus;

/* Keep the home/people/calendar renders coherent after showPage/render calls. */


/* ===== vNext+Plus final requested fixes ===== */
(function(){
  // No Saving/Updating/Deleting busy overlay. Keep the transaction update RPC fix.
  const baseInsert=insert, baseUpdate=update, baseDel=del;
  insert=async function(t,row){return await baseInsert(t,row)};
  update=async function(t,id,row){
    // Transactions occasionally fail because PostgREST's UPDATE+RETURNING path can return no row.
    // Use the owner-checked RPC when available; fall back to the normal update path for compatibility.
    if(t==='transactions' && sb?.rpc){
      const r=await sb.rpc('update_my_transaction',{p_id:id,p_patch:row});
      if(!r.error && r.data) return r.data;
      if(r.error && !/function .*update_my_transaction.*does not exist/i.test(r.error.message||'')) throw r.error;
    }
    return await baseUpdate(t,id,row);
  };
  del=async function(t,id){return await baseDel(t,id)};

  // Recurring occurrence bookkeeping must never block a real transaction from being saved.
  mbRecordRecurringOccurrence=async function(recurringId,txId,occDate){
    if(!recurringId)return;
    const o=(state.recurring_occurrences||[]).find(x=>x.recurring_id===recurringId&&String(x.due_date).slice(0,10)===String(occDate).slice(0,10));
    if(!o)return;
    try{
      if(sb?.rpc){
        const r=await sb.rpc('record_recurring_occurrence',{p_occurrence_id:o.id,p_transaction_id:txId});
        if(!r.error)return;
        if(!/function .*record_recurring_occurrence.*does not exist/i.test(r.error.message||'')) return;
      }
      await baseUpdate('recurring_occurrences',o.id,{status:'recorded',transaction_id:txId});
    }catch(e){console.warn('Recurring occurrence bookkeeping skipped:',e)}
  };

  // Accounts: group by account type and highlight income/spent/balance.
  renderAccounts=function(){
    const groups={};
    state.accounts.forEach(a=>(groups[a.type||'other']??=[]).push(a));
    const order=['bank','cash','credit_card','investment','investments','wallet','other'];
    const keys=[...order.filter(k=>groups[k]),...Object.keys(groups).filter(k=>!order.includes(k))];
    const label=k=>({bank:'Bank',cash:'Cash',credit_card:'Credit Card',investment:'Investments',investments:'Investments',wallet:'Wallet',other:'Other'}[k]||k.replace(/_/g,' '));
    $('accountList').innerHTML=keys.map(k=>`<div class="account-type-group"><div class="account-type-title">${esc(label(k))}</div>${groups[k].map(a=>{
      const inc=state.transactions.filter(t=>t.account_id===a.id&&t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0);
      const spent=state.transactions.filter(t=>t.account_id===a.id&&(t.type==='expense'||t.type==='split')).reduce((s,t)=>s+Number(t.amount||0),0);
      const bal=accountBalance(a); return `<div class="card account-card"><div class="row"><div class="left"><div class="bubble">🏦</div><div><div class="name">${esc(a.name)}</div><div class="sub">${esc(a.currency||'INR')}</div></div></div><div style="text-align:right"><div class="account-balance">${money(bal)}</div><div class="action-row"><button class="smallbtn" onclick="editAccount('${a.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteAccount('${a.id}')">Delete</button></div></div></div><div class="account-metrics"><div><span>Income</span><b class="green">${money(inc)}</b></div><div><span>Spent</span><b class="red">${money(spent)}</b></div><div><span>Balance</span><b class="purple">${money(bal)}</b></div></div></div>`}).join('')}</div>`).join('')||'<div class="empty">Add your first account.</div>';
  };

  // Calendar: transaction and reminder sections are explicitly separate for the selected date.
  renderCalendar=function(){
    const y=calCursor.getUTCFullYear(),m=calCursor.getUTCMonth();
    $('calTitle').textContent=new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m,15)));
    const first=new Date(Date.UTC(y,m,1)),start=(first.getUTCDay()||7)-1,last=new Date(Date.UTC(y,m+1,0)).getUTCDate(),cells=[];
    for(let i=0;i<42;i++){
      const day=i-start+1,valid=day>=1&&day<=last,ds=valid?`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';
      const sp=valid?personalSpendingBetween(ds,ds):0,ro=valid?(state.recurring_occurrences||[]).filter(o=>String(o.due_date).slice(0,10)===ds&&o.status==='due').length:0,rf=valid?state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,ds)).length:0,rm=valid?state.reminders.filter(r=>String(r.due_date).slice(0,10)===ds).length:0;
      cells.push(`<div class="cal-cell heat${sp===0?0:sp<1000?1:sp<3000?2:sp<7000?3:4} ${!valid?'muted':''} ${ds===selectedDate?'selected':''}" ${valid?`onclick="selectDate('${ds}')"`:''}><div class="cal-num">${valid?day:''}</div>${sp?`<div class="cal-spend red">−${money(sp)}</div>`:''}${ro||rf?'<span class="calendar-dot recurring-dot">•</span>':''}${rm?'<span class="calendar-dot reminder-dot">🔔</span>':''}</div>`);
    }
    $('calGrid').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="cal-day-name">${x}</div>`).join('')+cells.join('');
    const dayKey=String(selectedDate||today()).slice(0,10),tx=state.transactions.filter(t=>String(t.transaction_date).slice(0,10)===dayKey),dayRem=state.reminders.filter(r=>String(r.due_date).slice(0,10)===dayKey),due=(state.recurring_occurrences||[]).filter(o=>String(o.due_date).slice(0,10)===dayKey&&o.status==='due'),scheduled=state.recurring_transactions.filter(r=>r.active&&recurringOccursOn(r,dayKey));
    const recurringHTML=(due.length||scheduled.length)?`<div class="selected-recurring"><div class="day-recurring-title"><span>Recurring on this date</span></div>${(due.length?due:scheduled.map(r=>({recurring_id:r.id,due_date:dayKey}))).map(o=>{const r=state.recurring_transactions.find(x=>x.id===o.recurring_id);return r?`<div class="mini-stat"><span>${esc(r.name)}<small>${r.frequency} · ${r.type} · ${money(r.amount)}</small></span><button class="smallbtn" onclick="useRecurring('${r.id}','${dayKey}')">Use</button></div>`:''}).join('')}</div>`:'';
    const reminderSection=`<div class="day-reminder-title"><span>Reminders</span><span class="day-reminder-count">${dayRem.length}</span></div>${dayRem.length?dayRem.map(reminderHTML).join(''):'<div class="empty">No reminders on this date.</div>'}`;
    const txSection=`<div class="day-transaction-title"><span>Transactions</span><span class="day-transaction-count">${tx.length}</span></div>${tx.length?tx.map(txHTML).join(''):'<div class="empty">No transactions on this date.</div>'}`;
    $('selectedDay').innerHTML=`<div class="total-line"><b>${fmtDate(dayKey)}</b></div><div class="three"><div><div class="label">INCOME</div><b class="green">${money(sumType('income',dayKey))}</b></div><div><div class="label">SPENT</div><b class="red">${money(personalSpendingBetween(dayKey,dayKey))}</b></div><div><div class="label">TRANSFER</div><b class="purple">${money(sumType('transfer',dayKey))}</b></div></div>${recurringHTML}${reminderSection}${txSection}`;
  };

  // Make the selected-date transaction count prominent anywhere the calendar summary is rendered.
  const oldTxHTML=txHTML;
  // Home people metrics: retain only useful financial categories; To receive includes split + lend.
  renderHome=function(){
    const now=todayDate(),b=state.budgets.find(x=>x.period==='monthly'&&(!x.year||x.year===now.getFullYear())&&(!x.month||x.month===now.getMonth()+1));
    $('homeBudget').innerHTML=b?budgetHTML(b):'<div class="empty">No monthly budget yet.</div>';
    const gs=state.goals.slice().sort((a,b)=>Number(b.is_completed)-Number(a.is_completed)).slice(0,1);$('homeGoals').innerHTML=gs.length?gs.map(goalHTML).join(''):'<div class="empty">No goals yet.</div>';
    const ps=peopleBalances().filter(x=>x.balance>0||x.iOwe>0).slice(0,1);$('homePeople').innerHTML=ps.length?ps.map(personHTML).join(''):'<div class="empty">No outstanding people balances.</div>';
    const rs=state.reminders.filter(r=>!r.completed).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));$('homeReminders').innerHTML=rs.length?rs.map(reminderHTML).join(''):'<div class="empty">No pending reminders.</div>';
    const splitPending=state.split_participants.reduce((sum,r)=>sum+Math.max(0,Number(r.amount||0)-Number(r.amount_paid||0)),0),held=moneyHeldOutstanding(),lend=peopleBalances().reduce((s,p)=>s+Number(p.loanOwed||0),0),borrow=peopleBalances().reduce((s,p)=>s+Number(p.loanIowe||0),0);
    const el=$('homePeopleStats');if(el)el.innerHTML=`<div class="split"><span>Split pending</span><b>${money(splitPending)}</b></div><div class="held"><span>Money held</span><b>${money(held)}</b></div><div class="lend"><span>They owe you</span><b>${money(lend)}</b></div><div class="owe"><span>You owe</span><b>${money(borrow)}</b></div><div class="receivable"><span>To receive</span><b>${money(splitPending+lend)}</b></div><div class="payable"><span>To pay</span><b>${money(borrow)}</b></div>`;
    const tx=state.transactions.slice().sort((a,b)=>String(b.created_at||b.transaction_date||'').localeCompare(String(a.created_at||a.transaction_date||''))).slice(0,5);$('homeRecent').innerHTML=tx.length?tx.map(txHTML).join(''):'<div class="empty">No transactions yet.</div>';
  };

  // Remove accidental persistent busy state if an older build left it behind.
  window.addEventListener('load',()=>setTimeout(mbBusyOff,500));
})();

/* ===== vNext+Plus v3 final fixes ===== */
(function(){
  // 1) Calendar: clearer headings + comfortable date/summary spacing.
  const _renderCalendar=renderCalendar;
  renderCalendar=function(){
    _renderCalendar();
    const sd=document.querySelector('#selectedDay');
    if(sd){
      const h=sd.querySelector('.total-line');
      if(h) h.classList.add('calendar-day-header');
    }
  };

  // 2) Accounts: the balance is already shown in the metrics row; don't duplicate it above.
  const _renderAccounts=renderAccounts;
  renderAccounts=function(){
    _renderAccounts();
    document.querySelectorAll('#accountList .account-balance').forEach(el=>el.remove());
  };

  // 3) Remove the goal "saving progress/plan" panel from cards. Contributions remain available.
  const _goalHTML=goalHTML;
  goalHTML=function(g){
    const html=_goalHTML(g);
    const tmp=document.createElement('div');tmp.innerHTML=html;
    tmp.querySelectorAll('.goal-plan').forEach(el=>el.remove());
    return tmp.innerHTML;
  };

  // 4) Recurring "Use" must CREATE a transaction, not UPDATE the recurring schedule.
  // The previous implementation spread the recurring row into `data`, so data.id was
  // the recurring_transaction id and the transaction UPDATE correctly failed with
  // "Transaction not found or not permitted".
  useRecurring=function(id,date=selectedDate){
    const r=state.recurring_transactions.find(x=>x.id===id); if(!r)return;
    const ds=String(date||r.next_date||today()).slice(0,10);
    window.__recurringUseDate=ds;
    const payload={...r,id:null,__recurringUse:true,recurring_id:r.id,use_recurring_id:r.id,recurring_occurrence_date:ds,transaction_date:ds};
    openModal(r.type,payload);
    if($('recurringSelect')) $('recurringSelect').value=r.id;
    if($('recurringOccurrenceDate')) $('recurringOccurrenceDate').value=ds;
  };

  const _fillRecurring=fillRecurringIntoForm;
  fillRecurringIntoForm=function(id){
    _fillRecurring(id);
    if(id){
      const r=state.recurring_transactions.find(x=>x.id===id);
      const ds=(window.__recurringUseDate&&/^\\d{4}-\\d{2}-\\d{2}$/.test(window.__recurringUseDate))?window.__recurringUseDate:(r?.next_date||today());
      if($('transactionDate')) $('transactionDate').value=ds;
      if($('f')?.elements.transaction_date) $('f').elements.transaction_date.value=ds;
      if($('recurringOccurrenceDate')) $('recurringOccurrenceDate').value=ds;
    }
  };

  // Robust recurring occurrence recording. If Generate due items was not run first,
  // create the missing occurrence and then mark it recorded. This is idempotent.
  mbRecordRecurringOccurrence=async function(recurringId,txId,occDate){
    if(!recurringId||!txId||!sb||!user)return;
    const ds=String(occDate||today()).slice(0,10);
    try{
      let o=(state.recurring_occurrences||[]).find(x=>x.recurring_id===recurringId&&String(x.due_date).slice(0,10)===ds);
      if(!o){
        const ins=await sb.from('recurring_occurrences').insert({user_id:user.id,recurring_id:recurringId,due_date:ds,status:'recorded',transaction_id:txId}).select('*').single();
        if(!ins.error)return;
        // Unique-date race: another request may have created it.
        if(ins.error.code!=='23505') { console.warn('Could not create recurring occurrence:',ins.error.message); return; }
        const q=await sb.from('recurring_occurrences').select('*').eq('recurring_id',recurringId).eq('due_date',ds).maybeSingle();
        o=q.data||null;
      }
      if(!o)return;
      const r=await sb.rpc('record_recurring_occurrence',{p_occurrence_id:o.id,p_transaction_id:txId});
      if(r.error) await sb.from('recurring_occurrences').update({status:'recorded',transaction_id:txId}).eq('id',o.id).eq('user_id',user.id);
    }catch(e){console.warn('Recurring occurrence bookkeeping skipped:',e)}
  };

  // Override the final save layer so a recurring-use form always inserts a transaction.
  const _saveModal=saveModal;
  saveModal=async function(type,data,f){
    if((type==='income'||type==='expense') && data?.__recurringUse){
      const x=Object.fromEntries(new FormData(f).entries());
      const amount=Number(x.amount), acc=transactionAccountData(amount), cats=transactionCategoryData(amount,type);
      const row={amount,description:x.description||'',transaction_date:String(x.transaction_date||window.__recurringUseDate||data.transaction_date).slice(0,10),account_id:acc[0].account_id,category_id:cats[0]?.category_id||null,notes:x.notes||null,type};
      const tx=await insert('transactions',{...row,recurring_id:data.recurring_id||x.use_recurring_id||null});
      await saveTransactionCategoryRows(tx.id,cats);
      await saveTransactionAccountRows(tx.id,acc);
      await mbRecordRecurringOccurrence(data.recurring_id||x.use_recurring_id,tx.id,x.recurring_occurrence_date||row.transaction_date);
      return tx;
    }
    if(type==='transfer' && data?.__recurringUse){
      const x=Object.fromEntries(new FormData(f).entries());
      if(!x.account_id||!x.to_account_id)throw new Error('Please select both accounts for the transfer.');
      if(x.account_id===x.to_account_id)throw new Error('From and To accounts must be different.');
      const row={amount:Number(x.amount),description:x.description||'Transfer',transaction_date:String(x.transaction_date||window.__recurringUseDate||data.transaction_date).slice(0,10),account_id:x.account_id,to_account_id:x.to_account_id,type:'transfer',goal_id:null,notes:x.notes||null};
      const tx=await insert('transactions',{...row,recurring_id:data.recurring_id||x.use_recurring_id||null});
      await mbRecordRecurringOccurrence(data.recurring_id||x.use_recurring_id,tx.id,x.recurring_occurrence_date||row.transaction_date);
      return tx;
    }
    return _saveModal(type,data,f);
  };

  // Calendar section headings: make them visually distinct without changing data behavior.
  const style=document.createElement('style');
  style.textContent=`
    .day-reminder-title,.day-transaction-title{font-weight:850;font-size:18px;letter-spacing:-.15px;padding:14px 10px 10px;border-top:1px solid var(--line);margin-top:16px;border-radius:12px;background:var(--bg)}
    .day-reminder-title{color:var(--amber)} .day-transaction-title{color:var(--purple)}
    .calendar-day-header{display:flex!important;align-items:baseline!important;gap:16px!important;padding:3px 4px 8px!important}
    .calendar-day-header>b{font-size:18px!important}
    .budget-progress-line .badge{font-size:13px!important;min-width:42px!important;padding:3px 6px!important}
    #accountList .account-balance{display:none!important}
    .goal-plan{display:none!important}
    @media(max-width:560px){.day-reminder-title,.day-transaction-title{font-size:16px}.calendar-day-header{gap:12px!important}.budget-progress-line .badge{font-size:13px!important}}
  `;
  document.head.appendChild(style);
})();


/* ===== vNext+Plus v5 performance + recurring reliability patch ===== */
(function(){
  // Recurring schedules are templates. "Use" must always create a NEW transaction.
  // The previous build could leave transactionAccountRows pointing at an older modal,
  // even though HDFC (or another account) was visibly selected in the form.
  useRecurring=function(id,date=selectedDate){
    const r=state.recurring_transactions.find(x=>x.id===id);
    if(!r)return;
    const ds=String(date||r.next_date||today()).slice(0,10);
    window.__recurringUseDate=ds;
    const payload={__recurringUse:true,recurring_id:r.id,use_recurring_id:r.id,
      transaction_date:ds,amount:r.amount,description:r.description||r.name,
      account_id:r.account_id||'',to_account_id:r.to_account_id||'',
      category_id:r.category_id||'',recurring_occurrence_date:ds};
    openModal(r.type,payload);
    const f=$('f');
    if(!f)return;
    // Rebuild the transient allocation state from THIS recurring record/form.
    const accountId=f.elements.account_id?.value||r.account_id||'';
    transactionAccountMode='single';
    transactionAccountRows=[{account_id:accountId,amount:Number(r.amount||0)}];
    if(f.elements.account_id)f.elements.account_id.value=accountId;
    if(f.elements.to_account_id)f.elements.to_account_id.value=r.to_account_id||'';
    if(f.elements.transaction_date)f.elements.transaction_date.value=ds;
    if($('recurringOccurrenceDate'))$('recurringOccurrenceDate').value=ds;
    if(r.type!=='transfer'){
      const catId=r.category_id||'';
      const cat=state.categories.find(c=>c.id===catId);
      const root=cat?rootCategory(cat):null;
      transactionCategoryMode='single';
      transactionCategoryRows=[{parent_id:root?.id||'',category_id:catId,amount:Number(r.amount||0)}];
      renderTransactionCategoryRows(r.type);
    }
  };

  // Final guard: always take the selected account/category from the current form,
  // falling back to the recurring template only if the form has no value.
  const _v5SaveModal=saveModal;
  saveModal=async function(type,data,f){
    if((type==='income'||type==='expense')&&data?.__recurringUse){
      const x=Object.fromEntries(new FormData(f).entries());
      const amount=Number(x.amount||data.amount||0);
      if(!(amount>0))throw new Error('Please enter a valid amount.');
      const accountId=x.account_id||data.account_id||'';
      if(!accountId)throw new Error('Please select an account.');
      transactionAccountMode='single';
      transactionAccountRows=[{account_id:accountId,amount}];
      const categoryId=x.subcategory_id||x.category_id||data.category_id||'';
      const cat=state.categories.find(c=>c.id===categoryId);
      const root=cat?rootCategory(cat):null;
      transactionCategoryMode='single';
      transactionCategoryRows=[{parent_id:root?.id||'',category_id:categoryId,amount}];
      const cats=transactionCategoryData(amount,type);
      const ds=String(x.transaction_date||data.transaction_date||window.__recurringUseDate||today()).slice(0,10);
      const row={amount,description:x.description||data.description||'',transaction_date:ds,
        account_id:accountId,category_id:cats[0]?.category_id||null,notes:x.notes||null,type};
      const tx=await insert('transactions',{...row,recurring_id:data.recurring_id||x.use_recurring_id||null});
      await saveTransactionCategoryRows(tx.id,cats);
      await saveTransactionAccountRows(tx.id,transactionAccountRows);
      await mbRecordRecurringOccurrence(data.recurring_id||x.use_recurring_id,tx.id,x.recurring_occurrence_date||ds);
      return tx;
    }
    if(type==='transfer'&&data?.__recurringUse){
      const x=Object.fromEntries(new FormData(f).entries());
      const from=x.account_id||data.account_id||'',to=x.to_account_id||data.to_account_id||'';
      if(!from||!to)throw new Error('Please select both accounts for the transfer.');
      if(from===to)throw new Error('From and To accounts must be different.');
      const amount=Number(x.amount||data.amount||0);if(!(amount>0))throw new Error('Please enter a valid amount.');
      const ds=String(x.transaction_date||data.transaction_date||window.__recurringUseDate||today()).slice(0,10);
      const row={amount,description:x.description||data.description||'Transfer',transaction_date:ds,account_id:from,to_account_id:to,type:'transfer',goal_id:null,notes:x.notes||null};
      const tx=await insert('transactions',{...row,recurring_id:data.recurring_id||x.use_recurring_id||null});
      await mbRecordRecurringOccurrence(data.recurring_id||x.use_recurring_id,tx.id,x.recurring_occurrence_date||ds);
      return tx;
    }
    return _v5SaveModal(type,data,f);
  };

  // Recurring editor validation: don't silently save a schedule with no account.
  const _v5OpenRecurring=openRecurringModalPlus;
  openRecurringModalPlus=function(data=null){
    _v5OpenRecurring(data);
    const f=$('f');if(!f)return;
    const original=f.onsubmit;
    f.onsubmit=async e=>{
      e.preventDefault();
      const x=Object.fromEntries(new FormData(f).entries());
      if(!x.account_id) { alert('Please select an account.'); return; }
      if(x.type==='transfer'&&!x.to_account_id){ alert('Please select the To account.'); return; }
      await original(e);
    };
  };

  // Faster initial load: avoid fetching/rendering every page and every chart whenever
  // the user changes tabs or completes an action.
  const _v5Render=render;
  render=function(){
    const active=document.querySelector('.page.active')?.id||'home';
    const m=ym(),inc=sumType('income',m),spent=personalSpendingBetween(m+'-01',today()),saved=inc-spent;
    if($('monthLabel'))$('monthLabel').textContent=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());
    const nowLabel=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());
    ['transactionsDate','accountsDate','budgetsDate','calendarDate','goalsDate','peopleDate','insightsDate','moreDate','recurringDate','loansDate','splitDate','moneyHeldDate'].forEach(id=>{if($(id))$(id).textContent=nowLabel});
    if($('greetingText'))$('greetingText').textContent=greeting();
    if($('totalBalance'))$('totalBalance').textContent=money(totalBalance());
    if($('monthIncome'))$('monthIncome').textContent=money(inc);
    if($('monthSpent'))$('monthSpent').textContent=money(spent);
    if($('monthSaved'))$('monthSaved').textContent=money(saved);
    if(active==='home')renderHome();
    else if(active==='transactions')renderTransactions();
    else if(active==='accounts')renderAccounts();
    else if(active==='budgets')renderBudgets();
    else if(active==='calendar')renderCalendar();
    else if(active==='reminders')renderRemindersPage();
    else if(active==='goals')renderGoals();
    else if(active==='split'){if($('splitList'))splitListHTML();}
    else if(active==='moneyheld'){if($('moneyHeldList'))renderMoneyHeld();}
    else if(active==='people')renderPeople();
    else if(active==='loans')renderLoans();
    else if(active==='insights')renderInsights();
    else if(active==='recurring')renderRecurring();
  };

  // Calendar: recurring heading uses the same visual treatment as Reminders.
  const style=document.createElement('style');
  style.textContent=`
    .selected-recurring{margin-top:14px;padding:0 0 8px;border-top:0}
    .selected-recurring>b{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--amber);font-size:18px;font-weight:850}
    .selected-recurring .mini-stat{padding:12px 14px}
    .home-people-stats{grid-template-columns:repeat(6,minmax(0,1fr))}
    @media(max-width:700px){.home-people-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:480px){.home-people-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
})();

/* ===== vNext+Plus v7 final polish ===== */
(function(){
  // Remove the busy/saving overlay concept completely. Database operations still run
  // normally; no intrusive "Saving…" or "Updating…" banner is shown.
  mbBusy=function(){};
  mbBusyOff=function(){};
  const s=document.createElement('style');
  s.textContent=`
    .mb-busy{display:none!important}
    .selected-recurring>b{font-size:18px!important;font-weight:800!important;line-height:1.25!important}
    .home-people-stats{grid-template-columns:repeat(6,minmax(0,1fr))!important}
    @media(max-width:900px){.home-people-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
    @media(max-width:480px){.home-people-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
  `;
  document.head.appendChild(s);
})();

/* v13 calendar heading polish: three distinct colors, matching heading scale. */
(function(){
  const s=document.createElement('style');
  s.textContent=`
    .day-recurring-title{font-size:18px!important;font-weight:850!important;line-height:1.25!important;color:var(--blue)!important;}
    .day-reminder-title{font-size:18px!important;font-weight:850!important;line-height:1.25!important;color:var(--amber)!important;}
    .day-transaction-title{font-size:18px!important;font-weight:850!important;line-height:1.25!important;color:var(--purple)!important;}
    .selected-recurring>b{font-size:18px!important;line-height:1.25!important;color:var(--blue)!important;}
    @media(max-width:560px){
      .day-recurring-title,.day-reminder-title,.day-transaction-title{font-size:16px!important;}
      .selected-recurring>b{font-size:16px!important;}
    }
  `;
  document.head.appendChild(s);
})();

/* ===== Editable transaction time + last-updated timestamp ===== */
(function(){
  const pad=n=>String(n).padStart(2,'0');
  function currentLocalDT(){
    const d=new Date();
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }
  function isoToLocalDT(iso){
    if(!iso)return currentLocalDT();
    const d=new Date(iso); if(isNaN(d))return currentLocalDT();
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }
  function localDTToISO(v){
    if(!v)return new Date().toISOString();
    // The app is designed for India time; preserve the selected IST wall-clock time.
    const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if(!m)return new Date().toISOString();
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+05:30`;
  }
  function stampField(data){
    const value=isoToLocalDT(data?.created_at);
    return `<label>Recorded date & time</label><input name="transaction_timestamp" type="datetime-local" step="60" value="${value}" required>`;
  }
  function updatedLabel(iso){return iso?` · Updated ${esc(fmtDateTime(iso))}`:''}
  window.fmtDateTime=function(iso){
    if(!iso)return '';
    const d=new Date(iso); if(isNaN(d))return '';
    return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}).format(d);
  };
  window.__mbTimestamp={localDTToISO,isoToLocalDT,currentLocalDT,stampField};

  // Add the editable timestamp to transaction-related forms after the app opens them.
  const _openModal=window.openModal;
  window.openModal=function(type,data=null){
    const result=_openModal(type,data);
    const needs=['income','expense','transfer','split','loan','loanRepayment','loanRepaymentEdit','repayment','repaymentEdit','moneyHeld'].includes(type);
    if(!needs)return result;
    const f=$('f'); if(!f||f.dataset.timestampPatched==='1')return result;
    const anchor=f.elements.transaction_date||f.elements.loan_date||f.elements.repayment_date||f.elements.reimbursement_date||f.elements.received_date;
    if(!anchor)return result;
    const wrap=document.createElement('div');
    wrap.innerHTML=stampField(data);
    anchor.closest('label')?.after(wrap);
    if(!anchor.closest('label'))anchor.after(wrap);
    // The separate "Date" field duplicates "Recorded date & time" on transaction forms, so hide the
    // Date label+input and keep the hidden field in sync with the recorded timestamp instead.
    if(anchor.name==='transaction_date'){
      anchor.style.display='none';
      const dateLabel=anchor.previousElementSibling;
      if(dateLabel&&dateLabel.tagName==='LABEL')dateLabel.style.display='none';
      const stampInput=wrap.querySelector('[name="transaction_timestamp"]');
      const syncDate=()=>{ if(stampInput.value) anchor.value=stampInput.value.slice(0,10); };
      stampInput?.addEventListener('input',syncDate);
      stampInput?.addEventListener('change',syncDate);
    }
    f.dataset.timestampPatched='1';
    return result;
  };

  // Inject timestamps into save operations without changing the existing business logic.
  const _saveModal=window.saveModal;
  window.saveModal=async function(type,data,f){
    const timestamp=f?.elements?.transaction_timestamp?.value;
    const result=await _saveModal(type,data,f);
    if(!timestamp||!sb||!user)return result;
    const createdAt=localDTToISO(timestamp), now=new Date().toISOString();
    try{
      if(type==='income'||type==='expense'||type==='transfer'||type==='split'||type==='repayment'||type==='repaymentEdit'){
        const txId= type==='split' ? (result?.id||data?.transaction_id) : (result?.id||data?.id);
        if(txId) await sb.from('transactions').update({created_at:createdAt,updated_at:now}).eq('id',txId).eq('user_id',user.id);
      } else if(type==='loan' && (result?.id||data?.id)) {
        await sb.from('loans').update({created_at:createdAt,updated_at:now}).eq('id',result?.id||data.id).eq('user_id',user.id);
      } else if(type==='loanRepayment' && (result?.id||data?.id)) {
        await sb.from('loan_repayments').update({created_at:createdAt,updated_at:now}).eq('id',result?.id||data.id).eq('user_id',user.id);
      }
    }catch(e){console.warn('Timestamp bookkeeping skipped:',e)}
    return result;
  };

  // Money Held uses its own submit handler, so patch the form after it is created.
  const _openMoney=window.openModal;
  window.openModal=function(type,data=null){
    const r=_openMoney(type,data);
    if(type==='moneyHeld'){
      const f=$('f');
      if(f&&!f.dataset.timestampPatched){
        const anchor=f.elements.received_date;
        if(anchor){
          const wrap=document.createElement('div');wrap.innerHTML=stampField(data);anchor.closest('label')?.after(wrap);if(!anchor.closest('label'))anchor.after(wrap);
          const original=f.onsubmit;
          f.onsubmit=async function(e){
            await original.call(this,e);
            const timestamp=this.elements.transaction_timestamp?.value;
            if(timestamp&&data?.id){try{await sb.from('money_held').update({created_at:localDTToISO(timestamp),updated_at:new Date().toISOString()}).eq('id',data.id).eq('user_id',user.id);await loadData();render();}catch(err){console.warn('Money Held timestamp update skipped:',err)}}
          };
          f.dataset.timestampPatched='1';
        }
      }
    }
    return r;
  };

  // Show both the transaction timestamp and the last modification timestamp.
  const _txHTML=window.txHTML;
  window.txHTML=function(t){
    const html=_txHTML(t);
    if(!html)return html;
    const marker=t.updated_at?`Updated ${esc(fmtDateTime(t.updated_at))}`:'';
    const stamp=`<div class="sub timestamp-meta">Recorded ${esc(fmtDateTime(t.created_at))}${marker?' · '+marker:''}</div>`;
    // Keep the timestamp on its own line, immediately below Category when present,
    // otherwise below the transaction details and before Notes.
    if(/<div class="sub">Category: [\s\S]*?<\/div>/.test(html)){
      return html.replace(/(<div class="sub">Category: [\s\S]*?<\/div>)/,`$1${stamp}`);
    }
    if(/<div class="sub">[\s\S]*?<\/div><\/div><div class="tx-right"/.test(html)){
      return html.replace(/(<div class="sub">[\s\S]*?<\/div>)(<\/div><div class="tx-right")/,`$1${stamp}$2`);
    }
    return html.replace('</div><div class="tx-right"',`${stamp}</div><div class="tx-right"`);
  };
  const _heldHTML=window.heldHTML;
  if(_heldHTML)window.heldHTML=function(h){
    const html=_heldHTML(h);
    const stamp=`<div class="sub timestamp-meta">Recorded ${esc(fmtDateTime(h.created_at))}${h.updated_at?' · Updated '+esc(fmtDateTime(h.updated_at)):''}</div>`;
    return html.replace(/(<div class="sub">[\s\S]*?<\/div>)(<\/div><div style="text-align:right">)/,`$1${stamp}$2`);
  };
  const style=document.createElement('style');style.textContent=`
    .timestamp-help{margin:-5px 0 10px;font-size:12px;opacity:.75}
    .timestamp-meta{display:block!important;width:100%!important;box-sizing:border-box;font-size:11px!important;line-height:1.35;margin-top:4px;opacity:.72;white-space:normal}
    input[type="datetime-local"]{width:100%;box-sizing:border-box}
    @media(max-width:560px){.timestamp-help{font-size:11px}.timestamp-meta{font-size:10px!important}}
  `;document.head.appendChild(style);
})();

/* ===== vNext+Plus final transaction chronology/account-balance patch ===== */
(function(){
  const recordedMs=t=>{const v=Date.parse(t?.created_at||'');return Number.isFinite(v)?v:0;};

  function accountEffects(t){
    const n=Number(t?.amount||0), out=[];
    if(!Number.isFinite(n)||n===0)return out;
    if(t.__special==='loan'){if(t.account_id)out.push([t.account_id,t.direction==='borrow'?n:-n]);}
    else if(t.__special==='loan_repayment'){if(t.account_id)out.push([t.account_id,t.direction==='received'?n:-n]);}
    else if(t.__special==='held'){if(t.account_id)out.push([t.account_id,n]);}
    else if(t.type==='transfer'){if(t.account_id)out.push([t.account_id,-n]);if(t.to_account_id)out.push([t.to_account_id,n]);}
    else {
      const allocs=(state.transaction_accounts||[]).filter(x=>x.transaction_id===t.id&&x.account_id);
      if(allocs.length && (t.type==='income'||t.type==='reimbursement'||t.type==='expense'||t.type==='split')){
        const total=allocs.reduce((s,x)=>s+Number(x.amount||0),0)||n;
        allocs.forEach(x=>{const share=Number(x.amount||0);const delta=(t.type==='income'||t.type==='reimbursement'?1:-1)*(total?share*n/total:0);out.push([x.account_id,delta]);});
      } else if(t.account_id){
        if(t.type==='income'||t.type==='reimbursement')out.push([t.account_id,n]);
        else if(t.type==='expense'||t.type==='split')out.push([t.account_id,-n]);
      }
    }
    return out;
  }

  function buildRows(){
    const rows=state.transactions.map(t=>({...t,__special:null})), baseIds=new Set(rows.map(t=>t.id));
    state.split_transactions.filter(st=>st.transaction_id&&!baseIds.has(st.transaction_id)).forEach(st=>rows.push({id:st.transaction_id,type:'split',amount:Number(st.total_amount||0),description:st.description||'Split transaction',transaction_date:st.transaction_date||localDate(st.created_at)||today(),account_id:st.account_id||null,created_at:st.created_at,updated_at:st.updated_at,__special:'split',__specialId:st.id}));
    state.loans.forEach(l=>rows.push({id:`loan-${l.id}`,type:'loan',amount:Number(l.amount||0),description:l.direction==='lend'?`Lent to ${personName(l.person_id)}`:`Borrowed from ${personName(l.person_id)}`,transaction_date:l.loan_date||localDate(l.created_at)||today(),account_id:l.account_id||null,created_at:l.created_at,updated_at:l.updated_at,notes:l.notes||'',direction:l.direction,person_id:l.person_id,__special:'loan',__specialId:l.id}));
    state.loan_repayments.forEach(r=>rows.push({id:`loan-repayment-${r.id}`,type:'loan_repayment',amount:Number(r.amount||0),description:r.direction==='received'?`Repayment received from ${personName(r.person_id)}`:`Repayment sent to ${personName(r.person_id)}`,transaction_date:r.repayment_date||localDate(r.created_at)||today(),account_id:r.account_id||null,created_at:r.created_at,updated_at:r.updated_at,notes:r.notes||'',direction:r.direction,person_id:r.person_id,__special:'loan_repayment',__specialId:r.id}));
    state.money_held.forEach(h=>rows.push({id:`held-${h.id}`,type:'money_held',amount:Number(h.amount||0),description:`Money held for ${personName(h.person_id)}`,transaction_date:h.received_date||localDate(h.created_at)||today(),account_id:h.account_id||null,created_at:h.created_at,updated_at:h.updated_at,notes:h.purpose||h.notes||'',status:h.status,person_id:h.person_id,__special:'held',__specialId:h.id}));
    return rows.sort((a,b)=>recordedMs(b)-recordedMs(a)||String(b.id).localeCompare(String(a.id)));
  }

  function balances(rows){
    const running=new Map(state.accounts.map(a=>[a.id,Number(a.opening_balance||0)])), result=new Map();
    rows.slice().sort((a,b)=>recordedMs(a)-recordedMs(b)||String(a.id).localeCompare(String(b.id))).forEach(t=>{
      accountEffects(t).forEach(([id,delta])=>{
        const next=(running.get(id)||0)+delta;running.set(id,next);
        if(!result.has(t.id))result.set(t.id,new Map());result.get(t.id).set(id,next);
      });
    });
    return result;
  }

  function balanceHTML(t){
    const m=window.__mbTxBalanceMap?.get(t.id)||new Map(), ids=[];
    if(t.account_id)ids.push(t.account_id);if(t.type==='transfer'&&t.to_account_id)ids.push(t.to_account_id);
    const parts=[...new Set(ids)].map(id=>m.has(id)?`${esc(accountName(id))}: ${money(m.get(id))}`:'').filter(Boolean);
    return parts.length?`<div class="sub tx-account-balance"><b>Balance</b>: ${parts.join(' · ')}</div>`:'';
  }

  function actions(t){
    if(!t.__special)return `<button class="smallbtn" onclick="editTx('${t.id}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteTx('${t.id}')">Delete</button>`;
    if(t.__special==='held')return `<button class="smallbtn" onclick="editMoneyHeld('${t.__specialId}')">Edit</button><button class="smallbtn" onclick="toggleMoneyHeld('${t.__specialId}')">${t.status==='settled'?'Undo':'Settle'}</button><button class="smallbtn dangerbtn" onclick="deleteMoneyHeld('${t.__specialId}')">Delete</button>`;
    if(t.__special==='loan')return `<button class="smallbtn" onclick="editLoan('${t.__specialId}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteLoan('${t.__specialId}')">Delete</button>`;
    if(t.__special==='loan_repayment')return `<button class="smallbtn" onclick="editLoanRepayment('${t.__specialId}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteLoanRepayment('${t.__specialId}')">Delete</button>`;
    return t.__special==='split'&&t.__specialId?`<button class="smallbtn" onclick="editSplitSpecial('${t.__specialId}')">Edit</button><button class="smallbtn dangerbtn" onclick="deleteSplitSpecial('${t.__specialId}')">Delete</button>`:'';
  }

  window.txHTML=function(t){
    const stamp=`<div class="sub timestamp-meta">Recorded: ${esc(fmtDateTime(t.created_at))}${t.updated_at?`<br>Updated: ${esc(fmtDateTime(t.updated_at))}`:''}</div>`;
    if(t.__special){
      const meta=t.__special==='held'?`${t.status==='settled'?'Settled':'Pending'} · Money Held`:t.__special==='loan'?(t.direction==='lend'?'Lend':'Borrow'):t.__special==='loan_repayment'?(t.direction==='received'?'Loan repayment received':'Loan repayment sent'):'Split';
      const icon=t.__special==='held'?'💰':t.__special==='loan'?'↔':t.__special==='loan_repayment'?'↩':'🔀', cls=t.__special==='held'?'amber':t.__special==='loan'?'transfer':t.__special==='loan_repayment'?'income':'split';
      return `<div class="row transaction-row"><div class="left"><div class="bubble ${cls}">${icon}</div><div class="tx-content"><div class="name">${esc(t.description)}</div><div class="sub">${t.account_id?esc(accountName(t.account_id)):''} · ${esc(meta)}</div>${stamp}${balanceHTML(t)}${t.notes?`<div class="sub">${esc(t.notes)}</div>`:''}</div></div><div class="tx-right" style="text-align:right"><b>${money(t.amount)}</b><div class="action-row">${actions(t)}</div></div></div>`;
    }
    const icon={income:'↑',expense:'−',transfer:'⇄',split:'🔀',reimbursement:'↩'}[t.type]||'•', sign=t.type==='income'||t.type==='reimbursement'?'+':t.type==='expense'||t.type==='split'?'−':'', other=t.type==='transfer'&&t.to_account_id?` → ${esc(accountName(t.to_account_id))}`:'', share=t.type==='split'?` · ${esc(getNickname())} share ${money(splitMyShare(t))}`:'', cats=txAllocations(t).map(a=>catName(a.category_id)).filter(Boolean);
    return `<div class="row transaction-row"><div class="left"><div class="bubble ${t.type==='income'||t.type==='reimbursement'?'income':t.type}">${icon}</div><div class="tx-content"><div class="name">${esc(t.description||'(No description)')}</div><div class="sub">${esc(accountAllocationSummary(t))}${other}${share}</div>${cats.length?`<div class="sub">Category: ${esc(cats.join(', '))}</div>`:''}${stamp}${balanceHTML(t)}${t.notes?`<div class="sub">${esc(t.notes)}</div>`:''}</div></div><div class="tx-right" style="text-align:right"><b class="${sign==='+'?'green':sign==='−'?'red':''}">${sign}${money(t.amount)}</b><div class="action-row">${actions(t)}</div></div></div>`;
  };

  renderTransactions=function(){
    const active=mbFilter.type||'All',kind=mbFilter.kind||'all';
    $('filters').innerHTML=['All','income','expense','transfer','split','reimbursement'].map(x=>`<button class="chip ${kind==='all'&&active===x?'active':''}" onclick="mbFilter.type='${x}';mbFilter.kind='all';renderTransactions()">${x==='All'?'All':x[0].toUpperCase()+x.slice(1)}</button>`).join('')+`<button class="chip ${kind==='held'?'active':''}" onclick="mbFilter.kind='held';renderTransactions()">Held for others</button><button class="chip ${kind==='lendborrow'?'active':''}" onclick="mbFilter.kind='lendborrow';renderTransactions()">Lend / Borrow</button><button class="chip filter-button" onclick="openTransactionFilters()">⚙ Filters</button><button class="chip" onclick="clearAllTransactionFilters()">Clear filters</button>`;
    let arr=buildRows();
    if(kind==='all'&&active!=='All')arr=arr.filter(t=>t.type===active);
    if(mbFilter.from)arr=arr.filter(t=>String(t.transaction_date)>=mbFilter.from);
    if(mbFilter.to)arr=arr.filter(t=>String(t.transaction_date)<=mbFilter.to);
    if(mbFilter.category)arr=arr.filter(t=>txAllocations(t).some(x=>{const c=state.categories.find(c=>c.id===x.category_id);return x.category_id===mbFilter.category||rootCategory(c)?.id===mbFilter.category}));
    if(mbFilter.subcategory)arr=arr.filter(t=>txAllocations(t).some(x=>x.category_id===mbFilter.subcategory));
    if(mbFilter.account)arr=arr.filter(t=>t.account_id===mbFilter.account||t.to_account_id===mbFilter.account||(state.transaction_accounts||[]).some(x=>x.transaction_id===t.id&&x.account_id===mbFilter.account));
    if(mbFilter.person)arr=arr.filter(t=>t.person_id===mbFilter.person||state.split_participants.some(x=>x.person_id===mbFilter.person&&state.split_transactions.some(st=>st.id===x.split_transaction_id&&st.transaction_id===t.id)));
    if(mbFilter.description)arr=arr.filter(t=>String(t.description||t.notes||'').toLowerCase().includes(mbFilter.description.toLowerCase()));
    if(kind==='held'){arr=arr.filter(t=>t.__special==='held');}
    if(kind==='lendborrow'){arr=arr.filter(t=>t.__special==='loan'||t.__special==='loan_repayment');}
    window.__mbTxBalanceMap=balances(arr.length?buildRows():[]);
    $('txList').innerHTML=arr.map(txHTML).join('')||'<div class="empty">No transactions found.</div>';
  };

  const style=document.createElement('style');style.textContent=`.tx-account-balance{font-size:12px!important;opacity:.86}.timestamp-meta{display:block!important;line-height:1.4!important;margin-top:4px}.timestamp-meta br{display:block}@media(max-width:560px){.tx-account-balance,.timestamp-meta{font-size:11px!important}}`;document.head.appendChild(style);
})();
