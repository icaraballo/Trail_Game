// ══════════════════════════════════════
//  BACKYARD — pantallas (la lógica, en backyard.js)
// ══════════════════════════════════════
// byMenu → byPre → [ byBell → byLoop → byCorral ] × N → byEnd   (§ 18)
// Nace con el sistema visual: piezas pz-*, acento propio (data-modo="backyard") y la noche
// redefine los tokens (data-noche en <html>, ver aplicarModoChasis), sin colores sueltos.

const byBarra=(label,v)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
  <span class="pz-efectos" style="width:70px">${label}</span>
  <div class="pz-barra" style="flex:1"><div class="pz-relleno" style="width:${Math.round(v)}%;background:${v<20?'var(--neg)':v<40?'var(--avi-bar)':'var(--acc)'}"></div></div>
  <span class="pz-num" style="width:28px;text-align:right">${Math.round(v)}</span></div>`;
function byAnimoTxt(a){return a>=70?'🙂 Con ganas':a>=45?'😐 Aguantando':a>=25?'😞 Ánimo bajo':'😶 Hundido';}
function byHoraTxt(n){return String(byHora(n)).padStart(2,'0')+':00';}

// Entrada al modo: continuar la tirada guardada o empezar de cero (§ 18, reanudación).
function renderByMenu(){
  const el=$main();hideChrome();
  const s=byTiradaGuardada();
  if(!s){G.screen='byPre';render();return;}
  el.innerHTML=`<div class="pz">
    <div class="pz-franja" style="background:var(--fill-oscuro)">
      <div class="pz-franja-sub" style="margin:0 0 4px">🔔 Backyard · ${BY_EVENTOS[s.dif]?.label||''}</div>
      <div class="pz-franja-num" style="font-size:40px">Tienes una tirada a medias</div>
      <div class="pz-franja-sub">${esc(s.name)} · vuelta ${s.lap} · quedan ${s.rivals.filter(r=>!r.out).length+1} en pie</div>
    </div>
    <button class="pz-btn" onclick="byContinuar()">Continuar — vuelta ${s.lap}</button>
    <button class="pz-btn sec" onclick="byBorrarTirada();G.screen='byPre';render()">Empezar de cero</button>
    <button class="pz-btn sec" style="margin-top:14px" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}
window.byContinuar=()=>{const s=byTiradaGuardada();if(!s)return;G.by=s;G.screen=s.phase==='corral'?'byCorral':'byBell';render();};

