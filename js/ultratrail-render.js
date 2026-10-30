// ══════════════════════════════════════
//  ULTRATRAIL — pantallas de la carcasa (la lógica, en ultratrail.js)
// ══════════════════════════════════════
// utNueva → utHub (pantalla madre) ─┬─ utObjetivos   calendario, tres botones por carrera
//                                   ├─ utFase → utTirada   el plan de la fase y la tirada larga
//                                   ├─ utRecup             recuperación con tres salidas (§ 10)
//                                   ├─ utPiedras           piedras, índice y sorteo (§ 8)
//                                   ├─ utMaterial          armario, no tienda (§ 12)
//                                   ├─ utReco              reconocer sectores de una carrera (§ 5)
//                                   └─ [backyard en otoño] → byBell … byEnd (backyard-render.js, § 26)
// Al final (§ 16): utTemporada → utEpilogo → la cuenta pendiente (utPre…), utProyecto o utMontar
// → utFinal, el resumen de toda la carrera deportiva.
//                                   ├─ utFinanzas
//                                   └─ [objetivo] → utPre → utBloque/utBolsa → utFin (ultra-render.js)
// utTemporada: el cierre de cada año. Maqueta aprobada el 2026-10-30 (TG-Orden § Paso 5).
// La pantalla madre no es el calendario (§ 13): es la línea de tiempo hacia el próximo objetivo.
// Piezas pz-* y clases ut-* (index.html), sin hex.

const UT_EJES=[['base','Base'],['encaje','Encaje'],['estomago','Estómago'],['nocturna','Nocturna'],['termica','Térmica']];
// Iconos de línea de las cinco preparaciones (tipo de la maqueta del hub).
const UT_PREP_ICO={
  base:'<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  encaje:'<path d="M3 18l6-9 4 5 3-4 5 8z"/>',
  estomago:'<circle cx="12" cy="12" r="7"/><path d="M9 12h6"/>',
  nocturna:'<path d="M20 14A8 8 0 1110 4a6 6 0 0010 10z"/>',
  termica:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
};
// Las preparaciones como semáforo contra el próximo objetivo (§ 7): sin número; al tocar, el número.
function utPrepsHTML(r){
  const u=G.ut,sem=r?utSemaforo(r):UT_PREPS.map(([k,label])=>({k,label,v:Math.round(u.prep[k]),pide:null,color:''}));
  return `<div class="pz-tarjeta" onclick="G._utVerPrep=!G._utVerPrep;render()">
    <div class="pz-label" style="margin-bottom:10px">${r?`Preparación para ${esc(r.name)}`:'Preparación'}</div>
    <div class="ut-preps">${sem.map(x=>`<div class="ut-prep ${x.color}"><div class="circ"><svg viewBox="0 0 24 24">${UT_PREP_ICO[x.k]}</svg></div>
      <div class="nom">${x.label}</div>${G._utVerPrep?`<div class="ut-prep-n pz-num">${x.v}${x.pide!=null?` / ${x.pide}`:''}</div>`:''}</div>`).join('')}</div>
    ${G._utVerPrep?'':'<div class="pz-efectos ut-tocar">Toca para ver los números</div>'}
  </div>`;
}
// Lo que más falta, en una frase (§ 28: enseña lo que te falta, no el número).
function utConsejoPrep(r){
  const peor=utSemaforo(r).filter(x=>x.color==='menos').sort((a,b)=>(a.v/a.pide)-(b.v/b.pide))[0];
  if(!peor)return '';
  const como={base:'kilómetros tranquilos en la base',encaje:'bajadas largas en la fase específica',estomago:'comer corriendo en las tiradas',
    nocturna:'entrenos de noche en la fase específica',termica:'una concentración de calor y altura'}[peor.k];
  return `<div class="pz-consejo">${icono('bombilla')}<div><b>${peor.label}, en rojo.</b> ${esc(r.name)} pide ${peor.pide} y tienes ${peor.v}. Lo que más la sube: ${como}.</div></div>`;
}

function utFilaNav(txt,dato,onclick){return `<div class="pz-fila navega" onclick="${onclick}"><div class="pz-fila-txt">${txt}</div><div class="pz-fila-dato">${dato}</div></div>`;}
function utPerfilCarrera(r){return `${r.km} km · ${fmtMiles(r.dplus)} m+ · ${r.noches===2?'dos noches':r.noches?'una noche':'de día'}`;}

