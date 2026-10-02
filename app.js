const DATA = window.GAME_DATA || {};
const systems = Object.keys(DATA).sort((a,b)=>a.localeCompare(b));
const selected = new Map();
let currentSystem = null;
let page = 1;
const PAGE_SIZE = 120;

// Customer-drive configuration. These are the supported front-end/back-end bounds.
const STORAGE_TIERS = [
  {gb:256, label:'256GB SSD'}, {gb:512, label:'512GB SSD'},
  {gb:1024, label:'1TB Drive'}, {gb:2048, label:'2TB Drive'}, {gb:4096, label:'4TB Drive'}
];
const MIN_STORAGE_GB = 256;
const MAX_STORAGE_GB = 4096;
let activePackage = null;

const POPULAR_SYSTEMS = [
  ['Nintendo Entertainment System','🟥'],['Super Nintendo Entertainment System','🟪'],
  ['Sega Genesis','⬛'],['Nintendo 64','🟨'],['Sony PlayStation','⬜'],
  ['Nintendo Game Boy','🟩'],['Nintendo Game Boy Color','🟦'],['Nintendo Game Boy Advance','🟪'],
  ['Sega Dreamcast','🌀'],['SNK Neo Geo MVS','🕹️'],['Arcade','👾'],['Sony PlayStation 2','💿']
].filter(([s])=>DATA[s]);

const $ = id => document.getElementById(id);
const el = {
  systemList:$('systemList'), systemSearch:$('systemSearch'), systemCount:$('systemCount'),
  systemTitle:$('systemTitle'), systemSubtitle:$('systemSubtitle'), visibleCount:$('visibleCount'),
  gameSearch:$('gameSearch'), categoryFilter:$('categoryFilter'), yearFilter:$('yearFilter'), featuredFilter:$('featuredFilter'),
  hideClones:$('hideClones'), selectVisibleBtn:$('selectVisibleBtn'), gameGrid:$('gameGrid'),
  emptyState:$('emptyState'), pager:$('pager'), prevPage:$('prevPage'), nextPage:$('nextPage'), pageInfo:$('pageInfo'),
  orderBtn:$('orderBtn'), orderCount:$('orderCount'), drawer:$('orderDrawer'), backdrop:$('drawerBackdrop'),
  closeDrawer:$('closeDrawer'), selectedList:$('selectedList'), selectedGameCount:$('selectedGameCount'), selectedSystemCount:$('selectedSystemCount'),
  copyOrder:$('copyOrder'), downloadTxt:$('downloadTxt'), downloadCsv:$('downloadCsv'), clearOrder:$('clearOrder'),
  customerName:$('customerName'), customerContact:$('customerContact'), toast:$('toast'),
  driveSize:$('driveSize'), packageGrid:$('packageGrid'), packageNote:$('packageNote'), popularSystems:$('popularSystems'), showAllSystems:$('showAllSystems'),
  selectedPackage:$('selectedPackage'), selectedDrive:$('selectedDrive'), storageNotice:$('storageNotice')
};

function gameId(system,g){ return `${system}|||${g.n}|||${g.t}`; }

