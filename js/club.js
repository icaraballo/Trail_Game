// ── js/club.js ──────────────────────────────────────────────
// Modo Club (gestión de club como mánager): G.clubModeData.
// Extraído de js/coach.js el 2026-09-04 (split club.js/coach.js).
// No confundir con el sistema de club de Clásico (G.club/CLUBS,
// bonus de entrenamiento), que vive en js/render-clasico.js y js/state.js.

function clubLevelByRep(){
  const rep=(G.clubModeData&&G.clubModeData.reputacion)||0;
  const lvls=[...CLUB_LEVELS].reverse();
  return lvls.find(l=>rep>=l.repReq)||CLUB_LEVELS[0];
}

function simClubRace(runner,race,clubData){
  // Modo desarrollador — "modo dios": fuerza 1er puesto en toda carrera de Club
  // simulada mientras esté activo (Club resuelve la temporada entera de golpe,
  // no hay "carrera en curso" única). Ver js/devmode.js.
  const devDnf=window.devPeek?.('clubDnf');
  if(devDnf!==undefined&&(devDnf==='*'||devDnf===runner.id)){
    // DEV: abandono armado desde el panel. Gana al modo dios si están los dos.
    window.devTake('clubDnf');
    const rivals=(CLUB_TIER_FIELD[race.tier||'local']||CLUB_TIER_FIELD.local).rivals;
    return{pos:99,perf:10,prize:0,rivals,dnf:true};
  }
  if(window.devGod?.('club')){
    const rivals=(CLUB_TIER_FIELD[race.tier||'local']||CLUB_TIER_FIELD.local).rivals;
    return{pos:1,perf:98,prize:race.prize,rivals,dnf:false};
  }
  const d=clubData||G.clubModeData||{};
  const s=runner.stats;
  let base=(s.resistencia*0.35+s.velocidad*0.2+s.subida*0.25+s.bajada*0.2);

  // Bonus por especialidad vs terreno
  if(runner.spec==='montanero')base+=race.km>30?4:2;
  if(runner.spec==='fondista') base+=race.km>40?5:0;
  if(runner.spec==='tecnico')  base+=race.km<25?3:0;

  // C8 Rol
  const role=CLUB_ROLES[runner.role||'normal']||CLUB_ROLES.normal;
  base+=role.perfBonus||0;
  if(role.specBonus&&runner.spec===d.specialty)base+=6;
  // Decisión mensual «Resultados»: +4 en la próxima simulación. Se escribía y nadie lo leía (BUG-14).
  base+=d._monthlyFocusBonus||0;

  // C9 Filosofía: bonus si especialidad coincide
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  if(fil&&fil.specBonus&&runner.spec===fil.specBonus)base+=5;
  if(fil&&fil.raceBonus&&fil.raceBonus.includes(race.tier))base+=3;

  // C6 Cohesión: ±10 % rendimiento
  const cohMod=((d.cohesion||50)-50)/500; // -0.1 a +0.1
  base*=(1+cohMod);

  // C11 Staff: entrenador da bonus
  if(d.staff&&d.staff.entrenador)base+=3;

  // C15 Infraestructura: gimnasio mejora base
  if(d.instalaciones&&d.instalaciones.gimnasio)base+=2;

  const rng=(Math.random()*16)-8;
  const perf=Math.max(10,Math.min(98,base+rng));
  // T21 (v83): modelo de campo. La posición sale de contar cuántos rivales te
  // superan, no de una penalización lineal por número de participantes. Con la
  // fórmula anterior el primer puesto en élite era imposible con perf ≤ 98.
  const field=CLUB_TIER_FIELD[race.tier||'local']||CLUB_TIER_FIELD.local;
  const rivals=field.rivals;
  const pBeat=1/(1+Math.exp((perf-field.mean)/field.k));
  let beaten=0;
  for(let i=0;i<rivals;i++) if(Math.random()<pBeat) beaten++;
  const pos=1+beaten;
  const prize=pos===1?race.prize:pos===2?Math.round(race.prize*0.6):pos===3?Math.round(race.prize*0.4):0;

  // C11 Staff fisio reduce DNF
  const dnfChance=base<30?0.12:0;
  const injReduction=(d.staff&&d.staff.fisio?CLUB_STAFF_TYPES.fisio.injuryReduction:0)
    +(fil&&fil.injuryReduction?fil.injuryReduction:0);
  const isDnf=dnfChance>0&&Math.random()<(dnfChance*(1-injReduction));

  return{pos:isDnf?99:pos, perf:Math.round(perf), prize:isDnf?0:prize, rivals, dnf:isDnf};
}

function initClubModeData(name,specialty,filosofia,archetype){
  const fil=filosofia||'montanero';
  // T115 (v84): el arquetipo filtra el pool por edad y potencial, y el sorteo
  // aleatorio evita que dos partidas con la misma especialidad sean idénticas
  // (antes: slice(0,3), siempre los mismos tres corredores).
  const arqId=CLUB_ARCHETYPES[archetype]?archetype:'equilibrado';
  const arq=CLUB_ARCHETYPES[arqId];
  const pick=(pool,n)=>shuffle([...pool]).slice(0,n);
  const fitsArq=r=>
    (arq.ageMax==null   || r.age<=arq.ageMax)&&
    (arq.ageMin==null   || r.age>=arq.ageMin)&&
    (arq.potential==null|| arq.potential.includes(r.potential));
  let sel=pick(CLUB_RUNNER_POOL.filter(r=>(specialty==='mixto'||r.spec===specialty)&&fitsArq(r)),3);
  // Si no hay tres, se relaja primero la especialidad y solo después el arquetipo
  if(sel.length<3){
    const relax=CLUB_RUNNER_POOL.filter(r=>!sel.includes(r)&&fitsArq(r));
    sel=[...sel,...pick(relax,3-sel.length)];
  }
  if(sel.length<3){
    const rest=CLUB_RUNNER_POOL.filter(r=>!sel.includes(r));
    sel=[...sel,...pick(rest,3-sel.length)];
  }
  const plantilla=sel.map(r=>({...r,stats:{...r.stats},currentSalary:r.salary,role:'normal'}));
  // Asignar capitán al primero por defecto
  if(plantilla.length>0)plantilla[0].role='capitan';
  return{
    name, specialty, filosofia:fil, archetype:arqId,
    socios:arq.socios, reputacion:10, presupuesto:arq.presupuesto, temporada:1,
    cohesion:arq.cohesion,          // C6 moral grupal
    plantilla,
    calAssignments:{},              // C5+C10: {raceId:[runnerId,...]}
    seasonResults:[], pendingEvent:null,
    historial:[],
    instalaciones:{gimnasio:false,clinica:false,residencia:false,marketingHQ:false}, // C15
    staff:{},                       // C11: {fisio:true, entrenador:true, ...}
    clubSponsors:[],                // C13
    cantera:[],                     // C12
    seasonObjective:null,           // C18
    seasonObjectiveMet:null,
    rivalClubs:[                    // C14
      {name:'Club Montaña Oria',    rep:20,socios:15,level:'local'},
      {name:'Pirineos Trail Team',  rep:45,socios:55,level:'regional'},
      {name:'Euskadi Trail Elite',  rep:75,socios:120,level:'nacional'},
    ],
    monthlyFocus:null,              // C16 decisión mensual activa
    _monthlyFocusBonus:0,           // C16 «Resultados» de la decisión mensual: +4 en la próxima simulación
    seasonSimulated:false,
    redSeasons:0,                   // v96: temporadas seguidas cerrando con presupuesto negativo
    dissolved:false,                // v96: el club se disolvió tras CLUB_RED_SEASONS_MAX en rojo
    monthlyDecisionDone:false,      // v96: una decisión mensual completa por temporada
    sponsorOutcomes:[],             // v96: objetivo de cada sponsor, evaluado al simular
  };
}

function clubMonthlyWage(){
  const d=G.clubModeData;if(!d)return 0;
  return d.plantilla.reduce((s,r)=>s+(r.currentSalary||r.salary),0);
}
window.doClubMonthlyFocus=(focus)=>{
  const d=G.clubModeData;if(!d)return;
  d.monthlyFocus=focus;
  const msgs={resultados:'🏆 Foco en resultados — rendimiento +5% esta temporada',
    marketing:'📣 Campaña de marketing activa',formacion:'🌱 Plan de formación de cantera',
    ahorro:'💰 Control de costes activado'};
  showToast(msgs[focus]||'Foco mensual establecido');
  autoSave();render();
};
// v96: el foco se aplica al simular la temporada (doClubSimulateSeason), no al
// elegirlo, pero la elección no tenía vuelta atrás. Hasta simular, se puede cambiar.
window.clearClubMonthlyFocus=()=>{
  const d=G.clubModeData;if(!d||d.seasonSimulated)return;
  d.monthlyFocus=null;
  autoSave();render();
};
// v96: en la decisión mensual completa, tocar la opción ya elegida la desmarca.
window.clubToggleMonthlySel=(decId,optId)=>{
  const sel=G._monthlySelections||{};
  if(sel[decId]===optId)delete sel[decId];else sel[decId]=optId;
  G._monthlySelections=sel;
  render();
};

function generateClubObjective(){
  const d=G.clubModeData;if(!d)return;
  const socios=d.socios||8;
  // Filtrar objetivos apropiados según estado del club
  const eligible=CLUB_OBJECTIVES.filter(o=>{
    if(o.id==='socios_80'&&socios<40)return false;
    if(o.id==='socios_30'&&socios>=30)return false;
    if(o.id==='subir_nivel'&&socios>200)return false;
    return true;
  });
  const chosen=eligible[Math.floor(Math.random()*eligible.length)];
  d.seasonObjective=chosen;
  d.seasonObjectiveMet=null;
}

function generateClubEvent(){
  const d=G.clubModeData;if(!d)return;
  if(d.pendingEvent)return;
  const coh=d.cohesion||50;
  const rep=d.reputacion||0;
  const presup=d.presupuesto||0;
  const pool=CLUB_EVENTS.filter(e=>{
    if(e.id==='cle3'&&d.plantilla.length>=6)return false;
    if(e.id==='cle8'&&d.plantilla.length<=2)return false;
    // C3: filtros condicionales
    if(e.minCohesion!==undefined&&coh<e.minCohesion)return false;
    if(e.maxCohesion!==undefined&&coh>e.maxCohesion)return false;
    if(e.minRep!==undefined&&rep<e.minRep)return false;
    if(e.maxRep!==undefined&&rep>e.maxRep)return false;
    if(e.maxPresupuesto!==undefined&&presup>e.maxPresupuesto)return false;
    return true;
  });
  if(!pool.length)return;
  if(Math.random()<0.65)d.pendingEvent=pool[Math.floor(Math.random()*pool.length)];
}

