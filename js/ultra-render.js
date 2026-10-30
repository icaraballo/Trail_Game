// ══════════════════════════════════════
//  ULTRA — pantallas de la carrera suelta (la lógica, en ultra.js)
// ══════════════════════════════════════
// utPre → [ utBloque (avituallamiento) · utBolsa (bolsa de vida) ] × N → utFin
// Comparte acento con el Backyard (son el mismo modo cuando llegue la carcasa) y la noche
// oscurece la pantalla con data-noche, como allí.

const utBarra=(label,v)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
  <span class="pz-efectos" style="width:78px">${label}</span>
  <div class="pz-barra" style="flex:1"><div class="pz-relleno" style="width:${Math.round(v)}%;background:${v<20?'var(--neg)':v<40?'var(--avi-bar)':'var(--acc)'}"></div></div>
  <span class="pz-num" style="width:28px;text-align:right">${Math.round(v)}</span></div>`;

// La cabecera de siempre: km, reloj de carrera, hora y, lo más importante, el margen (§ 14).
function utCabecera(){
  const c=ultraCarrera(),race=G.selectedRaces[0],b=race.bloques[c.bloque-1],km=b?b.km[1]:0;
  const m=ultraMargen(),{b:bb}=ultraSiguienteBarrera();
  const final=race.km-km<=20;   // últimos 20 km: km restantes en vez de posiciones (§ 14, momento 6)
  return `<div class="pz-cab-carrera">
    <div class="pz-cab-fila"><span class="pz-cab-nombre">${esc(c.name)} · ${ultraHoraTxt(c)}${ultraEsNoche(c)?' · noche':''}</span><span class="pz-cab-dato">${ultraDur(G.time)}</span></div>
    <div class="pz-cab-fila" style="margin-top:4px">
      <span><span class="pz-cab-pos">km ${km}</span> <span class="pz-efectos">de ${race.km}</span></span>
      <span style="text-align:right"><span class="pz-cab-dato ${m<0?'pz-menos':m<30?'':'pz-mas'}">${m>=0?'+':'−'}${Math.abs(m)} min</span><div class="pz-efectos">margen sobre ${bb.km[1]===race.km?'el cierre':`la barrera del km ${bb.km[1]}`}</div></span>
    </div>
    <div class="pz-efectos" style="margin-top:4px">${final?`Quedan ${race.km-km} km`:`Vas ${ultraPuesto()}.º · ${ultraEnPie()} en carrera`}</div>
  </div>`;
}
function utEstado(){
  const c=ultraCarrera(),r=G.runner,f=c.frontal;
  return `<div class="pz-tarjeta">
    ${utBarra('Energía',r.energy)}${utBarra('Hidratación',r.hydration)}${utBarra('Piernas',r.legs)}${utBarra('Lucidez',c.lucidez)}
    <div class="pz-efectos" style="margin-top:4px">${ULTRA_ESTOMAGO[c.estomago]} · 🦶 ${['Pies bien','Rozaduras','Ampollas','Pies destrozados'][c.pies]} · 🔦 ${f.horas>0?`${f.horas.toFixed(1).replace('.',',')} h de luz`:'sin luz'}${f.repuestoCogido&&!f.usado?' + repuesto':''}</div>
  </div>`;
}

// Antes de salir: carrera, corredor y dónde llevas la batería de repuesto (§ 12).
function renderUtPre(){
  const el=$main();hideChrome();
  const sel=G._utPre||(G._utPre={carrera:'macizo',corredor:'rodador',repuesto:'bolsa'});
  const race=ULTRA_RACES.find(r=>r.id===sel.carrera)||ULTRA_RACES[0];
  const bars=race.bloques.filter(b=>b.barrera).map(b=>`km ${b.km[1]} a las ${String((race.salida+b.barrera.hora)%24).padStart(2,'0')}:00`).join(' · ');
  el.innerHTML=`<div class="pz">
    <div class="pz-franja" style="background:var(--fill-oscuro)">
      <div class="pz-franja-sub" style="margin:0 0 4px">🏔 Ultra · carrera suelta (en pruebas)</div>
      <div class="pz-franja-num" style="font-size:40px">${esc(race.name)}</div>
      <div class="pz-franja-sub">${race.km} km · ${fmtMiles(race.dplus)} m+ · cierre ${race.cierre} h</div>
    </div>
    <p class="pz-sub">${esc(race.desc)}</p>
    <div class="pz-diag ojo"><b>Barreras:</b> ${bars}. Si llegas tarde, fuera, aunque vayas bien.</div>
    ${consejoHTML('ut_regla','Aquí no gana el que corre más.','Gana el que llega. Cada parada suma al reloj y el margen sobre la barrera baja mientras decides. De noche, sin luz, casi no se avanza.')}
    <div class="pz-label" style="margin:14px 0 6px">¿Con quién corres?</div>
    ${ULTRA_CORREDORES.map(c=>`<button class="pz-opcion${sel.corredor===c.id?' sel':''}" onclick="G._utPre.corredor='${c.id}';render()"><b>${esc(c.name)}</b><div class="pz-efectos">${c.desc}</div></button>`).join('')}
    <div class="pz-label" style="margin:14px 0 6px">La batería de repuesto del frontal</div>
    ${[['mochila','En la mochila','La tienes siempre, pero pesa: un poco más lento toda la noche.'],
       ['bolsa','En la bolsa de vida','No pesa, pero hasta el km 42 no la tienes.'],
       ['sin','No llevo','El frontal da unas 8 horas. La noche dura nueve.']].map(([id,l,d])=>`<button class="pz-opcion${sel.repuesto===id?' sel':''}" onclick="G._utPre.repuesto='${id}';render()"><b>${l}</b><div class="pz-efectos">${d}</div></button>`).join('')}
    <button class="pz-btn" style="margin-top:12px" onclick="utSalir()">A la salida →</button>
    <button class="pz-btn sec" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}
