// ═══════════════════════════════════════════════════════════════════════════
//  RENDER · CLÁSICO Y EXPRÉS — las pantallas de jugar una temporada
// ═══════════════════════════════════════════════════════════════════════════
// T53 (v92) · segunda de las tres piezas de render.js. Ver render-core.js.
//
// Todo lo que el corredor toca DURANTE la temporada:
//   · las cuatro pestañas (calendario, finanzas, corredor, fama)
//   · el arranque: jornada laboral, club, inicio de temporada
//   · elegir carreras, patrocinadores, bloque de entrenamiento y circuitos
//   · la preparación de carrera y lo que pasa entre una carrera y la siguiente
//   · el modo Exprés entero, que es una variante de este mismo ciclo
//
// El cierre de temporada y el arco narrativo NO están aquí: van en
// render-temporada.js.

// ── Club de Clásico (bonus de entrenamiento) — no confundir con G.clubModeData ──
// Movido aquí desde js/coach.js el 2026-09-04 (split club.js/coach.js); usa clubRepLabel()/changeClubRep()/assignClubCompanion() de este mismo archivo/state.js.
function renderClubSetup(){
  const el=$main();
  const currentClub=G.club||CLUBS[0];
  const rep=G.clubReputation||0;
  const repInfo=clubRepLabel();
  const companion=G.clubCompanion;
  const fromBetween=G._clubFromBetween||false;

  // Paso 6 de la dirección visual (2026-10-30): tipo Decisión: el club actual como tarjeta de
  // estado (reputación con el umbral de la Copa) y los clubes como opciones. Sin hex.
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-gente">${icono('corredor')}Gente · club</div>
    <div class="pz-titulo">Elige tu club</div>
    <p class="pz-sub">El club define tu entorno de entrenamiento y red de apoyo.</p>
    ${currentClub.id!=='none'?`<div class="pz-tarjeta pz-estado">
      <div class="pz-linea"><span class="pz-fila-txt"><span class="pz-label">Club actual</span><div><b>${esc(currentClub.name)}</b>${companion?` <span class="pz-efectos">· tu compañero: ${esc(companion)}</span>`:''}</div></span></div>
      <div class="pz-linea" style="display:block">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span class="pz-label">Reputación</span><span class="pz-num">${repInfo.text}</span></div>
        <div class="pz-barra"><div class="pz-relleno" style="width:${rep}%;background:var(--gente)"></div><div class="pz-umbral" style="left:75%"></div></div>
        <div class="pz-efectos" style="margin-top:4px">${rep>=75?'<span class="pz-mas">✓</span> Reputación suficiente para la Copa de Clubes':'A 75, la Copa de Clubes'}</div>
      </div>
    </div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Opciones disponibles</div>
    ${CLUBS.filter(c=>c.id==='none'||(c.minYear||1)<=G.year).map(c=>{
      const isActive=currentClub.id===c.id;
      const bonuses=Object.entries(c.statBonus).map(([k,v])=>`${k.charAt(0).toUpperCase()+k.slice(1)} <span class="pz-mas">+${v}</span>`).join(' · ');
      const perks=[c.hasFisio?'Fisio incluido':'',c.hasEntrenador?'Entrenador incluido':''].filter(Boolean);
      return `<div class="pz-opcion${isActive?' sel':''}" ${isActive?'':`onclick="selectClub('${c.id}')"`}>
        <span style="float:right;text-align:right">${c.cost>0?`<span class="pz-num" style="font-size:16px">€${c.cost}/mes</span><div class="pz-efectos">€${c.cost*12}/año</div>`:'<span class="pz-efectos">Gratis</span>'}</span>
        <b>${c.name}</b>${isActive?' <span class="pz-chip" style="background:var(--soft);margin:0">Actual</span>':''}
        <div class="pz-efectos">${c.desc}</div>
        ${bonuses?`<div class="pz-efectos" style="margin-top:4px">${bonuses}</div>`:''}
        ${perks.length?`<div class="pz-efectos">${perks.join(' · ')}</div>`:''}
      </div>`;}).join('')}
    <button class="pz-btn sec" style="margin-top:4px" onclick="${fromBetween?`G._clubFromBetween=false;G.screen='betweenManage'`:`G.screen='seasonStart'`};render()">← Volver</button>
  </div>`;
}

window.selectClub=id=>{
  const club=CLUBS.find(c=>c.id===id);
  if(!club)return;
  if((club.minYear||1)>G.year){showToast('Disponible a partir del año '+club.minYear);return;}
  const prev=G.club||CLUBS[0];
  if(prev.id!=='none'&&prev.id!==id&&id!=='none'){
    G.clubReputation=Math.max(0,(G.clubReputation||0)-20);
  } else if(id==='none'){
    G.clubReputation=0;
  }
  G.club=club;
  G.clubCompanion=assignClubCompanion(club);
  const msg=id==='none'?'Sin club — independiente':
    G.clubCompanion?`Te unes a ${club.name}. Tu compañero: ${G.clubCompanion}`:`Te unes a ${club.name}`;
  showToast(msg);
  render();
};
// ── CALENDAR TAB ───────────────────────
// NOTA-04 (v96): «📩 Invitación» solo salía en la pestaña del calendario, y no distinguía
// la del organizador (evento entre carreras) de la que abre la reputación (umbral de
// seguidores). Mismo distintivo en la pestaña, la selección de inicio y la de mitad de temporada.
function inviteBadge(r){
  const ev=(G.selectedRaces||[]).some(s=>s.id===r.id&&s._invite);
  const rep=(G.repInvitations||[]).some(i=>i.id===r.id);
  if(!ev&&!rep)return '';
  return `<span class="pz-chip mas" style="margin:0">📩 ${ev?'Invitación del organizador':'Invitación por reputación'}</span>`;
}
// Paso 6 de la dirección visual (2026-10-30): pestaña Calendario, tipo Lista (solo lectura):
// trimestres en tarjeta, carreras en filas con casilla y nivel en grises. Sin hex.
function renderCalendarTab(){
  const el=$main();
  const selIds=G.selectedRaces.map(r=>r.id);
  const specRaces=getSpecRaces();
  const qLabel={1:'Primer trimestre',2:'Segundo trimestre',3:'Tercer trimestre',4:'Cuarto trimestre'};
  const canAccess=canAccessRace;   // DS08 (v95)
  function circuitBadge(raceId){
    for(const cid of G.joinedCircuits){
      const c=CIRCUITS_DB.find(x=>x.id===cid);
      if(c&&c.raceIds.includes(raceId))return `<span class="pz-chip" style="background:var(--soft);margin:0">Liga · ~${circuitPoints(3,15)} pts</span>`;
    }
    return '';
  }
  function calRaceRow(r){
    const isSel=selIds.includes(r.id);
    const isLocked=!canAccess(r);
    const isInvited=!!(G.repInvitations||[]).find(i=>i.id===r.id);
    return `<div class="pz-fila${isLocked?' pz-bloqueado':''}" style="align-items:flex-start;border:none;border-top:1px solid var(--line)">
      <input type="checkbox" class="pz-casilla" style="pointer-events:none;margin-top:2px" ${isSel?'checked':''} disabled tabindex="-1" aria-hidden="true">
      <span class="pz-fila-txt"><span style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><b>${esc(r.name)}</b>${nivelTag(r.tier)}${circuitBadge(r.id)}${r.spec?`<span class="pz-chip" style="margin:0;border:1px solid var(--acc)">★ ${r.spec}</span>`:''}${inviteBadge(r)}</span>
        <div class="pz-efectos">${r.monthName} · ${r.type} · ${raceDesnivel(r)}${isInvited?' · ranking no requerido':''}</div>
        ${isLocked?motivoHTML('Ranking #'+r.reqRanking+' requerido'):''}</span>
    </div>`;
  }
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-carrera">${icono('calendario')}Carrera · temporada ${G.year}</div>
    <div class="pz-titulo">Calendario ${G.year}</div>
    <p class="pz-sub">Tu temporada de un vistazo.</p>
    ${G.joinedCircuits.length>0?`<div class="pz-diag" style="margin-bottom:12px">🏆 Liga activa — las carreras con «Liga» suman puntos al circuito</div>`:''}
    ${QUARTERS.map(q=>{
      const common=RACES_DB.filter(r=>r.quarter===q.n);
      const spec=specRaces.filter(r=>r.quarter===q.n);
      const allQ=[...common,...spec];
      const qSel=allQ.filter(r=>selIds.includes(r.id)).length;
      const hasLeague=allQ.some(r=>G.joinedCircuits.some(cid=>CIRCUITS_DB.find(c=>c.id===cid)?.raceIds.includes(r.id)));
      const isOpen=(G.openQuarters?.tab||[]).includes(q.n);
      return `<div class="pz-tarjeta" style="padding:0;overflow:hidden">
        <div class="pz-fila navega" style="padding:12px 14px;border:none;${qSel>0?'box-shadow:inset 3px 0 0 var(--acc)':''}" onclick="toggleQTab(${q.n})">
          <span class="pz-fila-txt"><b>${qLabel[q.n]}</b> <span class="pz-efectos">· ${q.months}</span></span>
          ${hasLeague?'<span>🏆</span>':''}${qSel>0?`<span class="pz-fila-dato">${qSel} ✓</span>`:''}
        </div>
        ${isOpen?`<div style="padding:0 14px 8px" onclick="event.stopPropagation()">
          ${common.map(r=>calRaceRow(r)).join('')}
          ${spec.length>0?`<div class="pz-label" style="padding:10px 0 2px">★ Específicas de tu especialidad</div>${spec.map(r=>calRaceRow(r)).join('')}`:''}
        </div>`:''}
      </div>`;}).join('')}
    ${G.trainingBlock?`<div class="pz-tarjeta"><div class="pz-label">Bloque de entrenamiento</div><b>${G.trainingBlock.name}</b><div class="pz-efectos">${G.trainingBlock.desc}</div></div>`
      :`<div class="pz-efectos" style="text-align:center;padding:12px 0">Bloque de entrenamiento por elegir</div>`}
  </div>`;
}

window.toggleQTab=q=>{
  if(!G.openQuarters)G.openQuarters={cal:[],mid:[],tab:[]};
  const arr=G.openQuarters.tab;
  const idx=arr.indexOf(q);
  if(idx>=0)arr.splice(idx,1);else arr.push(q);
  render();
};

// ── FINANCES TAB ───────────────────────
function renderFinancesTab(){
  const el=$main();
  const wo=WORK_OPTIONS.find(o=>o.pct===currentWorkPct())||WORK_OPTIONS[0]; // T22 (v89)
  const workM=monthlyWorkIncome();
  const sponsorM=monthlySponsorIncome();
  const brandM=monthlyBrandIncome();
  const clubM=G.club?.cost||0;
  const staffM=monthlyStaffCost();   // H19 (v95): va dentro de monthlyNet()
  const netM=monthlyNet();
  const workA=workM*12;
  const sponsorA=sponsorAnnual();
  const brandA=brandM*12;
  const fixedA=FIXED_COSTS.total*12;
  const clubA=clubM*12;
  const netA=netM*12;
  const raceCosts=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
  const staffA=staffM*12;
  const netAfterRaces=netA-raceCosts;
  const savingsEnd=Math.max(0,G.money+netAfterRaces);
  const savingsPct=Math.min(100,Math.round(savingsEnd/(G.money+Math.abs(netAfterRaces)+1)*100));

  // Paso 6 de la dirección visual (2026-10-30): tipo Resumen, referencia «Finanzas» (§ 7):
  // ahorros y proyección arriba, con su diagnóstico; las cuentas en filas. Sin hex.
  const F=(txt,v)=>`<div class="pz-fila"><span class="pz-fila-txt">${txt}</span><span class="pz-fila-dato ${v>=0?'pz-mas':'pz-menos'}">${fmtEur(v,true)}</span></div>`;
  const T=(txt,v)=>`<div class="pz-fila" style="font-weight:600"><span class="pz-fila-txt">${txt}</span><span class="pz-fila-dato ${v>=0?'pz-mas':'pz-menos'}" style="font-size:18px">${fmtEur(v,true)}</span></div>`;
  const fin=G.money+netAfterRaces;
  const brandEligible=canLaunchBrand()&&G.gameMode!=='expres';
  const canHireEmployee=G.ownBrand&&!G.ownBrand.hasEmployee&&(G.year>=G.ownBrand.launched+2);
  let brandSection='';
  if(G.ownBrand){
    const yearsActive=G.year-G.ownBrand.launched;
    brandSection=`<div class="pz-label" style="margin:14px 0 6px">👟 Tu marca — ${G.ownBrand.hasEmployee?'consolidada':'activa'}</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${G.ownBrand.hasEmployee?F('Ingresos brutos de la marca',1300)+F('Coste del empleado',-700)+T('Neto de la marca',600)
        :F('Ingresos de la marca',300)}
      <div class="pz-fila"><span class="pz-diag ${G.ownBrand.hasEmployee?'mas':'ojo'}">${G.ownBrand.hasEmployee?'Empleado contratado — sin coste de horas de entrenamiento':'Consume 6 h/semana de tu tiempo de entrenamiento'}</span></div>
      ${!G.ownBrand.hasEmployee?(canHireEmployee?`<div style="padding:8px 0"><button class="pz-btn sec" onclick="doHireEmployee()">Contratar empleado — €700/mes · recuperas 6 h de entreno</button></div>`:`<div class="pz-fila">${motivoHTML('Podrás contratar empleado a partir del año '+(G.ownBrand.launched+2))}</div>`):''}
      <div class="pz-efectos" style="padding:6px 0 10px">Marca lanzada el año ${G.ownBrand.launched} · ${yearsActive} temporada${yearsActive!==1?'s':''} activa${yearsActive!==1?'s':''}</div>
    </div>`;
  } else if(brandEligible){
    brandSection=`<div class="pz-opcion${G.money>=2500?'':' pz-bloqueado'}" style="margin-top:14px" ${G.money>=2500?'onclick="doLaunchBrand()"':''}>
      <b>👟 Lanzar tu propia marca</b>
      <div class="pz-efectos">Desbloqueable ahora que tienes nombre en el circuito. Inversión inicial de <span class="pz-num">€2.500</span> — genera <span class="pz-mas">+€300/mes</span> aunque consume 6 h/semana de entrenamiento.</div>
      <div class="pz-efectos">A los 2 años puedes contratar un empleado (€700/mes) y recuperar las horas de entrenamiento.</div>
      ${G.money>=2500?'':motivoHTML('Te faltan €'+(2500-G.money))}
    </div>`;
  }
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-dinero">${icono('finanzas')}Dinero · temporada ${G.year}</div>
    <div class="pz-titulo">Finanzas</div>
    <p class="pz-sub">${esc(G.runner.name||'Corredor')}</p>
    <div class="pz-tarjeta">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div class="pz-label">Ahorros</div><div class="pz-num" style="font-size:30px">${fmtEur(G.money)}</div></div>
        <div><div class="pz-label">Al cerrar la temporada</div><div class="pz-num ${fin>=G.money?'pz-mas':'pz-menos'}" style="font-size:30px">${fmtEur(Math.max(0,fin))}</div></div>
      </div>
      <div class="pz-barra" style="margin:10px 0 8px"><div class="pz-relleno${netAfterRaces<0?' menos':''}" style="width:${Math.min(100,savingsPct)}%;${netAfterRaces>=0?'background:var(--dinero)':''}"></div></div>
      ${netAfterRaces<0?`<div class="pz-diag menos">Con la configuración actual perderás <span class="pz-num">€${Math.abs(netAfterRaces)}</span> esta temporada. Considera aumentar la jornada laboral o reducir gastos.</div>`
        :netM>=0?`<div class="pz-diag mas">Vas bien. La temporada cierra con superávit. Puedes valorar reducir jornada laboral para entrenar más.</div>`
        :`<div class="pz-diag ojo">El mes sale en negativo, aunque el año cierra en positivo.</div>`}
    </div>
    ${debtPanel()}
    <div class="pz-label" style="margin:14px 0 6px">Cada mes</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${workM>0?F(`Trabajo (${wo.label})`,workM):''}
      ${sponsorM>0?F('Patrocinios',sponsorM):''}
      ${brandM>0?F('Tu marca 👟',brandM):''}
      ${F('Gastos fijos de vida',-FIXED_COSTS.total)}
      ${clubM>0?F(`Club (${esc(G.club?.name||'')})`,-clubM):''}
      ${staffM>0?F('Staff (fisio, entrenador, suplementos)',-staffM):''}
      ${T('Neto mensual',netM)}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Proyección del año</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${workA>0?F('Ingresos de trabajo',workA):''}
      ${sponsorA>0?F('Ingresos de patrocinios',sponsorA):''}
      ${brandA>0?F('Tu marca (neto)',brandA):''}
      ${F('Gastos fijos (12 meses)',-fixedA)}
      ${clubA>0?F('Club',-clubA):''}
      ${raceCosts>0?F('Inscripciones',-raceCosts):''}
      ${staffA>0?F('Staff (12 meses)',-staffA):''}
      ${T('Resultado del año',netAfterRaces)}
    </div>
    ${brandSection}
  </div>`;
}

// ── RUNNER TAB ─────────────────────────
function renderRunnerTab(){
  const el=$main();
  const load=getBodyLoad();const lt=getLoadThresholdsByMode();
  const r=G.runner;
  const specLabel=SPEC_LABEL;
  const activeSponsorList=Object.entries(G.sponsors).filter(([,v])=>v);
  const _fin=finishedResults(G.careerHistory);   // v96: careerHistory trae también los DNF
  const totalRaces=_fin.length;
  const wins=_fin.filter(h=>h.pos===1).length;
  const podiums=_fin.filter(h=>h.pos<=3).length;
  el.innerHTML=`
    <div class="runner-header">
      <div class="runner-avatar">🏃</div>
      <div>
        <h2 style="margin-bottom:4px">${esc(r.name||'Corredor')}</h2>
        <div style="font-size:13px;color:var(--ink3);margin-bottom:6px">${specLabel[r.specialty]} · Año ${G.year}${r.age?' · '+r.age+' años':''}</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="rank-badge rank-global">Global #${G.ranking<900?G.ranking:'—'}</span>
          <span class="rank-badge rank-spec">${specLabel[r.specialty]} #${G.specRanking<900?G.specRanking:'—'}</span>
          <button onclick="G._achPrev=G.screen;G._achPrevTab=G.activeTab;G.screen='achievements';render()" style="padding:2px 8px;border-radius:20px;border:1px solid var(--line);background:var(--card);font-size:12px;cursor:pointer;color:var(--ink3);line-height:1.6" title="Ver logros">🏅</button>
        </div>
      </div>
    </div>
    ${(()=>{const ad=agingDeg();if(ad<=0)return '';const pct=Math.round(ad*100);if(pct>=32)return `<div class="danger">El cuerpo ya no responde como antes. Cada carrera cuesta más y los geles hacen menos efecto. El monte sigue siendo tuyo, pero en tus términos.</div>`;if(pct>=16)return `<div class="warn">Con ${r.age} años el cuerpo nota el paso del tiempo. Más cansancio, recuperación más lenta, rivales que se alejan un poco más.</div>`;return `<div class="hint">A los ${r.age} años el desgaste empieza a notarse. Nada grave aún, pero el cuerpo ya no es el mismo de hace unos años.</div>`;})()}

    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Carga corporal</span>
        <span style="font-size:14px;font-weight:700;color:${load>=lt.warningLevel2?'var(--neg)':load>=lt.warningLevel1?'var(--avi)':'var(--pos)'}">${load}%</span>
      </div>
      <div class="load-bar-track"><div class="bar-fill" style="width:${load}%;background:${load>=lt.warningLevel2?'var(--neg)':load>=lt.warningLevel1?'var(--avi-bar)':'var(--cuerpo)'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink3);margin-top:4px">
        <span>0%</span><span style="color:var(--avi)">${lt.warningLevel1}% riesgo</span><span style="color:var(--neg)">100% lesión</span>
      </div>
      ${(()=>{const w=getLoadWarningMsg(load);return w.msg?`<div style="font-size:12px;color:${w.color};margin-top:6px">${w.msg}</div>`:`<div style="font-size:12px;color:var(--pos);margin-top:6px">✓ Carga bajo control</div>`;})()}
    </div>

    <div class="card">
      <div class="sec-title">Stats actuales</div>
      ${G.lastRaceGains&&G.lastRaceGains.length>0?`
        <div style="background:var(--soft);border-radius:var(--border-radius-md);padding:9px 12px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--pos-i);margin-bottom:5px">Ganado en la última carrera</div>
          <div style="font-size:13px;color:var(--pos)">${G.lastRaceGains.map(({k,v})=>'+'+v+' '+k.charAt(0).toUpperCase()+k.slice(1)).join(' &nbsp;·&nbsp; ')}</div>
        </div>`:''}
      ${Object.entries(r.stats).map(([k,v])=>{
        const eff=getEffStat(k);
        const bonus=eff-v;
        const label=k.charAt(0).toUpperCase()+k.slice(1);
        return `<div class="bar-row">
          <span class="bar-label">${label}</span>
          <div class="bar-track" style="flex:1">
            <div class="bar-fill" style="width:${Math.min(100,eff)}%;background:${eff>=70?'var(--pos)':eff>=50?'var(--cuerpo)':eff>=35?'var(--avi-bar)':'var(--neg)'}"></div>
          </div>
          <span class="bar-pct">${Math.round(v)}${bonus>0?'<span style="font-size:12px;color:var(--pos)"> +'+Math.round(bonus)+'</span>':''}</span>
        </div>`;}).join('')}
      <div style="font-size:12px;color:var(--ink3);margin-top:8px">El número en verde es el bonus de sponsors y club activos.</div>
    </div>

    <div class="card">
      <div class="sec-title">Resumen de carrera</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div><div style="font-size:22px;font-weight:700">${totalRaces}</div><div style="font-size:12px;color:var(--ink3)">Carreras</div></div>
        <div><div style="font-size:22px;font-weight:700;color:var(--avi)">${wins}</div><div style="font-size:12px;color:var(--ink3)">Victorias</div></div>
        <div><div style="font-size:22px;font-weight:700;color:var(--pos)">${podiums}</div><div style="font-size:12px;color:var(--ink3)">Podios</div></div>
      </div>
    </div>

    ${G.yearObjective?`<div class="card">
      <div class="sec-title">Objetivo de temporada</div>
      ${(()=>{
        const obj=checkYearObjectiveMet();
        if(!obj)return '';
        const pct=Math.min(100,Math.round((obj.actual/obj.target)*100));
        const color=obj.met?'var(--pos)':'var(--avi-bar)';
        return `<div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:13px;font-weight:600">${obj.label}</span>
            <span style="font-size:12px;color:var(--ink3)">${obj.actual}/${obj.target}</span>
          </div>
          <div style="height:6px;background:var(--trk);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width .3s"></div>
          </div>
          ${obj.met?`<div style="font-size:12px;color:var(--pos);font-weight:600;margin-top:6px">✓ Cumplido · +€${obj.reward}</div>`:`<div style="font-size:12px;color:var(--avi);margin-top:6px">En progreso...</div>`}
        </div>`;
      })()}
    </div>`:''}

    ${injurySequelText()?`<div class="note" style="margin-bottom:12px">🩹 <strong>Secuela de lesión</strong>: ${injurySequelText()}. Se recupera con cada carrera, en pretemporada y con las sesiones de recuperación; el fisio lo acelera.</div>`:''}
    ${G.careerHistory.length>0?`<div class="card">
      <div class="sec-title">Evolución ranking</div>
      ${renderRankingChart()}
    </div>`:''}

    <div class="card">
      <div class="sec-title">Proyección ahorros</div>
      ${renderSavingsChart()}
    </div>

    ${(()=>{
      const RARITY={easy:{c:'var(--ink2)',bg:'var(--soft)',l:'Fácil'},medium:{c:'var(--ink)',bg:'var(--tier-regional)',l:'Medio'},hard:{c:'var(--card)',bg:'var(--tier-nacional)',l:'Difícil'},legendary:{c:'var(--card)',bg:'var(--tier-elite)',l:'Legendario'}};   // la escala de grises de los tiers
      const rb=a=>{const r=RARITY[a.rarity]||{c:'var(--ink3)',bg:'var(--soft)',l:''};return`<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:${r.bg};color:${r.c}">${r.l}</span>`;};
      const meta=G.achievementMeta||{};
      const unlocked=G.unlockedAchievements||[];
      const normalAchs=ACHIEVEMENTS.filter(a=>!a.mode);
      const unlockedNormal=normalAchs.filter(a=>unlocked.includes(a.id));
      const pendingNormal=normalAchs.filter(a=>!unlocked.includes(a.id));
      const recent=unlockedNormal.slice(-3).reverse();
      return`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${recent.length>0?'10px':'0'}">
        <div class="sec-title" style="margin-bottom:0">Logros (${unlockedNormal.length}/${normalAchs.length})</div>
        <button class="secondary" style="font-size:11px;padding:3px 10px" onclick="G.screen='achievements';render()">Ver todos →</button>
      </div>
      ${recent.map(ach=>`<div style="padding:7px 0;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
        <span style="font-size:15px">🏆</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:1px"><span style="font-size:13px;font-weight:600">${esc(ach.label)}</span>${rb(ach)}${meta[ach.id]?`<span style="font-size:11px;color:var(--ink3)">${MODE_LABELS[meta[ach.id].difficulty]?modeEmoji(meta[ach.id].difficulty):''}</span>`:''}</div>
          <div style="font-size:12px;color:var(--ink3)">${esc(ach.desc)}</div>
        </div>
      </div>`).join('')}
      ${pendingNormal.length>0?`<div style="padding:7px 0;opacity:0.5;display:flex;align-items:center;gap:8px">
        <span style="font-size:15px;opacity:0.4">🔒</span>
        <div style="font-size:12px;color:var(--ink3)">Siguiente: <strong>${esc(pendingNormal[0].label)}</strong> — ${esc(pendingNormal[0].desc)}</div>
      </div>`:''}
    </div>`;
    })()}

    ${activeSponsorList.length>0?`<div class="card">
      <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Contratos activos</div>
      ${activeSponsorList.map(([cat,sp])=>{
        const met=checkSponsorObjective(sp);
        const penalty=Math.round(sp.salary*(sp.penaltyPct||0.15));
        const tierLabel=TIER_LABEL_SPONSOR;
        return `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                <span style="font-weight:600;font-size:14px">${sp.name}</span>
                ${nivelTag(sp.tier,tierLabel[sp.tier]||'')}
              </div>
              <div style="font-size:12px;color:var(--ink3)">${sp.bonus}</div>
            </div>
            <div class="right-col">
              <div style="font-size:13px;font-weight:600;color:var(--pos)">+€${sp.salary}/año</div>
              <div style="font-size:12px;color:var(--ink3)">${sp.duration} temp. restante${sp.duration!==1?'s':''}</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:6px;background:${met?'var(--soft)':'var(--avi-t)'}">
            <div style="flex:1">
              <div style="font-size:12px;font-weight:600;color:${met?'var(--pos-i)':'var(--avi)'}">${met?'✓ Objetivo cumplido':'⚠ Objetivo pendiente'}</div>
              <div style="font-size:12px;color:${met?'var(--pos)':'var(--ink3)'};margin-top:1px">${sp.objective}</div>
            </div>
            ${!met?`<div style="font-size:12px;color:var(--neg);font-weight:600;flex-shrink:0;margin-left:8px;margin-right:8px">-€${penalty} si falla</div>`:''}
            <button class="secondary" style="font-size:11px;padding:3px 8px;flex-shrink:0;color:var(--neg);border-color:var(--neg);background:var(--card)" onclick="breakSponsorContract('${cat}')">Romper</button>
          </div>
        </div>`;}).join('')}
    </div>`:''}

    ${G.sponsorPenalties&&G.sponsorPenalties.length>0?`<div class="card" style="border-color:var(--line2)">
      <div style="font-size:12px;font-weight:700;color:var(--neg);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Penalizaciones pendientes</div>
      ${G.sponsorPenalties.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
        <div style="font-size:13px;color:var(--color-text-primary)">${p.name}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px;font-weight:600;color:var(--neg)">-€${p.amount}</span>
          <button class="secondary" style="font-size:12px;padding:3px 10px" onclick="payPenalty('${p.id}')">Pagar</button>
          <button class="secondary" style="font-size:12px;padding:3px 10px;border-color:var(--avi-bar);color:var(--avi)" onclick="negotiatePenalty('${p.id}')">Negociar</button>
        </div>
      </div>`).join('')}
      <div style="font-size:12px;color:var(--ink3);margin-top:8px">Negociar deja la sanción en el 40% si el sponsor acepta — ${Math.round(penaltyNegotiationChance()*100)}% de probabilidad con tu reputación actual. Si se niega, pagas el total y pierdes seguidores. Lo que no resuelvas se cobra solo al cerrar la temporada que viene.</div>
    </div>`:''}

    ${G.club&&G.club.id!=='none'?(()=>{
      const rep=G.clubReputation||0;
      const repInfo=clubRepLabel();
      const companion=G.clubCompanion;
      const bonuses=Object.entries(G.club.statBonus).map(([k,v])=>`+${v} ${k.charAt(0).toUpperCase()+k.slice(1)}`).join(', ');
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Tu club</div>
          <span style="font-size:12px;color:var(--cuerpo);cursor:pointer" onclick="G._clubFromBetween=false;G.screen='clubSetup';render()">Cambiar →</span>
        </div>
        <div class="card-title">${G.club.name}</div>
        <div class="card-sub">${G.club.desc}</div>
        ${bonuses?`<div style="font-size:12px;color:var(--pos);margin-top:4px">${bonuses}</div>`:''}
        ${companion?`<div style="font-size:12px;color:var(--ink3);margin-top:4px">Compañero: <strong>${companion}</strong></div>`:''}
        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:12px;color:var(--ink3)">Reputación en el club</span>
            <span style="font-size:13px;font-weight:700;color:${repInfo.color}">${repInfo.text}</span>
          </div>
          <div class="load-bar-track"><div class="bar-fill" style="width:${rep}%;background:${rep>=60?'var(--carrera)':rep>=30?'var(--carrera)':'var(--ink3)'}"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink3);margin-top:3px">
            <span>0</span><span style="color:var(--pos)">75 → Copa Clubes 🏆</span><span>100</span>
          </div>
        </div>
      </div>`;
    })():`<div class="card" style="text-align:center;padding:16px">
      <div style="font-size:13px;color:var(--ink3);margin-bottom:8px">Sin club — corriendo como independiente</div>
      <span style="font-size:13px;color:var(--cuerpo);cursor:pointer" onclick="G._clubFromBetween=false;G.screen='clubSetup';render()">Unirse a un club →</span>
    </div>`}

    ${G.careerHistory.length>0?`<div class="card">
      <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Historial de carreras</div>
      ${G.careerHistory.slice().reverse().slice(0,10).map(h=>`<div class="history-row">
        <div>
          <div style="font-weight:500">${h.name}</div>
          <div style="font-size:12px;color:var(--ink3);margin-top:1px">Año ${h.year} · ${h.dnf?dnfLabel(h):fmt(h.time)}</div>
          ${h.catPos&&h.catTotal>1?`<div style="margin-top:3px"><span style="font-size:11px;background:var(--soft);color:var(--ink);border-radius:4px;padding:1px 6px;font-weight:600">${h.catName} ${h.catPos}º</span></div>`:''}
        </div>
        <div style="text-align:right">
          ${h.dnf?`<div style="font-size:14px;font-weight:700;color:var(--neg)">DNF</div>`:`<div style="font-size:14px;font-weight:700;color:${h.pos===1?'var(--avi)':h.pos<=3?'var(--pos)':'var(--ink3)'}">${h.pos}º</div>`}
          ${h.prize>0?`<div style="font-size:12px;color:var(--pos)">+€${h.prize}</div>`:''}
        </div>
      </div>`).join('')}
    </div>`:`<div style="text-align:center;font-size:13px;color:var(--ink3);padding:20px 0">Sin carreras completadas todavía.</div>`}
    ${(G.seasonDiary||[]).length>0?`<div class="card" style="margin-top:4px">
      <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📓 Diario del corredor</div>
      ${G.seasonDiary.slice().reverse().slice(0,5).map(e=>`<div style="padding:9px 0;border-bottom:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="font-size:12px;font-weight:600;color:var(--ink3)">Año ${e.year} · ${e.age} años</span>
          <span style="font-size:12px;color:var(--avi);font-weight:600">${e.highlight}</span>
        </div>
        <div style="font-size:13px;color:var(--ink2);line-height:1.6">${esc(e.text||'')}</div>
      </div>`).join('')}
    </div>`:''}`;
}

// ══════════════════════════════════════════════════════════════════
//  EXPRESS MODE SCREENS
// ══════════════════════════════════════════════════════════════════

// Paso 6 de la dirección visual (2026-10-30): Exprés con las piezas de Clásico y su acento
// (mostaza, por data-modo). Sin hex.
function renderExpresSeasonStart(){
  const el=$main();
  const load=getBodyLoad();const lt=getLoadThresholdsByMode();
  const showObjectives=!G.yearObjective||G._yearObjectiveRewardPaid;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">⚡ Carrera Exprés · temporada ${G.year}/3</div>
    <div style="display:flex;gap:4px;margin:0 0 12px">${[1,2,3].map(y=>`<div style="flex:1;height:5px;border-radius:3px;background:${G.year>y?'var(--acc)':G.year===y?'var(--acc-t)':'var(--trk)'}"></div>`).join('')}</div>
    <div class="pz-titulo">${esc(G.runner.name||'Corredor')}</div>
    <p class="pz-sub">${G.runner.specialty} · ${G.runner.age||25} años · ${G.ranking<900?'ranking #'+G.ranking:'sin ranking'}</p>
    <div class="pz-tarjeta" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div><div class="pz-label">Ahorros</div><div class="pz-num" style="font-size:20px">${fmtEur(G.money)}</div></div>
      <div><div class="pz-label">Carga</div><div class="pz-num ${load>=lt.warningLevel2?'pz-menos':load>=lt.warningLevel1?'pz-ojo':''}" style="font-size:20px">${load} %</div></div>
      <div><div class="pz-label">Carreras</div><div class="pz-num" style="font-size:20px">${G.raceResults?.length||0}</div></div>
    </div>
    <div class="pz-tarjeta"><div class="pz-label" style="margin-bottom:8px">Stats</div>${Object.entries(G.runner.stats).map(([k,v])=>srow(k.charAt(0).toUpperCase()+k.slice(1),v)).join('')}</div>
    ${showObjectives?`<div class="pz-label" style="margin:14px 0 6px">Objetivo de temporada</div>
      ${SEASON_OBJECTIVES.map(obj=>`<button class="pz-opcion${G.yearObjective===obj.id?' sel':''}" onclick="selectYearObjective('${obj.id}')"><b>${obj.label}</b><div class="pz-efectos">${obj.desc} · premio <span class="pz-mas">+€${obj.reward}</span></div></button>`).join('')}`
      :G.yearObjective?`<div class="pz-diag" style="margin-bottom:12px">🎯 Objetivo: <b>${SEASON_OBJECTIVES.find(o=>o.id===G.yearObjective)?.label||'—'}</b></div>`:''}
    <button class="pz-btn" onclick="G.screen='expresCalendar';render()">Elegir carreras →</button>
  </div>`;
}

