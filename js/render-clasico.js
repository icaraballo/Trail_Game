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

  el.innerHTML=`
    <h2>Elige tu club</h2>
    <p class="sub">El club define tu entorno de entrenamiento y red de apoyo.</p>

    ${currentClub.id!=='none'?`
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Club actual — ${esc(currentClub.name)}</div>
      ${companion?`<div style="font-size:13px;color:var(--ink2);margin-bottom:8px">Tu compañero: <strong>${esc(companion)}</strong></div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;color:var(--ink3)">Reputación</span>
        <span style="font-size:13px;font-weight:700;color:${repInfo.color}">${repInfo.text}</span>
      </div>
      <div class="load-bar-track"><div class="bar-fill" style="width:${rep}%;background:${rep>=60?'#c07a10':rep>=30?'#4a90d9':'#bbb'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink3);margin-top:3px">
        <span>0</span><span style="color:var(--pos)">75 → Copa de Clubes</span><span>100</span>
      </div>
      ${rep>=75?`<div style="font-size:12px;color:var(--pos);margin-top:6px">✓ Reputación suficiente para la Copa de Clubes</div>`:''}
    </div>`:''}

    <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Opciones disponibles</div>
    ${CLUBS.filter(c=>c.id==='none'||(c.minYear||1)<=G.year).map(c=>{
      const isActive=currentClub.id===c.id;
      const monthCost=c.cost;
      const annualCost=monthCost*12;
      const bonuses=Object.entries(c.statBonus).map(([k,v])=>`+${v} ${k.charAt(0).toUpperCase()+k.slice(1)}`).join(', ');
      const perks=[];
      if(c.hasFisio)perks.push('Fisio incluido');
      if(c.hasEntrenador)perks.push('Entrenador incluido');
      return `<div class="work-card" style="margin-bottom:10px;${isActive?'border:2px solid #4a90d9;':''}" onclick="${isActive?'':'selectClub(\''+c.id+'\')'}">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span class="card-title">${c.name}</span>
            ${isActive?`<span style="font-size:11px;background:#e8eef8;color:#2d4fa0;border-radius:4px;padding:1px 6px;font-weight:600">Actual</span>`:''}
          </div>
          <div class="card-sub">${c.desc}</div>
          ${bonuses?`<div style="font-size:12px;color:var(--pos);margin-top:4px">${bonuses}</div>`:''}
          ${perks.length?`<div style="font-size:12px;color:var(--cuerpo);margin-top:2px">${perks.join(' · ')}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px">
          ${monthCost>0?`<div style="font-size:14px;font-weight:700;color:var(--neg)">-€${monthCost}/mes</div>
          <div style="font-size:11px;color:var(--ink3)">€${annualCost}/año</div>`
          :`<div style="font-size:13px;font-weight:600;color:var(--ink3)">Gratis</div>`}
        </div>
      </div>`;
    }).join('')}

    <div style="margin-top:4px">
      <button class="main" onclick="${fromBetween?`G._clubFromBetween=false;G.screen='betweenManage'`:`G.screen='seasonStart'`};render()">← Volver</button>
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
  return `<span style="font-size:12px;font-weight:600;padding:1px 5px;border-radius:3px;background:#2d7a2a22;color:#2d7a2a">📩 ${ev?'Invitación del organizador':'Invitación por reputación'}</span>`;
}
function renderCalendarTab(){
  const el=$main();
  const selIds=G.selectedRaces.map(r=>r.id);
  const specRaces=getSpecRaces();
  const qLabel={1:'Primer trimestre',2:'Segundo trimestre',3:'Tercer trimestre',4:'Cuarto trimestre'};
  // uses global QUARTERS
  const tierColor=TIER_COLOR_RACE;
  const tierLabel=TIER_LABEL_RACE;
  const canAccess=canAccessRace;   // DS08 (v95)

  // Calcula qué carreras dan puntos de circuito y cuántos
  function circuitBadge(raceId){
    for(const cid of G.joinedCircuits){
      const c=CIRCUITS_DB.find(x=>x.id===cid);
      if(c&&c.raceIds.includes(raceId)){
        const estPts=circuitPoints(3,15);
        return `<span style="font-size:12px;font-weight:600;padding:1px 5px;border-radius:3px;background:#c07a1022;color:var(--avi)">Liga · ~${estPts}pts</span>`;
      }
    }
    return '';
  }

  function calRaceRow(r){
    const isSel=selIds.includes(r.id);
    const isLocked=!canAccess(r);
    const isInvited=!!(G.repInvitations||[]).find(i=>i.id===r.id);
    const cls=isSel?'sel':isLocked?'lock':'avail';
    const badge=circuitBadge(r.id);
    return `<div class="cal-race ${cls}">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:1px">
          <span class="cal-race-name">${r.name}</span>
          <span style="font-size:12px;font-weight:600;padding:1px 5px;border-radius:3px;background:${tierColor[r.tier]||'#888'}22;color:${tierColor[r.tier]||'var(--ink3)'}">${tierLabel[r.tier]||''}</span>
          ${badge}
          ${r.spec?`<span style="font-size:12px;font-weight:600;padding:1px 5px;border-radius:3px;background:#4a8a2a22;color:var(--pos)">★ ${r.spec}</span>`:''}
          ${inviteBadge(r)}
        </div>
        <div class="cal-race-meta">${r.monthName} · ${r.type} · ${raceDesnivel(r)}${isInvited?' · <span style="color:#2d7a2a">ranking no requerido</span>':''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        ${isSel?`<span style="font-size:12px;color:var(--pos);font-weight:600">✓</span>`:isLocked?`<span style="font-size:12px;color:var(--ink3)">🔒</span>`:''}
        <div class="cal-dot" style="background:${isSel?'#4a8a2a':'#ddd'}"></div>
      </div>
    </div>`;
  }

  el.innerHTML=`
    <h2>Calendario ${G.year}</h2>
    <p class="sub">Tu temporada de un vistazo</p>
    ${G.joinedCircuits.length>0?`<div style="font-size:12px;color:var(--avi);background:#c07a1010;border-radius:8px;padding:8px 12px;margin-bottom:12px">
      🏆 Liga activa — las carreras marcadas con <strong>Liga · ~Xpts</strong> suman puntos al circuito
    </div>`:''}
    ${QUARTERS.map(q=>{
      const common=RACES_DB.filter(r=>r.quarter===q.n);
      const spec=specRaces.filter(r=>r.quarter===q.n);
      const allQ=[...common,...spec];
      const qSel=allQ.filter(r=>selIds.includes(r.id)).length;
      const hasLeague=allQ.some(r=>G.joinedCircuits.some(cid=>CIRCUITS_DB.find(c=>c.id===cid)?.raceIds.includes(r.id)));
      const isOpen=(G.openQuarters?.tab||[]).includes(q.n);
      return `
        <div class="quarter-wrap">
          <div class="quarter-toggle ${qSel>0?'has-sel':''}" onclick="toggleQTab(${q.n})">
            <span style="font-size:14px;font-weight:600;flex:1">${qLabel[q.n]}
              <span style="font-size:12px;font-weight:400;color:var(--ink3)"> · ${q.months}</span>
            </span>
            ${hasLeague?`<span style="font-size:12px;color:var(--avi);margin-right:6px">🏆</span>`:''}
            ${qSel>0?`<span style="font-size:12px;color:var(--pos);font-weight:600;margin-right:6px">${qSel} ✓</span>`:''}
            <span style="font-size:12px;color:var(--ink3);display:inline-block;transform:${isOpen?'rotate(90deg)':''};transition:transform .2s">▶</span>
          </div>
          <div class="quarter-content ${isOpen?'open':''}" onclick="event.stopPropagation()">
            ${common.map(r=>calRaceRow(r)).join('')}
            ${spec.length>0?`
              <div style="font-size:12px;color:var(--pos);font-weight:600;padding:6px 2px 4px">★ Específicas de tu especialidad</div>
              ${spec.map(r=>calRaceRow(r)).join('')}
            `:''}
          </div>
        </div>`;}).join('')}
    ${G.trainingBlock?`<div class="card" style="margin-top:8px">
      <div style="font-size:12px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Bloque de entrenamiento</div>
      <div class="card-title">${G.trainingBlock.name}</div>
      <div class="card-sub">${G.trainingBlock.desc}</div>
    </div>`:
    `<div style="font-size:13px;color:var(--ink3);text-align:center;padding:12px 0">Bloque de entrenamiento por elegir</div>`}`;
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

  // ── Sección Tienda Propia ──────────────
  const brandEligible=canLaunchBrand()&&G.gameMode!=='expres';
  const canHireEmployee=G.ownBrand&&!G.ownBrand.hasEmployee&&(G.year>=G.ownBrand.launched+2);
  let brandSection='';
  if(G.ownBrand){
    const yearsActive=G.year-G.ownBrand.launched;
    brandSection=`
    <div class="fin-section" style="border-color:#c07a10">
      <div class="fin-title" style="color:var(--avi)">👟 Tu Marca — ${G.ownBrand.hasEmployee?'Consolidada':'Activa'}</div>
      ${G.ownBrand.hasEmployee
        ? `<div class="fin-row"><span>Ingresos brutos marca</span><span class="plus">+€1.300/mes</span></div>
           <div class="fin-row"><span>Coste empleado</span><span class="minus">-€700/mes</span></div>
           <div class="fin-row"><span>Neto marca</span><span class="plus">+€600/mes</span></div>
           <div style="font-size:12px;color:var(--pos);margin-top:8px">✓ Empleado contratado — sin coste de horas de entrenamiento</div>`
        : `<div class="fin-row"><span>Ingresos marca</span><span class="plus">+€300/mes</span></div>
           <div style="font-size:12px;color:var(--avi);margin-top:8px">⏱ Consume 6h/semana de tu tiempo de entrenamiento</div>
           ${canHireEmployee
             ? `<button class="main" style="margin-top:10px;border-color:#4a8a2a;color:var(--pos)" onclick="doHireEmployee()">Contratar empleado — €700/mes · recuperas 6h entrenamiento</button>`
             : `<div style="font-size:12px;color:var(--ink3);margin-top:6px">Podrás contratar empleado a partir del año ${(G.ownBrand.launched+2)}</div>`
           }`
      }
      <div style="font-size:11px;color:var(--ink3);margin-top:6px">Marca lanzada en Año ${G.ownBrand.launched} · ${yearsActive} temporada${yearsActive!==1?'s':''} activa${yearsActive!==1?'s':''}</div>
    </div>`;
  } else if(brandEligible){
    brandSection=`
    <div class="fin-section" style="border-color:var(--line);border-style:dashed">
      <div class="fin-title">👟 Tu Propia Marca</div>
      <div style="font-size:13px;color:var(--ink2);margin-bottom:10px">Desbloqueable ahora que tienes nombre en el circuito. Inversión inicial de €2.500 — genera €300/mes aunque consume 6h/semana de entrenamiento.</div>
      <div style="font-size:12px;color:var(--ink3);margin-bottom:10px">A los 2 años puedes contratar un empleado (€700/mes) y recuperar las horas de entrenamiento. La marca seguirá generando sin esfuerzo.</div>
      ${G.money>=2500
        ? `<button class="main" style="border-color:#c07a10;color:var(--avi)" onclick="doLaunchBrand()">Lanzar mi marca — −€2.500 · +€300/mes</button>`
        : `<button class="main" disabled>Lanzar mi marca (necesitas €${2500-G.money} más)</button>`
      }
    </div>`;
  }

  el.innerHTML=`
    <h2>Finanzas</h2>
    <p class="sub">Temporada ${G.year} · ${esc(G.runner.name||'Corredor')}</p>
    ${debtPanel()}
    <div class="fin-section">
      <div class="fin-title">Mensual</div>
      ${workM>0?`<div class="fin-row"><span>Trabajo (${wo.label})</span><span class="plus">+€${workM}</span></div>`:''}
      ${sponsorM>0?`<div class="fin-row"><span>Patrocinios</span><span class="plus">+€${sponsorM}</span></div>`:''}
      ${brandM>0?`<div class="fin-row"><span>Tu marca 👟</span><span class="plus">+€${brandM}</span></div>`:''}
      <div class="fin-row"><span>Gastos fijos de vida</span><span class="minus">-€${FIXED_COSTS.total}</span></div>
      ${clubM>0?`<div class="fin-row"><span>Club (${G.club?.name})</span><span class="minus">-€${clubM}</span></div>`:''}
      ${staffM>0?`<div class="fin-row"><span>Staff (fisio/entrenador/suplem.)</span><span class="minus">-€${staffM}</span></div>`:''}
      <div class="fin-row tot"><span>Neto mensual</span><span class="${netM>=0?'plus':'minus'}">${netM>=0?'+':''}€${netM}</span></div>
    </div>

    <div class="fin-section">
      <div class="fin-title">Proyección anual</div>
      ${workA>0?`<div class="fin-row"><span>Ingresos trabajo</span><span class="plus">+€${workA}</span></div>`:''}
      ${sponsorA>0?`<div class="fin-row"><span>Ingresos patrocinios</span><span class="plus">+€${sponsorA}</span></div>`:''}
      ${brandA>0?`<div class="fin-row"><span>Tu marca (neto)</span><span class="plus">+€${brandA}</span></div>`:''}
      <div class="fin-row"><span>Gastos fijos (12 meses)</span><span class="minus">-€${fixedA}</span></div>
      ${clubA>0?`<div class="fin-row"><span>Club</span><span class="minus">-€${clubA}</span></div>`:''}
      ${raceCosts>0?`<div class="fin-row"><span>Inscripciones carreras</span><span class="minus">-€${raceCosts}</span></div>`:''}
      ${staffA>0?`<div class="fin-row"><span>Staff (12 meses)</span><span class="minus">-€${staffA}</span></div>`:''}
      <div class="fin-row tot"><span>Resultado del año</span><span class="${netAfterRaces>=0?'plus':'minus'}">${netAfterRaces>=0?'+':''}€${netAfterRaces}</span></div>
    </div>

    <div class="fin-section">
      <div class="fin-title">Ahorros</div>
      <div class="fin-row"><span>Ahorros actuales</span><span style="font-weight:600">€${G.money}</span></div>
      <div class="fin-row"><span>Previsión fin de temporada</span><span style="font-weight:600;color:${savingsEnd>=G.money?'var(--pos)':'var(--neg)'}">€${Math.max(0,G.money+netAfterRaces)}</span></div>
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink3);margin-bottom:4px">
          <span>€0</span><span>Previsión: €${Math.max(0,G.money+netAfterRaces)}</span>
        </div>
        <div style="height:6px;background:var(--trk);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,Math.round(G.money/(G.money+Math.abs(netAfterRaces)+1)*100))}%;background:#4a90d9;border-radius:3px"></div>
        </div>
        <div style="height:6px;background:transparent;border-radius:3px;margin-top:2px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,savingsPct)}%;background:${netAfterRaces>=0?'#4a8a2a':'#c0392b'};border-radius:3px"></div>
        </div>
        <div style="font-size:12px;color:var(--ink3);margin-top:4px">
          <span style="color:var(--cuerpo)">■</span> Actuales &nbsp;
          <span style="color:${netAfterRaces>=0?'var(--pos)':'var(--neg)'}">■</span> ${netAfterRaces>=0?'Proyectado':'Riesgo'}
        </div>
      </div>
    </div>

    ${brandSection}

    ${netAfterRaces<0?`<div class="warn">Atención: con la configuración actual perderás €${Math.abs(netAfterRaces)} esta temporada. Considera aumentar la jornada laboral o reducir gastos.</div>`:''}
    ${netAfterRaces>=0&&netM>=0?`<div class="note">Vas bien. La temporada cierra con superávit. Puedes valorar reducir jornada laboral para entrenar más.</div>`:''}`;
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
      <div class="load-bar-track"><div class="bar-fill" style="width:${load}%;background:${load>=lt.warningLevel2?'#c0392b':load>=lt.warningLevel1?'#c07a10':'#4a90d9'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink3);margin-top:4px">
        <span>0%</span><span style="color:var(--avi)">${lt.warningLevel1}% riesgo</span><span style="color:var(--neg)">100% lesión</span>
      </div>
      ${(()=>{const w=getLoadWarningMsg(load);return w.msg?`<div style="font-size:12px;color:${w.color};margin-top:6px">${w.msg}</div>`:`<div style="font-size:12px;color:var(--pos);margin-top:6px">✓ Carga bajo control</div>`;})()}
    </div>

    <div class="card">
      <div class="sec-title">Stats actuales</div>
      ${G.lastRaceGains&&G.lastRaceGains.length>0?`
        <div style="background:var(--soft);border-radius:var(--border-radius-md);padding:9px 12px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:#3B6D11;margin-bottom:5px">Ganado en la última carrera</div>
          <div style="font-size:13px;color:#27500A">${G.lastRaceGains.map(({k,v})=>'+'+v+' '+k.charAt(0).toUpperCase()+k.slice(1)).join(' &nbsp;·&nbsp; ')}</div>
        </div>`:''}
      ${Object.entries(r.stats).map(([k,v])=>{
        const eff=getEffStat(k);
        const bonus=eff-v;
        const label=k.charAt(0).toUpperCase()+k.slice(1);
        return `<div class="bar-row">
          <span class="bar-label">${label}</span>
          <div class="bar-track" style="flex:1">
            <div class="bar-fill" style="width:${Math.min(100,eff)}%;background:${eff>=70?'#4a8a2a':eff>=50?'#4a90d9':eff>=35?'#c07a10':'#c0392b'}"></div>
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
        const color=obj.met?'#4a8a2a':'#c07a10';
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
      const RARITY={easy:{c:'#4a8a2a',bg:'#eaf4ea',l:'Fácil'},medium:{c:'#4a90d9',bg:'#e8f0fb',l:'Medio'},hard:{c:'#c07a10',bg:'#fdf0e0',l:'Difícil'},legendary:{c:'#8b2252',bg:'#f8e8f2',l:'Legendario'}};
      const rb=a=>{const r=RARITY[a.rarity]||{c:'#888',bg:'#eee',l:''};return`<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:${r.bg};color:${r.c}">${r.l}</span>`;};
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
        const tierColor=TIER_COLOR_SPONSOR;
        const tierLabel=TIER_LABEL_SPONSOR;
        return `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                <span style="font-weight:600;font-size:14px">${sp.name}</span>
                <span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${tierColor[sp.tier]||'#888'}22;color:${tierColor[sp.tier]||'var(--ink3)'}">${tierLabel[sp.tier]||''}</span>
              </div>
              <div style="font-size:12px;color:var(--ink3)">${sp.bonus}</div>
            </div>
            <div class="right-col">
              <div style="font-size:13px;font-weight:600;color:var(--pos)">+€${sp.salary}/año</div>
              <div style="font-size:12px;color:var(--ink3)">${sp.duration} temp. restante${sp.duration!==1?'s':''}</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:6px;background:${met?'var(--soft)':'#fff8f0'}">
            <div style="flex:1">
              <div style="font-size:12px;font-weight:600;color:${met?'var(--pos-i)':'#7a3a10'}">${met?'✓ Objetivo cumplido':'⚠ Objetivo pendiente'}</div>
              <div style="font-size:12px;color:${met?'var(--pos)':'var(--ink3)'};margin-top:1px">${sp.objective}</div>
            </div>
            ${!met?`<div style="font-size:12px;color:var(--neg);font-weight:600;flex-shrink:0;margin-left:8px;margin-right:8px">-€${penalty} si falla</div>`:''}
            <button class="secondary" style="font-size:11px;padding:3px 8px;flex-shrink:0;color:var(--neg);border-color:#c0392b;background:#fff8f0" onclick="breakSponsorContract('${cat}')">Romper</button>
          </div>
        </div>`;}).join('')}
    </div>`:''}

    ${G.sponsorPenalties&&G.sponsorPenalties.length>0?`<div class="card" style="border-color:var(--line2)">
      <div style="font-size:12px;font-weight:700;color:var(--neg);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Penalizaciones pendientes</div>
      ${G.sponsorPenalties.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #fef0f0">
        <div style="font-size:13px;color:var(--color-text-primary)">${p.name}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px;font-weight:600;color:var(--neg)">-€${p.amount}</span>
          <button class="secondary" style="font-size:12px;padding:3px 10px" onclick="payPenalty('${p.id}')">Pagar</button>
          <button class="secondary" style="font-size:12px;padding:3px 10px;border-color:#c07a10;color:var(--avi)" onclick="negotiatePenalty('${p.id}')">Negociar</button>
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
          <div class="load-bar-track"><div class="bar-fill" style="width:${rep}%;background:${rep>=60?'#c07a10':rep>=30?'#4a90d9':'#bbb'}"></div></div>
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
          ${h.catPos&&h.catTotal>1?`<div style="margin-top:3px"><span style="font-size:11px;background:#e8eef8;color:#2d4fa0;border-radius:4px;padding:1px 6px;font-weight:600">${h.catName} ${h.catPos}º</span></div>`:''}
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

function renderExpresSeasonStart(){
  const el=$main();
  const load=getBodyLoad();const lt=getLoadThresholdsByMode();
  const showObjectives=!G.yearObjective||G._yearObjectiveRewardPaid;
  el.innerHTML=`
    <div style="background:var(--soft);border:1.5px solid var(--line2);border-radius:14px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:13px;font-weight:700;color:#8a4a00">⚡ CARRERA EXPRÉS</span>
        <span style="font-size:13px;font-weight:700;color:var(--avi)">Temporada ${G.year}/3</span>
      </div>
      <div style="display:flex;gap:4px;margin-top:6px">
        ${[1,2,3].map(y=>`<div style="flex:1;height:5px;border-radius:3px;background:${G.year>y?'#c07a10':G.year===y?'#f0d98a':'#e0dfd8'}"></div>`).join('')}
      </div>
    </div>
    <h2>${esc(G.runner.name||'Corredor')}</h2>
    <p class="sub">${G.runner.specialty} · ${G.runner.age||25} años · ${G.ranking<900?'Ranking #'+G.ranking:'Sin ranking'}</p>
    <div class="stat-grid" style="margin-bottom:14px">
      <div class="stat"><div class="stat-label">Ahorros</div><div class="stat-val">€${G.money}</div></div>
      <div class="stat"><div class="stat-label">Carga corporal</div><div class="stat-val" style="color:${load>=lt.warningLevel2?'var(--neg)':load>=lt.warningLevel1?'var(--avi)':'var(--pos)'}">${load}%</div></div>
      <div class="stat"><div class="stat-label">Carreras</div><div class="stat-val">${G.raceResults?.length||0} hechas</div></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="sec-title-sm">Stats del corredor</div>
      ${Object.entries(G.runner.stats).map(([k,v])=>srow(k.charAt(0).toUpperCase()+k.slice(1),v)).join('')}
    </div>
    ${showObjectives?`
    <div style="font-size:13px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Objetivo de temporada</div>
    ${SEASON_OBJECTIVES.map(obj=>`<div class="work-card" style="margin-bottom:8px" onclick="selectYearObjective('${obj.id}')">
      <div style="flex:1"><div class="card-title">${obj.label}</div><div class="card-sub">${obj.desc}</div></div>
      <div style="font-size:12px;color:var(--pos);font-weight:600;margin-left:10px">+€${obj.reward}</div>
    </div>`).join('')}
    `:G.yearObjective?`<div class="note">🎯 Objetivo: ${SEASON_OBJECTIVES.find(o=>o.id===G.yearObjective)?.label||'—'}</div>`:''}
    <button class="main" onclick="G.screen='expresCalendar';render()">Elegir carreras →</button>`;
}

function renderExpresCalendar(){
  const el=$main();
  const selIds=G.selectedRaces.map(r=>r.id);
  const canAccess=canAccessRace;   // DS08 (v95)
  const allRaces=[...RACES_DB,...getSpecRaces()];
  const tierColor=TIER_COLOR_RACE;
  const MAX=5;

  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <h2>Elige 5 carreras</h2>
      <span style="font-size:13px;font-weight:700;color:${selIds.length>=MAX?'var(--pos)':'var(--avi)'}">${selIds.length}/${MAX}</span>
    </div>
    <p class="sub">Temporada ${G.year}/3 · elige 5 carreras · sin coste de inscripción</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${allRaces.map(r=>{
        const sel=selIds.includes(r.id);
        const locked=!canAccess(r);
        const full=!sel&&selIds.length>=MAX;
        const zegamaBadge=r.zegamaSpecial&&!locked&&G.zegamaQual?'<div style="font-size:10px;color:var(--pos);margin-top:2px">✓ Clasificado por tiempo</div>':r.zegamaSpecial&&!locked&&G.ranking<=20?'<div style="font-size:10px;color:var(--avi);margin-top:2px">✓ Invitación por ranking</div>':'';

        return `<div style="background:var(--card);border:1.5px solid ${sel?'#4a8a2a':locked?'#eee':'#e0dfd8'};border-radius:10px;padding:10px 12px;cursor:${locked||full?'default':'pointer'};opacity:${locked||(!sel&&full)?0.45:1};transition:background .15s" onclick="${locked||full?'':'window.toggleExpresRace(\''+r.id+'\')'}" >
          <div style="font-size:13px;font-weight:600;margin-bottom:3px;line-height:1.3">${sel?'✓ ':''}<span style="color:${tierColor[r.tier]||'var(--ink3)'}">${r.name}</span></div>
          <div style="font-size:12px;color:var(--ink3)">${r.km}km · ${r.type}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px">${r.monthName}</div>
          ${locked?(r.zegamaSpecial?`<div style="font-size:11px;color:var(--avi);margin-top:3px">🏔️ Invitación — Top 20 o clasificado por tiempo</div>`:`<div style="font-size:11px;color:var(--ink3);margin-top:3px">🔒 Ranking #${r.reqRanking}</div>`):zegamaBadge}
        </div>`;
      }).join('')}
    </div>
    <button class="main" onclick="G.screen='expresSponsors';render()" ${selIds.length<MAX?'disabled':''}>Continuar →</button>
    <button class="main" style="margin-top:6px" onclick="G.screen='expresSeasonStart';render()">← Volver</button>`;
}

window.toggleExpresRace=id=>{
  const all=[...RACES_DB,...getSpecRaces()];
  const race=all.find(r=>r.id===id);if(!race)return;
  const idx=G.selectedRaces.findIndex(r=>r.id===id);
  if(idx>=0){G.selectedRaces.splice(idx,1);}
  else if(G.selectedRaces.length<5){G.selectedRaces.push({...race});}
  render();
};

function renderExpresSponsors(){
  const el=$main();
  if(!G._expressSponsorPool){G._expressSponsorPool=getExpressSponsors();}
  const pool=G._expressSponsorPool;
  const curSponsors=Object.values(G.sponsors).filter(Boolean);

  el.innerHTML=`
    <h2>Patrocinador de temporada</h2>
    <p class="sub">Temporada ${G.year}/3 · elige uno o sigue sin patrocinador</p>
    ${curSponsors.length>0?`<div class="note">Ya tienes patrocinador activo — puedes cambiarlo o continuar.</div>`:''}
    <div style="display:grid;gap:10px;margin-bottom:14px">
      ${pool.map(sp=>{
        const isCur=Object.values(G.sponsors).some(s=>s?.id===sp.id);
        return `<div class="sponsor-card ${isCur?'active':''}" onclick="selectExpressSponsor('${sp.id}','${sp.cat}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="flex:1">
              <div style="font-size:15px;font-weight:700;margin-bottom:2px">${sp.name}${isCur?' ✓':''}</div>
              <div style="font-size:12px;color:var(--ink3);margin-bottom:6px">${sp.bonus}</div>
              <div style="font-size:12px;color:var(--pos)">+${Object.entries(sp.statBonus).map(([k,v])=>v+' '+k.charAt(0).toUpperCase()+k.slice(1)).join(', ')}</div>
              <div style="font-size:12px;color:var(--ink2);margin-top:3px">🎯 ${sp.objective}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:12px">
              <div style="font-size:16px;font-weight:700;color:var(--pos)">+€${sp.salary}</div>
              <div style="font-size:11px;color:var(--ink3)">/año</div>
            </div>
          </div>
        </div>`;
      }).join('')}
      <div class="sponsor-card" onclick="G._expressSponsorPool=null;G.screen='expresPrep';render()" style="text-align:center;color:var(--ink3)">
        <div style="font-size:14px">Sin patrocinador esta temporada</div>
      </div>
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

function renderExpresPrep(){
  const el=$main();
  const nextRace=G.selectedRaces[G.currentRaceIdx];
  const load=getBodyLoad();
  const lt=getLoadThresholdsByMode();
  const hint=bodyLoadHint();
  const racesLeft=G.selectedRaces.length-G.currentRaceIdx;

  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <h2>Preparación</h2>
      <span style="font-size:12px;color:var(--ink3)">${racesLeft} carrera${racesLeft!==1?'s':''} restante${racesLeft!==1?'s':''}</span>
    </div>
    <p class="sub">${nextRace?'Próxima: <strong>'+nextRace.name+'</strong> · '+nextRace.km+'km':'Última carrera de la temporada'}</p>
    ${hint?`<div class="${hint.type}">${hint.msg}</div>`:''}
    <div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink3);margin-bottom:4px">
        <span>Carga corporal</span><span style="font-weight:600;color:${load>=lt.warningLevel2?'var(--neg)':load>=lt.warningLevel1?'var(--avi)':'var(--pos)'}">${load}%</span>
      </div>
      ${hbar(load,100,load>=lt.warningLevel2?'#c0392b':load>=lt.warningLevel1?'#c07a10':'#4a90d9')}
    </div>
    <div style="font-size:12px;color:var(--ink3);margin:14px 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">¿Cómo preparas la carrera?</div>
    <div style="display:grid;gap:8px;margin-bottom:16px">
      <div class="work-card" onclick="doExpresPrep('train')">
        <div style="font-size:24px;margin-bottom:4px">🏃</div>
        <div class="card-title">Entrenamiento intenso</div>
        <div class="card-sub">Subes el bloque al máximo. El cuerpo lo nota pero llegas más fuerte.</div>
        <div style="display:flex;gap:12px;font-size:12px;margin-top:6px">
          <span style="color:var(--pos)">+6 stat principal</span>
          <span style="color:var(--neg)">Carga +${load>=lt.warningLevel2?'12 ⚠':'12'}</span>
        </div>
      </div>
      <div class="work-card" onclick="doExpresPrep('rest')">
        <div style="font-size:24px;margin-bottom:4px">🛌</div>
        <div class="card-title">Descanso activo</div>
        <div class="card-sub">Rodaje suave, estiramientos, recuperación completa.</div>
        <div style="display:flex;gap:12px;font-size:12px;margin-top:6px">
          <span style="color:var(--pos)">+3 Mental · Carga -14</span>
        </div>
      </div>
      <div class="work-card" onclick="doExpresPrep('focus')">
        <div style="font-size:24px;margin-bottom:4px">🎯</div>
        <div class="card-title">Foco mental</div>
        <div class="card-sub">Visualización de ruta, trabajo táctico, análisis de rivales.</div>
        <div style="display:flex;gap:12px;font-size:12px;margin-top:6px">
          <span style="color:var(--pos)">+5 Mental · Carga -4</span>
        </div>
      </div>
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

function renderExpresPreRacePrep(){
  const el=$main();
  const race=G.selectedRaces[G.currentRaceIdx];
  if(!race){G.screen='preRace';render();return;}
  const altPenalty=getAltitudePenalty(race);
  const sel=G.preRaceNutrition||'pasta';

  el.innerHTML=`
    <div style="font-size:12px;font-weight:700;color:var(--avi);letter-spacing:.5px;text-transform:uppercase;margin-bottom:10px">⚡ EXPRÉS · Carrera ${G.currentRaceIdx+1}/${G.selectedRaces.length}</div>
    <h2>${race.name}</h2>
    <p class="sub">${race.km}km · ${race.type} · ${race.monthName}</p>
    ${altPenalty>0?`<div class="warn">⚠ Alta altitud — irás un ${Math.round(altPenalty*100)}% más lento en subidas sin preparación específica.</div>`:''}
    ${G.injuryType?`<div class="danger">⚠ Llegas con ${INJURY_TYPES[G.injuryType]?.label||'lesión'}. Energía y piernas reducidas.</div>`:''}
    <div class="section-label">Cena previa</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${PRE_RACE_NUTRITION.slice(0,2).map(n=>{
        const isSel=sel===n.id;
        const cost=getNutritionCost(n.id);
        return `<div style="background:var(--card);border:1.5px solid ${isSel?'#4a8a2a':'#e0dfd8'};border-radius:10px;padding:12px;cursor:pointer;transition:background .15s" onclick="G.preRaceNutrition='${n.id}';render()">
          <div style="font-size:13px;font-weight:600;margin-bottom:3px">${isSel?'✓ ':''} ${n.label}</div>
          <div style="font-size:12px;color:var(--ink3)">${n.desc}</div>
          <div style="font-size:12px;color:${n.energyBonus>0?'var(--pos)':'var(--avi)'};margin-top:4px">${n.energyBonus>0?'+'+n.energyBonus+' energía':n.energyBonus+' energía'}${cost>0?' · -€'+cost:''}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="section-label">Estrategia de salida</div>
    <div style="display:grid;gap:8px;margin-bottom:16px">
      ${[
        {id:'conservador',label:'Conservador 🐢',desc:'Primeros tramos lentos, últimos con reservas',energyMod:5,legsMod:3,timeMod:1.06},
        {id:'equilibrado',label:'Equilibrado ⚖',desc:'Ritmo constante desde el principio',energyMod:0,legsMod:0,timeMod:1.0},
        {id:'a_tope',label:'A tope 🔥',desc:'Máxima velocidad desde el km 1 — riesgo real',energyMod:-8,legsMod:-6,timeMod:0.94},
      ].map(s=>{
        const isSel=(G.startStrategy||'equilibrado')===s.id;
        return `<div style="background:var(--card);border:1.5px solid ${isSel?'#4a8a2a':'#e0dfd8'};border-radius:10px;padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="G.startStrategy='${s.id}';render()">
          <div><div style="font-size:13px;font-weight:600">${isSel?'✓ ':''} ${s.label}</div><div style="font-size:12px;color:var(--ink3)">${s.desc}</div></div>
        </div>`;
      }).join('')}
    </div>
    <button class="main" onclick="goPreRace()">Salir a correr →</button>`;
}

function renderExpresSeasonBalance(){
  const el=$main();
  const sponsorIncome=sponsorAnnual();
  const raceIncome=G.raceResults.reduce((a,r)=>a+r.prize,0);
  const yearNet=sponsorIncome+raceIncome;

  el.innerHTML=`
    <div style="background:var(--soft);border:1.5px solid var(--line2);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:13px;font-weight:700;color:#8a4a00">⚡ Temporada ${G.year}/${modeCfg().maxYears} completada</span>
      ${G.year>=modeCfg().maxYears?'<span style="font-size:12px;color:var(--avi);font-weight:600">Última temporada 🏁</span>':''}
    </div>
    <h2>Balance de temporada</h2>
    <p class="sub">${esc(G.runner.name||'Corredor')} · Ranking #${G.ranking<900?G.ranking:'—'}</p>
    <div style="margin-bottom:16px">
      ${G.raceResults.length===0?'<p style="font-size:13px;color:var(--ink3)">Sin carreras completadas.</p>':
        G.raceResults.map(r=>{
          if(isDNF(r))return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px">
            <div><span style="color:var(--neg);margin-right:8px">❌</span>${r.name}</div>
            <span style="font-size:12px;color:var(--neg)">${dnfLabel(r)}</span></div>`;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px">
            <div><span style="font-weight:700;color:${r.pos===1?'var(--avi)':r.pos<=3?'var(--pos)':'var(--ink3)'};margin-right:8px">${r.pos}º</span>${r.name}</div>
            <span style="font-size:13px;color:var(--pos)">+€${r.prize}</span></div>`;
        }).join('')}
    </div>
    <div class="card" style="margin-bottom:14px">
      <table class="eco-table">
        ${sponsorIncome>0?`<tr><td>Patrocinios</td><td class="right plus">+€${sponsorIncome}</td></tr>`:''}
        ${raceIncome>0?`<tr><td>Premios de carrera</td><td class="right plus">+€${raceIncome}</td></tr>`:''}
        ${(G.sponsorPenalties||[]).filter(p=>p.year===G.year).reduce((a,p)=>a+p.amount,0)>0?`<tr><td>Penalizaciones sponsor</td><td class="right minus">-€${G.sponsorPenalties.filter(p=>p.year===G.year).reduce((a,p)=>a+p.amount,0)}</td></tr>`:''}
        <tr><td>Resultado del año</td><td class="right ${yearNet>=0?'plus':'minus'}">${yearNet>=0?'+':''}€${yearNet}</td></tr>
      </table>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="sec-title-sm">Stats finales</div>
      ${Object.entries(G.runner.stats).map(([k,v])=>srow(k.charAt(0).toUpperCase()+k.slice(1),v)).join('')}
    </div>
    <button class="main" onclick="doNextYear(${yearNet})">${G.year>=modeCfg().maxYears?'Ver resumen de carrera →':'Temporada '+(G.year+1)+' →'}</button>
    ${G.year>=2?`<button class="main" style="margin-top:6px;border-color:#c0392b;color:var(--neg)" onclick="doRetire()">Retiro anticipado — ver resumen</button>`:''}`;
}

// ── WORK SETUP (TRIMESTRAL) ────────────
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
  el.innerHTML=`
    <h2>Jornada laboral</h2>
    <p class="sub">${qLabel[q]} · ${esc(G.runner.name||'Corredor')}${G.carreraVida?` · <span style="font-size:11px;padding:1px 7px;border-radius:4px;background:#E6F1FB;color:#185FA5;font-weight:600">🏔 Carrera de Vida · Año ${G.year} · ${{runner:'Corredor',overlap:'Solapamiento',coach:'Entrenador',club:'Club'}[G.lifecyclePhase||'runner']}</span>`:''}</p>
    ${G.year===1&&q===1?`<div class="note" style="border-left-color:#c07a10">💡 <strong>Las horas que no dediques a trabajar van a entrenar — y las que no uses entrenando, a reputación.</strong> Atleta puro, mediático o equilibrado: tú eliges cada trimestre.</div>`:''}
    ${qRaces.length>0?`<div class="note">Este trimestre tienes ${qRaces.length} carrera${qRaces.length>1?'s':''}: ${qRaces.map(r=>r.name).join(', ')}. Valora bajar jornada o usar vacaciones.</div>`:''}
    ${G.workChangePenalties?.[q]?`<div class="warn">⚠ Cambio brusco de jornada${G.workChangePenalties[q]?.amount>0?' — pierdes €'+G.workChangePenalties[q].amount:''} · eficiencia entrenamiento ${Math.round((G.workChangePenalties[q]?.trainingEff||1)*100)}% este trimestre.</div>`:''}
    <div class="card" style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:8px">Gastos fijos mensuales</div>
      <table class="eco-table">
        <tr><td>Alquiler + comida + transporte</td><td class="right minus">-€${FIXED_COSTS.total}/mes</td></tr>
      </table>
    </div>
    <div class="section-label">¿Cuánto trabajas este trimestre?</div>
    ${WORK_OPTIONS.map(wo2=>{
      const net=wo2.income+sponsorM-FIXED_COSTS.total-(G.club?.cost||0);
      const eff=Math.round(trainingEffFromH(wo2.trainingH+vacBonus)*100);
      // T29 (v86): en el escalón 2 solo queda disponible la jornada completa
      const debtLocked=!!G.forcedFullTime&&wo2.pct!==100;
      const isLocked=(wo2.pct===0&&!canQuit)||debtLocked;
      const sel=curPct===wo2.pct;
      return `<div class="work-card ${sel?'sel':''} ${isLocked?'locked-work':''}" onclick="${isLocked?'':'setWorkQ('+q+','+wo2.pct+')'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div class="card-title">${wo2.label}</div>
            <div class="card-sub">${wo2.desc}</div>
          </div>
          ${debtLocked?`<span style="font-size:12px;color:var(--neg);flex-shrink:0;margin-left:8px">Bloqueado hasta saldar la deuda (€${G.debt||0})</span>`
            :isLocked?`<span style="font-size:12px;color:var(--neg);flex-shrink:0;margin-left:8px">Necesitas €${FIXED_COSTS.total+(G.club?.cost||0)}/mes en sponsors (tienes €${sponsorM})</span>`:''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:12px">
          <div><div style="color:var(--ink3);margin-bottom:2px">Trabajo</div>
            <div style="font-weight:600;color:${wo2.income>0?'var(--pos)':'var(--ink3)'}">${wo2.income>0?'+€'+wo2.income:'-'}/mes</div></div>
          <div><div style="color:var(--ink3);margin-bottom:2px">Neto</div>
            <div style="font-weight:600;color:${net>=0?'var(--pos)':'var(--neg)'}">${net>=0?'+':''}€${net}/mes</div></div>
          <div><div style="color:var(--ink3);margin-bottom:2px">Entreno base</div>
            <div style="font-weight:600;color:var(--cuerpo)">${wo2.trainingH}h/sem</div></div>
        </div>
        <div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink3);margin-bottom:3px">
            <span>Eficiencia</span><span>${eff}%</span>
          </div>
          ${hbar(eff,100,'#4a90d9')}
        </div>
      </div>`;}).join('')}

    <div class="card" style="margin-top:8px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="card-title">Vacaciones este trimestre</div>
        <div style="font-size:12px;color:var(--ink3)">${vacDaysUsed()} / ${G.vacDaysTotal||15} días usados este año</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <button class="secondary" onclick="setVacQ(${q},${Math.max(0,vacQ-1)})" ${vacQ<=0?'disabled':''} style="padding:6px 12px;font-size:16px">−</button>
        <div style="flex:1;text-align:center">
          <div style="font-size:24px;font-weight:700;color:var(--avi)">${vacQ}</div>
          <div style="font-size:12px;color:var(--ink3)">días este trimestre</div>
        </div>
        <button class="secondary" onclick="setVacQ(${q},${Math.min(vacLeft+vacQ,vacQ+1)})" ${vacLeft<=0?'disabled':''} style="padding:6px 12px;font-size:16px">+</button>
      </div>
      ${vacQ>0?`<div class="note" style="margin-bottom:0">
        +${vacBonus}h/sem de entrenamiento extra este trimestre
        · Entreno total: <strong>${totalTrainingH}h/sem</strong>
        · ${vacLeft} días restantes en el año
      </div>`:
      `<div style="font-size:12px;color:var(--ink3)">Cada día de vacaciones añade 1.5h/sem de entrenamiento extra este trimestre. Te quedan ${vacLeft} días este año.</div>`}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <button class="main" onclick="G.screen='seasonStart';autoSave();render()">← Volver</button>
      <button class="main" onclick="G.screen='calendar';autoSave();render()">Confirmar →</button>
    </div>
    ${[2,3,4].includes(q)?`<div style="margin-top:12px">
      <div style="font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Otros trimestres</div>
      ${[1,2,3,4].filter(n=>n!==q).map(n=>{
        const wo2=WORK_OPTIONS.find(o=>o.pct===G.workByQuarter[n]);
        const vac2=G.vacByQuarter?.[n]||0;
        return `<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
          <span style="color:var(--color-text-secondary)">${{1:'Q1',2:'Q2',3:'Q3',4:'Q4'}[n]}</span>
          <span style="cursor:pointer;color:var(--cuerpo)" onclick="G.currentQuarter=${n};render()">
            ${wo2?.label||'—'} · ${wo2?.trainingH||5}h/sem${vac2>0?' + '+vac2+'d vac':''} ✎
          </span>
        </div>`;}).join('')}
    </div>`:''}`;
}

window.setVacQ=(q,days)=>{
  if(!G.vacByQuarter)G.vacByQuarter={1:0,2:0,3:0,4:0};
  const max=(G.vacDaysTotal||15)-vacDaysUsed()+(G.vacByQuarter[q]||0);
  G.vacByQuarter[q]=Math.max(0,Math.min(max,days));
  render();
};

// ── SEASON START ───────────────────────
function renderSeasonStart(){
  const el=$main();
  const wo=WORK_OPTIONS.find(o=>o.pct===currentWorkPct()); // T22 (v89)
  const net=monthlyNet();
  const showObjectives=!G.yearObjective||G._yearObjectiveRewardPaid; // Se vuelve a ofrecer cada vez que se cobra el objetivo actual
  
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">
      <h2>Temporada ${G.year}</h2>
      <span style="font-size:12px;color:var(--ink3);padding-top:5px">${G.ranking<900?'Ranking #'+G.ranking:'Sin ranking'}</span>
    </div>
    <p class="sub">${esc(G.runner.name||'Corredor')} · ${G.runner.specialty} · ${G.runner.age?G.runner.age+' años · ':''}<span style="font-size:12px;padding:1px 7px;border-radius:4px;background:${modeInfo(G.gameMode).bg};color:${modeInfo(G.gameMode).fg}">${modeLabelOf(G.gameMode)}</span>${G.gameMode==='expres'?` <span style="font-size:12px;color:var(--avi);font-weight:600">Año ${G.year}/3</span>`:''}${G.carreraVida?` <span style="font-size:11px;padding:1px 7px;border-radius:4px;background:#EEEDFE;color:#534AB7;font-weight:600">${PHASE_LABEL[G.lifecyclePhase]||PHASE_LABEL.runner}</span>`:''}</p>
    
    ${showObjectives?`
    <div style="background:var(--soft);border:1.5px solid var(--ink);border-radius:12px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Elige tu objetivo de temporada</div>
      ${SEASON_OBJECTIVES.map(obj=>`<div class="work-card" style="margin-bottom:8px" onclick="selectYearObjective('${obj.id}')">
        <div style="flex:1">
          <div class="card-title">${obj.label}</div>
          <div class="card-sub">${obj.desc}</div>
        </div>
        <div style="font-size:12px;color:var(--pos);font-weight:600;flex-shrink:0;margin-left:10px">+€${obj.reward}</div>
      </div>`).join('')}
    </div>
    `:''}
    
    ${G.yearObjective?`<div class="note">Objetivo: ${SEASON_OBJECTIVES.find(o=>o.id===G.yearObjective)?.label||'—'}</div>`:''}
    
    <div class="stat-grid">
      <div class="stat"><div class="stat-label">Ahorros</div><div class="stat-val">€${G.money}</div></div>
      <div class="stat"><div class="stat-label">Neto mensual</div><div class="stat-val" style="color:${net>=0?'var(--pos)':'var(--neg)'}">${net>=0?'+':''}€${net}</div></div>
      <div class="stat"><div class="stat-label">Entreno</div><div class="stat-val">${wo?.trainingH||5}h/sem</div></div>
    </div>
    ${currentWorkPct()===100?`<div class="warn">Jornada completa — solo ${wo?.trainingH}h/sem de entrenamiento. Los bloques solo serán un ${Math.round(effForWork()*100)}% efectivos.</div>`:
      currentWorkPct()===0?`<div class="note">Profesional — entrenamiento completo. Asegúrate de que los ingresos cubran gastos.</div>`:
      `<div class="note">${wo?.label} — ${wo?.trainingH}h/sem de entrenamiento. Eficiencia de bloque: ${Math.round(effForWork()*100)}%.</div>`}
    <div class="card" style="margin-bottom:14px">
      <div class="sec-title-sm">Plan de jornada laboral por trimestre</div>
      ${[1,2,3,4].map(q=>{
        const wo2=WORK_OPTIONS.find(o=>o.pct===G.workByQuarter[q]);
        const qRaces=G.selectedRaces.filter(r=>r.quarter===q);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
          <div>
            <span style="font-size:13px;font-weight:600">${{1:'Q1',2:'Q2',3:'Q3',4:'Q4'}[q]}</span>
            <span style="font-size:12px;color:var(--color-text-secondary);margin-left:8px">${wo2?.label||'—'}</span>
            ${qRaces.length>0?`<span style="font-size:12px;color:var(--pos);margin-left:6px">${qRaces.length} carrera${qRaces.length>1?'s':''}</span>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:12px;color:var(--cuerpo)">${wo2?.trainingH||5}h/sem</span>
            <span style="font-size:12px;cursor:pointer;color:var(--ink3)" onclick="G.currentQuarter=${q};G.screen='workSetup';render()">✎</span>
          </div>
        </div>`;}).join('')}
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="sec-title-sm">Tus stats actuales</div>
      ${Object.entries(G.runner.stats).map(([k,v])=>srow(k.charAt(0).toUpperCase()+k.slice(1),v)).join('')}
    </div>
    <button class="main" onclick="G.currentQuarter=1;G.screen='workSetup';render()">Planificar jornada laboral →</button>
    <button class="main" onclick="G.screen='clubSetup';render()" style="margin-top:6px">${G.club&&G.club.id!=='none'?'🏃 Club: '+G.club.name+' →':'🏃 Unirse a un club →'}</button>
    <button class="main" onclick="G.screen='circuits';render()" style="margin-top:6px">Unirse a circuitos / ligas →</button>
    <button class="main" onclick="G.screen='calendar';autoSave();render()" style="margin-top:6px">Planificar calendario →</button>`;
}

// ── CALENDAR ───────────────────────────
function renderCalendar(){
  const el=$main();
  const canAccess=canAccessRace;   // DS08 (v95)
  const selIds=G.selectedRaces.map(r=>r.id);
  const spent=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
  const budget=G.money;
  const pct=Math.min(100,Math.round(spent/Math.max(1,budget)*100));
  const tierColor=TIER_COLOR_RACE;
  const tierLabel=TIER_LABEL_RACE;
  const specRaces=getSpecRaces();
  const specLabel=SPEC_LABEL;
  const specColor={fondista:'#4a90d9',montanero:'#4a8a2a',tecnico:'#c07a10',todoterreno:'#888'};
  const myColor=specColor[G.runner.specialty]||'#888';
  const myLabel=specLabel[G.runner.specialty]||'';

  function raceCard(r,isSpec){
    const sel=selIds.includes(r.id);
    const locked=!canAccess(r);
    const noMoney=!sel&&(spent+r.cost>budget);
    const inCirc=isInCircuit(r.id);
    const circPts=inCirc?circuitPoints(3,15):0;
    return `<div class="race-card ${sel?'sel':locked?'locked':''}" ${!locked&&!(noMoney&&!sel)?'onclick="toggleRace(\''+r.id+'\')"':''}>
      <div class="flex-between">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">
            <span class="card-title">${esc(r.name)}</span>
            <span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${tierColor[r.tier]||'#888'}22;color:${tierColor[r.tier]||'var(--ink3)'}">${tierLabel[r.tier]||''}</span>
            ${inviteBadge(r)}
            ${isSpec?`<span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${myColor}22;color:${myColor}">${myLabel}</span>`:''}
            ${inCirc?`<span style="font-size:12px;font-weight:600;padding:1px 5px;border-radius:4px;background:#c07a1022;color:var(--avi)">Liga · ~${circPts}pts</span>`:''}
          </div>
          <div style="font-size:12px;color:var(--ink3)">${r.monthName} · ${r.type} · ${raceDesnivel(r)}</div>
          ${locked?(r.zegamaSpecial?`<div style="font-size:12px;color:var(--avi);margin-top:2px">🏔️ Invitación Top 20 o clasificación por tiempo (corte 4h20)</div>`:`<div style="font-size:12px;color:var(--ink3);margin-top:2px">🔒 Ranking #${r.reqRanking} requerido</div>`):''}
          ${noMoney&&!sel?`<div class="text-warn">Sin presupuesto</div>`:''}
          ${isSpec?`<div style="font-size:12px;color:${myColor};margin-top:2px">+15% rendimiento para ${myLabel}</div>`:''}
        </div>
        <div class="right-col">
          <div style="font-size:13px;font-weight:600;color:var(--pos)">€${r.prize}</div>
          <div style="font-size:12px;color:var(--ink3)">€${r.cost} inscr.</div>
          ${sel?`<div style="font-size:12px;color:var(--pos);font-weight:600;margin-top:2px">✓</div>`:''}
        </div>
      </div>
    </div>`;
  }

  el.innerHTML=`
    <h2>Calendario anual</h2>
    <p class="sub">Comunes + específicas de ${myLabel} · €${spent} de €${budget} gastados</p>
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink3);margin-bottom:4px">
        <span>Presupuesto de inscripciones <button class="tip-btn" onclick="showTip('Barra de presupuesto','Esta barra muestra qué porcentaje de tus ahorros llevas gastado en inscripciones de carrera. No es la carga corporal — eso lo puedes ver en la pestaña Corredor.<br><br>Si llega al 85% se vuelve roja: ojo con dejar reservas para imprevistos.')">ⓘ</button></span>
        <span style="font-weight:600;color:${pct>85?'var(--neg)':pct>50?'var(--avi)':'var(--ink3)'}">${pct}% (€${spent} / €${budget})</span>
      </div>
      <div style="height:4px;background:var(--trk);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>85?'#c0392b':'#4a90d9'};border-radius:2px;transition:width .3s"></div>
      </div>
    </div>
    ${G.joinedCircuits.length>0?`<div class="note" style="margin-bottom:12px">
      <span style="font-weight:600">Circuito${G.joinedCircuits.length>1?'s':''} activo${G.joinedCircuits.length>1?'s':''}:</span>
      ${G.joinedCircuits.map(cid=>CIRCUITS_DB.find(c=>c.id===cid)?.name||cid).join(', ')}
      — las carreras de liga están marcadas con <span style="color:var(--avi);font-weight:600">Liga</span>
    </div>`:
    `<div onclick="G.screen='circuits';render()" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--card);border:1.5px dashed var(--line);border-radius:10px;cursor:pointer;margin-bottom:12px">
      <div>
        <div class="card-title">🏆 Ligas y circuitos</div>
        <div class="card-sub">Únete para ganar puntos y premios extra este año</div>
      </div>
      <span style="color:var(--ink3);font-size:14px">→</span>
    </div>`}
    ${QUARTERS.map(q=>{
      const common=RACES_DB.filter(r=>r.quarter===q.n);
      const spec=specRaces.filter(r=>r.quarter===q.n);
      const qSel=[...common,...spec].filter(r=>selIds.includes(r.id)).length;
      const qLabel={1:'Primer trimestre',2:'Segundo trimestre',3:'Tercer trimestre',4:'Cuarto trimestre'};
      const isOpen=(G.openQuarters?.cal||[]).includes(q.n);
      return `
        <div class="quarter-wrap">
          <div class="quarter-toggle ${qSel>0?'has-sel':''}" onclick="toggleQ(${q.n})">
            <span style="font-size:14px;font-weight:600;flex:1">${qLabel[q.n]} <span style="font-size:12px;font-weight:400;color:var(--ink3)">· ${q.months}</span></span>
            ${qSel>0?`<span style="font-size:12px;color:var(--pos);font-weight:600">${qSel} ✓</span>`:''}
            <span style="font-size:12px;color:var(--ink3);display:inline-block;transform:${isOpen?'rotate(90deg)':''};transition:transform .2s">▶</span>
          </div>
          <div class="quarter-content ${isOpen?'open':''}" onclick="event.stopPropagation()">
            ${common.map(r=>raceCard(r,false)).join('')}
            ${spec.length>0?`
              <div class="spec-toggle" id="spec-toggle-${q.n}" onclick="event.stopPropagation();toggleSpecQ(${q.n})">
                <span style="color:${myColor}">★</span>
                <span style="flex:1">Carreras específicas — ${myLabel} (${spec.length})</span>
                <span class="spec-arrow" id="spec-arrow-${q.n}">▶</span>
              </div>
              <div class="spec-races" id="spec-races-${q.n}">
                ${spec.map(r=>raceCard(r,true)).join('')}
              </div>`:''}
          </div>
        </div>`;}).join('')}
    <div style="font-size:13px;color:var(--ink3);margin:8px 0 12px">
      ${G.selectedRaces.length===0?'Sin carreras — puedes continuar igualmente.':G.selectedRaces.length+' carrera'+(G.selectedRaces.length>1?'s':'')+' seleccionada'+(G.selectedRaces.length>1?'s':'')+'.'}
    </div>
    <div class="grid-2">
      <button class="main" onclick="G.screen='seasonStart';autoSave();render()">← Volver</button>
      <button class="main" onclick="G.screen='sponsors';autoSave();render()">Patrocinios →</button>
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
function renderSponsors(){
  const el=$main();
  const cats=['zapatillas','ropa','nutricion','tecnologia'];
  const catLabel={zapatillas:'Zapatillas',ropa:'Ropa',nutricion:'Nutrición',tecnologia:'Tecnología GPS'};
  const tierLabel=TIER_LABEL_SPONSOR;
  const tierColor=TIER_COLOR_SPONSOR;

  // Filter sponsors available this year and ranking
  const avail=SPONSORS_DB.filter(s=>{
    if(s.reqYear&&G.year<s.reqYear)return false;
    if(s.reqRanking&&G.ranking>s.reqRanking)return false;
    return true;
  });
  const locked=SPONSORS_DB.filter(s=>!avail.includes(s));

  el.innerHTML=`
    <h2>Patrocinios <button class="tip-btn" onclick="showTip('Patrocinios','Cada sponsor tiene un <strong>objetivo</strong> que cumplir al final del contrato (victorias, ranking, carreras completadas). Si no lo cumples pagas una <strong>penalización</strong> del porcentaje indicado sobre tu salario anual.<br><br>Romper el contrato antes de tiempo cuesta el <strong>40% del valor restante</strong>. Los contratos de varios años pagan más pero el compromiso es mayor.')">ⓘ</button></h2>
    <p class="sub">Año ${G.year} · Ingresos actuales: <strong style="color:var(--pos)">+€${sponsorAnnual()}/año</strong></p>

    ${G.sponsorPenalties&&G.sponsorPenalties.length>0?`
    <div class="danger" style="margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:6px">Penalizaciones por incumplimiento</div>
      ${G.sponsorPenalties.map(p=>`<div style="font-size:13px;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span>${p.name}</span>
        <span style="font-weight:600">-€${p.amount}
          <button class="secondary" style="font-size:12px;padding:2px 8px;margin-left:8px" onclick="payPenalty('${p.id}')">Pagar</button>
          <button class="secondary" style="font-size:12px;padding:2px 8px;margin-left:4px;border-color:#c07a10;color:var(--avi)" onclick="negotiatePenalty('${p.id}')">Negociar</button>
        </span>
      </div>`).join('')}
      <div style="font-size:12px;color:var(--avi);margin-top:6px">Negociar rebaja la sanción al 40% si aceptan (${Math.round(penaltyNegotiationChance()*100)}% de éxito con tu reputación actual). Si se niegan, pagas el total y pierdes seguidores. Sin resolver, se te cobra de oficio al cerrar la temporada que viene.</div>
    </div>`:''}

    ${cats.map(cat=>{
      const offers=avail.filter(s=>s.cat===cat);
      const cur=G.sponsors[cat];
      const lockedOffers=locked.filter(s=>s.cat===cat).slice(0,2);
      const objMet=cur?checkSponsorObjective(cur):null;

      return `<div style="margin-bottom:20px">
        <div style="font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">${catLabel[cat]}</div>

        ${cur?`<div style="padding:10px 12px;background:var(--soft);border-radius:8px;border:1px solid #4a90d9;margin-bottom:10px;font-size:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-weight:700;color:var(--cuerpo)">${esc(cur.name)}</span>
                <span style="font-size:11px;padding:1px 5px;border-radius:4px;background:${tierColor[cur.tier]||'#888'}22;color:${tierColor[cur.tier]||'var(--ink3)'}">${tierLabel[cur.tier]||'?'}</span>
                <span style="color:${objMet?'var(--pos)':'var(--neg)'};font-weight:600;font-size:11px">${objMet?'✓ Objetivo cumplido':'⚠ Pendiente'}</span>
              </div>
              <div style="color:var(--ink3)">Obj: ${cur.objective} · <strong>${cur.duration}</strong> temp. restante${cur.duration!==1?'s':''}</div>
              ${!objMet?`<div style="color:var(--neg);margin-top:2px">Penalización si no cumples: €${Math.round(cur.salary*cur.penaltyPct)}</div>`:''}
              ${followersSponsorMult()>1?`<div style="font-size:12px;color:var(--cuerpo);margin-top:2px">📱 +${Math.round((followersSponsorMult()-1)*100)}% por reputación</div>`:''}
            </div>
            <button class="secondary" onclick="breakSponsorContract('${cat}')" style="font-size:11px;padding:5px 9px;flex-shrink:0;color:var(--neg);border-color:#c0392b;background:#fff8f0;text-align:center;line-height:1.3">Romper<br><span style="font-size:10px">-€${Math.round(cur.salary*cur.duration*0.4)}</span></button>
          </div>
        </div>
        ${offers.filter(sp=>sp.id!==cur.id).length>0?`<div style="font-size:12px;color:var(--ink3);font-style:italic;margin-bottom:6px">Otras ofertas (rompe el contrato para cambiar):</div>
        ${offers.filter(sp=>sp.id!==cur.id).map(sp=>`<div style="background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:6px;opacity:0.5">
          <div class="flex-between-center">
            <div>
              <span style="font-size:13px;font-weight:600;color:var(--ink3)">${sp.name}</span>
              <span style="font-size:11px;font-weight:600;padding:1px 5px;border-radius:4px;background:${tierColor[sp.tier]}22;color:${tierColor[sp.tier]};margin-left:5px">${tierLabel[sp.tier]}</span>
              ${sp.tier>cur.tier?`<span style="font-size:11px;color:var(--avi);font-weight:700;margin-left:4px">⬆ Upgrade</span>`:''}
            </div>
            <span style="font-size:13px;font-weight:600;color:var(--ink3)">+€${sp.salary}/año</span>
          </div>
        </div>`).join('')}`:''}`:''
        }
        ${!cur?offers.map(sp=>{
          const isPending=G._pendingSponsors?.[cat]?.id===sp.id;
          return `<div class="sponsor-card ${isPending?'sel-aid':''}" onclick="selectSponsor('${cat}','${sp.id}')" style="${isPending?'border:2px solid #4a90d9;background:var(--soft);':''}">
            <div class="flex-between">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                  <span class="card-title">${sp.name}</span>
                  <span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${tierColor[sp.tier]}22;color:${tierColor[sp.tier]}">${tierLabel[sp.tier]}</span>
                  ${isPending?`<span style="font-size:11px;font-weight:700;color:var(--cuerpo)">● Seleccionado</span>`:''}
                </div>
                <div style="font-size:12px;color:var(--ink3)">${sp.bonus}</div>
                <div style="font-size:12px;color:var(--ink3);margin-top:2px">Obj: ${sp.objective}</div>
                ${sp.duration>1?`<div style="font-size:12px;color:var(--cuerpo);margin-top:1px">Contrato ${sp.duration} temporadas</div>`:''}
              </div>
              <div class="right-col">
                <div style="font-size:14px;font-weight:600;color:var(--pos)">+€${sp.salary}</div>
                <div style="font-size:12px;color:var(--ink3)">/año</div>
                <div class="text-warn">Penaliz. ${Math.round(sp.penaltyPct*100)}%</div>
              </div>
            </div>
          </div>`;}).join(''):''}

        ${lockedOffers.length>0?`
          <div style="margin-top:6px">
            ${lockedOffers.slice(0,1).map(sp=>`<div style="padding:8px 12px;background:var(--soft);border-radius:8px;border:0.5px dashed var(--line);font-size:12px;color:var(--ink3);display:flex;justify-content:space-between">
              <span>🔒 ${sp.name} · ${tierLabel[sp.tier]}</span>
              <span>${sp.reqYear?`Año ${sp.reqYear}`:''} ${sp.reqRanking?`· Ranking #${sp.reqRanking}`:''}</span>
            </div>`).join('')}
          </div>`:''}

        ${offers.length===0&&lockedOffers.length===0?`<div style="font-size:13px;color:var(--ink3);padding:6px 0">Sin ofertas esta temporada.</div>`:''}
      </div>`;}).join('')}
    ${Object.keys(G._pendingSponsors||{}).length>0?`
    <div class="warn" style="margin-bottom:10px">
      <strong>Tienes selecciones sin confirmar.</strong> Haz clic en un sponsor seleccionado para quitarlo, o confirma para firmar los contratos.
    </div>
    <button class="main" onclick="confirmSponsors()" style="background:#2d7a2d;border-color:#2d7a2d;color:var(--card);margin-bottom:8px">✓ Confirmar patrocinios seleccionados</button>`:''}
    <button class="main" onclick="G._pendingSponsors={};G.screen='training';autoSave();render()">Bloque de entrenamiento →</button>`;
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
  el.innerHTML=`
    <h2>Bloque de entrenamiento</h2>
    <p class="sub">Efectividad: <strong>${seEffPct}%</strong> · ${wo?.trainingH||5}h/sem · ${se.label}</p>
    <div class="hint">📅 El bloque se aplica <strong>al cerrar la temporada</strong>, una sola vez: las cifras de cada tarjeta son lo que sumará entonces.</div>
    ${G.zeroedOutThisRace&&G.postRaceConsequence?`<div class="danger">⚠ Secuelas de la última carrera — <strong>${G.postRaceConsequence.label}</strong>. ${G.postRaceConsequence.id==='descanso_forzado'?`El bloque de esta temporada rinde un ${Math.round((1-restWeeksEffMult())*100)} % menos.`:G.postRaceConsequence.id==='sobrecarga'?'Subida, bajada y velocidad entrenan al 80 % esta temporada.':'Recuperación en curso.'}</div>`:''}
    ${hint?`<div class="${hint.type}">${hint.msg}</div>`:''}
    ${se.trainingMod!==0?`<div class="hint">${se.note}</div>`:''}
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink3);margin-bottom:4px">
        <span>Carga corporal acumulada <button class="tip-btn" onclick="showTip('Carga corporal','Refleja el desgaste acumulado de entrenar. Por encima del <strong>70%</strong> empieza la bajada de rendimiento. Al <strong>100%</strong> aparece una lesión.<br><br>La degradación es exponencial: cuanta más carga tienes, más difícil bajarla. Se reduce parcialmente entre temporadas, pero nunca vuelve a cero sola. Nunca vayas a tope todo el rato.')">ⓘ</button></span>
        <span style="color:${load>=lt.warningLevel2?'var(--neg)':load>=lt.warningLevel1?'var(--avi)':'var(--ink3)'}">${load}%</span>
      </div>
      <div class="load-bar-track"><div class="bar-fill" style="width:${load}%;background:${load>=lt.warningLevel2?'#c0392b':load>=lt.warningLevel1?'#c07a10':'#4a90d9'}"></div></div>
    </div>
    <div style="margin-bottom:12px">
      <button class="secondary" id="btn-nr" onclick="toggleNR()">Ver próxima carrera ↓</button>
    </div>
    <div id="nr-panel" style="display:none;margin-bottom:12px">
      ${nextRace?racePreviewCard(nextRace,'preview',0):'<p style="font-size:13px;color:var(--ink3)">Sin carrera seleccionada.</p>'}
    </div>
    <div style="margin-bottom:16px">
      ${TRAINING_BLOCKS.map(b=>{
        const sel=G.trainingBlock&&G.trainingBlock.id===b.id;
        const eff=effForWork()*(1+se.trainingMod);
        const loadAfter=Math.round(bodyLoadAfterTraining(b.id));
        const loadCol=loadAfter>=70?'#c0392b':loadAfter>=50?'#c07a10':'#888';
        // Taper: contextual hint
        const hasFutureRace=nextRace!==null&&nextRace!==undefined;
        const taperHint=b.taperBlock&&hasFutureRace?`<div class="text-ok">✓ Tienes carrera próxima — buen momento. +6 Energía y Piernas al salir.</div>`:
                        b.taperBlock&&!hasFutureRace?`<div style="font-size:12px;color:var(--ink3);margin-top:4px">Sin carrera próxima — poco beneficio ahora.</div>`:'';
        // Momentum warning
        const mom=G.trainingMomentum;
        const momWarn=mom&&mom.blockId===b.id&&mom.count>=2?
          `<div style="font-size:12px;color:var(--avi);margin-top:4px">⚠ ${mom.count}º trimestre seguido — riesgo de estancamiento o revelación.</div>`:'';
        // Flavor text when selected
        const flavor=sel&&b.flavor&&b.flavor.length?
          `<div style="font-size:12px;color:var(--ink2);font-style:italic;margin-top:5px;padding:5px 8px;background:var(--soft);border-radius:5px">"${b.flavor[0]}"</div>`:'';
        const effs=b.taperBlock?
          `<span style="font-size:12px;color:var(--pos)">+2 Mental · Carga −18%</span>`:
          Object.entries(b.effects).filter(([,v])=>v!==0).map(([k,v])=>{
            const r=Math.round(v*eff*legsTrainingMult(k));const col=r>0?'#4a8a2a':'#c0392b';
            return `<span style="font-size:12px;color:${col}">${k.charAt(0).toUpperCase()+k.slice(1)} ${r>0?'+':''}${r}</span>`;
          }).join(' <span style="color:#ddd">·</span> ');
        const bkH=b.hours||8;const bkRepH=Math.max(0,(wo?.trainingH||5)+vacTrainingHBonus(G.currentQuarter||1)-bkH);
        return `<div class="train-card ${sel?'sel':''}" onclick="selectTraining('${b.id}')">
          <div class="flex-between">
            <div style="flex:1">
              <div class="card-title">${b.name} <span style="font-size:11px;color:var(--ink3);font-weight:400">· ${bkH}h/sem · quedan ${bkRepH}h reputación</span></div>
              <div style="font-size:12px;color:var(--ink3);margin:2px 0 6px">${b.desc} ${b.detail}</div>
              <div class="flex-between-center">
                <div>${effs}</div>
                <span style="font-size:12px;color:${loadCol};flex-shrink:0;margin-left:8px">carga → ${loadAfter}%</span>
              </div>
              ${taperHint}${momWarn}${flavor}
            </div>
            ${sel?`<span style="color:var(--cuerpo);font-size:16px;margin-left:10px">✓</span>`:''}
          </div>
        </div>`;}).join('')}
    </div>
    ${G.trainingEvent?`<div class="hint" style="margin-bottom:12px">${G.trainingEvent.icon} <strong>Evento de entrenamiento:</strong> ${G.trainingEvent.title} — ${G.trainingEvent.desc}</div>`:''}
    ${G.carreraVida&&G.lifecyclePhase==='overlap'&&G.lifeAthlete?renderAthleteHoursBlock():''}
    <button class="main" onclick="doStartRaces()" ${!G.trainingBlock?'disabled':''}>${G.raceResults.length>0||G.currentRaceIdx>0?'Seguir con la temporada →':'¡Empezar temporada! →'}</button>`;
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
          return `<div onclick="setAthleteHours(${v})" style="flex:1;text-align:center;padding:8px 4px;border-radius:8px;border:1.5px solid ${sel?'#534AB7':'#e0dfd8'};background:${sel?'#EEEDFE':'var(--card)'};cursor:pointer;font-size:13px;font-weight:${sel?'600':'400'};color:${sel?'#534AB7':'var(--ink2)'};transition:all .15s">${v}h</div>`;
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

  el.innerHTML=`
    <h2>Preparación previa</h2>
    <p class="sub">${race.name} · ${race.type}</p>

    ${rep?`<div class="note"><strong>${rep.label}</strong> — +${rep.statBonus.mental} Mental esta carrera${rep.sponsorBonus?' · Sponsors lo valoran':''}</div>`:''}
    ${abandon?`<div class="warn">⚠ ${abandon.label} — los sponsors reducen sus ofertas (×${abandon.sponsorMult})</div>`:''}
    ${altPenalty>0?`<div class="warn">⚠ Carrera de alta altitud — sin entrenamiento específico irás un ${Math.round(altPenalty*100)}% más lento en subidas. Club de Alta Montaña o entrenador lo reducen.</div>`:''}
    ${G.injuryType?`<div class="injury-card">
      <div class="injury-type" style="font-size:14px">${INJURY_TYPES[G.injuryType]?.label||'Lesión'} — llegas tocado <button class="tip-btn" onclick="showTip('Tipos de lesión','${['tendinitis','rotura','fractura'].map(k=>`<strong>${INJURY_TYPES[k].label}</strong> — ${injuryBlockText(k)}.`).join('<br>')}<br><br>Los stats perdidos se recuperan poco a poco. El <strong>fisioterapeuta</strong> acorta las bajas y acelera esa recuperación. La carga corporal alta es la principal causa.')">ⓘ</button></div>
      <div style="font-size:12px;color:var(--ink2);margin-top:4px">
        Energía inicial: <strong>${INJURY_TYPES[G.injuryType]?.nextRaceStats?.energy||80}%</strong> ·
        Piernas: <strong>${INJURY_TYPES[G.injuryType]?.nextRaceStats?.legs||70}%</strong> ·
        Hidratación: <strong>${INJURY_TYPES[G.injuryType]?.nextRaceStats?.hydration||80}%</strong>
      </div>
      ${hasFisio()?`<div class="text-ok">El fisio reduce el impacto.</div>`:'<div style="font-size:12px;color:var(--neg);margin-top:4px">Sin fisio el impacto es máximo. Considera ir conservador.</div>'}
    </div>`:''}

    <div class="section-label">Nutrición la noche antes <button class="tip-btn" onclick="showTip('Nutrición pre-carrera','Lo que comes la noche antes afecta tu <strong>energía inicial</strong> en carrera. Las opciones básicas están siempre disponibles. Las avanzadas (ayuno glucémico, protocolo pro) se desbloquean con años de experiencia.<br><br>Algunas opciones tienen <strong>coste económico</strong>. Si tienes una lesión activa, la energía inicial parte ya penalizada independientemente de la nutrición.')">ⓘ</button></div>
    ${PRE_RACE_NUTRITION.map(n=>{
      const avail=isNutritionAvailable(n);
      const cost=getNutritionCost(n.id);
      const isSel=sel===n.id;
      return `<div class="work-card ${isSel?'sel':''} ${!avail.ok?'locked-work':''}" onclick="${avail.ok?'setPreNutrition(\''+n.id+'\')':''}">
        <div class="flex-between">
          <div style="flex:1">
            <div class="card-title">${n.label}</div>
            <div class="card-sub">${n.desc}</div>
            ${!avail.ok?`<div style="font-size:12px;color:var(--ink3);margin-top:2px">🔒 ${avail.reason}</div>`:''}
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:10px;font-size:12px">
            ${n.energyBonus>0?`<div style="color:var(--pos)">+${n.energyBonus} energía</div>`:
              n.energyBonus<0?`<div style="color:var(--avi)">${n.energyBonus} energía</div>`:
              `<div style="color:var(--ink3)">sin bonus</div>`}
            ${cost>0?`<div style="color:var(--neg);margin-top:2px">€${cost}</div>`:''}
          </div>
        </div>
      </div>`;}).join('')}

    ${isUltra?`
    <div class="section-label">Dropbag (máx. 2 items) <button class="tip-btn" onclick="showTip('Dropbag','Disponible en ultras de 40km+. Dejas hasta <strong>2 items</strong> en el avituallamiento central antes de salir.<br><br>Puedes usarlos <strong>una sola vez</strong> al pasar por ese avituallamiento en carrera. Elige según tus puntos débiles: energía, hidratación o recuperación de piernas.<br><br>Si no ves la opción de usar la dropbag en el avituallamiento, es que todavía no has llegado al punto donde la dejaste.')">ⓘ</button></div>
    <div style="font-size:12px;color:var(--ink3);margin-bottom:10px">Deja una bolsa en el avituallamiento central con material extra</div>
    ${DROPBAG_OPTIONS.map(d=>{
      const isSel=bag.includes(d.id);
      const maxed=!isSel&&bag.length>=2;
      return `<div class="dropbag-item ${isSel?'sel-bag':''} ${maxed?'disabled':''}" onclick="${maxed?'':'toggleDropbag(\''+d.id+'\')'}">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${d.label}${isSel?' ✓':''}</div>
          <div style="font-size:12px;color:var(--ink3)">${d.desc}</div>
        </div>
      </div>`;}).join('')}`:''}

    <div class="section-label">🧃 Geles en el bolsillo <button class="tip-btn" onclick="showTip('Geles en carrera','Lleva geles en el bolsillo para usarlos en cualquier tramo, sin esperar al avituallamiento.<br><br>Cada gel da <strong>+18 energía</strong> (o +22 con sponsor nutrición) y cuesta <strong>€2</strong>. Máximo 5 geles.<br><br>En carreras cortas (−20km) llevar muchos no tiene sentido. Para ultras, pueden ser decisivos en el último tercio.')">ⓘ</button></div>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;padding:10px 14px;background:var(--card);border:1px solid var(--line);border-radius:10px">
      <button class="secondary" onclick="G.gelsCarried=Math.max(0,(G.gelsCarried||0)-1);render()" style="padding:6px 14px;font-size:16px" ${!(G.gelsCarried>0)?'disabled':''}>−</button>
      <div style="flex:1;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--pos)">${G.gelsCarried||0}</div>
        <div style="font-size:12px;color:var(--ink3)">geles · €${(G.gelsCarried||0)*2} · +${(G.gelsCarried||0)*18} energía potencial</div>
      </div>
      <button class="secondary" onclick="G.gelsCarried=Math.min(5,(G.gelsCarried||0)+1);render()" style="padding:6px 14px;font-size:16px" ${G.gelsCarried>=5?'disabled':''}>+</button>
    </div>
    ${(G.gelsCarried||0)>0?`<div class="note" style="margin-bottom:12px">Llevas ${G.gelsCarried} gel${G.gelsCarried>1?'es':''} (€${G.gelsCarried*2}). Úsalos en cualquier tramo pulsando el botón que aparecerá en carrera.</div>`:''}

    <div class="section-label">🏃 Calentamiento <button class="tip-btn" onclick="showTip('Calentamiento','20 minutos de calentamiento antes de la salida.<br><br><strong>Coste:</strong> −5 Energía inicial.<br><strong>Beneficio:</strong> +4 Velocidad y +3 Subida durante toda la carrera.<br><br>Vale la pena en carreras cortas (−25km) donde la velocidad importa desde el primer tramo. Para ultras, el coste de energía no compensa.')">ⓘ</button></div>
    <div class="work-card ${G.warmedUp?'sel':''}" onclick="G.warmedUp=!G.warmedUp;render()" style="${G.warmedUp?'border-color:#4a8a2a;background:var(--soft);':''}">
      <div class="flex-between-center">
        <div>
          <div class="card-title">Calentar 20 minutos</div>
          <div class="card-sub">−5 energía · +4 Velocidad · +3 Subida durante la carrera</div>
          ${race.km>25?`<div style="font-size:12px;color:var(--avi);margin-top:2px">En ultras el coste de energía puede no compensar</div>`:`<div style="font-size:12px;color:var(--pos);margin-top:2px">Para esta distancia es una buena decisión</div>`}
        </div>
        <span style="font-size:18px;color:${G.warmedUp?'var(--pos)':'#ddd'}">${G.warmedUp?'✓':'○'}</span>
      </div>
    </div>

    <button class="main" style="margin-top:12px" onclick="goPreRace()">Confirmar y ver briefing →</button>`;
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
function renderMidSeasonCalendar(){
  const el=$main();
  const doneNames=G.raceResults.map(r=>r.name);
  const selIds=G.selectedRaces.map(r=>r.id);
  const spent=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
  const canAccess=canAccessRace;   // DS08 (v95)
  const tierColor=TIER_COLOR_RACE;
  const tierLabel=TIER_LABEL_RACE;
  const qLabel={1:'Primer trimestre',2:'Segundo trimestre',3:'Tercer trimestre',4:'Cuarto trimestre'};
  // uses global QUARTERS

  function raceRow(r){
    const isDone=doneNames.includes(r.name);
    const isSel=selIds.includes(r.id);
    const locked=!canAccess(r);
    const noMoney=!isSel&&(spent+r.cost>G.money);
    if(isDone){
      return `<div class="race-card" style="opacity:0.45;cursor:default">
        <div class="flex-between-center">
          <div><div style="font-size:14px;font-weight:600;color:var(--ink3)">${r.name}</div>
          <div style="font-size:12px;color:var(--ink3)">${r.monthName} · ya corrida</div></div>
          <span style="font-size:12px;color:var(--pos);font-weight:600">✓ hecha</span>
        </div>
      </div>`;
    }
    return `<div class="race-card ${isSel?'sel':locked?'locked':''}" onclick="${locked?'':'toggleRaceMid(\''+r.id+'\')'}">
      <div class="flex-between">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">
            <span class="card-title">${esc(r.name)}</span>
            <span style="font-size:12px;font-weight:600;padding:1px 5px;border-radius:3px;background:${tierColor[r.tier]||'#888'}22;color:${tierColor[r.tier]||'var(--ink3)'}">${tierLabel[r.tier]||''}</span>
            ${inviteBadge(r)}
          </div>
          <div style="font-size:12px;color:var(--ink3)">${r.monthName} · ${r.type} · ${raceDesnivel(r)}</div>
          ${locked?(r.zegamaSpecial?`<div style="font-size:12px;color:var(--avi);margin-top:2px">🏔️ Invitación Top 20 o clasificación por tiempo (corte 4h20)</div>`:`<div style="font-size:12px;color:var(--ink3);margin-top:2px">🔒 Ranking #${r.reqRanking} requerido</div>`):''}
          ${noMoney&&!isSel?`<div class="text-warn">Sin presupuesto</div>`:''}
        </div>
        <div class="right-col">
          <div style="font-size:13px;font-weight:600;color:var(--pos)">€${r.prize}</div>
          <div style="font-size:12px;color:var(--ink3)">€${r.cost} inscr.</div>
          ${isSel?`<div style="font-size:12px;color:var(--pos);font-weight:600;margin-top:2px">✓</div>`:''}
        </div>
      </div>
    </div>`;
  }

  el.innerHTML=`
    <h2>Modificar calendario</h2>
    <p class="sub">Las carreras ya corridas no se pueden cambiar</p>
    ${QUARTERS.map(q=>{
      const races=RACES_DB.filter(r=>r.quarter===q.n);
      const specRaces=getSpecRaces().filter(r=>r.quarter===q.n);
      const allQ=[...races,...specRaces];
      const qSel=allQ.filter(r=>selIds.includes(r.id)).length;
      const qDone=allQ.filter(r=>doneNames.includes(r.name)).length;
      const isOpen=(G.openQuarters?.mid||[]).includes(q.n);
      return `
        <div class="quarter-wrap">
          <div class="quarter-toggle ${qSel>0?'has-sel':''}" onclick="toggleQMid(${q.n})">
            <span style="font-size:14px;font-weight:600;flex:1">${qLabel[q.n]}
              <span style="font-size:12px;font-weight:400;color:var(--ink3)"> · ${q.months}</span>
            </span>
            ${qDone>0?`<span style="font-size:12px;color:var(--pos);margin-right:6px">${qDone} ✓ hecha${qDone>1?'s':''}</span>`:''}
            ${qSel>qDone?`<span style="font-size:12px;color:var(--cuerpo);margin-right:6px">${qSel-qDone} pendiente${qSel-qDone>1?'s':''}</span>`:''}
            <span style="font-size:12px;color:var(--ink3);display:inline-block;transform:${isOpen?'rotate(90deg)':''};transition:transform .2s">▶</span>
          </div>
          <div class="quarter-content ${isOpen?'open':''}" onclick="event.stopPropagation()">
            ${races.map(r=>raceRow(r)).join('')}
            ${specRaces.length>0?`
              <div style="font-size:12px;color:var(--pos);font-weight:600;padding:6px 2px 4px">★ Específicas de tu especialidad</div>
              ${specRaces.map(r=>raceRow(r)).join('')}
            `:''}
          </div>
        </div>`;}).join('')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
      <button class="main" onclick="G.screen='betweenManage';render()" style="margin-top:0">← Volver</button>
      <button class="main" onclick="afterRace()" style="margin-top:0">Confirmar →</button>
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
function renderCircuits(){
  const el=$main();
  el.innerHTML=`
    <h2>Circuitos y ligas</h2>
    <p class="sub">Únete a un circuito para ganar puntos extra y premios al final del año</p>
    ${CIRCUITS_DB.map(c=>{
      const joined=G.joinedCircuits.includes(c.id);
      const locked=c.reqRanking&&G.ranking>c.reqRanking;
      const pts=G.circuitPoints[c.id]||0;
      const raceNames=c.raceIds.map(id=>{
        const r=[...RACES_DB,...getSpecRaces()].find(x=>x.id===id);
        return r?r.name:id;
      });
      return `<div class="circuit-card ${joined?'joined':''}" onclick="${locked?'':'toggleCircuit(\''+c.id+'\')'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="flex:1">
            <div style="font-size:15px;font-weight:600;color:${c.color}">${c.name}</div>
            <div class="card-sub">${c.desc}</div>
          </div>
          ${joined?`<span style="font-size:12px;color:var(--avi);font-weight:600;flex-shrink:0;margin-left:10px">✓ Unido</span>`:''}
          ${locked?`<span style="font-size:12px;color:var(--ink3);flex-shrink:0;margin-left:10px">🔒</span>`:''}
        </div>
        <div style="font-size:12px;color:var(--ink3);margin-bottom:8px">Carreras: ${raceNames.join(' · ')}</div>
        <div style="font-size:12px;color:var(--pos);margin-bottom:6px">Premio: ${c.prize}</div>
        ${joined?`<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px">
          <span style="color:var(--ink3)">Puntos acumulados</span>
          <span style="font-weight:600;color:var(--avi)">${pts} / ${c.pointsForPrize}</span>
        </div>
        <div style="height:4px;background:var(--trk);border-radius:2px;margin-top:4px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,Math.round(pts/c.pointsForPrize*100))}%;background:#c07a10;border-radius:2px"></div>
        </div>`:''}
      </div>`;}).join('')}
    <button class="main" style="margin-top:8px" onclick="G.screen='seasonStart';autoSave();render()">← Volver</button>`;
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
  el.innerHTML=`
    <h2>Reputación</h2>
    <p class="sub">${esc(G.runner.name||'Corredor')} · ${f.toLocaleString()} seguidores</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="fame-stat">
        <div style="font-size:12px;color:var(--ink3);margin-bottom:4px">Seguidores</div>
        <div style="font-size:18px;font-weight:700;color:var(--avi)">${f>=1000?(f/1000).toFixed(1)+'K':f}</div>
        <div class="followers-bar"><div class="followers-fill" style="width:${nextLevel?Math.min(100,Math.round(f/nextLevel.followers*100)):100}%"></div></div>
      </div>
      <div class="fame-stat">
        <div style="font-size:12px;color:var(--ink3);margin-bottom:4px">Nivel</div>
        <div style="font-size:13px;font-weight:700">${level?level.label:'Desconocido'}</div>
        <div style="font-size:12px;color:var(--ink3);margin-top:3px">${level?level.benefit:nextLevel?'→ '+nextLevel.followers.toLocaleString()+' seg':''}</div>
      </div>
    </div>
    ${nextLevel?`<div style="font-size:12px;color:var(--ink3);margin-bottom:14px">Próximo nivel: <strong>${nextLevel.label}</strong> a ${(nextLevel.followers-f).toLocaleString()} seguidores</div>`:''}
    ${(()=>{const wo=curWorkOpt();const blockH=G.trainingBlockHours||8;const totalH=(wo?.trainingH||5)+vacTrainingHBonus(G.currentQuarter||1);const repH=Math.max(0,totalH-blockH);return `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink3);margin-bottom:4px">
      <span>Horas disponibles</span>
      <span style="font-weight:600;color:${availH<=2?'var(--neg)':availH<=5?'var(--avi)':'var(--ink)'}">${availH}h</span>
    </div>
    <div style="font-size:12px;color:var(--ink3);margin-bottom:8px">${totalH}h trabajo − ${blockH}h bloque = ${repH}h reputación · usadas: ${G.fameHoursUsed||0}h</div>`;})()}
    ${availH<=2?`<div class="warn">Pocas horas disponibles — más actividad en redes reducirá tu tiempo de entrenamiento.</div>`:''}
    ${(G.repInvitations||[]).length>0?`<div class="card" style="margin-bottom:14px;border-color:#2d7a2d">
      <div style="font-size:13px;font-weight:700;color:var(--pos);margin-bottom:8px">📩 Invitaciones disponibles esta temporada</div>
      ${G.repInvitations.map(r=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:0.5px solid var(--line)">
        <div>
          <div style="font-size:13px;font-weight:600">${esc(r.name)}</div>
          <div style="font-size:12px;color:var(--ink3)">${r.tier} · ${r.monthName||''}</div>
        </div>
        <button class="secondary" onclick="addRepInvitation('${r.id}')" style="font-size:12px;padding:4px 10px">Añadir →</button>
      </div>`).join('')}
    </div>`:''}
    <div class="section-label">Acciones disponibles</div>
    ${FAME_ACTIONS.map(a=>{
      const done=G.fameActionsThisSeason[a.id]||0;
      const onCooldown=done>=a.cooldown;
      const noHours=availH<a.hours;
      const noSponsor=a.reqSponsor&&!hasSponsor;
      const noRace=a.reqLastRace&&!hasRecentRace;
      const disabled=onCooldown||noHours||noSponsor||noRace;
      let reason='';
      if(onCooldown)reason='Límite de esta temporada alcanzado';
      else if(noSponsor)reason='Necesitas un sponsor activo';
      else if(noRace)reason='Necesitas haber corrido una carrera primero';
      else if(noHours)reason='Sin horas disponibles';
      return `<div class="fame-action ${disabled?'fame-disabled':''}" onclick="${disabled?'':'doFameAction(\''+a.id+'\')'}">
        <div class="flex-between">
          <div style="flex:1">
            <div class="card-title">${a.icon} ${a.label}</div>
            <div class="card-sub">${a.desc}</div>
            ${reason?`<div class="text-warn">${reason}</div>`:''}
          </div>
          <div class="right-col">
            <div style="font-size:12px;color:var(--ink3)">-${a.hours}h</div>
            <div style="font-size:12px;color:var(--avi);font-weight:600">+${a.followers} seg.</div>
            ${a.income?`<div style="font-size:12px;color:var(--pos)">+€${a.income}</div>`:''}
            <div style="font-size:12px;color:var(--ink3)">${done}/${a.cooldown} usado</div>
          </div>
        </div>
      </div>`;}).join('')}`;
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
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">
      <h2>Entre carreras</h2>
      <span style="font-size:12px;color:var(--ink3);padding-top:5px">${G.currentRaceIdx}/${G.selectedRaces.length} corridas</span>
    </div>
    <p class="sub">${nextRace?'Próxima: '+nextRace.name:'Fin de temporada'}</p>
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink3);margin-bottom:4px">
        <span>Carga corporal</span>
        <span style="color:${load>=lt.warningLevel2?'var(--neg)':load>=lt.warningLevel1?'var(--avi)':'var(--ink3)'}">${load}%</span>
      </div>
      <div class="load-bar-track"><div class="bar-fill" style="width:${load}%;background:${load>=lt.warningLevel2?'#c0392b':load>=lt.warningLevel1?'#c07a10':'#4a90d9'}"></div></div>
      ${load>=lt.warningLevel2?`<div style="font-size:12px;color:var(--neg);margin-top:4px">Carga alta — considera recuperar antes de la próxima.</div>`:
        load>=lt.warningLevel1?`<div style="font-size:12px;color:var(--avi);margin-top:4px">Carga moderada. Una sesión te vendrá bien.</div>`:''}
    </div>
    ${debtPanel()}
    <div class="section-label">Recuperación${G._recoveryUsed?' <span style="font-size:12px;color:var(--ink3);font-weight:400">(1 acción usada)</span>':''}</div>
    ${FISIO_OPTIONS.map(o=>{
      const cantAfford=o.cost>0&&o.cost>G.money;
      const alreadyUsed=!!G._recoveryUsed;
      const disabled=cantAfford||alreadyUsed;
      let reason='';
      if(alreadyUsed)reason='Ya has usado una acción de recuperación';
      else if(cantAfford)reason='Sin presupuesto';
      return `<div class="work-card ${disabled?'locked-work':''}" onclick="${disabled?'':'doRecovery(\''+o.id+'\')'}">
        <div class="flex-between">
          <div style="flex:1">
            <div class="card-title">${o.label}</div>
            <div class="card-sub">${o.desc}</div>
            ${reason?`<div class="text-warn">${reason}</div>`:''}
          </div>
          <div class="right-col">
            ${o.cost>0?`<div style="font-size:13px;font-weight:600;color:var(--neg)">-€${o.cost}</div>`:`<div style="font-size:13px;font-weight:600;color:var(--ink3)">Gratis</div>`}
            <div style="font-size:12px;color:var(--pos)">carga -${o.loadRedux}%</div>
          </div>
        </div>
      </div>`;}).join('')}
    ${hasFisioContract?(()=>{
      const cov=Math.round((1-fisioInjuryMult(load))*100);
      const saturado=load>=lt.warningLevel1;
      return `<div class="note" style="${saturado?'background:#FBF0E4;border-color:#E3C39A;color:#7a4d10':''}">🧑‍⚕️ Fisio contratado — hoy te cubre un <strong>${cov}%</strong> del riesgo de lesión. ${saturado
        ?'Con la carga a este nivel ya no da abasto. Una sesión puntual la baja y vuelve a protegerte.'
        :'Las sesiones puntuales son extra.'}</div>`;
    })():''}
    <div class="divider"></div>
    <div class="section-label">Otras opciones</div>
    <div class="work-card" onclick="G.screen='midSeasonCalendar';render()" style="margin-bottom:14px">
      <div class="card-title">📅 Modificar calendario pendiente</div>
      <div class="card-sub">Añade o quita carreras que aún no has corrido</div>
    </div>
    <div class="work-card" onclick="G._clubFromBetween=true;G.screen='clubSetup';render()" style="margin-bottom:14px">
      <div class="card-title">🏃 ${G.club&&G.club.id!=='none'?'Club: '+G.club.name:'Unirse a un club'}</div>
      <div class="card-sub">${G.club&&G.club.id!=='none'?'Ver reputación o cambiar de club':'Sin club actualmente — explorar opciones'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${G._raceResultHTML?`<button class="main" onclick="G.screen='raceResult';render()" style="margin-top:0;background:var(--soft);color:var(--ink);border-color:var(--line2)">← Ver resumen</button>`:'<div></div>'}
      <button class="main" onclick="afterRace()" style="margin-top:0">Siguiente carrera →</button>
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
function renderBetweenRace(){
  const el=$main();const ev=G.pendingEvent;
  if(!ev){goNextRace();return;}
  el.innerHTML=`
    <div style="font-size:12px;font-weight:600;color:var(--ink3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Entre carreras</div>
    <h2>${ev.title}</h2>
    <p style="font-size:14px;color:var(--ink2);margin:6px 0 20px;line-height:1.65">${ev.desc}</p>
    <div style="display:grid;gap:8px">
      ${ev.choices.map((c,i)=>`<div class="pace" onclick="handleEv('${ev.id}',${i})"><div class="pace-label" style="font-size:14px;margin-bottom:0">${c.text}</div></div>`).join('')}
    </div>`;
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
        <button class="main" style="margin-top:0;border-color:#c0392b;color:var(--neg)" onclick="confirmBreakSponsor('${cat}')">Romper — €${penaltyAmount}</button>
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
