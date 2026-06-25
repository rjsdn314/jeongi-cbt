'use strict';
/* ===== 전기기사 CBT ===== */
const ICONS = {control:'🎛️', circuit:'🔌', machine:'⚙️', electromag:'🧲', power:'⚡'};
const LS = {
  get(k,d){ try{return JSON.parse(localStorage.getItem('cbt_'+k))??d}catch(e){return d} },
  set(k,v){ localStorage.setItem('cbt_'+k, JSON.stringify(v)) }
};
const app = document.getElementById('app');
const state = { index:[], pool:[], subject:null };

/* ---------- data ---------- */
async function loadIndex(){
  const r = await fetch('data/index.json'); state.index = await r.json();
}
async function loadSubject(slug){
  const r = await fetch('data/'+slug+'.json'); return await r.json();
}

/* ---------- helpers ---------- */
const CIR = ['','①','②','③','④','⑤'];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function fmt(t){ const m=Math.floor(t/60), s=t%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
function toast(msg){
  let t=document.querySelector('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),1600);
}
function bookmarks(){ return LS.get('marks',{}); }
function isMarked(id){ return !!bookmarks()[id]; }
function toggleMark(id){ const m=bookmarks(); if(m[id])delete m[id]; else m[id]=1; LS.set('marks',m); return !!m[id]; }
function addWrong(q){ const w=LS.get('wrong',{}); w[q.id]={slug:(q.id||'').split('_')[0],img:q.img,ans:q.ans,src:q.src,diff:q.diff,id:q.id,exp:q.exp,subj:q.subj}; LS.set('wrong',w); }
function clearWrong(id){ const w=LS.get('wrong',{}); delete w[id]; LS.set('wrong',w); }

/* ===================== HOME ===================== */
function home(){
  const last = LS.get('lastScore',null);
  const wrongN = Object.keys(LS.get('wrong',{})).length;
  const markN = Object.keys(bookmarks()).length;
  app.innerHTML = `
    <div class="brand">
      <div class="logo">EE</div>
      <div><h1>전기기사 CBT</h1><p>기출문제 실전 모의고사 · 5과목</p></div>
    </div>
    <div class="grid subjects">
      ${state.index.map(s=>`
        <button class="subj" data-slug="${s.slug}">
          <div class="ico">${ICONS[s.slug]||'📘'}</div>
          <h3>${s.name}</h3>
          <div class="cnt">${s.count.toLocaleString()}문제</div>
          <div class="bar"></div>
        </button>`).join('')}
    </div>
    <div class="section-title">실전 모의고사</div>
    <div class="grid">
      <button class="tile mock" id="t-mock"><div class="ico">📝</div>
        <div class="t"><b>전과목 모의고사</b><span>5과목 랜덤 출제 · 실전 타이머</span></div><div class="arrow">›</div></button>
    </div>
    <div class="section-title">학습 도구</div>
    <div class="grid">
      <button class="tile" id="t-wrong"><div class="ico">📕</div>
        <div class="t"><b>오답노트</b><span>${wrongN?wrongN+'문제 복습 대기':'틀린 문제가 모입니다'}</span></div><div class="arrow">›</div></button>
      <button class="tile" id="t-mark"><div class="ico">⭐</div>
        <div class="t"><b>북마크</b><span>${markN?markN+'문제 저장됨':'별표한 문제 모음'}</span></div><div class="arrow">›</div></button>
    </div>
    ${last?`<div class="section-title">최근 결과</div>
      <div class="tile" style="cursor:default"><div class="ico">🏁</div>
      <div class="t"><b>${last.name} · ${last.score}점</b><span>${last.correct}/${last.total} 정답 · ${last.date}</span></div></div>`:''}
    <div class="footer">동일출판사 전기기사 시리즈 기출문제 기반 · 학습용<br/>문제 이미지는 원본 교재에서 추출되었습니다.</div>
  `;
  app.querySelectorAll('.subj').forEach(b=> b.onclick=()=> setup(b.dataset.slug));
  app.querySelector('#t-mock').onclick  = mockSetup;
  app.querySelector('#t-wrong').onclick = ()=> startReviewPool('wrong');
  app.querySelector('#t-mark').onclick  = ()=> startReviewPool('mark');
}

/* ===================== 전과목 모의고사 ===================== */
const MOCK = { count:100, mode:'exam' };
function mockSetup(){
  const subN = state.index.length || 5;
  app.innerHTML = `
    <button class="back" id="bk">‹ 홈</button>
    <div class="panel">
      <h2>📝 전과목 모의고사</h2>
      <div class="muted" style="font-size:13px">제어공학·회로이론·전기기기·전기자기·전력공학에서 랜덤 출제 (과목 균등 배분)</div>
      <div class="opt-row"><div class="label">문항 수</div><div class="chips" id="c-mcount">
        ${[50,100,200].map(n=>`<button class="chip" data-v="${n}">${n}문제<span class="sub"> · 과목당 ${Math.round(n/subN)}</span></button>`).join('')}
      </div></div>
      <div class="opt-row"><div class="label">모드</div><div class="chips" id="c-mmode">
        <button class="chip" data-v="exam">실전 (시험 후 채점)</button>
        <button class="chip" data-v="study">학습 (즉시 채점)</button>
      </div></div>
      <button class="start-btn" id="mgo">모의고사 시작</button>
    </div>`;
  app.querySelector('#bk').onclick=home;
  function bind(id,key,cast){
    const wrap=app.querySelector(id);
    wrap.querySelectorAll('.chip').forEach(c=>{
      const v=cast?cast(c.dataset.v):c.dataset.v;
      if(v===MOCK[key]) c.classList.add('on');
      c.onclick=()=>{ wrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('on')); c.classList.add('on'); MOCK[key]=v; };
    });
  }
  bind('#c-mcount','count',v=>+v); bind('#c-mmode','mode');
  app.querySelector('#mgo').onclick=startMock;
}
async function startMock(){
  const go=app.querySelector('#mgo'); if(go) go.textContent='문제 구성 중…';
  const per=Math.round(MOCK.count/(state.index.length||5));
  let pool=[];
  for(const s of state.index){
    const arr=await loadSubject(s.slug);
    const picked=shuffle(arr).slice(0, Math.min(per, arr.length));
    picked.forEach(q=>q.subj=s.name);
    pool=pool.concat(picked);
  }
  pool=shuffle(pool);
  state.subject={slug:'mock', name:'전과목 모의고사'};
  startQuiz(pool, {mode:MOCK.mode, title:'전과목 모의고사'});
}

/* ===================== SETUP ===================== */
const SETUP = { count:20, order:'random', mode:'study' };
function setup(slug){
  state.subject = state.index.find(s=>s.slug===slug);
  const s=state.subject;
  app.innerHTML = `
    <button class="back" id="bk">‹ 과목 선택</button>
    <div class="panel">
      <h2>${ICONS[slug]} ${s.name}</h2>
      <div class="muted" style="font-size:13px">총 ${s.count.toLocaleString()}문제 보유</div>
      <div class="opt-row"><div class="label">문제 수</div><div class="chips" id="c-count">
        ${[10,20,50,100].map(n=>`<button class="chip" data-v="${n}">${n}</button>`).join('')}
        <button class="chip" data-v="all">전체</button></div></div>
      <div class="opt-row"><div class="label">출제 순서</div><div class="chips" id="c-order">
        <button class="chip" data-v="random">랜덤</button>
        <button class="chip" data-v="seq">순서대로</button></div></div>
      <div class="opt-row"><div class="label">모드</div><div class="chips" id="c-mode">
        <button class="chip" data-v="study">학습 (즉시 채점)</button>
        <button class="chip" data-v="exam">실전 (시험 후 채점)</button></div></div>
      <button class="start-btn" id="go">시작하기</button>
    </div>`;
  app.querySelector('#bk').onclick=home;
  function parse(key,v){ if(key==='count') return v==='all'?'all':+v; return v; }
  function bind(id,key){
    const wrap=app.querySelector(id);
    wrap.querySelectorAll('.chip').forEach(c=>{
      if(parse(key,c.dataset.v)===SETUP[key]) c.classList.add('on');
      c.onclick=()=>{ wrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('on')); c.classList.add('on'); SETUP[key]=parse(key,c.dataset.v); };
    });
  }
  bind('#c-count','count'); bind('#c-order','order'); bind('#c-mode','mode');
  app.querySelector('#go').onclick=async ()=>{
    app.querySelector('#go').textContent='불러오는 중…';
    let all = await loadSubject(slug);
    if(SETUP.order==='random') all=shuffle(all);
    const n = SETUP.count==='all'? all.length : Math.min(SETUP.count, all.length);
    startQuiz(all.slice(0,n), {mode:SETUP.mode, title:s.name});
  };
}