// El campamento: a qué backyard te apuntas y con quién (§ 24, § 18).
function renderByPre(){
  const el=$main();hideChrome();
  const sel=G._byPre||(G._byPre={dif:'local',corredor:'metronomo'});
  const rec=byRecords();
  el.innerHTML=`<div class="pz">
    <div class="pz-franja" style="background:var(--fill-oscuro)">
      <div class="pz-franja-sub" style="margin:0 0 4px">🔔 ${BY_LUGAR.charAt(0).toUpperCase()+BY_LUGAR.slice(1)}</div>
      <div class="pz-franja-num" style="font-size:44px">Backyard</div>
      <div class="pz-franja-sub">${BY_KM_VUELTA.toString().replace('.',',')} km cada hora en punto. Gana el último en pie.</div>
    </div>
    ${consejoHTML('by_regla','Correr rápido no da ventaja: da minutos.','Lo que no tardas en la vuelta es tu descanso en el corral, y ahí comes, te curas y duermes. Si no estás en la línea cuando suena el cencerro, fuera. Todos menos uno acaban como DNF.')}
    <div class="pz-label" style="margin:14px 0 6px">¿A qué backyard te apuntas?</div>
    ${Object.entries(BY_EVENTOS).map(([id,e])=>`<button class="pz-opcion${sel.dif===id?' sel':''}" onclick="G._byPre.dif='${id}';render()">
      <span style="float:right" class="pz-efectos">${rec[id]?`Tu récord: <b class="pz-num">${rec[id].laps}</b>${rec[id].gano?' 🏆':''}`:''}</span>
      <b>${e.label}</b><div class="pz-efectos">${e.n} corredores · suele llegar a ${e.suele}</div></button>`).join('')}
    <div class="pz-label" style="margin:14px 0 6px">¿Con quién corres?</div>
    ${BY_CORREDORES.map(c=>`<button class="pz-opcion${sel.corredor===c.id?' sel':''}" onclick="G._byPre.corredor='${c.id}';render()">
      <b>${c.flag} ${esc(c.name)}</b> <span class="pz-chip" style="margin:0;background:var(--soft)">${BY_ARQ_LABEL[c.arq]}</span>
      <div class="pz-efectos">${c.desc}</div></button>`).join('')}
    <div class="pz-diag" style="margin-top:10px">Récord del formato: <b>${BY_LEYENDAS[0].laps} vueltas</b> (${BY_LEYENDAS[0].name}). Antes, ${BY_LEYENDAS.slice(1).map(l=>`${l.laps} de ${l.name}`).join(' y ')}.</div>
    <button class="pz-btn" style="margin-top:12px" onclick="byEmpezar()">Montar el campamento y a la línea →</button>
    <button class="pz-btn sec" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}
window.byEmpezar=()=>{const p=G._byPre||{};byStart({corredor:p.corredor,dificultad:p.dif});G._byPre=null;G.screen='byBell';render();};

// La campana: cada hora te pregunta lo mismo, y esa repetición es el juego (§ 18).
function renderByBell(){
  const el=$main();hideChrome();
  const b=G.by;if(!b){G.screen='byPre';render();return;}
  const n=b.lap+1,vivos=byVivos(),solo=vivos.length===0;
  const peor=Math.min(b.piernas,b.energia,b.lucidez,b.animo);
  // A la vuelta 5, rendirse es gris y pequeño; con todo en rojo deja de serlo.
  const grande=peor<25;
  const t=k=>byTiempoPrevisto(k);
  el.innerHTML=`<div class="pz">
    <div class="pz-cab-carrera">
      <div class="pz-cab-fila"><span class="pz-cab-nombre">${BY_EVENTOS[b.dif].label} · ${byHoraTxt(n)}${byEsNoche(n)?' · noche':''}</span><span class="pz-cab-dato">${solo?'Solo':`${vivos.length+1} en pie`}</span></div>
    </div>
    ${b.aviso?`<div class="pz-diag ojo"><b>${b.aviso}</b></div>`:''}
    ${b.bitacora?`<div class="pz-diag">${b.bitacora}</div>`:''}
    ${solo?`<div class="pz-diag menos"><b>Ya no sale nadie más.</b> Si completas esta vuelta, ganas. Si no la completas, este año no gana nadie.</div>`:''}
    <p style="margin:10px 0 6px">${BY_ORGANIZADOR} levanta el cencerro.</p>
    <div class="pz-label" style="margin:10px 0 6px">Esfuerzo de la vuelta</div>
    ${Object.entries(BY_ESFUERZO).map(([k,e])=>{const m=t(k);
      return`<button class="pz-opcion${b.esfuerzo===k?' sel':''}" onclick="G.by.esfuerzo='${k}';render()"><span style="float:right" class="pz-num ${m>=58?'pz-menos':''}">~${byMinSeg(m)}</span><b>${e.label}</b>
        <div class="pz-efectos">${m>=60?'<span class="pz-menos">No llegarías a la campana</span>':`Descanso de unos ${Math.max(0,Math.floor(60-m))} min`}</div></button>`;}).join('')}
    ${vivos.length+1>=5?`<button class="pz-opcion sin-check${b.farol.fuerte?' sel':''}" onclick="${b.farol.fuerte?'':'byFarolFuerte();render()'}"><b>Salir fuerte delante de ellos</b><div class="pz-efectos">Que te vean irte · <span class="pz-mas">les baja el ánimo</span> · <span class="pz-menos">−5 piernas</span>${b.farol.fuerte?' · hecho':''}</div></button>`:''}
    <button class="pz-btn" style="margin-top:12px;font-size:20px;padding:18px" onclick="byBotonSalir()">VUELTA ${n} — SALIR</button>
    ${b.rutina&&!solo?`<button class="pz-btn sec" onclick="byBotonRutina()">Encadenar con la rutina (${BY_ESFUERZO[b.rutina.esfuerzo].label.toLowerCase()} + ${byRutinaMin()} min de corral)</button>`:''}
    <button class="pz-btn sec" style="${grande?'':'font-size:13px;padding:8px;color:var(--ink3);border-color:var(--line)'}" onclick="byBotonNoSalgo()">No salgo</button>
    ${byPanelEstado()}
  </div>`;
}
window.byBotonSalir=()=>{const b=G.by;b.aviso=null;b.bitacora=null;const r=bySalir(b.esfuerzo);G.screen=r==='end'?'byEnd':'byLoop';render();window.scrollTo(0,0);};
window.byBotonNoSalgo=()=>{byNoSalgo();G.screen='byEnd';render();window.scrollTo(0,0);};
window.byBotonRutina=()=>{const r=byEncadenar();G.screen=r==='end'?'byEnd':r==='bell'?'byBell':'byCorral';render();window.scrollTo(0,0);};

// La vuelta: la que menos hace. Ya decidiste al salir (§ 18).
function renderByLoop(){
  const el=$main();hideChrome();
  const b=G.by;if(!b){G.screen='byPre';render();return;}
  const lineas=b.log.filter(x=>x.lap>=b.lap-1).slice(-4);
  el.innerHTML=`<div class="pz">
    <div class="pz-cab-carrera"><div class="pz-cab-fila"><span class="pz-cab-nombre">Vuelta ${b.lap} · ${BY_KM_VUELTA.toString().replace('.',',')} km</span><span class="pz-cab-dato">${byMinSeg(b.lastLap)}</span></div></div>
    ${lineas.map(x=>`<div class="narrative-item">${esc(x.t)}</div>`).join('')}
    <button class="pz-btn" style="margin-top:12px" onclick="byEntrarCorral();G.screen='byCorral';render();window.scrollTo(0,0)">Al corral — ${Math.max(0,Math.floor(60-b.lastLap))} min →</button>
  </div>`;
}

// El corral: la pantalla principal, y debe ser incómoda de mirar (§ 18).
function renderByCorral(){
  const el=$main();hideChrome();
  const b=G.by;if(!b){G.screen='byPre';render();return;}
  const vivos=byVivos(),quedan=vivos.length+1,musica=b.musicaHasta>=b.lap;
  const accion=(a,onc,extra,usos)=>{const cabe=b.corral>=a.min&&(usos==null||usos>0);
    return`<button class="pz-opcion sin-check${cabe?'':' pz-bloqueado'}" style="padding:10px 14px" ${cabe?`onclick="${onc}"`:''}><span style="float:right" class="pz-num">${a.min}'</span><b>${a.label}</b>${extra?`<div class="pz-efectos">${extra}</div>`:''}</button>`;};
  const usado=id=>b.corralUsado.filter(x=>x===id).length;
  el.innerHTML=`<div class="pz">
    <div class="pz-franja ${b.corral<=2?'negativo':''}" style="${b.corral<=2?'':'background:var(--fill-oscuro)'};text-align:center;padding:16px">
      <div class="pz-franja-num" style="font-size:64px"><span id="by-cuenta">${b.corral}</span><span style="font-size:28px"> min</span></div>
      <div class="pz-franja-sub">hasta el cencerro · vuelta ${b.lap} en ${byMinSeg(b.lastLap)}</div>
    </div>
    ${b.aviso?`<div class="pz-diag ojo"><b>${b.aviso}</b></div>`:''}
    ${b.bitacora?`<div class="pz-diag">${b.bitacora}</div>`:''}
    <div class="pz-tarjeta">
      ${byBarra('Piernas',b.piernas)}${byBarra('Energía',b.energia)}${byBarra('Lucidez',b.lucidez)}
      <div class="pz-efectos" style="margin-top:4px">🦶 ${BY_PIES[b.pies]} · ${byAnimoTxt(b.animo)}${musica?' · 🎧 con música':''}${b.pacto?` · 🤝 con ${esc(b.pacto.name)}`:''}</div>
    </div>
    ${BY_ACCIONES.map(a=>accion(a,`byBotonAccion('${a.id}')`,usado(a.id)?`hecho ×${usado(a.id)}`:'')).join('')}
    <div class="pz-label" style="margin:14px 0 6px">Palancas</div>
    ${Object.entries(BY_PALANCAS).map(([id,p])=>accion(p,`byBotonPalanca('${id}')`,`quedan ${b.inv[id]}${id==='musica'?' · sube el ánimo, pero dejas de leer a los rivales':id==='cafeina'?' · sube la lucidez y luego la cobra':''}`,b.inv[id])).join('')}
    ${vivos.some(r=>r.name)&&!b.pacto?`<div class="pz-label" style="margin:14px 0 6px">Correr acompañado</div>
      ${vivos.filter(r=>r.name).slice(0,3).map(r=>`<button class="pz-opcion sin-check" style="padding:10px 14px" onclick="byPactar('${r.id}');render()"><b>Pactar con ${esc(r.name)}</b><div class="pz-efectos">Los dos más lentos (+1,5 min de vuelta) · <span class="pz-mas">ánimo y piernas</span></div></button>`).join('')}`:''}
    ${b.pacto?`<button class="pz-opcion sin-check" style="padding:10px 14px" onclick="byRomperPacto();render()"><b>Romper el pacto con ${esc(b.pacto.name)}</b><div class="pz-efectos"><span class="pz-menos">−8 ánimo</span> · a él le duele más</div></button>`:''}
    ${quedan>=5&&b.corral>0?`<button class="pz-opcion sin-check" style="padding:10px 14px" onclick="byFarolTarde();render()"><b>Entrar tarde y entero</b><div class="pz-efectos">Te gastas todo el descanso · <span class="pz-mas">les baja el ánimo a todos</span></div></button>`:''}
    ${quedan===2?accion({label:'Sentarte a la vista',min:2},'byFarolSentado();render()','Fingir que estás peor para que se confíe. Si no cuela, lo pagas tú.'):''}
    <div class="pz-label" style="margin:14px 0 6px">${quedan===1?'Solo tú':quedan===2?'El duelo':`Quedan ${quedan} corredores`}</div>
    ${musica?`<div class="pz-diag">Con la música puesta no oyes quién entra al corral.</div>`
      :vivos.length&&vivos.length<=20?`<div class="pz-tarjeta" style="padding:2px 14px">${vivos.slice(0,8).map(r=>`<div class="pz-fila"><span class="pz-fila-txt">${r.flag||''} ${esc(r.name||'—')}<div class="pz-efectos">${esc(r.bio||'')}</div></span><span class="pz-efectos">${r.animo<40?'tocado':''}</span></div>`).join('')}${vivos.length>8?`<div class="pz-efectos" style="padding:6px 0">y ${vivos.length-8} más</div>`:''}</div>`
      :vivos.length?`<div class="pz-diag">Una masa de frontales y sillas plegables. Aún no conoces a nadie.</div>`:''}
    <button class="pz-btn" style="margin-top:14px" onclick="byALaLinea()">A la línea →</button>
    <button class="pz-btn sec" onclick="byFijarRutina();render()">Fijar esta rutina (${BY_ESFUERZO[b.esfuerzo].label.toLowerCase()} + ${b.corralUsado.length?b.corralUsado.map(id=>BY_ACCIONES.find(a=>a.id===id).label.toLowerCase()).join(', '):'nada'})</button>
    ${b.rutina?`<div class="pz-efectos" style="text-align:center;margin-top:4px">Rutina actual: ${BY_ESFUERZO[b.rutina.esfuerzo].label.toLowerCase()} + ${byRutinaMin()} min</div>`:''}
  </div>`;
  byAnimarCuenta();
}
// La cuenta atrás baja con animación, por turnos (§ 18): una aritmética lenta, no un reloj.
let _byCuentaAntes=null;
function byAnimarCuenta(){
  const n=G.by.corral,de=_byCuentaAntes;_byCuentaAntes=n;
  const elc=document.getElementById('by-cuenta');
  if(!elc||de==null||de<=n||typeof requestAnimationFrame!=='function')return;
  const t0=Date.now(),dur=450;
  const paso=()=>{const k=Math.min(1,(Date.now()-t0)/dur),v=Math.round(de-(de-n)*k);elc.textContent=String(v);if(k<1)requestAnimationFrame(paso);};
  requestAnimationFrame(paso);
}
window.byBotonAccion=id=>{const r=byHacer(id);if(r==='silla'){byTerminar();G.screen='byEnd';}render();};
window.byBotonPalanca=id=>{byPalanca(id);render();};
window.byALaLinea=()=>{const b=G.by;b.aviso=null;b.bitacora=null;_byCuentaAntes=null;byALaLineaLogica();G.screen='byBell';render();window.scrollTo(0,0);};