function renderClubCreate(){
  const el=$main();
  hideChrome();
  const name=G._clubNameDraft||'';
  const spec=G._clubSpecDraft||'mixto';
  const fil=G._clubFilDraft||'montanero';
  const arq=G._clubArqDraft||'equilibrado';
  const specs=[
    {id:'montanero', label:'🏔️ Montaña',   desc:'Mejor en subidas y ultras de montaña'},
    {id:'fondista',  label:'🏃 Fondo',      desc:'Resistencia larga. Ultras y maratones'},
    {id:'tecnico',   label:'⚡ Técnico',    desc:'Corredores rápidos en terrenos difíciles'},
    {id:'mixto',     label:'🌐 Mixto',      desc:'Sin especialidad — plantilla variada'},
  ];
  el.innerHTML=`
    <div style="text-align:center;padding:14px 0 16px">
      <div style="font-size:32px;margin-bottom:6px">🏕️</div>
      <h2>Crear tu club</h2>
      <p class="sub">${G._clubFromLife?'Tu atleta entra como capitán y tu reputación de entrenador te acompaña. Elige cómo quieres que sea el club.':G._clubUnlockedHint?'Con tu experiencia como corredor y entrenador, el club ya nace con algo de credibilidad.':'Define el nombre, especialidad y filosofía del club.'}</p>
    </div>
    ${G._clubFromLife?`<div class="note" style="margin-bottom:14px">Inversión inicial: <strong>€${Math.round((G.money||0)*0.6)}</strong> (60 % de tus ahorros).${G.coachAthlete?` ${esc(G.coachAthlete.name)} entra como capitán.`:''}</div>`:''}
    ${G._clubUnlockedHint&&!G._clubFromLife?`<div class="note" style="margin-bottom:14px;background:#E1F5EE;border-color:#9FE1CB;color:#085041">Tu historial habla por ti. Empiezas con presupuesto un 15% mayor y reputación inicial de 13 en lugar de 10.</div>`:''}
    <label class="field-label">Nombre del club</label>
    <input id="club-name-inp" type="text" placeholder="Ej: Gorbea Trail Club, Txindoki Runners..." maxlength="32" value="${esc(name)}" oninput="G._clubNameDraft=this.value;"/>
    <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Especialidad de la plantilla</div>
    ${specs.map(s=>`
      <div class="work-card${spec===s.id?' sel':''}" onclick="G._clubSpecDraft='${s.id}';render()" style="margin-bottom:6px${spec===s.id?';border-color:var(--ink);background:var(--soft)':''}">
        <div style="font-size:14px;font-weight:600">${s.label}</div>
        <div style="font-size:12px;color:var(--ink3)">${s.desc}</div>
      </div>`).join('')}
    <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 10px">Filosofía del club (C9)</div>
    ${Object.entries(CLUB_FILOSOFIAS).map(([id,f])=>`
      <div class="work-card${fil===id?' sel':''}" onclick="G._clubFilDraft='${id}';render()" style="margin-bottom:6px${fil===id?`;border-color:${f.color};background:${f.color}11`:''};cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${f.emoji}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:${fil===id?f.color:'var(--ink)'}">${f.label}</div>
            <div style="font-size:12px;color:var(--ink3)">${f.desc}</div>
          </div>
        </div>
      </div>`).join('')}
    <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 10px">Arquetipo de plantilla</div>
    ${Object.entries(CLUB_ARCHETYPES).map(([id,a])=>`
      <div class="work-card${arq===id?' sel':''}" onclick="G._clubArqDraft='${id}';render()" style="margin-bottom:6px${arq===id?`;border-color:${a.color};background:${a.color}11`:''};cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${a.emoji}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:${arq===id?a.color:'var(--ink)'}">${a.label}</div>
            <div style="font-size:12px;color:var(--ink3)">${a.desc}</div>
          </div>
        </div>
      </div>`).join('')}
    <div class="hint" style="margin-top:10px;margin-bottom:14px">Empiezas con 3 corredores, ${CLUB_ARCHETYPES[arq].socios} socios, €${CLUB_ARCHETYPES[arq].presupuesto} de presupuesto y cohesión ${CLUB_ARCHETYPES[arq].cohesion}/100.</div>
    <button class="main" style="background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="doClubCreate()">Fundar el club →</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="G.screen=G._clubFromLife?'clubOffer':'modeSelect';render()">← Volver</button>`;
}

window.doClubCreate=()=>{
  const nameEl=document.getElementById('club-name-inp');
  const name=(nameEl?nameEl.value:G._clubNameDraft||'').trim()||'Mi Club Trail';
  const spec=G._clubSpecDraft||'mixto';
  const fil=G._clubFilDraft||'montanero';
  const arqSel=G._clubArqDraft||'equilibrado';
  G.clubModeData=initClubModeData(name,spec,fil,arqSel);
  const desdeVida=!!G._clubFromLife;   // v96: fundación desde la oferta de Carrera de Vida
  G._clubFromLife=false;
  if(desdeVida)applyLifeClubFounding();
  // Guiño narrativo si el modo está desbloqueado: presupuesto +15% y reputación inicial +3
  else if(G._clubUnlockedHint){
    G.clubModeData.presupuesto=Math.round(G.clubModeData.presupuesto*1.15);
    G.clubModeData.reputacion=Math.min(100,(G.clubModeData.reputacion||10)+3);
    G._clubUnlockedHint=false;
  }
  G._clubNameDraft=null;G._clubSpecDraft=null;G._clubFilDraft=null;G._clubArqDraft=null;
  generateClubEvent();
  generateClubObjective();
  if(desdeVida)checkAndUnlockAchievements();   // CR-38 (v76): logro cm_found
  G.screen=desdeVida?'clubIntro':'clubHub';autoSave();render();
};

