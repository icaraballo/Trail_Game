// Modo Canicross — las pantallas. La lógica vive en canicross.js.
// Patrón de carga de modos (paso 4 de TG-Orden-de-Ejecucion, 2026-10-30): cada modo son dos
// ficheros —lógica y pantallas— y registra sus rutas en MODE_ROUTES (aquí, al final) y sus
// campos de G en MODE_STATE (en el de lógica). screenRoutes() y freshState() los juntan, así
// que un modo nuevo no toca la lista central de render-core.js ni el bloque de state.js.

function renderCnCreateDog(){
  const el=$main();
  const breed=G._cnDogBreed;
  const origin=G._cnAdoptionOrigin;
  const originData=CN_ADOPTION_ORIGINS.find(o=>o.id===origin);
  const bondPreview=originData?originData.bondStart:0;

  el.innerHTML=`
    <h2>🐕 Tu compañero</h2>
    <p class="sub">Elige el perro con el que competirás toda la temporada</p>

    <label class="field-label">Nombre del perro</label>
    <input id="dogname" type="text" placeholder="Ej: Txuri, Luna, Thor..." maxlength="20" value="${esc(G._cnDogName||'')}" style="margin-bottom:18px"/>

    <label class="field-label">¿Cómo llegó a ti?</label>
    <div style="display:grid;gap:8px;margin-bottom:18px">
      ${CN_ADOPTION_ORIGINS.map(o=>`
        <div class="card ${origin===o.id?'sel':''}" style="cursor:pointer;${origin===o.id?'border-color:#1a1a1a':'border-color:#e8e6e0'}" onclick="cnSelectOrigin('${o.id}')">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:24px;flex-shrink:0">${o.icon}</span>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;margin-bottom:2px">${o.label} ${origin===o.id?'<span style="color:#4a8a2a">✓</span>':''}</div>
              <div style="font-size:12px;color:#666;margin-bottom:4px">${o.desc}</div>
              <div style="font-size:12px;color:#c07a10;font-weight:600">${o.note}</div>
            </div>
          </div>
        </div>`).join('')}
    </div>

    <label class="field-label">Raza</label>
    <div class="grid2" style="margin-bottom:18px">
      ${Object.entries(CN_BREED_MODS).map(([id,m])=>`
        <div class="spec ${breed===id?'sel':''}" onclick="cnSelectBreed('${id}')">
          <div class="spec-label">${m.label}</div>
          <div class="spec-desc" style="margin-bottom:4px">${m.desc}</div>
          <div style="font-size:11px;color:#4a8a2a">${m.speed>0?'+'+m.speed+' vel':m.speed<0?m.speed+' vel':'vel base'} · ${m.stamina>0?'+'+m.stamina+' res':m.stamina<0?m.stamina+' res':'res base'}</div>
          ${m.bondDecayPerWeek>0?`<div style="font-size:11px;color:#c0392b;margin-top:2px">⚠ -${m.bondDecayPerWeek} vínculo/sem sin entreno</div>`:''}
        </div>`).join('')}
    </div>

    ${breed&&origin?(()=>{
      const m=CN_BREED_MODS[breed];
      const spd=50+(m.speed||0);const sta=50+(m.stamina||0);
      return`<div class="card" style="margin-bottom:16px">
        <div class="sec-title-sm">Stats iniciales</div>
        <div class="bar-row"><span class="bar-label">Velocidad</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${spd}%;background:#4a90d9"></div></div><span class="bar-pct">${spd}</span></div>
        <div class="bar-row"><span class="bar-label">Resistencia</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${sta}%;background:#4a8a2a"></div></div><span class="bar-pct">${sta}</span></div>
        <div class="bar-row"><span class="bar-label">Vínculo inicial</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${bondPreview}%;background:#c07a10"></div></div><span class="bar-pct">${bondPreview}</span></div>
        ${origin==='retirado'?`<div style="font-size:12px;color:#4a8a2a;margin-top:6px">🏅 Ya conoce la orden "Adelante"</div>`:''}
      </div>`;
    })():`<div class="hint" style="margin-bottom:16px">Elige origen y raza para ver los stats iniciales</div>`}

    <div class="note" style="margin-bottom:14px">Necesitas <strong>vínculo ≥20</strong> para correr en tu primera temporada. Habrá una pretemporada de septiembre para construirlo.</div>
    <button class="main" onclick="doCreateDog()" ${!breed||!origin?'disabled style="opacity:0.4"':''}>Continuar → Pretemporada</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="G.screen='modeSelect';render()">← Volver al menú</button>`;
  setTimeout(()=>{
    const i=document.getElementById('dogname');
    if(i){i.oninput=e=>{G._cnDogName=e.target.value;};if(G._cnDogName)i.value=G._cnDogName;}
  },0);
}