window.utSalir=()=>{const p=G._utPre||{};ultraStart({carrera:p.carrera,corredor:p.corredor,repuesto:p.repuesto});G._utPre=null;G.screen='utBloque';render();window.scrollTo(0,0);};

// El avituallamiento: paras (o no) y eliges ritmo para el bloque que viene.
function renderUtBloque(){
  const el=$main();hideChrome();
  const c=ultraCarrera();if(!c){G.screen='utPre';render();return;}
  if(c.fin){G.screen='utFin';render();return;}
  const race=G.selectedRaces[0],b=race.bloques[c.bloque],salida=c.bloque===0;
  const lineas=c.log.slice(-4);
  el.innerHTML=`<div class="pz">
    ${utCabecera()}
    ${lineas.map(x=>`<div class="narrative-item">${esc(x.t)}</div>`).join('')}
    ${utEstado()}
    ${salida?'':`<div class="pz-label" style="margin:14px 0 6px">Avituallamiento del km ${race.bloques[c.bloque-1].km[1]}</div>
      ${ULTRA_AVITUALLA.map(a=>{const hecho=c.paradaUsada.includes(a.id)&&a.id!=='gel';
        return `<button class="pz-opcion sin-check${hecho?' pz-bloqueado':''}" style="padding:10px 14px" ${hecho?'':`onclick="ultraParar('${a.id}');render()"`}><span style="float:right" class="pz-num">${a.min}'</span><b>${a.label}</b>${hecho?'<div class="pz-efectos">hecho</div>':''}</button>`;}).join('')}`}
    <div class="pz-label" style="margin:14px 0 6px">Siguiente: ${esc(b.sector)} · km ${b.km[0]}-${b.km[1]} · ${fmtMiles(b.dplus)} m+ / ${fmtMiles(b.dminus)} m−${b.barrera?' · <b>barrera</b>':''}</div>
    ${ULTRA_RITMOS.map(k=>`<button class="pz-opcion${c.ritmo===k?' sel':''}" onclick="ultraCarrera().ritmo='${k}';render()"><b>${PACE_COSTS[k].label}</b><div class="pz-efectos">${PACE_COSTS[k].desc}</div></button>`).join('')}
    <button class="pz-btn" style="margin-top:12px" onclick="utCorrer()">${salida?'¡Salida!':'Seguir'} →</button>
    ${salida?'':`<button class="pz-btn sec" style="font-size:13px;padding:8px;color:var(--ink3);border-color:var(--line)" onclick="ultraRetirarse();G.screen='utFin';render()">Retirarme aquí</button>`}
  </div>`;
}
window.utCorrer=()=>{const r=ultraCorrerBloque(ultraCarrera().ritmo);G.screen=r==='fin'?'utFin':r==='bolsa'?'utBolsa':'utBloque';render();window.scrollTo(0,0);};