// BUG-13 (v96): la cohesión subía y bajaba sin que nada lo explicase. Las cifras de staff,
// capitán y filosofía salen de las constantes; las de victorias y abandonos son las de
// doClubSimulateSeason (wins*4-dnfs*6), que fija un test.
function clubCohesionTipHtml(){
  const d=G.clubModeData||{};
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  return [
    '<strong>Al simular la temporada</strong>',
    '+4 por cada victoria · −6 por cada abandono',
    `+${CLUB_ROLES.capitan.cohesionBonus} si tienes capitán · +${CLUB_STAFF_TYPES.psicologo.cohesionBonus} con psicólogo`+(fil?` · ${fil.cohesionBonus>0?'+'+fil.cohesionBonus:'±0'} por tu filosofía (${fil.label})`:''),
    '<strong>Decisión mensual</strong>',
    'Conservador +4 · Técnico +2 · Invertir +2 · Evento social +6',
    '<strong>Al cerrar la temporada</strong>',
    '−10 por cada temporada que cierras en números rojos',
    'y lo que marquen el objetivo de temporada, los eventos y las renegociaciones',
    '<br>La cohesión mueve el rendimiento de todo el equipo: −10 % con 0 y +10 % con 100.',
  ].join('<br>');
}
function renderClubHub(){
  const el=$main();
  hideChrome();
  const d=G.clubModeData;
  if(!d){G.screen='clubCreate';render();return;}
  if(d.dissolved){G.screen='clubDissolved';render();return;}
  const lvl=clubLevelByRep();
  const wages=clubMonthlyWage();
  const annualWages=wages*12;
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const staffCost=Object.keys(d.staff||{}).reduce((s,k)=>s+(CLUB_STAFF_TYPES[k]?CLUB_STAFF_TYPES[k].costMonth:0),0)*12;
  const sponsorIncome=Math.round((d.clubSponsors||[]).reduce((s,sp)=>s+(sp.monthlyIncome||0),0)*12*CLUB_SPONSOR_SPLIT.base);   // v96: previsión con el 60 % fijo
  const annualIncome=Math.round(d.socios*CLUB_SOCIO_FEE*12*(fil&&fil.socioBonus?fil.socioBonus:1));
  const annualNet=annualIncome+sponsorIncome-annualWages-staffCost;
  const assigned=Object.values(d.calAssignments||{}).filter(v=>v&&v.length>0).length;
  const allAssigned=d.plantilla.length>0&&assigned>0;
  const cohColor=d.cohesion>=70?'#2d7a2d':d.cohesion>=40?'#c07a10':'#c0392b';
  const obj=d.seasonObjective;

  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-size:32px">${lvl.icon}</div>
      <div style="flex:1">
        <div style="font-size:18px;font-weight:700">${esc(d.name)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <span class="club-level-badge" style="background:${lvl.color}22;color:${lvl.color}">${lvl.label}</span>
          ${fil?`<span style="background:${fil.color}22;color:${fil.color};font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px">${fil.emoji} ${fil.label}</span>`:''}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--ink3)">Temporada</div>
        <div style="font-size:18px;font-weight:700">${d.temporada}</div>
      </div>
    </div>

    ${d._coachingHistory?`
    <div class="card" style="margin-bottom:12px;background:#F5EFE3;border-left:3px solid #8B6F47">
      <div style="font-size:11px;font-weight:600;color:var(--ink2);text-transform:uppercase;margin-bottom:8px">Legado previo</div>
      <div style="font-size:12px;color:var(--ink)">
        <strong>${d._coachingHistory.years}</strong> años entrenando ·
        <strong>${d._coachingHistory.coachReputation}/100</strong> reputación acumulada
      </div>
    </div>
    `:''}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:12px">
      ${[['👥',d.socios,'Socios'],['⭐',`${d.reputacion}`,'Rep.'],['💶',`€${d.presupuesto}`,'Presup.'],['🤝',`${d.cohesion}/100`,'Cohesión']].map(([ic,v,l])=>`
        <div style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:14px">${ic}</div>
          <div style="font-size:13px;font-weight:700">${v}</div>
          <div style="font-size:10px;color:var(--ink3)">${l}</div>
        </div>`).join('')}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink3);margin-bottom:3px">
      <span>🤝 Cohesión <button class="tip-btn" onclick="showTip('Qué mueve la cohesión',clubCohesionTipHtml())">ⓘ</button></span><span>${d.cohesion}/100</span>
    </div>
    <div style="height:6px;background:var(--trk);border-radius:3px;margin-bottom:12px;overflow:hidden">
      <div style="width:${d.cohesion}%;height:100%;background:${cohColor};border-radius:3px;transition:width .4s"></div>
    </div>

    ${obj?`
    <div class="card" style="margin-bottom:12px;border-color:${d.seasonObjectiveMet===true?'#4a8a2a':d.seasonObjectiveMet===false?'var(--line2)':'#c07a10'};border-width:1.5px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${d.seasonObjectiveMet===true?'✅':d.seasonObjectiveMet===false?'❌':'🎯'}</span>
        <div style="flex:1">
          <div style="font-size:11px;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Objetivo de temporada</div>
          <div style="font-size:13px;font-weight:600">${obj.label}</div>
          <div style="font-size:12px;color:var(--ink3);font-style:italic">${obj.desc}</div>
        </div>
      </div>
    </div>`:''}

    ${d.pendingEvent?`
    <div class="card" style="margin-bottom:12px;border-color:#c07a10;border-width:1.5px;cursor:pointer" onclick="G.screen='clubEvent';render()">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:22px">📣</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:var(--avi)">Evento pendiente</div>
          <div style="font-size:12px;color:var(--ink2)">${esc(d.pendingEvent.title)}</div>
        </div>
        <span style="color:var(--avi)">→</span>
      </div>
    </div>`:''}

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Economía anual estimada</div>
      <div class="fin-row"><span>Cuotas de socios</span><span class="plus">+€${annualIncome}</span></div>
      ${sponsorIncome>0?`<div class="fin-row"><span>Sponsors del club</span><span class="plus">+€${sponsorIncome}</span></div>`:''}
      <div class="fin-row"><span>Salarios plantilla</span><span class="minus">−€${annualWages}</span></div>
      ${staffCost>0?`<div class="fin-row"><span>Staff técnico</span><span class="minus">−€${staffCost}</span></div>`:''}
      <div class="fin-row tot"><span>Balance neto</span><span class="${annualNet>=0?'plus':'minus'}">${annualNet>=0?'+':''}€${annualNet}</span></div>
      ${(d.redSeasons||0)>0?`<div class="danger" style="margin-top:8px;font-size:13px">Números rojos: ${d.redSeasons} de ${CLUB_RED_SEASONS_MAX} temporadas seguidas. ${d.redSeasons>=CLUB_RED_SEASONS_MAX-1?'Si cierras otra en negativo, el club se disuelve.':'Cada temporada en rojo resta 10 de cohesión; a la 3.ª se despide el staff y a la 4.ª se va el corredor más caro.'}</div>`:''}
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Estado de la temporada</div>
      <div style="font-size:13px;color:var(--ink2)">
        ${d.seasonSimulated
          ?`✅ Temporada completada — ${(d.seasonResults||[]).length} participaciones`
          :allAssigned
            ?`🏁 ${assigned} carrera${assigned!==1?'s':''} con equipo asignado. Listo para simular.`
            :`📅 Asigna corredores a las carreras para empezar`}
      </div>
    </div>

    ${d.seasonSimulated
      ?`<button class="main" style="background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="G.screen='clubSeasonEnd';render()">Ver balance de temporada →</button>`
      :`${!d.monthlyFocus&&!d.seasonSimulated?`
        <div class="card" style="margin-bottom:10px;border-color:#8e44ad;border-width:1.5px">
          <div class="sec-title-sm" style="color:#8e44ad">🗓️ Decisión mensual (C16)</div>
          <p style="font-size:12px;color:var(--ink2);margin-bottom:8px">¿En qué enfoca el club este mes?</p>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${[['resultados','🏆','Resultados','Entrenamiento intensivo — rendimiento +5% esta temporada'],['marketing','📣','Marketing','Campaña de visibilidad — +4 socios extra al cerrar temporada'],['formacion','🌱','Formación','Desarrollo de jóvenes — cantera crece un 20% más rápido'],['ahorro','💰','Gestión','Control de costes — ahorro de €200 en gastos de inscripción']].map(([id,emoji,label,desc])=>`
              <button class="main" style="text-align:left;padding:8px 12px" onclick="doClubMonthlyFocus('${id}')">
                <strong>${emoji} ${label}</strong><br><span style="font-size:11px;color:var(--ink3)">${desc}</span>
              </button>`).join('')}
          </div>
        </div>`:''}
       <button class="main" ${!d.monthlyFocus?'style="opacity:0.5"':''} onclick="G.screen='clubCalendar';render()">📅 Asignar equipo a carreras${d.monthlyFocus?` — foco: ${d.monthlyFocus}`:''}</button>
       ${d.monthlyFocus?`<button class="secondary" style="margin-top:6px;width:100%" onclick="clearClubMonthlyFocus()">Cambiar el foco</button>`:''}
       ${allAssigned?`<button class="main" style="margin-top:6px;background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="doClubSimulateSeason()">🏁 Simular temporada →</button>`:''}`}
    <button class="main" style="margin-top:6px" onclick="G.screen='clubPlantilla';render()">👥 Plantilla (${d.plantilla.length}) ${d.cantera&&d.cantera.length>0?`· 🌱 Cantera (${d.cantera.length})`:''}</button>
    <button class="main" style="margin-top:6px" onclick="G.screen='clubStaff';render()">🧑‍⚕️ Staff técnico (${Object.keys(d.staff||{}).length} contratados)</button>
    <button class="main" style="margin-top:6px" onclick="G.screen='clubSponsors';render()">🤝 Sponsors del club (${(d.clubSponsors||[]).length})</button>
    <button class="main" style="margin-top:6px;opacity:0.6" onclick="G.screen='clubRivals';render()">⚔️ Clubes rivales</button>
    <button class="main" style="margin-top:6px;opacity:0.7" onclick="G.screen='clubMonthly';render()">📅 Decisión mensual del club${d.monthlyDecisionDone?' · ya decidida esta temporada':''}</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="backToMainMenu()">← Menú principal</button>`;
}



function renderClubPlantilla(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  const wages=clubMonthlyWage();
  const inIds=d.plantilla.map(r=>r.id);
  const cantIds=(d.cantera||[]).map(r=>r.id);
  const available=CLUB_RUNNER_POOL.filter(r=>!inIds.includes(r.id)&&!cantIds.includes(r.id));
  const youthAvail=CLUB_YOUTH_POOL.filter(r=>!inIds.includes(r.id)&&!cantIds.includes(r.id));
  const potColors={alto:'#2d7a2d',medio:'#c07a10',bajo:'#888'};
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const hasEntrenador=d.staff&&d.staff.entrenador;

  const runnerCard=(r,i,isCantera)=>{
    const pc=potColors[r.potential]||'#888';
    const role=CLUB_ROLES[r.role||'normal'];
    // La tarjeta anunciaba «+30%» escrito a mano mientras growthBonus valía 1.3
    // y nadie lo leía: cambiar el bonus dejaba la tarjeta mintiendo. Mismo caso
    // que T138 con FIXED_COSTS.total. Ahora el porcentaje sale del dato.
    const growthBonus=hasEntrenador?CLUB_STAFF_TYPES.entrenador.growthBonus:1;
    const growthPct=Math.round((growthBonus-1)*100);
    const specMatch=fil&&r.spec===fil.specBonus;
    return`<div class="club-runner-card" style="${specMatch?'border-color:'+fil.color+';':''};margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:22px">${r.flag}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
            <div style="font-size:14px;font-weight:700">${esc(r.name)}</div>
            <span style="font-size:11px;color:${pc};background:${pc}18;padding:1px 5px;border-radius:3px;font-weight:600">${r.potential}</span>
            <span style="font-size:11px;background:${role.color}22;color:${role.color};padding:1px 6px;border-radius:3px;font-weight:600">${role.emoji} ${role.label}</span>
            ${isCantera?`<span style="font-size:10px;background:#e8f4e8;color:var(--pos);padding:1px 5px;border-radius:3px">🌱 Cantera</span>`:''}
          </div>
          <div style="font-size:12px;color:var(--ink3);margin-bottom:4px">${r.age} años · ${SPEC_LABEL[r.spec]||r.spec} · €${r.currentSalary||r.salary}/mes${hasEntrenador?` · ↑ +${growthPct}% crecimiento`:''}</div>
          <div>${['Res','Vel','Sub','Baj'].map((k,ki)=>{
            const keys=['resistencia','velocidad','subida','bajada'];
            return`<span class="club-stat-pill">${k} ${r.stats[keys[ki]]}</span>`;
          }).join('')}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:3px;font-style:italic">${esc(r.bio)}</div>
          ${(()=>{
            // C1: etiquetas dinámicas según historial acumulado
            const tags=[];
            if((r.seasonsInClub||0)>=3)tags.push({label:'Veterano 🏅',color:'#c07a10'});
            if((r.careerWins||0)>=2)tags.push({label:`${r.careerWins} victorias ⭐`,color:'#2d7a2d'});
            else if((r.careerPodiums||0)>=3)tags.push({label:`${r.careerPodiums} podios`,color:'#4a90d9'});
            if(r.age>=35)tags.push({label:'Última etapa',color:'#888'});
            if((r.careerDnfs||0)>=3)tags.push({label:'Propenso a DNF ⚠️',color:'#c0392b'});
            if(r.seasonsInClub===1&&(r.careerPodiums||0)>0)tags.push({label:'Promesa confirmada 🌱',color:'#2d7a2d'});
            if(!tags.length)return'';
            return`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${tags.map(t=>`<span style="font-size:10px;background:${t.color}18;color:${t.color};padding:1px 6px;border-radius:3px;font-weight:600">${t.label}</span>`).join('')}</div>`;
          })()}
          <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">
            ${Object.entries(CLUB_ROLES).map(([rid,rl])=>`
              <button onclick="doClubSetRole(${isCantera?`'cantera'`:`'plantilla'`},${isCantera?cantIds.indexOf(r.id):i},'${rid}')" style="font-size:11px;padding:2px 7px;border-radius:4px;border:1px solid ${(r.role||'normal')===rid?rl.color:'#e0dfd8'};background:${(r.role||'normal')===rid?rl.color+'22':'var(--card)'};color:${(r.role||'normal')===rid?rl.color:'var(--ink3)'};cursor:pointer">${rl.emoji}</button>`).join('')}
          </div>
        </div>
        ${d.plantilla.length>2&&!isCantera?`<button onclick="doClubRelease(${i})" style="border:1px solid var(--line2);border-radius:6px;padding:4px 8px;background:var(--card);color:var(--neg);font-size:11px;cursor:pointer;flex-shrink:0">Liberar</button>`:''}
      </div>
    </div>`;
  };

  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h2 style="margin-bottom:0">Plantilla</h2>
      <button onclick="G.screen='clubHub';render()" style="background:none;border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--ink3)">← Hub</button>
    </div>
    <div class="hint" style="margin-bottom:10px">€${wages}/mes · €${wages*12}/año · Presupuesto: €${d.presupuesto}</div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Infraestructura (C15)</div>
      ${[['gimnasio','🏋️','Gimnasio',500,'Todos los corredores +2 rendimiento'],['clinica','🏥','Clínica',800,'Reduce lesiones -30%'],['residencia','🏠','Residencia',1200,'Permite plantilla de hasta 8 corredores'],['marketingHQ','📣','Marketing HQ',600,'+5 socios automáticos al mes']].map(([id,emoji,label,cost,desc])=>{
        const owned=d.instalaciones&&d.instalaciones[id];
        return`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)">
          <span style="font-size:16px">${emoji}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${label}</div>
            <div style="font-size:11px;color:var(--ink3)">${desc}</div>
          </div>
          ${owned
            ?`<span style="font-size:11px;color:var(--pos);font-weight:600">✓ Activo</span>`
            :`<button onclick="doClubBuyInstalacion('${id}',${cost})" style="font-size:11px;padding:3px 8px;border-radius:5px;border:1px solid var(--line);background:var(--card);cursor:pointer;flex-shrink:0">€${cost}</button>`}
        </div>`;
      }).join('')}
    </div>

    <div class="sec-title-sm" style="margin-bottom:8px">Plantilla principal (${d.plantilla.length})</div>
    ${d.plantilla.map((r,i)=>runnerCard(r,i,false)).join('')}

    ${(d.cantera||[]).length>0?`
    <div class="sec-title-sm" style="margin:12px 0 8px">Cantera (${d.cantera.length})</div>
    ${d.cantera.map((r,i)=>runnerCard(r,i,true)).join('')}`:''}

    ${available.length>0&&d.plantilla.length<(d.instalaciones&&d.instalaciones.residencia?8:6)?`
    <div class="sec-title-sm" style="margin:12px 0 8px">Fichar corredor</div>
    ${available.slice(0,4).map(r=>{
      const pc=potColors[r.potential]||'#888';
      const canAfford=d.presupuesto>=r.salary*3;
      return`<div class="club-runner-card" style="${!canAfford?'opacity:0.45':''};margin-bottom:6px" ${canAfford?`onclick="doClubSign('${r.id}')"`:''}><div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:20px">${r.flag}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px"><div style="font-size:13px;font-weight:700">${esc(r.name)}</div><span style="font-size:11px;color:${pc};background:${pc}18;padding:1px 5px;border-radius:3px">${r.potential}</span></div>
          <div style="font-size:12px;color:var(--ink3)">${r.age}a · ${SPEC_LABEL[r.spec]||r.spec} · €${r.salary}/mes</div>
        </div>
        <div style="font-size:11px;color:${canAfford?'var(--pos)':'var(--neg)'};flex-shrink:0">${canAfford?'+ Fichar':'Sin fondos'}</div>
      </div></div>`;
    }).join('')}`:''

    }

    ${youthAvail.length>0?`
    <div class="sec-title-sm" style="margin:12px 0 8px">🌱 Cantera disponible</div>
    <p style="font-size:12px;color:var(--ink3);margin-bottom:8px">Jóvenes con potencial alto. Crecen un 50% más rápido pero rinden menos al inicio.</p>
    ${youthAvail.slice(0,3).map(r=>{
      const canAfford=d.presupuesto>=r.salary*2;
      return`<div class="club-runner-card" style="${!canAfford?'opacity:0.45':''};margin-bottom:6px" ${canAfford?`onclick="doClubSignYouth('${r.id}')"`:''}><div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:20px">${r.flag}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${esc(r.name)} <span style="font-size:11px;color:var(--pos)">🌱 Joven</span></div>
          <div style="font-size:12px;color:var(--ink3)">${r.age}a · ${SPEC_LABEL[r.spec]||r.spec} · €${r.salary}/mes</div>
          <div style="font-size:11px;color:var(--ink3);font-style:italic">${esc(r.bio)}</div>
        </div>
        <div style="font-size:11px;color:${canAfford?'var(--pos)':'var(--neg)'};flex-shrink:0">${canAfford?'+ Cantera':'Sin fondos'}</div>
      </div></div>`;
    }).join('')}`:''}`;
}