// Paso 6 de la dirección visual (2026-10-30): Exprés con las piezas de Clásico y su acento
// (mostaza, por data-modo). Sin hex.
function renderExpresCalendar(){
  const el=$main();
  const selIds=G.selectedRaces.map(r=>r.id);
  const canAccess=canAccessRace;   // DS08 (v95)
  const allRaces=[...RACES_DB,...getSpecRaces()];
  const MAX=5;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">⚡ Exprés · temporada ${G.year}/3</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="pz-titulo">Elige 5 carreras</div><span class="pz-num" style="font-size:20px">${selIds.length}/${MAX}</span></div>
    <p class="pz-sub">Sin coste de inscripción.</p>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${allRaces.map(r=>{
        const sel=selIds.includes(r.id);
        const locked=!canAccess(r);
        const full=!sel&&selIds.length>=MAX;
        const clic=!(locked||full);
        const zegamaBadge=r.zegamaSpecial&&!locked&&G.zegamaQual?'<div class="pz-diag mas" style="font-size:12.5px">✓ Clasificado por tiempo</div>':r.zegamaSpecial&&!locked&&G.ranking<=20?'<div class="pz-diag mas" style="font-size:12.5px">✓ Invitación por ranking</div>':'';
        return `<div class="pz-fila${locked?' pz-bloqueado':''}" style="cursor:${clic?'pointer':'default'};align-items:flex-start;${full&&!sel?'color:var(--ink3)':''}" ${clic?`onclick="window.toggleExpresRace('${r.id}')"`:''}>
          <input type="checkbox" class="pz-casilla" style="pointer-events:none;margin-top:2px" ${sel?'checked':''} ${clic?'':'disabled'} tabindex="-1" aria-hidden="true">
          <span class="pz-fila-txt"><span style="display:flex;gap:5px;align-items:center;flex-wrap:wrap"><b>${esc(r.name)}</b>${nivelTag(r.tier)}</span>
            <div class="pz-efectos">${r.km} km · ${r.type} · ${r.monthName}</div>
            ${locked?motivoHTML(r.zegamaSpecial?'Invitación — Top 20 o clasificado por tiempo':'Ranking #'+r.reqRanking):zegamaBadge}</span>
        </div>`;}).join('')}
    </div>
    <button class="pz-btn" onclick="G.screen='expresSponsors';render()" ${selIds.length<MAX?'disabled':''}>Continuar →</button>
    <button class="pz-btn sec" onclick="G.screen='expresSeasonStart';render()">← Volver</button>
  </div>`;
}

window.toggleExpresRace=id=>{
  const all=[...RACES_DB,...getSpecRaces()];
  const race=all.find(r=>r.id===id);if(!race)return;
  const idx=G.selectedRaces.findIndex(r=>r.id===id);
  if(idx>=0){G.selectedRaces.splice(idx,1);}
  else if(G.selectedRaces.length<5){G.selectedRaces.push({...race});}
  render();
};

// Paso 6 de la dirección visual (2026-10-30): Exprés con las piezas de Clásico y su acento
// (mostaza, por data-modo). Sin hex.
function renderExpresSponsors(){
  const el=$main();
  if(!G._expressSponsorPool){G._expressSponsorPool=getExpressSponsors();}
  const pool=G._expressSponsorPool;
  const curSponsors=Object.values(G.sponsors).filter(Boolean);
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-dinero">${icono('finanzas')}Dinero · temporada ${G.year}/3</div>
    <div class="pz-titulo">Patrocinador de temporada</div>
    <p class="pz-sub">Elige uno o sigue sin patrocinador.</p>
    ${curSponsors.length>0?`<div class="pz-diag" style="margin-bottom:10px">Ya tienes patrocinador activo — puedes cambiarlo o continuar.</div>`:''}
    ${pool.map(sp=>{
      const isCur=Object.values(G.sponsors).some(x=>x?.id===sp.id);
      return `<button class="pz-opcion${isCur?' sel':''}" onclick="selectExpressSponsor('${sp.id}','${sp.cat}')">
        <span style="float:right;text-align:right"><span class="pz-num" style="font-size:17px">€${sp.salary}</span><div class="pz-efectos">/año</div></span>
        <b>${sp.name}</b><div class="pz-efectos">${sp.bonus}</div>
        <div class="pz-efectos">${Object.entries(sp.statBonus).map(([k,v])=>k.charAt(0).toUpperCase()+k.slice(1)+' <span class="pz-mas">+'+v+'</span>').join(' · ')}</div>
        <div class="pz-efectos">🎯 ${sp.objective}</div>
      </button>`;}).join('')}
    <button class="pz-btn sec" onclick="G._expressSponsorPool=null;G.screen='expresPrep';render()">Sin patrocinador esta temporada</button>
  </div>`;
}