// El final: solo hay un ganador; la puntuación son las vueltas (§ 27).
function renderByEnd(){
  const el=$main();hideChrome();
  const b=G.by;if(!b||!b.result){G.screen='byPre';render();return;}
  const r=b.result,gana=r.kind==='gana';
  el.innerHTML=`<div class="pz">
    <div class="pz-franja ${gana?'podio':r.kind==='nadie'?'negativo':'dnf'}">
      <div class="pz-franja-sub" style="margin:0 0 4px">🔔 ${BY_EVENTOS[b.dif].label} · ${esc(b.name)}</div>
      <div class="pz-franja-num">${r.laps}</div>
      <div class="pz-franja-sub">${r.laps===1?'vuelta':'vueltas'} · ${Math.round(r.laps*BY_KM_VUELTA)} km · ${gana?'último en pie':'DNF'}</div>
    </div>
    <p style="line-height:1.6">${esc(r.why)}</p>
    ${b.record?`<div class="pz-diag mas"><b>Nuevo récord personal</b> en un backyard ${BY_EVENTOS[b.dif].label.toLowerCase()}.</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Lo último</div>
    <div class="pz-tarjeta">${b.log.slice(-5).map(x=>`<div class="pz-efectos" style="margin-bottom:3px">${esc(x.t)}</div>`).join('')}</div>
    <button class="pz-btn" onclick="G.by=null;G.screen='byPre';render();window.scrollTo(0,0)">Otra tirada</button>
    <button class="pz-btn sec" onclick="G.by=null;backToMainMenu()">← Menú principal</button>
  </div>`;
}

function byPanelEstado(){
  const b=G.by;
  return `<div class="pz-tarjeta" style="margin-top:14px">
    ${byBarra('Piernas',b.piernas)}${byBarra('Energía',b.energia)}${byBarra('Lucidez',b.lucidez)}
    <div class="pz-efectos" style="margin-top:4px">🦶 ${BY_PIES[b.pies]} · ${byAnimoTxt(b.animo)}</div>
  </div>`;
}

MODE_ROUTES.backyard={
  byMenu:renderByMenu, byPre:renderByPre, byBell:renderByBell,
  byLoop:renderByLoop, byCorral:renderByCorral, byEnd:renderByEnd,
};