window.doClubSetRole=(pool,idx,role)=>{
  const d=G.clubModeData;if(!d)return;
  const arr=pool==='cantera'?d.cantera:d.plantilla;
  if(!arr||idx<0||idx>=arr.length)return;
  // Solo un capitán a la vez
  if(role==='capitan'){
    d.plantilla.forEach(r=>{if(r.role==='capitan')r.role='normal';});
    if(d.cantera)d.cantera.forEach(r=>{if(r.role==='capitan')r.role='normal';});
  }
  arr[idx].role=role;
  showToast(`${arr[idx].name.split(' ')[0]}: ${CLUB_ROLES[role].emoji} ${CLUB_ROLES[role].label}`);
  autoSave();render();
};

window.doClubBuyInstalacion=(id,cost)=>{
  const d=G.clubModeData;if(!d)return;
  if(d.presupuesto<cost){showToast('Presupuesto insuficiente');return;}
  d.instalaciones[id]=true;
  d.presupuesto-=cost;
  showToast(`✅ ${id} — instalación activa`);
  autoSave();render();
};

window.doClubSign=id=>{
  const d=G.clubModeData;if(!d)return;
  const r=CLUB_RUNNER_POOL.find(x=>x.id===id);if(!r)return;
  const maxSize=d.instalaciones&&d.instalaciones.residencia?8:6;
  if(d.plantilla.length>=maxSize){showToast(`Plantilla completa — máx. ${maxSize}`);return;}
  if(d.presupuesto<r.salary*3){showToast('Presupuesto insuficiente');return;}   // v96: la guarda solo estaba en la tarjeta
  d.plantilla.push({...r,stats:{...r.stats},currentSalary:r.salary,role:'normal'});
  d.presupuesto-=r.salary*3;
  showToast(`${r.name} fichado — coste inicial €${r.salary*3}`);
  autoSave();render();
};

window.doClubSignYouth=id=>{
  const d=G.clubModeData;if(!d)return;
  const r=CLUB_YOUTH_POOL.find(x=>x.id===id);if(!r)return;
  if(!d.cantera)d.cantera=[];
  if(d.cantera.length>=3){showToast('Cantera completa — máx. 3');return;}
  if(d.presupuesto<r.salary*2){showToast('Presupuesto insuficiente');return;}   // v96
  d.cantera.push({...r,stats:{...r.stats},currentSalary:r.salary,role:'promesa'});
  d.presupuesto-=r.salary*2;
  showToast(`🌱 ${r.name} a la cantera — €${r.salary*2}`);
  autoSave();render();
};

