// ══════════════════════════════════════
//  ULTRA — pantallas de la carrera suelta (la lógica, en ultra.js)
// ══════════════════════════════════════
// utPre → [ utBloque (avituallamiento) · utBolsa (bolsa de vida) ] × N → utFin
// Las mismas pantallas sirven a la carrera suelta (panel de desarrollo) y a la carcasa de
// Ultratrail (ultratrail-render.js): en el modo, utPre no elige corredor y utFin vuelve al plan.
// Comparte acento con el Backyard y la noche oscurece la pantalla con data-noche, como allí.

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
  const enModo=G.gameMode==='ultratrail'&&!!G.ut;
  const sel=G._utPre||(G._utPre={carrera:enModo?utObjetivoHoy()?.id:'macizo',corredor:'rodador',repuesto:'bolsa',
    bastones:enModo&&!!G.ut.material?.bastones,chaqueta:enModo&&!!G.ut.material?.chaqueta});
  const race0=ULTRA_RACES.find(r=>r.id===sel.carrera)||ULTRA_RACES[0];
  // En el modo, la carrera con la variante que salió la víspera (§ 3)
  const variante=enModo&&G.ut.vispera?.id===race0.id?G.ut.vispera.variante:'completo';
  const race=enModo?utRaceVariante(race0,variante):race0;
  const sinChaqueta=enModo&&utChaquetaObligatoria(race)&&!G.ut.material.chaqueta;
  const hhmm=h=>`${String(Math.floor(h)%24).padStart(2,'0')}:${String(Math.round(h%1*60)).padStart(2,'0')}`;
  const bars=race.bloques.filter(b=>b.barrera).map(b=>`km ${b.km[1]} a las ${hhmm(race.salida+b.barrera.hora)}`).join(' · ');
  const bolsa1=race.bloques.find(b=>b.fin==='bolsa_vida');
  el.innerHTML=`<div class="pz">
    <div class="pz-franja" style="background:var(--fill-oscuro)">
      <div class="pz-franja-sub" style="margin:0 0 4px">🏔 ${enModo?`Ultratrail · temporada ${G.ut.temporada}`:'Ultra · carrera suelta (en pruebas)'}</div>
      <div class="pz-franja-num" style="font-size:40px">${esc(race.name)}</div>
      <div class="pz-franja-sub">${race.km} km · ${fmtMiles(race.dplus)} m+ · cierre ${race.cierre} h</div>
    </div>
    <p class="pz-sub">${esc(race.desc)}</p>
    ${variante!=='completo'?`<div class="pz-diag menos"><b>${UT_VARIANTES[variante]}.</b> ${variante==='alternativo'?`Se quitan ${fmtMiles(race0.dplus-race.dplus)} m+ de arriba: lo que preparaste de altura sirve menos.`:`Se acaba en el km ${race.km}.`} Vale menos puntos y queda con asterisco.</div>`:''}
    <div class="pz-diag ojo"><b>Barreras:</b> ${bars}. Si llegas tarde, fuera, aunque vayas bien.</div>
    ${enModo?utRecorridoHTML(race):''}
    ${consejoHTML('ut_regla','Aquí no gana el que corre más.','Gana el que llega. Cada parada suma al reloj y el margen sobre la barrera baja mientras decides. De noche, sin luz, casi no se avanza.')}
    ${enModo?'':`<div class="pz-label" style="margin:14px 0 6px">¿Con quién corres?</div>
    ${ULTRA_CORREDORES.map(c=>`<button class="pz-opcion${sel.corredor===c.id?' sel':''}" onclick="G._utPre.corredor='${c.id}';render()"><b>${esc(c.name)}</b><div class="pz-efectos">${c.desc}</div></button>`).join('')}`}
    ${race.noches?`<div class="pz-label" style="margin:14px 0 6px">La batería de repuesto del frontal</div>
    ${[['mochila','En la mochila','La tienes siempre, pero pesa: un poco más lento toda la noche.'],
       ['bolsa','En la bolsa de vida',`No pesa, pero hasta el km ${bolsa1?bolsa1.km[1]:'—'} no la tienes.`],
       ['sin','No llevo','El frontal da unas 7 horas. La noche dura nueve.']].map(([id,l,d])=>`<button class="pz-opcion${sel.repuesto===id?' sel':''}" onclick="G._utPre.repuesto='${id}';render()"><b>${l}</b><div class="pz-efectos">${d}</div></button>`).join('')}
    ${race.noches>=2?`<div class="pz-diag ojo">Dos noches. En la segunda bolsa de vida te espera otra batería, y en los avituallamientos podrás dormir en una manta: sin dormir, no se termina.</div>`:''}`
    :`<div class="pz-diag mas">Sale de día y se acaba de día: sin frontal.</div>`}
    ${enModo?utPreMaterialHTML(race,sel):''}
    ${sinChaqueta?`<div class="pz-diag menos">Sin chaqueta de membrana no pasas el control de salida.</div>
      <button class="pz-btn sec" onclick="G._utMatVuelta='utPre';G.screen='utMaterial';render();window.scrollTo(0,0)">Ir al material →</button>`:''}
    <button class="pz-btn" style="margin-top:12px" ${sinChaqueta?'disabled':'onclick="utSalir()"'}>A la salida →</button>
    ${enModo?'':`<button class="pz-btn sec" onclick="backToMainMenu()">← Menú principal</button>`}
  </div>`;
}
// El recorrido por sectores (§ 5, § 13 «Recorrido»): lo que no conoces sale difuminado.
function utRecorridoHTML(race){
  return `<div class="pz-label" style="margin:14px 0 6px">El recorrido</div>
    <div class="pz-tarjeta ut-filas">${utSectores(race).map(sec=>{const n=utReco(race.id,sec),bl=race.bloques.filter(b=>b.sector===sec);
      const km=`km ${bl[0].km[0]}-${bl[bl.length-1].km[1]}`;
      return `<div class="pz-fila${n?'':' ut-difuso'}"><span class="pz-fila-txt"><b>${esc(sec)}</b><div class="pz-efectos">${n?`${km} · ${fmtMiles(bl.reduce((a,b)=>a+b.dplus,0))} m+`:'Sin datos: no lo has pisado nunca'}</div></span><span class="pz-chip ${['','','mas','mas'][n]}">${UT_RECO_NIVEL[n]}</span></div>`;}).join('')}</div>`;
}
// Material para esta carrera (§ 13 «Material»): lo que llevas y lo que pesa.
function utPreMaterialHTML(race,sel){
  const m=G.ut.material,obl=utChaquetaObligatoria(race);
  return `<div class="pz-label" style="margin:14px 0 6px">Material</div>
    <div class="pz-tarjeta ut-filas">
      <div class="pz-fila"><span class="pz-fila-txt"><b>Bastones</b><div class="pz-efectos">${m.bastones?'Suben mejor; en lo llano, estorban.':'No tienes.'}</div></span>${m.bastones?`<input type="checkbox" class="pz-interruptor" ${sel.bastones?'checked':''} onchange="G._utPre.bastones=this.checked">`:''}</div>
      <div class="pz-fila"><span class="pz-fila-txt"><b>Chaqueta de membrana</b><div class="pz-efectos">${!m.chaqueta?'No tienes.':obl?'Obligatoria. Sin ella, ligero; pero si hay control en un avituallamiento, una hora de castigo, y de madrugada se pasa frío.':'Pesa un poco. Hoy no es obligatoria.'}</div></span>${m.chaqueta?`<input type="checkbox" class="pz-interruptor" ${sel.chaqueta?'checked':''} onchange="G._utPre.chaqueta=this.checked">`:''}</div>
      <div class="pz-fila"><span class="pz-fila-txt"><b>Frontal</b><div class="pz-efectos">${race.noches?(m.frontal?'El bueno: 12 horas de luz.':'El normal: 7 horas de luz.'):'De día: no hace falta.'}</div></span></div>
      <div class="pz-fila"><span class="pz-fila-txt"><b>Zapatillas</b><div class="pz-efectos">${m.zapatillasKm>=UT_ZAPAS_VIDA?'Gastadas: las piernas lo van a notar.':`${m.zapatillasKm} km de ${UT_ZAPAS_VIDA}.`}</div></span></div>
    </div>`;
}
window.utSalir=()=>{const p=G._utPre||{};ultraStart({carrera:p.carrera,corredor:p.corredor,repuesto:p.repuesto,bastones:p.bastones,chaqueta:p.chaqueta});G._utPre=null;G.screen='utBloque';render();window.scrollTo(0,0);};

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
      ${ultraAvitualla(c).map(a=>{const hecho=c.paradaUsada.includes(a.id)&&a.id!=='gel';
        return `<button class="pz-opcion sin-check${hecho?' pz-bloqueado':''}" style="padding:10px 14px" ${hecho?'':`onclick="ultraParar('${a.id}');render()"`}><span style="float:right" class="pz-num">${a.min}'</span><b>${a.label}</b>${hecho?'<div class="pz-efectos">hecho</div>':''}</button>`;}).join('')}`}
    <div class="pz-label" style="margin:14px 0 6px">Siguiente: ${esc(b.sector)} · km ${b.km[0]}-${b.km[1]} · ${fmtMiles(b.dplus)} m+ / ${fmtMiles(b.dminus)} m−${b.barrera?' · <b>barrera</b>':''}</div>
    ${ULTRA_RITMOS.map(k=>`<button class="pz-opcion${c.ritmo===k?' sel':''}" onclick="ultraCarrera().ritmo='${k}';render()"><b>${PACE_COSTS[k].label}</b><div class="pz-efectos">${PACE_COSTS[k].desc}</div></button>`).join('')}
    ${c.sueno?`<div class="pz-diag menos" style="margin-top:12px">Te estás durmiendo de pie. Sin dormir no puedes seguir: duerme en la manta o retírate.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" ${c.sueno?'disabled':'onclick="utCorrer()"'}>${salida?'¡Salida!':'Seguir'} →</button>
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
    ${ULTRA_BOLSA.map(a=>{const hecho=c.paradaUsada.includes(a.id),no=a.id==='bateria'&&!ultraBateriaEnBolsa(c);
      return `<button class="pz-opcion sin-check${hecho||no?' pz-bloqueado':''}" style="padding:10px 14px" ${hecho||no?'':`onclick="ultraParar('${a.id}');render()"`}><span style="float:right" class="pz-num">${a.min}'</span><b>${a.label}</b>${hecho?'<div class="pz-efectos">hecho</div>':no&&a.id==='bateria'?'<div class="pz-efectos">no la dejaste aquí</div>':''}</button>`;}).join('')}
    ${c.sueno?`<div class="pz-diag menos" style="margin-top:12px">Te estás durmiendo de pie. Duerme antes de salir o retírate aquí.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" ${c.sueno?'disabled':`onclick="ultraCarrera().enBolsa=false;ultraCarrera().paradaUsada=[];G.screen='utBloque';render();window.scrollTo(0,0)"`}>Salir de la bolsa →</button>
    ${c.sueno?`<button class="pz-btn sec" onclick="ultraRetirarse();G.screen='utFin';render()">Retirarme aquí</button>`:''}
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
    ${G.gameMode==='ultratrail'?`<button class="pz-btn" onclick="utVolverDeCarrera()">Volver al plan →</button>`
    :`<button class="pz-btn" onclick="G.ut=null;G.screen='utPre';render();window.scrollTo(0,0)">Otra vez</button>
    <button class="pz-btn sec" onclick="G.ut=null;backToMainMenu()">← Menú principal</button>`}
  </div>`;
}

MODE_ROUTES.ultra={utPre:renderUtPre, utBloque:renderUtBloque, utBolsa:renderUtBolsa, utFin:renderUtFin};
