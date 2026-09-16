// ═══════════════════════════════════════════════════════════════════════════
//  RENDER · CIERRE DE TEMPORADA Y ARCO NARRATIVO
// ═══════════════════════════════════════════════════════════════════════════
// T53 (v92) · tercera de las tres piezas de render.js. Ver render-core.js.
//
// Lo que ocurre cuando una temporada se acaba y la carrera deportiva avanza:
//   · el balance de temporada, sus gráficas y doNextYear()
//   · envejecimiento, degradación, retirada y retirada de rivales
//   · la deuda y el final de partida por quiebra
//   · el arco de Carrera de Vida: oferta de atleta, salto a Entrenador, oferta
//     de club, el hub de solapamiento y el diario
//
// Es la parte que menos se toca y la que más historia tiene, por eso va suelta.

// ── SEASON BALANCE ─────────────────────
function renderSeasonBalance(){
  const el=$main();
  const annualWork=monthlyWorkIncome()*12;
  const annualSponsor=sponsorAnnual();
  const annualFixed=FIXED_COSTS.total*12;
  const annualClub=(G.club?.cost||0)*12;
  const raceIncome=G.raceResults.reduce((a,r)=>a+r.prize,0);
  const raceCosts=G.selectedRaces.reduce((a,r)=>a+r.cost,0);
  const annualBrand=monthlyBrandIncome()*12;
  const yearNet=seasonYearNet();   // H19 (v95): la misma cuenta que usa el modo dev
  el.innerHTML=`
    <h2>Balance Temporada ${G.year}</h2>
    <p class="sub">${esc(G.runner.name)} · Año ${G.year} completado</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:#f5f4f0;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Km temporada</div>
        <div style="font-size:20px;font-weight:700;color:#4a90d9">${G.seasonKm||0} km</div>
      </div>
      <div style="background:#f5f4f0;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Km carrera total</div>
        <div style="font-size:20px;font-weight:700;color:#4a8a2a">${G.totalCareerKm||0} km</div>
      </div>
    </div>
    ${G.joinedCircuits.length>0?`<div style="margin-bottom:14px">
      <div class="section-label">Circuitos</div>
      ${G.joinedCircuits.map(cid=>{
        const c=CIRCUITS_DB.find(x=>x.id===cid);if(!c)return '';
        const pts=G.circuitPoints[cid]||0;
        const completed=G.circuitCompleted.includes(cid)||pts>=c.pointsForPrize;
        return `<div class="card">
          <div style="font-size:14px;font-weight:600;color:${c.color}">${c.name}</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px">
            <span style="color:#888">Puntos acumulados</span>
            <span style="font-weight:600;color:${completed?'#4a8a2a':'#c07a10'}">${pts} / ${c.pointsForPrize}</span>
          </div>
          ${completed?`<div class="note" style="margin-top:8px;margin-bottom:0">🏆 Circuito completado — Premio: +€${c.reward.money}</div>`:
            `<div style="font-size:12px;color:#aaa;margin-top:6px">Faltan ${c.pointsForPrize-pts} puntos para el premio</div>`}
        </div>`;}).join('')}
    </div>`:''}

    <div class="section-label">Carreras</div>
    ${G.raceResults.length===0?'<p style="font-size:13px;color:#aaa;margin-bottom:14px">Sin carreras completadas.</p>':
      `<div style="margin-bottom:14px">${G.raceResults.map(r=>{
        if(isDNF(r)) return `<div style="padding:9px 0;border-bottom:1px solid #eee">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px">
            <div><span style="font-size:13px;color:#c0392b;margin-right:8px;font-weight:600">❌</span>${r.name}</div>
            <span style="font-size:12px;color:#c0392b;font-weight:600">${r.dnfReason==='lesion'?'No participó':'No clasificado'}</span>
          </div>
          <div style="font-size:12px;color:#c0392b;margin-top:3px">${r.dnfReason==='lesion'?(r.injuryLabel||'Lesión')+' — baja forzada':dnfLabel(r)+' — sin clasificación'} · €0 premio</div>
        </div>`;
        return `<div style="padding:9px 0;border-bottom:1px solid #eee">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px">
            <div>
              <span style="font-size:13px;color:${r.pos===1?'#c07a10':r.pos<=3?'#4a8a2a':'#888'};margin-right:8px;font-weight:600">${r.pos}º</span>
              ${r.name}
            </div>
            <span style="font-size:13px;color:#888">${fmt(r.time)} · <span style="color:#2d7a2d">+€${r.prize}</span></span>
          </div>
          ${r.catPos&&r.catTotal>1?`<div style="margin-top:4px"><span style="font-size:12px;background:#e8eef8;color:#2d4fa0;border-radius:4px;padding:1px 7px;font-weight:600">${r.catName} ${r.catPos}º / ${r.catTotal}</span></div>`:''}
          ${r.injuryType?`<div style="font-size:12px;color:#c0392b;margin-top:4px">
            ⚠ ${r.injuryLabel||r.injuryType}${r.kmAtInjury?' (km '+r.kmAtInjury+')':''} · stats: ${Object.entries(INJURY_TYPES[r.injuryType]?.statPenalty||{}).map(([k,v])=>v+' '+k).join(', ')}
          </div>`:''}
        </div>`;}).join('')}</div>`}

    <div class="section-label">Cuenta anual</div>
    <div class="card" style="margin-bottom:16px">
      <table class="eco-table">
        ${annualWork>0?`<tr><td>Trabajo (${currentWorkPct()}%)</td><td class="right plus">+€${annualWork}</td></tr>`:''}
        ${annualSponsor>0?`<tr><td>Patrocinios</td><td class="right plus">+€${annualSponsor}</td></tr>`:''}
        ${raceIncome>0?`<tr><td>Premios de carrera</td><td class="right plus">+€${raceIncome}</td></tr>`:''}
        ${annualBrand>0?`<tr><td>Tu marca 👟</td><td class="right plus">+€${annualBrand}</td></tr>`:''}
        <tr><td>Gastos fijos de vida</td><td class="right minus">-€${annualFixed}</td></tr>
        ${annualClub>0?`<tr><td>Club (${G.club?.name})</td><td class="right minus">-€${annualClub}</td></tr>`:''}
        ${raceCosts>0?`<tr><td>Inscripciones y viajes</td><td class="right minus">-€${raceCosts}</td></tr>`:''}
        ${G.spending.fisio?`<tr><td>Fisioterapeuta (12 meses)</td><td class="right minus">-€${STAFF_COSTS.fisio*12}</td></tr>`:''}
        ${G.spending.entrenador?`<tr><td>Entrenador (12 meses)</td><td class="right minus">-€${STAFF_COSTS.entrenador*12}</td></tr>`:''}
        ${G.spending.suplementos?`<tr><td>Suplementos (12 meses)</td><td class="right minus">-€${STAFF_COSTS.suplementos*12}</td></tr>`:''}
        ${Object.values(G.workChangePenalties||{}).reduce((a,v)=>a+(v?.amount||v||0),0)>0?`<tr><td>Penalización cambios jornada</td><td class="right minus">-€${Object.values(G.workChangePenalties||{}).reduce((a,v)=>a+(v?.amount||v||0),0)}</td></tr>`:''}        <tr><td class="total">Resultado del año</td><td class="right total ${yearNet>=0?'plus':'minus'}">${yearNet>=0?'+':''}€${yearNet}</td></tr>
      </table>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="sec-title-sm">Stats tras entrenamiento</div>
      ${Object.entries(G.runner.stats).map(([k,v])=>srow(k.charAt(0).toUpperCase()+k.slice(1),v)).join('')}
    </div>

    <div class="section-label">¿En qué inviertes para la próxima temporada?</div>
    <p style="font-size:13px;color:#aaa;margin-bottom:10px">Ahorros tras el cierre: €${Math.max(0,G.money+yearNet)} · el staff se paga ahora, por la temporada que empieza</p>
    ${[['fisio','Fisioterapeuta','Reduce riesgo de lesión. Recuperación más rápida.'],['entrenador','Entrenador personal','Bloques de entrenamiento +20% efectivos.'],['suplementos','Suplementos y nutrición','Avituallamientos más eficaces. +3 Nutrición.']].map(([id,l,d])=>`
      <div class="aid-row ${G.spending[id]?'sel-aid':''}" onclick="toggleSpend('${id}')">
        <div><div class="aid-name">${l}${G.spending[id]?` <span style="font-size:12px;color:#4a90d9;font-weight:400">· contratado</span>`:''}</div><div class="aid-effect">${d}</div></div>
        <span class="aid-time" style="font-size:13px;font-weight:600">€${STAFF_COSTS[id]}/mes</span>
      </div>`).join('')}

    ${G.monthlyEvents&&G.monthlyEvents.length>0&&!G.monthlyEvents[0].resolved?`
    <div style="margin-top:18px;border-top:1px solid var(--color-border-tertiary);padding-top:16px">
      <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Evento del mes</div>
      <p style="font-size:14px;font-weight:600;margin-bottom:4px">${G.monthlyEvents[0].title}</p>
      <p style="font-size:12px;color:#888;margin-bottom:14px">Puedes dejarlo para la temporada que viene.</p>
      <div style="display:grid;gap:8px">
        ${G.monthlyEvents[0].options.map((o,i)=>`<div class="pace" onclick="resolveMonthlyEvent(0,${i})">
          <div class="pace-label" style="font-size:13px;margin-bottom:2px">${o.text}</div>
          <div class="pace-desc">${o.value>0?`+€${o.value}`:o.value<0?`-€${Math.abs(o.value)}`:''} ${o.statBonus?'· '+Object.entries(o.statBonus).map(([k,v])=>'+'+v+' '+k).join(' '):''}${o.loadRedux?'· carga -'+o.loadRedux+'%':''}</div>
        </div>`).join('')}
      </div>
    </div>`:''}
    <button class="main" style="margin-top:14px" onclick="doNextYear(${yearNet})">${G.gameMode==='expres'&&G.year>=modeCfg().maxYears?'Ver resumen final →':`Temporada ${G.year+1} →`}</button>
    ${(G.runner.age||25)>=42&&G.gameMode!=='expres'?`<button class="main" style="margin-top:6px;border-color:#c0392b;color:#c0392b" onclick="doRetire()">Retirarse — ver resumen de carrera</button>`:''}
    ${G.carreraVida&&G.lifecyclePhase==='overlap'&&(G.runner.age||25)<42?`<button class="main" style="margin-top:6px;border-color:#534AB7;color:#3C3489" onclick="doRetire()">Dejar la competición — pasar a entrenador</button>`:''}
    ${G.gameMode==='expres'&&G.year>=2?`<button class="main" style="margin-top:6px;border-color:#c0392b;color:#c0392b" onclick="doRetire()">Retiro anticipado — ver resumen</button>`:''}`;
}