/* ===================== REVIEW POOL (오답/북마크) ===================== */
async function startReviewPool(kind){
  let items;
  if(kind==='wrong'){ items=Object.values(LS.get('wrong',{})); }
  else { const m=bookmarks(); const ids=Object.keys(m);
    // need full records -> load each subject once
    const bySlug={}; for(const s of state.index) bySlug[s.slug]=null;
    items=[]; const cache={};
    for(const id of ids){ const slug=id.split('_')[0];
      if(!cache[slug]) cache[slug]=await loadSubject(slug);
      const q=cache[slug].find(x=>x.id===id); if(q) items.push(q);
    }
  }
  if(!items.length){ toast(kind==='wrong'?'오답이 없습니다':'북마크가 없습니다'); return; }
  state.subject = {slug:'review', name: kind==='wrong'?'오답노트':'북마크'};
  startQuiz(shuffle(items), {mode:'study', title: state.subject.name, review:true});
}

/* ===================== QUIZ ===================== */
let Q = null;
function startQuiz(items, opts){
  Q = { items, i:0, answers:new Array(items.length).fill(0), mode:opts.mode,
        title:opts.title, review:!!opts.review, revealed:new Array(items.length).fill(false),
        start:Date.now(), timer:null, elapsed:0 };
  if(Q.mode==='exam'){
    Q.timer=setInterval(()=>{ Q.elapsed=Math.floor((Date.now()-Q.start)/1000); updTimer(); },1000);
  }
  renderQuiz();
}
function exitQuiz(){
  if(Q&&Q.timer) clearInterval(Q.timer);
  Q=null; home();
}
function updTimer(){ const el=document.getElementById('timer'); if(el) el.textContent=fmt(Q.elapsed); }