// ── Partida nueva ──────────────────────
function renderUtNueva(){
  const el=$main();hideChrome();
  const sel=G._utNueva||(G._utNueva={perfil:'rodador',edad:30,nombre:'',alucina:'pantalla',tenso:false});
  el.innerHTML=`<div class="pz">
    <div class="pz-franja cierre">
      <div class="pz-franja-sub" style="margin:0 0 4px">🏔 Ultratrail</div>
      <div class="pz-franja-num" style="font-size:44px">Otra vida</div>
      <div class="pz-franja-sub">Quince temporadas de ultras con un trabajo de jornada completa.</div>
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Tu nombre</div>
    <input type="text" id="ut-nombre" maxlength="30" placeholder="Nombre del corredor" value="${esc(sel.nombre)}" oninput="G._utNueva.nombre=this.value" style="width:100%">
    <div class="pz-label" style="margin:14px 0 6px">Cómo corres</div>
    ${UT_PERFILES.map(p=>`<button class="pz-opcion${sel.perfil===p.id?' sel':''}" onclick="G._utNueva.perfil='${p.id}';render()"><b>${p.label}</b><div class="pz-efectos">${esc(p.desc)}</div></button>`).join('')}
    <div class="pz-label" style="margin:14px 0 6px">Con cuántos años debutas</div>
    <div class="ut-edades">${UT_EDADES.map(e=>`<button class="pz-opcion sin-check${sel.edad===e?' sel':''}" onclick="G._utNueva.edad=${e};render()"><span class="pz-num">${e}</span></button>`).join('')}</div>
    <p class="pz-efectos">No vienes de nada: vienes de otra vida. Como ultrafondista, lo mejor llega entre los 36 y los 42.</p>
    <div class="pz-label" style="margin:14px 0 6px">Alucinaciones</div>
    <div class="ut-vol">${[['diario','En el diario'],['pantalla','En pantalla'],['todas','Todas']].map(([k,l])=>`<button class="pz-opcion sin-check${sel.alucina===k?' sel':''}" onclick="G._utNueva.alucina='${k}';render()"><b>${l}</b></button>`).join('')}</div>
    <div class="pz-efectos" style="margin-bottom:8px">De noche, con la cabeza ida. ${sel.alucina==='diario'?'Solo líneas que no son verdad en lo que te va pasando.':sel.alucina==='pantalla'?'Bajo 20 de lucidez, además, el margen y el kilómetro mienten.':'Bajo 10, además, el puesto miente, alguien te adelanta sin existir y ves avituallamientos que no están.'} Siempre te lo avisa un 👁.</div>
    <div class="pz-tarjeta ut-filas">
      <div class="pz-fila"><span class="pz-fila-txt"><b>Modo tenso en el backyard</b><div class="pz-efectos">El corral corre en tiempo real: un minuto por segundo.</div></span><input type="checkbox" class="pz-interruptor" ${sel.tenso?'checked':''} onchange="G._utNueva.tenso=this.checked"></div>
    </div>
    <button class="pz-btn" style="margin-top:12px" onclick="utEmpezar()">Empezar la primera temporada →</button>
    <button class="pz-btn sec" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}
window.utEmpezar=()=>{
  const p=G._utNueva||{};
  utNueva({nombre:document.getElementById('ut-nombre')?.value??p.nombre,perfil:p.perfil,edad:p.edad,alucina:p.alucina,tenso:p.tenso});
  G._utNueva=null;G.screen='utHub';autoSave();render();window.scrollTo(0,0);
};

// ── La pantalla madre ──────────────────
function utLineaTiempo(ci){
  const u=G.ut;
  const pos=Math.max(0,Math.min(100,(u.semana-ci.desde)/ci.total*100));
  return `<div class="ut-linea">
      ${ci.fases.map(f=>`<div class="ut-f-${f.id}" style="flex:${f.hasta-f.desde}">${f.hasta-f.desde>=2?f.label:''}</div>`).join('')}
      <div class="ut-hoy" style="left:${pos}%"></div>
    </div>
    <div class="ut-sem"><span>${ci.actual.label} · semana ${u.semana-ci.actual.desde+1} de ${ci.actual.hasta-ci.actual.desde}</span><span>semana ${ci.obj.semana} 🏁</span></div>`;
}
function utTarjetaObjetivo(ci){
  const u=G.ut;
  if(ci.fase==='recuperacion'){
    const ult=u.historial[u.historial.length-1],n=ci.hasta-u.semana;
    return `<div class="pz-tarjeta">
      <span class="pz-etiqueta fam-cuerpo">Recuperación</span>
      <div class="pz-titulo">${ult?esc(ult.name):'Descanso'}</div>
      <div class="pz-sub" style="margin-bottom:0">Te ${n===1?'queda una semana':`quedan ${n} semanas`} para estar entero.${ci.obj?` Después, el ciclo hacia ${esc(utDef(ci.obj.id).name)}.`:''}</div>
    </div>`;
  }
  if(ci.fase==='backyard'){const dif=BY_EVENTOS[utBackyardDif()];return `<div class="pz-tarjeta">
      <span class="pz-etiqueta acento">Esta semana</span>
      <div class="pz-titulo">Backyard ${esc(dif.label.toLowerCase())}</div>
      <div class="pz-sub" style="margin-bottom:0">${dif.n} corredores en ${esc(BY_LUGAR)}. Una vuelta cada hora hasta que quede uno: el examen de todo lo que has entrenado.</div>
    </div>`;}
  if(ci.fase==='libre')return `<div class="pz-tarjeta">
      <span class="pz-etiqueta acento">Sin objetivo</span>
      <div class="pz-titulo">Elige a qué vas</div>
      <div class="pz-sub" style="margin-bottom:0">Sin una carrera en el horizonte solo pasan las semanas. Mira el calendario del año en «Objetivos».</div>
    </div>`;
  const r=utDef(ci.obj.id),faltan=ci.obj.semana-u.semana;
  return `<div class="pz-tarjeta">
    <span class="pz-etiqueta fam-carrera">${ci.fase==='carrera'?'Esta semana':'Próximo objetivo'}</span>
    <div class="pz-titulo">${esc(r.name)}</div>
    <div class="pz-sub" style="margin-bottom:4px">${utPerfilCarrera(r)} · sale a las ${r.salida}:00${faltan>0?` · <b>faltan ${faltan} semana${faltan===1?'':'s'}</b>`:''}</div>
    ${ci.fase==='carrera'?'':utLineaTiempo(ci)}
  </div>`;
}
function renderUtHub(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u){G.screen='utNueva';render();return;}
  if(u.retirado){G.screen='utFinal';render();return;}
  if(u.final&&!u.final.hecho){G.screen='utEpilogo';render();return;}
  if(u.semana>UT_SEMANAS){G.screen='utTemporada';render();return;}
  const ci=utCiclo(),r=G.runner,trabajo=utEscalon();
  const boton=ci.fase==='backyard'?'Al backyard: la primera campana suena a las siete →'
    :ci.fase==='carrera'?`A la salida de ${esc(utDef(ci.obj.id).name)} →`
    :ci.fase==='recuperacion'?`Cómo recuperar · ${ci.hasta-u.semana} semana${ci.hasta-u.semana===1?'':'s'} →`
    :ci.fase==='libre'?(u.semana+4>UT_SEMANAS?'Cerrar la temporada →':'Pasar cuatro semanas →')
    :`Decidir la fase de ${ci.actual.label.toLowerCase()} · ${ci.actual.hasta-u.semana} semana${ci.actual.hasta-u.semana===1?'':'s'} →`;
  const g=utGrandes(),max=utMaxGrandes(u.temporada);
  el.innerHTML=`<div class="pz">
    <div class="ut-top"><span><b>Ultratrail</b> · Temporada ${u.temporada} · ${r.age} años</span><span>Semana ${u.semana}</span></div>
    <div class="ut-recursos">
      <div><div class="pz-label">Dinero</div><div class="pz-num ut-dinero${u.dinero<0?' pz-menos':''}">${fmtEur(u.dinero)}</div></div>
      <div><div class="pz-label ut-carga-l"><span>Carga</span><span class="pz-num">${Math.round(u.carga)} %</span></div>
        <div class="pz-barra"><div class="pz-relleno${u.carga>=95?' menos':u.carga>70?' ojo':''}" style="width:${Math.round(u.carga)}%"></div><div class="pz-umbral" style="left:70%"></div></div>
        <div class="pz-efectos ut-trabajo">${trabajo.label} · ${trabajo.horas} h/sem</div></div>
    </div>
    ${utTarjetaObjetivo(ci)}
    ${utPrepsHTML(ci.obj?utDef(ci.obj.id):null)}
    ${ci.obj&&ci.fase!=='carrera'?utConsejoPrep(utDef(ci.obj.id)):''}
    ${u.carga>70?`<div class="pz-diag ${u.carga>=95?'menos':'ojo'}">${u.carga>=95?'Carga al límite: un paso más y te lesionas.':'Llevas tiempo acumulando: las adaptaciones se están estancando.'}</div>`:''}
    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:8px">${esc(r.name)} · rendimiento</div>
      <div class="ut-stats">${[['velocidad','Velocidad'],['subida','Subida'],['bajada','Bajada'],['resistencia','Resistencia'],['mental','Mental']]
        .map(([k,l])=>`<div><div class="pz-num">${Math.round(r.stats[k])}</div><span>${l}</span></div>`).join('')}</div>
      <div class="pz-efectos ut-vet">Veteranía <b class="pz-num">${Math.round(u.veterania||0)}</b>${(u.secuelas||[]).length?` · ${u.secuelas.length} secuela${u.secuelas.length===1?'':'s'}`:''}</div>
    </div>
    ${consejoHTML('ut_hub','Aquí el tiempo va por fases.','Cada objetivo abre un ciclo hacia él: base, específico y afinado. El botón de abajo avanza una fase entera; las semanas de en medio corren solas.')}
    ${u.diario.length?`<div class="pz-tarjeta">${u.diario.slice(-3).reverse().map(d=>`<div class="pz-diag">${esc(d.txt)}</div>`).join('')}</div>`:''}
    <button class="pz-btn" onclick="utBoton()">${boton}</button>
    <div class="pz-tarjeta ut-filas">
      ${utFilaNav('Objetivos del año',`${g} de ${max} grandes`,"G.screen='utObjetivos';render();window.scrollTo(0,0)")}
      ${utFilaNav('Piedras y sorteo',`${utPiedrasActivas()} · ${Math.round(utProbSorteo(utPiedrasActivas())*100)} %`,"G.screen='utPiedras';render();window.scrollTo(0,0)")}
      ${utFilaNav('Material',u.material.zapatillasKm>=UT_ZAPAS_VIDA?'<span class="pz-menos">zapatillas gastadas</span>':`zapatillas ${u.material.zapatillasKm} km`,"G._utMatVuelta='utHub';G.screen='utMaterial';render();window.scrollTo(0,0)")}
      ${utFilaNav('Finanzas',`${fmtEur(trabajo.sobrante,true)}/mes`,"G.screen='utFinanzas';render();window.scrollTo(0,0)")}
      ${utFilaNav('Guardar partida',G._saveSlot!=null?`ranura ${G._saveSlot+1}`:'sin ranura','openSaveScreen()')}
      ${utFilaNav('Menú principal','','backToMainMenu()')}
    </div>
  </div>`;
}
window.utBoton=()=>{
  const ci=utCiclo();
  if(ci.fase==='backyard'){if(utEmpezarBackyard()){G.screen='byBell';autoSave();render();window.scrollTo(0,0);}return;}
  // Las fases y la recuperación tienen su pantalla de decisión; lo demás avanza directo
  if(['base','especifico','afinado'].includes(ci.fase)){G._utFase={fase:ci.fase,plan:null,vol:'normal'};G.screen='utFase';render();window.scrollTo(0,0);return;}
  if(ci.fase==='recuperacion'){G.screen='utRecup';render();window.scrollTo(0,0);return;}
  const r=utAvanzar();
  G.screen=r==='carrera'?'utPre':r==='temporada'?'utTemporada':'utHub';
  if(r==='carrera')G._utPre=null;
  autoSave();render();window.scrollTo(0,0);
};
// Del backyard (byEnd) al plan.
window.utVolverDeBackyard=()=>{utCerrarBackyard();G.screen='utHub';autoSave();render();window.scrollTo(0,0);};
// Al acabar una fase o una recuperación: a la carrera, al cierre de año o al hub.
function utTrasAvanzar(r){
  G._utFase=null;
  G.screen=r==='carrera'?'utPre':r==='temporada'?'utTemporada':'utHub';
  if(r==='carrera')G._utPre=null;
  autoSave();render();window.scrollTo(0,0);
}

// ── El plan de la fase (§ 6, una decisión por fase) ──
function utChipsGana(gana,vol){
  return Object.entries(gana).filter(([,v])=>Math.round(v*vol)!==0).map(([k,v])=>{const d=Math.round(v*vol);
    return `<span class="pz-chip ${d>0?'mas':'menos'}">${UT_PREPS.find(p=>p[0]===k)[1]} ${d>0?'+':''}${d}</span>`;}).join('');
}
function renderUtFase(){
  const el=$main();hideChrome();
  const u=G.ut,ci=utCiclo(),f=G._utFase;
  if(!u||!f||f.fase!==ci.fase||!ci.actual){G.screen='utHub';render();return;}
  const n=ci.actual.hasta-u.semana,r=utDef(ci.obj.id),af=ci.fase==='afinado';

  el.innerHTML=`<div class="pz">
    <span class="pz-etiqueta fam-cuerpo">${ci.actual.label} · ${n} semana${n===1?'':'s'}</span>
    <div class="pz-titulo">Hacia ${esc(r.name)}</div>
    <div class="pz-sub">${af?'Las últimas semanas: lo que se construyó ya está. Ahora se trata de llegar entero.'
      :ci.fase==='base'?'Volumen y fondo. Lo que construyas aquí tarda en irse.':'Imitas lo que pide esta carrera en concreto.'}</div>
    ${utPrepsHTML(r)}
    <div class="pz-label" style="margin:14px 0 6px">El plan</div>
    ${UT_PLANES[ci.fase].map(p=>{const caro=p.coste&&u.dinero<p.coste,sim=utSimularFase(ci.fase,p.id,f.vol,n);
      const dCarga=Math.round(sim.carga-u.carga);
      return `<button class="pz-opcion${f.plan===p.id?' sel':''}${caro?' pz-bloqueado':''}" ${caro?'':`onclick="G._utFase.plan='${p.id}';render()"`}>
        <b>${p.label}</b>${p.coste?` <span class="pz-ojo">${fmtEur(p.coste)}</span>`:''}<div class="pz-efectos">${p.desc}</div>
        <div style="margin-top:6px">${utChipsGana(sim.prep,1)}<span class="pz-chip ${sim.carga>70?'menos':dCarga>0?'ojo':'mas'}">carga ${Math.round(u.carga)} → ${Math.round(sim.carga)}</span></div>
        ${caro?motivoHTML('No te llega el dinero'):''}</button>`;}).join('')}
    ${af?'':`<div class="pz-label" style="margin:14px 0 6px">Volumen</div>
    <div class="ut-vol">${Object.entries(UT_VOLUMEN).map(([k,v])=>`<button class="pz-opcion sin-check${f.vol===k?' sel':''}" onclick="G._utFase.vol='${k}';render()"><b>${v.label}</b></button>`).join('')}</div>
    <div class="pz-efectos">Más volumen sube más y carga más. Con la carga por encima de 70 el cuerpo deja de absorber.</div>`}
    ${utAbsorbe()<1?`<div class="pz-diag ojo">Vienes con la carga en ${Math.round(u.carga)}: esta fase absorberá menos.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" ${f.plan?'onclick="utConfirmarFase()"':'disabled'}>${f.plan?(utTocaTirada()?'Empezar la fase →':'Hacer la fase →'):'Elige un plan'}</button>
    <button class="pz-btn sec" onclick="G._utFase=null;G.screen='utHub';render()">← Volver</button>
  </div>`;
}
window.utConfirmarFase=()=>{
  const f=G._utFase;if(!f||!f.plan)return;
  if(utTocaTirada()){G.screen='utTirada';render();window.scrollTo(0,0);return;}
  const r=utHacerFase(f.plan,f.vol,null);
  if(r==='sin_dinero'){showToast('No te llega el dinero para ese plan');return;}
  utTrasAvanzar(r);
};
// La tirada larga (§ 6): a mitad de fase, una decisión con su riesgo.
function renderUtTirada(){
  const el=$main();hideChrome();
  const f=G._utFase;if(!G.ut||!f||!f.plan){G.screen='utHub';render();return;}
  el.innerHTML=`<div class="pz">
    <div class="pz-franja transicion">
      <div class="pz-franja-sub" style="margin:0 0 4px">A mitad de la fase</div>
      <div class="pz-franja-num" style="font-size:40px">La tirada larga</div>
      <div class="pz-franja-sub">Cinco o seis horas en la montaña. ¿Cómo la haces?</div>
    </div>
    ${UT_TIRADA.map(t=>`<button class="pz-opcion" onclick="utHacerTirada('${t.id}')"><b>${t.label}</b><div class="pz-efectos">${t.desc}</div>
      <div style="margin-top:6px">${utChipsGana(t.gana,1)}${t.mental?`<span class="pz-chip mas">Mental +${t.mental}</span>`:''}${t.riesgo>=0.07?'<span class="pz-chip ojo">más riesgo</span>':''}</div></button>`).join('')}
    ${G.ut.carga>60?'<div class="pz-diag ojo">Con la carga que llevas, el riesgo de un mal paso se dobla.</div>':''}
  </div>`;
}
window.utHacerTirada=id=>{
  const f=G._utFase;if(!f)return;
  const r=utHacerFase(f.plan,f.vol,id);
  if(r==='sin_dinero'){showToast('No te llega el dinero para ese plan');G.screen='utFase';render();return;}
  utTrasAvanzar(r);
};
// Recuperación cruzada (§ 10): tres salidas; volver antes está permitido y el juego avisa.
function renderUtRecup(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u||u.semana>=u.recuperaHasta){G.screen='utHub';render();return;}
  const n=u.recuperaHasta-u.semana,ult=u.historial[u.historial.length-1];
  el.innerHTML=`<div class="pz">
    <span class="pz-etiqueta fam-cuerpo">Recuperación · ${n} semana${n===1?'':'s'}</span>
    <div class="pz-titulo">${ult?`Después de ${esc(ult.name)}`:'Recuperar'}</div>
    <div class="pz-sub">No es un bloqueo: es una decisión. El cuerpo necesita ${n} semana${n===1?'':'s'}.</div>
    ${UT_RECUPERACION.map(o=>{const sem=o.id==='volver'?0:Math.max(1,Math.ceil(n*o.semanas));
      return `<button class="pz-opcion" onclick="utElegirRecup('${o.id}')"><b>${o.label}</b><div class="pz-efectos">${o.desc}</div>
      <div style="margin-top:6px"><span class="pz-chip ${o.id==='reposo'?'mas':o.id==='volver'?'ojo':''}">${sem?`${sem} semana${sem===1?'':'s'}`:'ya'}</span>${o.pierdeX>1?'<span class="pz-chip menos">preparaciones bajan</span>':o.id==='cruzado'?'<span class="pz-chip mas">se mantienen</span>':''}${o.riesgo?'<span class="pz-chip menos">riesgo de secuela</span>':''}</div></button>`;}).join('')}
    ${(u.secuelas||[]).length?`<div class="pz-diag menos">Secuelas: ${u.secuelas.map(x=>esc(x.txt)).join(', ')}. No se van.</div>`:''}
    <button class="pz-btn sec" onclick="G.screen='utHub';render()">← Volver</button>
  </div>`;
}
window.utElegirRecup=id=>{utTrasAvanzar(utRecuperar(id));};
window.utVolverDeCarrera=()=>{
  const f=G.ut.final;
  if(f&&!f.hecho){if(f.tipo==='cuenta')utCerrarCuenta();else utCerrarReferencia();G.screen='utFinal';}
  else{utCerrarCarrera();G.screen='utHub';}
  autoSave();render();window.scrollTo(0,0);
};