function renderRankingChart(){
  const hist=getRankingHistory();
  const maxRank=Math.max(...hist.map(h=>h.ranking),100);
  const minRank=Math.min(...hist.map(h=>h.ranking),1);
  const w=320,h=140,padL=38,padR=10,padT=16,padB=26;
  const graphW=w-padL-padR,graphH=h-padT-padB;
  const tx=(i)=>padL+(i/(hist.length-1||1))*graphW;
  const ty=(r)=>padT+((r-minRank)/(maxRank-minRank||1))*graphH;
  const points=hist.map((d,i)=>`${tx(i).toFixed(1)},${ty(d.ranking).toFixed(1)}`).join(' ');
  // Y axis ticks
  const yTicks=[maxRank,Math.round((maxRank+minRank)/2),minRank];
  const yTicksHtml=yTicks.map(v=>`<text x="${padL-4}" y="${(ty(v)+4).toFixed(1)}" text-anchor="end" font-size="10" fill="#666">#${v}</text>`).join('');
  // X axis labels (first and last race)
  const xTicksHtml=`
    <text x="${padL}" y="${h-6}" text-anchor="middle" font-size="10" fill="#888">${hist[0].race}</text>
    <text x="${tx(hist.length-1).toFixed(1)}" y="${h-6}" text-anchor="middle" font-size="10" fill="#888">${hist[hist.length-1].race}</text>`;
  // Dot on last point
  const lastX=tx(hist.length-1),lastY=ty(hist[hist.length-1].ranking);
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;border-radius:8px;background:#f9f9f7">
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+graphH}" stroke="#e0dfd8" stroke-width="0.5"/>
    <line x1="${padL}" y1="${padT+graphH}" x2="${padL+graphW}" y2="${padT+graphH}" stroke="#e0dfd8" stroke-width="0.5"/>
    ${yTicksHtml}
    ${xTicksHtml}
    <polyline points="${points}" fill="none" stroke="#4a90d9" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="#4a90d9"/>
    <text x="${padL}" y="${padT-3}" font-size="11" fill="#555" font-weight="600">Evolución ranking</text>
  </svg>`;
}

function renderSavingsChart(){
  const proj=getSavingsProjection();
  const maxMoney=Math.max(...proj.map(p=>p.money),1000);
  // T126 (v93): esto era Math.max(0, min) — el eje tenía su propio suelo de
  // cero, además del de getSavingsProjection(). Con los dos puestos, una
  // proyección negativa se dibujaba plana sobre el eje. Sin ellos, la línea baja
  // de cero y se ve la caída; con proyección positiva el mínimo es el mismo de
  // antes, así que la escala habitual no cambia.
  const minMoney=Math.min(...proj.map(p=>p.money));
  const color=proj[proj.length-1].money>G.money?'#4a8a2a':'#c0392b';
  const w=320,h=140,padL=52,padR=10,padT=16,padB=26;
  const graphW=w-padL-padR,graphH=h-padT-padB;
  const tx=(i)=>padL+(i/(proj.length-1||1))*graphW;
  const ty=(v)=>padT+graphH-((v-minMoney)/(maxMoney-minMoney||1))*graphH;
  const points=proj.map((d,i)=>`${tx(i).toFixed(1)},${ty(d.money).toFixed(1)}`).join(' ');
  // Y axis ticks
  const yMid=Math.round((maxMoney+minMoney)/2);
  // T126: el signo va delante del €, y el umbral del «k» mira el valor absoluto
  // para que −2.400 salga como −€2.4k y no como €-2400.
  const fmtEur=v=>(v<0?'−€':'€')+(Math.abs(v)>=1000?(Math.abs(v)/1000).toFixed(1)+'k':Math.abs(v));
  const yTicksHtml=[maxMoney,yMid,minMoney].map(v=>`<text x="${padL-4}" y="${(ty(v)+4).toFixed(1)}" text-anchor="end" font-size="10" fill="#666">${fmtEur(v)}</text>`).join('');
  // X ticks: hoy y mes 12
  const xTicksHtml=`
    <text x="${padL}" y="${h-6}" text-anchor="middle" font-size="10" fill="#888">Hoy</text>
    <text x="${tx(proj.length-1).toFixed(1)}" y="${h-6}" text-anchor="middle" font-size="10" fill="#888">+12m</text>`;
  const lastX=tx(proj.length-1),lastY=ty(proj[proj.length-1].money);
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;border-radius:8px;background:#f9f9f7">
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+graphH}" stroke="#e0dfd8" stroke-width="0.5"/>
    <line x1="${padL}" y1="${padT+graphH}" x2="${padL+graphW}" y2="${padT+graphH}" stroke="#e0dfd8" stroke-width="0.5"/>
    ${yTicksHtml}
    ${xTicksHtml}
    ${minMoney<0?`<line x1="${padL}" y1="${ty(0).toFixed(1)}" x2="${padL+graphW}" y2="${ty(0).toFixed(1)}" stroke="#c0392b" stroke-width="0.8" stroke-dasharray="3 3"/>`:''}
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="${color}"/>
    <text x="${padL}" y="${padT-3}" font-size="11" fill="#555" font-weight="600">Proyección ahorros</text>
  </svg>`;
}
window.resolveMonthlyEvent=(evIdx,optIdx)=>{
  const ev=G.monthlyEvents[evIdx];if(!ev)return;
  const opt=ev.options[optIdx];
  G.money=Math.max(0,G.money+opt.value);
  if(opt.statBonus)Object.entries(opt.statBonus).forEach(([k,v])=>{G.runner.stats[k]=Math.min(100,(G.runner.stats[k]||0)+v);});
  if(opt.loadRedux)G.bodyLoad=Math.max(0,G.bodyLoad-opt.loadRedux);
  if(opt.loadAdd)G.bodyLoad=Math.min(100,G.bodyLoad+(opt.loadAdd||0));
  // 2a: Gestión del ascenso laboral
  if(ev._isPromotion){
    if(!G.workPromotionsUsed)G.workPromotionsUsed=[];
    G.workPromotionsUsed.push(ev._promotionPct);
    if(opt.effect==='work_promotion_accept'){
      G.workBonus=(G.workBonus||0)+20;
      G.trainingHPenalty=(G.trainingHPenalty||0)+2;
      showToast('Ascenso aceptado — +€20/mes · −2h/sem de entrenamiento','#c07a10');
    }
  }
  if(opt.clubRepDelta)changeClubRep(opt.clubRepDelta);
  if(opt.addChampionship&&G.selectedRaces.length<12){
    const cr={...EXCLUSIVE_CLUB_RACE,id:'copa_clubes_'+G.year};
    if(!G.selectedRaces.find(r=>r.id===cr.id))G.selectedRaces.push(cr);
  }
  ev.resolved=true;
  // Toast feedback
  const parts=[];
  if(opt.value>0)parts.push(`+€${opt.value}`);
  if(opt.value<0)parts.push(`€${opt.value}`);
  if(opt.statBonus){
    Object.entries(opt.statBonus).forEach(([k,v])=>{
      const label=k.charAt(0).toUpperCase()+k.slice(1);
      parts.push(v>0?`+${v} ${label}`:`${v} ${label}`);
    });
  }
  if(opt.loadRedux)parts.push(`Carga -${opt.loadRedux}`);
  if(opt.loadAdd)parts.push(`Carga +${opt.loadAdd}`);
  if(opt.clubRepDelta)parts.push(opt.clubRepDelta>0?`Rep +${opt.clubRepDelta}`:`Rep ${opt.clubRepDelta}`);
  if(parts.length)showToast(parts.join(' · '), opt.value<0||opt.loadAdd||(opt.clubRepDelta&&opt.clubRepDelta<0)?'#c07a10':'#2d7a2d');
  render();
};
// ══════════════════════════════════════
//  TIENDA PROPIA
// ══════════════════════════════════════
window.doLaunchBrand=()=>{
  if(G.money<2500){showToast('Necesitas €2.500 para lanzar tu marca','#c0392b');return;}
  if(!confirm('¿Lanzar tu propia marca de ropa trail?\n\nCosta €2.500 de inversión inicial.\nGenerará €300/mes pero consumirá 6h/semana de entrenamiento.\n\nA los 2 años podrás contratar un empleado para recuperar esas horas.'))return;
  G.money-=2500;
  G.ownBrand={launched:G.year,hasEmployee:false,employeeYear:null};
  showToast('¡Marca lanzada! 👟 +€300/mes · −6h entrenamiento/semana','#c07a10');
  autoSave();render();
};
window.doHireEmployee=()=>{
  if(!G.ownBrand||G.ownBrand.hasEmployee)return;
  if(!confirm('¿Contratar empleado para tu marca?\n\nCoste: €700/mes (se deduce de los ingresos de la marca).\nBeneficio: recuperas 6h/semana de entrenamiento.\nIngresos netos de la marca: €600/mes.'))return;
  G.ownBrand.hasEmployee=true;
  G.ownBrand.employeeYear=G.year;
  showToast('Empleado contratado 👟 — ingresos netos €600/mes · sin coste de horas','#4a8a2a');
  autoSave();render();
};