// Curated recognition list for helping customers find well-known retro titles quickly.
// This is intentionally title-based so it works across the many systems in the catalog.
const MUST_PLAY_PATTERNS = [
  /\bsuper mario bros\b/i,/\bsuper mario world\b/i,/\bsuper mario 64\b/i,/\bmario kart\b/i,
  /\blegend of zelda\b/i,/\bzelda ii\b/i,/\bocarina of time\b/i,/\bmajora'?s mask\b/i,
  /\bsonic the hedgehog\b/i,/\bstreets of rage 2\b/i,/\bgunstar heroes\b/i,
  /\bcontra\b/i,/\bsuper c\b/i,/\bcastlevania\b/i,/\bsymphony of the night\b/i,
  /\bmega man 2\b/i,/\bmega man x\b/i,/\bsuper metroid\b/i,/\bmetroid\b/i,
  /\bchrono trigger\b/i,/\bfinal fantasy vi\b/i,/\bfinal fantasy vii\b/i,/\bearthbound\b/i,
  /\bstreet fighter ii\b/i,/\bmortal kombat ii\b/i,/\btekken 3\b/i,/\bking of fighters '98\b/i,
  /\bmetal slug\b/i,/\bmetal slug 2\b/i,/\bmetal slug x\b/i,/\bneo turf masters\b/i,
  /\bgalaga\b/i,/\bpac-?man\b/i,/\bdonkey kong\b/i,/\bfrogger\b/i,/\bcentipede\b/i,
  /\bnba jam\b/i,/\bnfl blitz\b/i,/\btecmo super bowl\b/i,
  /\bgoldeneye 007\b/i,/\bperfect dark\b/i,/\bbanjo-kazooie\b/i,/\bstar fox 64\b/i,
  /\bcrash bandicoot\b/i,/\bspyro the dragon\b/i,/\btony hawk'?s pro skater 2\b/i,
  /\bresident evil 2\b/i,/\bgran turismo 2\b/i,/\bmetal gear solid\b/i,
  /\bpokemon red\b/i,/\bpokemon blue\b/i,/\bpokemon yellow\b/i,/\bpokemon gold\b/i,/\bpokemon silver\b/i
];
const POPULAR_PATTERNS = [
  ...MUST_PLAY_PATTERNS,
  /\bmario\b/i,/\bzelda\b/i,/\bsonic\b/i,/\bpokemon\b/i,/\bdonkey kong\b/i,/\bkirby\b/i,
  /\bmega man\b/i,/\bmetroid\b/i,/\bcastlevania\b/i,/\bcontra\b/i,/\bninja gaiden\b/i,
  /\bstreet fighter\b/i,/\bmortal kombat\b/i,/\btekken\b/i,/\bfatal fury\b/i,/\bking of fighters\b/i,
  /\bmetal slug\b/i,/\bsamurai shodown\b/i,/\bdouble dragon\b/i,/\bfinal fight\b/i,
  /\bfinal fantasy\b/i,/\bdragon quest\b/i,/\bchrono\b/i,/\bsecret of mana\b/i,
  /\bpac-?man\b/i,/\bgalaga\b/i,/\bspace invaders\b/i,/\basteroids\b/i,/\bfrogger\b/i,/\bq\*?bert\b/i,
  /\bnba jam\b/i,/\bnfl blitz\b/i,/\btecmo bowl\b/i,/\btony hawk\b/i,
  /\bgoldeneye\b/i,/\bperfect dark\b/i,/\bbanjo\b/i,/\bcrash bandicoot\b/i,/\bspyro\b/i,
  /\bresident evil\b/i,/\bmetal gear\b/i,/\bgran turismo\b/i,/\btomb raider\b/i,/\brayman\b/i,
  /\bearthworm jim\b/i,/\btoe.?jam.*earl\b/i,/\bstreets of rage\b/i,/\bshining force\b/i,
  /\bphantasy star\b/i,/\bteenage mutant ninja turtles\b/i,/\bTMNT\b/i
];
function titleMatches(g, patterns){ const t=(g.t||'').replace(/\s+/g,' ').trim(); return patterns.some(r=>r.test(t)); }
function isMustPlay(g){ return titleMatches(g,MUST_PLAY_PATTERNS); }
function isPopular(g){ return titleMatches(g,POPULAR_PATTERNS); }
function isMultiplayer(g){
  const p=String(g.p||'').toLowerCase();
  if(/(^|\D)(2|3|4|5|6|7|8)(\D|$)/.test(p) || p.includes('-')) return true;
  const c=String(g.c||'').toLowerCase();
  return /fighter|fight|sports|racing|race|party|beat.?em up/.test(c) && p !== '1';
}
function featuredBadges(g){
  const badges=[];
  if(isMustPlay(g)) badges.push('<span class="featured-badge must">🔥 Must Play</span>');
  else if(isPopular(g)) badges.push('<span class="featured-badge popular">⭐ Popular</span>');
  if(isMultiplayer(g)) badges.push('<span class="featured-badge multi">👥 Multiplayer</span>');
  return badges.join('');
}

function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function toast(msg){el.toast.textContent=msg;el.toast.classList.remove('hidden');setTimeout(()=>el.toast.classList.add('hidden'),1800)}