// ── Objetivos del año (§ 4 y § 13) ─────
function utTarjetaBackyard(cal){
  const u=G.ut,p=utPlan('backyard'),hist=u.historial.find(h=>h.t===u.temporada&&h.id==='backyard'),no=utNoPuedeBackyard();
  const dif=BY_EVENTOS[utBackyardDif()];
  return `<div class="pz-tarjeta">
    <span class="pz-etiqueta acento">Invitación · no ocupa plaza</span>
    <div class="ut-carr-cab"><div class="pz-titulo">Backyard ${esc(dif.label.toLowerCase())}</div><span class="ut-mes">${utMes(cal.semana)}</span></div>
    <div class="pz-sub" style="margin:2px 0 6px">${BY_KM_VUELTA.toString().replace('.',',')} km cada hora en punto hasta que quede uno · ${dif.n} corredores · suele llegar a ${dif.suele}</div>
    <div class="pz-efectos" style="margin-bottom:8px">El examen de las cinco preparaciones a la vez. No da piedras; da veteranía como nada. Una semana de recuperación por cada diez vueltas.</div>
    ${hist?`<div class="pz-diag ${hist.kind==='gana'?'mas':''}">${hist.kind==='gana'?'Último en pie':'DNF'} · ${hist.laps} vueltas</div>`
      :p?`<div class="pz-diag ojo">Aceptada: semana ${cal.semana}.</div><button class="pz-btn sec ut-quitar" onclick="utQuitar('backyard')">Ya no voy</button>`
      :`<button class="pz-btn" ${no?'disabled':'onclick="utBackyardSi()"'}>Aceptar la invitación · viaje ${utEscalon().viajes?'pagado':fmtEur(UT_BACKYARD.viaje)}</button>${no?motivoHTML(esc(no)):''}`}
  </div>`;
}
window.utBackyardSi=()=>{if(utAceptarBackyard()){autoSave();render();}};
function utTarjetaCarrera(cal){
  if(cal.backyard)return utTarjetaBackyard(cal);
  const u=G.ut,r=utDef(cal.id),p=utPlan(cal.id),ex=utExigencia(r);
  const hist=u.historial.find(h=>h.t===u.temporada&&h.id===cal.id);
  const pasada=cal.semana<u.semana||(cal.semana===u.semana&&!utObjetivoHoy());
  const tag=hist?(hist.kind==='finisher'?'<span class="pz-etiqueta fam-carrera">Finisher</span>':'<span class="pz-etiqueta acento">No terminada</span>')
    :p?.tipo==='correr'?'<span class="pz-etiqueta fam-carrera">Inscrito</span>'
    :p?.tipo==='ver'?`<span class="pz-etiqueta fam-gente">${p.hecho?'Fuiste a verla':'Vas a verla'}</span>`
    :p?.tipo==='voluntario'?`<span class="pz-etiqueta fam-gente">${p.hecho?'Fuiste de voluntario':'De voluntario'}</span>`:'';
  const cab=`<div class="ut-carr-cab"><div class="pz-titulo">${esc(r.name)}</div><span class="ut-mes">${utMes(cal.semana)}</span></div>`;
  if(cal.cancelada)return `<div class="pz-tarjeta pz-bloqueado">${cab}${motivoHTML(`Cancelada este año: ${esc(cal.motivo)}`)}</div>`;
  const sub=`<div class="pz-sub" style="margin:2px 0 0">${utPerfilCarrera(r)} · ${UT_TIPO_LABEL[r.tipo]}${cal.sede?` · este año en ${esc(cal.sede)}`:''} · semana ${cal.semana}</div>`;
  const ejes=`<div class="ut-exig">${UT_EJES.map(([k,l])=>`<div><div class="pz-barra"><div class="pz-relleno" style="width:${ex[k]}%"></div></div><span>${l}</span></div>`).join('')}</div>`;
  let pie='';
  if(hist)pie=`<div class="pz-diag ${hist.kind==='finisher'?'mas':'ojo'}">${hist.kind==='finisher'?`${ultraDur(hist.tiempo)} · ${hist.pos}.º de ${hist.finishers}${hist.variante?' *':''}`:`Te quedaste en el km ${hist.km}`}</div>`;
  else if(p&&!p.hecho){
    const sol=p.tipo==='correr'?utSolape(cal.id):null;
    pie=`${sol?`<div class="pz-diag ojo">${esc(sol)}</div>`:''}
      ${p.tipo!=='correr'?`<div class="pz-efectos" style="margin-bottom:8px">El viaje (${fmtEur(r.viaje)}) se paga ese fin de semana.</div>`:''}
      <button class="pz-btn sec ut-quitar" onclick="utQuitar('${cal.id}')">${p.tipo==='correr'?'Anular la inscripción (no se devuelve)':'Ya no voy'}</button>`;
  }else if(!pasada&&!p&&r.major){
    const s=u.sorteo,ns=utNoPuedeSolicitar(),na=utNoPuedeApuntarse(cal.id);
    pie=`${s?`<div class="pz-diag ${s.estado==='fuera'?'menos':'ojo'}">${s.estado==='solicitado'?`Sorteo solicitado: se sortea en la semana ${UT_SORTEO_PLAZO+1}.`:s.estado==='espera'?`En lista de espera: semana ${UT_SORTEO_ESPERA}.`:'Este año no entras.'}</div>`
        :`<div class="pz-diag ${utPiedrasActivas()?'ojo':'menos'}">${esc(utFraseSorteo())}</div>`}
      <div class="ut-3btn">
        <button class="pz-btn" ${ns?'disabled':`onclick="utSorteo()"`}>Sorteo</button>
        <button class="pz-btn sec" ${na?'disabled':`onclick="utApuntar('${cal.id}','ver')"`}>Ir a verla</button>
        <button class="pz-btn sec" ${na?'disabled':`onclick="utApuntar('${cal.id}','voluntario')"`}>Voluntario</button>
      </div>
      <div class="pz-efectos" style="margin-top:6px">Inscripción ${fmtEur(r.inscripcion)} si entras · viaje ${fmtEur(r.viaje)}. De voluntario, dorsal reservado el año que viene.</div>
      ${ns&&!s?motivoHTML(esc(ns)):''}`;
  }else if(!pasada&&!p){
    const nc=utNoPuedeInscribirse(cal.id),na=utNoPuedeApuntarse(cal.id);
    pie=`<div class="ut-3btn">
        <button class="pz-btn" ${nc?'disabled':`onclick="utInscribir('${cal.id}')"`}>Correrla</button>
        <button class="pz-btn sec" ${na?'disabled':`onclick="utApuntar('${cal.id}','ver')"`}>Ir a verla</button>
        <button class="pz-btn sec" ${na?'disabled':`onclick="utApuntar('${cal.id}','voluntario')"`}>Voluntario</button>
      </div>
      <div class="pz-efectos" style="margin-top:6px">Inscripción ${fmtEur(r.inscripcion)} · viaje ${utEscalon().viajes?'lo paga la marca':fmtEur(r.viaje)}${utChaquetaObligatoria(r)?' · chaqueta obligatoria':''}</div>
      ${nc?motivoHTML(esc(nc)):''}`;
  }else if(pasada)pie=`<div class="pz-efectos">Ya se corrió.</div>`;
  const rc=utRecoResumen(r);
  const reco=pasada?'':`<div class="ut-reco"><span class="pz-efectos">Recorrido: conoces ${rc.conocidos} de ${rc.total} sectores${rc.vistos>rc.conocidos?` (y has visto ${rc.vistos-rc.conocidos} más)`:''}</span>
    <button class="pz-btn sec ut-quitar" onclick="G._utReco='${cal.id}';G.screen='utReco';render();window.scrollTo(0,0)">Reconocer</button></div>`;
  return `<div class="pz-tarjeta${pasada&&!hist&&!p?' ut-pasada':''}">${tag}${cab}${sub}${ejes}${pie}${reco}</div>`;
}
function renderUtObjetivos(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u){G.screen='utNueva';render();return;}
  const g=utGrandes(),max=utMaxGrandes(u.temporada);
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Objetivos de la temporada ${u.temporada}</div>
    <div class="pz-sub">Puedes correr hasta ${max} grandes este año. Llevas ${g}. Ir a verla o de voluntario cuesta el viaje y un fin de semana sin entrenar.</div>
    ${u.calendario.map(utTarjetaCarrera).join('')}
    <button class="pz-btn sec" onclick="G.screen='utHub';render();window.scrollTo(0,0)">← Volver</button>
  </div>`;
}
window.utSorteo=()=>{if(utSolicitarSorteo()){autoSave();render();}};
window.utInscribir=id=>{if(utInscribirse(id)){autoSave();render();}};
window.utApuntar=(id,tipo)=>{if(utApuntarse(id,tipo)){autoSave();render();}};
window.utQuitar=id=>{
  const p=utPlan(id);if(!p)return;
  if(p.tipo==='correr'&&!confirm('¿Anular la inscripción? El dinero no se devuelve.'))return;
  if(utQuitarPlan(id)){autoSave();render();}
};

// ── Piedras, índice y sorteo (§ 8) ─────
function renderUtPiedras(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u){G.screen='utNueva';render();return;}
  const act=utPiedrasActivas(),dorm=u.piedras.saldo-act,p=utProbSorteo(act),ix=utIndice(),m=utMajor()||ULTRA_RACES.find(r=>r.major);
  const cats=[['preparacion','Preparación'],['100k','100 km'],['100m','100 millas']].map(([k,l])=>[l,utIndice(k)]);
  const intentos=u.sorteos.filter(x=>x.id===m.id);
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Piedras y sorteo</div>
    <div class="pz-sub">${esc(m.name)} se corre por sorteo. Cada piedra es tu nombre una vez más en la lotería.</div>
    <div class="pz-tarjeta">
      <div class="ut-dos">
        <div><div class="pz-label">Piedras activas</div><div class="pz-num ut-grande">${act}</div>${dorm>0?`<div class="pz-efectos">+${dorm} dormidas</div>`:''}</div>
        <div><div class="pz-label">En el sorteo</div><div class="pz-num ut-grande">${Math.round(p*100)} %</div></div>
      </div>
      <div class="pz-diag ${act?'ojo':'menos'}">${esc(utFraseSorteo())}</div>
    </div>
    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:6px">Índice de rendimiento</div>
      <div class="pz-num ut-grande">${ix.valido?ix.valor:'—'}</div>
      <div class="pz-efectos">${ix.valido?`Tus mejores resultados de los últimos tres años. Con ${UT_INDICE_CORTESIA} o más, ${esc(m.name)} te da dorsal sin sorteo.`
        :ix.n?'Caducado: ningún resultado en los dos últimos años.':'Sin resultados todavía: termina una carrera.'}</div>
      <div class="ut-filas" style="padding:0;margin-top:6px">${cats.map(([l,c])=>`<div class="pz-fila"><span class="pz-fila-txt">${l}</span><span class="pz-fila-dato">${c.valido?c.valor:'—'}</span></div>`).join('')}</div>
    </div>
    ${consejoHTML('ut_sorteo','Tres puertas además de la lotería.',`Si no sale tu nombre, quedas en lista de espera (semana ${UT_SORTEO_ESPERA}). Con un índice alto, dorsal de cortesía. Y si vas de voluntario, el año siguiente tienes dorsal reservado. Al entrar por sorteo se gastan todas las piedras.`)}
    ${intentos.length?`<div class="pz-label" style="margin:14px 0 6px">${esc(m.name)}, año a año</div>
    <div class="pz-tarjeta ut-filas">${intentos.map(x=>`<div class="pz-fila"><span class="pz-fila-txt">Temporada ${x.t}</span><span class="pz-fila-dato ${x.entro?'pz-mas':''}">${x.entro?{sorteo:'Sorteo',espera:'Lista de espera',indice:'Índice',voluntario:'Voluntario'}[x.via]||'Dentro':'No'}</span></div>`).join('')}</div>`:''}
    <button class="pz-btn sec" onclick="G.screen='utHub';render();window.scrollTo(0,0)">← Volver</button>
  </div>`;
}