window.doNextYear=yearNet=>{
  checkAndUnlockAchievements();
  generateDiaryEntry(yearNet);
  // 2a: Actualizar contador de temporadas en la misma jornada laboral
  const _curPct=currentWorkPct(); // T22 (v89)
  if(!G.workSeasonCount)G.workSeasonCount={pct:_curPct,seasons:0};
  if(G.workSeasonCount.pct!==_curPct){G.workSeasonCount={pct:_curPct,seasons:1};}
  else G.workSeasonCount.seasons++;

  if(!G.sponsorPenalties)G.sponsorPenalties=[];
  Object.keys(G.sponsors).forEach(cat=>{
    const sp=G.sponsors[cat];if(!sp)return;
    const met=checkSponsorObjective(sp);
    if(met&&!G._firstSponsorObjMet)G._firstSponsorObjMet=true;
    if(!met){
      const penalty=Math.round(sp.salary*(sp.penaltyPct||0.15));
      G.sponsorPenalties.push({id:sp.id+'_'+G.year,name:sp.name,amount:penalty,cat,year:G.year});
      // tracking logro 'joke_broke_sponsor' — sponsors distintos incumplidos
      if(!G._distinctPenaltySponsorIds)G._distinctPenaltySponsorIds=[];
      if(!G._distinctPenaltySponsorIds.includes(sp.id))G._distinctPenaltySponsorIds.push(sp.id);
    }
    sp.duration=(sp.duration||1)-1;if(sp.duration<=0)G.sponsors[cat]=null;
  });
  // Otorgar premios de circuitos completados (antes en render, ahora aquí)
  G.joinedCircuits.forEach(cid=>{
    const c=CIRCUITS_DB.find(x=>x.id===cid);if(!c)return;
    const pts=G.circuitPoints[cid]||0;
    if(pts>=c.pointsForPrize&&!G.circuitCompleted.includes(cid)){
      G.circuitCompleted.push(cid);
      G.money+=c.reward.money;
    }
  });
  // T29 (v86): el saldo nunca se pinta en negativo; el déficit va a G.debt.
  // Cualquier saldo positivo paga deuda antes de acumularse.
  applyYearBalance(yearNet);

  // ── Recompensa de objetivo de temporada (pago único) ─────────────
  if(G.yearObjective&&!G._yearObjectiveRewardPaid){
    const objRes=checkYearObjectiveMet();
    if(objRes&&objRes.met){
      G.money+=objRes.reward;
      G._yearObjectiveRewardPaid=true;
      setTimeout(()=>showToast(`✓ Objetivo cumplido: +€${objRes.reward}`,'#4a8a2a'),400);
    }
  }

  // ── Penalizaciones de sponsor vencidas ──────────────────────────
  // Tienes una temporada de margen para pagarlas o negociarlas. Las que
  // sigan pendientes al cerrar la temporada siguiente se cobran de oficio.
  (G.sponsorPenalties||[]).forEach(p=>{if(p.year==null)p.year=G.year;}); // saves anteriores a v63
  const _vencidas=(G.sponsorPenalties||[]).filter(p=>p.year<G.year);
  if(_vencidas.length){
    const _totalVenc=_vencidas.reduce((a,p)=>a+p.amount,0);
    applyYearBalance(-_totalVenc);
    G.sponsorPenalties=G.sponsorPenalties.filter(p=>p.year>=G.year);
    setTimeout(()=>showToast(`Penalizaciones vencidas cobradas: -€${_totalVenc}`,'#c0392b'),600);
  }

  // Ingresos anuales de marca (ya están en yearNet a través de monthlyNet, pero el empleado se paga aparte)
  // El coste del empleado ya está descontado en monthlyBrandIncome() = 600 neto

  // ── Achievement tracking: temporada sin entrenamiento ──
  if(!G._seasonTrainingDone)G._noTrainSeasonDone=true;
  G._seasonTrainingDone=false;
  // ── Achievement tracking: temporada sin penalización de sponsor ──
  {const thisSeason=(G.sponsorPenalties||[]).filter(p=>p.year===G.year).length;
  if(thisSeason===0&&Object.values(G.sponsors||{}).some(Boolean)){G._cleanSponsorSeason=true;}}
  // ── Achievement tracking: club loyalty ──
  {const curClubId=(G.club?.id)||'none';
  if(G._clubLoyaltyId&&G._clubLoyaltyId===curClubId){G._clubLoyaltyStreak=(G._clubLoyaltyStreak||0)+1;}
  else{G._clubLoyaltyStreak=1;G._clubLoyaltyId=curClubId;}
  if(!G._clubAscent&&curClubId==='elite')G._clubAscent=true;}
  // Envejecer
  // ── Decaimiento de reputación al fin de temporada ──
  const _finishedRaces=finishedResults(G.raceResults).length; // T45 (v89): los abandonos no contaban como lesión y sí como terminadas
  const _fameActCount=Object.values(G.fameActionsThisSeason||{}).reduce((a,v)=>a+v,0);
  if(_finishedRaces===0)applyRepDecay('no_races');
  else if(_fameActCount===0)applyRepDecay('season_inactive');
  if((G.injuryRacesLeft||0)>=4)applyRepDecay('injury_long');

  G.runner.age=(G.runner.age||25)+1;
  applyAgingPenalties();

  G.year++;

  // Fin de modo Exprés (temporadas según modeCfg().maxYears)
  if(G.gameMode==='expres'&&G.year>modeCfg().maxYears){G.screen='retirement';render();return;}

  // T23 (v88): esto bajaba la jornada del jugador en silencio. Sigue bajándola
  // (es la recompensa por vivir del trail), pero ahora se avisa.
  if(G.year>=3&&G.ranking<200&&monthlyNet()>=0&&currentWorkPct()>80&&!G.forcedFullTime){
    // T22 (v89): antes tocaba solo G.workPct y dejaba workByQuarter intacto, así
    // que la bajada se deshacía sola al cambiar de trimestre. Y con la vuelta
    // forzosa por deuda activa no debe bajar nada.
    G.workByQuarter={1:80,2:80,3:80,4:80};
    G.workPct=currentWorkPct();
    if(typeof showToast==='function')showToast('Tu ranking te permite reducir la jornada al 80 % — puedes volver a subirla cuando quieras','#4a8a2a');
  }
  // Traspasar clasificación Zegama
  G.zegamaQual=G.zegamaQualNext;G.zegamaQualNext=false;
  G.selectedRaces=[];G.trainingBlock=null;G.trainingBlockApplied=false;G.raceResults=[];G.currentRaceIdx=0;G.trainingEff=1.0; // T25 (v89)
  G.activeTab='game';G.lastRaceGains=[];
  G.workByQuarter={1:G.workPct,2:G.workPct,3:G.workPct,4:G.workPct};
  G.currentQuarter=1;G.fameActionsThisSeason={};G.fameHoursUsed=0;
  // Calcular invitaciones por reputación para la nueva temporada (tras resetear selectedRaces)
  calcRepInvitations();
  G.circuitPoints={};G.circuitCompleted=[];G.vacByQuarter={1:0,2:0,3:0,4:0};
  G.seasonKm=0;
  G.postRaceRestWeeks=0;G.seasonLegsPenalty=0;   // secuelas de zona roja: duran la temporada (v95)
  // v96 · la pretemporada cura: la baja y el estado de lesión no pasan a la temporada
  // siguiente (con el 999, una fractura bloqueaba también todas las posteriores, y la
  // primera carrera del año no comprobaba la baja). Lo que queda es la secuela de stats,
  // que en pretemporada recupera la mitad de lo pendiente.
  G.injuryRacesLeft=0;G.injuryType=null;G.injuryStatus=null;
  recoverInjurySequel(INJURY_SEQUEL_RECOVERY.preseason);
  G.fatBurning=false;
  G.trainingMomentum=null;G.taperBonus=false;
  G.dayConditionGenerated=false;G.dayCondition=null;
  G.gelsCarried=0;G.gelsUsed=0;G.warmedUp=false;G.startStrategy=null;
  // Arco narrativo — actualizar atleta y resetear horas
  if(G.carreraVida&&G.lifeAthlete&&G.lifecyclePhase==='overlap'){
    const h=G.lifeAthleteHours||0;
    if(h>0){
      // Subir stats del atleta proporcional a horas
      const gain=lifeAthleteSeasonGain(h);
      const stats=G.lifeAthlete.currentStats||{...G.lifeAthlete.baseStats};
      const keys=Object.keys(stats);
      const picks=shuffle(keys).slice(0,gain);
      picks.forEach(k=>{stats[k]=Math.min(100,(stats[k]||50)+1);});
      G.lifeAthlete.currentStats=stats;
      // v96: el atleta que entrenas en el lado Entrenador es G.coachAthlete, una copia que tras
      // guardar y cargar ya no comparte objeto con G.lifeAthlete: las horas no le llegaban.
      const ca=G.coachAthlete;
      if(ca&&ca.id===G.lifeAthlete.id){
        const cs=ca.currentStats||(ca.currentStats={...ca.baseStats});
        if(cs!==stats)picks.forEach(k=>{cs[k]=Math.min(100,(cs[k]||50)+1);});
      }
      // Línea en diario
      const first=G.lifeAthlete.name.split(' ')[0];
      G.seasonDiary=G.seasonDiary||[];
      // T24 (v88): esto era una cadena suelta en un array de objetos y el diario
      // la pintaba como «Año undefined · undefined años».
      G.seasonDiary.push({
        year:G.year-1, age:(G.runner.age||25)-1,
        text:`${first}: ${h}h a la semana dedicadas. ${gain===3?'Progresa bien.':gain===2?'Va mejorando.':'Poco tiempo, pero algo es algo.'}`,
        highlight:'Atleta a tu cargo',
      });
    }
    G.lifeAthleteHours=0; // reset para la siguiente temporada
  }
  G.screen=G.gameMode==='expres'?'expresSeasonStart':'workSetup';
  G._expressSponsorPool=null;
  // Arco narrativo — comprobar oferta de atleta (solo carrera normal, fase runner)
  if(G.carreraVida&&G.lifecyclePhase==='runner'&&G.gameMode!=='expres'){
    const offer=checkFirstAthleteOffer();
    if(offer){G.pendingLifeAthleteOffer=offer;G.screen='lifeAthleteOffer';}
  }
  // Carrera de Vida en fase Entrenador: retiros, atleta extra y oferta de club se comprueban al
  // cerrar la temporada de Entrenador (doCoachNextSeason). Aquí estaban y no se llegaba nunca.
  // DS20 (v95): la crisis pisaba la pantalla que tocaba (workSetup o una oferta de
  // Carrera de Vida) y su botón mandaba al calendario vacío del año nuevo.
  const _nextScreen=G.screen;
  settleDebtSeason();   // T29b: pago mínimo + intereses, una sola vez por temporada
  // T29 (v86): la quiebra manda sobre cualquier pantalla de cierre de temporada.
  if(G.careerEnded)G.screen='careerEnd';
  else if(G._debtCrisisPending){G._debtCrisisPending=false;G._screenAfterCrisis=_nextScreen;G.screen='debtCrisis';}
  autoSave();render();
};

// ══════════════════════════════════════
//  CARRERA DE VIDA — CV-2: OFERTA DEL ATLETA
// ══════════════════════════════════════
function checkFirstAthleteOffer(){
  if(G.lifeAthlete)return null; // ya tiene atleta
  const yr=G.year; // ya incrementado
  // Umbrales por dificultad: [primeraOferta, probPorAño, garantizado]
  const cfg={
    facil:   {first:12, prob:0.30, sure:15},
    medio:   {first:10, prob:0.30, sure:13},
    dificil: {first:7,  prob:0.40, sure:10},
    hardcore:{first:5,  prob:0.50, sure:8},
  }[G.gameMode||'medio']||{first:10,prob:0.30,sure:13};
  if(yr < cfg.first) return null;
  const prob = yr >= cfg.sure ? 1.00 : cfg.prob;
  if(Math.random()>prob)return null;

  // Elegir atleta que no haya sido rechazado antes
  const rejectedIds=(G.lifePendingAthletes||[]).map(a=>a.id);
  const available=LIFE_ATHLETE_POOL.filter(a=>!rejectedIds.includes(a.id));
  if(!available.length)return null;
  const pick=available[Math.floor(Math.random()*available.length)];
  return {...pick, currentStats:{...pick.baseStats}};
}

