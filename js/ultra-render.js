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
  let m=ultraMargen();const {b:bb}=ultraSiguienteBarrera();
  const final=race.km-km<=20;   // últimos 20 km: km restantes en vez de posiciones (§ 14, momento 6)
  // Alucinaciones en pantalla (§ 14, opción de partida, avisada): con la cabeza ida, de noche,
  // el margen y el km mienten. Fijo por tramo (no parpadea al redibujar) y siempre con el 👁.
  const grado=ultraGradoAlucina(c),miente=grado>=2;
  if(miente){m+=((c.bloque*7919+G.seg*104729)%81)-40;}
  const kmV=miente?Math.max(0,km+((c.bloque*31+G.seg)%5)-2):km;
  const puestoV=grado>=3?Math.max(1,ultraPuesto()+((c.bloque*13+G.seg*7)%11)-5):ultraPuesto();
  return `<div class="pz-cab-carrera">
    <div class="pz-cab-fila"><span class="pz-cab-nombre">${esc(c.name)} · ${ultraHoraTxt(c)}${ultraEsNoche(c)?' · noche':''}</span><span class="pz-cab-dato">${ultraDur(G.time)}</span></div>
    <div class="pz-cab-fila" style="margin-top:4px">
      <span><span class="pz-cab-pos">km ${kmV}</span> <span class="pz-efectos">de ${race.km}</span></span>
      <span style="text-align:right"><span class="pz-cab-dato ${m<0?'pz-menos':m<30?'':'pz-mas'}">${m>=0?'+':'−'}${Math.abs(m)} min</span><div class="pz-efectos">margen sobre ${bb.km[1]===race.km?'el cierre':`la barrera del km ${bb.km[1]}`}</div></span>
    </div>
    <div class="pz-efectos" style="margin-top:4px">${final?`Quedan ${race.km-kmV} km`:`Vas ${puestoV}.º · ${ultraEnPie()} en carrera`}</div>
    ${miente?`<div class="pz-diag menos" style="margin-top:4px">👁 ${grado>=3?'Lucidez por debajo de 10: no te fíes de nada de lo que ves, ni de lo que oyes.':'Lucidez por debajo de 20: lo que ves puede no ser verdad.'}</div>`:''}
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
  // En el epílogo (§ 16), la cuenta pendiente o el tiempo de referencia (este, solo)
  const fin=enModo&&G.ut.final&&!G.ut.final.hecho?G.ut.final:null;
  const idModo=fin?(fin.id||fin.proyecto?.race):utObjetivoHoy?.()?.id;
  const sel=G._utPre||(G._utPre={carrera:enModo?idModo:'macizo',corredor:'rodador',repuesto:'bolsa',sinRivales:!!fin?.proyecto,
    bastones:enModo&&!!G.ut.material?.bastones,chaqueta:enModo&&!!G.ut.material?.chaqueta});
  const race0=(enModo?utDef(sel.carrera):null)||ULTRA_RACES.find(r=>r.id===sel.carrera)||ULTRA_RACES[0];
  // En el modo, la carrera con la variante que salió la víspera (§ 3)
  const variante=enModo&&G.ut.vispera?.id===race0.id?G.ut.vispera.variante:'completo';
  const race=enModo?utRaceVariante(race0,variante):race0;
  const sinChaqueta=enModo&&utChaquetaObligatoria(race)&&!G.ut.material.chaqueta;
  const hhmm=h=>`${String(Math.floor(h)%24).padStart(2,'0')}:${String(Math.round(h%1*60)).padStart(2,'0')}`;
  const bars=race.bloques.filter(b=>b.barrera).map(b=>`km ${b.km[1]} a las ${hhmm(race.salida+b.barrera.hora)}`).join(' · ');
  const bolsa1=race.bloques.find(b=>b.fin==='bolsa_vida');
  el.innerHTML=`<div class="pz">
    <div class="pz-franja" style="background:var(--fill-oscuro)">
      <div class="pz-franja-sub" style="margin:0 0 4px">🏔 ${fin?(fin.tipo==='cuenta'?'La cuenta pendiente':`Solo, sin dorsal · objetivo ${ultraDur(fin.proyecto.objetivo)}`):enModo?`Ultratrail · temporada ${G.ut.temporada}`:'Ultra · carrera suelta (en pruebas)'}</div>
      <div class="pz-franja-num" style="font-size:40px">${esc(race.name)}</div>
      <div class="pz-franja-sub">${race.km} km · ${fmtMiles(race.dplus)} m+ · cierre ${race.cierre} h</div>
    </div>
    <p class="pz-sub">${esc(race.desc)}</p>
    ${variante!=='completo'?`<div class="pz-diag menos"><b>${UT_VARIANTES[variante]}.</b> ${variante==='alternativo'?`Se quitan ${fmtMiles(race0.dplus-race.dplus)} m+ de arriba: lo que preparaste de altura sirve menos.`:`Se acaba en el km ${race.km}.`} Vale menos puntos y queda con asterisco.</div>`:''}
    ${enModo&&G.ut.vispera?.id===race0.id&&G.ut.vispera.tiempo?`<div class="pz-diag ${['calor','tormenta','frio'].includes(G.ut.vispera.tiempo)?'menos':G.ut.vispera.tiempo==='lluvia'?'ojo':'mas'}"><b>El parte: ${ULTRA_TIEMPO[G.ut.vispera.tiempo].label.toLowerCase()}.</b> ${ULTRA_TIEMPO[G.ut.vispera.tiempo].txt}</div>`:''}
    ${utPerfilHTML(race)}
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
    ${!enModo&&ultraSueltaGuardada()?`<button class="pz-btn" style="margin-top:12px" onclick="utContinuarSuelta()">Continuar la carrera a medias (${esc(ultraSueltaGuardada().ut.carrera.name)}, bloque ${ultraSueltaGuardada().ut.carrera.bloque+1}) →</button>`:''}
    <button class="pz-btn${!enModo&&ultraSueltaGuardada()?' sec':''}" style="margin-top:12px" ${sinChaqueta?'disabled':'onclick="utSalir()"'}>${!enModo&&ultraSueltaGuardada()?'Empezar otra':'A la salida'} →</button>
    ${enModo?'':`<button class="pz-btn sec" onclick="backToMainMenu()">← Menú principal</button>`}
  </div>`;
}
// El perfil antes de salir (§ 13 «Recorrido»): la altimetría por bloques, la noche sombreada
// (con el tiempo estimado), las barreras con su hora y los sectores que no conoces, difuminados.
function utPerfilHTML(race){
  const W=340,H=96,PT=8,PB=16,km=race.km;
  let e=0,t=0;const pts=[[0,0]],tramos=[];
  race.bloques.forEach(b=>{
    const k0=b.km[0],k1=b.km[1],pico=e+b.dplus*(b.tipo==='bajada'?0.3:0.9);
    pts.push([k0+(k1-k0)*0.55,pico]);e=e+b.dplus-b.dminus;pts.push([k1,e]);
    const t0=t;t+=((k1-k0)*390+b.dplus*4.8+b.dminus)*1.05;tramos.push({b,t0,t1:t});
  });
  const minE=Math.min(...pts.map(p=>p[1])),maxE=Math.max(...pts.map(p=>p[1]))||1;
  const x=k=>k/km*W,y=v=>PT+(1-(v-minE)/(maxE-minE||1))*(H-PT-PB);
  const noche=[];let ini=null;
  for(let s=0;s<=t;s+=900){const n=ultraEsNoche({salida:race.salida},s);const kmAt=(()=>{const tr=tramos.find(z=>s<=z.t1)||tramos[tramos.length-1];return tr.b.km[0]+(tr.b.km[1]-tr.b.km[0])*Math.min(1,(s-tr.t0)/(tr.t1-tr.t0||1));})();
    if(n&&ini==null)ini=kmAt;if(!n&&ini!=null){noche.push([ini,kmAt]);ini=null;}}
  if(ini!=null)noche.push([ini,km]);
  const enModo=G.gameMode==='ultratrail'&&!!G.ut;
  const seg=race.bloques.map((b,i)=>{const p=pts.slice(i*2,i*2+3);const desc=enModo&&!utReco(race.id,b.sector);
    return `<polyline points="${p.map(q=>`${x(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join(' ')}" style="fill:none;stroke:var(--acc);stroke-width:2;${desc?'stroke-dasharray:3 3;opacity:.35':''}"/>`;}).join('');
  const area=`<polygon points="0,${H-PB} ${pts.map(q=>`${x(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join(' ')} ${W},${H-PB}" style="fill:var(--acc-t);opacity:.7"/>`;
  const nocheR=noche.map(([a,b])=>`<rect x="${x(a).toFixed(1)}" y="0" width="${(x(b)-x(a)).toFixed(1)}" height="${H-PB}" style="fill:var(--fill-oscuro);opacity:.14"/>`).join('');
  const hh=h=>`${String(Math.floor(h)%24).padStart(2,'0')}:${String(Math.round(h%1*60)).padStart(2,'0')}`;
  const barr=race.bloques.filter(b=>b.barrera).map(b=>`<line x1="${x(b.km[1])}" x2="${x(b.km[1])}" y1="0" y2="${H-PB}" style="stroke:var(--neg);stroke-width:1.5"/><text x="${Math.min(W-30,x(b.km[1])+3)}" y="10" style="font-size:9px;fill:var(--neg)">${hh(race.salida+b.barrera.hora)}</text>`).join('');
  return `<div class="pz-tarjeta" style="padding:10px 12px"><svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block" aria-label="Perfil de ${esc(race.name)}">${nocheR}${area}${seg}${barr}
    <text x="0" y="${H-3}" style="font-size:9px;fill:var(--ink3)">0</text><text x="${W}" y="${H-3}" text-anchor="end" style="font-size:9px;fill:var(--ink3)">${km} km</text></svg>
    <div class="pz-efectos" style="margin-top:4px">Sombreado: de noche (a tu ritmo estimado) · en rojo, las barreras${enModo?' · a trazos, lo que no conoces':''}</div></div>`;
}
// El recorrido por sectores (§ 5, § 13 «Recorrido»): lo que no conoces sale difuminado.
function utRecorridoHTML(race){
  const duro=utSectorDuro(race);
  return `<div class="pz-label" style="margin:14px 0 6px">El recorrido</div>
    <div class="pz-tarjeta ut-filas">${utSectores(race).map(sec=>{const n=utReco(race.id,sec),bl=race.bloques.filter(b=>b.sector===sec);
      // Tramos seguidos del mismo sector, juntos: «km 0-14 y 95-105»
      const rangos=[];bl.forEach(b=>{const u=rangos[rangos.length-1];if(u&&u[1]===b.km[0])u[1]=b.km[1];else rangos.push([b.km[0],b.km[1]]);});
      const km='km '+rangos.map(r=>r.join('-')).join(' y ');
      return `<div class="pz-fila${n?'':' ut-difuso'}"><span class="pz-fila-txt"><b>${esc(sec)}</b><div class="pz-efectos">${n?`${km} · ${fmtMiles(bl.reduce((a,b)=>a+b.dplus,0))} m+`:'Sin datos: no lo has pisado nunca'}${n===3&&sec===duro?' · <b>aquí se rompe la gente</b>':''}</div></span><span class="pz-chip ${['','','mas','mas'][n]}">${UT_RECO_NIVEL[n]}</span></div>`;}).join('')}</div>`;
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
window.utSalir=()=>{const p=G._utPre||{};ultraStart({carrera:p.carrera,corredor:p.corredor,repuesto:p.repuesto,bastones:p.bastones,chaqueta:p.chaqueta,sinRivales:p.sinRivales});G._utPre=null;G.screen='utBloque';utGuardarCarrera();render();window.scrollTo(0,0);};

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
        return `<button class="pz-opcion sin-check${hecho?' pz-bloqueado':''}" style="padding:10px 14px" ${hecho?'':`onclick="utParar('${a.id}')"`}><span style="float:right" class="pz-num">${a.min}'</span><b>${a.label}</b>${hecho?'<div class="pz-efectos">hecho</div>':''}</button>`;}).join('')}`}
    <div class="pz-label" style="margin:14px 0 6px">Siguiente: ${esc(b.sector)} · km ${b.km[0]}-${b.km[1]} · ${fmtMiles(b.dplus)} m+ / ${fmtMiles(b.dminus)} m−${b.barrera?' · <b>barrera</b>':''}</div>
    ${ULTRA_RITMOS.map(k=>`<button class="pz-opcion${c.ritmo===k?' sel':''}" onclick="ultraCarrera().ritmo='${k}';render()"><b>${PACE_COSTS[k].label}</b><div class="pz-efectos">${PACE_COSTS[k].desc}</div></button>`).join('')}
    ${c.sueno?`<div class="pz-diag menos" style="margin-top:12px">Te estás durmiendo de pie. Sin dormir no puedes seguir: duerme en la manta o retírate.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" ${c.sueno?'disabled':'onclick="utCorrer()"'}>${salida?'¡Salida!':'Seguir'} →</button>
    ${salida?'':`<button class="pz-btn sec" style="font-size:13px;padding:8px;color:var(--ink3);border-color:var(--line)" onclick="utRetirarme()">Retirarme aquí</button>`}
  </div>`;
}
// Dejar la carrera a medias y volver en el mismo momento: se guarda en cada bloque, cada parada y
// al salir de la bolsa. En Ultratrail, en la ranura; la suelta, en su clave (LS 'ultra_run'),
// como el Backyard. Al acabar, la clave se borra.
function utGuardarCarrera(){
  if(G.gameMode==='ultratrail'){if(typeof autoSave==='function')autoSave();return;}
  if(G.gameMode!=='ultra')return;
  const c=ultraCarrera();
  if(!c||c.fin){LS.del('ultra_run');return;}
  LS.set('ultra_run',JSON.stringify({v:1,ut:G.ut,selectedRaces:G.selectedRaces,seg:G.seg,time:G.time,paceLog:G.paceLog,runner:G.runner,weather:G.weather,screen:G.screen}));
}
function ultraSueltaGuardada(){try{const s=JSON.parse(LS.get('ultra_run')||'null');return s&&s.v===1&&s.ut?.carrera&&!s.ut.carrera.fin?s:null;}catch(e){return null;}}
window.utContinuarSuelta=()=>{const s=ultraSueltaGuardada();if(!s)return;
  ['ut','selectedRaces','seg','time','paceLog','runner','weather'].forEach(k=>{G[k]=s[k];});G.currentRaceIdx=0;
  G.screen=['utBloque','utBolsa'].includes(s.screen)?s.screen:'utBloque';render();window.scrollTo(0,0);};