// ── Material (§ 12): armario, no tienda ──
function renderUtMaterial(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u){G.screen='utNueva';render();return;}
  const gratis=utEscalon().materialGratis,vuelta=G._utMatVuelta||'utHub';
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Material</div>
    <div class="pz-sub">${gratis?'La marca te da lo que pidas.':'La decisión buena es cuánto llevas: ligero es rápido, pero te expone al frío y a la noche.'}</div>
    ${UT_MATERIAL.map(it=>{const tiene=utTiene(it.id),no=utNoPuedeComprar(it.id);
      const estado=it.id==='zapatillas'?(u.material.zapatillasKm>=UT_ZAPAS_VIDA?'<span class="pz-chip menos">gastadas</span>':`<span class="pz-chip">${u.material.zapatillasKm} / ${UT_ZAPAS_VIDA} km</span>`)
        :tiene?'<span class="pz-chip mas">lo tienes</span>':'';
      return `<div class="pz-tarjeta"><div class="ut-carr-cab"><b>${it.label}</b>${estado}</div>
        <div class="pz-efectos" style="margin:4px 0 8px">${it.desc}</div>
        ${it.id!=='zapatillas'&&tiene?'':`<button class="pz-btn${no?' sec':''}" ${no?'disabled':`onclick="utComprarMat('${it.id}')"`}>${gratis?'Pedírselo a la marca':`Comprar · ${fmtEur(it.precio)}`}</button>${no&&no!=='Ya lo tienes'?motivoHTML(esc(no)):''}`}
      </div>`;}).join('')}
    <button class="pz-btn sec" onclick="G.screen='${vuelta}';render();window.scrollTo(0,0)">← Volver</button>
  </div>`;
}
window.utComprarMat=id=>{if(utComprar(id)){autoSave();render();}};

// ── Reconocer una carrera (§ 5) ─────────
function renderUtReco(){
  const el=$main();hideChrome();
  const u=G.ut,r=utDef(G._utReco);if(!u||!r){G.screen='utObjetivos';render();return;}
  const no=utNoPuedeReconocer(r.id),viaje=utEscalon().viajes?0:r.viaje;
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Reconocer ${esc(r.name)}</div>
    <div class="pz-sub">En un ${UT_TIPO_LABEL[r.tipo].toLowerCase()} te pierdes justo donde no habías estado. Lo que conoces, lo pasas mejor de noche.</div>
    ${no?motivoHTML(esc(no)):''}
    <div class="pz-label" style="margin:14px 0 6px">Salida de un día · ${fmtEur(Math.round(viaje/2))} · un sector</div>
    <div class="pz-tarjeta ut-filas">${utSectores(r).map((sec,i)=>{const n=utReco(r.id,sec);
      return `<div class="pz-fila"><span class="pz-fila-txt"><b>${esc(sec)}</b><div class="pz-efectos">${UT_RECO_NIVEL[n]}</div></span>
        ${n<2&&!no?`<button class="pz-btn sec ut-quitar" style="width:auto" onclick="utRecoSector(${i})">Ir</button>`:''}</div>`;}).join('')}</div>
    <div class="pz-label" style="margin:14px 0 6px">Fin de semana · ${fmtEur(viaje+(utEscalon().viajes?0:60))} · media carrera</div>
    <div class="pz-efectos" style="margin-bottom:8px">Tres días y unos cien kilómetros: carga alta y algo de riesgo de lesión.</div>
    <div class="ut-dos">
      <button class="pz-btn sec" ${no?'disabled':'onclick="utRecoFinde(0)"'}>Primera mitad</button>
      <button class="pz-btn sec" ${no?'disabled':'onclick="utRecoFinde(1)"'}>Segunda mitad</button>
    </div>
    <button class="pz-btn sec" style="margin-top:12px" onclick="G.screen='utObjetivos';render();window.scrollTo(0,0)">← Volver</button>
  </div>`;
}
window.utRecoSector=i=>{const r=utDef(G._utReco);if(r&&utReconocerSector(r.id,utSectores(r)[i])){autoSave();render();}else showToast('No se puede ahora');};
window.utRecoFinde=m=>{if(utFinDeSemanaReco(G._utReco,m)){autoSave();render();}else showToast('No te llega para el fin de semana');};