function renderPopularSystems(){
  el.popularSystems.innerHTML=POPULAR_SYSTEMS.map(([s,icon])=>`<button class="popular-system-card" data-system="${escapeHtml(s)}"><span class="sys-icon">${icon}</span><strong>${escapeHtml(s)}</strong><small>${DATA[s].length.toLocaleString()} titles</small></button>`).join('');
  el.popularSystems.querySelectorAll('[data-system]').forEach(b=>b.onclick=()=>{selectSystem(b.dataset.system);document.querySelector('.shell').scrollIntoView({behavior:'smooth'});});
}
function canonicalTitle(t=''){
  return String(t).toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,' ').replace(/\b(usa|europe|japan|world|rev(?:ision)?|version|prototype|beta|demo|hack|bootleg)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
}
function packageScore(system,g){
  let score=0;
  if(isMustPlay(g)) score+=1000; else if(isPopular(g)) score+=500;
  if(isMultiplayer(g)) score+=55;
  if(!g.cl) score+=45;
  if(/usa|world/i.test(g.r||g.t||'')) score+=25;
  if(/arcade|nintendo entertainment system|super nintendo entertainment system|sega genesis|nintendo 64|sony playstation|game boy|dreamcast|neo geo/i.test(system)) score+=30;
  if(/hack|bootleg|prototype|beta|demo|sample|bios|test/i.test(g.t||'')) score-=250;
  const y=parseInt(g.y,10); if(y>=1980&&y<=2005) score+=10;
  return score;
}
function buildPackage(count){
  const preferred=new Set(POPULAR_SYSTEMS.map(([s])=>s));
  const candidates=[];
  for(const system of systems){
    if(!preferred.has(system)) continue;
    for(const g of DATA[system]){
      if(g.cl || /hack|bootleg|prototype|beta|demo|sample|bios|test/i.test(g.t||'')) continue;
      candidates.push({system,g,score:packageScore(system,g)});
    }
  }
  candidates.sort((a,b)=>b.score-a.score || String(a.g.t).localeCompare(String(b.g.t)));
  const picked=[], seen=new Set();
  // First pass favors distinct recognizable titles instead of region/version duplicates.
  for(const x of candidates){
    const key=canonicalTitle(x.g.t);
    if(!key || seen.has(key)) continue;
    seen.add(key); picked.push(x); if(picked.length>=count) break;
  }
  // If needed, fill from clean non-clone entries in the popular systems.
  if(picked.length<count){
    const ids=new Set(picked.map(x=>gameId(x.system,x.g)));
    for(const x of candidates){if(ids.has(gameId(x.system,x.g))) continue;picked.push(x);if(picked.length>=count)break;}
  }
  selected.clear();
  picked.slice(0,count).forEach(({system,g})=>selected.set(gameId(system,g),{system,...g}));
  activePackage=count;
  document.querySelectorAll('.package-card').forEach(b=>b.classList.toggle('active',Number(b.dataset.package)===count));
  saveSelection(); saveConfig(); updateOrderUI(); if(currentSystem)renderGames();
  toast(`Top ${count.toLocaleString()} package loaded — customize anything you want`);
}
function driveLabel(){const gb=Number(el.driveSize.value);return (STORAGE_TIERS.find(x=>x.gb===gb)||STORAGE_TIERS[0]).label;}
function saveConfig(){try{localStorage.setItem('retroGameConfig',JSON.stringify({activePackage,driveGB:Number(el.driveSize.value)}));}catch(e){}}
function loadConfig(){try{const c=JSON.parse(localStorage.getItem('retroGameConfig')||'{}');if(c.driveGB>=MIN_STORAGE_GB&&c.driveGB<=MAX_STORAGE_GB)el.driveSize.value=String(c.driveGB);if(c.activePackage){activePackage=Number(c.activePackage);document.querySelectorAll('.package-card').forEach(b=>b.classList.toggle('active',Number(b.dataset.package)===activePackage));}}catch(e){}}

function renderSystems(){
  const q=el.systemSearch.value.trim().toLowerCase();
  const list=systems.filter(s=>s.toLowerCase().includes(q));
  el.systemCount.textContent=`${list.length} shown`;
  el.systemList.innerHTML=list.map(s=>`<button class="system-row ${s===currentSystem?'active':''}" data-system="${escapeHtml(s)}"><span>${escapeHtml(s)}</span><span class="count">${DATA[s].length.toLocaleString()}</span></button>`).join('');
  el.systemList.querySelectorAll('.system-row').forEach(b=>b.addEventListener('click',()=>selectSystem(b.dataset.system)));
}

function selectSystem(system){
  currentSystem=system;page=1;el.gameSearch.value='';
  el.systemTitle.textContent=system;el.systemSubtitle.textContent=`${DATA[system].length.toLocaleString()} titles available in this system/collection.`;
  [el.gameSearch,el.categoryFilter,el.yearFilter,el.featuredFilter,el.selectVisibleBtn].forEach(x=>x.disabled=false);
  buildFilters();renderSystems();renderGames();
}