function renderQuiz(){
  const q=Q.items[Q.i]; const total=Q.items.length;
  const answered = Q.answers.filter(Boolean).length;
  const reveal = Q.mode==='study' && Q.revealed[Q.i];
  const sel = Q.answers[Q.i];
  app.innerHTML = `
    <div class="qbar">
      <button class="x" id="q-exit">✕ 종료</button>
      <div class="prog">${Q.title} · ${Q.i+1}/${total}</div>
      ${Q.mode==='exam'?`<div class="timer" id="timer">${fmt(Q.elapsed)}</div>`:`<div class="timer">맞춤 ${answered}</div>`}
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${(Q.i+1)/total*100}%"></div></div>
    <div class="qcard">
      <div class="qmeta">
        <span class="qnum">Q${Q.i+1}</span>
        ${q.subj?`<span class="tag subj">${q.subj}</span>`:''}
        ${q.src?`<span class="tag">${q.src}</span>`:''}
        ${q.diff?`<span class="tag">${'★'.repeat(Math.min(q.diff,3))}</span>`:''}
        <button class="star ${isMarked(q.id)?'on':''}" id="q-star">${isMarked(q.id)?'★':'☆'}</button>
      </div>
      <div class="qimg-wrap"><img class="qimg" id="q-img" src="${q.img}" alt="문제 ${Q.i+1}" /></div>
      <div class="zoom-hint">이미지를 누르면 크게 볼 수 있어요</div>
    </div>
    <div class="choices" id="q-choices">
      ${[1,2,3,4].map(n=>`<button class="choice" data-n="${n}"><span class="badge">${CIR[n]}</span><span>${n}번</span></button>`).join('')}
    </div>
    <div class="verdict" id="q-verdict"></div>
    <div id="q-exp"></div>
    <div class="navbtns">
      <button id="q-prev" ${Q.i===0?'disabled':''}>‹ 이전</button>
      ${Q.i===total-1
        ? `<button class="primary" id="q-submit">제출하기</button>`
        : `<button class="primary" id="q-next">다음 ›</button>`}
    </div>
    ${Q.mode==='exam'?`<div class="section-title">답안지</div><div class="omr" id="q-omr">
      ${Q.items.map((_,k)=>`<button data-k="${k}" class="${Q.answers[k]?'done':''} ${k===Q.i?'cur':''} ${isMarked(Q.items[k].id)?'mark':''}">${k+1}</button>`).join('')}
     </div>`:''}
  `;
  // choice states
  const choices=app.querySelectorAll('.choice');
  choices.forEach(c=>{
    const n=+c.dataset.n;
    if(sel===n) c.classList.add('sel');
    if(reveal){
      if(n===q.ans) c.classList.add('correct');
      else if(n===sel) c.classList.add('wrong');
    }
    c.onclick=()=> pick(n);
  });
  if(reveal){ showVerdict(q, sel); renderExp(q); }
  // events
  app.querySelector('#q-exit').onclick=()=>{ if(confirm('풀이를 종료할까요? 진행상황은 저장되지 않습니다.')) exitQuiz(); };
  app.querySelector('#q-star').onclick=(e)=>{ const on=toggleMark(q.id); e.target.classList.toggle('on',on); e.target.textContent=on?'★':'☆'; };
  app.querySelector('#q-img').onclick=()=> openZoom(q.img);
  const prev=app.querySelector('#q-prev'); if(prev) prev.onclick=()=>{ Q.i--; renderQuiz(); };
  const next=app.querySelector('#q-next'); if(next) next.onclick=()=>{ Q.i++; renderQuiz(); };
  const sub=app.querySelector('#q-submit'); if(sub) sub.onclick=submit;
  const omr=app.querySelector('#q-omr'); if(omr) omr.querySelectorAll('button').forEach(b=> b.onclick=()=>{ Q.i=+b.dataset.k; renderQuiz(); });
  window.scrollTo(0,0);
}
function pick(n){
  const q=Q.items[Q.i];
  Q.answers[Q.i]=n;
  if(Q.mode==='study'){
    Q.revealed[Q.i]=true;
    if(n!==q.ans) addWrong(q); else if(Q.review) clearWrong(q.id);
    renderQuiz();
  } else {
    // exam: just mark selection
    app.querySelectorAll('.choice').forEach(c=> c.classList.toggle('sel', +c.dataset.n===n));
    const omr=app.querySelector('#q-omr'); if(omr){ const b=omr.querySelector(`[data-k="${Q.i}"]`); if(b) b.classList.add('done'); }
  }
}
function showVerdict(q, sel){
  const v=app.querySelector('#q-verdict');
  const ok = sel===q.ans;
  v.className='verdict show '+(ok?'ok':'no');
  v.textContent = ok ? `정답입니다! (${CIR[q.ans]})` : `오답입니다. 정답은 ${CIR[q.ans]} ${q.ans}번 입니다.`;
}
function renderExp(q){
  const c=app.querySelector('#q-exp'); if(!c) return;
  if(!q.exp){ c.innerHTML=''; return; }
  c.innerHTML=`<button class="exp-toggle" id="q-exptog">📖 해설 보기</button>
    <div class="qimg-wrap exp-img" id="q-expimg" hidden><img class="qimg" alt="해설"/></div>`;
  const tog=c.querySelector('#q-exptog'), box=c.querySelector('#q-expimg'), img=box.querySelector('img');
  tog.onclick=()=>{
    if(box.hasAttribute('hidden')){ if(!img.src) img.src=q.exp; box.removeAttribute('hidden'); tog.textContent='📖 해설 닫기'; }
    else { box.setAttribute('hidden',''); tog.textContent='📖 해설 보기'; }
  };
  img.onclick=()=> openZoom(q.exp);
}
function openZoom(src){
  const o=document.getElementById('zoom'); const im=document.getElementById('zoomImg');
  im.src=src; o.hidden=false; o.onclick=()=> o.hidden=true;
}