window.selectExpressSponsor=(spId,cat)=>{
  const sp=SPONSORS_DB.find(s=>s.id===spId);if(!sp)return;
  // Remove any existing sponsor in same cat
  G.sponsors[cat]=null;
  G.sponsors[cat]={...sp,duration:1};
  // Apply stat bonus
  Object.entries(sp.statBonus).forEach(([k,v])=>{G.runner.stats[k]=Math.min(100,(G.runner.stats[k]||50)+v);});
  G._expressSponsorPool=null;
  G.screen='expresPrep';render();
};

// Paso 6 de la dirección visual (2026-10-30): Exprés con las piezas de Clásico y su acento
// (mostaza, por data-modo). Sin hex.
function renderExpresPrep(){
  const el=$main();
  const nextRace=G.selectedRaces[G.currentRaceIdx];
  const load=getBodyLoad();
  const lt=getLoadThresholdsByMode();
  const hint=bodyLoadHint();
  const racesLeft=G.selectedRaces.length-G.currentRaceIdx;
  const dc={warn:'ojo',danger:'menos',hint:'',note:'mas'};
  const op=(id,ico,t,d,ef)=>`<button class="pz-opcion" style="display:flex;gap:12px;align-items:flex-start" onclick="doExpresPrep('${id}')"><span style="font-size:22px;line-height:1">${ico}</span><span><b>${t}</b><div class="pz-efectos">${d}</div><div class="pz-efectos" style="margin-top:4px">${ef}</div></span></button>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-cuerpo">${icono('corredor')}Cuerpo · ${racesLeft} carrera${racesLeft!==1?'s':''} restante${racesLeft!==1?'s':''}</div>
    <div class="pz-titulo">Preparación</div>
    <p class="pz-sub">${nextRace?'Próxima: <b>'+esc(nextRace.name)+'</b> · '+nextRace.km+' km':'Última carrera de la temporada'}</p>
    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea" style="display:block">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span class="pz-label">Carga corporal</span><span class="pz-num ${load>=lt.warningLevel2?'pz-menos':load>=lt.warningLevel1?'pz-ojo':''}" style="font-size:18px">${load} %</span></div>
        <div class="pz-barra"><div class="pz-relleno${load>=lt.warningLevel2?' menos':load>=lt.warningLevel1?' ojo':''}" style="width:${Math.min(100,load)}%"></div><div class="pz-umbral" style="left:70%"></div></div>
      </div>
      ${hint?`<div class="pz-linea"><span class="pz-diag ${dc[hint.type]||''}">${hint.msg}</span></div>`:''}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">¿Cómo preparas la carrera?</div>
    ${op('train','🏃','Entrenamiento intenso','Subes el bloque al máximo. El cuerpo lo nota pero llegas más fuerte.',`Stat principal <span class="pz-mas">+6</span> · carga <span class="pz-menos">+12</span>${load>=lt.warningLevel2?' ⚠':''}`)}
    ${op('rest','🛌','Descanso activo','Rodaje suave, estiramientos, recuperación completa.','Mental <span class="pz-mas">+3</span> · carga <span class="pz-mas">−14</span>')}
    ${op('focus','🎯','Foco mental','Visualización de ruta, trabajo táctico, análisis de rivales.','Mental <span class="pz-mas">+5</span> · carga <span class="pz-mas">−4</span>')}
  </div>`;
}

window.doExpresPrep=choice=>{
  const stat=G.runner.stats;
  const spec=G.runner.specialty;
  if(choice==='train'){
    // Boost main specialty stat
    const mainStat={fondista:'resistencia',montanero:'subida',tecnico:'bajada',todoterreno:'resistencia'}[spec]||'resistencia';
    stat[mainStat]=Math.min(100,(stat[mainStat]||50)+6);
    G.bodyLoad=Math.min(100,(G.bodyLoad||0)+12);
    showToast('🏃 Entrenado — +6 '+mainStat.charAt(0).toUpperCase()+mainStat.slice(1));
  } else if(choice==='rest'){
    stat.mental=Math.min(100,(stat.mental||50)+3);
    G.bodyLoad=Math.max(0,(G.bodyLoad||0)-14);
    showToast('🛌 Descansado — +3 Mental · Carga -14');
  } else {
    stat.mental=Math.min(100,(stat.mental||50)+5);
    G.bodyLoad=Math.max(0,(G.bodyLoad||0)-4);
    showToast('🎯 Foco mental — +5 Mental · Carga -4');
  }
  // Go to simplified pre-race prep
  resetRaceFlags();resetRaceDayState();
  G.screen='expresPreRacePrep';render();
};