// ── PRETEMPORADA ──────────────────────────────────────
function renderCanicrossPreseason(){
  const el=$main();
  const d=cnActiveDog();
  if(!d){G.screen='canicrossHub';render();return;}
  const done=G.cnPreseasonDone||[];
  const allDone=CN_PRESEASON_ACTS.every(a=>done.includes(a.id));
  const bondThreshold=(G.cnSeason||1)===1?20:30;

  el.innerHTML=`
    <h2>🍂 Pretemporada — Septiembre</h2>
    <p class="sub">Antes de que empiece la temporada (Oct–Mar) tienes un mes para preparar a ${esc(d.name)}</p>

    ${d?`<div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:700">🐕 ${esc(d.name)}</span>
        <span style="font-size:12px;color:#888">${d.adoptionOrigin==='cachorro'?'🐶 Cachorro propio':d.adoptionOrigin==='rescate'?'🏠 De protectora':d.adoptionOrigin==='retirado'?'🏅 De corredor retirado':''}</span>
      </div>
      <div class="bar-row">
        <span class="bar-label">Vínculo</span>
        <div class="bar-track" style="flex:1">
          <div class="bar-fill" style="width:${d.bond}%;background:#c07a10"></div>
        </div>
        <span class="bar-pct" style="color:${d.bond>=bondThreshold?'#4a8a2a':'#c0392b'}">${d.bond}</span>
      </div>
      <div style="font-size:12px;color:${d.bond>=bondThreshold?'#4a8a2a':'#c07a10'};margin-top:4px">
        ${d.bond>=bondThreshold?`✓ Vínculo suficiente para competir esta temporada`:`Necesitas vínculo ≥${bondThreshold} para competir · faltan ${bondThreshold-d.bond} puntos`}
      </div>
    </div>`:''}

    <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:10px">Actividades de pretemporada</div>
    <div style="display:grid;gap:8px;margin-bottom:20px">
      ${CN_PRESEASON_ACTS.map(a=>{
        const isDone=done.includes(a.id);
        return`<div class="card" style="${isDone?'opacity:0.7;background:#f8fdf8;border-color:#b8ddb8':'cursor:pointer'}" ${!isDone?`onclick="cnDoPreseasonAct('${a.id}')"`:''}">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:22px;flex-shrink:0">${a.icon}</span>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;margin-bottom:2px">${a.label} ${isDone?'<span style="color:#4a8a2a">✓</span>':''}</div>
              <div style="font-size:12px;color:#666;margin-bottom:4px">${a.desc}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px">
                ${a.bondBonus?`<span style="color:#c07a10">Vínculo +${a.bondBonus}</span>`:''}
                ${a.healthBonus?`<span style="color:#e74c3c">Salud +${a.healthBonus}</span>`:''}
                ${a.mentalBonus?`<span style="color:#4a90d9">Mental +${a.mentalBonus}</span>`:''}
                ${a.teachFirst?`<span style="color:#4a8a2a">🎓 Enseña "Adelante"</span>`:''}
              </div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    ${done.length>0&&!allDone?`<div class="hint" style="margin-bottom:12px">${done.length}/${CN_PRESEASON_ACTS.length} actividades completadas. Puedes continuar cuando quieras.</div>`:''}
    ${allDone?`<div class="note" style="margin-bottom:12px;background:#eaf4ea;border-color:#b8ddb8">✓ Pretemporada completada — ${esc(d.name)} está listo.</div>`:''}

    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="G.screen='canicrossTrainingSetup';render()">
      ${allDone?'Empezar temporada →':'Saltar pretemporada y empezar →'}
    </button>
  `;
}

// ── TAB: CORREDOR ─────────────────────────────────────
function renderCnCorredorTab(){
  const el=$main();
  const d=cnActiveDog();
  const canRace=cnCanRace();
  const races=G.cnSelectedRaces||[];
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const curMonth=cnMonth();
  const MONTHS=CN_MONTHS;
  const MONTH_NAMES=CN_MONTH_NAMES;
  const mIdx=m=>MONTHS.indexOf(m);
  const isPastMonth=m=>mIdx(m)<mIdx(curMonth);
  // v96 (CR-75): una carrera de marzo sin correr —vínculo bajo, perro lesionado o «Saltar
  // este mes»— o una temporada sin carreras dejaban la temporada sin cierre. El reloj nuevo
  // nace con ello: avanzar desde marzo lleva cnMonthIdx a 6 y la temporada se puede cerrar.
  const marchDone=cnSeasonOver();
  const pendingRaces=races.filter(r=>!doneIds.includes(r.id)&&!isPastMonth(r.month)&&!marchDone);
  const allRaceDone=marchDone||(races.length>0&&pendingRaces.length===0);

  el.innerHTML=`
    <div class="flex-between-center" style="margin-bottom:4px">
      <h2>🏃 ${esc(G.runner.name||'Corredor')}</h2>
      <span style="font-size:12px;color:#888">Temporada ${G.cnSeason||1}</span>
    </div>
    <div class="stat-grid" style="margin-bottom:14px">
      <div class="stat"><div class="stat-label">Presupuesto</div><div class="stat-val" style="color:#2d7a2d">€${G.cnMoney||0}</div></div>
      <div class="stat"><div class="stat-label">Mes</div><div class="stat-val">${marchDone?'Terminada':MONTH_NAMES[curMonth]}</div></div>
      <div class="stat"><div class="stat-label">Carreras sel.</div><div class="stat-val">${races.length}</div></div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Stats del corredor</div>
      ${Object.entries(G.runner.stats||{}).slice(0,4).map(([k,v])=>`<div class="bar-row"><span class="bar-label">${k.charAt(0).toUpperCase()+k.slice(1)}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${v}%;background:${v>=70?'#4a8a2a':v>=50?'#4a90d9':'#c07a10'}"></div></div><span class="bar-pct">${v}</span></div>`).join('')}
    </div>

    ${(()=>{
      // Paso 6: el mes es un reparto de horas
      const p=G.cnHoursPlan||{},used=cnHoursUsed(),total=Number(G.cnHoursTotal)||CN_HOURS_TOTAL;
      if(marchDone)return'';
      return`<div class="pz-tarjeta pz" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="pz-label">Horas de ${MONTH_NAMES[curMonth].toLowerCase()}</span><span class="pz-num">${used} / ${total} h</span></div>
        <div class="pz-efectos" style="margin:6px 0 8px">${used?['solo','perro','juntos','descanso'].filter(k=>p[k]).map(k=>CN_HOURS_LABEL[k]+' '+p[k]+' h').join(' · ')+' · comando: '+cnCommandLabel(G.cnHoursCmd):'Sin repartir'}</div>
        <button class="pz-btn sec" onclick="G.screen='canicrossTrainingSetup';render()">${used?'Cambiar el reparto':'Repartir las horas'}</button>
      </div>`;
    })()}
    ${(G.cnMoney||0)<CN_BROKE_LINE?`<div class="pz-tarjeta pz"><span class="pz-diag menos">Vas en números rojos: <span class="pz-num">${fmtEur(G.cnMoney||0)}</span></span><button class="pz-btn sec" style="margin-top:8px" onclick="G.screen='canicrossQuiebra';render()">Ver qué hacer</button></div>`:''}

    ${(()=>{
      const raceThisMonth=pendingRaces.find(r=>r.month===curMonth);
      if(raceThisMonth&&canRace){
        const idx=races.indexOf(raceThisMonth);
        return`<button class="main" style="margin-top:4px;margin-bottom:8px;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnStartRace(${idx})">🏁 Correr ${esc(raceThisMonth.name)} →</button>
        <button class="main" style="margin-top:0;margin-bottom:14px;opacity:0.5;font-size:13px" onclick="cnAdvanceWeek()">Saltar este mes sin correr →</button>`;
      }
      const nextM=CN_MONTHS[(Number(G.cnMonthIdx)||0)+1];
      if(marchDone)return'';   // v96: marzo terminado, abajo sale «Cerrar temporada»
      return`<button class="main" style="margin-top:4px;margin-bottom:14px" onclick="cnAdvanceWeek()">${nextM?'Avanzar a '+MONTH_NAMES[nextM]:'Terminar marzo'} →</button>`;
    })()}

    <div class="section-label" style="margin-top:18px">📅 Carreras de temporada</div>
    ${races.length>0?MONTHS.map(m=>{
      const mName=MONTH_NAMES[m];
      const race=races.find(r=>r.month===m);
      const isCurrent=m===curMonth;
      const isPast=mIdx(m)<mIdx(curMonth);
      const isOpen=(G.cnOpenMonths||[]).includes(m);
      const done=race&&doneIds.includes(race.id);
      const result=done?(G.cnRaceResults||[]).find(res=>res.raceId===race.id&&res.season===G.cnSeason):null;
      const overdue=isPast&&race&&!done;
      const idx=race?races.indexOf(race):-1;
      return `<div style="border:1px solid ${isCurrent?'#b8ddb8':'#e8e6e0'};border-radius:10px;margin-bottom:6px;overflow:hidden;${isCurrent?'background:#f8fdf8':'background:#fff'}">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;cursor:${race?'pointer':'default'}" ${race?`onclick="cnToggleMonth(${m})"`:''}">
          <div style="flex:1;min-width:0">
            <span style="font-size:14px;font-weight:600;color:${isCurrent?'#2d7a2d':isPast?'#aaa':'#1a1a1a'}">${mName}</span>
            ${race?`<span style="font-size:12px;color:${isPast&&!done?'#bbb':'#888'};margin-left:6px">· ${esc(race.name)} · ${race.km}km · Tier ${race.tier}</span>`
                  :`<span style="font-size:12px;color:#ccc;margin-left:6px">· Sin carrera</span>`}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:8px">
            ${done&&!result?`<span class="pz-efectos">${(cnCancelled(race.id)||{}).why==='calor'?'Suspendida':'No corrió'}</span>`
                  :done?`<span style="font-size:13px;font-weight:600;color:${result?.dnf?'#c0392b':'#4a8a2a'}">${result?.dnf?'DNF':'#'+(result?.pos||'?')}</span>`
                  :overdue?`<span style="font-size:12px;color:#bbb">⏱</span>`
                  :isCurrent&&race?`<span style="font-size:12px;color:#4a8a2a;font-weight:600">← Ahora</span>`:''}
            ${race?`<span style="font-size:11px;color:#bbb;display:inline-block;transition:transform .2s;transform:${isOpen?'rotate(90deg)':'rotate(0)'}">▶</span>`:''}
          </div>
        </div>
        ${race&&isOpen?`<div style="padding:0 14px 14px;border-top:1px solid #f0ede8">
          <div style="font-size:12px;color:#888;margin:8px 0 6px">${esc(race.location)} · €${race.cost} inscr. · €${race.prize} premio 1º</div>
          ${done&&!result?`<div class="pz-efectos">${(cnCancelled(race.id)||{}).why==='calor'?'Suspendida por calor: se perdió la inscripción.':'No corristeis: se perdió la inscripción.'}</div>`
                :done?`<div style="font-size:13px;font-weight:600;color:${result?.dnf?'#c0392b':'#4a8a2a'}">${result?.dnf?'DNF — Retirado':'Posición #'+(result?.pos||'?')}${(result?.prize||0)>0?' · +€'+result.prize:''}</div>`
                :overdue?`<div style="font-size:13px;color:#bbb">⏱ Plazo superado — no se puede correr</div>`
                :canRace?`<button class="main" style="margin-top:6px;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnStartRace(${idx})">Correr ahora →</button>`
                :d&&d.bond<cnRaceThreshold()?`<div class="note" style="margin-top:6px">Vínculo insuficiente (${d.bond}/${cnRaceThreshold()})</div>`
                :`<div class="note" style="margin-top:6px">El perro no puede correr ahora</div>`}
        </div>`:''}
      </div>`;
    }).join('')
    :`<div class="hint">Ve a <strong>📅 Calendario</strong> para seleccionar tus carreras de temporada (oct–mar).</div>`}

    ${allRaceDone?`<button class="main" style="margin-top:12px;border-color:#4a8a2a;color:#2d7a2d" onclick="G.screen='canicrossSeasonBalance';render()">Cerrar temporada ${G.cnSeason} →</button>`:''}

    ${(()=>{
      const RARITY={easy:{c:'#4a8a2a',bg:'#eaf4ea',l:'Fácil'},medium:{c:'#4a90d9',bg:'#e8f0fb',l:'Medio'},hard:{c:'#c07a10',bg:'#fdf0e0',l:'Difícil'},legendary:{c:'#8b2252',bg:'#f8e8f2',l:'Legendario'}};
      const rb=a=>{const r=RARITY[a.rarity]||{c:'#888',bg:'#eee',l:''};return`<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:${r.bg};color:${r.c}">${r.l}</span>`;};
      const unlocked=G.unlockedAchievements||[];
      const cnAchs=ACHIEVEMENTS.filter(a=>a.mode==='cn');
      const unlockedCn=cnAchs.filter(a=>unlocked.includes(a.id));
      const pendingCn=cnAchs.filter(a=>!unlocked.includes(a.id));
      const recent=unlockedCn.slice(-3).reverse();
      return`
    <div class="card" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${recent.length>0?'10px':'0'}">
        <div class="sec-title" style="margin-bottom:0">Logros canicross (${unlockedCn.length}/${cnAchs.length})</div>
        <button class="secondary" style="font-size:11px;padding:3px 10px" onclick="G.screen='achievements';render()">Ver todos →</button>
      </div>
      ${recent.map(ach=>`<div style="padding:7px 0;border-bottom:1px solid #f0ede8;display:flex;align-items:center;gap:8px">
        <span style="font-size:15px">🏆</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:1px"><span style="font-size:13px;font-weight:600">${esc(ach.label)}</span>${rb(ach)}</div>
          <div style="font-size:12px;color:#888">${esc(ach.desc)}</div>
        </div>
      </div>`).join('')}
      ${pendingCn.length>0?`<div style="padding:7px 0;opacity:0.5;display:flex;align-items:center;gap:8px">
        <span style="font-size:15px;opacity:0.4">🔒</span>
        <div style="font-size:12px;color:#aaa">Siguiente: <strong>${esc(pendingCn[0].label)}</strong> — ${esc(pendingCn[0].desc)}</div>
      </div>`:''}
    </div>`;
    })()}
  `;
}

// ── TAB: PERRO ────────────────────────────────────────
function renderCnPerroTab(){
  const el=$main();
  const d=cnActiveDog();
  if(!d){el.innerHTML=`<div class="hint">Sin perro. Algo fue mal.</div>`;return;}

  const isOld=d.age>=6;
  const cmds=cnCommandsList();
  const breedInfo=CN_BREED_MODS[d.breed]||CN_BREED_MODS.mestizo;

  el.innerHTML=`
    <h2>🐕 ${esc(d.name)}</h2>
    <p class="sub">${breedInfo.label} · ${cnDogAgeLabel()} · ${d.retired?'<span style="color:#888">Retirado</span>':'<span style="color:#4a8a2a">Activo</span>'}</p>

    ${d.condition?`<div class="pz-tarjeta pz"><div class="pz-label">Estos días</div><div style="font-size:15px">${cnReplaceVars((cnConditionDef(d)||{}).text||'')}</div></div>`:''}
    ${isOld?`<div class="warn">🦴 ${esc(d.name)} ya nota el paso del tiempo (${d.age} años). Su rendimiento puede empezar a decrecer.</div>`:''}
    ${d.injury?`<div class="danger">🤕 Lesión: <strong>${{almohadillas:'Almohadillas rozadas',luxacion:'Luxación',golpe_calor:'Golpe de calor'}[d.injury]||d.injury}</strong> · ${d.injuryRaces} carrera(s) de baja<br><span style="font-size:12px;color:#c0392b">Usa el veterinario para reducir la baja</span></div>`:''}
    ${!d.injury&&d.bond<cnRaceThreshold()?`<div class="note">⚡ Vínculo insuficiente para competir. Necesita ≥${cnRaceThreshold()} (actual: <strong>${d.bond}</strong>). Entrena juntos.</div>`:''}

    <button class="pz-btn sec" style="margin-bottom:12px" onclick="G.screen='canicrossNotebook';render()">Abrir el cuaderno · ${Object.keys(G.cnNotebook||{}).length} conductas</button>
    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Stats</div>
      ${[['Velocidad',d.speed,'#4a90d9'],['Resistencia',d.stamina,'#4a8a2a'],['Vínculo',d.bond,'#c07a10'],['Salud',d.health,'#e74c3c']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label">${l}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(v)}%;background:${c}"></div></div><span class="bar-pct">${Math.round(v)}</span></div>`).join('')}
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Comandos aprendidos</div>
      ${cmds.map(c=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f4f0;font-size:14px"><span>${c.label}</span><span>${c.learned?'✅ Aprendido':'❌ Pendiente'}</span></div>`).join('')}
      <div class="text-hint" style="margin-top:6px">${cmds.every(c=>c.learned)?'¡'+esc(d.name)+' conoce todos los comandos! 🌟':'Entrena "Adiestramiento" para enseñar comandos (2 sesiones por comando).'}</div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Historial juntos</div>
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">Carreras</div><div class="stat-val">${d.races||0}</div></div>
        <div class="stat"><div class="stat-label">Km juntos</div><div class="stat-val">${d.kmTogether||0}</div></div>
        <div class="stat"><div class="stat-label">Vínculo máx.</div><div class="stat-val">${d.peakBond||0}</div></div>
        ${(()=>{const s=cnComputeDogStats();return`
        <div class="stat"><div class="stat-label">Victorias</div><div class="stat-val" style="color:#c07a10">${s.victories}</div></div>
        <div class="stat"><div class="stat-label">Podios</div><div class="stat-val">${s.podiums}</div></div>
        <div class="stat"><div class="stat-label">Temporada</div><div class="stat-val">${G.cnSeason||1}</div></div>`;})()}
      </div>
      ${(()=>{const s=cnComputeDogStats();return s.bestTime?`<div style="font-size:12px;color:#888;margin-top:8px;text-align:center">Mejor tiempo: ${fmt(s.bestTime)}</div>`:'';})()}
    </div>

    ${!d.retired?`
    <div class="section-label">Veterinario</div>
    <div class="grid-2" style="margin-bottom:12px">
      <button class="main" style="margin-top:0;font-size:13px;padding:10px 8px" onclick="cnCallVet('basic')" ${(d.injuryRaces||0)<=0?'disabled':''}>Revisión básica<br><span style="font-size:11px;color:#888">€50 · reduce baja</span></button>
      <button class="main" style="margin-top:0;font-size:13px;padding:10px 8px" onclick="cnCallVet('complete')" ${!d.injury?'disabled':''}>Tratamiento completo<br><span style="font-size:11px;color:#888">€120 · cura en 1 carrera</span></button>
    </div>
    ${((d.age||1)>=8||(d.health==null?100:d.health)<35)?`<div class="pz-diag ojo" style="margin:8px 0">${esc(d.name)} tiene ${d.age} años y salud ${d.health}: quizá sea el momento de retirarle.</div>`:''}
    ${(G.cnSeason||1)>1?`<button class="main" style="background:#fef9ec;border-color:#e8c97a;color:#c07a10" data-dn="${esc(d.name)}" onclick="if(confirm('¿Retirar a '+this.dataset.dn+'?'))cnRetireDog()">Retirar a ${esc(d.name)} voluntariamente</button>`:''}
    `:`<div class="note" style="margin-top:8px">${esc(d.name)} está retirado. <button class="secondary" onclick="cnNewDogAfterRetirement()">Adoptar nuevo perro →</button></div>`}
  `;
}

// ── TAB: EQUIPO ───────────────────────────────────────
function renderCnEquipoTab(){
  // Paso 6 (§ 4.10): lo duradero no es mejor, es distinto; los consumibles se gastan.
  const el=$main();
  const sec=(t,cat)=>`<div class="pz-label" style="margin:12px 0 6px">${t}</div><div class="pz-tarjeta">${CN_EQUIP[cat].map(it=>{
    const own=(G.cnOwned[cat]||[]).includes(it.id);
    return`<div class="pz-fila"><span class="pz-fila-txt"><b>${esc(it.name)}</b><div class="pz-efectos">${esc(it.desc)}</div></span>
      ${own?`<span class="pz-efectos">${G.cnEquipped[cat]===it.id?'Puesto':'Tuyo'}</span>`:`<button class="pz-btn sec" style="width:auto;padding:8px 12px" onclick="cnBuyEquip('${cat}','${it.id}')">€${it.price}</button>`}</div>`;}).join('')}</div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-dinero">${icono('equipo')}Dinero · equipación</div>
    <div class="pz-titulo">Equipo</div>
    <p class="pz-sub">Tienes <span class="pz-num">${fmtEur(G.cnMoney||0)}</span>. Lo que llevas se elige antes de cada carrera.</p>
    ${sec('Arneses','harness')}${sec('Líneas','line')}${sec('Cinturones','belt')}
    <div class="pz-label" style="margin:12px 0 6px">Consumibles</div>
    <div class="pz-tarjeta">${CN_CONSUMABLES.map(c=>`<div class="pz-fila"><span class="pz-fila-txt"><b>${c.name}</b> <span class="pz-efectos">· tienes ${Number(G.cnConsumables[c.id])||0}</span><div class="pz-efectos">${esc(c.desc)}</div></span>
      <button class="pz-btn sec" style="width:auto;padding:8px 12px" onclick="cnBuyConsumable('${c.id}')">€${c.price}</button></div>`).join('')}</div>
  </div>`;
}

// ── EL MES: REPARTO DE HORAS (paso 6 · § 4.9) ─────────────────────────────
// Pantalla nueva con las piezas del sistema visual (stepper, opción, fila).
function renderCanicrossTrainingSetup(){
  const el=$main();
  const d=cnActiveDog();
  const p=G.cnHoursPlan||{},total=Number(G.cnHoursTotal)||CN_HOURS_TOTAL,used=cnHoursUsed();
  const R=CN_HOURS_RATES;
  const da={solo:'Tu resistencia y velocidad. El vínculo baja un poco.',perro:'Velocidad y resistencia del perro, y su comando. Le cansa.',
    juntos:'Vínculo, sincronía de salida y comando (rinde ×1,5). Os cansa a los dos.',descanso:'Le baja la fatiga, sube el ánimo y algo de salud.'};
  const cmdRow=c=>{const h=Math.round((d&&d.cmdHours&&d.cmdHours[c.id])||0);const lv=Number((d&&d.commands||{})[c.id])||0;const next=CN_CMD_LEVEL_HOURS[lv];
    return`<button class="pz-opcion${G.cnHoursCmd===c.id?' sel':''}" onclick="cnSetHoursCmd('${c.id}')"><b>${c.label}</b> <span class="pz-efectos">· nivel ${lv}${next?' · '+h+' / '+next+' h':' · dominado'}</span><div class="pz-efectos">${esc(c.desc)}</div></button>`;};
  const pocoJuntos=(Number(p.juntos)||0)+(Number(p.descanso)||0)<8;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-cuerpo">${icono('calendario')}Cuerpo · ${CN_MONTH_NAMES[cnMonth()]||''}</div>
    <div class="pz-titulo">El mes, en horas</div>
    <p class="pz-sub">Tienes ${total} h este mes. Quedan <span class="pz-num">${total-used}</span>.</p>
    <div class="pz-tarjeta">
      ${['solo','perro','juntos','descanso'].map(k=>`<div class="pz-fila"><span class="pz-fila-txt"><b>${CN_HOURS_LABEL[k]}</b><div class="pz-efectos">${da[k]}</div></span>
        <span class="pz-stepper"><button onclick="cnSetHours('${k}',-2)" ${(p[k]||0)<=0?'disabled':''}>−</button><span class="pz-stepper-n">${p[k]||0}</span><button onclick="cnSetHours('${k}',2)" ${used>=total?'disabled':''}>+</button></span></div>`).join('')}
    </div>
    ${pocoJuntos?`<div class="pz-diag ojo" style="margin-bottom:12px">Con menos de 8 h juntos o descansando, ${d?esc(d.name):'el perro'} lo nota: el vínculo baja.</div>`:''}
    <div class="pz-label" style="margin:6px 0">Comando que entrenáis</div>
    ${CN_COMMANDS.map(cmdRow).join('')}
    ${cnHomeDogs().length?`<div class="pz-diag mas">El veterano de casa ayuda: +25 % en el comando.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" onclick="${(G.cnSelectedRaces||[]).length?"G.screen='canicrossHub';G.activeTab='game';render()":"G.screen='canicrossCalendarSetup';render()"}">${(G.cnSelectedRaces||[]).length?'Hecho':'Ver calendario'}</button>
  </div>`;
  void R;
}

// ── SETUP: CALENDARIO DE TEMPORADA ────────────────────
function renderCanicrossCalendarSetup(){
  // Reutiliza renderCnCalendarioTab pero con navegación diferente
  const el=$main();
  const sel=G.cnSelectedRaces||[];
  const selIds=sel.map(r=>r.id);
  const MONTHS=[10,11,12,1,2,3];
  const MONTH_NAMES={10:'Octubre',11:'Noviembre',12:'Diciembre',1:'Enero',2:'Febrero',3:'Marzo'};
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const spent=selIds.reduce((a,id)=>{const r=CANICROSS_RACES.find(x=>x.id===id);return a+(r?.cost||0);},0);
  const budget=G.cnMoney||0;
  const pct=budget>0?Math.min(100,Math.round(spent/budget*100)):0;
  const openMonths=G.cnOpenSeasonMonths||[];   // §0.4 del diseño: ya no se rellena al pintar (lo pone el arranque)
  const tierColor={1:'#4a8a2a',2:'#4a90d9',3:'#c07a10',4:'#c0392b'};
  const tierLabel={1:'Tier 1',2:'Tier 2',3:'Tier 3',4:'Tier 4'};
  const byMonth={};
  CANICROSS_RACES.forEach(r=>{if(!byMonth[r.month])byMonth[r.month]=[];byMonth[r.month].push(r);});
  const raceCard=r=>{
    const isSel=selIds.includes(r.id);const isDone=doneIds.includes(r.id);
    const noMoney=!isSel&&(spent+(r.cost||0)>budget);
    const otro=!isSel&&sel.find(x=>x.month===r.month);   // B4: una por mes
    const maxed=!isSel&&!otro&&selIds.length>=6;
    const clickable=!isDone&&!maxed&&!otro&&!(noMoney&&!isSel);
    return`<div class="race-card ${isSel?'sel':''}" style="${isDone?'opacity:0.55;cursor:default':''}" ${clickable?`onclick="cnToggleRace('${r.id}')"`:''}">
      <div class="flex-between">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">
            <span class="card-title">${esc(r.name)}</span>
            <span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${tierColor[r.tier]||'#888'}22;color:${tierColor[r.tier]||'#888'}">${tierLabel[r.tier]||''}</span>
          </div>
          <div style="font-size:12px;color:#888">${r.monthName} · ${r.km}km · ${esc(r.location)}</div>
          ${otro?`<div style="font-size:12px;color:var(--ink3);margin-top:2px">Ya tienes «${esc(otro.name)}» este mes</div>`:noMoney&&!isSel&&!maxed?`<div style="font-size:12px;color:#c0392b;margin-top:2px">Sin presupuesto</div>`:maxed&&!isSel?`<div style="font-size:12px;color:#c07a10;margin-top:2px">Máx. 6 carreras</div>`:''}
        </div>
        <div class="right-col">
          <div style="font-size:13px;font-weight:600;color:#4a8a2a">€${r.prize}</div>
          <div style="font-size:12px;color:#aaa">€${r.cost} inscr.</div>
          ${isSel?`<div style="font-size:12px;color:#4a8a2a;font-weight:600;margin-top:2px">✓</div>`:''}
        </div>
      </div>
    </div>`;
  };

  el.innerHTML=`
    <h2>📅 Calendario de temporada</h2>
    <p class="sub">Oct–Mar · una carrera por mes, máx. 6 · ${sel.length} seleccionadas</p>
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px">
        <span>Presupuesto de inscripciones</span>
        <span style="font-weight:600;color:${pct>85?'#c0392b':pct>50?'#c07a10':'#888'}">${pct}% (€${spent} / €${budget})</span>
      </div>
      <div style="height:4px;background:#e8e6e0;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>85?'#c0392b':'#4a90d9'};border-radius:2px;transition:width .3s"></div>
      </div>
    </div>
    ${MONTHS.map(m=>{
      const races=byMonth[m]||[];if(!races.length)return'';
      const mName=MONTH_NAMES[m];
      const mSel=races.filter(r=>selIds.includes(r.id)).length;
      const isOpen=openMonths.includes(m);
      return`<div class="quarter-wrap">
        <div class="quarter-toggle ${mSel>0?'has-sel':''}" onclick="cnToggleSeasonMonth(${m})">
          <span style="font-size:14px;font-weight:600;flex:1">${mName} <span style="font-size:12px;font-weight:400;color:#aaa">· ${races.length} carrera${races.length>1?'s':''}</span></span>
          ${mSel>0?`<span style="font-size:12px;color:#4a8a2a;font-weight:600">${mSel} ✓</span>`:''}
          <span style="font-size:12px;color:#aaa;display:inline-block;transform:${isOpen?'rotate(90deg)':''};transition:transform .2s">▶</span>
        </div>
        ${isOpen?`<div style="padding:4px 0 8px">${races.map(r=>raceCard(r)).join('')}</div>`:''}
      </div>`;
    }).join('')}
    ${sel.length===0?`<div class="hint" style="margin-top:4px">Sin carreras — puedes empezar igualmente y añadir desde el hub.</div>`:''}
    <div class="grid-2" style="margin-top:16px">
      <button class="main" style="margin-top:0;opacity:0.6" onclick="G.screen='canicrossTrainingSetup';render()">← Entreno</button>
      <button class="main" style="margin-top:0;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnConfirmCalendar()">¡Empezar temporada! →</button>
    </div>
  `;
}

// ── TAB: CALENDARIO ───────────────────────────────────
function renderCnCalendarioTab(){
  const el=$main();
  const sel=G.cnSelectedRaces||[];
  const selIds=sel.map(r=>r.id);
  const MONTHS=[10,11,12,1,2,3];
  const MONTH_NAMES={10:'Octubre',11:'Noviembre',12:'Diciembre',1:'Enero',2:'Febrero',3:'Marzo'};
  const MONTH_SHORT={10:'Oct',11:'Nov',12:'Dic',1:'Ene',2:'Feb',3:'Mar'};
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const spent=selIds.reduce((a,id)=>{const r=CANICROSS_RACES.find(x=>x.id===id);return a+(r?.cost||0);},0);
  const budget=G.cnMoney||0;
  const pct=budget>0?Math.min(100,Math.round(spent/budget*100)):0;
  const openMonths=G.cnOpenSeasonMonths||[];   // §0.4 del diseño: ya no se rellena al pintar (lo pone el arranque)
  const tierColor={1:'#4a8a2a',2:'#4a90d9',3:'#c07a10',4:'#c0392b'};
  const tierLabel={1:'Tier 1',2:'Tier 2',3:'Tier 3',4:'Tier 4'};

  const byMonth={};
  CANICROSS_RACES.forEach(r=>{if(!byMonth[r.month])byMonth[r.month]=[];byMonth[r.month].push(r);});

  const raceCard=r=>{
    const isSel=selIds.includes(r.id);
    const isDone=doneIds.includes(r.id);
    const noMoney=!isSel&&(spent+(r.cost||0)>budget);
    const otro=!isSel&&sel.find(x=>x.month===r.month);   // B4: una por mes
    const maxed=!isSel&&!otro&&selIds.length>=6;
    const clickable=!isDone&&!maxed&&!otro&&!(noMoney&&!isSel);
    return`<div class="race-card ${isSel?'sel':''}" style="${isDone?'opacity:0.55;cursor:default':''}" ${clickable?`onclick="cnToggleRace('${r.id}')"`:''}">
      <div class="flex-between">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">
            <span class="card-title">${esc(r.name)}</span>
            <span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${tierColor[r.tier]||'#888'}22;color:${tierColor[r.tier]||'#888'}">${tierLabel[r.tier]||''}</span>
          </div>
          <div style="font-size:12px;color:#888">${r.monthName} · ${r.km}km · ${esc(r.location)}</div>
          ${isDone?`<div style="font-size:12px;color:#4a8a2a;margin-top:2px">✓ Ya corrida esta temporada</div>`:''}
          ${otro?`<div style="font-size:12px;color:var(--ink3);margin-top:2px">Ya tienes «${esc(otro.name)}» este mes</div>`:''}
          ${maxed&&!isSel?`<div style="font-size:12px;color:#c07a10;margin-top:2px">Máx. 6 carreras alcanzado</div>`:''}
          ${noMoney&&!isSel&&!maxed?`<div style="font-size:12px;color:#c0392b;margin-top:2px">Sin presupuesto</div>`:''}
        </div>
        <div class="right-col">
          <div style="font-size:13px;font-weight:600;color:#4a8a2a">€${r.prize}</div>
          <div style="font-size:12px;color:#aaa">€${r.cost} inscr.</div>
          ${isSel?`<div style="font-size:12px;color:#4a8a2a;font-weight:600;margin-top:2px">✓</div>`:''}
        </div>
      </div>
    </div>`;
  };

  el.innerHTML=`
    <h2>📅 Calendario de temporada</h2>
    <p class="sub">Oct–Mar · una carrera por mes, máx. 6 · ${sel.length} seleccionadas</p>
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px">
        <span>Presupuesto de inscripciones</span>
        <span style="font-weight:600;color:${pct>85?'#c0392b':pct>50?'#c07a10':'#888'}">${pct}% (€${spent} / €${budget})</span>
      </div>
      <div style="height:4px;background:#e8e6e0;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>85?'#c0392b':'#4a90d9'};border-radius:2px;transition:width .3s"></div>
      </div>
    </div>
    ${MONTHS.map(m=>{
      const races=byMonth[m]||[];
      if(!races.length)return'';
      const mName=MONTH_NAMES[m];
      const mShort=MONTH_SHORT[m];
      const mSel=races.filter(r=>selIds.includes(r.id)).length;
      const isOpen=openMonths.includes(m);
      return`<div class="quarter-wrap">
        <div class="quarter-toggle ${mSel>0?'has-sel':''}" onclick="cnToggleSeasonMonth(${m})">
          <span style="font-size:14px;font-weight:600;flex:1">${mName} <span style="font-size:12px;font-weight:400;color:#aaa">· ${mShort}</span></span>
          ${mSel>0?`<span style="font-size:12px;color:#4a8a2a;font-weight:600">${mSel} ✓</span>`:''}
          <span style="font-size:12px;color:#aaa;display:inline-block;transform:${isOpen?'rotate(90deg)':''};transition:transform .2s">▶</span>
        </div>
        ${isOpen?`<div style="padding:4px 0 8px">${races.map(r=>raceCard(r)).join('')}</div>`:''}
      </div>`;}).join('')}
    ${sel.length===0?`<div class="hint" style="margin-top:4px">Sin carreras — puedes continuar igualmente.</div>`:''}
    <div class="grid-2" style="margin-top:16px">
      <button class="main" style="margin-top:0" onclick="G.activeTab='game';render()">← Volver</button>
      <button class="main" style="margin-top:0" onclick="cnConfirmCalendar()">Confirmar →</button>
    </div>
  `;
}

// ── TAB: FINANZAS ─────────────────────────────────────
function renderCnFinanzasTab(){
  const el=$main();
  const prizeTotal=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason).reduce((a,r)=>a+(r.prize||0),0);
  const inscCost=(G.cnSelectedRaces||[]).reduce((a,r)=>a+(r.cost||0),0);
  const dogMonthly=cnMonthlyDogCost();
  const seasonResults=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason);

  el.innerHTML=`
    <h2>💰 Finanzas</h2>
    <p class="sub">Temporada ${G.cnSeason||1}</p>

    <div class="fin-section">
      <div class="fin-title">Balance</div>
      <div class="fin-row"><span>Presupuesto actual</span><span class="${(G.cnMoney||0)<0?'minus':'plus'}">${fmtEur(G.cnMoney||0)}</span></div>
      <div class="fin-row"><span>Premios cobrados</span><span class="${prizeTotal>0?'plus':'neutral'}">€${prizeTotal}</span></div>
      <div class="fin-row"><span>Inscripciones</span><span class="minus">-€${inscCost}</span></div>
      <div class="fin-row"><span>Patrocinio al cerrar la temporada</span><span class="plus">+€${cnSponsorIncome()}</span></div>
    </div>

    <div class="fin-section">
      <div class="fin-title">Gastos del perro (mensual)</div>
      <div class="fin-row"><span>Manutención${G.cnMinCare?' mínima':''}</span><span class="minus">-€${cnMonthlyDogCost()}/mes</span></div>
      <div class="fin-row tot"><span>Total/mes perro</span><span class="minus">-€${dogMonthly}/mes</span></div>
    </div>

    ${(G.cnVetHistory||[]).length>0?`
    <div class="fin-section">
      <div class="fin-title">Historial veterinario</div>
      ${G.cnVetHistory.map(v=>`<div class="fin-row"><span>${{basic:'Revisión básica',complete:'Tratamiento completo'}[v.type]||v.type} · T${v.season||1}</span><span class="minus">-€${v.cost}</span></div>`).join('')}
    </div>`:''}

    ${seasonResults.length>0?`
    <div class="fin-section">
      <div class="fin-title">Resultados de la temporada</div>
      ${seasonResults.map(r=>`<div class="fin-row"><span>${esc(r.raceName||'')}</span><span class="${(r.prize||0)>0?'plus':'neutral'}">${r.dnf?'DNF':'#'+(r.pos||'—')}${(r.prize||0)>0?' · +€'+r.prize:''}</span></div>`).join('')}
    </div>`:''}
  `;
}

function cnLiveClassPanel(rs){
  if(!rs||!rs.rivals?.length||rs.currentSeg===0)return'';
  const myTime=(rs.time||0)+(rs.timePenalty||0);
  const myAge=G.runner.age||28;
  const myCat=cnGetCategory(myAge);

  // Paso 3: cada rival lleva sus parciales; quien ha abandonado sale de la tabla.
  const nem=cnNemesisId();
  const all=[
    {name:G.runner.name||'Tú',time:myTime,me:true,age:myAge},
    ...rs.rivals.map(r=>({name:r.name+(r.id===nem?' · némesis':'')+(r.incident&&r.incident.seg<rs.currentSeg&&r.incident.type!=='abandona'?(r.incident.type==='revienta'?' · ha reventado':' · problema con el perro'):''),
      time:cnRivalTime(r,rs.currentSeg),me:false,age:r.age||30})).filter(x=>Number.isFinite(x.time))
  ].sort((a,b)=>a.time-b.time);


  const myPos=all.findIndex(x=>x.me);
  const start=Math.max(0,myPos-2);
  const slice=all.slice(start,Math.min(all.length,start+5));

  // Category ranking
  const catAll=all.filter(r=>cnGetCategory(r.age).id===myCat.id);
  const myCatPos=catAll.findIndex(x=>x.me);
  const catStart=Math.max(0,myCatPos-1);
  const catSlice=catAll.slice(catStart,Math.min(catAll.length,catStart+3));

  return`<div class="live-class" style="margin-bottom:6px">
    <div class="live-class-title">General · ${myPos+1}º de ${all.length}</div>
    ${slice.map((r,i)=>{
      const absPos=start+i;
      const gap=r.me?'—':r.time<myTime?'−'+fmt(myTime-r.time):'+'+fmt(r.time-myTime);
      return`<div class="live-row ${r.me?'me':''}">
        <span class="live-pos" style="color:${absPos===0?'#c07a10':'#bbb'}">${absPos+1}º</span>
        <span class="live-name">${esc(r.name)}${r.me?' ◀':''}</span>
        <span class="live-gap">${gap}</span>
      </div>`;
    }).join('')}
  </div>
  <div class="live-class" style="margin-bottom:10px">
    <div class="live-class-title">${myCat.label} · ${myCatPos+1}º de ${catAll.length}</div>
    ${catSlice.map((r,i)=>{
      const absPos=catStart+i;
      const gap=r.me?'—':r.time<myTime?'−'+fmt(myTime-r.time):'+'+fmt(r.time-myTime);
      return`<div class="live-row ${r.me?'me':''}">
        <span class="live-pos" style="color:${absPos===0?'#c07a10':'#bbb'}">${absPos+1}º</span>
        <span class="live-name">${esc(r.name)}${r.me?' ◀':''}</span>
        <span class="live-gap">${gap}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// ── RACE SCREENS ──────────────────────────────────────
function renderCanicrossPreRace(){
  const el=$main();
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx];
  if(!race){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const d=cnActiveDog();

  const pre=G.cnRaceState&&G.cnRaceState.preBehaviour;   // paso 4: lo que hace el perro en la salida
  el.innerHTML=`
    <h2>🐕 Pre-carrera</h2>
    <p class="sub">${esc(race.name)} · ${race.km}km · ${esc(race.location)}</p>
    ${G.cnRaceState&&G.cnRaceState.tempReal!=null?(()=>{
      // Paso 5: el día, en una tarjeta de estado
      const rs=G.cnRaceState,tl=rs.weatherTimeline||[],cambio=tl.findIndex(w=>w!=='seco');
      const dev=d?cnTempDev(d,rs.tempReal):0;
      return`<div class="pz-tarjeta pz pz-estado">
        <div class="pz-linea"><span class="pz-num" style="font-size:20px">${rs.tempReal} °C</span><span class="pz-efectos">${CN_WINTER_LABEL[G.cnSeasonWinter]||''}</span></div>
        <div class="pz-linea"><span class="pz-efectos">${cambio<0?'Seco toda la carrera':CN_WEATHER_LABEL[tl[cambio]]+' desde el tramo '+(cambio+1)}</span></div>
        ${d&&dev>0?`<div class="pz-linea"><span class="pz-diag ojo">Fuera de lo que mejor lleva un ${(CN_BREED_MODS[d.breed]||{}).label||'perro'} (${cnComfort(d).min} a ${cnComfort(d).max} °C)</span></div>`:''}
        ${G.cnRaceState.forced?`<div class="pz-linea"><span class="pz-diag menos">Hoy corre con un antiinflamatorio</span></div>`:''}
      </div>`;
    })():''}
    ${pre?`<div class="pz-tarjeta pz" style="border-color:var(--acc)"><div class="pz-etiqueta acento">${icono('perro')}En la salida</div><div style="font-size:16px;line-height:1.45">${cnBehaviourText(pre.id)}</div></div>`:''}

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Estado del equipo</div>
      <div class="flex-between-center" style="margin-bottom:6px">
        <span style="font-size:14px">🏃 ${esc(G.runner.name||'Corredor')}</span>
        <span style="color:#4a8a2a;font-size:13px">Listo ✓</span>
      </div>
      ${d?`<div class="flex-between-center">
        <span style="font-size:14px">🐕 ${esc(d.name)}</span>
        <span style="color:${d.bond>=cnRaceThreshold()?'#4a8a2a':'#c0392b'};font-size:13px">Vínculo ${d.bond}/100</span>
      </div>`:''}
    </div>

    ${(()=>{
      // Paso 6: la equipación se elige para esta carrera y los consumibles se gastan al salir
      const eq=G.cnEquipped||{},rs=G.cnRaceState||{},pack=rs.pack||{};
      const sel=cat=>(G.cnOwned[cat]||[]).map(id=>{const it=CN_EQUIP[cat].find(x=>x.id===id)||{};
        return`<button class="pz-opcion${eq[cat]===id?' sel':''}" onclick="cnSelectEquip('${cat}','${id}')"><b>${esc(it.name||id)}</b><div class="pz-efectos">${esc(it.desc||'')}</div></button>`;}).join('');
      return`<div class="pz">
        <div class="pz-label" style="margin:6px 0">Arnés</div>${sel('harness')}
        <div class="pz-label" style="margin:6px 0">Línea</div>${sel('line')}
        <div class="pz-label" style="margin:6px 0">Cinturón</div>${sel('belt')}
        <div class="pz-label" style="margin:10px 0 6px">Llevas</div>
        <div class="pz-tarjeta">${CN_CONSUMABLES.filter(c=>c.id!=='electrolytes').map(c=>{const n=Number(G.cnConsumables[c.id])||0;
          return`<label class="pz-fila" style="cursor:pointer"><input type="checkbox" class="pz-casilla" ${pack[c.id]?'checked':''} ${n||pack[c.id]?'':'disabled'} onchange="cnTogglePack('${c.id}')"><span class="pz-fila-txt"><b>${c.name}</b><div class="pz-efectos">${esc(c.desc)}</div></span><span class="pz-fila-dato">${n}</span></label>`;}).join('')}</div>
      </div>`;
    })()}

    <div class="card" style="margin-bottom:16px">
      <div class="sec-title-sm">Información de la carrera</div>
      <div style="font-size:13px;color:#555">Distancia: ${race.km}km · Tier ${race.tier}</div>
      <div style="font-size:13px;color:#555">Inscripción: €${race.cost} · Premio 1º: €${race.prize}</div>
      ${race.month===12||race.month===1?`<div style="font-size:12px;color:#4a90d9;margin-top:3px">❄️ Carrera invernal — posibles eventos de nieve</div>`:''}
    </div>

    ${(()=>{
      const rs=G.cnRaceState;
      if(!rs?.segs?.length)return'';
      const cnRaceObj={id:'cn_pre',km:rs.km,segs:rs.segs};
      return`<div class="card" style="margin-bottom:16px">
        <div style="font-size:14px;font-weight:600;margin-bottom:2px">${esc(race.name)}</div>
        <div style="font-size:12px;color:#888;margin-bottom:10px">${race.km}km · Tier ${race.tier} · ${esc(race.location)}</div>
        <div id="prof-wrap-cn-pre">${profSvg(cnRaceObj,-1,'preview',0,'cn-pre')}</div>
        <div id="prof-info-cn-pre" data-sel="-1" style="min-height:20px">${profSegInfo(cnRaceObj,null,'preview',0)}</div>
        ${profLeyenda(false)}
        <div style="font-size:12px;color:#888;margin-top:8px">${rs.rivals?.length||0} equipos rivales en carrera</div>
      </div>`;
    })()}


    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnGoToRace()">¡A correr! 🐕 →</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="G.screen='canicrossHub';G.activeTab='game';render()">← Volver</button>`;
  const rs=G.cnRaceState;
  if(rs?.segs?.length){
    const cnRaceObj={id:'cn_pre',km:rs.km,segs:rs.segs};
    attachProfHandlers(cnRaceObj,'cn-pre','preview',0);
  }
}

function renderCanicrossSegment(){
  const el=$main();
  const rs=G.cnRaceState;
  if(!rs||rs.done){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx];
  if(!race){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const d=cnActiveDog();
  const seg=rs.segs?.[rs.currentSeg];
  const kmDone=Math.round((race.km||8)*rs.currentSeg/rs.numSegs*10)/10;
  const kmLeft=Math.round(((race.km||8)-kmDone)*10)/10;
  const pct=Math.round(rs.currentSeg/rs.numSegs*100);
  const isLastSeg=rs.currentSeg+1>=rs.numSegs;
  const ev=rs.pendingEvent;
  const curBond=Math.max(0,Math.min(100,(rs.dogBond||0)+(rs.bondDelta||0)));

  const evBg={pos:'#eaf4ea',neg:'#fef0f0',special:'#fef9ec',rare:'#f0f6ff'}[ev?.eventType]||'#f5f4f0';
  const evBorder={pos:'#b8ddb8',neg:'#f5b8b8',special:'#e8c97a',rare:'#b8d4f0'}[ev?.eventType]||'#e8e6e0';

  // (aquí se calculaban segTypeLabel/Col/Bg — la etiqueta y los colores del tipo
  //  de tramo — y no se pintaban. Borrados en v92: profSegInfo() ya los muestra
  //  más abajo, con las mismas etiquetas y los mismos colores. No era interfaz
  //  que faltase, era un resto de antes de usar profSegInfo.)


  const lastLogEntry=rs.eventLog?.length>0&&!ev&&rs.eventLog[rs.eventLog.length-1].seg===rs.currentSeg-1?rs.eventLog[rs.eventLog.length-1]:null;
  // Paso 4: qué pasó en el tramo anterior, en una línea (sin números del perro)
  const lc=rs.lastCross;
  const crossTxt=lc&&rs.currentSeg>0?({coincide:'Ibais a lo mismo. La línea va tensa y suave.',coincideOrden:'Ibais a lo mismo; la orden sobraba.',
    difiere:'No ibais a lo mismo. La línea da tirones.',ordenAcertada:esc(d?.name||'El perro')+' hace caso a «'+cnCommandLabel(lc.cmd)+'».',
    ordenFallida:esc(d?.name||'El perro')+' no hace caso a «'+cnCommandLabel(lc.cmd)+'». Lo has forzado.'})[lc.caso]:'';

  el.innerHTML=`
    <div class="flex-between-center" style="margin-bottom:10px">
      <span style="font-size:12px;color:#999">${esc(race.name)} · Tramo ${rs.currentSeg+1}/${rs.numSegs}${isLastSeg?' · <strong style="color:#c07a10">último</strong>':''}${rs.tempReal!=null?` · ${cnSegTemp(rs,rs.currentSeg)} °C · ${CN_WEATHER_LABEL[(rs.weatherTimeline||[])[rs.currentSeg]]||''}`:''}</span>
      <span style="font-size:13px;font-weight:600">${fmt((rs.time||0)+(rs.timePenalty||0))}</span>
    </div>

    <div class="prog-wrap" style="margin-bottom:10px">
      <div class="prog-meta"><span>${kmDone}km hechos</span><span>${kmLeft}km restantes</span></div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
    </div>

    ${(()=>{
      // Paso 4: la sincronía es la barra central; sustituye a «Salud» y «Energía» del perro.
      // Lo del perro no se enseña como número: lo dice su conducta, justo debajo.
      const sync=Math.round(rs.sync||0),legs=Math.round(Math.max(0,rs.runnerEnergy||0));
      const cls=v=>v<30?'menos':v<50?'ojo':'';
      return`<div class="pz-tarjeta pz" style="margin-bottom:10px">
        ${cnSyncGraph(sync)}
        <div class="pz-cab-fila" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span class="pz-label">Sincronía</span><span class="pz-num" style="font-size:22px">${sync}</span></div>
        <div class="pz-barra"><div class="pz-relleno ${cls(sync)}" style="width:${sync}%"></div><div class="pz-umbral" style="left:50%"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:10px" class="pz-efectos"><span>Tus piernas <span class="pz-num ${legs<40?'pz-ojo':''}">${legs}</span></span><span>Vínculo <span class="pz-num">${curBond}</span></span></div>
      </div>`;
    })()}
    ${rs.behaviour&&!rs.paceChosen&&!ev?`<div class="pz-tarjeta pz" style="margin-bottom:10px;border-color:var(--acc)">
      <div class="pz-etiqueta acento">${icono('perro')}Tramo ${rs.currentSeg+1}</div>
      <div style="font-size:16px;line-height:1.45">${cnBehaviourText(rs.behaviour.id)}</div>
    </div>`:''}

    ${crossTxt?`<div class="pz-diag ${lc.caso==='coincide'||lc.caso==='ordenAcertada'?'mas':lc.caso==='coincideOrden'?'':'menos'}" style="margin:0 2px 10px">${crossTxt}</div>`:''}
    ${cnLiveClassPanel(rs)}

    ${(()=>{
      if(!rs.segs?.length)return'';
      const cnRaceObj={id:'cn_race',km:rs.km,segs:rs.segs};
      return`<div class="card" style="margin-bottom:10px;padding:10px 10px 6px">
        <div id="prof-wrap-cn-race">${profSvg(cnRaceObj,rs.currentSeg,'race',rs.currentSeg,'cn-race')}</div>
        <div id="prof-info-cn-race" data-sel="${rs.currentSeg}" style="min-height:20px">${profSegInfo(cnRaceObj,rs.currentSeg,'race',rs.currentSeg)}</div>
      </div>`;
    })()}

    ${lastLogEntry?(()=>{
      const lev=lastLogEntry.event||{};
      const bg={pos:'#eaf4ea',neg:'#fef0f0',special:'#fef9ec',rare:'#f0f6ff'}[lev.eventType]||'#f5f4f0';
      const border={pos:'#b8ddb8',neg:'#f5b8b8',special:'#e8c97a',rare:'#b8d4f0'}[lev.eventType]||'#e8e6e0';
      const label={pos:'✨ Evento positivo',neg:'⚡ Evento',special:'🌟 Especial',rare:'💫 Raro'}[lev.eventType]||'📍 Evento';
      return`<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px;margin-bottom:10px"><div style="font-size:12px;color:#888;margin-bottom:3px">${label}</div><div style="font-size:14px;font-weight:600">${cnReplaceVars(lev.text||'')}</div></div>`;
    })():''}

    ${ev?`<div style="background:${evBg};border:1px solid ${evBorder};border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">${cnReplaceVars(ev.text||'')}</div>
      ${(ev.options||[]).map((opt,i)=>`<button class="main" style="margin-top:6px;font-size:13px" onclick="cnMakeDecision(${i})">${esc(opt.label)}</button>`).join('')}
    </div>`:''}

    ${!rs.paceChosen&&!ev?(()=>{
      // Paso 4: intención (obligatoria) y orden (opcional). La orden se lee al pulsar la intención.
      const raceDef=CANICROSS_RACES.find(x=>x.id===rs.raceId)||rs;
      const lvl=cnTeamLevel();
      const cmds=cnCommandsList().filter(c=>c.level>=1);
      const dots=n=>'●'.repeat(n)+'○'.repeat(3-n);
      return`<div class="pz">
        <div class="pz-label" style="margin:4px 0 6px">Orden (opcional)</div>
        ${cmds.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          <label class="pz-chip" style="border:1px solid var(--line2);cursor:pointer"><input type="radio" name="cncmd" value="" checked> Ninguna</label>
          ${cmds.map(c=>`<label class="pz-chip" style="border:1px solid var(--line2);cursor:pointer" title="${esc(c.desc)}"><input type="radio" name="cncmd" value="${c.id}"> ${c.label} <span style="color:var(--ink3)">${dots(c.level)}</span></label>`).join('')}
        </div>`:`<div class="pz-sub">${esc(d?.name||'El perro')} aún no conoce ninguna orden: se enseñan con «Adiestramiento».</div>`}
        <div class="pz-label" style="margin-bottom:6px">Intención</div>
        ${CN_INTENTS.map(it=>{
          const tm=Math.round(cnSegTime(raceDef,seg||{km:(rs.km||8)/rs.numSegs,type:'flat'},lvl,it.time)/(0.85+0.003*(rs.sync||0)));
          return`<button class="pz-opcion" onclick="cnDecide('${it.id}')"><b>${it.label}</b> <span class="pz-efectos">· ${it.desc}</span><div class="pz-efectos" style="margin-top:3px">~${fmt(tm)} · piernas −${it.legs}</div></button>`;
        }).join('')}
      </div>`;
    })():''}


    ${(rs.bondDelta||0)!==0?`<div style="font-size:12px;color:#888;text-align:center;margin-top:10px">Vínculo acumulado: <span style="color:${(rs.bondDelta||0)>=0?'#4a8a2a':'#c0392b'};font-weight:600">${(rs.bondDelta||0)>=0?'+':''}${rs.bondDelta||0}</span></div>`:''}
  `;
  if(rs.segs?.length){
    const cnRaceObj={id:'cn_race',km:rs.km,segs:rs.segs};
    attachProfHandlers(cnRaceObj,'cn-race','race',rs.currentSeg);
  }
}

function renderCanicrossPostRace(){
  const el=$main();
  const rs=G.cnRaceState;
  if(!rs||!rs.done){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const d=cnActiveDog();
  const races=G.cnSelectedRaces||[];
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const remaining=races.filter(r=>!doneIds.includes(r.id));
  const seasonDone=remaining.length===0;

  el.innerHTML=`
    <h2>🏁 Post-carrera</h2>
    <p class="sub">${esc(rs.raceName||'')}</p>

    <div class="finish-time" style="margin-bottom:14px">
      <div class="label">${rs.retired?'Tiempo al retiro':'Tiempo final'}</div>
      <div class="val">${rs.retired?'DNF':fmt(rs.finalTime||0)}</div>
    </div>

    ${!rs.retired?`<div class="card" style="margin-bottom:12px">
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">General</div><div class="stat-val">#${rs.finalPos||'—'}</div></div>
        <div class="stat"><div class="stat-label">${rs.finalCat||'Categoría'}</div><div class="stat-val" style="color:#4a90d9">#${rs.finalCatPos||'—'}<span style="font-size:11px;color:#aaa"> / ${rs.finalCatTotal||'—'}</span></div></div>
        <div class="stat"><div class="stat-label">Premio</div><div class="stat-val" style="color:${(rs.finalPrize||0)>0?'#2d7a2d':'#1a1a1a'}">€${rs.finalPrize||0}</div></div>
        <div class="stat"><div class="stat-label">Vínculo</div><div class="stat-val" style="color:${(rs.bondDelta||0)>=0?'#4a8a2a':'#c0392b'}">${(rs.bondDelta||0)>=0?'+':''}${rs.bondDelta||0}</div></div>
      </div>
    </div>`:''}

    ${(()=>{
      // Paso 3 (§ 4.7): el némesis tiene línea propia. Pieza nueva: tokens, sin hex.
      const nid=cnNemesisId();const nr=nid&&(rs.rivals||[]).find(x=>x.id===nid);
      if(!nr||rs.retired)return'';
      const t=cnRivalTime(nr);
      const txt=!Number.isFinite(t)?'abandonó':t<(rs.finalTime||0)?'llegó '+fmt((rs.finalTime||0)-t)+' antes que tú':'llegó '+fmt(t-(rs.finalTime||0))+' después que tú';
      return`<div class="pz-tarjeta pz" style="margin-bottom:12px"><div class="pz-label">Tu némesis</div><div class="pz-efectos"><b>${esc(nr.name)}</b> ${txt}.</div></div>`;
    })()}

    ${d?`<div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Estado de ${esc(d.name)} tras la carrera</div>
      ${[['Vínculo',d.bond,'#c07a10'],['Salud',d.health,'#e74c3c']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label">${l}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(v)}%;background:${c}"></div></div><span class="bar-pct">${Math.round(v)}</span></div>`).join('')}
      ${d.injury?`<div class="danger" style="margin-top:8px">🤕 Lesión: ${d.injury} · ${d.injuryRaces} carrera(s) de baja</div>`:''}
    </div>`:''}

    ${rs.eventLog&&rs.eventLog.length>0?`<div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Eventos de la carrera</div>
      ${rs.eventLog.slice(-4).map(e=>`<div class="event-box" style="margin-bottom:6px">${cnReplaceVars((e.event||{}).text||'')}</div>`).join('')}
    </div>`:''}

    ${seasonDone?
      `<button class="main" style="border-color:#4a8a2a;color:#2d7a2d" onclick="G.screen='canicrossSeasonBalance';render()">Cerrar temporada ${G.cnSeason} →</button>`:
      `<button class="main" onclick="G.screen='canicrossHub';G.activeTab='game';render()">Continuar temporada →</button>`}`;
}

function renderCnSeasonBalance(){
  const el=$main();
  const results=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason);
  const d=cnActiveDog();
  const totalPrize=results.reduce((a,r)=>a+(r.prize||0),0);
  const wins=results.filter(r=>r.pos===1).length;
  const podiums=results.filter(r=>r.pos&&r.pos<=3).length;
  const bondGain=results.reduce((a,r)=>a+(r.bondDelta||0),0);

  el.innerHTML=`
    <h2>📊 Fin de temporada ${G.cnSeason||1}</h2>
    <p class="sub">${esc(G.runner.name||'Corredor')} &amp; ${d?esc(d.name):'—'}</p>

    <div class="card" style="margin-bottom:12px">
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">Carreras</div><div class="stat-val">${results.length}</div></div>
        <div class="stat"><div class="stat-label">Victorias</div><div class="stat-val">${wins}</div></div>
        <div class="stat"><div class="stat-label">Podios</div><div class="stat-val">${podiums}</div></div>
      </div>
    </div>

    <div class="fin-section">
      <div class="fin-title">Economía</div>
      <div class="fin-row"><span>Premios cobrados</span><span class="plus">+€${totalPrize}</span></div>
      <div class="fin-row"><span>Patrocinio (al empezar la siguiente)</span><span class="plus">+€${cnSponsorIncome()}</span></div>
      <div class="fin-row"><span>Presupuesto final</span><span class="${(G.cnMoney||0)>=0?'plus':'minus'}">€${G.cnMoney||0}</span></div>
    </div>

    ${(()=>{
      // Paso 7: el circuito de la temporada
      const st=cnCircuitStanding();if(!(G.cnCircuitPoints||0)&&st.length<2)return'';
      const yo=st.findIndex(x=>x.me);
      return`<div class="pz-tarjeta pz"><div class="pz-label">Circuito</div>
        ${st.slice(0,3).map((x,i)=>`<div class="pz-fila"><span class="pz-num">${i+1}.º</span><span class="pz-fila-txt">${x.me?'<b>Tú</b>':esc(x.name)}</span><span class="pz-fila-dato">${x.pts} pts</span></div>`).join('')}
        ${yo>2?`<div class="pz-fila"><span class="pz-num">${yo+1}.º</span><span class="pz-fila-txt"><b>Tú</b></span><span class="pz-fila-dato">${st[yo].pts} pts</span></div>`:''}
      </div>`;
    })()}
    ${d?`<div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">🐕 ${esc(d.name)} · Temporada ${G.cnSeason}</div>
      ${[['Vínculo',d.bond,'#c07a10'],['Velocidad',d.speed,'#4a90d9'],['Resistencia',d.stamina,'#4a8a2a'],['Salud',d.health,'#e74c3c']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label">${l}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(v)}%;background:${c}"></div></div><span class="bar-pct">${Math.round(v)}</span></div>`).join('')}
      <div style="font-size:12px;color:#888;margin-top:8px">Vínculo máximo: ${d.peakBond||0} · Km juntos: ${d.kmTogether||0} · Vínculo ganado esta temporada: ${bondGain>=0?'+':''}${bondGain}</div>
      ${(d.age||1)>=5?`<div class="warn" style="margin-top:8px">🦴 ${esc(d.name)} tendrá ${(d.age||1)+1} años la próxima temporada. Considera su bienestar.</div>`:''}
    </div>`:''}

    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnEndSeason()">Comenzar temporada ${(G.cnSeason||1)+1} →</button>`;
}

function renderCnDogRetirement(){
  // Paso 7 (§ 4.13-4.14): el retiro dice el destino, y puede abrir el tuyo
  hideChrome();
  const d=cnDogs().slice().reverse().find(x=>x.retired&&x.id===G.activeDogId)||cnActiveDog();if(!d)return;
  const seasons=d.seasonsWithYou||Math.max(1,(G.cnSeason||1)-(d.birthSeason||1)+1);
  const tuyo=cnRunnerCanRetire();
  const proteVieja=cnDogs().find(x=>x.adoptionOrigin==='rescate');
  $main().innerHTML=`<div class="pz">
    <div class="pz-franja cierre"><div class="pz-franja-num" style="font-size:44px">${esc(d.name)}</div>
      <div class="pz-franja-sub">${seasons} temporada${seasons!==1?'s':''} · ${d.races||0} carreras · ${d.kmTogether||0} km juntos</div></div>
    <p class="pz-sub" style="font-size:16px;color:var(--ink)">${cnDestinyText(d)}</p>
    <div class="pz-tarjeta pz-estado"><div class="pz-linea"><span class="pz-efectos">Vínculo más alto: <span class="pz-num">${d.peakBond||0}</span></span></div></div>
    ${tuyo?`<div class="pz-consejo">${icono('corredor')}<div><b>Has acompañado a ${cnDogs().filter(x=>x.retired).length} perros de principio a fin.</b> Sabes leerlos mejor que la mayoría.${proteVieja?' En la protectora de la que sacaste a '+esc(proteVieja.name)+' hay quince que nadie sabe leer.':''}</div></div>`:''}
    <button class="pz-btn" onclick="cnNewDogAfterRetirement()">Buscar un nuevo compañero</button>
    ${tuyo?`<button class="pz-btn sec" onclick="cnRunnerRetire()">Retirarte tú también</button>`:''}
  </div>`;
}

function renderCnDisplasia(){
  const el=$main();
  const d=cnActiveDog();if(!d)return;
  el.innerHTML=`
    <h2>🩺 Diagnóstico veterinario</h2>
    <p class="sub">${esc(d.name)}</p>
    <div class="danger" style="margin-bottom:14px">El veterinario detecta <strong>displasia de cadera</strong> en ${esc(d.name)}. Necesitas tomar una decisión.</div>
    <div class="card work-card" style="cursor:pointer;margin-bottom:8px" onclick="cnResolveDislasia('treat')">
      <div class="card-title">💊 Tratamiento intensivo — €300</div>
      <div class="card-sub">Permite 1-2 temporadas más. Stats -15%.</div>
    </div>
    <div class="card work-card" style="cursor:pointer;margin-bottom:8px" onclick="cnResolveDislasia('retire')">
      <div class="card-title">🐕 Retiro tranquilo</div>
      <div class="card-sub">Una vida plena fuera de la competición. La opción más justa para él.</div>
    </div>
    <div class="card work-card" style="cursor:pointer;border-color:#f5b8b8" onclick="cnResolveDislasia('ignore')">
      <div class="card-title" style="color:#c0392b">⚠ Ignorar y seguir</div>
      <div class="card-sub">1 temporada más. Health -5/mes. El perro nota que no le cuidas (-vínculo).</div>
    </div>`;
}

// ── PARTIDA DE ANTES DEL REDISEÑO ─────────────────────────────────────────
// migrateState() trae aquí una partida de Canicross guardada con una revisión menor que
// CN_REV. No se intenta jugar: el modo se está reescribiendo y su ficha ya avisaba.
// Pantalla nueva: nace con la dirección visual (piezas pz-*, tokens, sin hex).
function renderCnAntigua(){
  hideChrome();
  const nombre=(G.runner&&G.runner.name)?esc(G.runner.name):'';
  $main().innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">${icono('perro')}Canicross · en obras</div>
    <div class="pz-titulo">Esta partida es de antes del rediseño</div>
    <p class="pz-sub">Canicross se está reescribiendo entero y sus partidas guardadas no pasan a la versión nueva${nombre?` (la de ${nombre} tampoco)`:''}. La ficha del modo lo avisaba.</p>
    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea"><span class="pz-diag">Tus otras partidas y tus logros siguen igual.</span></div>
      <div class="pz-linea"><span class="pz-diag">Esta ranura no se borra sola: si ya no la quieres, bórrala en Partidas.</span></div>
    </div>
    <button class="pz-btn" onclick="cnAntiguaNueva()">Empezar una de Canicross nueva</button>
    <button class="pz-btn sec" onclick="cnAntiguaVolver()">Volver a partidas</button>
  </div>`;
}

// ── LA MAÑANA DE LA CARRERA (paso 5 · § 4.8) ─────────────────────────────────
// Pantalla nueva con las piezas del sistema visual. Tres casos: suspendida por calor, el
// perro no se levanta (sin decisión) y una condición de salud con cuatro salidas.
function renderCnRaceMorning(){
  hideChrome();
  const rs=G.cnRaceState,d=cnActiveDog();
  if(!rs||!rs.morning||!d){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx]||{};
  const m=rs.morning.type;
  const cab=`<div class="pz-etiqueta acento">${icono('perro')}${esc(race.name||'')} · ${rs.tempReal} °C</div>`;
  let body='';
  if(m==='calor'){
    body=`<div class="pz-titulo">Prueba suspendida por calor</div>
      <p class="pz-sub">Hoy hace ${rs.tempReal} °C. Por encima de ${CN_HEAT_CANCEL} °C la organización suspende la carrera: con ese calor un perro corriendo puede sufrir un golpe de calor. Es una protección para ellos, no un castigo.</p>
      <div class="pz-tarjeta pz-estado"><div class="pz-linea"><span class="pz-diag">La inscripción (€${race.cost||0}) no se devuelve.</span></div></div>
      <button class="pz-btn" onclick="cnMorningChoice('volver')">Volver</button>`;
  }else if(m==='negativa'){
    body=`<div class="pz-titulo">${cnReplaceVars('Le pones el arnés. [DOG] no se levanta.')}</div>
      <p class="pz-sub">Hoy no corréis.</p>
      <button class="pz-btn sec" onclick="cnMorningChoice('volver')">Volver a casa</button>`;
  }else{
    const c=cnConditionDef(d)||{text:''};
    const puedeForzar=(G.cnMoney||0)>=35,puedeCuidar=(G.cnMoney||0)>=15;
    body=`<div class="pz-titulo">La mañana de la carrera</div>
      <p class="pz-sub" style="font-size:16px;color:var(--ink)">${cnReplaceVars(c.text)}</p>
      <button class="pz-opcion" onclick="cnMorningChoice('nocorrer')"><b>No correr</b><div class="pz-efectos">Pierdes la inscripción (€${race.cost||0}). ${esc(d.name)} se recupera normal.</div></button>
      <button class="pz-opcion${puedeCuidar?'':' pz-bloqueado'}" ${puedeCuidar?`onclick="cnMorningChoice('cuidado')"`:''}><b>Cuidarle</b><div class="pz-efectos">Comida blanda, electrolitos, vendaje: €15. Suele aliviar; a veces no basta.</div>${puedeCuidar?'':'<div class="pz-motivo">Te faltan €'+(15-(G.cnMoney||0))+'</div>'}</button>
      <button class="pz-opcion" onclick="cnMorningChoice('salir')"><b>Salir igual</b><div class="pz-efectos">Corréis con lo que tenga. Puede empeorar.</div></button>
      <button class="pz-opcion${puedeForzar?'':' pz-bloqueado'}" ${puedeForzar?`onclick="cnMorningChoice('forzar')"`:''}><b>Forzar</b><div class="pz-efectos">Un antiinflamatorio: €35. Hoy no se le nota, pero <span class="pz-menos">−8</span> de vínculo siempre, y si algo sale mal la lesión es peor.</div>${puedeForzar?'':'<div class="pz-motivo">Te faltan €'+(35-(G.cnMoney||0))+'</div>'}</button>`;
  }
  $main().innerHTML=`<div class="pz">${cab}${body}</div>`;
}

// ── ESTRECHEZ (paso 6 · § 4.11) ─────────────────────────────────────────────
function renderCnQuiebra(){
  hideChrome();
  $main().innerHTML=`<div class="pz">
    <div class="pz-franja negativo"><div class="pz-franja-num">${fmtEur(G.cnMoney||0)}</div><div class="pz-franja-sub">Por debajo de ${fmtEur(CN_BROKE_LINE)}: así no llegáis a marzo</div></div>
    <p class="pz-sub">No se acaba nada: toca apretarse. Elige una.</p>
    <button class="pz-opcion" onclick="cnBrokeChoice('inscripciones')"><b>Renunciar a las inscripciones que quedan</b><div class="pz-efectos">No pagas las carreras que faltan; tampoco las corres.</div></button>
    <button class="pz-opcion" onclick="cnBrokeChoice('vender')"><b>Vender la equipación</b><div class="pz-efectos">A mitad de precio. Te quedas con lo básico.</div></button>
    <button class="pz-opcion" onclick="cnBrokeChoice('minima')"><b>Manutención mínima</b><div class="pz-efectos">€20 al mes hasta fin de temporada. Al perro le cuesta <span class="pz-menos">−5</span> de salud cada mes.</div></button>
    <button class="pz-btn sec" style="margin-top:8px" onclick="G.screen='canicrossHub';G.activeTab='game';render()">Seguir así</button>
  </div>`;
}

// ── LAS SEÑAS DEL MODO (paso 7 · § 8.2) ─────────────────────────────────────
// 1. Franja del compañero, arriba en las pantallas de Canicross (la pone triggerFade).
function cnCompanionStrip(){
  if(!G.canicrossMode||typeof G.screen!=='string'||!G.screen.startsWith('canicross'))return '';
  if(['canicrossCreateDog','canicrossAntigua','canicrossEpilogo','canicrossDogRetirement'].includes(G.screen))return '';
  const d=cnActiveDog();if(!d||d.retired)return '';
  const m=cnMood(d.mood);
  // cara de ánimo: icono, nunca número
  const boca=m>=60?'M8 14.5c1.2 1.6 2.6 2.3 4 2.3s2.8-.7 4-2.3':m>=35?'M8.5 15.5h7':'M8 16.5c1.2-1.4 2.6-2 4-2s2.8.6 4 2';
  const estado=d.injury?'De baja':d.condition?'Algo le pasa':'En forma';
  const casa=cnHomeDogs()[0];
  return `<div class="cn-franja pz"><svg class="ico" viewBox="0 0 24 24" aria-label="Ánimo"><circle cx="12" cy="12" r="8.5"/><circle cx="9.3" cy="10" r=".6"/><circle cx="14.7" cy="10" r=".6"/><path d="${boca}"/></svg>
    <b>${esc(d.name)}</b><span class="pz-efectos">· ${estado}</span>${casa?`<span class="pz-efectos" style="margin-left:auto">en casa: ${esc(casa.name)}</span>`:''}</div>`;
}

// 2. El gráfico de dos líneas: la cadencia del perro y la tuya; desfasadas y con la línea
// tensa cuando la sincronía baja. No hace falta mirar el número.
function cnSyncGraph(sync){
  const W=300,H=64,ph=(100-sync)*0.018,amp=6;
  const wave=(y,off)=>{let p='';for(let x=0;x<=W;x+=6){const yy=y+Math.sin(x/16+off)*amp;p+=(x?'L':'M')+x+' '+yy.toFixed(1);}return p;};
  const sag=-18*(sync/100);   // de floja (−18) a recta (0)
  const col=sync>=60?'var(--pos)':sync>=35?'var(--avi-bar)':'var(--neg)';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block;margin-bottom:6px" aria-hidden="true">
    <path d="${wave(14,0)}" style="fill:none;stroke:var(--acc);stroke-width:2"/>
    <path d="${wave(50,ph)}" style="fill:none;stroke:var(--ink2);stroke-width:2"/>
    <path d="M136 20 Q ${(150+sag*2).toFixed(1)} ${(32-sag).toFixed(1)} 164 44" style="fill:none;stroke:${col};stroke-width:${sync>=60?1.75:2.75};stroke-linecap:round"/>
  </svg>`;
}

function cnNotebookCorrelation(n){
  const ctx=n.ctx||[],out=n.out||[];
  const temps=ctx.map(c=>c.temp).filter(t=>t!=null);
  const ter={climb:0,descent:0,flat:0};ctx.forEach(c=>{if(ter[c.terrain]!=null)ter[c.terrain]++;});
  const parts=[];
  if(temps.length)parts.push(`Las ${ctx.length} veces, entre ${Math.min(...temps)} y ${Math.max(...temps)} °C.`);
  const t=Object.entries(ter).filter(([,v])=>v).map(([k,v])=>v+' en '+({climb:'subida',descent:'bajada',flat:'llano'}[k]));
  if(t.length)parts.push(t.join(', ')+'.');
  ['conservar','mantener','apretar'].forEach(k=>{
    const o=out.filter(x=>String(x.chose).startsWith(k));if(!o.length)return;
    const b=o.filter(x=>x.result==='good').length;
    parts.push(`Las ${o.length} veces que elegiste ${k}: ${b} salió bien, ${o.length-b} no.`);
  });
  return parts.join(' ');
}

function renderCnNotebook(){
  const d=cnActiveDog();
  const ents=Object.entries(G.cnNotebook||{}).filter(([,n])=>n.seen>0||n.note).sort((a,b)=>b[1].seen-a[1].seen);
  $main().innerHTML=`<div class="pz">
    <div class="pz-titulo">El cuaderno${d?' de '+esc(d.name):''}</div>
    <p class="pz-sub">Lo que has visto hacer al perro y cómo salió. El cuaderno no saca conclusiones: las sacas tú.</p>
    <div class="cn-cuaderno">
      ${ents.length?ents.map(([id,n])=>{
        const ctx=n.ctx||[];
        const det=n.seen>=4?`<div class="cn-cuaderno-ctx">${cnNotebookCorrelation(n)}</div>`
          :n.seen>=2?`<div class="cn-cuaderno-ctx">${ctx.map(c=>`T${c.season} · ${c.temp} °C${c.terrain?' · '+({climb:'subida',descent:'bajada',flat:'llano'}[c.terrain]):''}`).join(' — ')}</div>`
          :n.seen===1?`<div class="cn-cuaderno-ctx">Temporada ${(ctx[0]||{}).season||G.cnSeason}</div>`:'';
        return`<div class="cn-cuaderno-entrada"><div>${cnBehaviourText(id)} <span class="cn-cuaderno-ctx">(${n.seen} ${n.seen===1?'vez':'veces'})</span></div>${det}
          ${n.about?`<div class="cn-cuaderno-ctx">Escrito sobre ${esc(n.about)}:</div>`:''}
          <textarea class="cn-cuaderno-nota" maxlength="280" placeholder="Tu nota…" onchange="cnSaveNote('${id}',this.value)">${esc(n.note||'')}</textarea></div>`;
      }).join(''):'<div class="cn-cuaderno-ctx">Aún no has apuntado nada. Corred juntos.</div>'}
    </div>
    <button class="pz-btn sec" style="margin-top:12px" onclick="G.screen='canicrossHub';G.activeTab='runner';render()">Volver</button>
  </div>`;
}

function cnDestinyText(x){return (CN_DESTINY_TEXT[x.destiny]||'').replace(/\[DOG\]/g,esc(x.name));}

// ── EPÍLOGO (paso 7 · § 4.14) ─────────────────────────────────────────────
// Final provisional: todos tus perros y qué fue de cada uno. Bisagra de la Protectora.
function renderCnEpilogo(){
  hideChrome();
  const perros=cnDogs();
  $main().innerHTML=`<div class="pz">
    <div class="pz-franja cierre"><div class="pz-franja-num" style="font-size:40px">${esc(G.runner.name||'Tú')}</div>
      <div class="pz-franja-sub">${G.cnSeason||1} temporadas · ${perros.length} perro${perros.length!==1?'s':''} · ${perros.reduce((a,x)=>a+(x.kmTogether||0),0)} km</div></div>
    ${perros.map(x=>`<div class="pz-tarjeta"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px">${esc(x.name)}</b><span class="pz-efectos">${(CN_BREED_MODS[x.breed]||{}).label||''}</span></div>
      <div class="pz-efectos" style="margin:4px 0">${x.seasonsWithYou||1} temporada${(x.seasonsWithYou||1)!==1?'s':''} contigo · ${x.races||0} carreras · ${x.kmTogether||0} km · vínculo más alto ${x.peakBond||0}</div>
      <div>${x.destiny?cnDestinyText(x):esc(x.name)+' sigue contigo.'}</div></div>`).join('')}
    <button class="pz-btn" onclick="backToMainMenu()">Volver al menú</button>
  </div>`;
}

// Rutas del modo (las junta screenRoutes() en render-core.js)
MODE_ROUTES.canicross={
  canicrossCreateDog:renderCnCreateDog,
  canicrossPreseason:renderCanicrossPreseason,
  canicrossTrainingSetup:renderCanicrossTrainingSetup,
  canicrossCalendarSetup:renderCanicrossCalendarSetup,
  canicrossHub:renderCnCorredorTab,
  canicrossPreRace:renderCanicrossPreRace,
  canicrossSegment:renderCanicrossSegment,
  canicrossPostRace:renderCanicrossPostRace,
  canicrossSeasonBalance:renderCnSeasonBalance,
  canicrossDogRetirement:renderCnDogRetirement,
  canicrossDisplasia:renderCnDisplasia,
  canicrossAntigua:renderCnAntigua,
  canicrossRaceMorning:renderCnRaceMorning,
  canicrossQuiebra:renderCnQuiebra,
  canicrossNotebook:renderCnNotebook,
  canicrossEpilogo:renderCnEpilogo,
};