// La bolsa de vida: el cronómetro de parada corre a la vista y debe ser incómoda (§ 14, 2).
function renderUtBolsa(){
  const el=$main();hideChrome();
  const c=ultraCarrera();if(!c){G.screen='utPre';render();return;}
  const parado=c.paradaUsada.reduce((a,id)=>a+(ULTRA_BOLSA.find(x=>x.id===id)?.min||0),0);
  el.innerHTML=`<div class="pz">
    ${utCabecera()}
    <div class="pz-franja" style="background:var(--fill-oscuro);text-align:center;padding:14px">
      <div class="pz-franja-sub" style="margin:0 0 2px">Bolsa de vida · parado</div>
      <div class="pz-franja-num" style="font-size:52px">${parado} min</div>
    </div>
    ${utEstado()}
    ${ULTRA_BOLSA.map(a=>{const hecho=c.paradaUsada.includes(a.id),no=a.id==='bateria'&&(c.frontal.repuesto!=='bolsa'||c.frontal.repuestoCogido);
      return `<button class="pz-opcion sin-check${hecho||no?' pz-bloqueado':''}" style="padding:10px 14px" ${hecho||no?'':`onclick="ultraParar('${a.id}');render()"`}><span style="float:right" class="pz-num">${a.min}'</span><b>${a.label}</b>${hecho?'<div class="pz-efectos">hecho</div>':no&&a.id==='bateria'?'<div class="pz-efectos">no la dejaste aquí</div>':''}</button>`;}).join('')}
    <button class="pz-btn" style="margin-top:12px" onclick="ultraCarrera().enBolsa=false;ultraCarrera().paradaUsada=[];G.screen='utBloque';render();window.scrollTo(0,0)">Salir de la bolsa →</button>
  </div>`;
}

// El resultado es doble: finisher sí o no, y puesto (§ 14). Una barrera no es un fracaso.
function renderUtFin(){
  const el=$main();hideChrome();
  const c=ultraCarrera();if(!c||!c.fin){G.screen='utPre';render();return;}
  const f=c.fin,ok=f.kind==='finisher';
  el.innerHTML=`<div class="pz">
    <div class="pz-franja ${ok?'podio':'dnf'}">
      <div class="pz-franja-sub" style="margin:0 0 4px">${esc(c.name)} · ${esc(G.runner.name)}</div>
      <div class="pz-franja-num" style="font-size:${ok?64:44}px">${ok?'Finisher':'No terminó'}</div>
      <div class="pz-franja-sub">${ok?`${ultraDur(G.time)} · ${f.pos}.º de ${f.finishers} que terminan`:`km ${f.km} · ${f.motivo==='barrera'?'fuera de barrera':f.motivo==='lesion'?'lesión':'retirada'}`}</div>
    </div>
    <p style="line-height:1.6">${esc(f.why)}</p>
    ${!ok&&f.motivo==='barrera'?`<div class="pz-diag">Quedarse en una barrera es el resultado más común del deporte. No es un abandono.</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Lo último</div>
    <div class="pz-tarjeta">${c.log.slice(-6).map(x=>`<div class="pz-efectos" style="margin-bottom:3px">${esc(x.t)}</div>`).join('')}</div>
    <button class="pz-btn" onclick="G.ut=null;G.screen='utPre';render();window.scrollTo(0,0)">Otra vez</button>
    <button class="pz-btn sec" onclick="G.ut=null;backToMainMenu()">← Menú principal</button>
  </div>`;
}

MODE_ROUTES.ultra={utPre:renderUtPre, utBloque:renderUtBloque, utBolsa:renderUtBolsa, utFin:renderUtFin};