function renderLifeAthleteOffer(){
  const el=$main();
  if(!el)return;
  hideChrome();
  const a=G.pendingLifeAthleteOffer;
  if(!a){G.screen=G.lifecyclePhase==='coach'?'coachHome':'workSetup';render();return;}

  const isUrgent=false; // filosofía: el juego informa, el jugador decide — sin presión
  const enCoach=G.lifecyclePhase==='coach';   // v96: la oferta también llega siendo ya entrenador
  const slotLibre=enCoach?coachFreeSlotIdx():-1;
  const potData=LIFE_POTENTIAL_LABEL[a.potential]||{label:a.potential,color:'#888',desc:''};
  const persData=PERSONALITY_LABEL[a.personality]||{label:a.personality,color:'#888',emoji:'⚫',desc:''};
  const specLabel={fondista:'Fondista',montanero:'Montañero',tecnico:'Técnico',todoterreno:'Todoterreno'}[a.spec]||a.spec;

  const introTexts={
    txus: `Después de la carrera, un chico con zapatillas viejas y calcetines de lana te espera en la zona de meta. Te ha visto correr. No sabe muy bien cómo pedirte lo que quiere pedirte.`,
    noa:  `La encuentras en la salida recogiendo dorsal para una carrera en la que no tienes nada que hacer. Te reconoce, se pone roja. Lleva semanas queriendo hablar contigo.`,
    kepa: `Un amigo en común te manda un vídeo: alguien subiendo un puerto en bici a un ritmo que no tiene sentido. Al día siguiente ese alguien te escribe por Instagram.`,
    celia:`Te la presentan en una charla de prevención de lesiones donde tú eras el ponente. Al terminar espera a que todo el mundo se vaya y te hace tres preguntas muy precisas.`,
    unai: `Su madre te llama. No él. Su madre. Te dice que su hijo necesita a alguien que entienda lo que pasó hace tres años. Tú no sabes lo que pasó.`,
    mireia:`Aparece en el entrenamiento de tu club local con una zapatilla de pista en cada pie. Dice que le han dicho que aquí entrenan corredores de monte.`,
  };
  const intro=introTexts[a.id]||`Alguien busca un entrenador. Alguien que sepa lo que es correr de verdad.`;

  el.innerHTML=`
    <div style="font-size:11px;font-weight:600;color:#aaa;letter-spacing:.5px;text-transform:uppercase;margin-bottom:16px">Año ${G.year} · Un momento inesperado</div>
    ${isUrgent?`<div class="warn" style="margin-bottom:16px">⚠ Llevas tiempo rechazando a gente. Este puede ser distinto.</div>`:''}
    <div class="card" style="margin-bottom:16px;border-left:3px solid #e0dfd8;padding-left:18px">
      <p style="font-size:15px;line-height:1.7;color:#1a1a1a;font-style:italic">"${intro}"</p>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div style="width:48px;height:48px;border-radius:50%;background:#f0ede8;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${a.flag}</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:700;margin-bottom:2px">${esc(a.name)}</div>
          <div style="font-size:13px;color:#888;margin-bottom:8px">${a.age} años · ${specLabel}</div>
          <p style="font-size:13px;color:#555;line-height:1.6;margin-bottom:10px">${esc(a.bio)}</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="font-size:12px;padding:2px 10px;border-radius:20px;background:#f5f4f0;color:${potData.color};font-weight:600">${potData.label}</span>
            <span style="font-size:12px;padding:2px 10px;border-radius:20px;background:#f5f4f0;color:#555">${persData.emoji} ${persData.label}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;background:#fafaf8">
      <div style="font-size:12px;font-weight:600;color:#888;margin-bottom:10px">Stats iniciales</div>
      ${['resistencia','velocidad','subida','bajada','nutricion','mental'].map(s=>`
        <div class="bar-row">
          <div class="bar-label">${s.charAt(0).toUpperCase()+s.slice(1)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${a.baseStats[s]}%;background:${a.baseStats[s]>=60?'#4a8a2a':a.baseStats[s]>=45?'#c07a10':'#c0392b'}"></div></div>
          <div class="bar-pct">${a.baseStats[s]}</div>
        </div>`).join('')}
    </div>

    <div style="font-size:13px;color:#888;margin-bottom:16px;line-height:1.6">
      ${enCoach?(slotLibre>=0?`Entraría en tu hueco ${slotLibre+1} de entrenamiento, junto a los atletas que ya llevas.`:'No tienes hueco libre: el 2.º se abre con reputación 40 y el 3.º con 70. Puedes decir que no; quizá vuelva a cruzarse contigo.'):'Aceptar implica dedicar horas a esta persona durante tus propias temporadas. No es gratis. Pero puede que merezca la pena.'}
    </div>

    ${enCoach&&slotLibre<0?'':`<button class="main" style="border-color:#4a8a2a;color:#2d5a1a" onclick="acceptLifeAthlete()">Acepto — quiero trabajar con ${esc(a.name.split(' ')[0])} →</button>`}
    ${(()=>{
      const limitYear={facil:15,medio:13,dificil:10,hardcore:8}[G.gameMode||'medio']||13;
      const forced=!enCoach&&G.year>=limitYear;
      return forced
        ? `<div class="warn" style="margin-top:10px">El cuerpo te lo pide. Ha llegado el momento de pasar el testigo.</div>`
        : `<button class="main" style="margin-top:8px;opacity:0.65" onclick="rejectLifeAthlete()">Ahora no — puede que aparezca alguien más adelante</button>`;
    })()}`;
}

window.acceptLifeAthlete=()=>{
  const a=G.pendingLifeAthleteOffer;
  if(!a)return;
  // v96 · Siendo ya entrenador, el atleta entra en un hueco libre con el fichaje de Entrenador.
  // Antes esto ponía lifecyclePhase='overlap': devolvía la partida a la fase de solapamiento.
  if(G.carreraVida&&G.lifecyclePhase==='coach'){
    const idx=coachFreeSlotIdx();
    if(idx<0){showToast('No tienes hueco libre para otro atleta','#c0392b');return;}
    G.pendingLifeAthleteOffer=null;
    addCoachSlot(idx);                   // guarda el slot actual y deja el nuevo vacío
    G.coachPool=[{...a,currentStats:{...(a.currentStats||a.baseStats)}}];
    showToast(`${a.name.split(' ')[0]} se une a tu equipo de entrenamiento.`,'#4a8a2a');
    doCoachSelect(a.id);
    return;
  }
  G.lifeAthlete={...a};
  G.lifecyclePhase='overlap';
  G.pendingLifeAthleteOffer=null;
  G.coachReputation=(G.coachReputation||0)+10;
  showToast(`${a.name.split(' ')[0]} confía en ti. Empieza el solapamiento.`,'#4a8a2a');
  G.screen='overlapHub';
  autoSave();render();
};

window.rejectLifeAthlete=()=>{
  const a=G.pendingLifeAthleteOffer;
  if(!a)return;
  if(!G.lifePendingAthletes)G.lifePendingAthletes=[];
  G.lifePendingAthletes.push({...a});
  G.lifeAthleteOfferCount=(G.lifeAthleteOfferCount||0)+1;
  G.pendingLifeAthleteOffer=null;
  const enCoach=G.lifecyclePhase==='coach';   // v96: siendo entrenador, de vuelta a tu hub
  showToast(enCoach?'Sigues con tus atletas. Quizás vuelva a cruzarse contigo.':'Sigues con tus carreras. Quizás llegue alguien más adelante.','#888');
  G.screen=enCoach?'coachHome':'workSetup';
  autoSave();render();
};
function renderOverlapHub(){
  const el=$main();
  if(!el)return;
  hideChrome();
  const a=G.lifeAthlete;
  const athleteName=a?esc(a.name):'tu atleta';
  const athleteFirst=a?esc(a.name.split(' ')[0]):'el atleta';
  el.innerHTML=`
    <div style="font-size:11px;font-weight:600;color:#aaa;letter-spacing:.5px;text-transform:uppercase;margin-bottom:20px">Año ${G.year} · Solapamiento</div>
    <h2 style="margin-bottom:6px">¿Qué haces hoy?</h2>
    <p class="sub" style="margin-bottom:24px">Puedes seguir con tu carrera o gestionar a ${athleteFirst}. Tú decides.</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
      <div onclick="goToRunnerFromOverlap()" style="background:#fff;border:1.5px solid #e0dfd8;border-radius:12px;padding:20px 16px;cursor:pointer;transition:background .15s" onmouseenter="this.style.background='#f8f7f3'" onmouseleave="this.style.background='#fff'">
        <div style="font-size:28px;margin-bottom:10px">🏃</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">Seguir corriendo</div>
        <div style="font-size:12px;color:#888;line-height:1.5">Temporada ${G.year} · ${esc(G.runner?.specialty||'')}<br>${G.selectedRaces?.length?G.selectedRaces.length+' carrera'+(G.selectedRaces.length!==1?'s':'')+' en calendario':'Sin carreras aún'}</div>
      </div>
      <div onclick="goToCoachFromOverlap()" style="background:#fff;border:1.5px solid #e0dfd8;border-radius:12px;padding:20px 16px;cursor:pointer;transition:background .15s" onmouseenter="this.style.background='#f8f7f3'" onmouseleave="this.style.background='#fff'">
        <div style="font-size:28px;margin-bottom:10px">📋</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">Entrenador</div>
        <div style="font-size:12px;color:#888;line-height:1.5">${athleteName}<br>${a?`${a.age} años · ${esc(a.spec)}`:'Pendiente de asignar'}</div>
      </div>
    </div>

    ${G.lifeAthleteHours>0?`<div class="note" style="font-size:13px">Esta temporada dedicas <strong>${G.lifeAthleteHours}h a la semana</strong> a ${athleteFirst}: tu entrenamiento rinde al ${Math.round(lifeAthleteEffMult(G.lifeAthleteHours)*100)} % y, al cerrar la temporada, ${athleteFirst} ganará +1 en ${lifeAthleteSeasonGain(G.lifeAthleteHours)} stat${lifeAthleteSeasonGain(G.lifeAthleteHours)>1?'s':''}.</div>`:`<div class="hint" style="font-size:13px">Aún no has dedicado horas a ${athleteFirst} esta temporada. Puedes hacerlo desde el bloque de entrenamiento.</div>`}
    <div class="hint" style="font-size:13px;margin-top:8px">🏁 Cuando cierres esta temporada, en el balance podrás <strong>dejar la competición</strong> y entrenar a ${athleteFirst} a tiempo completo.</div>`;
}

window.goToCoachFromOverlap=()=>{
  if(!G.lifeAthlete){showToast('Sin atleta asignado todavía','#c0392b');return;}
  if(!G.coachAthlete)G.coachAthlete={...G.lifeAthlete};
  if(!Array.isArray(G.coachRoster))G.coachRoster=[];
  if(!Array.isArray(G.coachSelectedRaces))G.coachSelectedRaces=[];
  if(!Array.isArray(G.coachRaceResults))G.coachRaceResults=[];
  if(G.coachRaceIdx==null)G.coachRaceIdx=0;
  if(G.coachSeason==null)G.coachSeason=1;
  G.screen='coachHome';render();
};

function forceAbandonCoachRace(){
  const data=G.coachRaceData;
  if(data){
    if(!Array.isArray(G.coachRaceResults))G.coachRaceResults=[];
    G.coachRaceResults.push({pos:null,dnf:true,dnfReason:'abandono',prize:0,coachCut:0,raceName:data.race?.name||''}); // T45 (v89)
    G.coachTrust=Math.max(0,Math.min(100,(G.coachTrust||50)-5));
    G.coachBodyLoad=Math.max(0,(G.coachBodyLoad||0)-8);
    G.coachRaceIdx=(G.coachRaceIdx||0)+1;
  }
  clearCoachRaceTimer();clearCoachRadioPause();G.coachRadioWindowOpen=false;
}

window.switchOverlapMode=()=>{
  if(!(G.carreraVida&&G.lifecyclePhase==='overlap'&&G.lifeAthlete))return;
  const onCoachSide=G.screen.startsWith('coach');
  const midRace=onCoachSide
    ?['coachRace','coachEvent'].includes(G.screen)
    :['segment','aid','midRaceEvent'].includes(G.screen);
  if(midRace){
    if(!confirm('Vas a abandonar esta carrera y quedarás último (DNF). ¿Seguro que quieres cambiar de modo ahora?'))return;
    if(onCoachSide)forceAbandonCoachRace();
    else{doAbandonConfirmed();afterRace();}
  }
  if(onCoachSide){goToRunnerFromOverlap();return;}
  if(G.screen!=='overlapHub')G.overlapRunnerScreen=G.screen;
  goToCoachFromOverlap();
  autoSave();
};

// v96 · Solapamiento: la pantalla del corredor a la que se vuelve desde Entrenador.
// Antes se volvía siempre a 'workSetup', el arranque de temporada, y desde ahí
// «¡Empezar temporada!» vaciaba raceResults y ponía currentRaceIdx a 0: con la
// temporada a medias, las carreras ya corridas se volvían a correr y careerHistory
// las contaba dos veces. Se guarda la pantalla al salir (overlapRunnerScreen se
// persiste, y loadSlot() la rellena al mandar al hub) y, si no hay ninguna válida,
// se deduce del estado de la temporada.
function overlapRunnerScreen(){
  const s=G.overlapRunnerScreen;
  if(s&&!s.startsWith('coach')&&!['segment','aid','midRaceEvent','overlapHub'].includes(s))return s;
  const done=(G.raceResults||[]).length,idx=G.currentRaceIdx||0;
  if(done>idx)return 'raceResult';   // la carrera en curso ya tiene resultado: falta afterRace()
  if(done>0||idx>0)return G.pendingEvent?'betweenRace':'preRacePrep';
  return 'workSetup';
}
window.goToRunnerFromOverlap=()=>{
  G.screen=overlapRunnerScreen();
  G.overlapRunnerScreen=null;
  autoSave();render();
};

function generateDiaryEntry(yearNet){
  // T45 (v89): `wins` no filtraba DNF — inofensivo con pos:0, pero ahora los
  // tres recuentos salen de la misma función y no pueden divergir.
  const _fin=finishedResults(G.raceResults);
  const racesRun=_fin.length;
  const wins=_fin.filter(r=>r.pos===1).length;
  const best=_fin.slice().sort((a,b)=>a.pos-b.pos)[0];
  const injuries=(G.injuryHistory||[]).filter(i=>i.year===G.year);
  const sentences=[];

  if(G.year===1)sentences.push(`Primera temporada completa.`);
  else if(wins>1)sentences.push(`Una temporada brillante: ${wins} victorias.`);
  else if(wins===1)sentences.push(`Una temporada para recordar.`);
  else if(racesRun===0)sentences.push(`Un año difícil, sin poder competir.`);
  else sentences.push(`${racesRun} carrera${racesRun!==1?'s':''} disputada${racesRun!==1?'s':''}.`);

  if(best){
    if(best.pos===1)sentences.push(`Victoria en ${best.name}.`);
    else if(best.pos<=3)sentences.push(`Podio en ${best.name} (${best.pos}º).`);
    else if(best.pos<=10)sentences.push(`Top 10 en ${best.name} (${best.pos}º).`);
    else sentences.push(`${best.name}, ${best.pos}º puesto.`);
  }

  if(injuries.length>0)sentences.push(`La ${injuries[0].label.toLowerCase()} en ${injuries[0].race} fue el golpe más duro.`);
  else if(racesRun>0)sentences.push(`Temporada sin lesiones graves.`);

  if(yearNet>500)sentences.push(`Balance positivo: +€${yearNet}.`);
  else if(yearNet<-300)sentences.push(`Año duro en lo económico: €${yearNet}.`);

  const ad=agingDeg();
  if(ad>=0.16)sentences.push(`A los ${G.runner.age} años el cuerpo ya avisa — hay que escucharlo.`);
  else if(ad>0)sentences.push(`Con ${G.runner.age} años el monte se gana igual, pero cuesta un poco más.`);

  if(!G.seasonDiary)G.seasonDiary=[];
  G.seasonDiary.push({
    year:G.year, age:(G.runner.age||25),
    text:sentences.join(' '),
    highlight:best?`${best.pos}º · ${best.name}`:(racesRun===0?'Sin carreras':`${racesRun} carrera${racesRun!==1?'s':''}`),
    yearNet, races:racesRun, wins, injuries:injuries.length
  });
}

// ══════════════════════════════════════
//  SISTEMA DE EDAD Y RETIRADA
// ══════════════════════════════════════
function applyAgingPenalties(){
  const age=G.runner.age||25;
  if(age<42)return;
  const degradStats=['resistencia','velocidad','subida','bajada'];
  const pick=()=>degradStats[Math.floor(Math.random()*degradStats.length)];
  const count=age>=46?2:1;
  // Multiplicador post-límite: el cuerpo se degrada más rápido tras el año límite
  let mult=1;
  if(G.carreraVida&&G.lifecyclePhase==='overlap'){
    const limitYear={facil:15,medio:13,dificil:10,hardcore:8}[G.gameMode||'medio']||13;
    const seasonsOver=G.year-limitYear;
    if(seasonsOver>=5)mult=4.0;
    else if(seasonsOver>=3)mult=2.5;
    else if(seasonsOver>=1)mult=1.5;
  }
  const totalHits=Math.round(count*mult);
  for(let i=0;i<totalHits;i++){
    const k=pick();
    G.runner.stats[k]=Math.max(10,(G.runner.stats[k]||50)-1);
  }
  // Aviso pasivo si la degradación ya es notable
  if(mult>=2.5){
    const msgs=['Las bajadas ya no salen solas.','El cuerpo tarda más en recuperar.','Necesitas el doble de tiempo para recuperarte.','Las piernas ya no responden igual.'];
    showToast(msgs[Math.floor(Math.random()*msgs.length)],'#c07a10');
  }
}

// Factor de degradación por edad: 0.0 a ~0.50 (4% por año desde los 42)
function agingDeg(){
  const age=G.runner.age||25;
  return Math.max(0,Math.min(0.50,(age-42)*0.04));
}

// Categorías de edad estándar en trail running español
function getAgeCategory(age){
  if(age<23) return {id:'sub23',   label:'Sub-23'};
  if(age<40) return {id:'senior',  label:'Sénior'};
  if(age<50) return {id:'master_a',label:'Máster A (M40)'};
  if(age<60) return {id:'master_b',label:'Máster B (M50)'};
  return      {id:'master_c',      label:'Máster C (M60+)'};
}

window.doRetire=()=>{
  if(G.carreraVida&&(G.lifecyclePhase==='runner'||G.lifecyclePhase==='overlap')){
    G._retireYear=G.year;
    G.screen='lifeRetirement';render();return;
  }
  G._retireYear=G.year;
  G.screen='retirement';render();
};

function checkClubOffer(){
  if(!G.carreraVida||G.lifecyclePhase!=='coach')return;
  if(G._clubOfferSeen)return;
  if((G.coachReputation||0)<60)return;
  if((G.coachSeason||1)<3)return;
  if(G._clubOfferDelay&&(G.coachSeason||1)<G._clubOfferDelay)return;
  G._coachClubOfferReceived=true; // CR-38 (v76): logro coach_club_offer
  checkAndUnlockAchievements();
  G.screen='clubOffer';
}

function renderClubOffer(){
  const el=$main();
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';
  const isReturn=(G._clubOfferDelay>0); // segunda vez que aparece
  const cost=Math.round((G.money||0)*0.6);
  const athlete=G.coachAthlete;
  const athleteName=athlete?esc(athlete.name.split(' ')[0]):'tu atleta';

  const introText=isReturn
    ? `La oferta vuelve. Siguen creyendo en ti. La inversión inicial no ha cambiado — si acaso, la oportunidad es más clara que antes.`
    : `Suena el teléfono un martes por la mañana. Al otro lado, alguien que gestiona un club de trail en el Pirineo. Llevan tiempo siguiendo tu trabajo con ${athleteName}. Quieren que lo lleves al siguiente nivel. Quieren que lo lleves tú.`;

  const coachSeasons=G.coachSeason||1;
  const rosterCount=(G.coachRoster||[]).filter(s=>s&&s.coachAthlete).length;

  el.innerHTML=`
    <div style="font-size:11px;font-weight:600;color:#aaa;letter-spacing:.5px;text-transform:uppercase;margin-bottom:20px">Temporada ${coachSeasons} como entrenador · Una llamada inesperada</div>

    <div class="card" style="margin-bottom:16px;border-left:3px solid #1D9E75;padding-left:18px">
      <p style="font-size:15px;line-height:1.7;color:#1a1a1a;font-style:italic">"${introText}"</p>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">La propuesta</div>
      <div class="fin-row"><span>Inversión inicial (60% de tus ahorros)</span><span class="minus">-€${cost.toLocaleString('es-ES')}</span></div>
      <div class="fin-row"><span>Tus ahorros actuales</span><span>€${(G.money||0).toLocaleString('es-ES')}</span></div>
      <div class="fin-row"><span>Después de la inversión</span><span style="font-weight:600">€${Math.max(0,(G.money||0)-cost).toLocaleString('es-ES')}</span></div>
      <div class="fin-row" style="border-top:1px solid #e0dfd8;margin-top:6px;padding-top:10px"><span>Reputación como entrenador</span><span style="color:#2d7a2d;font-weight:600">${G.coachReputation||0}/100</span></div>
      ${rosterCount>1?`<div class="fin-row"><span>Atletas en cartera</span><span>${rosterCount}</span></div>`:''}
    </div>

    <div class="card" style="margin-bottom:16px;background:#E1F5EE;border-color:#9FE1CB">
      <div style="font-size:13px;color:#085041;line-height:1.6">
        <strong>Lo que ganas:</strong> acceso a instalaciones, plantilla de corredores ya formada, sponsors de club y competición por equipos.<br>
        <strong>Lo que dejas:</strong> la gestión uno a uno. El club es otra escala.
      </div>
    </div>

    <button class="main" style="border-color:#1D9E75;color:#085041" onclick="confirmClubOffer()">Acepto — monto el club →</button>
    <button class="main" style="margin-top:8px;opacity:0.65" onclick="rejectClubOffer()">Ahora no — sigo solo con mis atletas</button>`;
}

// v96 · Aceptar la oferta lleva a la fundación completa —nombre, especialidad, filosofía y
// arquetipo—, precargada. Antes el club nacía con filosofía montañero y arquetipo equilibrado
// fijos. La fundación la cierra doClubCreate(), que llama a applyLifeClubFounding().
window.confirmClubOffer=()=>{
  const athlete=G.coachAthlete;
  G._clubFromLife=true;
  G._clubNameDraft=`Club Trail ${G.runner?.name?.split(' ').slice(-1)[0]||'Monte Perdido'}`;
  G._clubSpecDraft=['montanero','fondista','tecnico'].includes(athlete?.spec)?athlete.spec:'mixto';   // «todoterreno» no es especialidad de club
  G._clubFilDraft='montanero';G._clubArqDraft='equilibrado';
  G.screen='clubCreate';
  autoSave();render();
};

// Lo propio de fundar el club desde Carrera de Vida, sobre el clubModeData recién creado.
function applyLifeClubFounding(){
  const cost=Math.round((G.money||0)*0.6);
  G.money=Math.max(0,(G.money||0)-cost);
  G.lifecyclePhase='club';
  G._clubOfferSeen=true;
  const athlete=G.coachAthlete;
  // Heredar trayectoria como entrenador como bonus de reputación de club (70% de coachReputation)
  const coachingYears=(G.coachSeason||1);
  const coachRep=(G.coachReputation||0);
  const repSeeding=Math.floor(coachRep*0.7);
  G.clubModeData.reputacion=Math.min(100,10+repSeeding);
  G.clubModeData._coachingHistory={years:coachingYears,coachReputation:coachRep};
  // El atleta actual pasa a la plantilla del club, como capitán (y único: el arquetipo ya traía uno)
  if(athlete){
    G.clubModeData.plantilla.forEach(r=>{if(r.role==='capitan')r.role='normal';});
    const clubRunner={
      id:athlete.id||'life_athlete',
      name:athlete.name, flag:athlete.flag||'🇪🇸', spec:athlete.spec||'fondista',
      stats:{...((athlete.currentStats||athlete.baseStats)||{})},
      salary:athlete.monthlyFee||200, currentSalary:athlete.monthlyFee||200, role:'capitan',
    };
    G.clubModeData.plantilla.unshift(clubRunner);
  }
  // Desbloquear modo club en localStorage
  try{
    let ul={};try{ul=JSON.parse(LS.get('unlocked')||'{}');}catch(_e){}
    ul.club=true;
    LS.set('unlocked',JSON.stringify(ul));
  }catch(e){}
  showToast('El club nace. Una nueva etapa empieza.','#1D9E75');
}

function renderClubIntro(){
  const el=$main();
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';

  const d=G.clubModeData;
  const clubName=d?d.name:'Tu Club';
  const clubSpec=d?d.specialty:'mixto';
  const clubFil=d?d.filosofia:'montanero';

  // Historial de coaching
  const coachingYears=(d&&d._coachingHistory?d._coachingHistory.years:G.coachSeason||1);
  const coachRep=(d&&d._coachingHistory?d._coachingHistory.coachReputation:G.coachReputation||0);

  const specLabel={montanero:'🏔️ Montaña',fondista:'🏃 Fondo',tecnico:'⚡ Técnico',mixto:'🌐 Mixto'}[clubSpec]||clubSpec;
  const filData=d?CLUB_FILOSOFIAS[clubFil]:null;

  el.innerHTML=`
    <div style="text-align:center;padding:20px 0 10px">
      <div style="font-size:36px;margin-bottom:8px">🏕️</div>
      <h1 style="font-size:22px;margin-bottom:4px">Nace un club</h1>
      <p style="font-size:14px;color:#888">Año ${G.year} · Una nueva era empieza</p>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:3px solid #8B6F47;padding-left:18px;background:#F5EFE3">
      <div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:12px">Tu historial como entrenador</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:#fff;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:12px;color:#888">Años entrenando</div>
          <div style="font-size:18px;font-weight:700">${coachingYears}</div>
        </div>
        <div style="background:#fff;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:12px;color:#888">Reputación alcanzada</div>
          <div style="font-size:18px;font-weight:700">${coachRep}/100</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:3px solid #1D9E75;padding-left:18px;background:#E1F5EE">
      <div style="font-size:11px;font-weight:600;color:#085041;text-transform:uppercase;margin-bottom:12px">Tu club</div>
      <div style="font-weight:600;font-size:15px;color:#085041;margin-bottom:6px">${esc(clubName)}</div>
      <div style="font-size:12px;color:#1D9E75;margin-bottom:8px">
        Especialidad: <strong>${specLabel}</strong><br>
        ${filData?`Filosofía: <strong>${filData.label}</strong>`:''}
      </div>
      <div style="font-size:12px;background:#fff;border-radius:6px;padding:8px;color:#666">
        ${filData?filData.desc:'Gestión flexible del club.'}
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;background:#f8f7f3">
      <div style="font-size:14px;line-height:1.7;color:#1a1a1a">
        <p><strong>Tu experiencia como entrenador te ha preparado para esto.</strong> Ahora gestionas un equipo completo. Plantilla, sponsors, instalaciones, objetivos. El monte te enseñó como corredor. Tus atletas te enseñaron como entrenador. Ahora el club es tuyo.</p>
      </div>
    </div>

    <button class="main" style="border-color:#1D9E75;color:#085041;width:100%" onclick="G.screen='clubHub';G.activeTab='game';autoSave();render()">Fundar el club →</button>
  `;
}

window.rejectClubOffer=()=>{
  G._clubOfferDelay=(G.coachSeason||1)+2;
  showToast('Les dices que no de momento. Volverán a llamar.','#888');
  G.screen='coachHome';
  autoSave();render();
};

function checkRivalRetirements(){
  if(!G.carreraVida||G.lifecyclePhase!=='coach')return;
  if(!G.rivalRetirements)G.rivalRetirements={};
  if(!G.rivalChildren)G.rivalChildren=[];
  const retiredIds=Object.keys(G.rivalRetirements);
  RIVALS_POOL.forEach(r=>{
    if(retiredIds.includes(r.name))return;
    // Rivales de nivel tier 1-2 con más años de carrera
    if(r.tier>2)return;
    if(Math.random()>0.25)return;
    // Se retira — crear un "hijo"
    const lastName=r.name.split(' ').slice(-1)[0];
    const childNames=['Alex','Iker','Jon','Mikel','Ander','Unai','Gorka','Aitor'];
    const childFirst=childNames[Math.floor(Math.random()*childNames.length)];
    const child={
      name:`${childFirst} ${lastName}`,
      flag:r.flag, spec:r.spec,
      parentName:r.name, parentWins:Math.floor(Math.random()*5)+1,
      baseStats:{
        resistencia:Math.round(50+Math.random()*20),
        velocidad:Math.round(45+Math.random()*20),
        subida:Math.round(48+Math.random()*22),
        bajada:Math.round(45+Math.random()*20),
        nutricion:Math.round(35+Math.random()*25),
        mental:Math.round(40+Math.random()*25),
      }
    };
    G.rivalRetirements[r.name]={season:G.coachSeason||1,child};
    G.rivalChildren.push(child);
    // Entrada en diario
    G.seasonDiary=G.seasonDiary||[];
    // T24 (v88): mismo caso — era una cadena en un array de objetos.
    G.seasonDiary.push({
      year:G.year, age:G.runner.age||25,
      text:`${r.name} se retira. Su ${childFirst} ya corre por los montes.`,
      highlight:'Relevo generacional',
    });
  });
}

function checkLifeExtraAthlete(){
  if(!G.carreraVida||G.lifecyclePhase!=='coach')return;
  if((G.coachSeason||1)%2!==0)return; // cada 2 temporadas
  if(Math.random()>0.40)return;
  const usedIds=[
    ...(G.coachAthleteHistory||[]).map(a=>a.id),
    G.coachAthlete?.id,
    ...(G.coachRoster||[]).map(s=>s&&s.coachAthlete&&s.coachAthlete.id),   // v96: tampoco los de otros huecos
  ].filter(Boolean);
  const usedNames=(G.coachAthleteHistory||[]).map(a=>a.name);   // el historial guarda el nombre, no el id
  const available=LIFE_EXTRA_ATHLETES.filter(a=>!usedIds.includes(a.id)&&!usedNames.includes(a.name));
  if(!available.length)return;
  const pick=available[Math.floor(Math.random()*available.length)];
  G.pendingLifeAthleteOffer={...pick,currentStats:{...pick.baseStats}};
  G.screen='lifeAthleteOffer';
}

// ══════════════════════════════════════
//  CARRERA DE VIDA — CV-4: TRANSICIÓN AL RETIRO
function renderLifeRetirement(){
  const el=$main();
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';

  const totalRaces=finishedResults(G.careerHistory).length;   // v96: sin los DNF
  const totalWins=finishedResults(G.careerHistory).filter(r=>r.pos===1).length;
  const totalPodiums=finishedResults(G.careerHistory).filter(r=>r.pos<=3).length;
  const totalPrize=G.careerHistory.reduce((a,r)=>a+(r.prize||0),0);
  const yearsActive=G.year-1;
  const age=G.runner.age||25;
  const name=esc(G.runner.name||'El corredor');
  const modeLabel=modeLabelOf(G.gameMode);   // T54 (v93)

  let legacy='';
  if(totalWins>=10)legacy='Una carrera de élite. Tu nombre queda grabado en la historia del trail.';
  else if(totalWins>=5)legacy='Varios triunfos y una trayectoria que el circuito recordará.';
  else if(totalWins>=1)legacy='Al menos una victoria. Eso no te lo quita nadie.';
  else if(G.ranking<100)legacy='Llegaste a las puertas de la élite. Una carrera respetable.';
  else if(totalRaces>=15)legacy='Años de kilómetros y esfuerzo. El monte siempre te esperó.';
  else legacy='Cada carrera fue un paso adelante. El trail es así de personal.';

  const a=G.lifeAthlete;
  const athleteFirst=a?esc(a.name.split(' ')[0]):null;

  // Texto narrativo de transición según si tiene atleta o no
  const transitionText=a
    ? `El cuerpo ha dado todo lo que tenía. ${athleteFirst} sale en pocas semanas al Monte Perdido. Todavía tienes trabajo pendiente, pero de otro tipo.`
    : `El cuerpo ha dado todo lo que tenía. Hay gente joven ahí fuera que necesita a alguien que entienda lo que es correr de verdad. Alguien como tú.`;

  const btnText=a
    ? `Continuar como entrenador de ${athleteFirst} →`
    : `Buscar un atleta y continuar como entrenador →`;

  el.innerHTML=`
    <div style="text-align:center;padding:20px 0 10px">
      <div style="font-size:36px;margin-bottom:8px">🏔</div>
      <h1 style="font-size:22px;margin-bottom:4px">Fin de la carrera deportiva</h1>
      <p style="font-size:14px;color:#888">${name} · ${age} años · ${modeLabel}</p>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title">Trayectoria completa</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[['Temporadas',yearsActive],['Ranking final','#'+G.ranking],['Carreras',totalRaces],['Victorias',totalWins],['Podios',totalPodiums],['Premios','€'+totalPrize]].map(([l,v])=>`
          <div style="background:#f5f4f0;border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:12px;color:#aaa;margin-bottom:3px">${l}</div>
            <div style="font-size:17px;font-weight:700">${v}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="note" style="font-size:14px;line-height:1.75;margin-bottom:16px"><strong>Legado:</strong> ${legacy}</div>

    <div style="border-top:1px solid #e8e6e0;margin-bottom:20px;padding-top:20px">
      <div class="card" style="border-left:3px solid #534AB7;padding-left:18px;margin-bottom:16px">
        <p style="font-size:15px;line-height:1.7;color:#1a1a1a;font-style:italic">"${transitionText}"</p>
      </div>
      ${a?`
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#EEEDFE;border-radius:10px;margin-bottom:16px">
          <div style="font-size:24px">${a.flag}</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#3C3489">${esc(a.name)}</div>
            <div style="font-size:12px;color:#534AB7">${a.age} años · ${a.spec} · ${LIFE_POTENTIAL_LABEL[a.potential]?.label||''}</div>
          </div>
        </div>`:''}
      <button class="main" style="border-color:#534AB7;color:#3C3489" onclick="confirmLifeCoachTransition()">
        ${btnText}
      </button>
      <button class="main" style="margin-top:8px;opacity:0.55" onclick="G=freshState();render()">Nueva partida desde cero</button>
    </div>`;
}

window.confirmLifeCoachTransition=()=>{
  // Si no tiene atleta, necesita elegir uno — mostrar la oferta
  if(!G.lifeAthlete){
    const available=LIFE_ATHLETE_POOL.filter(a=>
      !(G.lifePendingAthletes||[]).map(x=>x.id).includes(a.id)
    );
    const pick=available.length?available[Math.floor(Math.random()*available.length)]:LIFE_ATHLETE_POOL[0];
    G.pendingLifeAthleteOffer={...pick,currentStats:{...pick.baseStats}};
    G.screen='lifeAthleteOffer';render();return;
  }
  // Tiene atleta — transición directa a entrenador
  G.lifecyclePhase='coach';
  // v96: en el solapamiento ya lo entrenabas como G.coachAthlete; copiar G.lifeAthlete encima
  // borraba todo lo trabajado en el lado Entrenador.
  if(!G.coachAthlete||G.coachAthlete.id!==G.lifeAthlete.id)G.coachAthlete={...G.lifeAthlete};

  // Heredar logros de fame de Clásico como bonus de reputación inicial
  let repBonus=0;
  if((G.unlockedAchievements||[]).includes('fame_1k'))repBonus+=10;
  if((G.unlockedAchievements||[]).includes('fame_10k'))repBonus+=15;
  if((G.unlockedAchievements||[]).includes('followers_25k'))repBonus+=20;
  if((G.unlockedAchievements||[]).includes('followers_50k'))repBonus+=25;

  G.coachReputation=Math.min(100,(G.coachReputation||0)+repBonus);
  G.coachSeason=G.coachSeason||1;
  G.coachTrust=60;
  G.coachEmotionalState='fresco';
  G.coachBodyLoad=0;
  G.coachRaceResults=[];
  G.coachSelectedRaces=[];
  G.coachRaceIdx=0;
  // Desbloquear modo entrenador en localStorage
  try{
    let ul={};try{ul=JSON.parse(LS.get('unlocked')||'{}');}catch(_e){}
    ul.coach=true;
    LS.set('unlocked',JSON.stringify(ul));
  }catch(e){}
  showToast(`${G.lifeAthlete.name.split(' ')[0]} te espera. Empieza una nueva etapa.`,'#534AB7');
  G.screen='coachIntro';
  autoSave();render();
};

function renderCoachIntro(){
  const el=$main();
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';

  const a=G.lifeAthlete;
  const athleteName=a?esc(a.name.split(' ')[0]):'tu atleta';
  const athleteAge=a?a.age:'joven';
  const athleteSpec=a?a.spec:'todoterreno';

  // Legado de Clásico
  const totalRaces=finishedResults(G.careerHistory).length;   // v96: sin los DNF
  const totalWins=finishedResults(G.careerHistory).filter(r=>r.pos===1).length;
  const topRanking=G.ranking||999;
  const totalPrize=(G.careerHistory||[]).reduce((a,r)=>a+(r.prize||0),0);
  const yearsActive=G.year-1;

  el.innerHTML=`
    <div style="text-align:center;padding:20px 0 10px">
      <div style="font-size:36px;margin-bottom:8px">📋</div>
      <h1 style="font-size:22px;margin-bottom:4px">Nuevo rol: Entrenador</h1>
      <p style="font-size:14px;color:#888">Año ${G.year} · Tu próximo capítulo comienza</p>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:3px solid #8B6F47;padding-left:18px;background:#F5EFE3">
      <div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:12px">Tu legado como corredor</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:#fff;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:12px;color:#888">Temporadas</div>
          <div style="font-size:18px;font-weight:700">${yearsActive}</div>
        </div>
        <div style="background:#fff;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:12px;color:#888">Carreras</div>
          <div style="font-size:18px;font-weight:700">${totalRaces}</div>
        </div>
        <div style="background:#fff;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:12px;color:#888">Victorias</div>
          <div style="font-size:18px;font-weight:700">${totalWins}</div>
        </div>
        <div style="background:#fff;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:12px;color:#888">Ranking mejor</div>
          <div style="font-size:18px;font-weight:700">#${topRanking}</div>
        </div>
        <div style="background:#fff;border-radius:8px;padding:10px;text-align:center;grid-column:1/-1">
          <div style="font-size:12px;color:#888">Premios ganados</div>
          <div style="font-size:18px;font-weight:700">€${totalPrize.toLocaleString('es-ES')}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;border-left:3px solid #1D9E75;padding-left:18px;background:#E1F5EE">
      <div style="font-size:11px;font-weight:600;color:#085041;text-transform:uppercase;margin-bottom:12px">Tu atleta</div>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="font-size:28px">${a?a.flag:'🇪🇸'}</div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#085041">${athleteName}</div>
          <div style="font-size:12px;color:#1D9E75">${athleteAge} años · ${athleteSpec}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;background:#f8f7f3">
      <div style="font-size:14px;line-height:1.7;color:#1a1a1a">
        <p><strong>${athleteName} ha estado contigo en el solapamiento.</strong> Ahora empieza una nueva etapa: lo guiarás como su entrenador. Entrenamientos, carreras, su desarrollo. El monte te enseñó. Ahora es tu turno de enseñar.</p>
      </div>
    </div>

    <button class="main" style="border-color:#534AB7;color:#3C3489;width:100%" onclick="G.screen='coachHome';G.activeTab='game';autoSave();render()">Comenzar como entrenador →</button>
  `;
}

// T29b (v87): panel de deuda con amortización voluntaria. Se pinta en «Entre
// carreras» y en Finanzas para que la deuda sea una decisión recurrente.
function debtPanel(){
  if((G.debt||0)<=0)return '';
  const cfg=modeCfg().bankruptcy||{interest:0.12,minPay:0.25};
  const frozen=!!G.forcedFullTime;
  const nextInt=frozen?0:Math.round(G.debt*(cfg.interest||0.12));
  const btn=(lbl,val,dis)=>`<button class="main" style="margin-top:0;${dis?'opacity:.4;pointer-events:none':''}" onclick="doPayDebt(${val})">${lbl}</button>`;
  return `
    <div class="danger" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <strong>Deuda pendiente</strong><strong>€${G.debt}</strong>
      </div>
      <div style="font-size:12px;margin-top:4px">
        ${frozen
          ?'Intereses congelados mientras estés a jornada completa. Todo lo que ganes va aquí.'
          :`Al cerrar la temporada se amortiza el ${Math.round((cfg.minPay??0.25)*100)}% de tu saldo y el resto genera <strong>€${nextInt}</strong> de intereses (${Math.round((cfg.interest||0.12)*100)}%).`}
      </div>
    </div>
    ${frozen?'':`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:14px">
      ${btn('−€100',100,(G.money||0)<100)}
      ${btn('−€500',500,(G.money||0)<500)}
      ${btn('Todo',"'all'",(G.money||0)<=0)}
    </div>`}`;
}

// T29 (v86) — escalón 2: vuelta forzosa a jornada completa.
function renderDebtCrisis(){
  const el=$main();
  hideChrome();
  const cfg=modeCfg().bankruptcy||{soft:500,hard:null};
  el.innerHTML=`
    <div style="text-align:center;padding:18px 0 14px">
      <div style="font-size:32px;margin-bottom:6px">📉</div>
      <h2>No llegas</h2>
      <p class="sub">Temporada ${G.year}</p>
    </div>
    <div class="danger" style="margin-bottom:14px">
      Debes <strong>€${G.debt}</strong>. Has tenido que volver a jornada completa
      y cancelar el staff que tenías contratado.
    </div>
    <p style="font-size:14px;line-height:1.55;margin-bottom:14px">
      El alquiler no espera. Vuelves al turno de siempre y entrenas con lo que
      sobra, que es poco. Cada euro que entre irá a la deuda antes que a tu
      bolsillo. Cuando esté saldada, volverás a elegir tu jornada.
    </p>
    ${cfg.hard!=null?`<div class="note" style="margin-bottom:14px">Si la deuda llega a <strong>€${cfg.hard}</strong> estando ya a jornada completa, la carrera deportiva se acaba.</div>`:''}
    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="G.screen=G._screenAfterCrisis||'workSetup';G._screenAfterCrisis=null;render()">Seguir adelante →</button>`;
}

// T29 (v86) — escalón 3: la partida queda visitable pero no jugable.
function renderCareerEnd(){
  const el=$main();
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';
  const hist=finishedResults(G.careerHistory);   // v96: sin los DNF
  const totalWins=hist.filter(r=>r.pos===1).length;
  const totalPodiums=hist.filter(r=>r.pos<=3).length;
  const modeLabel=modeLabelOf(G.gameMode);   // T54 (v93)
  const motivo=G.careerEnded==='bankruptcy'
    ?'Las deudas pudieron con el proyecto. Trabajando a jornada completa y sin margen para entrenar, no había forma de remontar.'
    :'La carrera deportiva ha terminado.';
  el.innerHTML=`
    <div style="text-align:center;padding:20px 0 10px">
      <div style="font-size:36px;margin-bottom:8px">📉</div>
      <h1 style="font-size:22px;margin-bottom:4px">Se acabó</h1>
      <p style="font-size:14px;color:#888">${esc(G.runner.name||'El corredor')} · ${G.runner.age||25} años · ${modeLabel}</p>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="sec-title">Trayectoria</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[['Temporadas',Math.max(0,G.year-1)],['Ranking final',G.ranking<900?'#'+G.ranking:'—'],
           ['Carreras',hist.length],['Victorias',totalWins],['Podios',totalPodiums],
           ['Km totales',Math.round(G.totalCareerKm||0)+' km']].map(([l,v])=>`
          <div style="background:#f5f4f0;border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:12px;color:#aaa;margin-bottom:3px">${l}</div>
            <div style="font-size:17px;font-weight:700">${v}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="danger" style="margin-bottom:14px">
      <strong>Deuda final: €${G.debt||0}</strong><br>${motivo}
      ${G.debtInterestTotal>0?`<div style="font-size:12px;margin-top:6px">Intereses pagados a lo largo de la carrera: <strong>€${G.debtInterestTotal}</strong>.</div>`:''}
    </div>
    <button class="main" style="margin-top:6px" onclick="backToMainMenu()">← Menú principal</button>`;
}

function renderRetirement(){
  const el=$main();
  // hide persistent UI
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';

  const totalRaces=finishedResults(G.careerHistory).length;   // v96: sin los DNF
  const totalWins=finishedResults(G.careerHistory).filter(r=>r.pos===1).length;
  const totalPodiums=finishedResults(G.careerHistory).filter(r=>r.pos<=3).length;
  const totalPrize=G.careerHistory.reduce((a,r)=>a+(r.prize||0),0);
  const yearsActive=G.year-1;
  const age=G.runner.age||25;
  const name=esc(G.runner.name||'El corredor');

  let legacy='';
  if(totalWins>=10)legacy='Una carrera de élite. Tu nombre queda grabado en la historia del trail.';
  else if(totalWins>=5)legacy='Varios triunfos y una trayectoria que el circuito recordará durante años.';
  else if(totalWins>=1)legacy='Al menos una victoria. Eso no te lo quita nadie.';
  else if(G.ranking<100)legacy='Llegaste a las puertas de la élite. Una carrera respetable y digna.';
  else if(totalRaces>=15)legacy='Años de kilómetros y esfuerzo. El monte siempre te esperó.';
  else legacy='Cada carrera fue un paso adelante. El trail es así de personal.';

  const modeLabel=modeLabelOf(G.gameMode);   // T54 (v93)

  el.innerHTML=`
    <div style="text-align:center;padding:20px 0 10px">
      <div style="font-size:36px;margin-bottom:8px">🏔</div>
      <h1 style="font-size:22px;margin-bottom:4px">Fin de carrera</h1>
      <p style="font-size:14px;color:#888">${name} · ${age} años · ${modeLabel}</p>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="sec-title">Trayectoria completa</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[['Temporadas',yearsActive],['Ranking final','#'+G.ranking],['Carreras',totalRaces],['Victorias',totalWins],['Podios',totalPodiums],['Premios','€'+totalPrize]].map(([l,v])=>`
          <div style="background:#f5f4f0;border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:12px;color:#aaa;margin-bottom:3px">${l}</div>
            <div style="font-size:17px;font-weight:700">${v}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="note" style="font-size:14px;line-height:1.75;margin-bottom:14px"><strong>Legado:</strong> ${legacy}</div>
    ${(G.seasonDiary||[]).length>0?`
    <div class="card" style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📓 Diario</div>
      ${G.seasonDiary.slice(-5).reverse().map(e=>`<div style="padding:9px 0;border-bottom:1px solid #f0ede8">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:12px;font-weight:600;color:#888">Año ${e.year} · ${e.age} años</span>
          <span style="font-size:12px;color:#c07a10;font-weight:600">${e.highlight}</span>
        </div>
        <div style="font-size:13px;color:#555;line-height:1.6">${esc(e.text||'')}</div>
      </div>`).join('')}
    </div>`:''}
    <button class="main" onclick="G=freshState();render()">Nueva partida →</button>`;
}

// ══════════════════════════════════════
//  FLUJO POST-CARRERA
// ══════════════════════════════════════
// Continuar desde pantalla de resultado: en modo normal va a gestión, en exprés avanza directamente
window.postRaceContinue=()=>{
  if(G.gameMode==='expres'){afterRace();return;}
  G._recoveryUsed=false; // reset para la gestión entre carreras
  G.screen='betweenManage';render();
};
// ══════════════════════════════════════
//  MODO ENTRENADOR — RENDER & LOGIC
// ══════════════════════════════════════
window.afterRace=()=>{
  // v96 · secuela: cada carrera que pasa (corrida, abandonada o de baja) devuelve un 15 %
  // de lo pendiente, salvo si llegas con la carga corporal en aviso 2.
  if(getBodyLoad()<getLoadThresholdsByMode().warningLevel2)recoverInjurySequel(INJURY_SEQUEL_RECOVERY.perRace);
  G.currentRaceIdx++;
  const isExpres=G.gameMode==='expres';
  if(G.currentRaceIdx>=G.selectedRaces.length){endSeasonRaces(isExpres?'expresSeasonBalance':'seasonBalance');render();return;} // T25 (v89)
  // In Express, cap injury blocking at 1 race
  if(isExpres&&(G.injuryRacesLeft||0)>1)G.injuryRacesLeft=1;
  // Handle injury race blocking
  if((G.injuryRacesLeft||0)>0){
    G.injuryRacesLeft--;
    const race=G.selectedRaces[G.currentRaceIdx];
    const injData=INJURY_TYPES[G.injuryType]||{};
    const remaining=G.injuryRacesLeft;
    recordDNF(race,'lesion',{injured:true,injuryLabel:injData.label||'Lesión'}); // T104 (v88): id · T45 (v89): forma única de DNF · v96: también en careerHistory
    const el=$main();
    el.innerHTML=`
      <h2>Baja por lesión</h2>
      <p class="sub">${race?.name||'Próxima carrera'}</p>
      <div class="injury-card">
        <div class="injury-type">${injData.label||'Lesión'}</div>
        <div style="font-size:13px;color:#555;margin:6px 0">No puedes participar en esta carrera. Tu cuerpo necesita recuperarse.</div>
        ${hasFisio()?`<div class="text-ok">El fisio está acelerando tu recuperación.</div>`:''}
        ${remaining>0?`<div style="font-size:12px;color:#c0392b;margin-top:4px">Aún te quedan ${remaining} carrera${remaining>1?'s':''} de baja.</div>`:'<div class="text-ok">Podrás volver en la siguiente carrera, pero llegarás tocado.</div>'}
      </div>
      <div class="warn">Has perdido la inscripción (€${race?.cost||0}) y el posible premio de hasta €${race?.prize||0}.</div>
      <button class="main" style="margin-top:12px" onclick="skipInjuredRace()">Continuar →</button>`;
    G._raceResultHTML=el.innerHTML;
    G.screen='raceResult';
    updateFinBar();autoSave();
    return;
  }
  if(G.injuryType&&INJURY_TYPES[G.injuryType]?.canRace===false){
    applyInjuryToRaceStart();
    G.injuryType=null;G.injuryStatus=null;G.injuryRacesLeft=0;
  } else if(G.injuryType&&INJURY_TYPES[G.injuryType]?.canRace===true){
    applyInjuryToRaceStart();
  }
  // T74 (v95): aquí solo se llamaba a resetRaceFlags(). Con evento entre carreras
  // da igual, porque handleEv acaba en goNextRace(), que limpia las dos cosas; pero
  // sin evento (35 % de las veces) se iba directo a la preparación y la carrera
  // siguiente heredaba la condición del día —no se volvía a generar—, los geles,
  // el calentamiento y la estrategia de salida de la anterior.
  resetRaceFlags();resetRaceDayState();
  if(isExpres){G.pendingEvent=null;G.screen='expresPrep';render();return;}
  const hasFisioVal=G.spending.fisio||G.club?.hasFisio;
  // DEV: evento armado desde el panel. Con él no se tira el dado, así que la secuencia
  // aleatoria solo cambia cuando hay algo armado.
  const fb=window.devTake?.('betweenEvent');
  const forcedBetween=fb?BETWEEN_EVENTS.find(e=>e.id===fb):null;
  if(forcedBetween||Math.random()<0.65){
    const ev={...(forcedBetween||BETWEEN_EVENTS[Math.floor(Math.random()*BETWEEN_EVENTS.length)])};
    // T18: el fisio solo neutraliza el susto si el cuerpo está por debajo del
    // umbral en el que deja de cubrir. Cargado, el evento se resuelve normal.
    if(ev.id==='injury'&&hasFisioVal&&getBodyLoad()<(modeCfg().fisio?.onset??65)){
      ev.desc='Sientes algo en la rodilla pero el fisio te trata a tiempo.';
      ev.choices=[{text:'Perfecto, a por la siguiente',effect:'nothing'}];
    }
    G.pendingEvent=ev;G.screen='betweenRace';
  }else{G.pendingEvent=null;G.screen='preRacePrep';}
  render();
};