// ── Finanzas (patrón de la de Clásico) ──
function renderUtFinanzas(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u){G.screen='utNueva';render();return;}
  const trabajo=utEscalon();
  const pend=u.planes.filter(p=>!p.hecho).map(p=>({p,r:utDef(p.id)}));
  const previsto=pend.reduce((a,{r})=>a+r.viaje,0);
  const restan=Math.max(0,UT_SEMANAS-u.semana);
  const alCierre=u.dinero-previsto+Math.round(trabajo.sobrante*12/UT_SEMANAS*restan);
  const F=(txt,v)=>`<div class="pz-fila"><span class="pz-fila-txt">${txt}</span><span class="pz-fila-dato ${v>=0?'pz-mas':'pz-menos'}">${fmtEur(v,true)}</span></div>`;
  const movs=u.movimientos.filter(m=>m.t===u.temporada).slice(-12).reverse();
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-dinero">${icono('finanzas')}Dinero · temporada ${u.temporada}</div>
    <div class="pz-titulo">Finanzas</div>
    <p class="pz-sub">${esc(G.runner.name)} · ${trabajo.label}</p>
    <div class="pz-tarjeta">
      <div class="ut-dos">
        <div><div class="pz-label">Ahorros</div><div class="pz-num ut-grande">${fmtEur(u.dinero)}</div></div>
        <div><div class="pz-label">Al cerrar la temporada</div><div class="pz-num ut-grande ${alCierre>=u.dinero?'pz-mas':'pz-menos'}">${fmtEur(alCierre)}</div></div>
      </div>
      ${alCierre<0?`<div class="pz-diag menos">Con lo que tienes apuntado acabas el año en negativo.</div>`
        :`<div class="pz-diag">En ultra los premios no pagan nada: el dinero sale del trabajo. Lo caro son los viajes.</div>`}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Cada mes</div>
    <div class="pz-tarjeta ut-filas">
      ${F(`Lo que sobra del sueldo (${trabajo.label.toLowerCase()})`,trabajo.sobrante)}
    </div>
    ${pend.length?`<div class="pz-label" style="margin:14px 0 6px">Viajes por pagar</div>
    <div class="pz-tarjeta ut-filas">${pend.map(({p,r})=>F(`${esc(r.name)} · ${p.tipo==='correr'?'a correrla':p.tipo==='ver'?'a verla':'de voluntario'}`,-r.viaje)).join('')}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Últimos movimientos</div>
    <div class="pz-tarjeta ut-filas">${movs.length?movs.map(m=>F(`${esc(m.txt)} <span class="pz-efectos">· sem. ${m.s}</span>`,m.v)).join(''):'<div class="pz-fila pz-efectos">Todavía nada esta temporada.</div>'}</div>
    <button class="pz-btn sec" onclick="G.screen='utHub';render();window.scrollTo(0,0)">← Volver</button>
  </div>`;
}