/* ===================== SUBMIT / RESULT ===================== */
function submit(){
  const unanswered = Q.answers.filter(a=>!a).length;
  if(unanswered>0 && !confirm(`아직 ${unanswered}문제를 안 풀었어요. 그래도 제출할까요?`)) return;
  if(Q.timer) clearInterval(Q.timer);
  let correct=0;
  Q.items.forEach((q,k)=>{ const ok=Q.answers[k]===q.ans; if(ok)correct++; else addWrong(q); });
  const total=Q.items.length;
  const score=Math.round(correct/total*100);
  if(state.subject.slug!=='review'){
    const d=new Date();
    LS.set('lastScore',{name:Q.title,score,correct,total,date:`${d.getMonth()+1}/${d.getDate()}`});
  }
  result(correct,total,score);
}
function result(correct,total,score){
  const wrongs = Q.items.map((q,k)=>({q,my:Q.answers[k]})).filter(x=>x.my!==x.q.ans);
  const pass = score>=60;
  app.innerHTML = `
    <div class="score-hero">
      <div class="score-ring"><span class="pct">${score}</span>점</div>
      <div class="score-sub">${pass?'🎉 합격 기준(60점) 통과!':'조금 더 분발해요! (합격 60점)'} · ${Q.mode==='exam'?'소요 '+fmt(Q.elapsed):'학습모드'}</div>
    </div>
    <div class="stat-row">
      <div class="stat g"><b>${correct}</b><span>정답</span></div>
      <div class="stat r"><b>${total-correct}</b><span>오답</span></div>
      <div class="stat"><b>${total}</b><span>전체</span></div>
    </div>
    <div class="navbtns" style="margin-bottom:18px">
      <button id="r-home">홈으로</button>
      ${wrongs.length?`<button class="primary" id="r-retry">오답 다시풀기</button>`:`<button class="primary" id="r-again">다시풀기</button>`}
    </div>
    ${wrongs.length?`<div class="section-title">틀린 문제 ${wrongs.length}개</div>`:`<div class="empty">전부 맞혔어요! 완벽합니다 🏆</div>`}
    <div id="r-list">${wrongs.map((x,idx)=>`
      <div class="review-item">
        <div class="rhead"><b>오답 ${idx+1}</b>
          <span class="pill mine">내 답 ${x.my?CIR[x.my]:'미응답'}</span>
          <span class="pill ans">정답 ${CIR[x.q.ans]}</span></div>
        <div class="qimg-wrap"><img class="qimg" src="${x.q.img}" loading="lazy" onclick="document.getElementById('zoom').hidden=false;document.getElementById('zoomImg').src=this.src;document.getElementById('zoom').onclick=()=>document.getElementById('zoom').hidden=true;"/></div>
        ${x.q.exp?`<button class="exp-toggle" data-exp="${x.q.exp}">📖 해설 보기</button>`:''}
      </div>`).join('')}</div>
  `;
  app.querySelectorAll('#r-list .exp-toggle').forEach(btn=>{
    btn.onclick=()=>{
      let box=btn.nextElementSibling;
      if(box && box.classList.contains('exp-img')){
        const hid=box.hasAttribute('hidden'); box.toggleAttribute('hidden'); btn.textContent=hid?'📖 해설 닫기':'📖 해설 보기'; return;
      }
      box=document.createElement('div'); box.className='qimg-wrap exp-img';
      box.innerHTML=`<img class="qimg" src="${btn.dataset.exp}"/>`;
      box.querySelector('img').onclick=()=>openZoom(btn.dataset.exp);
      btn.after(box); btn.textContent='📖 해설 닫기';
    };
  });
  app.querySelector('#r-home').onclick=()=>{ Q=null; home(); };
  const rt=app.querySelector('#r-retry'); if(rt) rt.onclick=()=> startQuiz(shuffle(wrongs.map(x=>x.q)),{mode:'study',title:Q.title+' 오답',review:false});
  const ag=app.querySelector('#r-again'); if(ag) ag.onclick=()=> startQuiz(shuffle(Q.items),{mode:Q.mode,title:Q.title});
  window.scrollTo(0,0);
}

/* ===================== BOOT ===================== */
(async function(){
  try{ await loadIndex(); home(); }
  catch(e){ app.innerHTML=`<div class="empty">데이터를 불러오지 못했습니다.<br/>${e}</div>`; }
})();