window.doClubRelease=idx=>{
  const d=G.clubModeData;if(!d)return;
  if(d.plantilla.length<=2){showToast('Necesitas al menos 2 corredores');return;}
  const r=d.plantilla[idx];
  if(!confirm(`¿Liberar a ${r.name}?`))return;
  d.plantilla.splice(idx,1);
  Object.keys(d.calAssignments||{}).forEach(k=>{
    if(Array.isArray(d.calAssignments[k]))d.calAssignments[k]=d.calAssignments[k].filter(id=>id!==r.id);
  });
  showToast(`${r.name} liberado`);
  autoSave();render();
};
function renderClubCalendar(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  const assignments=d.calAssignments||{};
  const tierColors={local:'#888',regional:'#4a90d9',nacional:'#2d7a2d',elite:'#c0392b'};
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h2 style="margin-bottom:0">Calendario</h2>
      <button onclick="G.screen='clubHub';render()" style="background:none;border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--ink3)">← Hub</button>
    </div>
    <p class="sub">Asigna 1–4 corredores por carrera. Toca su nombre para añadir o quitar.</p>
    ${(()=>{
      const clubRep=d.reputacion||0;
      const clubSocios=d.socios||8;
      const unlocked=CLUB_RACES.filter(r=>(r.repReq||0)<=clubRep&&(r.sociosReq||0)<=clubSocios);
      const locked=CLUB_RACES.filter(r=>(r.repReq||0)>clubRep||(r.sociosReq||0)>clubSocios);
      return`
      ${unlocked.map(race=>{
        const assigned=assignments[race.id]||[];
        const tc=tierColors[race.tier]||'#888';
        return`<div class="club-race-row" style="margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px;font-weight:700">${esc(race.name)}</span>
                <span style="font-size:10px;background:${tc}18;color:${tc};padding:1px 5px;border-radius:3px;font-weight:600;text-transform:uppercase">${race.tier}</span>
              </div>
              <div style="font-size:12px;color:var(--ink3)">${race.km}km · ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][race.month-1]} · ${race.cost>0?`€${race.cost} inscripción`:'Gratuita'} · Premio €${race.prize}</div>
            </div>
            <span style="font-size:12px;color:${assigned.length>0?'var(--pos)':'var(--ink3)'}">${assigned.length}/4</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${d.plantilla.concat(d.cantera||[]).map(r=>{
              const isSel=assigned.includes(r.id);
              const role=CLUB_ROLES[r.role||'normal'];
              return`<div onclick="doClubToggleAssign('${race.id}','${r.id}')" style="cursor:pointer;padding:4px 9px;border-radius:6px;font-size:12px;border:1px solid ${isSel?'#2d7a2d':'#e0dfd8'};background:${isSel?'var(--soft)':'var(--soft)'};color:${isSel?'var(--pos)':'var(--ink2)'}">${role.emoji} ${esc(r.name.split(' ')[0])}</div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
      ${locked.length>0?`
      <div style="margin-top:14px;margin-bottom:6px">
        <div style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">🔒 Carreras bloqueadas</div>
        ${locked.map(race=>{
          const tc=tierColors[race.tier]||'#888';
          const needRep=race.repReq>clubRep;
          const needSocios=race.sociosReq>clubSocios;
          return`<div style="opacity:0.5;padding:10px 12px;border:1px dashed var(--line);border-radius:8px;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;font-weight:600">${esc(race.name)}</span>
              <span style="font-size:10px;background:${tc}18;color:${tc};padding:1px 5px;border-radius:3px;text-transform:uppercase">${race.tier}</span>
            </div>
            <div style="font-size:11px;color:var(--ink3);margin-top:3px">
              ${needRep?`Rep. ≥${race.repReq} (actual: ${clubRep}) `:''}${needSocios?`· Socios ≥${race.sociosReq} (actual: ${clubSocios})`:''}
            </div>
          </div>`;
        }).join('')}
      </div>`:''}`;
    })()}
    <button class="main" style="margin-top:10px;background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="G.screen='clubHub';render()">← Volver al hub</button>`;
}

window.doClubToggleAssign=(raceId,runnerId)=>{
  const d=G.clubModeData;if(!d)return;
  if(!d.calAssignments)d.calAssignments={};
  if(!d.calAssignments[raceId])d.calAssignments[raceId]=[];
  const arr=d.calAssignments[raceId];
  const idx=arr.indexOf(runnerId);
  if(idx>=0)arr.splice(idx,1);
  else if(arr.length<4)arr.push(runnerId);
  else{showToast('Máximo 4 corredores por carrera');return;}
  autoSave();render();
};

// v96 · Objetivos de los sponsors del club. Estaban escritos en CLUB_SPONSORS_POOL
// (objKey, duration) y nada los leía: el sponsor pagaba entero y para siempre.
function clubSponsorObjectiveMet(sp,results,d){
  const devMet=window.devPeek?.('clubSponsorMet');   // DEV: resultado armado desde el panel
  if(devMet!==undefined)return devMet;
  const fin=(results||[]).filter(r=>!r.dnf);
  switch(sp.objKey){
    case 'top10x3': return fin.filter(r=>r.pos<=10).length>=3;
    case 'part5':   return (results||[]).length>=5;
    case 'no_dnf':  return (results||[]).length>0&&results.every(r=>!r.dnf);
    case 'podio1':  return fin.some(r=>r.pos<=3);
    case 'top5nat': return fin.some(r=>r.pos<=5&&['nacional','elite'].includes(r.race?.tier));
    case 'socios50':return (d.socios||0)>=50;
    default:        return true;
  }
}

window.doClubSimulateSeason=()=>{
  const d=G.clubModeData;if(!d)return;
  const results=[];
  const clubRep=d.reputacion||0;
  const clubSocios=d.socios||8;
  CLUB_RACES.forEach(race=>{
    if((race.repReq||0)>clubRep||(race.sociosReq||0)>clubSocios)return; // C4: carrera bloqueada
    const runnerIds=d.calAssignments[race.id]||[];
    if(!runnerIds.length)return;
    const allRunners=[...d.plantilla,...(d.cantera||[])];
    // Coste de inscripción × número de corredores
    if(race.cost>0)d.presupuesto-=race.cost*runnerIds.length;
    runnerIds.forEach(rid=>{
      const runner=allRunners.find(r=>r.id===rid);
      if(!runner)return;
      const res=simClubRace(runner,race,d);
      if(!res.dnf)d.presupuesto+=res.prize;
      results.push({race,runner,pos:res.pos,perf:res.perf,prize:res.dnf?0:res.prize,rivals:res.rivals,dnf:res.dnf});
    });
  });
  // C16 Aplicar foco mensual
  if(d.monthlyFocus==='resultados')results.forEach(r=>{if(!r.dnf)r.pos=Math.max(1,r.pos-1);});
  if(d.monthlyFocus==='marketing')d.socios=Math.min(999,(d.socios||8)+4);
  if(d.monthlyFocus==='ahorro')d.presupuesto+=200;
  d._monthlyFocusBonus=0;   // BUG-14 (v96): el bonus de «Resultados» se gasta en esta simulación

  d.seasonResults=results;
  d.seasonSimulated=true;

  // Actualizar reputación
  const podiums=results.filter(r=>r.pos<=3&&!r.dnf).length;
  const top10=results.filter(r=>r.pos<=10&&!r.dnf).length;
  d.reputacion=Math.min(100,(d.reputacion||0)+podiums*8+top10*3+(results.length>0?2:0));

  // C6 Cohesión: sube con victorias, baja con DNFs
  const wins=results.filter(r=>r.pos===1).length;
  const dnfs=results.filter(r=>r.dnf).length;
  const capitan=d.plantilla.find(r=>r.role==='capitan');
  const capBonus=capitan?CLUB_ROLES.capitan.cohesionBonus:0;
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const filBonus=fil?fil.cohesionBonus:0;
  const staffPsi=d.staff&&d.staff.psicologo?CLUB_STAFF_TYPES.psicologo.cohesionBonus:0;
  d.cohesion=Math.max(0,Math.min(100,(d.cohesion||50)+wins*4-dnfs*6+capBonus+filBonus+staffPsi));

  // C11 Staff marketing suma socios
  if(d.staff&&d.staff.marketing)d.socios=Math.min(999,d.socios+CLUB_STAFF_TYPES.marketing.sociosPerMonth*12);

  // Comprobar objetivo de temporada C18
  if(d.seasonObjective){
    const obj=d.seasonObjective;
    const lvl=clubLevelByRep();
    try{d.seasonObjectiveMet=obj.check(d,lvl);}catch(e){d.seasonObjectiveMet=false;}
  }

  // v96 · Sponsors con objetivo: se cobra el 60 % del contrato de la temporada y el
  // objetivo se evalúa con los resultados reales. Si se cumple entra el 40 % restante;
  // si no, −3 de reputación y el sponsor rescinde al cerrar (doClubNextSeason).
  d.sponsorOutcomes=(d.clubSponsors||[]).map(sp=>{
    const total=(sp.monthlyIncome||0)*12;
    const met=clubSponsorObjectiveMet(sp,results,d);
    const base=Math.round(total*CLUB_SPONSOR_SPLIT.base);
    const bonus=met?total-base:0;
    d.presupuesto+=base+bonus;
    if(!met)d.reputacion=Math.max(0,(d.reputacion||0)-CLUB_SPONSOR_SPLIT.failRep);
    return {id:sp.id,name:sp.name,objective:sp.objective,met,base,bonus};
  });
  window.devTake?.('clubSponsorMet');

  checkAndUnlockAchievements(); // CR-38 (v76)
  autoSave();
  G.screen='clubSimulate';
  G._clubSimIdx=0;
  render();
};

function renderClubSimulate(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const results=d.seasonResults||[];
  const idx=G._clubSimIdx||0;
  const isDone=idx>=results.length;

  if(isDone){
    el.innerHTML=`
      <div style="text-align:center;padding:20px 0 16px">
        <div style="font-size:36px;margin-bottom:8px">🏕️</div>
        <h2>Temporada completa</h2>
        <p class="sub">Todos los resultados registrados</p>
      </div>
      <button class="main" style="background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="G.screen='clubSeasonEnd';render()">Ver balance de temporada →</button>`;
    return;
  }

  const r=results[idx];
  const posColor=r.pos===1?'#c07a10':r.pos<=3?'#2d7a2d':r.pos<=10?'#4a90d9':'#1a1a1a';
  const posIcon=r.pos===1?'🥇':r.pos===2?'🥈':r.pos===3?'🥉':r.pos<=10?'🎯':'🏃';

  el.innerHTML=`
    <div style="font-size:12px;color:var(--ink3);margin-bottom:12px;text-align:center">Resultado ${idx+1} de ${results.length}</div>
    <div style="height:3px;background:var(--trk);border-radius:2px;overflow:hidden;margin-bottom:16px">
      <div style="width:${Math.round((idx/results.length)*100)}%;height:100%;background:#4a90d9;border-radius:2px"></div>
    </div>
    <div class="card" style="text-align:center;padding:24px 16px;margin-bottom:14px">
      <div style="font-size:40px;margin-bottom:8px">${posIcon}</div>
      <div style="font-size:24px;font-weight:700;color:${posColor};margin-bottom:4px">#${r.pos} de ${r.rivals}</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px">${esc(r.runner.flag)} ${esc(r.runner.name)}</div>
      <div style="font-size:13px;color:var(--ink3)">${esc(r.race.name)} · ${clubRaceKm(r.race)}km</div>
      ${r.prize>0?`<div style="font-size:13px;color:var(--pos);font-weight:600;margin-top:8px">+€${r.prize} premio</div>`:''}
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="sec-title-sm">Detalles</div>
      <div class="fin-row"><span>Carrera</span><span>${esc(r.race.name)}</span></div>
      <div class="fin-row"><span>Corredor</span><span>${esc(r.runner.name)}</span></div>
      <div class="fin-row"><span>Posición</span><span style="font-weight:700;color:${posColor}">#${r.pos} / ${r.rivals}</span></div>
      <div class="fin-row"><span>Rendimiento</span><span>${r.perf}/100</span></div>
      ${r.prize>0?`<div class="fin-row"><span>Premio</span><span class="plus">+€${r.prize}</span></div>`:''}
    </div>
    <button class="main" style="background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="G._clubSimIdx=${idx+1};render()">
      ${idx+1<results.length?'Siguiente resultado →':'Ver balance final →'}
    </button>`;
}

// ── STAFF TÉCNICO (C11) ────────────────────────────────────────────────────
function renderClubStaff(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h2 style="margin-bottom:0">Staff Técnico</h2>
      <button onclick="G.screen='clubHub';render()" style="background:none;border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--ink3)">← Hub</button>
    </div>
    <p class="sub">Contrata personal de apoyo. Cada miembro del staff tiene un coste mensual y mejora un aspecto del club.</p>
    ${Object.entries(CLUB_STAFF_TYPES).map(([id,s])=>{
      const hired=d.staff&&d.staff[id];
      return`<div class="card" style="margin-bottom:10px;${hired?'border-color:#2d7a2d;':''}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="font-size:22px">${s.emoji}</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700">${s.label}</div>
            <div style="font-size:12px;color:var(--ink3)">${s.desc}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:700;color:var(--avi)">€${s.costMonth}/mes</div>
            ${hired?`<div style="font-size:11px;color:var(--pos)">✓ Contratado</div>`:''}
          </div>
        </div>
        ${hired
          ?`<button class="main" style="margin-top:4px;border-color:#c0392b;color:var(--neg);font-size:12px" onclick="doClubFireStaff('${id}')">Despedir</button>`
          :`<button class="main" style="margin-top:4px;font-size:12px" onclick="doClubHireStaff('${id}',${s.costMonth})">Contratar — €${s.costMonth}/mes</button>`}
      </div>`;
    }).join('')}`;
}
window.doClubHireStaff=(id,cost)=>{
  const d=G.clubModeData;if(!d)return;
  if(d.presupuesto<cost*3){showToast('Presupuesto insuficiente');return;}
  if(!d.staff)d.staff={};
  d.staff[id]=true;
  showToast(`${CLUB_STAFF_TYPES[id].emoji} ${CLUB_STAFF_TYPES[id].label} contratado`);
  autoSave();render();
};
window.doClubFireStaff=(id)=>{
  const d=G.clubModeData;if(!d)return;
  if(d.staff)delete d.staff[id];
  showToast(`${CLUB_STAFF_TYPES[id].label} despedido`);
  autoSave();render();
};

// ── PATROCINIO DE CLUB (C13) ───────────────────────────────────────────────
function renderClubSponsors(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const activeIds=(d.clubSponsors||[]).map(s=>s.id);
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  // Más sponsors disponibles según filosofía comercial
  const available=CLUB_SPONSORS_POOL.filter(s=>
    d.reputacion>=(s.tier===2?40:0)&&
    (fil&&fil.sponsorBonus===s.cat?true:s.tier<=1||(d.clubSponsors||[]).length<2)
  );
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h2 style="margin-bottom:0">Sponsors del Club</h2>
      <button onclick="G.screen='clubHub';render()" style="background:none;border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--ink3)">← Hub</button>
    </div>
    <p class="sub">Cada sponsor paga el 60 % de su contrato al simular la temporada y el 40 % restante solo si se cumple su objetivo. Si no se cumple, rescinde.</p>
    ${(d.clubSponsors||[]).length>0?`
    <div class="sec-title-sm" style="margin-bottom:8px">Sponsors activos</div>
    ${(d.clubSponsors||[]).map(sp=>`
      <div class="card" style="margin-bottom:8px;border-color:#2d7a2d">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:700">${esc(sp.name)}</div>
            <div style="font-size:12px;color:var(--ink3)">${sp.objective} · ${sp.seasonsLeft||1} temporada${(sp.seasonsLeft||1)!==1?'s':''} de contrato</div>
          </div>
          <span style="font-size:14px;font-weight:700;color:var(--pos)">+€${sp.monthlyIncome}/mes</span>
        </div>
        <button class="main" style="margin-top:6px;border-color:#c0392b;color:var(--neg);font-size:12px" onclick="doClubRemoveSponsor('${sp.id}')">Rescindir contrato</button>
      </div>`).join('')}`:''}
    <div class="sec-title-sm" style="margin-bottom:8px;margin-top:${(d.clubSponsors||[]).length?'14px':'0'}">Disponibles</div>
    ${available.filter(s=>!activeIds.includes(s.id)).map(sp=>`
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:13px;font-weight:700">${esc(sp.name)}</div>
          <span style="font-size:14px;font-weight:700;color:var(--avi)">+€${sp.monthlyIncome}/mes</span>
        </div>
        <div style="font-size:12px;color:var(--ink3);margin-bottom:6px">Objetivo: ${sp.objective} · ${sp.duration||1} temporada${(sp.duration||1)!==1?'s':''}</div>
        <button class="main" style="font-size:12px" onclick="doClubAddSponsor('${sp.id}')">Firmar contrato</button>
      </div>`).join('')||'<div class="hint">Sin sponsors disponibles aún. Sube tu reputación para desbloquear más.</div>'}`;
}
window.doClubAddSponsor=(id)=>{
  const d=G.clubModeData;if(!d)return;
  const sp=CLUB_SPONSORS_POOL.find(s=>s.id===id);if(!sp)return;
  if(!d.clubSponsors)d.clubSponsors=[];
  d.clubSponsors.push({...sp,seasonsLeft:sp.duration||1});   // v96: el contrato dura lo que dice
  showToast(`🤝 ${sp.name} — contrato firmado`);
  autoSave();render();
};
window.doClubRemoveSponsor=(id)=>{
  const d=G.clubModeData;if(!d)return;
  d.clubSponsors=(d.clubSponsors||[]).filter(s=>s.id!==id);
  showToast('Contrato rescindido');
  autoSave();render();
};

// ── CLUBES RIVALES (C14) ───────────────────────────────────────────────────
function renderClubRivals(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const lvl=clubLevelByRep();
  // Rivales crecen con el tiempo
  const rivals=(d.rivalClubs||[]).map(r=>({
    ...r,
    rep:Math.min(100,(r.rep||20)+(d.temporada||1)*3),
    socios:Math.min(500,(r.socios||10)+(d.temporada||1)*5),
  }));
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h2 style="margin-bottom:0">Clubes Rivales</h2>
      <button onclick="G.screen='clubHub';render()" style="background:none;border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--ink3)">← Hub</button>
    </div>
    <div class="card" style="margin-bottom:12px;border-color:#4a90d9">
      <div style="font-size:11px;color:var(--ink3);margin-bottom:4px">TU CLUB</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:700">${esc(d.name)}</div>
        <span style="font-size:12px;background:${lvl.color}22;color:${lvl.color};padding:2px 8px;border-radius:4px">${lvl.label}</span>
      </div>
      <div style="font-size:12px;color:var(--ink3);margin-top:4px">Rep: ${d.reputacion}/100 · Socios: ${d.socios} · Cohesión: ${d.cohesion}/100</div>
    </div>
    ${rivals.map(r=>{
      const isAhead=r.rep>d.reputacion;
      return`<div class="card" style="margin-bottom:8px;${isAhead?'border-color:#c07a10':''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:13px;font-weight:700">${esc(r.name)}</div>
          <span style="font-size:11px;color:${isAhead?'var(--avi)':'var(--pos)'}">${isAhead?'▲ Por delante':'▼ Por detrás'}</span>
        </div>
        <div style="font-size:12px;color:var(--ink3)">Rep: ${r.rep}/100 · Socios: ${r.socios} · Nivel: ${r.level}</div>
      </div>`;
    }).join('')}
    <div class="hint" style="margin-top:10px">Los rivales crecen cada temporada. Si un rival supera tu reputación puede intentar ficharte corredores.</div>`;
}

// ── DECISIONES MENSUALES COMPLETAS (C16) ──────────────────────────────────
function renderClubMonthly(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const sel=G._monthlySelections||{};
  const decDefs=[
    {id:'training',label:'Foco de entrenamiento',icon:'💪',options:[
      {id:'intensivo',  emoji:'🔥',text:'Intensivo',   desc:'+3 stats a toda la plantilla'},
      {id:'conservador',emoji:'🛡',text:'Conservador', desc:'+4 cohesión grupal'},
      {id:'tecnico',    emoji:'⚡',text:'Técnico',     desc:'+5 stat especialidad + 2 cohesión'},
    ]},
    {id:'focus',label:'Foco del club',icon:'🎯',options:[
      {id:'resultados', emoji:'🏆',text:'Resultados',  desc:'+4 rendimiento en próxima simulación'},
      {id:'marketing',  emoji:'📣',text:'Marketing',   desc:'+4 socios, +3 reputación'},
      {id:'formacion',  emoji:'🌱',text:'Formación',   desc:'Cantera +2 stats extra'},
    ]},
    {id:'budget',label:'Gestión presupuesto',icon:'💶',options:[
      {id:'invertir',   emoji:'💶',text:'Invertir',    desc:'€200 → +2 cohesión +2 stats',    cost:200},
      {id:'ahorrar',    emoji:'🏦',text:'Ahorrar',     desc:'+€150 reserva'},
      {id:'evento',     emoji:'🎪',text:'Evento social',desc:'€100 → +6 cohesión +2 socios',   cost:100},
    ]},
  ];
  const allChosen=decDefs.every(d=>sel[d.id]);
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h2 style="margin-bottom:0">Decisión mensual</h2>
      <button onclick="G.screen='clubHub';render()" style="background:none;border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--ink3)">← Hub</button>
    </div>
    <p class="sub">Elige una opción en cada área y confirma. Nada se aplica hasta confirmar; toca una opción elegida para desmarcarla.${d.monthlyDecisionDone?'<br><strong>Ya has decidido esta temporada.</strong> La siguiente decisión llega con la próxima temporada.':' Una decisión por temporada.'}</p>
    ${decDefs.map(dec=>`
      <div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">${dec.icon} ${dec.label}</div>
        ${dec.options.map(opt=>{
          const isSel=sel[dec.id]===opt.id;
          const sinFondos=!isSel&&(opt.cost||0)>(d.presupuesto||0);   // BUG-15 (v96)
          return`<div ${sinFondos?'':`onclick="clubToggleMonthlySel('${dec.id}','${opt.id}')"`} style="cursor:${sinFondos?'default':'pointer'};${sinFondos?'opacity:0.45;':''}padding:10px 12px;border-radius:8px;border:1px solid ${isSel?'#4a90d9':'#e0dfd8'};background:${isSel?'var(--soft)':'var(--soft)'};margin-bottom:6px;display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">${opt.emoji}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:${isSel?'700':'500'};color:${isSel?'var(--cuerpo)':'var(--ink)'}">${opt.text}</div>
              <div style="font-size:12px;color:var(--ink3)">${opt.desc}${opt.cost?` · −€${opt.cost}`:''}${sinFondos?' · <strong>Sin fondos</strong>':''}</div>
            </div>
            ${isSel?`<span style="font-size:16px;color:var(--cuerpo)">✓</span>`:''}
          </div>`;
        }).join('')}
      </div>`).join('')}
    <button class="main" style="background:var(--ink);color:var(--card);border-color:var(--ink)${(!allChosen||d.monthlyDecisionDone)?';opacity:0.4;pointer-events:none':''}" onclick="doClubApplyMonthlyFull()">Confirmar decisiones →</button>`;
}

window.doClubApplyMonthlyFull=()=>{
  const d=G.clubModeData;if(!d)return;
  if(d.monthlyDecisionDone){showToast('Ya has tomado la decisión de esta temporada');return;}   // v96: se confirmaba sin límite y cada vez volvía a sumar
  const sel=G._monthlySelections||{};
  const costs={invertir:200,evento:100};
  // BUG-15 (v96): sin presupuesto para la opción elegida se aplicaban igual las otras dos
  // áreas y se gastaba la decisión de la temporada. Se comprueba antes de aplicar nada.
  if((costs[sel.budget]||0)>(d.presupuesto||0)){showToast(`Sin fondos para esa opción (€${costs[sel.budget]}): elige otra`);return;}
  const effects={
    training:{
      intensivo:  (d)=>d.plantilla.forEach(r=>Object.keys(r.stats).forEach(k=>r.stats[k]=Math.min(95,(r.stats[k]||40)+3))),
      conservador:(d)=>{d.cohesion=Math.min(100,(d.cohesion||50)+4);},
      tecnico:    (d)=>{const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;const key=fil?.statGrowthKey;if(key)d.plantilla.forEach(r=>{r.stats[key]=Math.min(95,(r.stats[key]||40)+5);});d.cohesion=Math.min(100,(d.cohesion||50)+2);},
    },
    focus:{
      resultados: (d)=>{d._monthlyFocusBonus=(d._monthlyFocusBonus||0)+4;},
      marketing:  (d)=>{d.socios=Math.min(999,(d.socios||8)+4);d.reputacion=Math.min(100,(d.reputacion||0)+3);},
      formacion:  (d)=>{(d.cantera||[]).forEach(r=>Object.keys(r.stats).forEach(k=>r.stats[k]=Math.min(90,(r.stats[k]||30)+2)));},
    },
    budget:{
      invertir:   (d,cost)=>{if(d.presupuesto<cost){showToast('Sin fondos');return false;}d.presupuesto-=cost;d.cohesion=Math.min(100,(d.cohesion||50)+2);d.plantilla.forEach(r=>Object.keys(r.stats).forEach(k=>r.stats[k]=Math.min(95,(r.stats[k]||40)+2)));},
      ahorrar:    (d)=>{d.presupuesto=(d.presupuesto||0)+150;},
      evento:     (d,cost)=>{if(d.presupuesto<cost){showToast('Sin fondos');return false;}d.presupuesto-=cost;d.cohesion=Math.min(100,(d.cohesion||50)+6);d.socios=Math.min(999,(d.socios||8)+2);},
    },
  };
  let msgs=[];
  ['training','focus','budget'].forEach(area=>{
    const optId=sel[area];if(!optId)return;
    const fn=effects[area]?.[optId];if(!fn)return;
    const result=fn(d,costs[optId]||0);
    if(result!==false)msgs.push(optId);
  });
  G._monthlySelections={};
  d.monthlyDecisionDone=true;
  showToast(`✅ Decisiones aplicadas`);
  autoSave();G.screen='clubHub';render();
};

// v96 · Recompensa o penalización del objetivo de temporada (CLUB_OBJECTIVES). La calcula
// la pantalla de balance para enseñarla y la aplica doClubNextSeason() una sola vez.
// Hasta v96 la pantalla sumaba la reputación al pintarse —cada redibujo, otra vez— y los
// socios del objetivo se enseñaban pero no se sumaban nunca.
function clubObjectiveDeltas(d){
  const obj=d&&d.seasonObjective;
  if(!obj)return {rep:0,socios:0,cohesion:0};
  const r=(d.seasonObjectiveMet===true?obj.reward:obj.penalty)||{};
  return {rep:r.rep||0,socios:r.socios||0,cohesion:r.cohesion||0};
}

// v98 · Las cuentas del cierre de temporada, fuera de la pantalla. Vivían dentro de
// renderClubSeasonEnd(), así que el modo dev cerraba con doClubNextSeason(0,0,0): no cobraba
// cuotas ni pagaba sueldos ni staff, y los socios no crecían (el mismo fallo que H19 en
// Clásico). Pura: solo lee. Las fórmulas son las de v97, copiadas tal cual.
function clubSeasonClosing(d){
  const results=d.seasonResults||[];
  const podiums=results.filter(r=>r.pos<=3&&!r.dnf).length;
  const top10=results.filter(r=>r.pos<=10&&!r.dnf).length;
  const wins=results.filter(r=>r.pos===1&&!r.dnf).length;
  const dnfs=results.filter(r=>r.dnf).length;
  const totalPrize=results.reduce((s,r)=>s+(r.prize||0),0);
  const staffCost=Object.keys(d.staff||{}).reduce((s,k)=>s+(CLUB_STAFF_TYPES[k]?CLUB_STAFF_TYPES[k].costMonth*12:0),0);
  const sponsorOutcomes=d.sponsorOutcomes||[];
  const sponsorIncome=sponsorOutcomes.reduce((s,o)=>s+(o.base||0)+(o.bonus||0),0);
  const raceCosts=results.reduce((s,r)=>s+(r.race?.cost||0),0);
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const wages=clubMonthlyWage()*12;
  const socioIncome=Math.round(d.socios*CLUB_SOCIO_FEE*12*(fil&&fil.socioBonus?fil.socioBonus:1));
  // v96: premios, inscripciones y sponsors ya entraron en el presupuesto al simular
  // (doClubSimulateSeason) y este cierre los volvía a sumar: se cobraban dos veces.
  // netBalance es el año entero, para enseñarlo; closing es lo que queda por aplicar.
  const netBalance=socioIncome+totalPrize+sponsorIncome-raceCosts-wages-staffCost;
  const closing=socioIncome-wages-staffCost;
  const socioGain=Math.round((podiums*4+top10*1.5+(d.reputacion/20))*Math.max(0,1-d.socios/CLUB_SOCIOS_SOFT_CAP));   // v96: techo blando
  const socioLoss=results.length===0?3:0;
  return {podiums,top10,wins,dnfs,totalPrize,staffCost,sponsorIncome,raceCosts,wages,socioIncome,netBalance,closing,socioGain,socioLoss};
}

function renderClubSeasonEnd(){
  const el=$main();
  hideChrome();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  const results=d.seasonResults||[];
  const sponsorOutcomes=d.sponsorOutcomes||[];
  const {podiums,wins,dnfs,totalPrize,staffCost,raceCosts,wages,socioIncome,netBalance,closing,socioGain,socioLoss}=clubSeasonClosing(d);

  // C18 — Resultado del objetivo. v96: esta pantalla solo lo ENSEÑA; se aplica una vez en
  // doClubNextSeason(). Antes la reputación se sumaba aquí, en cada redibujo.
  const obj=d.seasonObjective;
  const objMet=d.seasonObjectiveMet===true;
  const {rep:objRepDelta,socios:objSociosDelta}=clubObjectiveDeltas(d);
  const newSocios=Math.max(3,d.socios+socioGain-socioLoss+objSociosDelta);

  // C17 — Narrativa de temporada
  const correvelacion=results.filter(r=>!r.dnf).sort((a,b)=>a.pos-b.pos)[0];
  const corrdecepcion=results.filter(r=>r.dnf).sort((a,b)=>b.pos-a.pos)[0];
  let narrative='';
  if(wins>=2) narrative=`Un año para recordar. ${esc(d.name)} firmó ${wins} victorias y se consolida como referencia del circuito.`;
  else if(wins===1) narrative=`Una victoria que cambia la narrativa del club. El trabajo empieza a dar frutos.`;
  else if(podiums>=3) narrative=`Sin victorias pero con constancia. Tres podios que demuestran que el nivel está ahí.`;
  else if(dnfs>=2) narrative=`Una temporada irregular. Los abandonos pesaron más que los buenos resultados.`;
  else if(d.cohesion>=70) narrative=`Resultados discretos, pero el vestuario nunca estuvo tan unido. La cohesión es el activo del año.`;
  else if(d.cohesion<35) narrative=`El grupo está fragmentado. Sin cohesión interna, los resultados difícilmente pueden mejorar.`;
  else narrative=`Una temporada de transición. Se siembra ahora para recoger en los próximos años.`;

  el.innerHTML=`
    <div style="background:linear-gradient(135deg,#fefcf8,#f5f3ef);border:1px solid var(--line);border-radius:14px;padding:20px 16px;margin-bottom:14px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">${wins>0?'🏆':podiums>0?'🎯':d.cohesion>=70?'🤝':'📋'}</div>
      <h2 style="margin-bottom:4px">Temporada ${d.temporada} — ${esc(d.name)}</h2>
    </div>

    <div class="card" style="margin-bottom:12px;border-left:3px solid #4a90d9">
      <div style="font-size:13px;color:var(--ink2);font-style:italic;margin-bottom:8px">"${narrative}"</div>
      <div style="display:flex;gap:12px;font-size:12px;color:var(--ink3);flex-wrap:wrap">
        ${correvelacion?`<span>⭐ Revelación: <strong>${esc(correvelacion.runner.name.split(' ')[0])}</strong> (#${correvelacion.pos})</span>`:''}
        ${corrdecepcion?`<span>😞 Decepción: <strong>${esc(corrdecepcion.runner.name.split(' ')[0])}</strong> (DNF)</span>`:''}
        <span>🤝 Cohesión final: <strong>${d.cohesion}/100</strong></span>
      </div>
    </div>

    ${obj?`
    <div class="card" style="margin-bottom:12px;border-color:${objMet?'#4a8a2a':'var(--line2)'};border-width:1.5px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:20px">${objMet?'✅':'❌'}</span>
        <div style="flex:1">
          <div style="font-size:12px;color:var(--ink3)">Objetivo de temporada</div>
          <div style="font-size:13px;font-weight:600">${obj.label}</div>
        </div>
        <div style="text-align:right;font-size:12px">
          ${objRepDelta?`<div style="color:${objRepDelta>0?'var(--pos)':'var(--neg)'};font-weight:700">${objRepDelta>0?'+':''}${objRepDelta} rep</div>`:''}
          ${objSociosDelta?`<div style="color:${objSociosDelta>0?'var(--pos)':'var(--neg)'};font-weight:700">${objSociosDelta>0?'+':''}${objSociosDelta} socios</div>`:''}
        </div>
      </div>
    </div>`:''}

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Resultados</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
        ${[['Carreras',results.length],['Victorias',wins],['Podios',podiums],['DNF',dnfs]].map(([l,v])=>`
          <div style="background:var(--soft);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--ink3)">${l}</div>
            <div style="font-size:18px;font-weight:700">${v}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Economía</div>
      <div class="fin-row"><span>Cuotas de socios</span><span class="plus">+€${socioIncome}</span></div>
      <div class="fin-row"><span>Premios en carrera</span><span class="plus">+€${totalPrize}</span></div>
      ${sponsorOutcomes.map(o=>`<div class="fin-row"><span>${esc(o.name)} · ${esc(o.objective||'')} ${o.met?'✅':'❌ rescinde'}</span><span class="plus">+€${(o.base||0)+(o.bonus||0)}</span></div>`).join('')}
      ${raceCosts>0?`<div class="fin-row"><span>Inscripciones</span><span class="minus">−€${raceCosts}</span></div>`:''}
      <div class="fin-row"><span>Salarios plantilla</span><span class="minus">−€${wages}</span></div>
      ${staffCost>0?`<div class="fin-row"><span>Staff técnico</span><span class="minus">−€${staffCost}</span></div>`:''}
      <div class="fin-row tot"><span>Balance neto</span><span class="${netBalance>=0?'plus':'minus'}">${netBalance>=0?'+':''}€${netBalance}</span></div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="sec-title-sm">Evolución del club</div>
      <div class="fin-row"><span>Socios</span><span>${d.socios} → <strong>${newSocios}</strong> ${socioGain>0?`<span class="plus">(+${socioGain})</span>`:''}</span></div>
      <div class="fin-row"><span>Reputación</span><span><strong>${Math.max(0,Math.min(100,(d.reputacion||0)+objRepDelta))}/100</strong>${objRepDelta?` <span class="${objRepDelta>0?'plus':'minus'}">${objRepDelta>0?'+':''}${objRepDelta}</span>`:''}</span></div>
      <div class="fin-row"><span>Presupuesto final</span><span class="${d.presupuesto+closing<0?'minus':''}"><strong>€${d.presupuesto+closing}</strong></span></div>
      ${d.presupuesto+closing<0?`<div class="danger" style="margin-top:8px;font-size:13px">Cierras en números rojos: ${(d.redSeasons||0)+1} de ${CLUB_RED_SEASONS_MAX} temporadas seguidas.</div>`:''}
      <div class="fin-row"><span>Cohesión</span><span style="color:${d.cohesion>=70?'var(--pos)':d.cohesion>=40?'var(--avi)':'var(--neg)'}"><strong>${d.cohesion}/100</strong></span></div>
    </div>

    <button class="main" style="background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="doClubNextSeason(${socioGain},${socioLoss},${closing})">Temporada ${d.temporada+1} →</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="backToMainMenu()">← Menú principal</button>`;
}

// v96 · Fin del Modo Club por quiebra: cinco temporadas seguidas cerrando en rojo.
function renderClubDissolved(){
  const el=$main();
  hideChrome();
  const d=G.clubModeData;
  el.innerHTML=`
    <div style="text-align:center;padding:18px 0 14px">
      <div style="font-size:32px;margin-bottom:6px">🏚️</div>
      <h2>El club se disuelve</h2>
      <p class="sub">${esc(d?.name||'Tu club')}${d?` · ${(d.historial||[]).length} temporadas`:''}</p>
    </div>
    <div class="danger" style="margin-bottom:14px">
      ${CLUB_RED_SEASONS_MAX} temporadas seguidas en números rojos. La junta no encuentra más
      dinero y el club cierra${d?` con una deuda de <strong>€${Math.abs(Math.min(0,d.presupuesto))}</strong>`:''}.
    </div>
    <button class="main" onclick="backToMainMenu()">← Menú principal</button>`;
}

window.doClubNextSeason=(socioGain,socioLoss,netBalance)=>{
  const d=G.clubModeData;if(!d)return;
  // CR-38 (v76): contador acumulado de objetivos cumplidos — logro cm_objective_3
  if(d.seasonObjectiveMet===true)G._clubObjectivesMet=(G._clubObjectivesMet||0)+1;
  // v96: el objetivo se aplica aquí, una sola vez (antes, al pintar el balance)
  const _obj=clubObjectiveDeltas(d);
  d.reputacion=Math.max(0,Math.min(100,(d.reputacion||0)+_obj.rep));
  if(_obj.cohesion)d.cohesion=Math.max(0,Math.min(100,(d.cohesion||50)+_obj.cohesion));
  d.historial.push({
    temporada:d.temporada,socios:d.socios,
    reputacion:d.reputacion,presupuesto:d.presupuesto,
    cohesion:d.cohesion,
    wins:(d.seasonResults||[]).filter(r=>r.pos===1).length,
    podiums:(d.seasonResults||[]).filter(r=>r.pos<=3&&!r.dnf).length,
  });
  const seasonRes=d.seasonResults||[];
  d.socios=Math.max(3,d.socios+socioGain-socioLoss+_obj.socios);   // v96: los socios del objetivo por fin se suman
  // Bonus socios por instalación marketingHQ
  if(d.instalaciones&&d.instalaciones.marketingHQ)d.socios=Math.min(999,d.socios+60);
  d.presupuesto=d.presupuesto+netBalance;   // v96: sin suelo en 0. netBalance = cierre pendiente (cuotas − sueldos − staff)
  // v96 · Sponsors: el que falló su objetivo rescinde; a los evaluados que cumplieron les
  // baja una temporada de contrato, y al acabar vuelven a la lista de disponibles.
  const _evaluados=d.sponsorOutcomes||[];
  d.clubSponsors=(d.clubSponsors||[]).filter(sp=>{
    const o=_evaluados.find(x=>x.id===sp.id);
    if(!o)return true;
    if(!o.met){showToast(`${sp.name} rescinde: objetivo no cumplido`);return false;}
    sp.seasonsLeft=(sp.seasonsLeft||sp.duration||1)-1;
    if(sp.seasonsLeft<=0){showToast(`Termina el contrato con ${sp.name}: puedes volver a firmarlo`);return false;}
    return true;
  });
  d.sponsorOutcomes=[];d.monthlyDecisionDone=false;
  // v96 · Quiebra en cinco temporadas (decisión del 2026-09-15). Cuenta el presupuesto
  // FINAL negativo en temporadas seguidas, no el neto del año: un club que empieza con
  // capital puede perder dinero sin estar en rojo. cada una: −10 cohesión · 3.ª: fuera
  // el staff · 4.ª: se va el corredor más caro · 5.ª: el club se disuelve. Una temporada
  // cerrada en positivo pone el contador a cero.
  if(d.presupuesto<0){
    d.redSeasons=(d.redSeasons||0)+1;
    if(d.redSeasons>=CLUB_RED_SEASONS_MAX){d.dissolved=true;G.screen='clubDissolved';autoSave();render();return;}
    d.cohesion=Math.max(0,(d.cohesion||50)-10);
    if(d.redSeasons>=3&&Object.keys(d.staff||{}).length){d.staff={};showToast('Números rojos: se despide a todo el staff');}
    if(d.redSeasons===4&&d.plantilla.length>1){
      const i=d.plantilla.reduce((best,r,j,arr)=>(r.currentSalary||r.salary)>(arr[best].currentSalary||arr[best].salary)?j:best,0);
      const gone=d.plantilla.splice(i,1)[0];
      showToast(`Números rojos: ${gone.name} se va del club`);
    }
    // BUG-12 (v96): el −10 se aplica en todas, pero el aviso solo salía en las dos primeras.
    showToast(`Números rojos (${d.redSeasons}/${CLUB_RED_SEASONS_MAX}): ${d.redSeasons<3?'los sueldos llegan tarde':'el vestuario lo nota'}, −10 cohesión`);
  } else d.redSeasons=0;
  d.temporada++;
  d.calAssignments={};d.seasonResults=[];d.seasonSimulated=false;
  d.pendingEvent=null;d.seasonObjective=null;d.seasonObjectiveMet=null;

  // C7 — Progresión real según potencial, edad y staff
  const hasEntrenador=d.staff&&d.staff.entrenador;
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  // C1: actualizar historial de corredor
  const growAll=[...d.plantilla,...(d.cantera||[])];
  growAll.forEach(r=>{
    r.age=(r.age||20)+1;
    r.seasonsInClub=(r.seasonsInClub||0)+1;
    const rWins=seasonRes.filter(x=>x.runner&&x.runner.id===r.id&&x.pos===1&&!x.dnf).length;
    const rPodiums=seasonRes.filter(x=>x.runner&&x.runner.id===r.id&&x.pos<=3&&!x.dnf).length;
    const rDnfs=seasonRes.filter(x=>x.runner&&x.runner.id===r.id&&x.dnf).length;
    r.careerWins=(r.careerWins||0)+rWins;
    r.careerPodiums=(r.careerPodiums||0)+rPodiums;
    r.careerDnfs=(r.careerDnfs||0)+rDnfs;
    const isYouth=r.age<=22;
    const base=r.potential==='alto'?(isYouth?4:3):r.potential==='medio'?2:0;
    const isCantera=r.role==='promesa';
    const coef=(isCantera||isYouth)?CLUB_ROLES.promesa.growthBonus:1;
    // Foco «Formación» del hub: la cantera crece un 20 % más rápido. Lo prometía y nada lo leía.
    const focusCoef=d.monthlyFocus==='formacion'&&(d.cantera||[]).includes(r)?1.2:1;
    const staffCoef=hasEntrenador?CLUB_STAFF_TYPES.entrenador.growthBonus:1;
    const cap=r.potential==='alto'?95:r.potential==='medio'?88:82;
    Object.keys(r.stats).forEach(k=>{
      let delta=Math.floor(Math.random()*(base+1))*coef*staffCoef*focusCoef;
      // Filosofía: extra en el stat clave
      if(fil&&k===fil.statGrowthKey)delta+=1;
      // Declive para veteranos (+35 años)
      if(r.age>35)delta-=Math.floor(Math.random()*2);
      r.stats[k]=Math.max(10,Math.min(cap,(r.stats[k]||40)+Math.round(delta)));
    });
    // Promover cantera a plantilla si son suficientemente buenos
    if(isCantera&&r.age>=22){
      const avgStat=Object.values(r.stats).reduce((s,v)=>s+v,0)/Object.values(r.stats).length;
      if(avgStat>=55){
        d.plantilla.push({...r,role:'normal'});
        d.cantera=d.cantera.filter(c=>c.id!==r.id);
        G._clubCanteraPromoted=true; // CR-38 (v76): logro cm_cantera_promote
        showToast(`🎓 ${r.name} sube a la plantilla principal`);
      }
    }
  });

  // C14 — Rivales crecen y pueden generar eventos
  if(d.rivalClubs){
    d.rivalClubs.forEach(r=>{
      r.rep=Math.min(100,(r.rep||20)+Math.floor(Math.random()*5)+2);
      r.socios=Math.min(500,(r.socios||10)+Math.floor(Math.random()*8)+3);
    });
    // ¿Algún rival intenta llevarse a un corredor?
    const topRival=d.rivalClubs.find(r=>r.rep>d.reputacion+15);
    if(topRival&&d.plantilla.length>2&&Math.random()<0.3){
      const target=d.plantilla.find(r=>r.potential==='alto');
      if(target){
        d.pendingEvent={
          title:`${topRival.name} quiere ficharte a ${target.name}`,
          options:[
            {text:`Ofrecerle renovación (+€${Math.round(target.currentSalary*0.2)}/mes)`,repDelta:5,salaryIncrease:true,cost:target.currentSalary*0.2*12},
            {text:'Dejarle ir — el club no puede retenerle a cualquier precio',repDelta:-8,loseRunner:true},
          ]
        };
      }
    }
  }

  // C2: renegociación salarial — corredores con ≥1 temporada en el club
  if(!d.pendingEvent){
    const renegCandidates=d.plantilla.filter(r=>(r.seasonsInClub||0)>=1&&(r.careerPodiums||0)>0);
    const chosen=renegCandidates.length?renegCandidates[Math.floor(Math.random()*renegCandidates.length)]:null;
    if(chosen&&Math.random()<0.4){
      const increase=Math.round((chosen.currentSalary||chosen.salary)*0.2/10)*10;
      const risk=chosen.potential==='alto'?'alto':'medio';
      d.pendingEvent={
        title:`${chosen.name.split(' ')[0]} pide una revisión salarial`,
        body:`Lleva ${chosen.seasonsInClub} temporada${chosen.seasonsInClub>1?'s':''} en el club y ha conseguido ${chosen.careerPodiums} podio${chosen.careerPodiums>1?'s':''}. Pide +€${increase}/mes. Riesgo de marcharse: ${risk}.`,
        options:[
          {text:`Aceptar (+€${increase}/mes para ${chosen.name.split(' ')[0]})`,repDelta:3,cohesionDelta:4,salarySpecificIncrease:true,targetId:chosen.id,increaseAmount:increase},
          {text:`Negociar — solo la mitad (+€${Math.round(increase/2)}/mes)`,   // DS04 (v95): iba entre comillas simples y se pintaba el ${…} literal
          repDelta:1,cohesionDelta:0,salarySpecificIncrease:true,targetId:chosen.id,increaseAmount:Math.round(increase/2)},
          {text:'Rechazar — el presupuesto no da para más',repDelta:-3,cohesionDelta:-6,loseRunnerById:chosen.id,loseChance:risk==='alto'?0.5:0.2},
        ]
      };
    }
  }
  if(!d.pendingEvent)generateClubEvent();
  generateClubObjective();
  checkAndUnlockAchievements(); // CR-38 (v76): logros de Club — antes no se comprobaban nunca en este modo
  G.screen='clubHub';autoSave();render();
};

function renderClubEvent(){
  const el=$main();
  const d=G.clubModeData;if(!d||!d.pendingEvent){G.screen='clubHub';render();return;}
  const ev=d.pendingEvent;
  el.innerHTML=`
    <div style="text-align:center;padding:14px 0 10px">
      <div style="font-size:28px;margin-bottom:6px">📣</div>
      <h2 style="margin-bottom:4px">Evento del club</h2>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div style="font-size:15px;font-weight:700;margin-bottom:10px">${esc(ev.title)}</div>
      ${ev.body?`<div style="font-size:13px;color:var(--ink2);margin-bottom:12px;line-height:1.55">${esc(ev.body)}</div>`:''}
      ${ev.options.map((opt,i)=>`
        <button class="main" style="margin-top:${i===0?'0':'8px'};text-align:left" onclick="doClubEvent(${i})">
          <div style="font-weight:500">${esc(opt.text)}</div>
          <div style="font-size:12px;color:var(--ink3);margin-top:2px">
            ${opt.repDelta>0?`+${opt.repDelta} rep `:opt.repDelta<0?`${opt.repDelta} rep `:''}
            ${opt.sociosDelta>0?`+${opt.sociosDelta} socios `:opt.sociosDelta<0?`${opt.sociosDelta} socios `:''}
            ${opt.cost?`−€${opt.cost} `:''}${opt.income?`+€${opt.income} `:''}
          </div>
        </button>`).join('')}
    </div>`;
}

window.doClubEvent=idx=>{
  const d=G.clubModeData;if(!d||!d.pendingEvent)return;
  const ev=d.pendingEvent;
  const opt=ev.options[idx];if(!opt)return;
  if(opt.repDelta)d.reputacion=Math.max(0,Math.min(100,(d.reputacion||0)+opt.repDelta));
  if(opt.sociosDelta)d.socios=Math.max(3,(d.socios||8)+opt.sociosDelta);
  if(opt.cohesionDelta)d.cohesion=Math.max(0,Math.min(100,(d.cohesion||50)+opt.cohesionDelta));
  if(opt.cost)d.presupuesto=Math.max(0,(d.presupuesto||0)-opt.cost);
  if(opt.income)d.presupuesto=Math.max(0,(d.presupuesto||0)+opt.income);
  if(opt.addRunner){
    const inIds=d.plantilla.map(r=>r.id);
    const avail=CLUB_RUNNER_POOL.filter(r=>!inIds.includes(r.id));
    if(avail.length&&d.plantilla.length<6){
      const newR={...avail[0],stats:{...avail[0].stats},currentSalary:avail[0].salary};
      d.plantilla.push(newR);
      showToast(`${newR.name} se une al club`);
    }
  }
  if(opt.salaryIncrease&&d.plantilla.length>0){
    const leavingIdx=Math.floor(Math.random()*d.plantilla.length);
    d.plantilla[leavingIdx].currentSalary=(d.plantilla[leavingIdx].currentSalary||d.plantilla[leavingIdx].salary)+50;
  }
  if(opt.salarySpecificIncrease&&opt.targetId){
    const tr=d.plantilla.find(r=>r.id===opt.targetId);
    if(tr){tr.currentSalary=(tr.currentSalary||tr.salary)+(opt.increaseAmount||0);showToast(`${tr.name.split(' ')[0]}: +€${opt.increaseAmount}/mes`);}
  }
  if(opt.loseRunner&&d.plantilla.length>2){
    const leavingIdx=Math.floor(Math.random()*d.plantilla.length);
    const leaving=d.plantilla.splice(leavingIdx,1)[0];
    showToast(`${leaving.name} se va al club rival`);
  }
  if(opt.loseRunnerById&&d.plantilla.length>2){
    if(Math.random()<(opt.loseChance||0.3)){
      const idx=d.plantilla.findIndex(r=>r.id===opt.loseRunnerById);
      if(idx>=0){const leaving=d.plantilla.splice(idx,1)[0];showToast(`${leaving.name} se va — no aceptó la oferta`);}
    }
  }
  let toastMsg=opt.repDelta>0?`+${opt.repDelta} reputación`:opt.repDelta<0?`${opt.repDelta} reputación`:'Decisión tomada';
  showToast(toastMsg);
  d.pendingEvent=null;
  autoSave();G.screen='clubHub';render();
};