// ── Cierre de temporada ────────────────
function renderUtTemporada(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u){G.screen='utNueva';render();return;}
  if(u.semana<=UT_SEMANAS){G.screen='utHub';render();return;}
  const s=utResumenTemporada(u.temporada);
  el.innerHTML=`<div class="pz">
    <div class="pz-franja cierre">
      <div class="pz-franja-sub" style="margin:0 0 4px">${esc(G.runner.name)} · ${G.runner.age} años</div>
      <div class="pz-franja-num" style="font-size:52px">Temporada ${u.temporada}</div>
      <div class="pz-franja-sub">${s.corridas?`${s.finisher} de ${s.corridas} terminada${s.corridas===1?'':'s'} · ${s.km} km de carrera`:'Sin dorsal este año'}</div>
    </div>
    ${s.h.length?`<div class="pz-tarjeta ut-filas">${s.h.map(h=>`<div class="pz-fila"><span class="pz-fila-txt"><b>${esc(h.name)}</b><div class="pz-efectos">${h.id==='backyard'?`${h.laps} vueltas${h.kind==='gana'?' · último en pie':''}`:h.kind==='finisher'?`${h.pos}.º de ${h.finishers}${h.variante?' *':''}`:`km ${h.km} · ${h.motivo==='barrera'?'fuera de barrera':h.motivo==='lesion'?'lesión':'retirada'}`}</div></span><span class="pz-fila-dato">${h.kind==='finisher'?ultraDur(h.tiempo):'—'}</span></div>`).join('')}</div>`
      :`<p class="pz-sub">Un año entero sin correr ninguna. Pasa.</p>`}
    <div class="pz-tarjeta">
      <div class="ut-dos">
        <div><div class="pz-label">Entró</div><div class="pz-num pz-mas ut-grande">${fmtEur(s.ingreso,true)}</div></div>
        <div><div class="pz-label">Salió</div><div class="pz-num pz-menos ut-grande">${fmtEur(s.gasto)}</div></div>
      </div>
    </div>
    ${utEpilogoDisparado()?`<div class="pz-franja negativo" style="margin-top:14px">
      <div class="pz-franja-sub" style="margin:0 0 4px">${utEpilogoDisparado()==='edad'?`${G.runner.age} años`:'El índice no llega y el cuerpo pide meses'}</div>
      <div class="pz-franja-num" style="font-size:30px">Ya no vas a volver a estar donde estabas.</div>
      <div class="pz-franja-sub">No es que no puedas correr: es que ya no te dejan entrar. Queda una cosa más.</div>
    </div>
    <button class="pz-btn" onclick="G.screen='utEpilogo';render();window.scrollTo(0,0)">Lo que queda →</button>`:`
    <div class="pz-label" style="margin:14px 0 6px">El trabajo el año que viene</div>
    ${utEscalonesPosibles().map(k=>{const e=UT_ESCALONES[k],sel=(G._utEscalon||utEscalonesPosibles()[0])===k;
      return `<button class="pz-opcion${sel?' sel':''}" onclick="G._utEscalon='${k}';render()"><b>${e.label}</b>${k===u.escalon?' <span class="pz-chip">ahora</span>':''}<div class="pz-efectos">${e.desc}</div>
        <div class="pz-efectos">${e.horas} h/sem para entrenar · ${fmtEur(e.sobrante,true)}/mes</div></button>`;}).join('')}
    ${u.escalon!=='completa'&&!utEscalonesPosibles().includes(u.escalon)?`<div class="pz-diag menos">${u.escalon==='reducida'?'Un año en números rojos: vuelves a jornada completa.':'El índice ha caído: la marca no renueva.'}</div>`:''}
    <button class="pz-btn" style="margin-top:12px" onclick="utSiguienteTemporada()">Empezar la temporada ${u.temporada+1} →</button>`}
  </div>`;
}