function buildFilters(){
  const games=DATA[currentSystem]||[];
  const cats=[...new Set(games.map(g=>g.c).filter(Boolean))].sort();
  const years=[...new Set(games.map(g=>g.y).filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>b-a);
  el.categoryFilter.innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  el.yearFilter.innerHTML='<option value="">All years</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
}

function getFiltered(){
  if(!currentSystem)return[];
  const q=el.gameSearch.value.trim().toLowerCase(), cat=el.categoryFilter.value, yr=el.yearFilter.value, featured=el.featuredFilter.value, hide=el.hideClones.checked;
  return DATA[currentSystem].filter(g=>{
    if(hide && g.cl) return false;
    if(cat && g.c!==cat)return false;if(yr && g.y!==yr)return false;
    if(featured==='popular' && !isPopular(g)) return false;
    if(featured==='must' && !isMustPlay(g)) return false;
    if(featured==='multi' && !isMultiplayer(g)) return false;
    if(q && ![g.t,g.n,g.m,g.c,g.y,g.r].join(' ').toLowerCase().includes(q))return false;
    return true;
  });
}

function renderGames(){
  if(!currentSystem)return;
  const filtered=getFiltered();
  el.visibleCount.textContent=filtered.length.toLocaleString();
  el.emptyState.classList.toggle('hidden',true);el.gameGrid.classList.remove('hidden');
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); if(page>pages)page=pages;
  const slice=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  el.gameGrid.innerHTML=slice.map(g=>{
    const id=gameId(currentSystem,g), on=selected.has(id);
    const tags=[g.y,g.m,g.p?`${g.p} player${g.p==='1'?'':'s'}`:'',g.r].filter(Boolean).slice(0,3);
    return `<article class="game-card ${on?'selected':''}" data-id="${escapeHtml(id)}">
      <div class="tick">✓</div><div class="game-title">${escapeHtml(g.t)}</div>
      <div class="meta">${featuredBadges(g)}${tags.map(x=>`<span class="pill">${escapeHtml(x)}</span>`).join('')}</div>
      ${g.n?`<div class="game-rom">ROM: ${escapeHtml(g.n)}</div>`:''}
    </article>`;
  }).join('') || '<div class="empty-state" style="grid-column:1/-1"><h3>No matches</h3><p>Try changing your search or filters.</p></div>';
  el.gameGrid.querySelectorAll('.game-card[data-id]').forEach(card=>card.addEventListener('click',()=>toggleGame(card.dataset.id)));
  el.pager.classList.toggle('hidden',filtered.length<=PAGE_SIZE);el.pageInfo.textContent=`Page ${page} of ${pages}`;el.prevPage.disabled=page<=1;el.nextPage.disabled=page>=pages;
}

function toggleGame(id){
  activePackage=null; document.querySelectorAll('.package-card').forEach(b=>b.classList.remove('active')); saveConfig();
  if(selected.has(id))selected.delete(id); else {
    const [,rom,title]=id.split('|||');
    const game=(DATA[currentSystem]||[]).find(g=>g.n===rom&&g.t===title);
    if(game)selected.set(id,{system:currentSystem,...game});
  }
  saveSelection();updateOrderUI();renderGames();
}
function saveSelection(){try{localStorage.setItem('retroGameSelection',JSON.stringify([...selected.entries()]));}catch(e){}}
function loadSelection(){try{const v=JSON.parse(localStorage.getItem('retroGameSelection')||'[]');v.forEach(([k,g])=>selected.set(k,g));}catch(e){}}

function updateOrderUI(){
  el.orderCount.textContent=selected.size;el.selectedGameCount.textContent=selected.size;
  el.selectedPackage.textContent=activePackage?`Top ${activePackage}`:'Custom'; el.selectedDrive.textContent=driveLabel();
  const bySystem={};for(const g of selected.values())(bySystem[g.system]??=[]).push(g);
  el.selectedSystemCount.textContent=Object.keys(bySystem).length;
  el.selectedList.innerHTML=selected.size?Object.keys(bySystem).sort().map(s=>`<div class="selection-group"><h4>${escapeHtml(s)} <span class="muted">(${bySystem[s].length})</span></h4>${bySystem[s].sort((a,b)=>a.t.localeCompare(b.t)).map(g=>`<div class="selected-item"><span>${escapeHtml(g.t)}</span><button class="remove-item" data-id="${escapeHtml(gameId(s,g))}">×</button></div>`).join('')}</div>`).join(''):'<div class="empty-state"><h3>No games selected</h3><p>Your selections will appear here.</p></div>';
  el.selectedList.querySelectorAll('.remove-item').forEach(b=>b.onclick=()=>{selected.delete(b.dataset.id);saveSelection();updateOrderUI();renderGames();});
}