window.utParar=id=>{ultraParar(id);utGuardarCarrera();render();};
window.utRetirarme=()=>{ultraRetirarse();G.screen='utFin';utGuardarCarrera();render();};
window.utSalirBolsa=()=>{const c=ultraCarrera();c.enBolsa=false;c.paradaUsada=[];G.screen='utBloque';utGuardarCarrera();render();window.scrollTo(0,0);};
window.utCorrer=()=>{const r=ultraCorrerBloque(ultraCarrera().ritmo);G.screen=r==='fin'?'utFin':r==='bolsa'?'utBolsa':'utBloque';utGuardarCarrera();render();window.scrollTo(0,0);};

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
      return `<button class="pz-opcion sin-check${hecho||no?' pz-bloqueado':''}" style="padding:10px 14px" ${hecho||no?'':`onclick="utParar('${a.id}')"`}><span style="float:right" class="pz-num">${a.min}'</span><b>${a.label}</b>${hecho?'<div class="pz-efectos">hecho</div>':no&&a.id==='bateria'?'<div class="pz-efectos">no la dejaste aquí</div>':''}</button>`;}).join('')}
    ${c.sueno?`<div class="pz-diag menos" style="margin-top:12px">Te estás durmiendo de pie. Duerme antes de salir o retírate aquí.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" ${c.sueno?'disabled':'onclick="utSalirBolsa()"'}>Salir de la bolsa →</button>
    ${c.sueno?`<button class="pz-btn sec" onclick="utRetirarme()">Retirarme aquí</button>`:''}
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