// ── El final (§ 16): un solo acto ──────
function renderUtEpilogo(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u){G.screen='utNueva';render();return;}
  if(u.retirado){G.screen='utFinal';render();return;}
  const f=u.final;
  if(f&&!f.hecho){
    const sig=f.tipo==='cuenta'?['A la salida →',"G._utPre=null;G.screen='utPre';render();window.scrollTo(0,0)"]
      :f.tipo==='proyecto'&&f.proyecto.id==='referencia'?['A la salida →',"G._utPre=null;G.screen='utPre';render();window.scrollTo(0,0)"]
      :f.tipo==='proyecto'?['Seguir la travesía →',"G.screen='utProyecto';render();window.scrollTo(0,0)"]
      :['Seguir montándola →',"G.screen='utMontar';render();window.scrollTo(0,0)"];
    el.innerHTML=`<div class="pz"><div class="pz-titulo">${f.tipo==='cuenta'?'La cuenta pendiente':f.tipo==='proyecto'?esc(f.proyecto.label):'Tu carrera'}</div>
      ${f.txt?`<p class="pz-sub">${esc(f.txt)}</p>`:''}<button class="pz-btn" onclick="${sig[1]}">${sig[0]}</button></div>`;
    return;
  }
  el.innerHTML=`<div class="pz">
    <div class="pz-franja negativo">
      <div class="pz-franja-sub" style="margin:0 0 4px">${esc(G.runner.name)} · ${G.runner.age} años · ${u.temporada} temporada${u.temporada===1?'':'s'}</div>
      <div class="pz-franja-num" style="font-size:34px">Una última</div>
      <div class="pz-franja-sub">Sin entrenador, sin club, sin gestionar a nadie. Elige qué cierra esto.</div>
    </div>
    ${utEpilogos().map(e=>`<button class="pz-opcion" onclick="utEpilogoSi('${e.id}')"><b>${e.label}</b><div class="pz-efectos">${esc(e.desc)}</div></button>`).join('')}
    ${utEpilogos().length<3?`<div class="pz-efectos">${!utCuentaPendiente()?'No hay cuenta pendiente: todo lo que empezaste, lo terminaste. ':''}${!utPuedeMontar()?'Para montar tu propia carrera hacía falta dejarse ver: dos veces de voluntario y seis sectores reconocidos.':''}</div>`:''}
  </div>`;
}
window.utEpilogoSi=id=>{
  if(!utElegirEpilogo(id))return;
  G.screen=id==='cuenta'?'utPre':id==='montar'?'utMontar':'utProyectoElegir';
  G._utPre=null;G._utMontar=null;autoSave();render();window.scrollTo(0,0);
};
// El proyecto personal: elegir entre los que propone el juego
function renderUtProyectoElegir(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u||!u.final||u.final.tipo!=='proyecto'){G.screen='utEpilogo';render();return;}
  if(u.final.proyecto){G.screen=u.final.proyecto.id==='referencia'?'utPre':'utProyecto';render();return;}
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">El proyecto personal</div>
    <div class="pz-sub">Ni ranking, ni premio, ni puesto. Algo que siempre quisiste hacer.</div>
    ${utProyectos().map(p=>`<button class="pz-opcion" onclick="utProyectoSi('${p.id}')"><b>${esc(p.label)}</b><div class="pz-efectos">${esc(p.desc)}</div></button>`).join('')}
  </div>`;
}
window.utProyectoSi=id=>{if(!utEmpezarProyecto(id))return;G.screen=id==='referencia'?'utPre':'utProyecto';G._utPre=null;autoSave();render();window.scrollTo(0,0);};
function renderUtProyecto(){
  const el=$main();hideChrome();
  const u=G.ut,pr=u?.final?.proyecto;if(!pr){G.screen='utEpilogo';render();return;}
  if(u.final.hecho){G.screen='utFinal';render();return;}
  const sel=G._utEtapa||(G._utEtapa={etapa:'normal',dormir:'refugio'});
  const pct=Math.round(pr.hechoKm/pr.km*100);
  el.innerHTML=`<div class="pz">
    <span class="pz-etiqueta acento">Día ${pr.dia+1} de ${pr.dias} como mucho</span>
    <div class="pz-titulo">${esc(pr.label)}</div>
    <div class="pz-barra" style="margin:10px 0 4px"><div class="pz-relleno" style="width:${pct}%"></div></div>
    <div class="pz-efectos">${Math.round(pr.hechoKm)} de ${pr.km} km</div>
    <div class="pz-tarjeta" style="margin-top:12px">${utBarra('Piernas',pr.piernas)}${utBarra('Energía',pr.energia)}${utBarra('Ánimo',pr.animo)}</div>
    ${pr.log.slice(-3).map(x=>`<div class="pz-diag">${esc(x)}</div>`).join('')}
    <div class="pz-label" style="margin:14px 0 6px">Hoy, hasta dónde</div>
    <div class="ut-vol">${Object.entries(UT_ETAPA).map(([k,e])=>`<button class="pz-opcion sin-check${sel.etapa===k?' sel':''}" onclick="G._utEtapa.etapa='${k}';render()"><b>${e.label}</b><div class="pz-efectos">~${e.km} km</div></button>`).join('')}</div>
    <div class="pz-label" style="margin:14px 0 6px">Dónde duermes</div>
    ${Object.entries(UT_DORMIR).map(([k,d])=>`<button class="pz-opcion${sel.dormir===k?' sel':''}" onclick="G._utEtapa.dormir='${k}';render()"><b>${d.label}</b><div class="pz-efectos">${d.desc}</div></button>`).join('')}
    <button class="pz-btn" style="margin-top:12px" onclick="utEtapaSi()">Salir →</button>
    <button class="pz-btn sec" style="font-size:13px;padding:8px" onclick="if(confirm('¿Lo dejas aquí?')){utDejarProyecto();G.screen='utFinal';autoSave();render();}">Dejarlo aquí</button>
  </div>`;
}
window.utEtapaSi=()=>{const s=G._utEtapa||{};const r=utEtapa(s.etapa,s.dormir);G.screen=r==='sigue'?'utProyecto':'utFinal';autoSave();render();window.scrollTo(0,0);};
// Montar tu propia carrera (§ 16): con los sectores que conoces.
function renderUtMontar(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u||!u.final||u.final.tipo!=='montar'){G.screen='utEpilogo';render();return;}
  if(u.final.hecho){G.screen='utFinal';render();return;}
  const secs=utSectoresConocidos();
  const d=G._utMontar||(G._utMontar={nombre:'',sectores:[],mes:9,barreras:'normales',avitu:'normales',dorsales:400});
  const r=utCarreraPropia(d);
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Tu carrera</div>
    <div class="pz-sub">Quince años de reconocimiento se convierten en materia prima. Elige los sectores, en orden.</div>
    <div class="pz-label" style="margin:14px 0 6px">Nombre</div>
    <input type="text" id="ut-montar-nombre" maxlength="40" placeholder="Ultra ${esc(utDe(secs[0]?.sec||'tu valle'))}" value="${esc(d.nombre)}" oninput="G._utMontar.nombre=this.value" style="width:100%">
    <div class="pz-label" style="margin:14px 0 6px">El recorrido (${d.sectores.length} sectores)</div>
    <div class="pz-tarjeta ut-filas">${secs.map((x,i)=>{const k=x.id+'|'+x.sec,n=d.sectores.indexOf(k);
      return `<div class="pz-fila"><span class="pz-fila-txt"><b>${n>=0?`${n+1}. `:''}${esc(x.sec)}</b><div class="pz-efectos">${esc(x.race)} · ${x.bloques.reduce((a,b)=>a+b.km[1]-b.km[0],0)} km · ${fmtMiles(x.bloques.reduce((a,b)=>a+b.dplus,0))} m+</div></span>
        <input type="checkbox" class="pz-casilla" ${n>=0?'checked':''} onchange="utMontarSector(${i},this.checked)"></div>`;}).join('')}</div>
    <div class="pz-label" style="margin:14px 0 6px">Mes</div>
    <div class="ut-vol">${[[5,'Mayo'],[7,'Julio'],[9,'Septiembre']].map(([m,l])=>`<button class="pz-opcion sin-check${d.mes===m?' sel':''}" onclick="G._utMontar.mes=${m};render()"><b>${l}</b></button>`).join('')}</div>
    <div class="pz-label" style="margin:14px 0 6px">Barreras</div>
    <div class="ut-vol">${Object.entries(UT_MONTAR.barreras).map(([k,b])=>`<button class="pz-opcion sin-check${d.barreras===k?' sel':''}" onclick="G._utMontar.barreras='${k}';render()"><b>${b.label}</b></button>`).join('')}</div>
    <div class="pz-efectos">Generosas: acaba todo el mundo, pero no impone respeto. Duras: media inscripción fuera, y mala fama.</div>
    <div class="pz-label" style="margin:14px 0 6px">Avituallamientos</div>
    <div class="ut-vol">${Object.entries(UT_MONTAR.avitu).map(([k,a])=>`<button class="pz-opcion sin-check${d.avitu===k?' sel':''}" onclick="G._utMontar.avitu='${k}';render()"><b>${a.label}</b></button>`).join('')}</div>
    <div class="pz-label" style="margin:14px 0 6px">Dorsales</div>
    <div class="ut-vol">${UT_MONTAR.dorsales.map(n=>`<button class="pz-opcion sin-check${d.dorsales===n?' sel':''}" onclick="G._utMontar.dorsales=${n};render()"><b class="pz-num">${n}</b></button>`).join('')}</div>
    <div class="pz-efectos">Pocos, exclusiva; muchos, masificada.</div>
    ${r?`<div class="pz-tarjeta" style="margin-top:12px"><b>${esc(r.name)}</b><div class="pz-efectos">${r.km} km · ${fmtMiles(r.dplus)} m+ · ${r.noches===2?'dos noches':r.noches?'una noche':'de día'} · cierre ${r.cierre} h · ${utPuntos(r)} puntos de dificultad</div></div>`
      :'<div class="pz-diag ojo">Elige al menos dos sectores.</div>'}
    <button class="pz-btn" style="margin-top:12px" ${r?'onclick="utMontarSi()"':'disabled'}>Que se corra →</button>
  </div>`;
}
window.utMontarSector=(i,on)=>{const d=G._utMontar,k=utSectoresConocidos()[i];if(!d||!k)return;const id=k.id+'|'+k.sec;
  d.sectores=d.sectores.filter(x=>x!==id);if(on)d.sectores.push(id);render();};