function orderText(){
  const lines=['RETRO GAME ORDER','================',`Package: ${activePackage?`Top ${activePackage}`:'Custom'}`,`Storage: ${driveLabel()}`,''];
  const name=el.customerName.value.trim(), contact=el.customerContact.value.trim();
  if(name)lines.push(`Customer: ${name}`);if(contact)lines.push(`Contact: ${contact}`);if(name||contact)lines.push('');
  const by={};for(const g of selected.values())(by[g.system]??=[]).push(g);
  Object.keys(by).sort().forEach(s=>{lines.push(`${s} (${by[s].length})`);by[s].sort((a,b)=>a.t.localeCompare(b.t)).forEach(g=>lines.push(`  - ${g.t}`));lines.push('');});
  lines.push(`Total systems: ${Object.keys(by).length}`);lines.push(`Total games: ${selected.size}`);return lines.join('\n');
}
function csvText(){
  const rows=[['System','Game','ROM Name','Year','Manufacturer','Category','Players','Region']];
  for(const g of selected.values())rows.push([g.system,g.t,g.n,g.y,g.m,g.c,g.p,g.r]);
  return rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');
}
function download(content,name,type='text/plain') {const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function openDrawer(){el.drawer.classList.add('open');el.backdrop.classList.remove('hidden');updateOrderUI()}
function closeDrawer(){el.drawer.classList.remove('open');el.backdrop.classList.add('hidden')}

el.systemSearch.addEventListener('input',renderSystems);
[el.gameSearch,el.categoryFilter,el.yearFilter,el.featuredFilter,el.hideClones].forEach(x=>x.addEventListener(x.tagName==='INPUT'?'input':'change',()=>{page=1;renderGames()}));
el.hideClones.addEventListener('change',()=>{page=1;renderGames()});
el.selectVisibleBtn.onclick=()=>{activePackage=null;document.querySelectorAll('.package-card').forEach(b=>b.classList.remove('active'));saveConfig();const filtered=getFiltered();filtered.forEach(g=>selected.set(gameId(currentSystem,g),{system:currentSystem,...g}));saveSelection();updateOrderUI();renderGames();toast(`${filtered.length.toLocaleString()} visible games selected`)};
el.prevPage.onclick=()=>{if(page>1){page--;renderGames();window.scrollTo({top:130,behavior:'smooth'})}};el.nextPage.onclick=()=>{page++;renderGames();window.scrollTo({top:130,behavior:'smooth'})};
el.orderBtn.onclick=openDrawer;el.closeDrawer.onclick=closeDrawer;el.backdrop.onclick=closeDrawer;
el.copyOrder.onclick=async()=>{if(!selected.size)return toast('Select at least one game');try{await navigator.clipboard.writeText(orderText());toast('Order copied to clipboard')}catch(e){toast('Copy blocked by browser — use Download TXT')}};
el.downloadTxt.onclick=()=>selected.size?download(orderText(),'game-order.txt'):toast('Select at least one game');
el.downloadCsv.onclick=()=>selected.size?download(csvText(),'game-order.csv','text/csv'):toast('Select at least one game');
el.clearOrder.onclick=()=>{if(confirm('Clear all selected games?')){selected.clear();activePackage=null;document.querySelectorAll('.package-card').forEach(b=>b.classList.remove('active'));saveSelection();saveConfig();updateOrderUI();renderGames();}};

el.packageGrid.querySelectorAll('.package-card').forEach(b=>b.onclick=()=>buildPackage(Number(b.dataset.package)));
el.driveSize.addEventListener('change',()=>{const gb=Number(el.driveSize.value);if(gb<MIN_STORAGE_GB||gb>MAX_STORAGE_GB){el.driveSize.value='256';}saveConfig();updateOrderUI();toast(`${driveLabel()} selected`);});
el.showAllSystems.onclick=()=>{document.querySelector('.shell').scrollIntoView({behavior:'smooth'});el.systemSearch.focus();};

loadSelection();loadConfig();renderPopularSystems();renderSystems();updateOrderUI();