// Paso 6 de la dirección visual (2026-10-30): Exprés con las piezas de Clásico y su acento
// (mostaza, por data-modo). Sin hex.
function renderExpresPreRacePrep(){
  const el=$main();
  const race=G.selectedRaces[G.currentRaceIdx];
  if(!race){G.screen='preRace';render();return;}
  const altPenalty=getAltitudePenalty(race);
  const sel=G.preRaceNutrition||'pasta';
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">⚡ Exprés · carrera ${G.currentRaceIdx+1}/${G.selectedRaces.length}</div>
    <div class="pz-titulo">${esc(race.name)}</div>
    <p class="pz-sub">${race.km} km · ${race.type} · ${race.monthName}</p>
    ${altPenalty>0||G.injuryType?`<div class="pz-tarjeta pz-estado">
      ${altPenalty>0?`<div class="pz-linea"><span class="pz-diag ojo">Alta altitud — irás un ${Math.round(altPenalty*100)} % más lento en subidas sin preparación específica.</span></div>`:''}
      ${G.injuryType?`<div class="pz-linea"><span class="pz-diag menos">Llegas con ${INJURY_TYPES[G.injuryType]?.label||'lesión'}. Energía y piernas reducidas.</span></div>`:''}
    </div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Cena previa</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${PRE_RACE_NUTRITION.slice(0,2).map(n=>{const isSel=sel===n.id;const cost=getNutritionCost(n.id);
        return `<button class="pz-opcion${isSel?' sel':''}" onclick="G.preRaceNutrition='${n.id}';render()"><b>${n.label}</b><div class="pz-efectos">${n.desc}</div><div class="pz-efectos">Energía <span class="${n.energyBonus>0?'pz-mas':'pz-menos'}">${n.energyBonus>0?'+':''}${n.energyBonus}</span>${cost>0?' · €'+cost:''}</div></button>`;}).join('')}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Estrategia de salida</div>
    ${[
      {id:'conservador',label:'Conservador 🐢',desc:'Primeros tramos lentos, últimos con reservas'},
      {id:'equilibrado',label:'Equilibrado ⚖',desc:'Ritmo constante desde el principio'},
      {id:'a_tope',label:'A tope 🔥',desc:'Máxima velocidad desde el km 1 — riesgo real'},
    ].map(x=>`<button class="pz-opcion${(G.startStrategy||'equilibrado')===x.id?' sel':''}" onclick="G.startStrategy='${x.id}';render()"><b>${x.label}</b><div class="pz-efectos">${x.desc}</div></button>`).join('')}
    <button class="pz-btn" style="margin-top:6px" onclick="goPreRace()">Salir a correr →</button>
  </div>`;
}

// Paso 6 de la dirección visual (2026-10-30): Exprés con las piezas de Clásico y su acento
// (mostaza, por data-modo). Sin hex.
function renderExpresSeasonBalance(){
  const el=$main();
  const sponsorIncome=sponsorAnnual();
  const raceIncome=G.raceResults.reduce((a,r)=>a+r.prize,0);
  const yearNet=sponsorIncome+raceIncome;
  const pen=(G.sponsorPenalties||[]).filter(p=>p.year===G.year).reduce((a,p)=>a+p.amount,0);
  const F=(txt,v)=>`<div class="pz-fila"><span class="pz-fila-txt">${txt}</span><span class="pz-fila-dato ${v>=0?'pz-mas':'pz-menos'}">${fmtEur(v,true)}</span></div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">⚡ Temporada ${G.year}/${modeCfg().maxYears} completada${G.year>=modeCfg().maxYears?' · la última 🏁':''}</div>
    <div class="pz-titulo">Balance de temporada</div>
    <p class="pz-sub">${esc(G.runner.name||'Corredor')} · ranking #${G.ranking<900?G.ranking:'—'}</p>
    <div class="pz-tarjeta"><div class="pz-label">Resultado del año</div><div class="pz-num ${yearNet>=0?'pz-mas':'pz-menos'}" style="font-size:40px;line-height:1.1">${fmtEur(yearNet,true)}</div></div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${G.raceResults.length===0?'<p class="pz-efectos" style="padding:10px 0">Sin carreras completadas.</p>':G.raceResults.map(r=>isDNF(r)
        ?`<div class="pz-fila"><span class="pz-num pz-menos" style="width:30px">DNF</span><span class="pz-fila-txt">${r.name}</span><span class="pz-efectos">${dnfLabel(r)}</span></div>`
        :`<div class="pz-fila"><span class="pz-num" style="width:30px">${r.pos}.º</span><span class="pz-fila-txt">${r.name}</span><span class="pz-mas">+€${r.prize}</span></div>`).join('')}
    </div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${sponsorIncome>0?F('Patrocinios',sponsorIncome):''}
      ${raceIncome>0?F('Premios de carrera',raceIncome):''}
      ${pen>0?F('Penalizaciones sponsor',-pen):''}
      <div class="pz-fila" style="font-weight:600"><span class="pz-fila-txt">Resultado del año</span><span class="pz-fila-dato ${yearNet>=0?'pz-mas':'pz-menos'}">${fmtEur(yearNet,true)}</span></div>
    </div>
    <div class="pz-tarjeta"><div class="pz-label" style="margin-bottom:8px">Stats finales</div>${Object.entries(G.runner.stats).map(([k,v])=>srow(k.charAt(0).toUpperCase()+k.slice(1),v)).join('')}</div>
    <button class="pz-btn" onclick="doNextYear(${yearNet})">${G.year>=modeCfg().maxYears?'Ver resumen de carrera →':'Temporada '+(G.year+1)+' →'}</button>
    ${G.year>=2?`<button class="pz-btn sec" onclick="doRetire()">Retiro anticipado — ver resumen</button>`:''}
  </div>`;
}

// ── WORK SETUP (TRIMESTRAL) ────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Decisión, referencia «Jornada»
// (TG-Direccion-Visual § 7): consejo plegable, el sueldo en negro y solo el neto en color,
// y lo bloqueado con su motivo. Sin hex.
function renderWorkSetup(){
  const el=$main();
  const q=G.currentQuarter||1;
  const qLabel={1:'Q1 — Ene/Feb/Mar',2:'Q2 — Abr/May/Jun',3:'Q3 — Jul/Ago/Sep',4:'Q4 — Oct/Nov/Dic'};
  const sponsorM=monthlySponsorIncome();
  const canQuit=sponsorM>=FIXED_COSTS.total;
  const curPct=G.workByQuarter[q];
  const qRaces=G.selectedRaces.filter(r=>r.quarter===q);
  const vacQ=G.vacByQuarter?.[q]||0;
  const vacLeft=vacDaysLeft();
  const vacBonus=vacTrainingHBonus(q);
  const wo=WORK_OPTIONS.find(o=>o.pct===curPct)||WORK_OPTIONS[0];
  const totalTrainingH=wo.trainingH+vacBonus;

  if(G.year===1&&q===1&&!G._workTipSeen){G._workTipSeen=true;}
  const pen=G.workChangePenalties?.[q];
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-dinero">${icono('finanzas')}Dinero · ${qLabel[q]}</div>
    <div class="pz-titulo">Jornada laboral</div>
    <p class="pz-sub">${esc(G.runner.name||'Corredor')}${G.carreraVida?` · <span class="pz-chip" style="background:var(--soft)">🏔 Carrera de Vida · Año ${G.year} · ${{runner:'Corredor',overlap:'Solapamiento',coach:'Entrenador',club:'Club'}[G.lifecyclePhase||'runner']}</span>`:''}</p>
    ${consejoHTML('jornada','Las horas que no dediques a trabajar van a entrenar — y las que no uses entrenando, a reputación.','Atleta puro, mediático o equilibrado: tú eliges cada trimestre.')}
    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea"><span class="pz-fila-txt">Alquiler + comida + transporte</span><span class="pz-num">${fmtEur(-FIXED_COSTS.total)}/mes</span></div>
      ${qRaces.length>0?`<div class="pz-linea"><span class="pz-diag">Este trimestre tienes ${qRaces.length} carrera${qRaces.length>1?'s':''}: ${qRaces.map(r=>esc(r.name)).join(', ')}. Valora bajar jornada o usar vacaciones.</span></div>`:''}
      ${pen?`<div class="pz-linea"><span class="pz-diag ojo">Cambio brusco de jornada${pen.amount>0?' — pierdes €'+pen.amount:''} · eficiencia de entrenamiento ${Math.round((pen.trainingEff||1)*100)} % este trimestre.</span></div>`:''}
    </div>
    <div class="pz-label" style="margin:14px 0 8px">¿Cuánto trabajas este trimestre?</div>
    ${WORK_OPTIONS.map(wo2=>{
      const net=wo2.income+sponsorM-FIXED_COSTS.total-(G.club?.cost||0);
      const eff=Math.round(trainingEffFromH(wo2.trainingH+vacBonus)*100);
      // T29 (v86): en el escalón 2 solo queda disponible la jornada completa
      const debtLocked=!!G.forcedFullTime&&wo2.pct!==100;
      const isLocked=(wo2.pct===0&&!canQuit)||debtLocked;
      const sel=curPct===wo2.pct;
      return `<div class="pz-opcion${sel?' sel':''}${isLocked?' pz-bloqueado':''}" ${isLocked?'':`onclick="setWorkQ(${q},${wo2.pct})"`}>
        <b>${wo2.label}</b><div class="pz-efectos">${wo2.desc}</div>
        ${debtLocked?motivoHTML(`Bloqueado hasta saldar la deuda (€${G.debt||0})`)
          :isLocked?motivoHTML(`Necesitas €${FIXED_COSTS.total+(G.club?.cost||0)}/mes en sponsors (tienes €${sponsorM})`):''}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px">
          <div><div class="pz-label">Trabajo</div><div class="pz-num" style="font-size:16px">${wo2.income>0?'€'+wo2.income:'—'}/mes</div></div>
          <div><div class="pz-label">Neto</div><div class="${net>=0?'pz-mas':'pz-menos'}" style="font-size:16px">${fmtEur(net,true)}/mes</div></div>
          <div><div class="pz-label">Entreno</div><div class="pz-num" style="font-size:16px">${wo2.trainingH} h/sem</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin:8px 0 4px" class="pz-efectos"><span>Eficiencia del entreno</span><span class="pz-num">${eff} %</span></div>
        <div class="pz-barra"><div class="pz-relleno" style="width:${eff}%"></div></div>
      </div>`;}).join('')}

    <div class="pz-tarjeta" style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
        <b>Vacaciones este trimestre</b><span class="pz-efectos">${vacDaysUsed()} / ${G.vacDaysTotal||15} días usados este año</span>
      </div>
      <div style="display:flex;justify-content:center;margin-bottom:8px">
        <span class="pz-stepper"><button onclick="setVacQ(${q},${Math.max(0,vacQ-1)})" ${vacQ<=0?'disabled':''}>−</button><span class="pz-stepper-n">${vacQ}</span><button onclick="setVacQ(${q},${Math.min(vacLeft+vacQ,vacQ+1)})" ${vacLeft<=0?'disabled':''}>+</button></span>
      </div>
      ${vacQ>0?`<div class="pz-efectos" style="text-align:center">Entreno extra <span class="pz-mas">+${vacBonus} h/sem</span> · total <span class="pz-num">${totalTrainingH} h/sem</span> · te quedan ${vacLeft} días este año</div>`
        :`<div class="pz-efectos" style="text-align:center">Cada día de vacaciones añade 1,5 h/sem de entrenamiento este trimestre. Te quedan ${vacLeft} días este año.</div>`}
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:8px">
      <button class="pz-btn sec" onclick="G.screen='seasonStart';autoSave();render()">← Volver</button>
      <button class="pz-btn" onclick="G.screen='calendar';autoSave();render()">Confirmar →</button>
    </div>
    ${[2,3,4].includes(q)?`<div class="pz-label" style="margin:16px 0 6px">Otros trimestres</div>
      <div class="pz-tarjeta" style="padding:2px 14px">${[1,2,3,4].filter(n=>n!==q).map(n=>{
        const wo2=WORK_OPTIONS.find(o=>o.pct===G.workByQuarter[n]);
        const vac2=G.vacByQuarter?.[n]||0;
        return `<div class="pz-fila navega" onclick="G.currentQuarter=${n};render()"><span class="pz-num">Q${n}</span><span class="pz-fila-txt">${wo2?.label||'—'}</span><span class="pz-fila-dato">${wo2?.trainingH||5} h/sem${vac2>0?' + '+vac2+' d':''}</span></div>`;}).join('')}</div>`:''}
  </div>`;
}

window.setVacQ=(q,days)=>{
  if(!G.vacByQuarter)G.vacByQuarter={1:0,2:0,3:0,4:0};
  const max=(G.vacDaysTotal||15)-vacDaysUsed()+(G.vacByQuarter[q]||0);
  G.vacByQuarter[q]=Math.max(0,Math.min(max,days));
  render();
};

// ── SEASON START ───────────────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Hub de modo (§ 1): estado clave, la
// decisión del periodo (objetivo de temporada) y la navegación en lista. Sin hex.
function renderSeasonStart(){
  const el=$main();
  const wo=WORK_OPTIONS.find(o=>o.pct===currentWorkPct()); // T22 (v89)
  const net=monthlyNet();
  const showObjectives=!G.yearObjective||G._yearObjectiveRewardPaid; // Se vuelve a ofrecer cada vez que se cobra el objetivo actual
  const nav=(icon,txt,sub,click)=>`<div class="pz-fila navega" onclick="${click}"><span style="font-size:18px">${icon}</span><span class="pz-fila-txt"><b>${txt}</b>${sub?`<div class="pz-efectos">${sub}</div>`:''}</span></div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-carrera">${icono('temporada')}${modeLabelOf(G.gameMode)}${G.gameMode==='expres'?' · año '+G.year+'/3':''}${G.carreraVida?' · '+(PHASE_LABEL[G.lifecyclePhase]||PHASE_LABEL.runner):''}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="pz-titulo">Temporada ${G.year}</div><span class="pz-efectos">${G.ranking<900?'Ranking <span class="pz-num">#'+G.ranking+'</span>':'Sin ranking'}</span></div>
    <p class="pz-sub">${esc(G.runner.name||'Corredor')} · ${G.runner.specialty}${G.runner.age?' · '+G.runner.age+' años':''}</p>

    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div><div class="pz-label">Ahorros</div><div class="pz-num" style="font-size:20px">${fmtEur(G.money)}</div></div>
        <div><div class="pz-label">Neto mensual</div><div class="${net>=0?'pz-mas':'pz-menos'}" style="font-size:20px">${fmtEur(net,true)}</div></div>
        <div><div class="pz-label">Entreno</div><div class="pz-num" style="font-size:20px">${wo?.trainingH||5} h/sem</div></div>
      </div>
      <div class="pz-linea">${currentWorkPct()===100?`<span class="pz-diag ojo">Jornada completa — solo ${wo?.trainingH} h/sem de entrenamiento. Los bloques solo serán un ${Math.round(effForWork()*100)} % efectivos.</span>`:
        currentWorkPct()===0?`<span class="pz-diag mas">Profesional — entrenamiento completo. Asegúrate de que los ingresos cubran gastos.</span>`:
        `<span class="pz-diag">${wo?.label} — ${wo?.trainingH} h/sem de entrenamiento. Eficiencia de bloque: ${Math.round(effForWork()*100)} %.</span>`}</div>
      ${G.yearObjective&&!showObjectives?`<div class="pz-linea"><span class="pz-diag">Objetivo: <b>${SEASON_OBJECTIVES.find(o=>o.id===G.yearObjective)?.label||'—'}</b></span></div>`:''}
    </div>

    ${showObjectives?`<div class="pz-label" style="margin:14px 0 6px">Elige tu objetivo de temporada</div>
      ${SEASON_OBJECTIVES.map(obj=>`<button class="pz-opcion${G.yearObjective===obj.id?' sel':''}" onclick="selectYearObjective('${obj.id}')"><b>${obj.label}</b><div class="pz-efectos">${obj.desc} · premio <span class="pz-mas">+€${obj.reward}</span></div></button>`).join('')}`:''}

    <div class="pz-label" style="margin:14px 0 6px">Jornada por trimestre</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${[1,2,3,4].map(q=>{
        const wo2=WORK_OPTIONS.find(o=>o.pct===G.workByQuarter[q]);
        const qRaces=G.selectedRaces.filter(r=>r.quarter===q);
        return `<div class="pz-fila navega" onclick="G.currentQuarter=${q};G.screen='workSetup';render()"><span class="pz-num">Q${q}</span><span class="pz-fila-txt">${wo2?.label||'—'}${qRaces.length>0?` <span class="pz-efectos">· ${qRaces.length} carrera${qRaces.length>1?'s':''}</span>`:''}</span><span class="pz-fila-dato">${wo2?.trainingH||5} h/sem</span></div>`;}).join('')}
    </div>

    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:8px">Tus stats</div>
      ${Object.entries(G.runner.stats).map(([k,v])=>srow(k.charAt(0).toUpperCase()+k.slice(1),v)).join('')}
    </div>

    <div class="pz-tarjeta" style="padding:2px 14px">
      ${nav('🗓','Planificar jornada laboral','',"G.currentQuarter=1;G.screen='workSetup';render()")}
      ${nav('🏃',G.club&&G.club.id!=='none'?'Club: '+esc(G.club.name):'Unirse a un club','',"G.screen='clubSetup';render()")}
      ${nav('🏆','Circuitos y ligas','',"G.screen='circuits';render()")}
    </div>
    <button class="pz-btn" onclick="G.screen='calendar';autoSave();render()">Planificar calendario →</button>
  </div>`;
}

// ── CALENDAR ───────────────────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Lista, referencia «Calendario» (§ 7):
// presupuesto en morado y en euros, trimestres en tarjeta, carreras en filas con casilla y el
// nivel en escala de grises. Sin hex.
function renderCalendar(){
  const el=$main();
  const canAccess=canAccessRace;   // DS08 (v95)
  const selIds=G.selectedRaces.map(r=>r.id);
  const spent=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
  const budget=G.money;
  const pct=Math.min(100,Math.round(spent/Math.max(1,budget)*100));
  const specRaces=getSpecRaces();
  const myLabel=SPEC_LABEL[G.runner.specialty]||'';

  function raceCard(r,isSpec){
    const sel=selIds.includes(r.id);
    const locked=!canAccess(r);
    const noMoney=!sel&&(spent+r.cost>budget);
    const inCirc=isInCircuit(r.id);
    const circPts=inCirc?circuitPoints(3,15):0;
    const clic=!locked&&!(noMoney&&!sel);
    return `<div class="pz-fila${clic?' navega-no':''}${locked?' pz-bloqueado':''}" style="${clic?'cursor:pointer':''};align-items:flex-start;border:none;border-top:1px solid var(--line)" ${clic?'onclick="toggleRace(\''+r.id+'\')"':''}>
      <input type="checkbox" class="pz-casilla" style="pointer-events:none;margin-top:2px" ${sel?'checked':''} ${clic?'':'disabled'} tabindex="-1" aria-hidden="true">
      <span class="pz-fila-txt">
        <span style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><b>${esc(r.name)}</b>${nivelTag(r.tier)}${inviteBadge(r)}
          ${isSpec?`<span class="pz-chip" style="margin:0;border:1px solid var(--acc);color:var(--ink)">★ ${myLabel}</span>`:''}
          ${inCirc?`<span class="pz-chip" style="margin:0;background:var(--soft)">Liga · ~${circPts} pts</span>`:''}</span>
        <div class="pz-efectos">${r.monthName} · ${r.type} · ${raceDesnivel(r)}${isSpec?` · <span class="pz-mas">+15 %</span> para ${myLabel}`:''}</div>
        ${locked?motivoHTML(r.zegamaSpecial?'Invitación Top 20 o clasificación por tiempo (corte 4h20)':'Ranking #'+r.reqRanking+' requerido'):''}
        ${noMoney&&!sel?motivoHTML('Sin presupuesto'):''}
      </span>
      <span style="text-align:right"><div class="pz-num">€${r.prize}</div><div class="pz-efectos">€${r.cost} inscr.</div></span>
    </div>`;
  }

  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-carrera">${icono('calendario')}Carrera · temporada ${G.year}</div>
    <div class="pz-titulo">Calendario anual</div>
    <p class="pz-sub">Comunes y específicas de ${myLabel}.</p>
    <div class="pz-tarjeta">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <span class="pz-label">Inscripciones <button class="tip-btn" onclick="showTip('Barra de presupuesto','Esta barra muestra qué porcentaje de tus ahorros llevas gastado en inscripciones de carrera. No es la carga corporal — eso lo puedes ver en la pestaña Corredor.<br><br>Si llega al 85% se vuelve roja: ojo con dejar reservas para imprevistos.')">ⓘ</button></span>
        <span><span class="pz-num" style="font-size:18px;color:var(--dinero)">${fmtEur(spent)}</span> <span class="pz-efectos">de ${fmtEur(budget)} · ${pct} %</span></span>
      </div>
      <div class="pz-barra"><div class="pz-relleno${pct>85?' menos':''}" style="width:${pct}%;${pct>85?'':'background:var(--dinero)'}"></div><div class="pz-umbral" style="left:85%"></div></div>
    </div>
    ${G.joinedCircuits.length>0?`<div class="pz-diag mas" style="margin-bottom:12px"><span><b>Circuito${G.joinedCircuits.length>1?'s':''} activo${G.joinedCircuits.length>1?'s':''}:</b> ${G.joinedCircuits.map(cid=>esc(CIRCUITS_DB.find(c=>c.id===cid)?.name||cid)).join(', ')} — las carreras de liga llevan «Liga».</span></div>`:
    `<div class="pz-tarjeta" style="padding:2px 14px"><div class="pz-fila navega" onclick="G.screen='circuits';render()"><span>🏆</span><span class="pz-fila-txt"><b>Ligas y circuitos</b><div class="pz-efectos">Únete para ganar puntos y premios extra este año</div></span></div></div>`}
    ${QUARTERS.map(q=>{
      const common=RACES_DB.filter(r=>r.quarter===q.n);
      const spec=specRaces.filter(r=>r.quarter===q.n);
      const qSel=[...common,...spec].filter(r=>selIds.includes(r.id)).length;
      const qLabel={1:'Primer trimestre',2:'Segundo trimestre',3:'Tercer trimestre',4:'Cuarto trimestre'};
      const isOpen=(G.openQuarters?.cal||[]).includes(q.n);
      return `<div class="pz-tarjeta" style="padding:0;overflow:hidden">
          <div class="pz-fila navega" style="padding:12px 14px;border:none;${qSel>0?'box-shadow:inset 3px 0 0 var(--acc)':''}" onclick="toggleQ(${q.n})">
            <span class="pz-fila-txt"><b>${qLabel[q.n]}</b> <span class="pz-efectos">· ${q.months}</span></span>
            ${qSel>0?`<span class="pz-fila-dato">${qSel} ✓</span>`:''}
          </div>
          ${isOpen?`<div style="padding:0 14px 8px" onclick="event.stopPropagation()">
            ${common.map(r=>raceCard(r,false)).join('')}
            ${spec.length>0?`
              <div class="spec-toggle" id="spec-toggle-${q.n}" onclick="event.stopPropagation();toggleSpecQ(${q.n})" style="margin-top:8px">
                <span style="color:var(--acc)">★</span>
                <span style="flex:1">Carreras específicas — ${myLabel} (${spec.length})</span>
                <span class="spec-arrow" id="spec-arrow-${q.n}">▶</span>
              </div>
              <div class="spec-races" id="spec-races-${q.n}">
                ${spec.map(r=>raceCard(r,true)).join('')}
              </div>`:''}
          </div>`:''}
        </div>`;}).join('')}
    <div class="pz-efectos" style="margin:8px 0 12px">
      ${G.selectedRaces.length===0?'Sin carreras — puedes continuar igualmente.':G.selectedRaces.length+' carrera'+(G.selectedRaces.length>1?'s':'')+' seleccionada'+(G.selectedRaces.length>1?'s':'')+'.'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px">
      <button class="pz-btn sec" onclick="G.screen='seasonStart';autoSave();render()">← Volver</button>
      <button class="pz-btn" onclick="G.screen='sponsors';autoSave();render()">Patrocinios →</button>
    </div>
  </div>`;
}

window.toggleQ=q=>{
  if(!G.openQuarters)G.openQuarters={cal:[],mid:[],tab:[]};
  const arr=G.openQuarters.cal;
  const idx=arr.indexOf(q);
  if(idx>=0)arr.splice(idx,1);else arr.push(q);
  render();
};
window.toggleSpecQ=q=>{
  const panel=document.getElementById('spec-races-'+q);
  const arrow=document.getElementById('spec-arrow-'+q);
  if(panel){panel.classList.toggle('open');if(arrow)arrow.classList.toggle('open');}
};

// ── SPONSORS ───────────────────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Decisión, referencia «Entreno» (§ 2): una
// opción por categoría; objetivo y penalización como efectos en línea; tier en escala de
// grises; bloqueados con su motivo. Sin hex.
function renderSponsors(){
  const el=$main();
  const cats=['zapatillas','ropa','nutricion','tecnologia'];
  const catLabel={zapatillas:'Zapatillas',ropa:'Ropa',nutricion:'Nutrición',tecnologia:'Tecnología GPS'};
  const tierLabel=TIER_LABEL_SPONSOR;
  const avail=SPONSORS_DB.filter(s=>{
    if(s.reqYear&&G.year<s.reqYear)return false;
    if(s.reqRanking&&G.ranking>s.reqRanking)return false;
    return true;
  });
  const locked=SPONSORS_DB.filter(s=>!avail.includes(s));
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-dinero">${icono('finanzas')}Dinero · año ${G.year}</div>
    <div class="pz-titulo">Patrocinios <button class="tip-btn" onclick="showTip('Patrocinios','Cada sponsor tiene un <strong>objetivo</strong> que cumplir al final del contrato (victorias, ranking, carreras completadas). Si no lo cumples pagas una <strong>penalización</strong> del porcentaje indicado sobre tu salario anual.<br><br>Romper el contrato antes de tiempo cuesta el <strong>40% del valor restante</strong>. Los contratos de varios años pagan más pero el compromiso es mayor.')">ⓘ</button></div>
    <p class="pz-sub">Ingresos actuales <span class="pz-mas">+€${sponsorAnnual()}/año</span></p>

    ${G.sponsorPenalties&&G.sponsorPenalties.length>0?`<div class="pz-tarjeta">
      <div class="pz-diag menos" style="margin-bottom:6px"><b>Penalizaciones por incumplimiento</b></div>
      ${G.sponsorPenalties.map(p=>`<div class="pz-fila"><span class="pz-fila-txt">${esc(p.name)}</span><span class="pz-menos">−€${p.amount}</span>
        <button class="pz-btn sec" style="width:auto;padding:6px 10px" onclick="payPenalty('${p.id}')">Pagar</button>
        <button class="pz-btn sec" style="width:auto;padding:6px 10px" onclick="negotiatePenalty('${p.id}')">Negociar</button></div>`).join('')}
      <div class="pz-efectos" style="margin-top:6px">Negociar rebaja la sanción al 40 % si aceptan (${Math.round(penaltyNegotiationChance()*100)} % de éxito con tu reputación actual). Si se niegan, pagas el total y pierdes seguidores. Sin resolver, se te cobra de oficio al cerrar la temporada que viene.</div>
    </div>`:''}

    ${cats.map(cat=>{
      const offers=avail.filter(s=>s.cat===cat);
      const cur=G.sponsors[cat];
      const lockedOffers=locked.filter(s=>s.cat===cat).slice(0,2);
      const objMet=cur?checkSponsorObjective(cur):null;
      return `<div class="pz-label" style="margin:16px 0 6px">${catLabel[cat]}</div>
        ${cur?`<div class="pz-tarjeta" style="border-color:var(--acc);border-width:1.5px">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
            <div class="pz-fila-txt">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b>${esc(cur.name)}</b>${nivelTag(cur.tier,tierLabel[cur.tier]||'?')}</div>
              <div class="pz-diag ${objMet?'mas':'ojo'}">${objMet?'Objetivo cumplido':'Objetivo pendiente'}: ${cur.objective}</div>
              <div class="pz-efectos">${cur.duration} temporada${cur.duration!==1?'s':''} restante${cur.duration!==1?'s':''}${!objMet?` · si no cumples, <span class="pz-menos">−€${Math.round(cur.salary*cur.penaltyPct)}</span>`:''}${followersSponsorMult()>1?` · 📱 <span class="pz-mas">+${Math.round((followersSponsorMult()-1)*100)} %</span> por reputación`:''}</div>
            </div>
            <button class="pz-btn sec" style="width:auto;padding:6px 10px;line-height:1.3" onclick="breakSponsorContract('${cat}')">Romper<br><span class="pz-menos" style="font-size:12px">−€${Math.round(cur.salary*cur.duration*0.4)}</span></button>
          </div>
        </div>
        ${offers.filter(x=>x.id!==cur.id).length>0?`<div class="pz-efectos" style="margin-bottom:6px">Otras ofertas (rompe el contrato para cambiar):</div>
        ${offers.filter(x=>x.id!==cur.id).map(x=>`<div class="pz-opcion pz-bloqueado"><span style="float:right" class="pz-num">€${x.salary}/año</span><b>${x.name}</b> ${nivelTag(x.tier,tierLabel[x.tier])}${x.tier>cur.tier?' <span class="pz-chip mas" style="margin:0">⬆ Mejora</span>':''}</div>`).join('')}`:''}`:''}
        ${!cur?offers.map(x=>{
          const isPending=G._pendingSponsors?.[cat]?.id===x.id;
          return `<button class="pz-opcion${isPending?' sel':''}" onclick="selectSponsor('${cat}','${x.id}')">
            <span style="float:right;text-align:right"><span class="pz-num" style="font-size:17px">€${x.salary}</span><div class="pz-efectos">/año</div></span>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b>${x.name}</b>${nivelTag(x.tier,tierLabel[x.tier])}</div>
            <div class="pz-efectos">${x.bonus}</div>
            <div class="pz-efectos">Objetivo: ${x.objective}${x.duration>1?` · contrato de ${x.duration} temporadas`:''} · penalización <span class="pz-menos">${Math.round(x.penaltyPct*100)} %</span></div>
          </button>`;}).join(''):''}
        ${lockedOffers.slice(0,1).map(x=>`<div class="pz-opcion pz-bloqueado"><b>${x.name}</b> ${nivelTag(x.tier,tierLabel[x.tier])}${motivoHTML([x.reqYear?'Disponible desde el año '+x.reqYear:'',x.reqRanking?'Ranking #'+x.reqRanking:''].filter(Boolean).join(' · '))}</div>`).join('')}
        ${offers.length===0&&lockedOffers.length===0?`<div class="pz-efectos">Sin ofertas esta temporada.</div>`:''}`;}).join('')}
    ${Object.keys(G._pendingSponsors||{}).length>0?`
    <div class="pz-diag ojo" style="margin:12px 0"><span><b>Tienes selecciones sin confirmar.</b> Toca un sponsor elegido para quitarlo, o confirma para firmar los contratos.</span></div>
    <button class="pz-btn" onclick="confirmSponsors()">Confirmar patrocinios</button>`:''}
    <button class="pz-btn sec" onclick="G._pendingSponsors={};G.screen='training';autoSave();render()">Bloque de entrenamiento →</button>
  </div>`;
}

window.payPenalty=id=>{
  if(!G.sponsorPenalties)return;
  const idx=G.sponsorPenalties.findIndex(p=>p.id===id);
  if(idx<0)return;
  const p=G.sponsorPenalties[idx];
  G.money=Math.max(0,G.money-p.amount);
  G.sponsorPenalties.splice(idx,1);
  checkAndUnlockAchievements();
  autoSave();
  render();
};

// ── NEGOCIACIÓN DE PENALIZACIONES ──────
// Probabilidad de que el sponsor acepte rebajar la penalización.
// Tu peso mediático (seguidores) y tu ranking son los argumentos:
// sin reputación no tienes nada que ofrecerles a cambio.
function penaltyNegotiationChance(){
  const f=G.followers||0;
  const repBonus  = f>=25000?0.30 : f>=10000?0.20 : f>=2500?0.10 : 0;
  const rankBonus = G.ranking<=10?0.20 : G.ranking<=50?0.10 : 0;
  return Math.min(0.85, 0.25+repBonus+rankBonus);
}
window.negotiatePenalty=id=>{
  if(!G.sponsorPenalties)return;
  const idx=G.sponsorPenalties.findIndex(p=>p.id===id);
  if(idx<0)return;
  const p=G.sponsorPenalties[idx];
  const ok=Math.random()<penaltyNegotiationChance();
  if(ok){
    const reducida=Math.round(p.amount*0.4);
    G.money=Math.max(0,G.money-reducida);
    G.sponsorPenalties.splice(idx,1);
    G._sponsorNegotiations=(G._sponsorNegotiations||0)+1; // tracking logro 'sponsor_negotiate'
    showToast(`Acuerdo con ${p.name} · -€${reducida} en vez de -€${p.amount}`);
  } else {
    G.money=Math.max(0,G.money-p.amount);
    G.sponsorPenalties.splice(idx,1);
    applyRepDecay('bad_result');
    showToast(`${p.name} no cede. Pagas los €${p.amount} completos.`);
  }
  checkAndUnlockAchievements();
  autoSave();
  render();
};

// ── TRAINING ───────────────────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Decisión, referencia «Entreno» (§ 7):
// versión limpia (sin etiquetas de color ni minibarras), tarjeta de estado con la carga, el
// frío y la próxima carrera desplegable, y la frase real del bloque. Sin hex.
function renderTraining(){
  const el=$main();
  const nextRace=G.selectedRaces[0];
  const wo=curWorkOpt();
  const hint=bodyLoadHint();
  const load=getBodyLoad();
  const lt=getLoadThresholdsByMode();
  const curMonth=nextRace?nextRace.month:(new Date().getMonth()+1);
  const se=getSeasonEffects(curMonth);
  const seEffPct=Math.round(effForWork()*(1+se.trainingMod)*100);
  const diagCls={warn:'ojo',danger:'menos',note:'mas',hint:''};
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-cuerpo">${icono('corredor')}Cuerpo · temporada ${G.year}</div>
    <div class="pz-titulo">Bloque de entrenamiento</div>
    <p class="pz-sub">Efectividad <span class="pz-num">${seEffPct} %</span> · ${wo?.trainingH||5} h/sem · ${se.label}</p>
    ${consejoHTML('bloque','El bloque se aplica al cerrar la temporada, una sola vez:','las cifras de cada opción son lo que sumará entonces.')}
    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea" style="display:block">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <span class="pz-label">Carga corporal <button class="tip-btn" onclick="showTip('Carga corporal','Refleja el desgaste acumulado de entrenar. Por encima del <strong>70%</strong> empieza la bajada de rendimiento. Al <strong>100%</strong> aparece una lesión.<br><br>La degradación es exponencial: cuanta más carga tienes, más difícil bajarla. Se reduce parcialmente entre temporadas, pero nunca vuelve a cero sola. Nunca vayas a tope todo el rato.')">ⓘ</button></span>
          <span class="pz-num ${load>=lt.warningLevel2?'pz-menos':load>=lt.warningLevel1?'pz-ojo':''}" style="font-size:18px">${load} %</span>
        </div>
        <div class="pz-barra"><div class="pz-relleno${load>=lt.warningLevel2?' menos':load>=lt.warningLevel1?' ojo':''}" style="width:${Math.min(100,load)}%"></div><div class="pz-umbral" style="left:70%"></div><div class="pz-umbral" style="left:calc(100% - 1.5px)"></div></div>
      </div>
      ${G.zeroedOutThisRace&&G.postRaceConsequence?`<div class="pz-linea"><span class="pz-diag menos">Secuelas de la última carrera — <b>${G.postRaceConsequence.label}</b>. ${G.postRaceConsequence.id==='descanso_forzado'?`El bloque de esta temporada rinde un ${Math.round((1-restWeeksEffMult())*100)} % menos.`:G.postRaceConsequence.id==='sobrecarga'?'Subida, bajada y velocidad entrenan al 80 % esta temporada.':'Recuperación en curso.'}</span></div>`:''}
      ${hint?`<div class="pz-linea"><span class="pz-diag ${diagCls[hint.type]||''}">${hint.msg}</span></div>`:''}
      ${se.trainingMod!==0?`<div class="pz-linea"><span class="pz-diag">${se.note}</span></div>`:''}
      <div class="pz-linea" style="display:block">
        <button class="pz-btn sec" id="btn-nr" onclick="toggleNR()">Ver próxima carrera ↓</button>
        <div id="nr-panel" style="display:none;margin-top:10px">
          ${nextRace?racePreviewCard(nextRace,'preview',0):'<p class="pz-efectos">Sin carrera seleccionada.</p>'}
        </div>
      </div>
    </div>
    <div style="margin-bottom:16px">
      ${TRAINING_BLOCKS.map(b=>{
        const sel=G.trainingBlock&&G.trainingBlock.id===b.id;
        const eff=effForWork()*(1+se.trainingMod);
        const loadAfter=Math.round(bodyLoadAfterTraining(b.id));
        const loadCls=loadAfter>=70?'pz-menos':loadAfter>=50?'pz-ojo':'pz-num';
        const hasFutureRace=nextRace!==null&&nextRace!==undefined;
        const taperHint=b.taperBlock&&hasFutureRace?`<div class="pz-diag mas">Tienes carrera próxima — buen momento. +6 Energía y Piernas al salir.</div>`:
                        b.taperBlock&&!hasFutureRace?`<div class="pz-diag">Sin carrera próxima — poco beneficio ahora.</div>`:'';
        const mom=G.trainingMomentum;
        const momWarn=mom&&mom.blockId===b.id&&mom.count>=2?`<div class="pz-diag ojo">${mom.count}.º trimestre seguido — riesgo de estancamiento o revelación.</div>`:'';
        // La frase real del bloque, con la opción elegida
        const flavor=sel&&b.flavor&&b.flavor.length?`<div class="pz-efectos" style="font-style:italic;margin-top:6px">«${b.flavor[0]}»</div>`:'';
        const effs=b.taperBlock?
          `Mental <span class="pz-mas">+2</span> · Carga <span class="pz-mas">−18 %</span>`:
          Object.entries(b.effects).filter(([,v])=>v!==0).map(([k,v])=>{
            const r=Math.round(v*eff*legsTrainingMult(k));
            return `${k.charAt(0).toUpperCase()+k.slice(1)} <span class="${r>0?'pz-mas':'pz-menos'}">${r>0?'+':'−'}${Math.abs(r)}</span>`;
          }).join(' · ');
        const bkH=b.hours||8;const bkRepH=Math.max(0,(wo?.trainingH||5)+vacTrainingHBonus(G.currentQuarter||1)-bkH);
        return `<div class="pz-opcion${sel?' sel':''}" onclick="selectTraining('${b.id}')">
          <b>${b.name}</b> <span class="pz-efectos">· ${bkH} h/sem · quedan ${bkRepH} h para reputación</span>
          <div class="pz-efectos" style="margin:2px 0 6px">${b.desc} ${b.detail}</div>
          <div class="pz-efectos" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>${effs}</span><span>carga → <span class="${loadCls}">${loadAfter} %</span></span></div>
          ${taperHint}${momWarn}${flavor}
        </div>`;}).join('')}
    </div>
    ${G.trainingEvent?`<div class="pz-diag" style="margin-bottom:12px">${G.trainingEvent.icon} <b>Evento de entrenamiento:</b> ${G.trainingEvent.title} — ${G.trainingEvent.desc}</div>`:''}
    ${G.carreraVida&&G.lifecyclePhase==='overlap'&&G.lifeAthlete?renderAthleteHoursBlock():''}
    <button class="pz-btn" onclick="doStartRaces()" ${!G.trainingBlock?'disabled':''}>${G.raceResults.length>0||G.currentRaceIdx>0?'Seguir con la temporada →':'¡Empezar temporada! →'}</button>
  </div>`;
  // T106 (v93): esto era un `<script>` interpolado dentro del innerHTML. El
  // navegador NO ejecuta los <script> insertados por innerHTML, así que el
  // perfil de «Ver próxima carrera» nunca ha tenido manejadores: tocar un tramo
  // no hacía nada, y como el panel arranca plegado nadie lo notaba. Es
  // justamente el punto ciego que ni el linter ni content.js ven. Ahora se
  // engancha como en todas las demás pantallas, después de pintar.
  if(nextRace)attachProfHandlers(nextRace,nextRace.id+'preview','preview',0);
}

// ── Bloque de horas al atleta (fase overlap) ──────────────────────────────────
function renderAthleteHoursBlock(){
  const a=G.lifeAthlete;
  if(!a)return '';
  const first=esc(a.name.split(' ')[0]);
  const h=G.lifeAthleteHours||0;
  const effPct=Math.round(lifeAthleteEffMult(h)*100);
  const opts=[0,2,5,10];
  return `
    <div style="border-top:1px solid var(--line);margin:16px 0 14px;padding-top:14px">
      <div style="font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:8px">Horas para ${first} esta semana</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        ${opts.map(v=>{
          const sel=h===v;
          return `<div onclick="setAthleteHours(${v})" style="flex:1;text-align:center;padding:8px 4px;border-radius:8px;border:1.5px solid ${sel?'var(--acc-entrenador)':'var(--line)'};background:${sel?'var(--acc-entrenador-t)':'var(--card)'};cursor:pointer;font-size:13px;font-weight:${sel?'600':'400'};color:${sel?'var(--acc-entrenador)':'var(--ink2)'};transition:all .15s">${v}h</div>`;
        }).join('')}
      </div>
      ${h>0?`<div style="font-size:12px;color:var(--avi)">–${h}h para ti · +${h}h para ${first} · tu entrenamiento al <strong>${effPct}%</strong> · al cerrar la temporada, ${first} +1 en ${lifeAthleteSeasonGain(h)} stat${lifeAthleteSeasonGain(h)>1?'s':''}</div>`
           :`<div style="font-size:12px;color:var(--ink3)">Sin horas asignadas — entrenas al 100%</div>`}
    </div>`;
}
// Mejora del atleta al cerrar la temporada según las horas semanales: +1 en 1, 2 o 3 stats.
function lifeAthleteSeasonGain(h){return h<=0?0:h>=10?3:h>=5?2:1;}
function lifeAthleteEffMult(h){
  // 0h=100%, 2h=90%, 5h=75%, 10h=60%
  if(h<=0)return 1.0;
  if(h<=2)return 0.90;
  if(h<=5)return 0.75;
  return 0.60;
}
window.setAthleteHours=h=>{
  G.lifeAthleteHours=h;
  const first=G.lifeAthlete?esc(G.lifeAthlete.name.split(' ')[0]):'el atleta';
  if(h>0)showToast(`–${h}h para ti · +${h}h para ${first}`);
  else showToast('Entrenas al 100% — sin horas para el atleta');
  // DS06 (v95): buscaba [data-athlete-hours] para repintar solo este bloque, pero
  // el bloque nunca llevó ese atributo y siempre caía en render(). Y menos mal: la
  // «Efectividad» de la cabecera y lo que sube cada bloque dependen de estas
  // horas, y un repintado parcial los habría dejado desfasados. Se repinta entero
  // conservando el scroll, que era lo que se buscaba.
  const y=window.scrollY||0;
  render();
  if(window.scrollTo)window.scrollTo(0,y);
};
// ── PRE-RACE PREP (Tanda 7) ────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Decisión, referencia «Preparación» (§ 7):
// interruptor de calentamiento y el gasto total de la preparación. Sin hex.
function renderPreRacePrep(){
  const el=$main();
  const race=G.selectedRaces[G.currentRaceIdx];
  if(!race){G.screen='preRace';render();return;}
  const isUltra=race.km>=40;
  const rep=getReputationBonus(race.id);
  const abandon=getAbandonPenalty();
  const altPenalty=getAltitudePenalty(race);
  const sel=G.preRaceNutrition||'pasta';
  const bag=G.dropbagItems||[];
  const gastoNut=getNutritionCost(sel)||0, gastoGeles=(G.gelsCarried||0)*2;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-carrera">${icono('temporada')}Carrera · la noche antes</div>
    <div class="pz-titulo">Preparación previa</div>
    <p class="pz-sub">${esc(race.name)} · ${race.type}</p>
    ${rep||abandon||altPenalty>0?`<div class="pz-tarjeta pz-estado">
      ${rep?`<div class="pz-linea"><span class="pz-diag mas"><b>${rep.label}</b> — +${rep.statBonus.mental} Mental esta carrera${rep.sponsorBonus?' · Sponsors lo valoran':''}</span></div>`:''}
      ${abandon?`<div class="pz-linea"><span class="pz-diag ojo">${abandon.label} — los sponsors reducen sus ofertas (×${abandon.sponsorMult})</span></div>`:''}
      ${altPenalty>0?`<div class="pz-linea"><span class="pz-diag ojo">Carrera de alta altitud — sin entrenamiento específico irás un ${Math.round(altPenalty*100)} % más lento en subidas. Club de Alta Montaña o entrenador lo reducen.</span></div>`:''}
    </div>`:''}
    ${G.injuryType?`<div class="pz-tarjeta">
      <div class="injury-type" style="font-size:15px">${INJURY_TYPES[G.injuryType]?.label||'Lesión'} — llegas tocado <button class="tip-btn" onclick="showTip('Tipos de lesión','${['tendinitis','rotura','fractura'].map(k=>`<strong>${INJURY_TYPES[k].label}</strong> — ${injuryBlockText(k)}.`).join('<br>')}<br><br>Los stats perdidos se recuperan poco a poco. El <strong>fisioterapeuta</strong> acorta las bajas y acelera esa recuperación. La carga corporal alta es la principal causa.')">ⓘ</button></div>
      <div class="pz-efectos" style="margin-top:4px">Energía inicial <span class="pz-num">${INJURY_TYPES[G.injuryType]?.nextRaceStats?.energy||80} %</span> · Piernas <span class="pz-num">${INJURY_TYPES[G.injuryType]?.nextRaceStats?.legs||70} %</span> · Hidratación <span class="pz-num">${INJURY_TYPES[G.injuryType]?.nextRaceStats?.hydration||80} %</span></div>
      ${hasFisio()?`<div class="pz-diag mas">El fisio reduce el impacto.</div>`:'<div class="pz-diag menos">Sin fisio el impacto es máximo. Considera ir conservador.</div>'}
    </div>`:''}

    <div class="pz-label" style="margin:14px 0 6px">Nutrición la noche antes <button class="tip-btn" onclick="showTip('Nutrición pre-carrera','Lo que comes la noche antes afecta tu <strong>energía inicial</strong> en carrera. Las opciones básicas están siempre disponibles. Las avanzadas (ayuno glucémico, protocolo pro) se desbloquean con años de experiencia.<br><br>Algunas opciones tienen <strong>coste económico</strong>. Si tienes una lesión activa, la energía inicial parte ya penalizada independientemente de la nutrición.')">ⓘ</button></div>
    ${PRE_RACE_NUTRITION.map(n=>{
      const avail=isNutritionAvailable(n);
      const cost=getNutritionCost(n.id);
      const isSel=sel===n.id;
      return `<div class="pz-opcion${isSel?' sel':''}${!avail.ok?' pz-bloqueado':''}" ${avail.ok?`onclick="setPreNutrition('${n.id}')"`:''}>
        <b>${n.label}</b><div class="pz-efectos">${n.desc}</div>
        ${!avail.ok?motivoHTML(avail.reason):''}
        <div class="pz-efectos" style="margin-top:4px">${n.energyBonus>0?`Energía <span class="pz-mas">+${n.energyBonus}</span>`:n.energyBonus<0?`Energía <span class="pz-menos">${n.energyBonus}</span>`:'Sin bonus'}${cost>0?` · <span class="pz-num">€${cost}</span>`:''}</div>
      </div>`;}).join('')}

    ${isUltra?`
    <div class="pz-label" style="margin:14px 0 6px">Dropbag (máx. 2) <button class="tip-btn" onclick="showTip('Dropbag','Disponible en ultras de 40km+. Dejas hasta <strong>2 items</strong> en el avituallamiento central antes de salir.<br><br>Puedes usarlos <strong>una sola vez</strong> al pasar por ese avituallamiento en carrera. Elige según tus puntos débiles: energía, hidratación o recuperación de piernas.<br><br>Si no ves la opción de usar la dropbag en el avituallamiento, es que todavía no has llegado al punto donde la dejaste.')">ⓘ</button></div>
    <p class="pz-efectos" style="margin-bottom:8px">Deja una bolsa en el avituallamiento central con material extra.</p>
    <div class="pz-tarjeta" style="padding:2px 14px">${DROPBAG_OPTIONS.map(d=>{
      const isSel=bag.includes(d.id);
      const maxed=!isSel&&bag.length>=2;
      return `<label class="pz-fila" style="cursor:${maxed?'default':'pointer'};${maxed?'color:var(--ink3)':''}"><input type="checkbox" class="pz-casilla" ${isSel?'checked':''} ${maxed?'disabled':''} onchange="toggleDropbag('${d.id}')"><span class="pz-fila-txt"><b>${d.label}</b><div class="pz-efectos">${d.desc}</div></span></label>`;}).join('')}</div>`:''}

    <div class="pz-label" style="margin:14px 0 6px">Geles en el bolsillo <button class="tip-btn" onclick="showTip('Geles en carrera','Lleva geles en el bolsillo para usarlos en cualquier tramo, sin esperar al avituallamiento.<br><br>Cada gel da <strong>+18 energía</strong> (o +22 con sponsor nutrición) y cuesta <strong>€2</strong>. Máximo 5 geles.<br><br>En carreras cortas (−20km) llevar muchos no tiene sentido. Para ultras, pueden ser decisivos en el último tercio.')">ⓘ</button></div>
    <div class="pz-tarjeta" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <span class="pz-efectos">€2 cada uno · <span class="pz-mas">+${(G.gelsCarried||0)*18}</span> energía potencial</span>
      <span class="pz-stepper"><button onclick="G.gelsCarried=Math.max(0,(G.gelsCarried||0)-1);render()" ${!(G.gelsCarried>0)?'disabled':''}>−</button><span class="pz-stepper-n">${G.gelsCarried||0}</span><button onclick="G.gelsCarried=Math.min(5,(G.gelsCarried||0)+1);render()" ${G.gelsCarried>=5?'disabled':''}>+</button></span>
    </div>
    ${(G.gelsCarried||0)>0?`<div class="pz-diag" style="margin:-4px 0 12px">Úsalos en cualquier tramo con el botón que aparecerá en carrera.</div>`:''}

    <div class="pz-label" style="margin:14px 0 6px">Calentamiento <button class="tip-btn" onclick="showTip('Calentamiento','20 minutos de calentamiento antes de la salida.<br><br><strong>Coste:</strong> −5 Energía inicial.<br><strong>Beneficio:</strong> +4 Velocidad y +3 Subida durante toda la carrera.<br><br>Vale la pena en carreras cortas (−25km) donde la velocidad importa desde el primer tramo. Para ultras, el coste de energía no compensa.')">ⓘ</button></div>
    <label class="pz-tarjeta" style="display:flex;align-items:center;gap:12px;cursor:pointer">
      <span class="pz-fila-txt"><b>Calentar 20 minutos</b><div class="pz-efectos">Energía <span class="pz-menos">−5</span> · Velocidad <span class="pz-mas">+4</span> · Subida <span class="pz-mas">+3</span> durante la carrera</div>
        ${race.km>25?`<div class="pz-diag ojo">En ultras el coste de energía puede no compensar</div>`:`<div class="pz-diag mas">Para esta distancia es una buena decisión</div>`}</span>
      <input type="checkbox" class="pz-interruptor" ${G.warmedUp?'checked':''} onchange="G.warmedUp=this.checked;render()">
    </label>

    <div class="pz-tarjeta pz-estado"><div class="pz-linea"><span class="pz-fila-txt"><b>Gasto de la preparación</b><div class="pz-efectos">Nutrición €${gastoNut} · geles €${gastoGeles}</div></span><span class="pz-num" style="font-size:20px">${fmtEur(-(gastoNut+gastoGeles))}</span></div></div>

    <button class="pz-btn" style="margin-top:4px" onclick="goPreRace()">Confirmar y ver briefing →</button>
  </div>`;
}
window.setPreNutrition=id=>{G.preRaceNutrition=id;render();};
window.toggleDropbag=id=>{
  if(!G.dropbagItems)G.dropbagItems=[];
  const idx=G.dropbagItems.indexOf(id);
  if(idx>=0)G.dropbagItems.splice(idx,1);
  else if(G.dropbagItems.length<2)G.dropbagItems.push(id);
  render();
};

// ══════════════════════════════════════
//  CONDICIÓN DEL DÍA DE CARRERA
// ══════════════════════════════════════
// Paso 6 de la dirección visual (2026-10-30): tipo Lista, como el calendario, con las ya
// corridas marcadas y sin poder tocarlas. Sin hex.
function renderMidSeasonCalendar(){
  const el=$main();
  const doneNames=G.raceResults.map(r=>r.name);
  const selIds=G.selectedRaces.map(r=>r.id);
  const spent=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
  const canAccess=canAccessRace;   // DS08 (v95)
  const qLabel={1:'Primer trimestre',2:'Segundo trimestre',3:'Tercer trimestre',4:'Cuarto trimestre'};
  function raceRow(r){
    const isDone=doneNames.includes(r.name);
    const isSel=selIds.includes(r.id);
    const locked=!canAccess(r);
    const noMoney=!isSel&&(spent+r.cost>G.money);
    if(isDone)return `<div class="pz-fila" style="color:var(--ink3);border-top:1px solid var(--line);border-bottom:none"><input type="checkbox" class="pz-casilla" checked disabled tabindex="-1" aria-hidden="true"><span class="pz-fila-txt"><s>${esc(r.name)}</s><div class="pz-efectos">${r.monthName} · ya corrida</div></span><span class="pz-diag mas">hecha</span></div>`;
    const clic=!locked;
    return `<div class="pz-fila${locked?' pz-bloqueado':''}" style="cursor:${clic?'pointer':'default'};align-items:flex-start;border:none;border-top:1px solid var(--line)" ${clic?`onclick="toggleRaceMid('${r.id}')"`:''}>
      <input type="checkbox" class="pz-casilla" style="pointer-events:none;margin-top:2px" ${isSel?'checked':''} ${clic?'':'disabled'} tabindex="-1" aria-hidden="true">
      <span class="pz-fila-txt"><span style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><b>${esc(r.name)}</b>${nivelTag(r.tier)}${inviteBadge(r)}</span>
        <div class="pz-efectos">${r.monthName} · ${r.type} · ${raceDesnivel(r)}</div>
        ${locked?motivoHTML(r.zegamaSpecial?'Invitación Top 20 o clasificación por tiempo (corte 4h20)':'Ranking #'+r.reqRanking+' requerido'):''}
        ${noMoney&&!isSel?motivoHTML('Sin presupuesto'):''}</span>
      <span style="text-align:right"><div class="pz-num">€${r.prize}</div><div class="pz-efectos">€${r.cost} inscr.</div></span>
    </div>`;
  }
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-carrera">${icono('calendario')}Carrera · a mitad de temporada</div>
    <div class="pz-titulo">Modificar calendario</div>
    <p class="pz-sub">Las carreras ya corridas no se pueden cambiar.</p>
    ${QUARTERS.map(q=>{
      const races=RACES_DB.filter(r=>r.quarter===q.n);
      const specRaces=getSpecRaces().filter(r=>r.quarter===q.n);
      const allQ=[...races,...specRaces];
      const qSel=allQ.filter(r=>selIds.includes(r.id)).length;
      const qDone=allQ.filter(r=>doneNames.includes(r.name)).length;
      const isOpen=(G.openQuarters?.mid||[]).includes(q.n);
      return `<div class="pz-tarjeta" style="padding:0;overflow:hidden">
        <div class="pz-fila navega" style="padding:12px 14px;border:none;${qSel>0?'box-shadow:inset 3px 0 0 var(--acc)':''}" onclick="toggleQMid(${q.n})">
          <span class="pz-fila-txt"><b>${qLabel[q.n]}</b> <span class="pz-efectos">· ${q.months}</span></span>
          <span class="pz-efectos">${qDone>0?qDone+' hecha'+(qDone>1?'s':''):''}${qDone>0&&qSel>qDone?' · ':''}${qSel>qDone?(qSel-qDone)+' pendiente'+(qSel-qDone>1?'s':''):''}</span>
        </div>
        ${isOpen?`<div style="padding:0 14px 8px" onclick="event.stopPropagation()">
          ${races.map(r=>raceRow(r)).join('')}
          ${specRaces.length>0?`<div class="pz-label" style="padding:10px 0 2px">★ Específicas de tu especialidad</div>${specRaces.map(r=>raceRow(r)).join('')}`:''}
        </div>`:''}
      </div>`;}).join('')}
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:14px">
      <button class="pz-btn sec" onclick="G.screen='betweenManage';render()">← Volver</button>
      <button class="pz-btn" onclick="afterRace()">Confirmar →</button>
    </div>
  </div>`;
}

window.toggleQMid=q=>{
  if(!G.openQuarters)G.openQuarters={cal:[],mid:[],tab:[]};
  const arr=G.openQuarters.mid;
  const idx=arr.indexOf(q);
  if(idx>=0)arr.splice(idx,1);else arr.push(q);
  render();
};

window.toggleRaceMid=id=>{
  const race=RACES_DB.find(r=>r.id===id);if(!race)return;
  const idx=G.selectedRaces.findIndex(r=>r.id===id);
  if(idx>=0&&idx>=G.currentRaceIdx){
    G.selectedRaces.splice(idx,1);
  } else if(idx<0){
    const spent=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
    if(spent+race.cost>G.money){alert('Sin presupuesto para esta inscripción.');return;}
    // Insertar en la posición correcta según mes
    const insertAt=G.selectedRaces.findIndex((r,i)=>i>=G.currentRaceIdx&&r.month>race.month);
    if(insertAt===-1)G.selectedRaces.push({...race});
    else G.selectedRaces.splice(insertAt,0,{...race});
  }
  render();
};

// ── CIRCUITS ───────────────────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Lista; los puntos de liga como cifra, no
// como color. Sin hex (el color propio de cada circuito ya no se usa).
function renderCircuits(){
  const el=$main();
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-carrera">${icono('reputacion')}Carrera · ligas</div>
    <div class="pz-titulo">Circuitos y ligas</div>
    <p class="pz-sub">Únete a un circuito para ganar puntos extra y premios al final del año.</p>
    ${CIRCUITS_DB.map(c=>{
      const joined=G.joinedCircuits.includes(c.id);
      const locked=c.reqRanking&&G.ranking>c.reqRanking;
      const pts=G.circuitPoints[c.id]||0;
      const raceNames=c.raceIds.map(id=>{const r=[...RACES_DB,...getSpecRaces()].find(x=>x.id===id);return r?r.name:id;});
      const pct=Math.min(100,Math.round(pts/c.pointsForPrize*100));
      return `<div class="pz-opcion${joined?' sel':''}${locked?' pz-bloqueado':''}" ${locked?'':`onclick="toggleCircuit('${c.id}')"`}>
        <b>${c.name}</b>${joined?' <span class="pz-chip mas" style="margin:0 0 0 4px">Unido</span>':''}
        <div class="pz-efectos">${c.desc}</div>
        ${locked?motivoHTML('Ranking #'+c.reqRanking+' requerido'):''}
        <div class="pz-efectos" style="margin-top:6px">Carreras: ${raceNames.map(esc).join(' · ')}</div>
        <div class="pz-efectos">Premio: ${c.prize}</div>
        ${joined?`<div style="display:flex;justify-content:space-between;margin:8px 0 4px" class="pz-efectos"><span>Puntos</span><span class="pz-num" style="color:var(--ink)">${pts} / ${c.pointsForPrize}</span></div>
        <div class="pz-barra"><div class="pz-relleno" style="width:${pct}%;background:var(--carrera)"></div></div>`:''}
      </div>`;}).join('')}
    <button class="pz-btn sec" style="margin-top:8px" onclick="G.screen='seasonStart';autoSave();render()">← Volver</button>
  </div>`;
}
window.toggleCircuit=id=>{
  const idx=G.joinedCircuits.indexOf(id);
  if(idx>=0)G.joinedCircuits.splice(idx,1);
  else G.joinedCircuits.push(id);
  render();
};

// ── FAME TAB ───────────────────────────
function renderFameTab(){
  const el=$main();
  const f=G.followers||0;
  const level=fameLevel();
  const nextLevel=FAME_THRESHOLDS.find(t=>t.followers>f);
  const availH=availableFameHours();
  const hasRecentRace=G.raceResults.length>0;
  const hasSponsor=Object.values(G.sponsors).some(Boolean);
  // Paso 6 de la dirección visual (2026-10-30): pestaña Reputación, tipo Lista (§ 7): las
  // acciones en filas con coste, seguidores, usos y el motivo si no se puede. Sin hex.
  const wo=curWorkOpt();const blockH=G.trainingBlockHours||8;const totalH=(wo?.trainingH||5)+vacTrainingHBonus(G.currentQuarter||1);const repH=Math.max(0,totalH-blockH);
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-gente">${icono('reputacion')}Gente · reputación</div>
    <div class="pz-titulo">Reputación</div>
    <p class="pz-sub">${esc(G.runner.name||'Corredor')}</p>
    <div class="pz-tarjeta">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div class="pz-label">Seguidores</div><div class="pz-num" style="font-size:28px">${fmtMiles(f)}</div></div>
        <div><div class="pz-label">Nivel</div><div style="font-weight:600;font-size:16px">${level?level.label:'Desconocido'}</div><div class="pz-efectos">${level?level.benefit:''}</div></div>
      </div>
      <div class="pz-barra" style="margin:10px 0 6px"><div class="pz-relleno" style="width:${nextLevel?Math.min(100,Math.round(f/nextLevel.followers*100)):100}%;background:var(--gente)"></div></div>
      ${nextLevel?`<div class="pz-efectos">Próximo nivel: <b>${nextLevel.label}</b> a <span class="pz-num">${fmtMiles(nextLevel.followers-f)}</span> seguidores</div>`:''}
    </div>
    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea"><span class="pz-fila-txt">Horas para reputación<div class="pz-efectos">${totalH} h de entreno − ${blockH} h de bloque = ${repH} h · usadas ${G.fameHoursUsed||0} h</div></span><span class="pz-num ${availH<=2?'pz-menos':availH<=5?'pz-ojo':''}" style="font-size:20px">${availH} h</span></div>
      ${availH<=2?`<div class="pz-linea"><span class="pz-diag ojo">Pocas horas disponibles — más actividad en redes reducirá tu tiempo de entrenamiento.</span></div>`:''}
    </div>
    ${(G.repInvitations||[]).length>0?`<div class="pz-label" style="margin:14px 0 6px">📩 Invitaciones esta temporada</div>
      <div class="pz-tarjeta" style="padding:2px 14px">${G.repInvitations.map(r=>`<div class="pz-fila"><span class="pz-fila-txt"><b>${esc(r.name)}</b><div class="pz-efectos">${r.tier} · ${r.monthName||''}</div></span><button class="pz-btn sec" style="width:auto;padding:6px 12px" onclick="addRepInvitation('${r.id}')">Añadir</button></div>`).join('')}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Acciones</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
    ${FAME_ACTIONS.map(a=>{
      const done=G.fameActionsThisSeason[a.id]||0;
      const onCooldown=done>=a.cooldown;
      const noHours=availH<a.hours;
      const noSponsor=a.reqSponsor&&!hasSponsor;
      const noRace=a.reqLastRace&&!hasRecentRace;
      const disabled=onCooldown||noHours||noSponsor||noRace;
      const reason=onCooldown?'Límite de esta temporada alcanzado':noSponsor?'Necesitas un sponsor activo':noRace?'Necesitas haber corrido una carrera primero':noHours?'Sin horas disponibles':'';
      return `<div class="pz-fila${disabled?'':' navega'}" style="align-items:flex-start;${disabled?'color:var(--ink3)':'cursor:pointer'}" ${disabled?'':`onclick="doFameAction('${a.id}')"`}>
        <span style="font-size:18px">${a.icon}</span>
        <span class="pz-fila-txt"><b>${a.label}</b><div class="pz-efectos">${a.desc}</div>
          <div class="pz-efectos">${a.hours} h · <span class="pz-mas">+${a.followers}</span> seguidores${a.income?` · <span class="pz-mas">+€${a.income}</span>`:''} · ${done}/${a.cooldown} usadas</div>
          ${reason?motivoHTML(reason):''}</span>
      </div>`;}).join('')}
    </div>
  </div>`;
}
window.doFameAction=id=>{
  const a=FAME_ACTIONS.find(x=>x.id===id);if(!a)return;
  const availH=availableFameHours();
  if(availH<a.hours){alert('Sin horas disponibles.');return;}
  G.fameHoursUsed=(G.fameHoursUsed||0)+a.hours;
  addFollowers(a.followers);
  G.fameActionsThisSeason[id]=(G.fameActionsThisSeason[id]||0)+1;
  if(a.income)G.money+=a.income;
  if(a.statBonus)Object.entries(a.statBonus).forEach(([k,v])=>{G.runner.stats[k]=Math.min(100,(G.runner.stats[k]||0)+v);});
  showToast('+'+a.followers+' seguidores 📱');
  checkFollowerThresholds();
  render();
};
window.addRepInvitation=id=>{
  const inv=(G.repInvitations||[]).find(r=>r.id===id);
  if(!inv)return;
  if(!G.selectedRaces.find(r=>r.id===id))G.selectedRaces.push(inv);
  G.repInvitations=(G.repInvitations||[]).filter(r=>r.id!==id);
  showToast('📩 '+inv.name+' añadida al calendario');
  render();
};
// ── BETWEEN RACE MANAGEMENT ────────────
// ── CLUB SETUP ─────────────────────────
function renderBetweenManage(){
  const el=$main();
  const load=getBodyLoad();
  const lt=getLoadThresholdsByMode();
  const nextRace=G.selectedRaces[G.currentRaceIdx];
  const hasFisioContract=G.spending.fisio||G.club?.hasFisio;
  const FISIO_OPTIONS=[
    {id:'session',label:'Sesión de fisio',cost:40,loadRedux:15,desc:'Una sesión rápida. Baja la carga y reduces riesgo de lesión.'},
    {id:'massage',label:'Masaje deportivo',cost:25,loadRedux:8,desc:'Menos intenso pero más barato. Buena recuperación muscular.'},
    {id:'rest',label:'Descanso activo',cost:0,loadRedux:5,desc:'Sin coste. Movilidad suave y stretching.'},
  ];
  // Paso 6 de la dirección visual (2026-10-30): tipo Decisión, referencia «Entreno»: la
  // recuperación como opciones y «otras opciones» como navegación en lista. Sin hex.
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-cuerpo">${icono('corredor')}Cuerpo · ${G.currentRaceIdx} de ${G.selectedRaces.length} corridas</div>
    <div class="pz-titulo">Entre carreras</div>
    <p class="pz-sub">${nextRace?'Próxima: '+esc(nextRace.name):'Fin de temporada'}</p>
    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea" style="display:block">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span class="pz-label">Carga corporal</span><span class="pz-num ${load>=lt.warningLevel2?'pz-menos':load>=lt.warningLevel1?'pz-ojo':''}" style="font-size:18px">${load} %</span></div>
        <div class="pz-barra"><div class="pz-relleno${load>=lt.warningLevel2?' menos':load>=lt.warningLevel1?' ojo':''}" style="width:${Math.min(100,load)}%"></div><div class="pz-umbral" style="left:70%"></div></div>
      </div>
      ${load>=lt.warningLevel2?`<div class="pz-linea"><span class="pz-diag menos">Carga alta — considera recuperar antes de la próxima.</span></div>`:
        load>=lt.warningLevel1?`<div class="pz-linea"><span class="pz-diag ojo">Carga moderada. Una sesión te vendrá bien.</span></div>`:''}
      ${hasFisioContract?(()=>{const cov=Math.round((1-fisioInjuryMult(load))*100);const sat=load>=lt.warningLevel1;
        return `<div class="pz-linea"><span class="pz-diag ${sat?'ojo':'mas'}">🧑‍⚕️ Fisio contratado — hoy te cubre un <b>${cov} %</b> del riesgo de lesión. ${sat?'Con la carga a este nivel ya no da abasto. Una sesión puntual la baja y vuelve a protegerte.':'Las sesiones puntuales son extra.'}</span></div>`;})():''}
    </div>
    ${debtPanel()}
    <div class="pz-label" style="margin:14px 0 6px">Recuperación${G._recoveryUsed?' · 1 acción usada':''}</div>
    ${FISIO_OPTIONS.map(o=>{
      const cantAfford=o.cost>0&&o.cost>G.money;
      const alreadyUsed=!!G._recoveryUsed;
      const disabled=cantAfford||alreadyUsed;
      const reason=alreadyUsed?'Ya has usado una acción de recuperación':cantAfford?'Sin presupuesto':'';
      return `<div class="pz-opcion${disabled?' pz-bloqueado':''}" ${disabled?'':`onclick="doRecovery('${o.id}')"`}>
        <span style="float:right;text-align:right">${o.cost>0?`<span class="pz-num">€${o.cost}</span>`:'<span class="pz-efectos">Gratis</span>'}</span>
        <b>${o.label}</b><div class="pz-efectos">${o.desc} · carga <span class="pz-mas">−${o.loadRedux} %</span></div>
        ${reason?motivoHTML(reason):''}
      </div>`;}).join('')}
    <div class="pz-label" style="margin:14px 0 6px">Otras opciones</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      <div class="pz-fila navega" onclick="G.screen='midSeasonCalendar';render()"><span>📅</span><span class="pz-fila-txt"><b>Modificar calendario pendiente</b><div class="pz-efectos">Añade o quita carreras que aún no has corrido</div></span></div>
      <div class="pz-fila navega" onclick="G._clubFromBetween=true;G.screen='clubSetup';render()"><span>🏃</span><span class="pz-fila-txt"><b>${G.club&&G.club.id!=='none'?'Club: '+esc(G.club.name):'Unirse a un club'}</b><div class="pz-efectos">${G.club&&G.club.id!=='none'?'Ver reputación o cambiar de club':'Sin club actualmente — explorar opciones'}</div></span></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px">
      ${G._raceResult?`<button class="pz-btn sec" onclick="G.screen='raceResult';render()">← Ver resumen</button>`:'<div></div>'}
      <button class="pz-btn" onclick="afterRace()">Siguiente carrera →</button>
    </div>
  </div>`;
}
window.doRecovery=id=>{
  if(G._recoveryUsed){showToast('Ya has usado una acción de recuperación');return;}
  const opts={session:{cost:40,loadRedux:15},massage:{cost:25,loadRedux:8},rest:{cost:0,loadRedux:5}};
  const o=opts[id];if(!o)return;
  if(o.cost>G.money){alert('Sin presupuesto.');return;}
  G.money-=o.cost;
  G.bodyLoad=Math.max(0,G.bodyLoad-o.loadRedux);
  G._recoveryUsed=true;
  const _rec=recoverInjurySequel(INJURY_SEQUEL_RECOVERY[id]);   // v96: también recupera secuela de lesión
  showToast(`Carga -${o.loadRedux}%${o.cost>0?' · -€'+o.cost:''}${_rec?' · stats +'+_rec:''}`);
  render();
};
// Paso 6: pantalla puente con un evento entre carreras; tipo Evento (tarjeta de momento).
function renderBetweenRace(){
  const el=$main();const ev=G.pendingEvent;
  if(!ev){goNextRace();return;}
  el.innerHTML=`<div class="pz"><div class="pz-tarjeta">
    <div class="pz-etiqueta acento">Entre carreras</div>
    <div class="pz-titulo" style="font-size:22px">${ev.title}</div>
    <p class="pz-sub" style="color:var(--ink);line-height:1.6">${ev.desc}</p>
    ${ev.choices.map((c,i)=>`<button class="pz-opcion" onclick="handleEv('${ev.id}',${i})"><b>${c.text}</b></button>`).join('')}
  </div></div>`;
}

// ══════════════════════════════════════
//  ACCIONES
// ══════════════════════════════════════
window.selSpec=id=>{G.runner.specialty=id;G.runner.stats=applyAgeToStats({...SPEC_STATS[id]},G.runner.age||25);render();};
window.setWorkQ=(q,pct)=>{
  const wo=WORK_OPTIONS.find(o=>o.pct===pct);if(!wo)return;
  if(!G.workByQuarter)G.workByQuarter={1:100,2:100,3:100,4:100};
  const prevPct=G.workByQuarter[q];
  const prevWo=WORK_OPTIONS.find(o=>o.pct===prevPct);
  const diff=Math.abs(pct-prevPct);
  // Penalización por cambio brusco (>20% diferencia, no es el primer trimestre)
  if(prevWo&&diff>=40&&q>1){
    // Pierde 1 mes de ingresos por romper el acuerdo laboral
    const penalty=Math.round((prevWo.income||0)*1.0);
    if(!G.workChangePenalties)G.workChangePenalties={};
    G.workChangePenalties[q]={amount:penalty,trainingEff:0.65};
  } else if(prevWo&&diff>=20&&q>1){
    // Cambio moderado — pierde 2 semanas de eficiencia
    if(!G.workChangePenalties)G.workChangePenalties={};
    G.workChangePenalties[q]={amount:0,trainingEff:0.80};
  } else {
    if(G.workChangePenalties)delete G.workChangePenalties[q];
  }
  setWorkPct(pct,q); // T22 (v89): un solo camino de escritura
  G.trainingHoursPerWeek=wo.trainingH;
  render();
};
window.doStart=()=>{
  if(!(G.runner.name||'').trim())G.runner.name='Corredor';
  G.runner.stats=applyAgeToStats({...SPEC_STATS[G.runner.specialty]},G.runner.age||25);
  G.money=modeCfg().startMoney;
  G.activeTab='game';
  if(G.gameMode==='expres'){
    // Exprés: sin jornada laboral, va al flujo exprés
    G.workByQuarter={1:60,2:60,3:60,4:60};G.workPct=60;G.trainingHoursPerWeek=16; // T22 (v89)
    G.workByQuarter={1:60,2:60,3:60,4:60};
    G._expressSponsorPool=null;
    G.screen='expresSeasonStart';
  } else {
    G.screen='workSetup';
  }
  // H1 (v95): la partida no se guardaba hasta terminar la primera carrera. Recargar
  // durante la preparación (jornada, calendario, patrocinios, entrenamiento) la
  // devolvía al principio. Ahora cada paso adelante autoguarda.
  autoSave();
  render();
};
window.toggleRace=id=>{
  const allRaces=[...RACES_DB,...getSpecRaces()];
  const race=allRaces.find(r=>r.id===id);if(!race)return;
  const idx=G.selectedRaces.findIndex(r=>r.id===id);
  if(idx>=0){G.selectedRaces.splice(idx,1);}
  else{
    const spent=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
    if(spent+race.cost>G.money){alert('Sin presupuesto para esta carrera.');return;}
    G.selectedRaces.push({...race});
    G.selectedRaces.sort((a,b)=>a.month-b.month);
  }render();
};
window.selectYearObjective=(objId)=>{
  G.yearObjective=objId;
  G._yearObjectiveRewardPaid=false;
  showToast(`Objetivo elegido: ${SEASON_OBJECTIVES.find(o=>o.id===objId)?.label||''}`);
  autoSave();
  render();
};

window.selectSponsor=(cat,spId)=>{
  const sp=SPONSORS_DB.find(s=>s.id===spId);
  if(!sp)return;
  const cur=G.sponsors[cat];
  if(cur){
    if(cur.id===spId){showToast('Ya es tu sponsor activo — rompe el contrato para cambiarlo');return;}
    showToast(`Primero rompe el contrato con ${cur.name}`);return;
  }
  if(!G._pendingSponsors)G._pendingSponsors={};
  // Toggle: si ya está pendiente lo deselecciona, si no lo selecciona
  if(G._pendingSponsors[cat]?.id===spId){
    delete G._pendingSponsors[cat];
  } else {
    G._pendingSponsors[cat]={...sp};
  }
  render();
};
window.confirmSponsors=()=>{
  if(!G._pendingSponsors)return;
  let count=0;
  Object.entries(G._pendingSponsors).forEach(([cat,sp])=>{
    if(!G.sponsors[cat]){
      G.sponsors[cat]=Object.assign({},sp);
      count++;
    }
  });
  G._pendingSponsors={};
  if(count>0)showToast(`✓ ${count} patrocinio${count>1?'s':''} confirmado${count>1?'s':''}`);
  autoSave();render();
};
window.breakSponsorContract=(cat)=>{
  const sp=G.sponsors[cat];
  if(!sp)return;
  const totalValue=sp.salary*sp.duration;
  const penaltyAmount=Math.round(totalValue*0.4);
  // Mostrar confirmación
  const overlay=document.createElement('div');
  overlay.id='break-confirm-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1400;display:flex;align-items:flex-end;justify-content:center;padding-bottom:0';
  overlay.innerHTML=`
    <div style="background:var(--card);border-radius:16px 16px 0 0;padding:24px 20px 36px;width:100%;max-width:560px;animation:slideUp 200ms ease-out both">
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">¿Romper contrato con ${sp.name}?</div>
      <div style="font-size:13px;color:var(--ink2);line-height:1.65;margin-bottom:16px">
        Duración restante: <strong>${sp.duration} temporada${sp.duration!==1?'s':''}</strong><br>
        Valor total restante: <strong>€${totalValue}</strong><br>
        Penalización (40%): <strong style="color:var(--neg)">−€${penaltyAmount}</strong>
      </div>
      <div class="danger" style="margin-bottom:16px;font-size:13px">Una vez roto, perderás el bono <strong>${sp.bonus}</strong> y el objetivo de sponsor quedará sin cumplir este año.</div>
      <div class="grid-2">
        <button class="main" style="margin-top:0;border-color:var(--neg);color:var(--neg)" onclick="confirmBreakSponsor('${cat}')">Romper — €${penaltyAmount}</button>
        <button class="main" style="margin-top:0" onclick="document.getElementById('break-confirm-overlay').remove()">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
};
window.confirmBreakSponsor=(cat)=>{
  const sp=G.sponsors[cat];
  if(!sp)return;
  document.getElementById('break-confirm-overlay')?.remove();
  const totalValue=sp.salary*sp.duration;
  const penaltyAmount=Math.round(totalValue*0.4);
  G.money=Math.max(0,G.money-penaltyAmount);
  const spName=sp.name;
  G.sponsors[cat]=null;
  G._sponsorBreaks=(G._sponsorBreaks||0)+1;   // tracking logro 'joke_fire_sponsor'
  showToast(`Roto contrato con ${spName} · -€${penaltyAmount}`);
  checkAndUnlockAchievements();
  autoSave();
  render();
};
window.selectTraining=id=>{
  G.trainingBlock=TRAINING_BLOCKS.find(b=>b.id===id);
  G.trainingBlockApplied=false; // T25 (v89): bloque nuevo, sin aplicar
  G.trainingBlockHours=G.trainingBlock?.hours||8;
  if(G.trainingBlock){
    const nextRace=G.selectedRaces[0];
    const curMonth=nextRace?nextRace.month:(new Date().getMonth()+1);
    const se=getSeasonEffects(curMonth);
    const eff=effForWork()*(1+se.trainingMod);
    const b=G.trainingBlock;

    // ── Momentum tracking ──────────────────────────────────────────
    if(!G.trainingMomentum||G.trainingMomentum.blockId!==id){
      G.trainingMomentum={blockId:id,count:1};
    } else {
      G.trainingMomentum.count++;
    }

    // ── Taper flag ─────────────────────────────────────────────────
    if(b.taperBlock) G.taperBonus=true;
    else G.taperBonus=false;
    // ── Achievement tracking: training done ───────────────────────
    G._seasonTrainingDone=true;

    // ── Evento de entrenamiento (1 de cada ~4 veces) ───────────────
    G.trainingEvent=getTrainingEvent(id);

    // ── Toast: flavor text si existe, sino deltas ──────────────────
    if(b.flavor&&b.flavor.length){
      const txt=b.flavor[Math.floor(Math.random()*b.flavor.length)];
      showToast('"'+txt+'"');
    } else {
      const parts=Object.entries(b.effects)
        .filter(([,v])=>v!==0)
        .map(([k,v])=>{const r=Math.round(v*eff);const label=k.charAt(0).toUpperCase()+k.slice(1);return r>0?`+${r} ${label}`:(r<0?`${r} ${label}`:'');}).filter(Boolean);
      if(parts.length) showToast('Al cerrar la temporada: '+parts.join(' · '));   // BUG-02 (v96): parecía inmediato
    }
  }
  autoSave();render();
};
window.toggleNR=()=>{const p=document.getElementById('nr-panel'),b=document.getElementById('btn-nr');if(p){const v=p.style.display!=='none';p.style.display=v?'none':'block';if(b)b.textContent=v?'Ver próxima carrera ↓':'Ocultar ↑';}};
window.doStartRaces=()=>{
  if(!G.trainingBlock)return;
  // v96: con la temporada ya empezada esto no es empezar, es volver a la pantalla
  // de entrenamiento a mitad de temporada —el evento «cambiar bloque» lleva ahí, y
  // hasta v95 también el cambio de modo del solapamiento—. Vaciar raceResults y
  // currentRaceIdx repetía las carreras ya corridas y las duplicaba en careerHistory.
  if(G.raceResults.length>0||G.currentRaceIdx>0){goNextRace();autoSave();return;}
  G.raceResults=[];G.currentRaceIdx=0;
  resetRaceFlags();
  if(G.selectedRaces.length===0){
    endSeasonRaces('seasonBalance'); // T25 (v89)
  } else {
    G.screen='preRacePrep';
  }
  autoSave();   // H1 (v95)
  render();
};

// ── Calcula costes y multiplicador de tiempo para un ritmo ──
// 5b: Mejora marginal decreciente por encima del techo suave según modo
function statCapMult(currentVal){
  const softCap={facil:90,medio:85,dificil:80,hardcore:75,expres:85}[G.gameMode||'medio']||75;
  if(currentVal<softCap)return 1.0;
  return Math.max(0.05,1.0-(currentVal-softCap)*0.09);
}
// T25 (v89): esta función no era idempotente y se llamaba desde CINCO sitios,
// uno de ellos renderPreRace() — una función de render. Cualquier repintado con
// el índice de carrera fuera de rango reaplicaba el bloque entero: subida de
// stats, carga corporal y generación de eventos mensuales, otra vez. Ahora se
// marca aplicado; la marca se limpia al elegir bloque y al empezar temporada.
// `force` existe solo para el modo desarrollador.
function applyTraining(force){
  if(!G.trainingBlock)return;
  if(G.trainingBlockApplied&&!force)return;
  G.trainingBlockApplied=true;
  const nextRace=G.selectedRaces[0];
  const curMonth=nextRace?nextRace.month:(new Date().getMonth()+1);
  const se=getSeasonEffects(curMonth);
  let eff=effForWork()*(1+se.trainingMod)*(modeCfg().trainingMult||1.0)*(1-agingDeg()*0.6);

  // Penalización brutal si llegaste a cero sin abandonar en carrera anterior
  if(G.zeroedOutThisRace){eff=eff*0.5;G.zeroedOutThisRace=false;}

  // Aplicar evento de entrenamiento si existe
  const tev=G.trainingEvent;
  if(tev){
    if(tev.effMult) eff=eff*tev.effMult;
    if(tev.statBonus) Object.entries(tev.statBonus).forEach(([k,v])=>{G.runner.stats[k]=Math.max(10,Math.min(100,(G.runner.stats[k]||50)+v));});
    if(tev.loadMod) G.bodyLoad=Math.max(0,Math.min(100,(G.bodyLoad||0)+(tev.loadMod||0)));
    // Toast del evento de entrenamiento (después de un pequeño delay para no solaparse)
    setTimeout(()=>showToast(tev.icon+' '+tev.title),400);
    G.trainingEvent=null;
  }

  // Taper: no sube stats pero sí aplica la carga reducida y activa el bono
  if(G.trainingBlock.taperBlock){
    G.runner.stats.mental=Math.max(10,Math.min(100,Math.round(G.runner.stats.mental+2*eff)));
    G.bodyLoad=bodyLoadAfterTraining(G.trainingBlock.id);
  } else if(G.trainingBlock.crossBlock){
    // Entrenamiento cruzado: efectos normales pero carga mínima; acelera recuperación de lesión
    const crossMult=G.injuryType?1.3:1.0;
    Object.entries(G.trainingBlock.effects).forEach(([k,v])=>{
      const capM=statCapMult(G.runner.stats[k]);
      G.runner.stats[k]=Math.max(10,Math.min(100,Math.round(G.runner.stats[k]+v*eff*crossMult*capM*legsTrainingMult(k))));
    });
    G.bodyLoad=bodyLoadAfterTraining(G.trainingBlock.id);
    if(G.injuryType&&G.injuryRacesLeft>0){G.injuryRacesLeft=Math.max(0,G.injuryRacesLeft-1);}
  } else {
    Object.entries(G.trainingBlock.effects).forEach(([k,v])=>{
      const capM=statCapMult(G.runner.stats[k]);
      G.runner.stats[k]=Math.max(10,Math.min(100,Math.round(G.runner.stats[k]+v*eff*capM*legsTrainingMult(k))));
    });
    G.bodyLoad=bodyLoadAfterTraining(G.trainingBlock.id);
  }
  G.trainingEff=1.0;
  generateMonthlyEvents();
}

// H19 (v95): cobraba el coste en G.money al activarlo y el balance lo volvía a
// restar en ese mismo cierre, así que el primer año se pagaba dos veces (y
// desactivarlo devolvía dinero en cualquier momento). Ahora solo lo cobra
// seasonYearNet(), por adelantado, y no deja contratar si eso te lleva a números
// rojos: endeudarse comprando sigue sin estar permitido (T29). Con la jornada
// forzosa tampoco: la crisis acaba de cancelar el staff.
window.toggleSpend=id=>{
  if(G.spending[id]){G.spending[id]=false;render();return;}
  if(G.forcedFullTime){showToast('Con la jornada forzosa por deuda no puedes contratar staff');return;}
  const cost=(STAFF_COSTS[id]||0)*12;
  if(cost>(G.money||0)+seasonYearNet()){alert('No te llega: contratarlo te dejaría en números rojos al cerrar la temporada.');return;}
  G.spending[id]=true;
  if(id==='fisio')G._clubFisioUsed=true;
  if(id==='entrenador')G._clubEntrenadorUsed=true;
  render();
};

// T04 (v82): aquí había un G.currentRaceIdx++ propio ANTES de llamar a
// afterRace(), que incrementa por su cuenta. Con el incremento que afterRace()
// ya había hecho al registrar la baja, cada lesión avanzaba el índice tres
// veces en lugar de dos y una carrera del calendario se evaporaba: no se corría,
// no se registraba y no aparecía en ningún sitio, con la inscripción ya pagada.
// Traza con [A,B,C,D] y lesión de 2 carreras al terminar A: se marcaba B de baja,
// luego D, y C desaparecía. afterRace() se basta para todo — avanza el índice,
// comprueba fin de temporada y decide la pantalla siguiente.
window.skipInjuredRace=()=>{ afterRace(); };

window.handleEv=(evId,choiceIdx)=>{
  const ev=G.pendingEvent;if(!ev)return goNextRace();
  // T35 (v88): choiceIdx fuera de rango → TypeError al leer .effect
  const choice=(Array.isArray(ev.choices)?ev.choices:[])[choiceIdx];
  if(!choice){G.pendingEvent=null;return goNextRace();}
  switch(choice.effect){
    case'skip':G.skipNext=true;break;case'legs_penalty':G.legsPenalty=true;break;
    case'train_emergency':G.trainingEff=Math.min(G.trainingEff,0.8);break;
    case'train_penalty':G.trainingEff=Math.min(G.trainingEff,0.65);break;
    case'special_train':G.money=Math.max(0,G.money-150);break;
    case'change_block':G.pendingEvent=null;G.screen='training';render();return;
    // T109 + T110 (v93) — la misma línea escondía dos bugs.
    // T109: `extras[0]` con RACES_DB ordenado por mes es SIEMPRE la carrera del
    // mes libre más temprano (casi siempre `pinar`, enero). La «invitación
    // especial» ofrecía la misma carrera en todas las partidas.
    // T110: `splice(G.currentRaceIdx,0,…)` inserta EN el índice actual, y
    // goNextRace() no incrementa currentRaceIdx — ya apunta a la carrera que
    // ibas a correr. Resultado: la extra se colaba delante y desplazaba la
    // carrera para la que ya te habías preparado.
    // Ahora: sorteo entre las que aún caben en lo que queda de temporada e
    // inserción por MES, detrás de la actual. Se excluye la Zegama
    // (`zegamaSpecial`): tiene su propia vía de clasificación (G.zegamaQual) y
    // regalarla en un evento aleatorio se saltaría ese sistema entero.
    case'add_race':{
      const mesActual=G.selectedRaces[G.currentRaceIdx]?.month??0;
      const extras=RACES_DB.filter(r=>!r.zegamaSpecial&&r.month>mesActual
        &&!G.selectedRaces.find(s=>s.id===r.id));
      if(extras.length>0){
        const nueva={...shuffle(extras)[0],_invite:true};   // NOTA-04 (v96): para distinguirla en los calendarios
        let i=G.currentRaceIdx+1;
        while(i<G.selectedRaces.length&&G.selectedRaces[i].month<=nueva.month)i++;
        G.selectedRaces.splice(i,0,nueva);
      }else{
        // DS11 (v95): sin carreras libres, aceptar no hacía nada y no lo decía.
        showToast('No quedan carreras libres en el calendario — la invitación se queda en nada');
      }
      break;
    }
    default:break;
  }
  G.pendingEvent=null;goNextRace();
};