window.utMontarSi=()=>{const d=G._utMontar;if(!d)return;if(utMontarCarrera(d)){G._utMontar=null;G.screen='utFinal';autoSave();render();window.scrollTo(0,0);}};
// La pantalla final: no dice si ganaste. Dice si lo hiciste.
function renderUtFinal(){
  const el=$main();hideChrome();
  const u=G.ut;if(!u||!u.final||!u.final.hecho){G.screen='utHub';render();return;}
  const f=u.final,v=utResumenVida(),res=f.resultado||{};
  let acto='';
  if(f.tipo==='montar'){
    acto=`<div class="pz-franja ${res.segunda?'podio':'fuera'}">
      <div class="pz-franja-sub" style="margin:0 0 4px">${esc(f.carrera.name)} · ${f.carrera.km} km · ${fmtMiles(f.carrera.dplus)} m+</div>
      <div class="pz-franja-num" style="font-size:36px">${res.segunda?'Habrá segunda edición':'No habrá segunda edición'}</div>
      <div class="pz-franja-sub">${res.inscritos} inscritos · ${res.finishers} en meta · ${res.puntos} puntos de dificultad</div>
    </div>
    <p style="line-height:1.6">Salieron con ${esc(res.tiempo)}. ${res.dicen.map(esc).join(' ')}${res.conocido?' '+esc(res.conocido):''}</p>
    ${res.segunda?'<div class="pz-diag mas">Tu carrera entra en el calendario: las próximas partidas de Ultratrail la traen.</div>':''}`;
  }else{
    acto=`<div class="pz-franja ${res.ok?'podio':'negativo'}">
      <div class="pz-franja-sub" style="margin:0 0 4px">${f.tipo==='cuenta'?'La cuenta pendiente':esc(f.proyecto?.label||'')}</div>
      <div class="pz-franja-num" style="font-size:44px">${res.ok?'Lo hiciste.':'No lo hiciste.'}</div>
      <div class="pz-franja-sub">${esc(res.txt||'')}</div>
    </div>
    ${f.proyecto?.log?.length?`<div class="pz-tarjeta">${f.proyecto.log.slice(-4).map(x=>`<div class="pz-efectos" style="margin-bottom:3px">${esc(x)}</div>`).join('')}</div>`:''}`;
  }
  el.innerHTML=`<div class="pz">${acto}
    <div class="pz-label" style="margin:14px 0 6px">${esc(G.runner.name)}, ${v.temporadas} temporada${v.temporadas===1?'':'s'}</div>
    <div class="pz-tarjeta ut-filas">
      <div class="pz-fila"><span class="pz-fila-txt">Ultras</span><span class="pz-fila-dato">${v.terminadas} de ${v.ultras} terminadas</span></div>
      <div class="pz-fila"><span class="pz-fila-txt">Kilómetros de carrera</span><span class="pz-fila-dato">${fmtMiles(v.km)}</span></div>
      <div class="pz-fila"><span class="pz-fila-txt">${esc(ULTRA_RACES.find(r=>r.major).name)}</span><span class="pz-fila-dato">${v.intentosGrande?`${v.grande} de ${v.intentosGrande}`:'nunca entraste'}</span></div>
      ${v.backyards?`<div class="pz-fila"><span class="pz-fila-txt">Backyards</span><span class="pz-fila-dato">${v.backyards} · mejor ${v.mejorBackyard} vueltas</span></div>`:''}
      <div class="pz-fila"><span class="pz-fila-txt">Veteranía</span><span class="pz-fila-dato">${v.veterania}</span></div>
      ${v.secuelas?`<div class="pz-fila"><span class="pz-fila-txt">Lo que te llevas puesto</span><span class="pz-fila-dato">${v.secuelas} secuela${v.secuelas===1?'':'s'}</span></div>`:''}
    </div>
    <button class="pz-btn" onclick="backToMainMenu()">Menú principal</button>
  </div>`;
}
window.utSiguienteTemporada=()=>{utNuevaTemporada(G._utEscalon);G._utEscalon=null;G.screen='utHub';autoSave();render();window.scrollTo(0,0);};

MODE_ROUTES.ultratrail={utNueva:renderUtNueva, utHub:renderUtHub, utObjetivos:renderUtObjetivos,
  utFase:renderUtFase, utTirada:renderUtTirada, utRecup:renderUtRecup, utPiedras:renderUtPiedras,
  utMaterial:renderUtMaterial, utReco:renderUtReco,
  utEpilogo:renderUtEpilogo, utProyectoElegir:renderUtProyectoElegir, utProyecto:renderUtProyecto, utMontar:renderUtMontar, utFinal:renderUtFinal,
  utFinanzas:renderUtFinanzas, utTemporada:renderUtTemporada};
