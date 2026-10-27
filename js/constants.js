const WORK_OPTIONS=[
  {pct:100,label:'Jornada completa',hours:40,income:190,trainingH:5,
   desc:'Máximo dinero. Casi sin tiempo para entrenar.'},
  {pct:80, label:'Jornada reducida (80%)',hours:32,income:150,trainingH:10,
   desc:'Buen equilibrio los primeros años.'},
  {pct:60, label:'Media jornada (60%)',hours:24,income:110,trainingH:16,
   desc:'Justo cubres gastos. Más tiempo de entreno.'},
  {pct:40, label:'Jornada parcial (40%)',hours:16,income:70,trainingH:22,
   desc:'Pierdes dinero cada mes. Necesitas sponsors.'},
  {pct:0,  label:'Profesional (sin trabajo)',hours:0,income:0,trainingH:32,
   desc:'Solo viable si sponsors + premios cubren tus gastos.'},
];
// T138 (v91): `total` estaba escrito a mano junto a sus propios sumandos, así
// que tocar cualquiera de los cuatro dejaba el total mintiendo. Ahora se suma.
const FIXED_COSTS=(()=>{const c={rent:60,food:20,transport:8,gear:7};// por mes (escala juego)
  return {...c, total:Object.values(c).reduce((a,b)=>a+b,0)};})();
// H19 (v95): coste MENSUAL del staff de Clásico. Hasta v94 eran €200/€250/€100
// por temporada —el fisio salía a unos €17 al mes—, así que contratarlo no era
// ninguna decisión. CR-57 diseñó la quiebra dando por hecho que eran mensuales.
// Se cobra al cerrar temporada, por adelantado para la que empieza.
const STAFF_COSTS={fisio:60,entrenador:75,suplementos:30};

const SEASON_OBJECTIVES=[
  {
    id:'wins3',
    label:'🏆 Ganar 3 carreras',
    desc:'Demuestra que eres competitivo en este nivel',
    target:'wins',
    value:3,
    reward:300
  },
  {
    id:'top10',
    label:'📈 Top 10 global',
    desc:'Escala en el ranking nacional',
    target:'ranking',
    value:10,
    reward:400
  },
  {
    id:'savings1000',
    label:'💰 Ahorrar €1.000',
    desc:'Gestión financiera a largo plazo',
    target:'money',
    value:1000,
    reward:200
  }
];

// T69 (v93) — agregados de careerHistory, calculados UNA vez por historial.
//
// 38 de los ~150 logros recorrían `G.careerHistory` entero, y varios lo
// recorrían dos y tres veces dentro del mismo check() (perfect_season saca los
// años con un map+Set y después vuelve a filtrar el historial por cada año).
// checkAndUnlockAchievements() los evalúa todos al terminar cada carrera, así
// que el historial se barría más de sesenta veces seguidas. Con 50 carreras y
// varias temporadas eso es trabajo cuadrático por una cifra que no cambia entre
// un check y el siguiente.
//
// Se calcula todo en UNA pasada y se memoiza. La caché se invalida cuando
// cambia el array (referencia distinta: cargar partida, freshState) o su
// longitud (una carrera nueva). Las entradas no se mutan en el sitio en ningún
// punto del código —careerHistory solo recibe push al terminar una carrera en race.js
// y, desde v96, en recordDNF()— así que no hay tercer camino por el que quedarse obsoleta.
//
// v96: careerHistory trae también los DNF (abandono y baja por lesión). No cuentan como
// carrera, victoria ni podio, pero cortan la racha y se apuntan por año en dnfByYear
// (perfect_full exige cero). Sin DNF en el historial, los agregados son los de siempre.
//
// OJO con la fidelidad: se replica lo que hacía cada check, no lo que "debería".
// En particular win_same_2 solo miraba nombres de RACES_DB (no los de
// SPEC_RACES) y win_zegama_3 cuenta VICTORIAS, no temporadas distintas. Las dos
// cosas se conservan; cambiarlas sería tocar la dificultad de dos logros.
let _CAGG=null,_CAGG_REF=null,_CAGG_LEN=-1;
function careerAgg(){
  const h=G.careerHistory||[];
  if(_CAGG&&_CAGG_REF===h&&_CAGG_LEN===h.length)return _CAGG;
  const a={
    n:0, wins:0, podiums:0, maxWinStreak:0, hasUltra:false,
    dnfByYear:{},        // año → abandonos y bajas (v96)
    racesByYear:{},      // año → carreras terminadas
    winsByYear:{},       // año → victorias
    winNamesByYear:{},   // año → [nombres ganados]
    winCountByName:{},   // nombre → victorias (win_zegama_3 cuenta victorias)
    winYearsByName:{},   // nombre → Set de años (win_same_2 cuenta años distintos)
  };
  let racha=0;
  const porNombre=allRacesByName();
  for(const r of h){
    const y=r.year;
    if(isDNF(r)){racha=0;a.dnfByYear[y]=(a.dnfByYear[y]||0)+1;continue;}
    a.n++;
    a.racesByYear[y]=(a.racesByYear[y]||0)+1;
    if(r.pos<=3)a.podiums++;
    if(!a.hasUltra&&porNombre.get(r.name)?.km>=40)a.hasUltra=true;
    if(r.pos===1){
      a.wins++;
      a.winsByYear[y]=(a.winsByYear[y]||0)+1;
      (a.winNamesByYear[y]||(a.winNamesByYear[y]=[])).push(r.name);
      a.winCountByName[r.name]=(a.winCountByName[r.name]||0)+1;
      (a.winYearsByName[r.name]||(a.winYearsByName[r.name]=new Set())).add(y);
      if(++racha>a.maxWinStreak)a.maxWinStreak=racha;
    } else racha=0;
  }
  _CAGG_REF=h; _CAGG_LEN=h.length;
  return _CAGG=a;
}

const ACHIEVEMENTS=[
  // ══ MODO NORMAL — FÁCIL ══════════════════════════════
  {id:'first_race',    rarity:'easy',   label:'Día uno',               desc:'Completar tu primera carrera',                        check:()=>careerAgg().n>=1},
  {id:'runner_5',      rarity:'easy',   label:'Primeros pasos',        desc:'Completar 5 carreras',                                check:()=>careerAgg().n>=5},
  {id:'podium_1',      rarity:'easy',   label:'Al podio',              desc:'Conseguir tu primer podio (top 3)',                   check:()=>careerAgg().podiums>=1},
  {id:'win_1',         rarity:'easy',   label:'Primera victoria',      desc:'Ganar una carrera',                                   check:()=>careerAgg().wins>=1},
  {id:'first_sponsor', rarity:'easy',   label:'Primer contrato',       desc:'Firmar el primer contrato de patrocinio',             check:()=>Object.values(G.sponsors||{}).some(Boolean)},
  {id:'year_3',        rarity:'easy',   label:'En rodaje',             desc:'Completar 3 temporadas',                             check:()=>G.year>=3},
  {id:'top_100',       rarity:'easy',   label:'Top 100 nacional',      desc:'Alcanzar el ranking #100 o mejor',                   check:()=>(G.ranking||999)<=100},
  {id:'fame_1k',       rarity:'easy',   label:'Micro-influencer',      desc:'Llegar a 1.000 seguidores',                           check:()=>(G.followers||0)>=1000},
  {id:'distance_100',  rarity:'easy',   label:'Primeros 100 km',       desc:'Acumular 100 km en carrera',                         check:()=>(G.totalCareerKm||0)>=100},
  {id:'survived_storm',rarity:'easy',   label:'Superviviente',         desc:'Terminar una carrera con tormenta activa',           check:()=>(G.stormSurvivedCount||0)>=1},
  {id:'fair_play',     rarity:'easy',   label:'Fair play',             desc:'Tomar 3 decisiones honestas en carrera',             check:()=>(G.fairPlayCount||0)>=3},
  // ══ MODO NORMAL — MEDIO ══════════════════════════════
  {id:'runner_25',     rarity:'medium', label:'Maratoniano de montaña',desc:'Completar 25 carreras',                               check:()=>careerAgg().n>=25},
  {id:'podium_3',      rarity:'medium', label:'Tres podios',           desc:'Lograr 3 podios (top 3)',                            check:()=>careerAgg().podiums>=3},
  {id:'win_5',         rarity:'medium', label:'Campeón en serie',      desc:'Ganar 5 carreras',                                   check:()=>careerAgg().wins>=5},
  {id:'podium_10',     rarity:'medium', label:'Consagrado',            desc:'Lograr 10 podios',                                   check:()=>careerAgg().podiums>=10},
  {id:'distance_500',  rarity:'medium', label:'Ultra leguas',          desc:'Acumular 500 km en carrera',                         check:()=>(G.totalCareerKm||0)>=500},
  {id:'distance_1000', rarity:'medium', label:'Mil kilómetros',        desc:'Acumular 1.000 km a lo largo de tu carrera',         check:()=>(G.totalCareerKm||0)>=1000},
  {id:'ultra_finisher',rarity:'medium', label:'Ultra finisher',        desc:'Terminar una carrera de 40 km o más',                check:()=>careerAgg().hasUltra},
  {id:'top_50',        rarity:'medium', label:'Ranking Top 50',        desc:'Alcanzar ranking #50 o mejor',                      check:()=>(G.ranking||999)<=50},
  {id:'wealthy',       rarity:'medium', label:'Financieramente estable',desc:'Ahorrar €5.000',                                   check:()=>(G.money||0)>=5000},
  {id:'year_5',        rarity:'medium', label:'Veterano',              desc:'Completar 5 temporadas',                            check:()=>G.year>=5},
  {id:'fame_10k',      rarity:'medium', label:'Referente del trail',   desc:'Llegar a 10.000 seguidores',                         check:()=>(G.followers||0)>=10000},
  {id:'sponsor_2',     rarity:'medium', label:'Bien patrocinado',      desc:'Tener 2 contratos de patrocinio simultáneos',        check:()=>Object.values(G.sponsors||{}).filter(Boolean).length>=2},
  {id:'win_3_season',  rarity:'medium', label:'Temporada triunfal',    desc:'Ganar 3 o más carreras en la misma temporada',       check:()=>Object.values(careerAgg().winsByYear).some(v=>v>=3)},
  {id:'no_injury',     rarity:'medium', label:'Cuerpo de hierro',      desc:'Completar una temporada completa sin lesionarse',    check:()=>{const inj=(G.injuryHistory||[]).filter(i=>i.year===G.year).length;return finishedResults(G.raceResults).length>=3&&inj===0;}}, // T45 (v89)
  {id:'no_abandon',    rarity:'medium', label:'Nunca te rindas',       desc:'Terminar 10 carreras consecutivas sin abandono',     check:()=>(G.raceFinishedCount||0)>=10&&(G.raceAbandonedCount||0)===0},
  {id:'comeback',      rarity:'medium', label:'El regreso',            desc:'Ganar una carrera después de una lesión grave',      check:()=>{const big=(G.injuryHistory||[]).some(i=>i.type==='fractura'||i.type==='rotura');return big&&careerAgg().wins>=1;}},
  {id:'record_5',      rarity:'medium', label:'Mis marcas',            desc:'Establecer récord personal en 5 carreras distintas', check:()=>Object.keys(G.personalBests||{}).length>=5},
  {id:'year_8',        rarity:'medium', label:'Leyenda local',         desc:'Completar 8 temporadas',                            check:()=>G.year>=8},
  {id:'win_same_2',    rarity:'medium', label:'Defensor del título',   desc:'Ganar la misma carrera en 2 temporadas distintas',   check:()=>RACES_DB.some(r=>(careerAgg().winYearsByName[r.name]||{size:0}).size>=2)},
  // ══ MODO NORMAL — DIFÍCIL ════════════════════════════
  {id:'runner_50',     rarity:'hard',   label:'Veterano de verdad',    desc:'Completar 50 carreras',                              check:()=>careerAgg().n>=50},
  {id:'win_10',        rarity:'hard',   label:'Habitual ganador',       desc:'Ganar 10 carreras',                                  check:()=>careerAgg().wins>=10},
  {id:'podium_20',     rarity:'hard',   label:'Podio habitual',        desc:'Lograr 20 podios',                                   check:()=>careerAgg().podiums>=20},
  {id:'top_10',        rarity:'hard',   label:'Ranking Top 10',        desc:'Alcanzar ranking #10 o mejor',                      check:()=>(G.ranking||999)<=10},
  {id:'spec_top10',    rarity:'hard',   label:'Top 10 de especialidad',desc:'Alcanzar el ranking #10 en tu especialidad',         check:()=>(G.specRanking||999)<=10},
  {id:'rich',          rarity:'hard',   label:'El corredor millonario',desc:'Ahorrar €20.000',                                    check:()=>(G.money||0)>=20000},
  {id:'sponsor_4',     rarity:'hard',   label:'Totalmente patrocinado',desc:'Tener los 4 sponsors simultáneos',                  check:()=>Object.values(G.sponsors||{}).filter(Boolean).length>=4},
  {id:'perfect_season',rarity:'hard',   label:'Temporada perfecta',   desc:'Ganar todas las carreras de un año (mín 3) sin abandonos', check:()=>{const a=careerAgg();return Object.keys(a.racesByYear).some(yr=>a.racesByYear[yr]>=3&&(a.winsByYear[yr]||0)===a.racesByYear[yr]&&((G._abandonsByYear||{})[yr]||0)===0);}},// T11 (v82): _abandonsByYear[año] solo se crea al abandonar, así que una temporada limpia dejaba la clave en undefined y undefined===0 es falso: el logro era imposible justo al cumplirse.
  {id:'win_20',        rarity:'hard',   label:'Veinte victorias',      desc:'Ganar 20 carreras',                                  check:()=>careerAgg().wins>=20},
  {id:'distance_2000', rarity:'hard',   label:'Dos mil kilómetros',    desc:'Acumular 2.000 km de carrera',                       check:()=>(G.totalCareerKm||0)>=2000},
  {id:'consecutive_3', rarity:'hard',   label:'Racha ganadora',        desc:'Ganar 3 carreras seguidas',                          check:()=>careerAgg().maxWinStreak>=3},
  {id:'win_zegama',    rarity:'hard',   label:'Rey del techo vasco',   desc:'Ganar la Zegama-Aizkorri',                           check:()=>(careerAgg().winCountByName['Zegama-Aizkorri']||0)>=1},
  {id:'year_12',       rarity:'hard',   label:'Doce temporadas',       desc:'Completar 12 temporadas',                           check:()=>G.year>=12&&['medio','dificil','hardcore'].includes(G.gameMode||'')},
  {id:'followers_50k', rarity:'hard',   label:'Estrella del trail',    desc:'Llegar a 50.000 seguidores',                         check:()=>(G.followers||0)>=50000},
  {id:'distance_5000', rarity:'hard',   label:'Cinco mil kilómetros',  desc:'Acumular 5.000 km en carrera',                       check:()=>(G.totalCareerKm||0)>=5000&&['medio','dificil','hardcore'].includes(G.gameMode||'')},
  {id:'money_50k',     rarity:'hard',   label:'Cincuenta mil euros',   desc:'Ahorrar €50.000',                                    check:()=>(G.money||0)>=50000&&['medio','dificil','hardcore'].includes(G.gameMode||'')},
  {id:'spec_1',        rarity:'hard',   label:'El mejor en especialidad',desc:'Alcanzar el ranking #1 en tu especialidad',        check:()=>(G.specRanking||999)<=1&&['medio','dificil','hardcore'].includes(G.gameMode||'')},
  // ══ MODO NORMAL — LEGENDARIO ═════════════════════════
  {id:'top_1',         rarity:'legendary',label:'Número 1',            desc:'Alcanzar el ranking #1 mundial',                    check:()=>(G.ranking||999)<=1&&['medio','dificil','hardcore'].includes(G.gameMode||'')},
  {id:'win_30',        rarity:'legendary',label:'Treinta victorias',   desc:'Ganar 30 carreras',                                  check:()=>careerAgg().wins>=30&&['medio','dificil','hardcore'].includes(G.gameMode||'')},
  {id:'distance_10k',  rarity:'legendary',label:'Diez mil kilómetros', desc:'Acumular 10.000 km de carrera',                      check:()=>(G.totalCareerKm||0)>=10000},
  {id:'win_zegama_3',  rarity:'legendary',label:'Leyenda de Zegama',   desc:'Ganar la Zegama-Aizkorri en 3 temporadas distintas', check:()=>(careerAgg().winCountByName['Zegama-Aizkorri']||0)>=3},
  {id:'no_injury_5y',  rarity:'legendary',label:'Indestructible',      desc:'Completar 5 temporadas seguidas sin lesión',         check:()=>{if(G.year<5)return false;const ij=new Set((G.injuryHistory||[]).map(i=>i.year));for(let y=1;y<=G.year-4;y++){let ok=true;for(let i=0;i<5;i++)if(ij.has(y+i)){ok=false;break;}if(ok)return true;}return false;}},
  {id:'perfect_full',  rarity:'legendary',label:'Invicto total',       desc:'Ganar todas las carreras de una temporada (mín 5)',  check:()=>{const a=careerAgg();return Object.keys(a.racesByYear).some(yr=>a.racesByYear[yr]>=5&&(a.winsByYear[yr]||0)===a.racesByYear[yr]&&!a.dnfByYear[yr]);}}, // v96: con un DNF esa temporada ya no es «invicto»
  // ══ CANICROSS — FÁCIL ════════════════════════════════
  {id:'cn_first_race', rarity:'easy',   mode:'cn',label:'Primera carrera juntos', desc:'Completar la primera carrera de canicross',          check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf).length>=1},
  {id:'cn_bond_50',    rarity:'easy',   mode:'cn',label:'Buen equipo',            desc:'Alcanzar vínculo 50 con tu perro',                   check:()=>(cnActiveDog()?.peakBond||0)>=50},
  {id:'cn_first_season',rarity:'easy',  mode:'cn',label:'Primer invierno juntos', desc:'Completar la primera temporada de canicross',        check:()=>(G.cnSeason||1)>=2},
  {id:'cn_all_cmds',   rarity:'easy',   mode:'cn',label:'Bien adiestrado',        desc:'Enseñar los 6 comandos al perro, al menos el primer nivel',check:()=>{const c=cnActiveDog()?.commands||{};return CN_COMMANDS.every(k=>(Number(c[k.id])||0)>=1);}},
  // ══ CANICROSS — MEDIO ════════════════════════════════
  {id:'cn_win_1',      rarity:'medium', mode:'cn',label:'Primer triunfo juntos',  desc:'Ganar una carrera de canicross',                     check:()=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos===1)},
  {id:'cn_bond_80',    rarity:'medium', mode:'cn',label:'Compenetrados',          desc:'Alcanzar vínculo 80 con tu perro',                   check:()=>(cnActiveDog()?.peakBond||0)>=80},
  {id:'cn_podium_5',   rarity:'medium', mode:'cn',label:'Dúo de podio',           desc:'Conseguir 5 podios en carreras de canicross',        check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf&&r.pos<=3).length>=5},
  {id:'cn_season_3',   rarity:'medium', mode:'cn',label:'Tres inviernos',         desc:'Completar 3 temporadas de canicross',                check:()=>(G.cnSeason||1)>=4},
  {id:'cn_dog_5',      rarity:'medium', mode:'cn',label:'Veterano de cuatro patas',desc:'El perro llega a su 5.ª temporada de vida',         check:()=>{const d=cnActiveDog();return d?(G.cnSeason||1)-(d.birthSeason||1)>=5:false;}},
  {id:'cn_no_dnf',     rarity:'medium', mode:'cn',label:'Temporada limpia',       desc:'Completar una temporada entera sin abandonar ninguna carrera',check:()=>{const ss=[...new Set((G.cnRaceResults||[]).map(r=>r.season))];return ss.some(s=>{const sr=(G.cnRaceResults||[]).filter(r=>r.season===s);return sr.length>=3&&sr.every(r=>!r.dnf);});}},
  // ══ CANICROSS — DIFÍCIL ══════════════════════════════
  {id:'cn_bond_100',   rarity:'hard',   mode:'cn',label:'Alma gemela',            desc:'Alcanzar el vínculo máximo (100) con tu perro',      check:()=>(cnActiveDog()?.peakBond||0)>=100},
  {id:'cn_win_5',      rarity:'hard',   mode:'cn',label:'Cinco victorias juntos', desc:'Ganar 5 carreras de canicross',                      check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf&&r.pos===1).length>=5},
  {id:'cn_season_5',   rarity:'hard',   mode:'cn',label:'Cinco inviernos',        desc:'Completar 5 temporadas de canicross',                check:()=>(G.cnSeason||1)>=6},
  {id:'cn_dog_8',      rarity:'hard',   mode:'cn',label:'Leyenda peluda',         desc:'El perro llega a su 8.ª temporada de vida',          check:()=>{const d=cnActiveDog();return d?(G.cnSeason||1)-(d.birthSeason||1)>=8:false;}},
  // ══ CANICROSS — LEGENDARIO ═══════════════════════════
  {id:'cn_perfect',    rarity:'legendary',mode:'cn',label:'Perfectos',            desc:'Ganar todas las carreras seleccionadas en una temporada (mín 3)',check:()=>{const ss=[...new Set((G.cnRaceResults||[]).map(r=>r.season))];return ss.some(s=>{const sr=(G.cnRaceResults||[]).filter(r=>r.season===s);return sr.length>=3&&sr.every(r=>!r.dnf&&r.pos===1);});}},
  {id:'cn_wins_15',    rarity:'legendary',mode:'cn',label:'Liga perfecta',        desc:'Ganar 15 carreras de canicross en total',             check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf&&r.pos===1).length>=15},
  // ══ DIFÍCIL / HARDCORE — EXCLUSIVOS ══════════════════
  {id:'hc_first_win',  rarity:'hard',      excl:true, label:'Victoria en lo duro',       desc:'Ganar una carrera en modo Difícil o Hardcore',           check:()=>['dificil','hardcore'].includes(G.gameMode||'')&&careerAgg().wins>=1},
  {id:'hc_no_injury',  rarity:'hard',      excl:true, label:'Acero en lo duro',          desc:'Completar una temporada sin lesión en Difícil o Hardcore',check:()=>{if(!['dificil','hardcore'].includes(G.gameMode||''))return false;const inj=(G.injuryHistory||[]).filter(i=>i.year===G.year).length;return finishedResults(G.raceResults).length>=3&&inj===0;}}, // T45 (v89)
  {id:'hc_top10',      rarity:'hard',      excl:true, label:'Top 10 de verdad',          desc:'Alcanzar el ranking #10 jugando en Difícil o Hardcore',  check:()=>['dificil','hardcore'].includes(G.gameMode||'')&&(G.ranking||999)<=10},
  {id:'hc_survive_3',  rarity:'hard',      excl:true, label:'Superviviente nato',        desc:'Completar 3 temporadas en modo Hardcore',                check:()=>(G.gameMode||'')==='hardcore'&&(G.year||0)>=3},
  {id:'hc_perfect',    rarity:'legendary', excl:true, label:'Perfección en el abismo',   desc:'Ganar 3+ carreras sin lesión en una temporada en Hardcore',check:()=>{if((G.gameMode||'')!=='hardcore')return false;const si=(G.injuryHistory||[]).filter(i=>i.year===G.year).length;return (careerAgg().winsByYear[G.year]||0)>=3&&si===0;}},
  // ══ MODO NORMAL — FÁCIL (nuevos) ════════════════════════
  {id:'finish_10',       rarity:'easy',   label:'Ya vas en serio',        desc:'Completar 10 carreras',                                            check:()=>careerAgg().n>=10},
  {id:'first_dnf',       rarity:'easy',   label:'Esto también es el trail',desc:'Abandonar una carrera por primera vez',                           check:()=>(G.raceAbandonedCount||0)>=1},
  {id:'first_pb',        rarity:'easy',   label:'Récord personal',         desc:'Batir tu marca personal por primera vez',                         check:()=>Object.keys(G.personalBests||{}).length>=1},
  {id:'year_2',          rarity:'easy',   label:'Segunda temporada',       desc:'Completar 2 temporadas',                                          check:()=>(G.year||0)>=2},
  {id:'first_rival_beat',rarity:'easy',   label:'Cara a cara',             desc:'Superar a un rival nombrado en carrera por primera vez',          check:()=>(G._nemesisDefeatCount||0)>=1},
  {id:'first_club',      rarity:'easy',   label:'En grupo corres mejor',   desc:'Unirse a cualquier club',                                         check:()=>!!(G.club&&G.club.id!=='none')},
  {id:'first_sponsor_obj',rarity:'easy',  label:'Objetivo cumplido',       desc:'Cumplir el objetivo de un sponsor por primera vez',               check:()=>!!(G._firstSponsorObjMet)},
  // ══ MODO NORMAL — MEDIO (nuevos) ═════════════════════════
  {id:'top_25',          rarity:'medium', label:'Élite emergente',         desc:'Alcanzar el ranking #25 o mejor',                                check:()=>(G.ranking||999)<=25},
  {id:'money_10k',       rarity:'medium', label:'Cuatro cifras',           desc:'Ahorrar €10.000',                                                check:()=>(G.money||0)>=10000},
  {id:'followers_25k',   rarity:'medium', label:'Referente nacional',      desc:'Llegar a 25.000 seguidores',                                     check:()=>(G.followers||0)>=25000},
  {id:'year_6',          rarity:'medium', label:'Seis temporadas',         desc:'Completar 6 temporadas',                                         check:()=>(G.year||0)>=6},
  {id:'nemesis_defeat',  rarity:'medium', label:'Cuenta saldada',          desc:'Derrotar a tu rival nemesis en 3 ocasiones distintas',           check:()=>(G._nemesisDefeatCount||0)>=3},
  {id:'pb_three',        rarity:'medium', label:'Máquina de marcas',       desc:'Batir el récord personal en 3 distancias distintas',             check:()=>Object.keys(G.personalBests||{}).length>=3},
  {id:'tapering_win',    rarity:'medium', label:'La descarga perfecta',    desc:'Ganar una carrera tras usar el bloque de tapering la semana previa',check:()=>!!(G._wonWithTaper)},
  {id:'five_dnf',        rarity:'medium', label:'El trail da y el trail quita',desc:'Abandonar 5 carreras a lo largo de la carrera',              check:()=>(G.raceAbandonedCount||0)>=5},
  {id:'sponsor_renewal', rarity:'medium', label:'Renovación',              desc:'Renovar un contrato de sponsor al terminar su duración',         check:()=>(G._sponsorRenewals||0)>=1},
  {id:'sponsor_no_penalty',rarity:'medium',label:'Sin penalización',       desc:'Completar una temporada entera sin incumplir ningún objetivo de sponsor',check:()=>!!(G._cleanSponsorSeason)},
  {id:'club_montana',    rarity:'medium', label:'Alta montaña',            desc:'Unirse al Club de Alta Montaña',                                 check:()=>G.club?.id==='montana'},
  {id:'club_fisio',      rarity:'medium', label:'Fisio incluido',          desc:'Usar el fisio del club por primera vez',                         check:()=>!!(G._clubFisioUsed)},
  {id:'club_loyalty',    rarity:'medium', label:'Leal a los colores',      desc:'Permanecer en el mismo club 3 temporadas seguidas',              check:()=>(G._clubLoyaltyStreak||0)>=3},
  // ══ MODO NORMAL — DIFÍCIL (nuevos) ════════════════════════
  {id:'win_15',          rarity:'hard',   label:'Quince victorias',        desc:'Ganar 15 carreras',                                              check:()=>careerAgg().wins>=15},
  {id:'consecutive_5',   rarity:'hard',   label:'Racha imparable',         desc:'Ganar 5 carreras seguidas',                                      check:()=>careerAgg().maxWinStreak>=5},
  {id:'money_25k',       rarity:'hard',   label:'Patrocinado de verdad',   desc:'Ahorrar €25.000',                                               check:()=>(G.money||0)>=25000},
  {id:'year_9',          rarity:'hard',   label:'Nueve temporadas',        desc:'Completar 9 temporadas',                                         check:()=>(G.year||0)>=9},
  {id:'age_40_podium',   rarity:'hard',   label:'Veterano en el podio',    desc:'Conseguir un podio con el corredor con más de 40 años',          check:()=>(G.runner?.age||0)>=40&&careerAgg().podiums>=1},
  {id:'grand_slam_spec', rarity:'hard',   label:'Grand Slam',              desc:'Ganar las 3 carreras de tu especialidad en el mismo año',        check:()=>{const ids=(SPEC_RACES[G.runner?.specialty]||[]).map(r=>r.name);return Object.values(careerAgg().winNamesByYear).some(ns=>ns.filter(n=>ids.includes(n)).length>=3);}},
  {id:'spec_top5',       rarity:'hard',   label:'Especialista de élite',   desc:'Alcanzar el top 5 en el ranking de tu especialidad',            check:()=>(G.specRanking||999)<=5},
  {id:'sponsor_3_active',rarity:'hard',   label:'Tres frentes',            desc:'Tener 3 sponsors activos al mismo tiempo',                       check:()=>Object.values(G.sponsors||{}).filter(Boolean).length>=3},
  {id:'sponsor_tier4',   rarity:'hard',   label:'Patrocinio élite',        desc:'Firmar con un sponsor de tier 4',                               check:()=>Object.values(G.sponsors||{}).filter(Boolean).some(s=>(s.tier||0)>=4)},
  {id:'sponsor_all_cats',rarity:'hard',   label:'Cartera completa',        desc:'Tener activo un sponsor de cada categoría al mismo tiempo',      check:()=>['zapatillas','ropa','nutricion','tecnologia'].every(c=>!!G.sponsors?.[c])},
  {id:'sponsor_negotiate',rarity:'hard',  label:'Negociador',              desc:'Negociar una penalización en lugar de pagarla',                  check:()=>(G._sponsorNegotiations||0)>=1},
  {id:'club_elite',      rarity:'hard',   label:'Élite de élites',         desc:'Unirse al Club Élite Trail',                                    check:()=>G.club?.id==='elite'},
  {id:'club_full_service',rarity:'hard',  label:'Todo incluido',           desc:'Usar fisio y entrenador del club en la misma temporada',         check:()=>!!(G._clubFisioUsed&&G._clubEntrenadorUsed)},
  {id:'club_ascent',     rarity:'hard',   label:'Ascenso social',          desc:'Pasar de Sin Club a Club Élite a lo largo de la carrera',        check:()=>!!(G._clubAscent)},
  // ══ MODO NORMAL — LEGENDARIO (nuevos) ═════════════════════
  {id:'win_25',          rarity:'legendary',label:'Veinticinco victorias', desc:'Ganar 25 carreras',                                             check:()=>careerAgg().wins>=25},
  {id:'top_3_world',     rarity:'legendary',label:'El podio del mundo',    desc:'Alcanzar el ranking #3 mundial',                                check:()=>(G.ranking||999)<=3},
  {id:'km_3000',         rarity:'legendary',label:'Tres mil kilómetros',   desc:'Acumular 3.000 km de carrera',                                  check:()=>(G.totalCareerKm||0)>=3000},
  {id:'decade_runner',   rarity:'legendary',label:'Una década corriendo',  desc:'Completar 10 temporadas',                                       check:()=>(G.year||0)>=10},
  {id:'money_100k',      rarity:'legendary',label:'Independencia económica',desc:'Ahorrar €100.000',                                            check:()=>(G.money||0)>=100000},
  {id:'win_after_retire',rarity:'legendary',label:'Última bala',           desc:'Ganar una carrera en tu año de retirada',                       check:()=>!!(G._retireYear&&G._retireYear===G.year&&(careerAgg().winsByYear[G.year]||0)>=1)},
  {id:'ironman_year',    rarity:'legendary',label:'Máquina',               desc:'Completar 8 o más carreras en una sola temporada',              check:()=>Object.values(careerAgg().racesByYear).some(v=>v>=8)},
  {id:'own_brand',       rarity:'legendary',label:'Tu propia marca',       desc:'Crear tu marca de ropa propia',                                 check:()=>!!(G.ownBrand)},
  {id:'empire',          rarity:'legendary',label:'Imperio del trail',     desc:'Tener activa tu marca propia más 3 sponsors de tier 3 o superior',check:()=>!!(G.ownBrand)&&Object.values(G.sponsors||{}).filter(s=>s&&(s.tier||0)>=3).length>=3},
  // ══ MODO NORMAL — JOKE ══════════════════════════════════
  {id:'joke_broke',          rarity:'joke',label:'Ruina total',            desc:'Llegar a €0 de dinero',                                          check:()=>(G.money||0)<=0&&careerAgg().n>=1},
  {id:'joke_max_load',       rarity:'joke',label:'Cuerpo de sacrificio',   desc:'Llegar al 100% de carga corporal',                              check:()=>(G.bodyLoad||0)>=100},
  {id:'joke_3injuries',      rarity:'joke',label:'Imán de lesiones',       desc:'Sufrir 3 lesiones en la misma temporada',                       check:()=>(G.injuryHistory||[]).filter(i=>i.year===G.year).length>=3},
  {id:'joke_last_place',     rarity:'joke',label:'El farolillo rojo',      desc:'Terminar último en una carrera',                                check:()=>(G._lastPlaceCount||0)>=1},
  {id:'joke_broke_sponsor',  rarity:'joke',label:'Mal cliente',            desc:'Incumplir el objetivo de 3 sponsors distintos a lo largo de la carrera',check:()=>(G._distinctPenaltySponsorIds||[]).length>=3},
  {id:'joke_fire_sponsor',   rarity:'joke',label:'Yo lo rompo',            desc:'Romper 2 contratos de patrocinio anticipadamente',              check:()=>(G._sponsorBreaks||0)>=2},
  {id:'joke_no_train',       rarity:'joke',label:'¿Entrenar para qué?',    desc:'Completar una temporada entera sin hacer ningún bloque de entrenamiento',check:()=>!!(G._noTrainSeasonDone)},
  {id:'joke_storm_finish',   rarity:'joke',label:'Mojado pero orgulloso',  desc:'Terminar una carrera con tormenta activa y energía por debajo del 10%',check:()=>(G._stormLowEnergyFinishes||0)>=1},
  {id:'joke_sabotage',       rarity:'joke',label:'No me preguntes',        desc:'Tomar 3 decisiones de sabotaje a lo largo de la carrera',       check:()=>(G._sabotageCount||0)>=3},
  {id:'joke_helping',        rarity:'joke',label:'El buen samaritano',     desc:'Ayudar a un corredor lesionado en carrera 3 veces',             check:()=>(G._helpingCount||0)>=3},
  {id:'joke_rival_always_wins',rarity:'joke',label:'Mi nemesis me odia',   desc:'Perder contra tu rival nemesis 5 veces seguidas',               check:()=>(G._rivalLossStreak||0)>=5},
  {id:'joke_retire_early',   rarity:'joke',label:'No era para mí',         desc:'Retirarte en el año 1 o 2',                                     check:()=>!!(G._retireYear&&G._retireYear<=2)},
  // ══ MODO EXPRÉS — FÁCIL ══════════════════════════════════
  {id:'xp_first_race',  rarity:'easy',   mode:'expres',label:'Sin tiempo que perder',desc:'Completar tu primera carrera en modo Exprés',              check:()=>(G.gameMode==='expres')&&careerAgg().n>=1},
  {id:'xp_finish',      rarity:'easy',   mode:'expres',label:'Superviviente',         desc:'Completar las 3 temporadas del modo Exprés',               check:()=>(G.gameMode==='expres')&&(G.year||0)>=3},
  {id:'xp_timed_response',rarity:'easy', mode:'expres',label:'Reflejos de corredor',  desc:'Responder a un evento temporizado antes de que expire',    check:()=>(G._xpTimerAnsweredCareer||0)>=1},
  // ══ MODO EXPRÉS — MEDIO ═══════════════════════════════════
  {id:'xp_win_y1',      rarity:'medium', mode:'expres',label:'Rápido y directo',      desc:'Ganar una carrera en la primera temporada de Exprés',      check:()=>(G.gameMode==='expres')&&(G.year||0)<=1&&(careerAgg().winsByYear[1]||0)>=1},
  {id:'xp_podium_5',    rarity:'medium', mode:'expres',label:'Sprint al podio',       desc:'Conseguir 5 podios a lo largo de las 3 temporadas',        check:()=>(G.gameMode==='expres')&&careerAgg().podiums>=5},
  {id:'xp_all_timed',   rarity:'medium', mode:'expres',label:'Siempre alerta',        desc:'Responder a todos los eventos temporizados de una carrera antes de que expiren',check:()=>!!(G._xpAllTimedInARace)},
  {id:'xp_top50',       rarity:'medium', mode:'expres',label:'En tiempo récord',      desc:'Alcanzar el ranking #50 antes de terminar las 3 temporadas', check:()=>(G.gameMode==='expres')&&(G.ranking||999)<=50},
  {id:'xp_sponsor',     rarity:'medium', mode:'expres',label:'Sponsor express',       desc:'Firmar un contrato de patrocinio dentro del modo Exprés',  check:()=>(G.gameMode==='expres')&&Object.values(G.sponsors||{}).some(Boolean)},
  // ══ MODO EXPRÉS — DIFÍCIL ══════════════════════════════════
  {id:'xp_win_3',       rarity:'hard',   mode:'expres',label:'Tres victorias en tres años',desc:'Ganar al menos una carrera en cada una de las 3 temporadas',check:()=>(G.gameMode==='expres')&&[1,2,3].every(yr=>(careerAgg().winsByYear[yr]||0)>=1)},
  {id:'xp_top25',       rarity:'hard',   mode:'expres',label:'Meteoro',               desc:'Alcanzar el ranking #25 o mejor en 3 temporadas',           check:()=>(G.gameMode==='expres')&&(G.ranking||999)<=25},
  {id:'xp_no_dnf',      rarity:'hard',   mode:'expres',label:'Sin fisuras',           desc:'Completar las 3 temporadas sin un solo abandono',           check:()=>(G.gameMode==='expres')&&(G.year||0)>=3&&(G.raceAbandonedCount||0)===0},
  {id:'xp_timed_perfect',rarity:'hard',  mode:'expres',label:'Instinto puro',         desc:'Tomar la decisión óptima en todos los eventos temporizados de una misma carrera',check:()=>!!(G._xpPerfectTimedRace)},
  // ══ MODO EXPRÉS — LEGENDARIO ═══════════════════════════════
  {id:'xp_top10',       rarity:'legendary',mode:'expres',label:'Relámpago',           desc:'Alcanzar el ranking #10 o mejor en solo 3 temporadas',     check:()=>(G.gameMode==='expres')&&(G.ranking||999)<=10},
  {id:'xp_win_season',  rarity:'legendary',mode:'expres',label:'Temporada perfecta express',desc:'Ganar 3 o más carreras en una misma temporada dentro del modo Exprés',check:()=>(G.gameMode==='expres')&&[1,2,3].some(yr=>(careerAgg().winsByYear[yr]||0)>=3)},
  // ══ MODO EXPRÉS — JOKE ══════════════════════════════════
  {id:'joke_xp_slow',        rarity:'joke',mode:'expres',label:'Lento o vago',        desc:'No responder a ningún evento temporizado antes de que expire en una carrera',check:()=>!!(G._xpNoAnswerRace)},
  {id:'joke_xp_dnf_y1',      rarity:'joke',mode:'expres',label:'Ni arrancó',          desc:'Abandonar en la primera temporada del modo Exprés',        check:()=>(G.gameMode==='expres')&&(G.year||0)<=1&&(G.raceAbandonedCount||0)>=1},
  {id:'joke_xp_last',        rarity:'joke',mode:'expres',label:'Express al revés',    desc:'Terminar las 3 temporadas con el ranking #200 o peor',     check:()=>(G.gameMode==='expres')&&(G.year||0)>=3&&(G.ranking||999)>=200},
  {id:'joke_xp_no_sponsor',  rarity:'joke',mode:'expres',label:'Solo ante el peligro',desc:'Completar las 3 temporadas sin firmar ningún sponsor',     check:()=>(G.gameMode==='expres')&&(G.year||0)>=3&&!Object.values(G.sponsors||{}).some(Boolean)},
  // ══ CANICROSS — FÁCIL (nuevos) ═══════════════════════════
  {id:'cn_first_podium', rarity:'easy',  mode:'cn',label:'Primer podio juntos',       desc:'Conseguir el primer podio en canicross',                   check:()=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos<=3)},
  {id:'cn_vet_visit',    rarity:'easy',  mode:'cn',label:'Buen dueño',                desc:'Llevar al perro al veterinario antes de la temporada',      check:()=>(G.cnVetHistory||[]).length>=1},
  {id:'cn_first_dnf',    rarity:'easy',  mode:'cn',label:'El trail también duele',    desc:'Abandonar una carrera de canicross por primera vez',        check:()=>(G.cnRaceResults||[]).some(r=>r.dnf)},
  {id:'cn_dog_named',    rarity:'easy',  mode:'cn',label:'Tiene nombre',              desc:'Ponerle nombre al perro al inicio de la partida',           check:()=>!!(cnActiveDog()?.name&&cnActiveDog().name.trim())},
  {id:'cn_preseason_full',rarity:'easy', mode:'cn',label:'Pretemporada completa',     desc:'Completar todas las actividades de pretemporada disponibles',check:()=>(G.cnPreseasonDone||[]).length>=4},
  // ══ CANICROSS — MEDIO (nuevos) ════════════════════════════
  {id:'cn_win_3',        rarity:'medium',mode:'cn',label:'Trío victorioso',           desc:'Ganar 3 carreras de canicross',                             check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf&&r.pos===1).length>=3},
  {id:'cn_podium_10',    rarity:'medium',mode:'cn',label:'Dúo constante',             desc:'Conseguir 10 podios en total',                              check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf&&r.pos<=3).length>=10},
  {id:'cn_win_streak_3', rarity:'medium',mode:'cn',label:'Racha juntos',              desc:'Ganar 3 carreras seguidas',                                 check:()=>{let s=0;for(const r of(G.cnRaceResults||[])){if(!r.dnf&&r.pos===1){s++;if(s>=3)return true;}else s=0;}return false;}},
  {id:'cn_season_win',   rarity:'medium',mode:'cn',label:'Temporada triunfal',        desc:'Ganar 3 o más carreras en la misma temporada',              check:()=>{const ss=[...new Set((G.cnRaceResults||[]).map(r=>r.season))];return ss.some(s=>(G.cnRaceResults||[]).filter(r=>r.season===s&&!r.dnf&&r.pos===1).length>=3);}},
  {id:'cn_injury_comeback',rarity:'medium',mode:'cn',label:'Se levanta',              desc:'Ganar una carrera después de que el perro se recupere de una lesión',check:()=>!!(G._cnInjuryComeback)},
  {id:'cn_cat_win',      rarity:'medium',mode:'cn',label:'Campeón de categoría',      desc:'Ganar en tu categoría de edad (junior, senior o veterano)', check:()=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.catPos===1)},
  {id:'cn_tier3_podium', rarity:'medium',mode:'cn',label:'Liga grande',               desc:'Conseguir un podio en una carrera de tier 3 o superior',    check:()=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos<=3&&(r.tier||0)>=3)},
  {id:'cn_bond_recover', rarity:'medium',mode:'cn',label:'Reconciliados',             desc:'Recuperar el vínculo del perro desde menos de 30 hasta más de 70',check:()=>!!(G._cnBondRecovered)},
  {id:'cn_season_4',     rarity:'medium',mode:'cn',label:'Cuatro inviernos',          desc:'Completar 4 temporadas de canicross',                       check:()=>(G.cnSeason||1)>=5},
  // ══ CANICROSS — DIFÍCIL (nuevos) ═════════════════════════
  {id:'cn_win_10',       rarity:'hard',  mode:'cn',label:'Diez victorias juntos',     desc:'Ganar 10 carreras de canicross',                            check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf&&r.pos===1).length>=10},
  {id:'cn_dog_healthy',  rarity:'hard',  mode:'cn',label:'Perro de hierro',           desc:'Completar 3 temporadas seguidas sin que el perro se lesione',check:()=>(G._cnDogHealthyStreak||0)>=3},
  {id:'cn_perfect_bond', rarity:'hard',  mode:'cn',label:'Perfecta sincronía',        desc:'Ganar una carrera con el vínculo del perro al máximo (100)', check:()=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos===1)&&(cnActiveDog()?.peakBond||0)>=100},
  {id:'cn_tier4_win',    rarity:'hard',  mode:'cn',label:'Élite canina',              desc:'Ganar una carrera de tier 4',                               check:()=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos===1&&r.tier===4)},
  {id:'cn_vet_category', rarity:'hard',  mode:'cn',label:'Veterano en forma',         desc:'Ganar una carrera con el corredor con más de 45 años',      check:()=>(G.runner?.age||0)>=45&&(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos===1)},
  {id:'cn_season_6',     rarity:'hard',  mode:'cn',label:'Seis inviernos',            desc:'Completar 6 temporadas de canicross',                       check:()=>(G.cnSeason||1)>=7},
  {id:'cn_win_all_tiers',rarity:'hard',  mode:'cn',label:'Sin techo',                 desc:'Ganar al menos una carrera en cada tier (1, 2, 3 y 4)',     check:()=>[1,2,3,4].every(t=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos===1&&r.tier===t))},
  // ══ CANICROSS — LEGENDARIO (nuevos) ══════════════════════
  {id:'cn_wins_20',      rarity:'legendary',mode:'cn',label:'Veinte victorias',       desc:'Ganar 20 carreras de canicross en total',                   check:()=>(G.cnRaceResults||[]).filter(r=>!r.dnf&&r.pos===1).length>=20},
  {id:'cn_dog_10',       rarity:'legendary',mode:'cn',label:'Una vida entera',        desc:'El perro llega a su 10.ª temporada de vida',               check:()=>{const d=cnActiveDog();return d?(G.cnSeason||1)-(d.birthSeason||1)>=10:false;}},
  {id:'cn_season_8',     rarity:'legendary',mode:'cn',label:'Ocho inviernos',         desc:'Completar 8 temporadas de canicross',                       check:()=>(G.cnSeason||1)>=9},
  {id:'cn_perfect_3seasons',rarity:'legendary',mode:'cn',label:'Dinastía',            desc:'Ganar todas las carreras en 3 temporadas distintas (mínimo 3 cada una)',check:()=>(G._cnPerfectSeasons||0)>=3},
  {id:'cn_same_dog_win', rarity:'legendary',mode:'cn',label:'Toda una vida juntos',   desc:'Ganar una carrera con el mismo perro en la temporada 7 o posterior',check:()=>(G.cnRaceResults||[]).some(r=>!r.dnf&&r.pos===1&&(r.season||0)>=7)},
  // ══ CANICROSS — JOKE ══════════════════════════════════════
  {id:'joke_cn_low_bond',       rarity:'joke',mode:'cn',label:'Nos toleramos',        desc:'Competir en una carrera con vínculo por debajo de 20',      check:()=>(G._cnLowBondRaced||0)>=1},
  {id:'joke_cn_dog_dnf',        rarity:'joke',mode:'cn',label:'El perro manda',       desc:'Abandonar 3 carreras por causas relacionadas con el perro',  check:()=>(G._cnDogDnfCount||0)>=3},
  {id:'joke_cn_no_cmds',        rarity:'joke',mode:'cn',label:'Improvisados',         desc:'Llegar a la primera carrera sin enseñar ningún comando al perro',check:()=>!!(G._cnRacedWithoutCommands)},
  {id:'joke_cn_broke',          rarity:'joke',mode:'cn',label:'Muy caro este perro',  desc:'Llegar a €0 en canicross',                                  check:()=>(G.cnMoney||0)<=0},
  {id:'joke_cn_injury_dog',     rarity:'joke',mode:'cn',label:'Mal entrenador',       desc:'El perro se lesiona en 2 temporadas seguidas',              check:()=>!!(G._cnDogInjury2Consecutive)},
  {id:'joke_cn_ignore_vet',     rarity:'joke',mode:'cn',label:'El vet puede esperar', desc:'Competir toda una temporada sin llevar al perro al veterinario',check:()=>!!(G._cnIgnoredVetSeason)},
  {id:'joke_cn_last',           rarity:'joke',mode:'cn',label:'Últimos pero juntos',  desc:'Terminar último en una carrera de canicross',               check:()=>(G._cnLastPlaceCount||0)>=1},
  {id:'joke_cn_preseason_nothing',rarity:'joke',mode:'cn',label:'Sin preparación',   desc:'Llegar a la primera carrera sin hacer ninguna actividad de pretemporada',check:()=>!!(G._cnPreseasonNothing)},
  // ══ ENTRENADOR — FÁCIL (CR-38, v76) ═══════════════════════
  {id:'coach_first_athlete',rarity:'easy',  mode:'coach',label:'Primer pupilo',         desc:'Aceptar tu primer atleta como entrenador',                 check:()=>!!G.coachAthlete||(G.coachAthleteHistory||[]).length>=1},
  {id:'coach_season_3',  rarity:'easy',  mode:'coach',label:'Tres temporadas guiando',  desc:'Completar 3 temporadas con el mismo atleta',               check:()=>(G.coachSeason||1)>=3},
  {id:'coach_trust_80',  rarity:'easy',  mode:'coach',label:'Confianza plena',          desc:'Alcanzar 80 de confianza con tu atleta',                   check:()=>(G.coachTrust||0)>=80},
  // ══ ENTRENADOR — MEDIA ═════════════════════════════════════
  {id:'coach_wins_10',   rarity:'medium',mode:'coach',label:'Diez victorias en el banquillo',desc:'Sumar 10 victorias entrenando (todos tus atletas)',   check:()=>(G.coachAthleteHistory||[]).reduce((s,h)=>s+(h.wins||0),0)>=10},
  {id:'coach_multi_athlete',rarity:'medium',mode:'coach',label:'Cantera de talentos',   desc:'Entrenar a 3 atletas distintos a lo largo de la carrera',  check:()=>new Set((G.coachAthleteHistory||[]).map(h=>h.name)).size>=3},
  {id:'coach_rep_60',    rarity:'medium',mode:'coach',label:'Entrenador de confianza',  desc:'Alcanzar reputación de entrenador 60',                     check:()=>(G.coachReputation||0)>=60},
  // ══ ENTRENADOR — DIFÍCIL ═══════════════════════════════════
  {id:'coach_rep_90',    rarity:'hard',  mode:'coach',label:'Entrenador de élite',      desc:'Alcanzar reputación de entrenador 90',                     check:()=>(G.coachReputation||0)>=90},
  {id:'coach_club_offer',rarity:'hard',  mode:'coach',label:'Ojeado por un club',       desc:'Recibir la oferta de pasar a dirigir un club',             check:()=>!!G._coachClubOfferReceived},
  {id:'coach_beat_nemesis',rarity:'hard',mode:'coach',label:'Ajuste de cuentas',        desc:'Superar a un rival que llevaba 2+ carreras ganándole a tu atleta',check:()=>!!G._coachBeatNemesis},
  // ══ ENTRENADOR — LEGENDARIO ════════════════════════════════
  {id:'coach_5_athletes',rarity:'legendary',mode:'coach',label:'Forjador de leyendas',  desc:'Entrenar a 5 atletas distintos a lo largo de la carrera',  check:()=>new Set((G.coachAthleteHistory||[]).map(h=>h.name)).size>=5},
  {id:'coach_perfect_season',rarity:'legendary',mode:'coach',label:'Temporada perfecta como entrenador',desc:'Ganar todas las carreras de una temporada con tu atleta (mín. 3)',check:()=>!!G._coachPerfectSeason},
  {id:'coach_trust_wins',rarity:'legendary',mode:'coach',label:'Vínculo inquebrantable',desc:'Terminar una temporada con confianza 100 y 3 o más victorias',check:()=>(G.coachAthleteHistory||[]).some(h=>h.trust===100&&(h.wins||0)>=3)},
  // ══ CLUB — FÁCIL (CR-38, v76) ══════════════════════════════
  {id:'cm_found',        rarity:'easy',  mode:'club', label:'Fundador',                 desc:'Fundar tu primer club',                                    check:()=>!!G.clubModeData},
  {id:'cm_socios_20',    rarity:'easy',  mode:'club', label:'Club en crecimiento',       desc:'Alcanzar 20 socios',                                       check:()=>(G.clubModeData?.socios||0)>=20},
  {id:'cm_season_3',     rarity:'easy',  mode:'club', label:'Tres temporadas al frente', desc:'Completar 3 temporadas dirigiendo el club',                check:()=>(G.clubModeData?.temporada||1)>=3},
  // ══ CLUB — MEDIA ═══════════════════════════════════════════
  {id:'cm_full_roster',  rarity:'medium',mode:'club', label:'Plantilla completa',        desc:'Llenar la plantilla al máximo',                            check:()=>{const d=G.clubModeData;if(!d)return false;const max=d.instalaciones?.residencia?8:6;return (d.plantilla||[]).length>=max;}},
  {id:'cm_all_facilities',rarity:'medium',mode:'club',label:'Infraestructura completa',  desc:'Construir las 4 instalaciones del club',                   check:()=>{const i=G.clubModeData?.instalaciones;return !!i&&Object.values(i).every(Boolean);}},
  {id:'cm_cohesion_80',  rarity:'medium',mode:'club', label:'Vestuario unido',           desc:'Alcanzar 80 de cohesión de grupo',                         check:()=>(G.clubModeData?.cohesion||0)>=80},
  {id:'cm_cantera_promote',rarity:'medium',mode:'club',label:'Cantera que da frutos',    desc:'Promocionar un corredor de cantera a la plantilla titular',check:()=>!!G._clubCanteraPromoted},
  // ══ CLUB — DIFÍCIL ═════════════════════════════════════════
  {id:'cm_rep_75',       rarity:'hard',  mode:'club', label:'Superar a los grandes',     desc:'Superar en reputación al rival de nivel nacional',        check:()=>{const d=G.clubModeData;if(!d)return false;const nac=(d.rivalClubs||[]).find(r=>r.level==='nacional');return !!nac&&(d.reputacion||0)>nac.rep;}},
  {id:'cm_rep_90',       rarity:'hard',  mode:'club', label:'Club de referencia',        desc:'Alcanzar 90 de reputación de club',                       check:()=>(G.clubModeData?.reputacion||0)>=90},
  {id:'cm_objective_3',  rarity:'hard',  mode:'club', label:'Objetivos cumplidos',       desc:'Cumplir el objetivo de temporada 3 veces',                 check:()=>(G._clubObjectivesMet||0)>=3},
  // ══ CLUB — LEGENDARIO ══════════════════════════════════════
  {id:'cm_season_10',    rarity:'legendary',mode:'club',label:'Una década al frente',    desc:'Completar 10 temporadas dirigiendo el mismo club',         check:()=>(G.clubModeData?.temporada||1)>=10},
  {id:'cm_all_rivals',   rarity:'legendary',mode:'club',label:'Rey del territorio',      desc:'Superar en reputación a los 3 clubes rivales a la vez',    check:()=>{const d=G.clubModeData;if(!d||!(d.rivalClubs||[]).length)return false;return d.rivalClubs.every(r=>(d.reputacion||0)>r.rep);}},
];

function trainingEffFromH(h){
  if(h<=5) return 0.50;
  if(h<=10)return 0.65;
  if(h<=16)return 0.80;
  if(h<=22)return 0.90;
  return 1.00;
}

// ── T52 (v92) · Un solo esquema de carrera ────────────────────────────────
// El desnivel vivía DOS veces: como cadena escrita a mano en cada carrera
// ('1.200m+') y como la suma de los `gain` de sus tramos, que es lo que de
// verdad se corre. Las dos no coincidían en ocho de las veinticuatro carreras
// —`pinar` anunciaba 1.200m+ y sus tramos suman 600— y no había forma de
// notarlo jugando. Ahora la fuente es una: los tramos. La cadena se genera.
//
// Es también lo que arregla T12 de raíz: aquel evento leía `race.gain`, un
// campo numérico que ninguna carrera tenía porque el desnivel era una cadena.
// Ahora ese número existe y se llama raceGainTotal().
function raceGainTotal(race){
  if(!race||!Array.isArray(race.segs))return 0;
  return race.segs.reduce((a,s)=>a+Math.max(0,s.gain||0),0);
}
// Mismo formato que llevaban las cadenas a mano: 600 → '600m+', 1200 → '1.200m+'.
function fmtGain(n){
  const v=Math.max(0,Math.round(n||0));
  return (v>=1000?Math.floor(v/1000)+'.'+String(v%1000).padStart(3,'0'):String(v))+'m+';
}
// Lo que se pinta. `race.desnivel` sobrevive en los saves antiguos (selectedRaces
// guarda copias de las carreras), pero ya no se lee: si los tramos están, mandan.
function raceDesnivel(race){
  if(race&&Array.isArray(race.segs)&&race.segs.length)return fmtGain(raceGainTotal(race));
  return (race&&race.desnivel)||'—';
}

// CLUB_RACES llamaba `dist` a lo que el resto del juego llama `km`. Unificado en
// `km` (T52), pero `clubModeData.seasonResults` guarda copias de esas carreras
// dentro del save, así que los guardados anteriores traen `dist`. migrateState
// los convierte; esto es el cinturón para que ninguna pantalla llegue a pintar
// "undefinedkm" si algún camino se escapa.
function clubRaceKm(race){return (race&&(race.km??race.dist))??0;}

const RACES_DB=[
  {id:'pinar',    name:'Trail Mágina',             type:'20K local',   km:20, cost:30,  prize:60,   reqRanking:999,weather_risk:0.10, month:1, monthName:'Enero',      quarter:1, tier:'local',
   segs:[{name:'Llano Salida',km:4,type:'flat',gain:0,base:1100},{name:'Subida Pinar',km:5,type:'climb',gain:600,base:1900},{name:'Cresta',km:4,type:'flat',gain:0,base:1300,aid:true},{name:'Bajada',km:4,type:'descent',gain:-600,base:1300},{name:'Sprint',km:3,type:'flat',gain:0,base:800}]},
  {id:'febrero',  name:'La Pedriza Trail',        type:'25K regional',km:25, cost:40,  prize:80,   reqRanking:999,weather_risk:0.25, month:2, monthName:'Febrero',     quarter:1, tier:'local',
   segs:[{name:'Salida',km:3,type:'flat',gain:0,base:1200},{name:'Subida Granito',km:7,type:'climb',gain:700,base:2200},{name:'Cuerda Larga',km:2,type:'flat',gain:0,base:1400,aid:true},{name:'Subida Cogolludo',km:3,type:'climb',gain:600,base:2400},{name:'Bajada Técnica',km:8,type:'descent',gain:-900,base:2000,aid:true},{name:'Meta',km:2,type:'flat',gain:0,base:1000}]},
  {id:'copa',     name:'Copa Catalana de Trail',  type:'30K regional',km:30, cost:70,  prize:200,  reqRanking:999,weather_risk:0.20, month:3, monthName:'Marzo',       quarter:1, tier:'regional',
   segs:[{name:'Salida',km:4,type:'flat',gain:0,base:1200},{name:'Primera Subida',km:5,type:'climb',gain:600,base:2100},{name:'Collado',km:3,type:'flat',gain:0,base:1100,aid:true},{name:'Bajada',km:4,type:'descent',gain:-600,base:1600},{name:'Ribera',km:5,type:'flat',gain:0,base:1700},{name:'Segundo Repecho',km:5,type:'climb',gain:600,base:2000},{name:'Meta',km:4,type:'descent',gain:-500,base:1200,aid:true}]},
  {id:'abril',    name:'Maratón de Montaña de Guadarrama',type:'28K media',   km:28, cost:55,  prize:150,  reqRanking:999,weather_risk:0.15, month:4, monthName:'Abril',       quarter:2, tier:'regional',
   segs:[{name:'Llano Inicio',km:4,type:'flat',gain:0,base:1400},{name:'Subida Peñalara',km:7,type:'climb',gain:900,base:2500},{name:'Collado',km:2,type:'flat',gain:0,base:1500,aid:true},{name:'Bajada Técnica',km:5,type:'descent',gain:-800,base:2000},{name:'Valle',km:3,type:'flat',gain:0,base:1400,aid:true},{name:'Repecho Final',km:4,type:'climb',gain:700,base:2200},{name:'Descenso Meta',km:3,type:'descent',gain:-600,base:1700}]},
  {id:'mayo',     name:'Zegama-Aizkorri',         type:'42K élite',   km:42, cost:100, prize:500,  reqRanking:20,weather_risk:0.25, month:5, monthName:'Mayo',        quarter:2, tier:'elite',   zegamaSpecial:true,
   segs:[{name:'Salida Zumarraga',km:3,type:'flat',gain:0,base:900},{name:'Subida Usategi',km:6,type:'climb',gain:700,base:2800},{name:'Cresta Aizkorri',km:5,type:'climb',gain:800,base:3200,aid:true},{name:'Bajada Técnica',km:5,type:'descent',gain:-1000,base:2400},{name:'Valle de Zegama',km:3,type:'flat',gain:0,base:1200,aid:true},{name:'Subida Aratz',km:8,type:'climb',gain:1000,base:3100},{name:'Collado Zelai',km:3,type:'climb',gain:300,base:1800,aid:true},{name:'Descenso Final',km:7,type:'descent',gain:-1100,base:2200},{name:'Meta Zegama',km:2,type:'flat',gain:0,base:900}]},
  {id:'junio',    name:'Buff Epic Trail',         type:'32K nacional',km:32, cost:90,  prize:300,  reqRanking:30,weather_risk:0.20, month:6, monthName:'Junio',       quarter:2, tier:'nacional',
   segs:[{name:'Salida Bagà',km:4,type:'flat',gain:0,base:1300},{name:'Repecho Berguedà',km:4,type:'climb',gain:700,base:2300},{name:'Cresta',km:3,type:'climb',gain:600,base:2000,aid:true},{name:'Bajada',km:4,type:'descent',gain:-800,base:1700},{name:'Valle',km:5,type:'flat',gain:0,base:1800,aid:true},{name:'La Pared',km:3,type:'climb',gain:900,base:2600},{name:'Descenso',km:5,type:'descent',gain:-700,base:1700},{name:'Sprint',km:4,type:'flat',gain:0,base:1100}]},
  {id:'julio',    name:'Maratón Alpino Madrileño',type:'42K nacional', km:42, cost:110, prize:450,  reqRanking:25,weather_risk:0.35, month:7, monthName:'Julio',       quarter:3, tier:'nacional',
   segs:[{name:'Salida Navacerrada',km:5,type:'flat',gain:0,base:1500},{name:'Subida Siete Picos',km:8,type:'climb',gain:900,base:2500},{name:'Collado',km:2,type:'flat',gain:0,base:1800,aid:true},{name:'Bajada Técnica',km:6,type:'descent',gain:-800,base:2000},{name:'Valle Lozoya',km:3,type:'flat',gain:0,base:1500,aid:true},{name:'Subida Peñalara',km:8,type:'climb',gain:1000,base:2800},{name:'Repecho Final',km:3,type:'climb',gain:700,base:2200,aid:true},{name:'Gran Descenso',km:7,type:'descent',gain:-900,base:2500}]},
  {id:'agosto',   name:'KV Canfranc · Vertical', type:'12K vertical', km:12, cost:50,  prize:120,  reqRanking:999,weather_risk:0.20, month:8, monthName:'Agosto',      quarter:3, tier:'local',    altitude:true,
   segs:[{name:'Salida Canfranc',km:2,type:'flat',gain:0,base:900},{name:'Rampa Inicial',km:3,type:'climb',gain:300,base:2000},{name:'Subida Vertical',km:5,type:'climb',gain:700,base:3500,aid:true},{name:'Descenso Rápido',km:2,type:'descent',gain:-700,base:1500}]},
  {id:'sierra',   name:'Ultra Pirineu UP55',      type:'55K élite',   km:55, cost:130, prize:700,  reqRanking:15,weather_risk:0.30, month:9, monthName:'Septiembre',  quarter:3, tier:'elite',
   segs:[{name:'Salida Bagà',km:4,type:'flat',gain:0,base:1400},{name:'Primer Repecho',km:6,type:'climb',gain:900,base:2800},{name:'Puig de la Canal',km:3,type:'flat',gain:0,base:1800,aid:true},{name:'Bajada Gisclareny',km:5,type:'descent',gain:-900,base:2000},{name:'Valle Llobregat',km:5,type:'flat',gain:0,base:1600,aid:true},{name:'Subida Pedraforca',km:7,type:'climb',gain:1400,base:3200},{name:'Cresta Pedraforca',km:3,type:'climb',gain:400,base:2200,aid:true},{name:'Subida Final',km:5,type:'climb',gain:1000,base:2800,aid:true},{name:'Gran Descenso',km:9,type:'descent',gain:-1300,base:2400},{name:'Meta Guardiola',km:8,type:'flat',gain:0,base:1500}]},
  {id:'octubre',  name:'Ultra Sierra Nevada',     type:'32K media',   km:32, cost:65,  prize:200,  reqRanking:999,weather_risk:0.25, month:10,monthName:'Octubre',     quarter:4, tier:'regional',
   segs:[{name:'Salida Granada',km:4,type:'flat',gain:0,base:1400},{name:'Subida Veleta',km:7,type:'climb',gain:900,base:2800},{name:'Collado',km:3,type:'flat',gain:0,base:1600,aid:true},{name:'Bajada Técnica',km:6,type:'descent',gain:-800,base:2200},{name:'Valle',km:4,type:'flat',gain:0,base:1500,aid:true},{name:'Subida Final',km:5,type:'climb',gain:900,base:2600},{name:'Descenso Meta',km:3,type:'descent',gain:-700,base:1800}]},
  {id:'monteperdido',name:'Monte Perdido Trail 50K',type:'50K élite',km:50,cost:150,prize:800,    reqRanking:20,weather_risk:0.40, month:11,monthName:'Noviembre',   quarter:4, tier:'elite',    altitude:true,
   segs:[{name:'Salida Llano',km:8,type:'flat',gain:0,base:1800},{name:'Primer Repecho',km:6,type:'climb',gain:650,base:2400},{name:'Cresta Alta',km:5,type:'climb',gain:500,base:2100,aid:true},{name:'Bajada Técnica',km:6,type:'descent',gain:-900,base:1800},{name:'Valle del Río',km:8,type:'flat',gain:0,base:1800,aid:true},{name:'La Pared',km:5,type:'climb',gain:750,base:2700},{name:'Descenso Final',km:6,type:'descent',gain:-600,base:1600,aid:true},{name:'Sprint Llegada',km:6,type:'flat',gain:0,base:900}]},
  {id:'diciembre', name:'San Silvestre de Montaña',type:'15K popular', km:15, cost:20,  prize:40,   reqRanking:999,  weather_risk:0.30, month:12,monthName:'Diciembre',   quarter:4, tier:'local',
   segs:[{name:'Salida',km:3,type:'flat',gain:0,base:900},{name:'Subida',km:4,type:'climb',gain:250,base:1600},{name:'Cresta',km:2,type:'flat',gain:0,base:900,aid:true},{name:'Bajada',km:3,type:'descent',gain:-250,base:1100},{name:'Meta',km:3,type:'flat',gain:0,base:800}]},
];

const TRAINING_BLOCKS=[
  {id:'volumen',name:'Volumen alto',desc:'Largas tiradas, base aeróbica.',detail:'Ideal para ultras y resistencia.',hours:12,
   effects:{resistencia:8,velocidad:-2,subida:3,bajada:0,nutricion:2,mental:1},
   flavor:['Salidas largas antes del amanecer. El cuerpo protesta las primeras semanas, luego entra en ritmo.','Kilómetros y más kilómetros. El aeróbico no miente — lo construyes a fuego lento.','Tiradas de dos horas que parecen interminables. Y sin embargo, son las que más cuentan.']},
  {id:'velocidad',name:'Trabajo de velocidad',desc:'Series y ritmo, ganas en llano.',detail:'Perfecto para media distancia.',hours:11,
   effects:{resistencia:-2,velocidad:9,subida:0,bajada:2,nutricion:0,mental:1},
   flavor:['Series en pista. La gente del parque te mira raro. A ti ya no te importa.','Repeticiones cortas, muy cortas. Las piernas queman. El crono no miente.','Sprints hasta que el pecho explota. Recuperas. Repites. El tiempo baja.']},
  {id:'tecnico',name:'Descenso técnico',desc:'Terreno difícil, mejora la bajada.',detail:'Ideal con mucho desnivel negativo.',hours:10,
   effects:{resistencia:0,velocidad:-1,subida:1,bajada:10,nutricion:0,mental:2},
   flavor:['Tres horas bajando el barranco. Las rodillas lo saben. Los pies también.','Piedras, raíces, barro. El terreno enseña más que cualquier entrenador.','Bajas rápido, te caes una vez, te levantas, bajas más rápido.']},
  {id:'recuperacion',name:'Recuperación activa',desc:'Sin forzar, consolidas lo aprendido.',detail:'Bueno tras lesión o temporada dura.',hours:6,
   effects:{resistencia:3,velocidad:2,subida:2,bajada:2,nutricion:3,mental:5},
   flavor:['Sin forzar, sin cronómetro. El cuerpo absorbe lo que lleva meses aprendiendo.','Rodajes suaves al atardecer. La mente se despeja. El cuerpo consolida.','Ritmo conversacional, piernas sueltas. A veces lo mejor que puedes hacer es no hacer nada.']},
  {id:'taper',name:'Descarga / Tapering',desc:'Bajas el volumen, dejas que el cuerpo se active.',detail:'Ningún stat sube — llegas fresco y con las piernas listas.',hours:4,
   effects:{resistencia:0,velocidad:0,subida:0,bajada:0,nutricion:0,mental:2},
   taperBlock:true,
   flavor:['Salidas cortas, muy cortas. El cuerpo agradece el respiro y acumula frescura.','Una semana sin forzar. Los músculos se activan de otra manera.','Ritmo tranquilo, cabeza despejada. Reservas llenas. Ya está todo hecho.']},
  {id:'cruzado',name:'Entrenamiento cruzado',desc:'Bici, natación o yoga. Mantienes la base sin destruir el cuerpo.',detail:'Ideal en recuperación de lesión o carga muy alta.',hours:6,
   effects:{resistencia:4,velocidad:0,subida:0,bajada:0,nutricion:2,mental:4},
   crossBlock:true,
   flavor:['Pedaladas tranquilas al atardecer. Las piernas descansan, el corazón sigue trabajando.','Una hora en la piscina. El agua lleva el peso. El cuerpo lo agradece.','Yoga y movilidad. No es correr, pero el cuerpo lo necesita igual.']},
];

const SPONSORS_DB=[
  // ── TIER 1 — Local (año 1+) ──────────────────────────────────────
  {id:'trailbase',   cat:'zapatillas',name:'TrailBase',         tier:1,reqYear:1,
   bonus:'Comodidad en llano',          statBonus:{velocidad:3},
   objective:'Terminar 2 carreras',     objKey:'finish2',
   salary:50,  duration:1, penaltyPct:0.10},
  {id:'vertix',      cat:'zapatillas',name:'Vertix Trail',       tier:1,reqYear:1,
   bonus:'Agarre en bajadas',           statBonus:{bajada:3},
   objective:'Terminar 3 carreras',     objKey:'finish3',
   salary:40,  duration:1, penaltyPct:0.10},
  {id:'altitudobasic',cat:'ropa',     name:'AltitudoBasic',      tier:1,reqYear:1,
   bonus:'Visibilidad y comodidad',     statBonus:{mental:2},
   objective:'Terminar la temporada',   objKey:'finishSeason',
   salary:45,  duration:1, penaltyPct:0.10},
  {id:'gelstart',    cat:'nutricion', name:'GelStart',            tier:1,reqYear:1,
   bonus:'Geles +15% más eficaces',     statBonus:{nutricion:3},
   objective:'Correr 3+ carreras',      objKey:'race3',
   salary:30,  duration:1, penaltyPct:0.10},
  {id:'trailsense',  cat:'tecnologia',name:'TrailSense Basic',    tier:1,reqYear:1,
   bonus:'Datos básicos en carrera',    statBonus:{mental:2},
   objective:'Terminar 2 carreras',     objKey:'finish2',
   salary:25,  duration:1, penaltyPct:0.10},

  // ── TIER 2 — Regional (año 2+) ──────────────────────────────────
  {id:'montanero',   cat:'zapatillas',name:'Montañero Pro',       tier:2,reqYear:2,
   bonus:'Subida más eficiente',        statBonus:{subida:4,bajada:2},
   objective:'Top 10 en una carrera',   objKey:'top10',
   salary:90,  duration:2, penaltyPct:0.15},
  {id:'altitudopro', cat:'ropa',      name:'AltitudoPro',         tier:2,reqYear:2,
   bonus:'Termorregulación avanzada',   statBonus:{mental:4,resistencia:2},
   objective:'Correr 4+ carreras',      objKey:'race4',
   salary:100, duration:2, penaltyPct:0.15},
  {id:'nutrifit',    cat:'nutricion', name:'NutriFit Sport',       tier:2,reqYear:2,
   bonus:'Geles +20% · recuperación mejorada', statBonus:{nutricion:5},
   objective:'Terminar 4+ carreras',    objKey:'finish4',
   salary:80,  duration:2, penaltyPct:0.15},
  {id:'gpspro',      cat:'tecnologia',name:'GPS TrailPro',         tier:2,reqYear:2,
   bonus:'Análisis de ruta · datos avanzados',  statBonus:{mental:3,velocidad:2},
   objective:'Top 10 en 2 carreras',    objKey:'top10x2',
   salary:75,  duration:2, penaltyPct:0.15},

  // ── TIER 3 — Nacional (año 4+) ──────────────────────────────────
  {id:'summit',      cat:'zapatillas',name:'Summit Elite',         tier:3,reqYear:4,reqRanking:50,
   bonus:'Máximo rendimiento en montaña', statBonus:{subida:5,bajada:4,resistencia:2},
   objective:'Top 5 en una carrera nacional', objKey:'top5nacional',
   salary:200, duration:2, penaltyPct:0.20},
  {id:'skyline',     cat:'ropa',      name:'Skyline Race Wear',    tier:3,reqYear:4,reqRanking:50,
   bonus:'Aerodinámica y protección',   statBonus:{velocidad:3,mental:5},
   objective:'Correr 5+ carreras',      objKey:'race5',
   salary:180, duration:2, penaltyPct:0.20},
  {id:'pronutrition',cat:'nutricion', name:'ProNutrition Lab',     tier:3,reqYear:4,reqRanking:50,
   bonus:'Protocolo nutricional completo', statBonus:{nutricion:6,resistencia:3},
   objective:'Top 10 en 3 carreras',    objKey:'top10x3',
   salary:160, duration:2, penaltyPct:0.20},
  {id:'garmontpro',  cat:'tecnologia',name:'Garmont Pro GPS',      tier:3,reqYear:4,reqRanking:50,
   bonus:'Análisis biomecánico completo', statBonus:{mental:5,velocidad:3},
   objective:'Top 5 en 2 carreras',     objKey:'top5x2',
   salary:150, duration:2, penaltyPct:0.20},

  // ── TIER 4 — Élite (año 6+ · ranking < 20) ──────────────────────
  {id:'vanguard',    cat:'zapatillas',name:'Vanguard Ultra',       tier:4,reqYear:6,reqRanking:20,
   bonus:'Material de élite mundial',   statBonus:{subida:6,bajada:5,velocidad:4},
   objective:'Podio en carrera nacional', objKey:'podioNacional',
   salary:400, duration:3, penaltyPct:0.25},
  {id:'alpinaelite', cat:'ropa',      name:'Alpina Elite',         tier:4,reqYear:6,reqRanking:20,
   bonus:'Equipamiento profesional',    statBonus:{mental:6,resistencia:4},
   objective:'Top 5 en 3 carreras',     objKey:'top5x3',
   salary:350, duration:3, penaltyPct:0.25},
  {id:'labnutrition',cat:'nutricion', name:'Lab Nutrition Elite',  tier:4,reqYear:6,reqRanking:20,
   bonus:'Nutrición de alto rendimiento', statBonus:{nutricion:8,resistencia:4},
   objective:'Top 10 en 4 carreras',    objKey:'top10x4',
   salary:300, duration:3, penaltyPct:0.25},
  {id:'polarelite',  cat:'tecnologia',name:'Polar Elite System',   tier:4,reqYear:6,reqRanking:20,
   bonus:'Sistema integrado de rendimiento', statBonus:{mental:6,velocidad:4},
   objective:'Podio en 2 carreras',     objKey:'podiox2',
   salary:280, duration:3, penaltyPct:0.25},
];

const CLUBS=[
  {id:'none',   name:'Sin club',              desc:'Independiente. Sin costes ni beneficios.',                                      cost:0,   statBonus:{},                        hasFisio:false, hasEntrenador:false, minYear:1,
   companions:[]},
  {id:'local',  name:'Club Local Trail',      desc:'Buen ambiente. Entrenas mejor en grupo.',                                       cost:20,  statBonus:{mental:3},               hasFisio:false, hasEntrenador:false, minYear:1,
   companions:['Mikel','Ane','Josu','Leire','Gorka']},
  {id:'montana',name:'Club de Alta Montaña',  desc:'Acceso a altitud. Fisio incluido. Rivales más duros.',                          cost:60,  statBonus:{subida:4},               hasFisio:true,  hasEntrenador:false, minYear:1,
   companions:['Ibón','Nekane','Aitor','Miren','Txomin']},
  {id:'elite',  name:'Club Élite Trail',      desc:'Lo mejor del circuito. Fisio + entrenador incluidos. Acceso a dorsales VIP.',   cost:120, statBonus:{subida:5,mental:3},      hasFisio:true,  hasEntrenador:true,  minYear:3,
   companions:['Eneko','Amaia','Urtzi','Nerea','Beñat']},
];

// Nombres de compañero aleatorio al unirse a un club
const BETWEEN_EVENTS=[
  {id:'injury',title:'Lesión leve',desc:'Tendinitis en la rodilla. Llevas días sin poder entrenar bien.',
   choices:[{text:'Descansar y recuperar (saltas la próxima carrera)',effect:'skip'},{text:'Correr igualmente (llegas con piernas al 80%)',effect:'legs_penalty'}]},
  {id:'interrupted',title:'Entrenamiento interrumpido',desc:'El trabajo y los imprevistos no te han dejado completar el bloque.',
   choices:[{text:'Entrenamiento de emergencia (bloque al 80%)',effect:'train_emergency'},{text:'Asumir que llegas más justo (bloque al 65%)',effect:'train_penalty'}]},
  {id:'extreme_weather',title:'Condiciones extremas anunciadas',desc:'La próxima carrera tiene previsión de calor extremo o tormenta.',
   choices:[{text:'Mantener el plan (penalización en carrera)',effect:'nothing'},{text:'Cambiar bloque de entrenamiento (pierdes progreso)',effect:'change_block'},{text:'Entrenamiento especial desplazándote (€150 extra)',effect:'special_train'}]},
  {id:'invite',title:'Invitación especial',desc:'Un organizador te ofrece una plaza gratis en una carrera fuera del calendario.',
   choices:[{text:'Aceptar — correr una prueba extra',effect:'add_race'},{text:'Declinar — mantener el plan',effect:'nothing'}]},
];

// ── EXPRESS: Eventos con contador (7 s) ──────────────────────────
const EXPRESS_TIMED_EVENTS=[
  {id:'xp_descent',timed:true,defaultChoice:0,
   title:'⛰ Bajada técnica dudosa',
   desc:'Entras demasiado fuerte en una bajada rota. Cada segundo cuenta.',
   choices:[
     {text:'Asegurar trazada — pierdes ritmo, ganas seguridad',id:'safe_descent'},
     {text:'Mantener ritmo — riesgo si las piernas están tocadas',id:'push_descent'},
   ]},
  {id:'xp_rival',timed:true,defaultChoice:1,
   title:'⚡ Un rival acelera delante de ti',
   desc:'Lleva 3 km a tu rueda. De repente clava las botas y acelera. ¿Le sigues?',
   choices:[
     {text:'Seguirle — mejor tiempo si vas bien, peor fatiga si vienes justo',id:'follow_rival'},
     {text:'Mantener tu plan — pequeño bonus mental',id:'hold_rival'},
   ]},
  {id:'xp_cramp',timed:true,defaultChoice:0,
   title:'🦵 Aviso de calambre',
   desc:'Notas un amago en el cuádricep izquierdo. Decisión inmediata.',
   choices:[
     {text:'Bajar un punto — aseguras la llegada',id:'ease_cramp'},
     {text:'Forzar unos minutos — posible bonus si el cuerpo aguanta',id:'push_cramp'},
   ]},
  {id:'xp_final',timed:true,defaultChoice:1,
   title:'🏁 Último tramo — todo o nada',
   desc:'Ves la meta. Vas al límite absoluto. ¿Remates o aseguras?',
   choices:[
     {text:'Rematar — bonus fuerte de tiempo, riesgo de acabar vacío',id:'sprint_finish'},
     {text:'Asegurar — llegas limpio, sin consecuencias',id:'safe_finish'},
   ]},
  {id:'xp_storm_timed',timed:true,defaultChoice:0,
   title:'⛈ El cielo se viene abajo',
   desc:'Tormenta repentina. ¿Guardas posición o aprietas antes de que empeore?',
   choices:[
     {text:'Guardar control — menor castigo de hidratación',id:'shelter_storm'},
     {text:'Apretar antes de que vaya a peor — riesgo si la tormenta sigue',id:'push_storm'},
   ]},
  {id:'xp_fork',timed:true,defaultChoice:0,
   title:'🔀 Bifurcación mal señalizada',
   desc:`Hay dos caminos y la marca está caída. Tienes que decidir ya.`,
   choices:[
     {text:'Izquierda — el terreno tiene mejor pinta (instinto)',id:'fork_left'},
     {text:'Derecha — parece más pisado (seguir la lógica)',id:'fork_right'},
   ]},
  // ── 6 nuevos timed ──────────────────────────────────────────────
  {id:'xp_rival_wheel',timed:true,defaultChoice:1,
   title:'🚴 Rival pegado a tu rueda',
   desc:'Llevas 2 km arrastrándole. Se aprovecha de tu ritmo. ¿Adelantas o le sacudes?',
   choices:[
     {text:'Acelerar fuerte para soltarle — -energía, ganas posición',id:'shake_rival'},
     {text:'Mantener ritmo — llega fresquito detrás, pero tú también',id:'keep_pace'},
   ]},
  {id:'xp_climb_attack',timed:true,defaultChoice:1,
   title:'⛰ Ataque en subida corta',
   desc:'Un rival pega un tirón fuerte justo antes del collado. ¿Respondes?',
   choices:[
     {text:'Responder — igualas su posición, -8 energía',id:'respond_climb'},
     {text:'Dejar ir — el gap crece pero llegas fresco arriba',id:'let_go_climb'},
   ]},
  {id:'xp_last_descent',timed:true,defaultChoice:1,
   title:'💨 Último descenso — ¿todo o nada?',
   desc:'Final técnico con polvo y barro. La meta está cerca. ¿Te la juegas?',
   choices:[
     {text:'Velocidad máxima — ganas 45s, riesgo de caída si piernas bajas',id:'full_descent'},
     {text:'Seguro — llegas limpio, +20s',id:'safe_last_descent'},
   ]},
  {id:'xp_slippery',timed:true,defaultChoice:0,
   title:'🟫 Paso resbaladizo',
   desc:'Barro fresco en plena bajada. El pie izquierdo busca agarre. Reacción.',
   choices:[
     {text:'Frenar y buscar trazada — +10s, evitas caída',id:'careful_slip'},
     {text:'Aguantar el equilibrio y seguir — riesgo si piernas<40',id:'push_slip'},
   ]},
  {id:'xp_heat_cold',timed:true,defaultChoice:0,
   title:'🌡 Golpe brusco de temperatura',
   desc:'En altura la temperatura ha cambiado de golpe. El cuerpo lo nota ya.',
   choices:[
     {text:'Ajustar ritmo — recuperas hidratación +8',id:'adjust_temp'},
     {text:'Ignorar y mantener — riesgo -15% stats',id:'ignore_temp'},
   ]},
  {id:'xp_double_cramp',timed:true,defaultChoice:0,
   title:'🦵🦵 Calambre doble',
   desc:'Los dos cuádriceps avisan a la vez. Carga corporal muy alta. Ahora.',
   choices:[
     {text:'Estirar 25s — -25s tiempo, evitas lesión',id:'stretch_double'},
     {text:'Forzar — posible -20% piernas o lesión si bodyLoad>70',id:'push_double'},
   ]},
];

// ── EXPRESS NARRATIVE EVENTS (sin timer) ─────────────────────────
const EXPRESS_NARRATIVE_EVENTS=[
  {id:'xn_public_final',
   title:'📣 El público te empuja',
   desc:'Hay animadores justo en el último kilómetro. Te llaman por el dorsal. ¿Aprietas o guardas la compostura?',
   choices:[
     {text:'Apretar para la galería — +10% mental, -5 energía',id:'show_public'},
     {text:'Guardar compostura — llegas sereno',id:'ignore_public'},
   ]},
  {id:'xn_rival_position',
   title:'📊 Rival a 20 segundos en clasificación',
   desc:'La pantalla del avituallamiento te muestra que el corredor de delante está a solo 20 segundos.',
   choices:[
     {text:'Ir a por él — -10 energía, posible mejora de posición',id:'chase_rival'},
     {text:'Mantener tu ritmo — llega más fresco al final',id:'hold_position'},
   ]},
  {id:'xn_heat_wave',
   title:'☀ Calor inesperado',
   desc:'El sol ha pegado fuerte desde el último collado. La hidratación se resiente.',
   choices:[
     {text:'Beber más en el próximo avituallamiento — +hidratación 10',id:'drink_more'},
     {text:'Seguir al mismo ritmo — ahorras tiempo',id:'keep_heat'},
   ]},
  {id:'xn_breathing',
   title:'🫁 Fallo de respiración en altitud',
   desc:'La altitud empieza a notarse. La respiración no entra bien desde hace 500m.',
   choices:[
     {text:'Pausa de 20s para regularte — recuperas ritmo cardíaco',id:'pause_breath'},
     {text:'Forzar — -10% resistencia este tramo',id:'push_breath'},
   ]},
  {id:'xn_terrain_bump',
   title:'🪨 Bache en el descenso',
   desc:'Una raíz escondida te hace perder el paso. Sin gravedad, pero el tobillo lo ha notado.',
   choices:[
     {text:'Parar 10s a evaluar — previene empeorar',id:'check_bump'},
     {text:'Seguir sin parar — -5 piernas, ahorras 10s',id:'ignore_bump'},
   ]},
  {id:'xn_fog',
   title:'🌫 Niebla sobre la cresta',
   desc:'Visibilidad muy baja en el collado. El GPS tarda en recalcular. ¿Confías en la memoria o vas despacio?',
   choices:[
     {text:'GPS y cautela — +15s pero camino seguro',id:'gps_fog'},
     {text:'Tirar por intuición — riesgo +40s si te desvías',id:'gut_fog'},
   ]},
  {id:'xn_goat',
   title:'🐐 Cabra en el sendero',
   desc:'Una cabra con sus crías ocupa el paso y no se mueve. Clásico de alta montaña.',
   choices:[
     {text:'Rodear por la ladera — +10s',id:'go_around'},
     {text:'Espantarla despacio — +5s pero riesgo susto -mental',id:'shoo_goat'},
   ]},
  {id:'xn_dog',
   title:'🐕 Perro entusiasta te sigue',
   desc:'Un mastín de rebaño te ha tomado por su corredor favorito. Te acompaña los últimos 200m.',
   choices:[
     {text:'Disfrutarlo — +10% mental, pierdes 5s',id:'enjoy_dog'},
     {text:'Ahuyentarlo — sigues al ritmo',id:'shoo_dog'},
   ]},
  {id:'xn_sign_down',
   title:'🪧 Señal torcida por el viento',
   desc:'Una marca de ruta apunta en dirección sospechosa. Dos corredores de detrás te siguen.',
   choices:[
     {text:'Corregir la señal y continuar — +10s',id:'fix_sign'},
     {text:'Ignorarla y seguir tu instinto — riesgo +30s si fallas',id:'ignore_sign'},
   ]},
  {id:'xn_retired_rival',
   title:'🚩 Un rival se retira delante de ti',
   desc:'El corredor que llevaba tu ritmo se detiene en el borde del sendero. Señala que abandona.',
   choices:[
     {text:'Preguntar si está bien — +20s, +mental, +reputación',id:'help_retired'},
     {text:'Aprovechar el hueco y adelantar posiciones',id:'pass_retired'},
   ]},
  {id:'xn_endless_climb',
   title:'🏔 La subida que no acaba',
   desc:'El mapa decía 200m de desnivel. Llevas 300 y el pico no aparece. La cabeza flojea.',
   choices:[
     {text:'Gestionar energía — ritmo cómodo hasta arriba',id:'manage_climb'},
     {text:'Empujar — llegas antes pero -25% energía',id:'push_climb'},
   ]},
  {id:'xn_runner_fallen',
   title:'🏃 Corredor caído delante',
   desc:'El de delante ha tropezado y está en el suelo. Se incorpora, pero con dificultad.',
   choices:[
     {text:'Ayudarle a levantarse — +20s, +mental',id:'help_fallen'},
     {text:'Preguntar si puede seguir y continuar — +5s',id:'check_fallen'},
   ]},
];

const SPEC_STATS={
  fondista:{resistencia:62,velocidad:48,subida:45,bajada:40,nutricion:52,mental:50},
  montanero:{resistencia:55,velocidad:40,subida:65,bajada:52,nutricion:45,mental:50},
  tecnico:{resistencia:45,velocidad:45,subida:50,bajada:72,nutricion:45,mental:50},
  todoterreno:{resistencia:52,velocidad:50,subida:52,bajada:52,nutricion:48,mental:52},
};

// Ajuste de stats según edad inicial
// Joven (18): velocidad y bajada altas, poca base aeróbica, sin experiencia
// 25: referencia neutra (= SPEC_STATS base)
// Veterano (35): resistencia/mental/nutricion altos, velocidad y subida mermadas
function applyAgeToStats(stats,age){
  const s={...stats};
  if(age<=18){
    s.velocidad   =Math.min(100,s.velocidad+6);
    s.bajada      =Math.min(100,s.bajada+4);   // sin miedo al descenso
    s.resistencia =Math.max(10, s.resistencia-10); // base aeróbica inmadura
    s.nutricion   =Math.max(10, s.nutricion-12);   // no sabe gestionar el esfuerzo
    s.mental      =Math.max(10, s.mental-8);        // inexperiencia
  } else if(age<=22){
    s.velocidad   =Math.min(100,s.velocidad+4);
    s.bajada      =Math.min(100,s.bajada+2);
    s.resistencia =Math.max(10, s.resistencia-6);
    s.nutricion   =Math.max(10, s.nutricion-7);
    s.mental      =Math.max(10, s.mental-4);
  } else if(age<=25){
    // Referencia neutra — SPEC_STATS sin tocar
  } else if(age<=28){
    s.resistencia =Math.min(100,s.resistencia+4); // pico de forma física
    s.mental      =Math.min(100,s.mental+3);
    s.nutricion   =Math.min(100,s.nutricion+3);
    s.velocidad   =Math.min(100,s.velocidad+1);
  } else if(age<=30){
    s.resistencia =Math.min(100,s.resistencia+5);
    s.mental      =Math.min(100,s.mental+6);       // experiencia de carrera
    s.nutricion   =Math.min(100,s.nutricion+5);
    s.velocidad   =Math.max(10, s.velocidad-2);
    s.subida      =Math.max(10, s.subida-1);
  } else { // 35
    s.resistencia =Math.min(100,s.resistencia+7);
    s.mental      =Math.min(100,s.mental+10);      // veterano curtido
    s.nutricion   =Math.min(100,s.nutricion+8);
    s.velocidad   =Math.max(10, s.velocidad-5);
    s.subida      =Math.max(10, s.subida-4);
    s.bajada      =Math.max(10, s.bajada-2);
  }
  return s;
}

// ══════════════════════════════════════
//  CONSTANTES COMPARTIDAS (C4+C5)
// ══════════════════════════════════════
const QUARTERS=[
  {n:1,label:'Q1',months:'Ene · Feb · Mar'},{n:2,label:'Q2',months:'Abr · May · Jun'},
  {n:3,label:'Q3',months:'Jul · Ago · Sep'},{n:4,label:'Q4',months:'Oct · Nov · Dic'},
];
const TIER_COLOR_RACE={local:'#888',regional:'#4a90d9',nacional:'#4a8a2a',elite:'#c07a10'};
const TIER_LABEL_RACE={local:'Local',regional:'Regional',nacional:'Nacional',elite:'Élite'};
const TIER_COLOR_SPONSOR={1:'#888',2:'#4a90d9',3:'#4a8a2a',4:'#c07a10'};
const TIER_LABEL_SPONSOR={1:'Local',2:'Regional',3:'Nacional',4:'Élite'};
const SPEC_LABEL={fondista:'Fondista',montanero:'Montañero',tecnico:'Técnico',todoterreno:'Todoterreno'};

// T54 (v93): había SEIS tablas de etiquetas de modo repartidas por el código y
// ninguna coincidía con otra — render-core (8 con emoji), render-clasico (solo
// emoji), render-clasico otra vez (tres tablas paralelas de fondo/color/texto,
// 5 modos), render-temporada dos veces (5, texto plano) y save.js (8 con
// emoji). Añadir un modo obligaba a acordarse de seis sitios; añadir el modo
// Canicross se olvidó en cuatro de ellos. Fuente única, con las tres formas que
// el código pedía: emoji suelto, texto plano y emoji+texto.
//   bg/fg son los colores de la insignia del encabezado de Clásico. Los tres
// modos que no la tenían (coach, club, canicross) pintaban `background:undefined`
// si alguna vez llegaban ahí; ahora tienen paleta propia.
// v98 · Condición del día de Clásico/Exprés (initRace). Estaba escrita dentro de initRace;
// sale aquí para que el modo dev pueda ofrecerla y armarla. Mismo orden y pesos: el sorteo
// recorre la lista acumulando `w`, así que reordenarla cambiaría qué sale.
const DAY_CONDITIONS=[
  {id:'normal',        w:0.40, icon:'', label:'',             energyMod:0,  legsMod:0, hydMod:0},
  {id:'buena_noche',   w:0.12, icon:'😴', label:'Dormiste como un tronco.',   energyMod:5,  legsMod:0,  hydMod:0},
  {id:'mala_noche',    w:0.12, icon:'😶', label:'Noche irregular. Las piernas no están finas.', energyMod:0, legsMod:-5, hydMod:0},
  {id:'estomago',      w:0.10, icon:'🤢', label:'El estómago no está fino esta mañana.',energyMod:0, legsMod:0,  hydMod:-8},
  {id:'piernas_mal',   w:0.10, icon:'🦵', label:'Las piernas llevan días sin recuperar del todo.', energyMod:0, legsMod:-8, hydMod:0},
  {id:'dia_especial',  w:0.08, icon:'⚡', label:'Sin explicación, esta mañana todo fluye.',energyMod:7, legsMod:5,  hydMod:0},
  {id:'calor_extra',   w:0.08, icon:'🌡', label:'Más calor de lo previsto. Bebe antes de salir.',energyMod:-3,legsMod:0, hydMod:-5},
];

const MODE_LABELS={
  facil:    {label:'Fácil',     emoji:'🟢', bg:'#EAF3DE', fg:'#27500A'},
  medio:    {label:'Medio',     emoji:'🟡', bg:'#FAEEDA', fg:'#633806'},
  dificil:  {label:'Difícil',   emoji:'🔴', bg:'#FCEBEB', fg:'#791F1F'},
  hardcore: {label:'Hardcore',  emoji:'💀', bg:'#F1EFE8', fg:'#444441'},
  expres:   {label:'Exprés',    emoji:'⚡', bg:'#fef9ec', fg:'#8a4a00'},
  coach:    {label:'Entrenador',emoji:'📋', bg:'#EEEDFE', fg:'#534AB7'},
  club:     {label:'Club',      emoji:'🏕', bg:'#EAF3DE', fg:'#27500A'},
  canicross:{label:'Canicross', emoji:'🐕', bg:'#e8f0fb', fg:'#2a5d8f'},
};
const modeInfo     =m=>MODE_LABELS[m]||MODE_LABELS.medio;
const modeEmoji    =m=>modeInfo(m).emoji;
const modeLabelOf  =m=>modeInfo(m).label;
const modeLabelFull=m=>modeInfo(m).emoji+' '+modeInfo(m).label;

// T54 (v93): la fase del arco narrativo también estaba escrita dos veces, y
// divergía: render-clasico decía «Overlap» y save.js «Solapamiento» para la
// misma fase. Se queda la castellana, que es la del resto del juego.
const PHASE_LABEL={
  runner: '🏃 Corredor',
  overlap:'🏃 · 📋 Solapamiento',
  coach:  '📋 Entrenador',
  club:   '🏕 Club',
};

// T51 (v93): el terreno neutro estaba escrito solo dentro de getTerrainCondition()
// como valor de salida, así que freshState() no podía declararlo y cada lectura
// de G.terrainCondition se protegía a su manera (sin nada, con `||{...}` y con
// `?.`). Ahora es un dato, freshState() arranca con él y los accesos son directos.
const TERRAIN_BUENO={id:'bueno',label:'Terreno en buen estado',icon:'✅',descentMult:1.0,climbMult:1.0,color:'#4a8a2a'};

// ══════════════════════════════════════
//  CONSTANTES DE BALANCE (E2)
// ══════════════════════════════════════
// Costes base por ritmo: {timeMult, energy, hydration, legs}
// T17 (v88): la rejilla de ritmos de renderSegment tenía estos mismos valores
// copiados a mano en un array inline. Se le añaden label/desc para que la
// interfaz se construya desde aquí y no puedan volver a divergir (causa de T16).
const PACE_COSTS={
  conservar:{tm:1.18, ec:4,  hc:3,  lc:2,  label:'Conservar',  desc:'Ahorra fuerzas'},
  steady:   {tm:1.0,  ec:9,  hc:6,  lc:5,  label:'Ritmo fijo', desc:'Equilibrado'},
  push:     {tm:0.9,  ec:17, hc:11, lc:10, label:'Apretar',    desc:'Rápido pero cuesta'},
  allout:   {tm:0.8,  ec:27, hc:17, lc:16, label:'A tope',     desc:'Máximo esfuerzo'},
};
// T33 (v88): la estrategia de salida vivía duplicada en race.js con dos juegos de
// nombres — earlyMult/lateMult en la tarjeta y earlyTm/lateTm en calcPaceCosts.
// Los valores coincidían y nada habría avisado cuando dejaran de hacerlo.
const RACE_STRATEGIES=[
  {id:'conservador',icon:'\u{1F422}',label:'Conservador',
   desc:'Sales tranquilo. Guardas fuerzas para el final.',
   detail:'Primeros tramos \u22128% velocidad. \u00daltimos tramos +10% rendimiento. Fatiga acumulada m\u00e1s lenta.',
   earlyMult:1.08, lateMult:0.92, fatigueMod:-0.15, col:'#4a8a2a'},
  {id:'equilibrado',icon:'\u2696\uFE0F',label:'Equilibrado',
   desc:'Ritmo constante de principio a fin.',
   detail:'Sin bonos ni penalizaciones. El modo base.',
   earlyMult:1.0, lateMult:1.0, fatigueMod:0, col:'#4a90d9'},
  {id:'atope',icon:'\u{1F525}',label:'A tope',
   desc:'M\u00e1xima velocidad desde la salida. El cuerpo paga despu\u00e9s.',
   detail:'Primeros tramos +10% velocidad. Fatiga exponencial acumulada m\u00e1s r\u00e1pida. Los \u00faltimos km cuestan el doble.',
   earlyMult:0.90, lateMult:1.12, fatigueMod:0.30, col:'#c0392b'},
];
const RACE_STRATEGY_BY_ID=Object.fromEntries(RACE_STRATEGIES.map(s=>[s.id,s]));
// Penalización por reservas bajas
const LOW_STAT_PENALTIES={energy:{threshold:30,timeMult:1.15},hydration:{threshold:20,timeMult:1.20},legs:{threshold:25,timeMult:1.18}};
// Multiplicadores clima → hidratación
const WEATHER_HYD_MULT={soleado:1.3,extremo:1.8};
const STORM_HYD_MULT={protected:1.3,exposed:2.0};
// Stat scaling por tipo de terreno
const STAT_SCALE_PER_KM=0.003;
const RESISTANCE_SCALE_PER_KM=0.004;
// Puntos de ranking por posición de carrera
// T130 (v91): tenía una 11ª entrada (un 4) que getRankPts no podía leer nunca
// — corta en pos<=10, o sea índice máximo 9. Fuera; el >10 son 2, como decía.
const RANKING_PTS=[38,27,18,18,18,10,10,10,10,6]; // idx 0=1º, 1=2º... >10=2pts
function getRankPts(pos){return pos<=10?(RANKING_PTS[pos-1]||2):2;}
// Tabla de reparto de premios por posición
const PRIZE_TABLE=[1.0,0.5,0.25,0.12,0.07,0.04,0.02,0.01]; // idx 0=1º... >8=0

// Pool amplio de rivales — se mezclan según nivel de carrera
// PUB-04 (v99): eran 18 atletas reales de élite (una de ellas fallecida) a los que el juego
// inventaba retiradas, hijos y piques en carrera. Ahora son ficticios, con el mismo país,
// especialidad y nivel. No usar nombres de personas reales en ningún pool.
const RIVALS_POOL=[
  {name:'Aitor Elizondo',   flag:'🇪🇸',country:'España',        spec:'montanero',  base:0.92, tier:3},
  {name:'Julien Marchetti',flag:'🇫🇷',country:'Francia',       spec:'fondista',   base:0.93, tier:3},
  {name:'Cody Harlan',    flag:'🇺🇸',country:'Estados Unidos', spec:'fondista',   base:0.94, tier:3},
  {name:'Megan Ostrander',flag:'🇺🇸',country:'Estados Unidos',spec:'fondista',  base:0.93, tier:3},
  {name:'Jordi Vilalta',      flag:'🇪🇸',country:'España',        spec:'montanero',  base:0.95, tier:3},
  {name:'Owen Hartley',       flag:'🇬🇧',country:'Reino Unido',   spec:'fondista',   base:0.96, tier:3},
  {name:'Loïc Berthod',     flag:'🇨🇭',country:'Suiza',         spec:'tecnico',    base:0.95, tier:3},
  {name:'Kiri Ashworth',      flag:'🇳🇿',country:'Nueva Zelanda', spec:'todoterreno',base:0.97, tier:2},
  {name:'Sylvain Rouquette',flag:'🇫🇷',country:'Francia',       spec:'fondista',   base:0.97, tier:2},
  {name:'Mireia Folch',      flag:'🇪🇸',country:'España',        spec:'montanero',  base:0.97, tier:2},
  {name:'Chiara Valsecchi', flag:'🇮🇹',country:'Italia',        spec:'tecnico',    base:0.98, tier:2},
  {name:'Tanner Whitfield',    flag:'🇺🇸',country:'Estados Unidos',spec:'tecnico',    base:0.99, tier:2},
  {name:'Bastien Lacroix',flag:'🇫🇷',country:'Francia',      spec:'fondista',   base:0.98, tier:2},
  {name:'Nadja Imhof',    flag:'🇨🇭',country:'Suiza',         spec:'todoterreno',base:0.99, tier:2},
  {name:'Kenta Morishima',  flag:'🇯🇵',country:'Japón',         spec:'fondista',   base:1.01, tier:1},
  {name:'Wout Declercq',flag:'🇧🇪',country:'Bélgica',       spec:'montanero',  base:1.02, tier:1},
  {name:'Hugo Ferrand', flag:'🇫🇷',country:'Francia',       spec:'fondista',   base:1.03, tier:1},
  {name:'Shannon Pryor',  flag:'🇺🇸',country:'Estados Unidos',spec:'fondista',   base:1.01, tier:1},
];

// ══════════════════════════════════════
//  MODO ENTRENADOR — CONSTANTES
// ══════════════════════════════════════
const COACH_ATHLETE_POOL=[
  {id:'marc',  name:'Marc Puig',      flag:'🇪🇸',spec:'montanero',  personality:'rebelde',  age:24,rivalName:'Oriol Puig',
   bio:'Joven promesa del Pirineo. Talento bruto, pero le cuesta acatar consignas.',
   baseStats:{resistencia:55,velocidad:48,subida:68,bajada:55,nutricion:40,mental:45},monthlyFee:200},
  {id:'ana',   name:'Ana Vilaró',     flag:'🇪🇸',spec:'fondista',   personality:'motivado', age:28,rivalName:'Laia Bonell',
   bio:'Resistente nata. Se entrega al 110% — a veces con consecuencias.',
   baseStats:{resistencia:65,velocidad:52,subida:50,bajada:48,nutricion:55,mental:58},monthlyFee:280},
  {id:'jordi', name:'Jordi Camprubí', flag:'🇪🇸',spec:'tecnico',    personality:'obediente',age:31,rivalName:'Xavi Gómez',
   bio:'Técnico preciso. Hace exactamente lo que le pides, para bien y para mal.',
   baseStats:{resistencia:50,velocidad:50,subida:52,bajada:72,nutricion:52,mental:55},monthlyFee:250},
  {id:'leire', name:'Leire Arana',    flag:'🇪🇸',spec:'todoterreno',personality:'quemado',  age:35,rivalName:'Sara Mateu',
   bio:'Ex-élite del ciclismo. Base física excepcional — necesita reconectar con el trail.',
   baseStats:{resistencia:62,velocidad:58,subida:56,bajada:54,nutricion:60,mental:35},monthlyFee:320},
  {id:'pau',   name:'Pau Ferrer',     flag:'🇪🇸',spec:'montanero',  personality:'motivado', age:22,rivalName:'Iker Zubiaurre',
   bio:'Salvaje en las subidas. No sabe gestionar el ritmo en llano todavía.',
   baseStats:{resistencia:48,velocidad:45,subida:72,bajada:52,nutricion:38,mental:60},monthlyFee:180},
  {id:'marta', name:'Marta Solà',     flag:'🇨🇦',spec:'fondista',   personality:'obediente',age:29,rivalName:'Claire Dubois',
   bio:'Disciplina de hierro. Volvió a Cataluña para dedicarse al trail a tiempo completo.',
   baseStats:{resistencia:60,velocidad:55,subida:50,bajada:50,nutricion:62,mental:60},monthlyFee:260},
  {id:'iker',  name:'Iker Izaguirre', flag:'🇪🇸',spec:'montanero',  personality:'perfeccionista',age:26,rivalName:'Aitor Elizondo',
   bio:'Analiza cada entrenamiento. Necesita saber el porqué de cada decisión, pero cuando confía en ti rinde al límite.',
   baseStats:{resistencia:58,velocidad:52,subida:70,bajada:58,nutricion:65,mental:48},monthlyFee:290},
  {id:'sara',  name:'Sara Torrella',  flag:'🇪🇸',spec:'tecnico',    personality:'quemado',  age:38,rivalName:'Mireia Folch',
   bio:'Leyenda del trail catalán. Tres lesiones graves en cuatro años. Quiere un último ciclo hecho bien.',
   baseStats:{resistencia:70,velocidad:60,subida:62,bajada:74,nutricion:68,mental:28},monthlyFee:380},
  {id:'rafa',  name:'Rafa Montero',   flag:'🇪🇸',spec:'todoterreno',personality:'rebelde',  age:21,rivalName:'Yeray Igual',
   bio:'Recién llegado al trail desde el fútbol. Físico bruto, cabeza a entrenar. Aprende rápido pero no le gustan las normas.',
   baseStats:{resistencia:50,velocidad:62,subida:55,bajada:50,nutricion:30,mental:55},monthlyFee:150},
];
// ── Pool de atletas para el arco narrativo (Carrera de Vida) ──────────────────
const LIFE_ATHLETE_POOL=[
  {id:'txus',  name:'Txus Olaizola',   flag:'🇪🇸', spec:'montanero',   personality:'rebelde',
   age:22, potential:'bruto',
   bio:'Pastoreaba ovejas en el Pirineo navarro hasta los 20 años. Físico excepcional, cero técnica. Nadie le ha dicho todavía que puede ser bueno.',
   baseStats:{resistencia:60,velocidad:48,subida:70,bajada:44,nutricion:32,mental:52}},
  {id:'noa',   name:'Noa Ferragut',    flag:'🇪🇸', spec:'fondista',    personality:'motivado',
   age:21, potential:'prometedor',
   bio:'Campeona de cross universitario. Quiere dar el salto al trail pero no conoce a nadie del mundillo.',
   baseStats:{resistencia:62,velocidad:58,subida:50,bajada:48,nutricion:50,mental:65}},
  {id:'kepa',  name:'Kepa Etxeberria', flag:'🇪🇸', spec:'todoterreno', personality:'obediente',
   age:23, potential:'talento_oculto',
   bio:'Ciclista de XCO reconvertido. Sus datos de potencia son los mejores que has visto en un aficionado. Él no lo sabe.',
   baseStats:{resistencia:55,velocidad:65,subida:62,bajada:56,nutricion:58,mental:48}},
  {id:'celia', name:'Celia Bravo',     flag:'🇪🇸', spec:'tecnico',     personality:'perfeccionista',
   age:24, potential:'prometedor',
   bio:'Trabaja de fisio. Conoce su cuerpo mejor que nadie. Analiza todo, confía en poco. Necesita a alguien que entienda su forma de pensar.',
   baseStats:{resistencia:52,velocidad:50,subida:52,bajada:68,nutricion:64,mental:44}},
  {id:'unai',  name:'Unai Goikoetxea', flag:'🇪🇸', spec:'montanero',  personality:'quemado',
   age:20, potential:'talento_oculto',
   bio:'Ganó tres carreras juveniles y desapareció. Algo pasó ese último año. Tiene ganas de volver pero no sabe si puede confiar en un entrenador.',
   baseStats:{resistencia:58,velocidad:52,subida:66,bajada:58,nutricion:46,mental:28}},
  {id:'mireia',name:'Mireia Puigdomènech',flag:'🇪🇸',spec:'fondista', personality:'motivado',
   age:21, potential:'bruto',
   bio:'Llega del atletismo de pista. Resistente como pocas, pero el monte le da vértigo todavía. Aprende rápido.',
   baseStats:{resistencia:68,velocidad:60,subida:44,bajada:40,nutricion:52,mental:58}},
];
const LIFE_POTENTIAL_LABEL={
  bruto:         {label:'Talento bruto',  color:'#c07a10', desc:'Base física excepcional, sin pulir.'},
  prometedor:    {label:'Prometedor',     color:'#185FA5', desc:'Perfil equilibrado con margen de mejora claro.'},
  talento_oculto:{label:'Talento oculto', color:'#534AB7', desc:'Nadie lo ha visto todavía. Podría sorprenderte.'},
};

const LIFE_EXTRA_ATHLETES=[
  {id:'aritz', name:'Aritz Zubeldia',  flag:'🇪🇸', spec:'montanero',  personality:'perfeccionista',
   age:20, potential:'talento_oculto',
   bio:'Lo descubres en una carrera local. Lleva cuatro meses entrenando. Ya gana a gente con diez años de experiencia.',
   baseStats:{resistencia:52,velocidad:50,subida:68,bajada:50,nutricion:35,mental:55}},
  {id:'laia',  name:'Laia Sistach',    flag:'🇪🇸', spec:'fondista',   personality:'motivado',
   age:22, potential:'prometedor',
   bio:'Maratoniana reconvertida. Su agente te llama directamente — algo no cuadra con el anterior entrenador.',
   baseStats:{resistencia:66,velocidad:62,subida:46,bajada:44,nutricion:58,mental:60}},
  {id:'bixente',name:'Bixente Larrañaga',flag:'🇪🇸',spec:'tecnico', personality:'rebelde',
   age:19, potential:'bruto',
   bio:'Su padre fue trail runner en los 90. El chico tiene el físico pero ninguna de la disciplina.',
   baseStats:{resistencia:58,velocidad:56,subida:58,bajada:70,nutricion:28,mental:48}},
  {id:'sara2', name:'Sara Mas',        flag:'🇪🇸', spec:'todoterreno',personality:'obediente',
   age:24, potential:'prometedor',
   bio:'Guardabosques. Pasa más horas en el monte que nadie. Solo necesita que alguien le ponga estructura.',
   baseStats:{resistencia:64,velocidad:52,subida:60,bajada:58,nutricion:55,mental:62}},
];
const PERSONALITY_LABEL={
  rebelde:       {label:'Rebelde',       color:'#c0392b',emoji:'🔴',desc:'Modifica tus planes. Difícil de controlar pero tiene chispa.'},
  motivado:      {label:'Motivado',      color:'#c07a10',emoji:'🟡',desc:'Se entrega al máximo. Puede sobreentrenar si no lo controlas.'},
  obediente:     {label:'Obediente',     color:'#2d7a2d',emoji:'🟢',desc:'Sigue tus instrucciones al pie de la letra.'},
  quemado:       {label:'Quemado',       color:'#888',   emoji:'⚫',desc:'Necesita apoyo emocional. Puede recuperar el nivel con el tiempo.'},
  perfeccionista:{label:'Perfeccionista',color:'#6c3483',emoji:'🟣',desc:'Exige feedback constante. Muy sensible a los errores, pero crece mucho con confianza alta.'},
};

// ── Estado emocional evolutivo ──────────────────────────────────────────────
// Independiente de la personalidad. Cambia según decisiones, carga y resultados.
const EMOTIONAL_STATES={
  fresco:    {label:'Fresco',      color:'#4a90d9',emoji:'💙',desc:'Motivado, sin desgaste acumulado.'},
  confiado:  {label:'Confiado',    color:'#2d7a2d',emoji:'💚',desc:'Resultados positivos. Rinde mejor en carrera.'},
  dudoso:    {label:'Dudoso',      color:'#c07a10',emoji:'🟡',desc:'Incertidumbre. Necesita un resultado o un gesto de confianza.'},
  quemado:   {label:'Quemado',     color:'#888',   emoji:'🩶',desc:'Agotado emocionalmente. Riesgo de no renovar.'},
  recuperado:{label:'Recuperado',  color:'#8e44ad',emoji:'💜',desc:'Volvió de un bache. Comprometido y agradecido.'},
};

// Transiciones: qué condiciones llevan a cada estado
// Se evalúa al fin de carrera y en eventos clave
const TRAINER_STYLES={
  motivador:   {label:'Motivador',   emoji:'🔥', color:'#c07a10',
    desc:'Discursos, confianza extrema. El atleta rinde más cuando cree en sí mismo.',
    trustMod:+4, bodyLoadMod:-3, perfMod:+5,
    trainingBonus:'mental', trainingPenalty:null,
    reactionGood:'Se le ilumina la cara. "Si tú lo dices, puedo."',
    reactionBad:'Se nota forzado. No toda la motivación cala igual.'},
  cientifico:  {label:'Científico',  emoji:'📊', color:'#4a90d9',
    desc:'Datos, periodización exacta. Cada bloque tiene su porqué.',
    trustMod:+2, bodyLoadMod:-6, perfMod:+3,
    trainingBonus:'resistencia', trainingPenalty:null,
    reactionGood:'"Los números cuadran. Confío en el plan."',
    reactionBad:'Los atletas emocionales necesitan más que datos.'},
  conservador: {label:'Conservador', emoji:'🛡', color:'#2d7a2d',
    desc:'Menos lesiones, progresión lenta pero segura.',
    trustMod:+3, bodyLoadMod:-10, perfMod:-3,
    trainingBonus:null, trainingPenalty:'velocidad',
    reactionGood:'"Me siento protegido. No me has quemado."',
    reactionBad:'Algunos atletas necesitan ser empujados más.'},
  agresivo:    {label:'Agresivo',    emoji:'⚡', color:'#c0392b',
    desc:'Carga alta, resultados rápidos. Mayor riesgo de lesión.',
    trustMod:-2, bodyLoadMod:+8, perfMod:+8,
    trainingBonus:'velocidad', trainingPenalty:null,
    reactionGood:'"Estoy al límite, pero los resultados hablan."',
    reactionBad:'Demasiada presión. El atleta empieza a dudar.'},
};

// ── Rasgos emergentes del entrenador (E13) ──────────────────────────────────
// Se calculan automáticamente del historial de decisiones
const TRAINER_TRAITS=[
  {id:'protector',  label:'Protector',   emoji:'🛡', color:'#2d7a2d',
   desc:'Siempre priorizas la salud del atleta. Se nota.',
   condition:(log)=>log.filter(d=>d.positive&&(d.type==='taper_used'||d.type==='injury_scare_rest')).length>=3},
  {id:'ganador',    label:'Ganador',     emoji:'🏆', color:'#c07a10',
   desc:'Tienes olfato para los podios. Tu historial lo demuestra.',
   condition:(log,hist)=>(hist||[]).reduce((s,h)=>s+(h.wins||0),0)>=3},
  {id:'comunicador',label:'Comunicador', emoji:'💬', color:'#4a90d9',
   desc:'Sabes escuchar. Los atletas confían en ti como persona.',
   condition:(log)=>log.filter(d=>d.positive&&d.type==='mental_talk').length>=3},
  {id:'exigente',   label:'Exigente',    emoji:'🔥', color:'#c0392b',
   desc:'Empujas duro. Los resultados son buenos, pero hay desgaste.',
   condition:(log)=>log.filter(d=>!d.positive&&d.type==='forced_injury').length>=2},
  {id:'equilibrado',label:'Equilibrado', emoji:'⚖️', color:'#555',
   desc:'Ni demasiado blando ni demasiado duro. Consistente.',
   condition:(log)=>log.filter(d=>d.positive).length>=4&&log.filter(d=>!d.positive).length<=1},
];

const COACH_NARRATIVES={
  climb:[
    'Sube con fluidez, respetando el esfuerzo.',
    'La subida empieza a costar, pero mantiene el paso.',
    'Va en el grupo de cabeza. Subida controlada.',
    'Pierde algo de terreno en la rampa más dura.',
    'Se ve el esfuerzo, pero gestiona bien el ritmo.',
    'Cadencia corta, brazos activos. Sube bien.',
    'La pendiente máxima se acerca. Aguanta.',
    'Zancada recortada, mirada al suelo. Modo supervivencia.',
    'Se para dos segundos a regular la respiración. Luego sigue.',
    'Alcanza a dos rivales en la parte empinada. Buen trabajo.',
    'El último tramo de la subida lo hace en silencio total.',
    'Brazos que acompañan, caderas bajas. Técnica de montaña.',
    'La cabeza cae un momento. Luego vuelve a mirar arriba.',
    'Coge un bastón imaginario de un compañero. Subida solidaria.',
    'Marca diferencias en el empinado. Aquí es donde gana tiempo.',
  ],
  descent:[
    'Bajada técnica. Se mueve con confianza.',
    'Recupera posiciones en la bajada.',
    'Sólido en el descenso. Se nota el trabajo técnico.',
    'Pierde algo de tiempo en el terreno más suelto.',
    'Bajada cautelosa — ahorra piernas para el final.',
    'Vuela en la bajada. El entrenamiento da frutos.',
    'Piedras, raíces, barro. Se adapta a todo sin parar.',
    'Deja ir los frenos mentales. Fluye en el descenso.',
    'Un par de apoyos dudosos, pero nada grave.',
    'Los cuádriceps están finos. Cada zancada, un segundo ganado.',
    'Pasa a tres corredores en la bajada larga.',
    'La confianza en el terreno se nota. Descenso limpio.',
    'Ajusta la línea en el último momento. Buen instinto.',
    'Frena antes de una curva ciega. Decisión correcta.',
  ],
  flat:[
    'Ritmo de crucero. Sin alarmas.',
    'Buen paso en llano. El grupo se fragmenta.',
    'Mantiene el ritmo pactado. Sin sorpresas.',
    'Se nota algo de fatiga acumulada, pero sigue adelante.',
    'Aprovecha el llano para recuperarse antes del siguiente repecho.',
    'Ritmo regular. Economía de movimientos impecable.',
    'Trote suave, respiración acompasada. Modo ahorro.',
    'Se coloca en el grupo. Zona de confort por ahora.',
    'El llano le pesa. Mejor en terreno vertical.',
    'Saca los auriculares imaginarios. Desconecta y fluye.',
    'Toma un sorbo de agua. Sin perder el paso.',
    'Se cruza con espectadores — un gesto de cabeza y sigue.',
    'El kilómetro más plano de la carrera. Lo gestiona bien.',
    'Revisa el reloj. Sigue dentro del plan.',
  ],
};

// ── Diálogos post-carrera por personalidad ──
const COACH_POST_RACE_DIALOGUES={
  rebelde:{
    great:['"Lo sabía. Solo necesitaba correr a mi ritmo."','"¿Ves? Cuando me dejas ser, funciono."','"Bien. Pero la siguiente la hago sin plan."'],
    good: ['"Podría haber ido más fuerte, coach."','"Bien, pero la próxima vez confía más en mí."'],
    bad:  ['"El plan era una mierda."','"Hay que cambiar la estrategia. La mía."','"No vuelvo a hacer eso."'],
    dnf:  ['"Hoy no era el día. Y lo sabía desde el principio."'],
    highTrust:{
      great:['"Oye... esta vez el plan tuyo no estuvo mal. Lo admito."','"¿Sabes qué? Confío en ti. Y hoy se ha notado."'],
      good: ['"Bien. Creo que estamos encontrando algo juntos."','"Me gustó la libertad que me diste en los últimos km."'],
      bad:  ['"No salió, pero sé que lo intentamos bien. Siguiente."'],
    },
    lowTrust:{
      great:['"Salió bien pero no por tu plan, sino a pesar de él."','"¿Ves? Yo tenía razón. Siempre tengo razón."'],
      good: ['"Eso es todo lo que consigo cuando no me escuchas."'],
      bad:  ['"No me sorprende. Esto pasa cuando no me dejas ser yo."','"Si hubiera corrido a mi manera, habría ido mejor."'],
      dnf:  ['"Este abandono es culpa del plan. No mío."'],
    },
  },
  motivado:{
    great:['"¡Increíble! ¿Cuándo es la siguiente?"','"Esto es lo que quería. ¡Más!"','"¡Coach! ¿Lo viste? ¡Lo viste!"'],
    good: ['"Sé que puedo más. Siguiente vez vamos a por el podio."','"Bien... pero me quedé corto en el final."'],
    bad:  ['"No lo entiendo. Entrené tan duro..."','"Me dejé las piernas en el primer repecho y no pude recuperar."'],
    dnf:  ['"Me duele haberlo dejado. Me duele mucho."'],
    highTrust:{
      great:['"¡Lo sabía! ¡Contigo al lado nada es imposible!"','"Equipo imbatible. Esto es solo el comienzo."'],
      good: ['"Cada vez me siento más fuerte. Y tú tienes mucho que ver."'],
      bad:  ['"Algo falla, pero sé que juntos lo vamos a resolver. ¡Vamos!"'],
    },
    lowTrust:{
      great:['"Salió bien... aunque no sé muy bien por qué."','"Bien. Pero necesito que te involucres más, coach."'],
      good: ['"Me siento solo en esto. Necesito más de ti."','"¿Estás ahí? Parece que entreno solo."'],
      bad:  ['"Esto no puede seguir así. Necesito un coach de verdad."'],
      dnf:  ['"Abandoné porque no estaba bien mentalmente. Y tú no lo viste."'],
    },
  },
  obediente:{
    great:['"Gracias, coach. El plan fue perfecto."','"Seguí tus instrucciones y funcionó exactamente como dijiste."'],
    good: ['"¿Lo hice bien? Creo que lo hice bien."','"¿Qué podría mejorar para la siguiente?"'],
    bad:  ['"Intenté hacer lo que me dijiste. ¿Qué salió mal?"','"Dime qué cambiar y lo hago."'],
    dnf:  ['"Lo siento. No quería defraudarte."'],
    highTrust:{
      great:['"Contigo me siento capaz de cualquier cosa. Gracias por creer en mí."','"Hemos trabajado mucho para esto. Vale la pena."'],
      good: ['"Confío en el proceso. Sé que con tu guía vamos a llegar."'],
      bad:  ['"Fallé, pero sé que lo analizaremos juntos y aprenderé."'],
    },
    lowTrust:{
      great:['"Salió bien... pero me gustaría entender mejor qué hacer."'],
      good: ['"¿Estoy haciendo bien las cosas? A veces no lo sé."','"Necesito más indicaciones. Me pierdo sin ellas."'],
      bad:  ['"No sé qué se espera de mí. Necesito más guía."','"Lo hice lo mejor que pude, pero algo no cuadra."'],
      dnf:  ['"Perdón. No sé en qué me equivoqué. Ayúdame a entenderlo."'],
    },
  },
  quemado:{
    great:['"...No me lo esperaba. Hace tiempo que no me sentía así."','"Quizás no estoy tan acabado."'],
    good: ['"Pasable."','"No estuvo mal. Podría haber sido peor."'],
    bad:  ['"Ya me lo imaginaba."','"¿Para esto me levanté a las 5 de la mañana?"'],
    dnf:  ['"Mejor. El cuerpo ya no responde como antes."'],
    highTrust:{
      great:['"No esperaba sentirme bien. Gracias por no rendirte conmigo."','"Quizás hay algo aún. Seguimos."'],
      good: ['"Está bien. Me alegra no haberte fallado del todo."'],
      bad:  ['"Mal resultado, pero me alegra que aún estés ahí."'],
    },
    lowTrust:{
      great:['"Salió bien. Tampoco hace falta tanto drama."'],
      good: ['"Podría haber salido peor."'],
      bad:  ['"¿Ves? Para esto no vale la pena el esfuerzo."','"Cada vez me pregunto más para qué sigo."'],
      dnf:  ['"El cuerpo ya no da para esto. Y así es."'],
    },
  },
  // ── E4: Perfeccionista — personalidad propia ──
  perfeccionista:{
    great:['"El tiempo podía haber sido mejor, pero el resultado es bueno."','"Salió según el plan. Casi perfectamente."','"Un podio es un podio. Aunque sé dónde perdí tiempo."'],
    good: ['"Cometí errores en el km 18. Lo vi venir y no lo corregí a tiempo."','"Técnicamente bien, pero el ritmo en la subida no fue el óptimo."','"Hay que revisar la estrategia de hidratación. Dímelo para la próxima."'],
    bad:  ['"Analicé la carrera: tres decisiones incorrectas. No puede volver a pasar."','"El plan tenía fallos. Los dos lo sabemos."','"Necesito datos. ¿Qué salió mal exactamente?"'],
    dnf:  ['"No tenía sentido continuar sin las condiciones mínimas. Lo calculé."','"Abandonar fue la decisión correcta. Pero no debería haber llegado a eso."'],
    highTrust:{
      great:['"El análisis es bueno. Y confío en que lo haremos mejor la próxima."','"Con más datos y tu apoyo, la siguiente puede ser perfecta."'],
      good: ['"Errores corregibles. Y tengo un entrenador que me ayuda a verlos. Eso vale."'],
      bad:  ['"Mal resultado, pero con tu ayuda encontraremos el fallo. Lo sé."'],
    },
    lowTrust:{
      great:['"Salió bien a pesar de todo. Pero necesito más análisis de tu parte."'],
      good: ['"No recibo suficiente feedback. Sin datos no puedo mejorar."','"¿Puedes ser más específico? Los comentarios generales no me sirven."'],
      bad:  ['"No tengo la información que necesito para mejorar. Eso es un problema."','"Si no analizamos esto en profundidad, volverá a pasar."'],
      dnf:  ['"Si hubiera tenido mejor información previa, no habría llegado a esto."'],
    },
  },
};

// ── Objetivos de temporada del atleta (por personalidad) ──
// DS05 (v95): los `check`/`checkAll` de esta tabla NO se leen. La evaluación vive
// en coachObjectiveMet() (coach.js), que va por id y reproduce lo que se jugaba.
const COACH_SEASON_OBJECTIVES={
  rebelde:[
    {id:'win_elite',  label:'Ganar una carrera élite o nacional',    reward:+12, penalty:-10,
     desc:'"Quiero ganar algo importante. No carreras de barrio."',
     check:r=>r.pos===1&&['elite','nacional'].includes(r.tier)},
    {id:'no_abandon', label:'Terminar todas las carreras sin abandonar',reward:+8, penalty:-6,
     desc:'"Puede que cambie el plan pero no me rindo."',
     check:r=>!r.dnf},
  ],
  motivado:[
    {id:'podio_x2',   label:'Dos podios esta temporada',             reward:+10, penalty:-8,
     desc:'"Quiero al menos dos podios. No uno, dos."',
     check:(r,all)=>all.filter(x=>x.pos<=3&&!x.dnf).length>=2},
    {id:'top10_all',  label:'Top 10 en todas las carreras',          reward:+8, penalty:-5,
     desc:'"Si no estoy en el top 10, algo ha salido mal."',
     check:(r,all)=>all.every(x=>x.dnf||x.pos<=10)},
  ],
  obediente:[
    {id:'finish_all', label:'Terminar todas las carreras del calendario', reward:+6, penalty:-4,
     desc:'"Me has puesto un calendario. Lo cumplo."',
     check:(r,all)=>all.filter(x=>!x.dnf).length>=(G.coachSelectedRaces||[]).length},
    {id:'improve_pb', label:'Mejorar posición respecto a la temporada anterior', reward:+8, penalty:-3,
     desc:'"Quiero mejorar. Cada año, un poco mejor."',
     check:(r,all)=>{ const best=Math.min(...all.filter(x=>!x.dnf).map(x=>x.pos)||[999]); return best<=(G.coachAthleteHistory?.slice(-1)[0]?.bestPos||999);}},
  ],
  quemado:[
    {id:'no_injury',  label:'Terminar la temporada sin lesiones graves', reward:+10, penalty:-2,
     desc:'"Solo quiero llegar sano al final. Nada más."',
     check:()=>!G.coachInjury||(G.coachInjury?.severity||0)<2},
    {id:'two_races',  label:'Completar al menos 2 carreras',          reward:+6, penalty:-3,
     desc:'"Que nadie diga que me rendí antes de empezar."',
     check:(r,all)=>all.filter(x=>!x.dnf).length>=2},
  ],
  // ── E4: pool propio para la personalidad perfeccionista ──
  perfeccionista:[
    {id:'perf_time',   label:'Mejorar el tiempo en al menos una carrera',  reward:+14, penalty:-8,
     desc:'"No me conformo con la posición. Quiero hacerlo más rápido que la vez anterior."',
     checkAll:(all)=>{ const prev=(G.coachAthleteHistory||[]).slice(-1)[0]?.bestPos||999; return(all||[]).some(x=>!x.dnf&&x.pos<prev);}},
    {id:'perf_no_dnf', label:'Terminar todas las carreras — sin abandonos', reward:+10, penalty:-10,
     desc:'"Un abandono es un fracaso de planificación. No voy a planificar mal."',
     checkAll:(all)=>(all||[]).every(x=>!x.dnf)},
    {id:'perf_top5',   label:'Top 5 en una carrera de nivel regional o superior', reward:+12, penalty:-7,
     desc:'"El top 10 no es suficiente. Quiero estar en el grupo de cabeza."',
     checkAll:(all)=>(all||[]).some(x=>!x.dnf&&x.pos<=5&&['regional','nacional','elite'].includes(x.tier||''))},
  ],
};

// ── Lesiones del atleta ──
const COACH_INJURY_TYPES=[
  {id:'sobrecarga',  label:'Sobrecarga muscular', severity:1, racesOut:1,
   desc:'Contractura en el cuádriceps. Puede correr pero al 80% de capacidad.',
   statPenalty:{resistencia:-8,velocidad:-5}, causeLoad:75},
  {id:'tendinitis',  label:'Tendinitis de Aquiles',severity:1, racesOut:1,
   desc:'El tendón protesta. Puede seguir entrenando con precaución.',
   statPenalty:{bajada:-12,velocidad:-6}, causeLoad:80},
  {id:'rotura',      label:'Rotura de fibras',    severity:2, racesOut:2,
   desc:'Rotura parcial en el gemelo. Necesita reposo obligatorio.',
   statPenalty:{resistencia:-15,velocidad:-12,subida:-8}, causeLoad:85},
  {id:'esguince',    label:'Esguince de tobillo',  severity:1, racesOut:1,
   desc:'Torcedura durante el entrenamiento. Dolor al bajar escalones.',
   statPenalty:{bajada:-15,velocidad:-8}, causeLoad:70},
  {id:'fractura_estres',label:'Fractura por estrés',severity:3,racesOut:3,
   desc:'Fractura por estrés en el metatarso. Temporada comprometida.',
   statPenalty:{resistencia:-20,velocidad:-15,subida:-10,bajada:-10}, causeLoad:90},
];

// ── Pool de sponsors para el atleta ──
const COACH_SPONSORS_POOL=[
  {id:'cs_trailbase',  name:'TrailBase',      cat:'zapatillas', tier:1,
   salary:80, coachCut:0.15, duration:1,
   objective:'Terminar 2 carreras', objKey:'finish2',
   bonus:'Las mejores condiciones para el pie del atleta'},
  {id:'cs_altitudo',   name:'AltitudoSport',  cat:'ropa',       tier:1,
   salary:60, coachCut:0.15, duration:1,
   objective:'Top 15 en alguna carrera', objKey:'top15',
   bonus:'Material técnico de montaña'},
  {id:'cs_protaltrail',name:'ProtalNutrition', cat:'nutricion',  tier:1,
   salary:70, coachCut:0.20, duration:1,
   objective:'Terminar 3 carreras', objKey:'finish3',
   bonus:'Geles y sales para todo el año'},
  {id:'cs_suunto',     name:'Suunto',         cat:'tecnologia', tier:2,
   salary:120, coachCut:0.15, duration:1,
   objective:'Top 10 en alguna carrera', objKey:'top10',
   bonus:'GPS y métricas de entrenamiento'},
  {id:'cs_salomon',    name:'Salomon',        cat:'zapatillas', tier:2,
   salary:150, coachCut:0.10, duration:1,
   objective:'Podio en alguna carrera', objKey:'podio',
   bonus:'Modelo exclusivo para el atleta'},
  {id:'cs_clif',       name:'Clif Bar',       cat:'nutricion',  tier:2,
   salary:100, coachCut:0.20, duration:1,
   objective:'Top 5 en alguna carrera', objKey:'top5',
   bonus:'Protocolo nutricional personalizado'},
];
const COACH_DAY_CONDITIONS=[
  {text:'Dormiste mal — piernas al 90% de lo habitual.',energyMod:-3,legsMod:-8},
  {text:'Amanece con las piernas frescas. Buena señal.',energyMod:+4,legsMod:+5},
  {text:'Algo de nervios en el estómago. Normal antes de competir.',energyMod:-2,legsMod:0},
  {text:'Ha dormido 9 horas. Llega descansado y concentrado.',energyMod:+5,legsMod:+4},
  {text:'El calor ya aprieta antes de salir. Hidratación clave.',energyMod:0,legsMod:0,hydMod:-8},
  {text:'Condiciones perfectas. Sin viento, temperatura ideal.',energyMod:+3,legsMod:+2},
  {text:'Un pequeño dolor en el tibial. Probablemente nada.',energyMod:0,legsMod:-5},
];

// ── Eventos entre carreras ──
const COACH_BETWEEN_EVENTS=[
  {id:'family_stress',prob:0.14,icon:'📞',title:'Llamada familiar',
   desc:'{{name}} aparece con cara de preocupación. "Hay un problema en casa, coach. No sé si tengo la cabeza para entrenar esta semana."',
   choices:[
     {text:'"Tómate el tiempo que necesites. El entreno puede esperar."',trust:+5,bodyLoad:-5},
     {text:'"Entiendo, pero el deporte ayuda. Sigue adelante."',trust:+1},
     {text:'"Esto es profesional. No podemos mezclar las cosas."',trust:-6},
   ]},
  {id:'doubt_crisis',prob:0.12,icon:'💭',title:'Crisis de confianza',
   desc:'"No sé si soy lo suficientemente bueno para esto, coach. Veo los resultados de los demás y me pregunto si tiene sentido seguir."',
   choices:[
     {text:'"Mira cuánto has avanzado. Los números no mienten."',trust:+6},
     {text:'"El trail no es solo resultados. Es quién eres cuando nadie mira."',trust:+5},
     {text:'"Si tienes dudas, quizás no estás listo para el siguiente nivel."',trust:-8},
   ]},
  {id:'equipment_issue',prob:0.10,icon:'👟',title:'Problema con el material',
   desc:'"Las zapatillas me están destrozando los pies. Llevo dos semanas con ampollas y no te digo nada para no preocuparte."',
   choices:[
     {text:'Cambiar zapatillas inmediatamente (−€60)',trust:+4,money:-60},
     {text:'"Adapta la técnica. Es temporal."',trust:+1},
     {text:'"Hay que aguantar. No hay presupuesto ahora."',trust:-3,bodyLoad:+5},
   ]},
  {id:'rival_obsession',prob:0.13,icon:'🎯',title:'El rival en la cabeza',
   desc:'"{{rival}} volvió a ganar. Lo sigo en redes y... la verdad, me pone muy nervioso comparar."',
   choices:[
     {text:'"{{rival}} no viene a tus carreras. Enfócate en ti."',trust:+4},
     {text:'"Úsalo como motivación. Que te queme por dentro."',trust:+2},
     {text:'"Cuidado con obsesionarte. Eso destruye carreras."',trust:+5},
   ]},
  {id:'overtraining_signal',prob:0.11,icon:'😴',title:'Señales de sobrecarga',
   desc:'"Últimamente duermo fatal y tengo las piernas pesadas todo el día. Pero es normal, ¿no? Es parte del proceso."',
   choices:[
     {text:'Reducir carga esta semana (carga −15)',trust:+6,bodyLoad:-15},
     {text:'"Sí, es normal. Duerme más y ajusta la alimentación."',trust:+2},
     {text:'"El cuerpo se adapta. Aguanta."',trust:-2,bodyLoad:+8},
   ]},
  {id:'media_opportunity',prob:0.08,icon:'🎙',title:'Oferta de entrevista',
   desc:'Un podcast de trail running quiere entrevistar a {{name}}. "¿Merece la pena perder una sesión de entreno, coach?"',
   choices:[
     {text:'"Hazla. La visibilidad te abre puertas."',trust:+2,reputation:+5},
     {text:'"Esta semana no. El entreno primero."',trust:+1},
     {text:'"Tú decides. Es tu carrera."',trust:+3},
   ]},
  {id:'personal_best_ambition',prob:0.09,icon:'⏱',title:'Ambición de récord',
   desc:'"Coach, quiero ir a por el récord personal en la próxima. Sé que es arriesgado con la carga que llevo, pero... necesito saberlo."',
   choices:[
     {text:'"Con la carga actual, no. Espera a estar fresco."',trust:+4},
     {text:'"Inténtalo, pero gestiona el ritmo en los primeros km."',trust:+2,bodyLoad:+6},
     {text:'"Ve a por ello."',trust:+1,bodyLoad:+10},
   ]},
  {id:'injury_scare',prob:0.09,icon:'🩹',title:'Susto con una molestia',
   desc:'"Me torció el tobillo en el último entrenamiento. No es grave, pero me preocupa. ¿Corro la siguiente carrera?"',
   choices:[
     {text:'"Descanso total esta semana. La carrera puede esperar."',trust:+5,bodyLoad:-8,decisionType:'injury_scare_rest',decisionPositive:true},
     {text:'"Ve al fisio. Si da el visto bueno, corres."',trust:+4},
     {text:'"Es una molestia. Corres y punto."',trust:-4,bodyLoad:+5},
   ]},
  {id:'fear_after_fall',prob:0.08,icon:'😰',title:'Miedo tras una caída',
   desc:'"Tuve una caída fea entrenando en bajada técnica. Físicamente estoy bien, pero... me da pánico la bajada ahora. No sé cómo gestionarlo."',
   choices:[
     {text:'"Volvemos a la bajada en entrenos controlados. Paso a paso."',trust:+7,bodyLoad:-5,decisionType:'fear_rehab',decisionPositive:true},
     {text:'"Es psicológico. Tienes que empujarte a ti mismo."',trust:-3},
     {text:'"Evitamos bajadas técnicas este mes. Nos adaptamos."',trust:+4},
   ]},
  {id:'work_conflict',prob:0.09,icon:'💼',title:'Presión laboral',
   desc:'"Me han ofrecido un ascenso en el trabajo. Más dinero, pero menos tiempo para entrenar. No sé qué hacer, coach."',
   choices:[
     {text:'"El trail es tu carrera deportiva. Decide tú, pero sé consciente del coste."',trust:+5},
     {text:'"Acepta el ascenso y ajustamos el volumen de entrenamiento."',trust:+3,bodyLoad:-8},
     {text:'"Ahora no es el momento. El rendimiento primero."',trust:-4},
   ]},
  {id:'media_pressure',prob:0.07,icon:'📱',title:'Presión en redes',
   desc:'"Hay comentarios en Instagram diciendo que soy un fraude, que mis resultados son mediocres para mi edad. Me está afectando más de lo que debería."',
   choices:[
     {text:'"Desconecta de las redes este mes. Sin excepciones."',trust:+6},
     {text:'"Úsalos de combustible. Que la rabia te lleve más lejos."',trust:+3},
     {text:'"No les hagas caso. Lo que importa está en el cronómetro."',trust:+2},
   ]},
  {id:'sponsor_pressure',prob:0.07,icon:'💸',title:'Presión del sponsor',
   desc:'"El sponsor me presiona para que haga más contenido en redes. Dicen que no genero suficiente visibilidad. Me quita mucho tiempo de entreno."',
   choices:[
     {text:'"Negociamos juntos con el sponsor. Te respaldo."',trust:+8,decisionType:'sponsor_backup',decisionPositive:true},
     {text:'"Es parte del trato. Tienes que cumplir."',trust:-5},
     {text:'"Reduce el contenido a lo mínimo pactado. Explícales que el rendimiento es tu escaparate."',trust:+3},
   ]},
  {id:'relationship_tension',prob:0.06,icon:'💔',title:'Tensión personal',
   desc:'"Mi pareja dice que el trail lo ocupa todo. Que no estoy presente. Está en lo cierto, pero no sé cómo equilibrarlo."',
   choices:[
     {text:'"La vida personal es la base de todo. Dales tiempo real esta semana."',trust:+5,bodyLoad:-5},
     {text:'"Es un momento de sacrificio. El deporte de alto nivel exige eso."',trust:-3},
     {text:'"Buscamos un equilibrio. Entrenos más cortos, más presencia en casa."',trust:+4,bodyLoad:-8},
   ]},
];

// ── Eventos a mitad de carrera ──
const COACH_MID_RACE_EVENTS=[
  {id:'confidence_crash',icon:'💬',title:'Crisis de confianza',
   desc:'"No puedo más, coach. Las piernas no responden. ¿Sigo?"',
   choices:[
     {text:'"Tú puedes. Falta poco. Uno a uno."',trust:+4,legBoost:8},
     {text:'"Baja el ritmo. Llega, aunque sea el último."',trust:+3,legBoost:5},
     {text:'"Abandona. El cuerpo primero."',trust:-1,dnf:true},
   ]},
  {id:'rival_block',icon:'⚔️',title:'Pegado al rival',
   desc:'"{{rival}} me lleva bloqueado dos kilómetros en un singletrack. No puedo adelantar. ¿Qué hago?"',
   choices:[
     {text:'"Paciencia. Tu momento llega en la bajada."',trust:+2,timeMod:+25},
     {text:'"Presiona. Que sienta que estás ahí."',trust:+1,timeMod:-20},
     {text:'"Ignóralo. Corre tu carrera."',trust:+2,timeMod:+15},
   ]},
  {id:'shortcut_temptation',icon:'🗺️',title:'Atajo tentador',
   desc:'Ves lo que parece un atajo no señalizado. Ganarías tiempo pero arriesgas descalificación.',
   choices:[
     {text:'"No lo hagas. La integridad primero."',trust:+6},
     {text:'"Decide tú. Yo no lo vi."',trust:-3},
   ]},
  {id:'weather_turn',icon:'⛈️',title:'Tormenta repentina',
   desc:'Tormenta súbita a mitad de carrera. El terreno se vuelve peligroso. {{name}} pide instrucciones.',
   choices:[
     {text:'"Reduce el ritmo. Safety first."',trust:+3,timeMod:+55},
     {text:'"Aprovecha — los técnicos pierden más que tú."',trust:+1,timeMod:-10},
   ]},
  {id:'gel_crisis',icon:'🍬',title:'Sin energía',
   desc:'"Me quedé sin geles hace tres kilómetros. Me estoy hundiendo."',
   choices:[
     {text:'"Busca a alguien que te ceda uno en el siguiente avituallamiento."',trust:+3,energyBoost:12},
     {text:'"Gestiona el ritmo. Llegarás."',trust:+2,timeMod:+40},
   ]},
  {id:'cramp',icon:'⚡',title:'Calambre',
   desc:'{{name}} para en seco. Calambre en el gemelo. Te mira para saber qué hacer.',
   choices:[
     {text:'Parar 2 minutos a estirar (−2 min pero sin secuelas)',trust:+3,timeMod:+120,legBoost:10},
     {text:'Bajar ritmo y soltar la zancada',trust:+1,timeMod:+55,legBoost:5},
     {text:'Aguantar y seguir — el calor lo deshará',trust:-1,timeMod:+20},
   ]},
  {id:'fallen_competitor',icon:'🏃',title:'Corredor caído',
   desc:'Hay un corredor en el suelo a 10 metros. No parece grave pero tampoco se levanta.',
   choices:[
     {text:'Parar a ayudar (−3 min, +confianza, +reputación)',trust:+7,timeMod:+180,reputation:4},
     {text:'Preguntar si está bien y seguir (−30s)',trust:+2,timeMod:+30},
     {text:'"Hay avituallamiento cerca, alguien le ayudará."',trust:-3,timeMod:0},
   ]},
  {id:'nemesis_passes',icon:'🎯',title:'El rival pasa',
   desc:'"{{rival}} me acaba de adelantar, coach. Va fuerte. ¿Lo sigo o gestiono?"',
   choices:[
     {text:'"Deja que se vaya. Tu carrera es tuya."',trust:+3,timeMod:+20},
     {text:'"Aguanta su rueda. No le pierdas de vista."',trust:+1,timeMod:-15},
     {text:'"Ataca ahora. Es tu momento."',trust:+1,timeMod:-30,energyCost:12},
   ]},
  {id:'wrong_path',icon:'🗺️',title:'¿Es por aquí?',
   desc:'La baliza señala dos caminos. Otros corredores van por la izquierda. {{name}} duda.',
   choices:[
     {text:'"Izquierda con el grupo — riesgo mínimo."',trust:+1},
     {text:'"Derecha — confía en el recorrido que estudiamos."',trust:+2,timeMod:-25},
   ]},
];

// ── Mensajes de radio por tramo ──
const COACH_RADIO_MESSAGES=[
  {id:'push',     label:'⚡ Empuja',    desc:'Dale más intensidad',        timeMod:-20, energyCost:8},
  {id:'conserve', label:'🛡 Conserva', desc:'Guarda energía para después', timeMod:+25, energySave:5},
  {id:'attack',   label:'🗡 Ataca',    desc:'Supera posiciones ahora',     timeMod:-35, energyCost:14},
  {id:'breathe',  label:'🌬 Respira',  desc:'Relaja, baja los hombros',    timeMod:+10, trustBoost:1},
  {id:'focus',    label:'🎯 Enfoca',   desc:'Solo el siguiente km',        timeMod:-5,  trustBoost:2},
  {id:'silent',   label:'📵 Silencio', desc:'Le dejas decidir solo',       timeMod:0},
];
const SPEC_RACES={
  fondista:[
    {id:'sf1',name:'Transvulcania Ultramarathon',type:'73K ultra',   km:73,cost:200,prize:1000,reqRanking:10,weather_risk:0.30,month:5,monthName:'Mayo',    quarter:2,tier:'elite',  spec:'fondista',
     segs:[{name:'Salida Los Llanos',km:5,type:'flat',gain:0,base:1500},{name:'Valle Aridane',km:5,type:'flat',gain:0,base:1600,aid:true},{name:'Subida Inicial',km:8,type:'climb',gain:900,base:2800},{name:'Cumbre Vieja',km:6,type:'climb',gain:800,base:3200,aid:true},{name:'Bajada Técnica',km:8,type:'descent',gain:-1100,base:2200},{name:'Valle Central',km:6,type:'flat',gain:0,base:1800,aid:true},{name:'Subida Roque',km:7,type:'climb',gain:1000,base:3000},{name:'Cresta Alta',km:4,type:'flat',gain:0,base:1800,aid:true},{name:'Subida Final',km:6,type:'climb',gain:1500,base:3200},{name:'Gran Descenso',km:9,type:'descent',gain:-1400,base:2500,aid:true},{name:'Llegada Santa Cruz',km:9,type:'flat',gain:0,base:1800,aid:true}]},
    {id:'sf2',name:'Andalucía Ultra Trail',  type:'42K fondista',km:42,cost:85, prize:300, reqRanking:999,weather_risk:0.15,month:7,monthName:'Julio',    quarter:3,tier:'regional',spec:'fondista',
     segs:[{name:'Salida Almería',km:5,type:'flat',gain:0,base:1200},{name:'Subida Sierra',km:9,type:'climb',gain:700,base:2400,aid:true},{name:'Collado',km:3,type:'flat',gain:0,base:1500},{name:'Bajada',km:7,type:'descent',gain:-700,base:2000},{name:'Valle Almanzora',km:4,type:'flat',gain:0,base:1400,aid:true},{name:'Repecho Final',km:7,type:'climb',gain:800,base:2200},{name:'Descenso Meta',km:5,type:'descent',gain:-700,base:1800},{name:'Meta',km:2,type:'flat',gain:0,base:1100}]},
    {id:'sf3',name:'100 Millas de Aneto',    type:'100K ultra',  km:100,cost:200,prize:1200,reqRanking:15,weather_risk:0.25,month:10,monthName:'Octubre', quarter:4,tier:'elite',spec:'fondista',
     segs:[{name:'Salida Benasque',km:8,type:'flat',gain:0,base:1500},{name:'Subida Aneto 1',km:14,type:'climb',gain:1300,base:3100,aid:true},{name:'Collado 1',km:6,type:'flat',gain:0,base:2000},{name:'Bajada 1',km:10,type:'descent',gain:-1200,base:2200},{name:'Valle Central',km:8,type:'flat',gain:0,base:1500,aid:true},{name:'Subida Aneto 2',km:14,type:'climb',gain:1700,base:3300},{name:'Collado 2',km:4,type:'flat',gain:0,base:2000,aid:true},{name:'Subida Final',km:10,type:'climb',gain:1500,base:3200,aid:true},{name:'Gran Descenso',km:14,type:'descent',gain:-1400,base:2800},{name:'Meta Benasque',km:12,type:'flat',gain:0,base:1500}]},
  ],
  montanero:[
    {id:'sm1',name:'Zegama Skyrace',          type:'25K vertical',km:25,cost:80, prize:280, reqRanking:999,weather_risk:0.35,month:3,monthName:'Marzo',    quarter:1,tier:'regional',spec:'montanero',
     segs:[{name:'Salida',km:2,type:'flat',gain:0,base:900},{name:'Subida Continua',km:10,type:'climb',gain:2200,base:3500,aid:true},{name:'Cresta',km:3,type:'flat',gain:0,base:1200},{name:'Bajada Técnica',km:7,type:'descent',gain:-1800,base:2200},{name:'Meta',km:3,type:'flat',gain:0,base:1000}]},
    {id:'sm2',name:'Trail dels Bastions',     type:'50K montaña', km:50,cost:120,prize:600, reqRanking:20,weather_risk:0.30,month:7,monthName:'Julio',    quarter:3,tier:'nacional',spec:'montanero',
     segs:[{name:'Salida',km:4,type:'flat',gain:0,base:1100},{name:'Subida 1',km:9,type:'climb',gain:900,base:2800,aid:true},{name:'Cresta Alta',km:4,type:'flat',gain:0,base:1600},{name:'Bajada Técnica',km:7,type:'descent',gain:-800,base:2400},{name:'Valle',km:5,type:'flat',gain:0,base:1400,aid:true},{name:'Subida 2',km:9,type:'climb',gain:1100,base:3000},{name:'Collado',km:3,type:'flat',gain:0,base:1600,aid:true},{name:'Subida 3',km:6,type:'climb',gain:1000,base:2800},{name:'Bajada Final',km:3,type:'descent',gain:-900,base:1900}]},
    {id:'sm3',name:'UTMB OCC',                type:'55K élite mt',km:55,cost:160,prize:900, reqRanking:12,weather_risk:0.40,month:8,monthName:'Agosto',   quarter:3,tier:'elite',spec:'montanero',
     segs:[{name:'Salida Orsières',km:4,type:'flat',gain:0,base:900},{name:'Subida Champex',km:10,type:'climb',gain:1400,base:3000,aid:true},{name:'Lac de Champex',km:4,type:'flat',gain:0,base:1200},{name:'Bajada Vallorcine',km:8,type:'descent',gain:-1100,base:2200,aid:true},{name:'Valle Montagne',km:5,type:'flat',gain:0,base:1100,aid:true},{name:'Subida Tête Vents',km:9,type:'climb',gain:1300,base:3000},{name:'Cresta Brévent',km:3,type:'flat',gain:0,base:1600,aid:true},{name:'Subida Final',km:5,type:'climb',gain:800,base:2600},{name:'Gran Descenso Chamonix',km:7,type:'descent',gain:-1000,base:2000}]},
  ],
  tecnico:[
    {id:'st1',name:'Descenso de Jaca',        type:'18K técnico', km:18,cost:55, prize:160, reqRanking:999, weather_risk:0.20,month:5,monthName:'Mayo',     quarter:2,tier:'regional',spec:'tecnico',
     segs:[{name:'Salida',km:2,type:'flat',gain:0,base:800},{name:'Subida',km:4,type:'climb',gain:400,base:1600},{name:'Cresta',km:2,type:'flat',gain:0,base:900,aid:true},{name:'Bajada Técnica',km:6,type:'descent',gain:-800,base:2000},{name:'Meta',km:4,type:'flat',gain:0,base:1100}]},
    {id:'st2',name:'TransValles Cantábrico',  type:'30K técnico', km:30,cost:80, prize:260, reqRanking:25,weather_risk:0.25,month:8,monthName:'Agosto',   quarter:3,tier:'nacional',spec:'tecnico',
     segs:[{name:'Salida',km:3,type:'flat',gain:0,base:1000},{name:'Subida',km:5,type:'climb',gain:600,base:2100},{name:'Cresta',km:3,type:'flat',gain:0,base:1100,aid:true},{name:'Bajada Técnica 1',km:5,type:'descent',gain:-700,base:2200},{name:'Puerto',km:4,type:'climb',gain:400,base:1800,aid:true},{name:'Bajada Final',km:6,type:'descent',gain:-900,base:2500},{name:'Meta',km:4,type:'flat',gain:0,base:1100}]},
    {id:'st3',name:'TransPirenaica Técnica',  type:'40K técnico', km:40,cost:110,prize:500, reqRanking:15,weather_risk:0.30,month:11,monthName:'Noviembre',quarter:4,tier:'elite',spec:'tecnico',
     segs:[{name:'Salida',km:4,type:'flat',gain:0,base:1200},{name:'Subida',km:7,type:'climb',gain:700,base:2400},{name:'Alto',km:5,type:'flat',gain:0,base:1400,aid:true},{name:'Bajada 1',km:6,type:'descent',gain:-800,base:2300},{name:'Repecho',km:5,type:'climb',gain:500,base:1900,aid:true},{name:'Descenso Final',km:8,type:'descent',gain:-1100,base:2800},{name:'Meta',km:5,type:'flat',gain:0,base:1100}]},
  ],
  todoterreno:[
    {id:'stt1',name:'Copa Spain Trail',        type:'28K mixto',   km:28,cost:65, prize:200, reqRanking:999,weather_risk:0.18,month:4,monthName:'Abril',   quarter:2,tier:'regional',spec:'todoterreno',
     segs:[{name:'Salida',km:4,type:'flat',gain:0,base:1200},{name:'Subida',km:6,type:'climb',gain:500,base:2000},{name:'Cresta',km:3,type:'flat',gain:0,base:1100,aid:true},{name:'Bajada',km:6,type:'descent',gain:-500,base:1800},{name:'Llano',km:5,type:'flat',gain:0,base:1300},{name:'Meta',km:4,type:'climb',gain:200,base:1500}]},
    {id:'stt2',name:'Ultra Alpujarra Trail',   type:'35K mixto',   km:35,cost:85, prize:320, reqRanking:22,weather_risk:0.22,month:8,monthName:'Agosto',   quarter:3,tier:'nacional',spec:'todoterreno',
     segs:[{name:'Salida',km:5,type:'flat',gain:0,base:1300},{name:'Subida',km:7,type:'climb',gain:600,base:2200},{name:'Alto',km:5,type:'flat',gain:0,base:1400,aid:true},{name:'Bajada',km:7,type:'descent',gain:-600,base:1900},{name:'Valle',km:6,type:'flat',gain:0,base:1500,aid:true},{name:'Meta',km:5,type:'climb',gain:300,base:1700}]},
    {id:'stt3',name:'Transandalus Trail',      type:'50K mixto',   km:50,cost:130,prize:650, reqRanking:15,weather_risk:0.28,month:10,monthName:'Octubre', quarter:4,tier:'elite',spec:'todoterreno',
     segs:[{name:'Salida',km:6,type:'flat',gain:0,base:1500},{name:'Subida Larga',km:8,type:'climb',gain:800,base:2600},{name:'Cima',km:6,type:'flat',gain:0,base:1700,aid:true},{name:'Bajada Técnica',km:8,type:'descent',gain:-900,base:2300},{name:'Llanura',km:7,type:'flat',gain:0,base:1700,aid:true},{name:'Último Puerto',km:6,type:'climb',gain:700,base:2400},{name:'Descenso Meta',km:9,type:'descent',gain:-600,base:2100,aid:true}]},
  ],
};

// ══════════════════════════════════════
//  CIRCUITOS / LIGAS
// ══════════════════════════════════════
// T141 (v91): ultra_finisher reconstruía RACES_DB + SPEC_RACES y hacía un find
// lineal por cada carrera del historial, en cada evaluación del logro. Se monta
// una vez, perezosamente (SPEC_RACES se declara más abajo que ACHIEVEMENTS).
let _ALL_RACES_BY_NAME=null;
function allRacesByName(){
  if(_ALL_RACES_BY_NAME)return _ALL_RACES_BY_NAME;
  _ALL_RACES_BY_NAME=new Map();
  for(const r of [...RACES_DB,...Object.values(SPEC_RACES||{}).flat()])
    if(!_ALL_RACES_BY_NAME.has(r.name))_ALL_RACES_BY_NAME.set(r.name,r);
  return _ALL_RACES_BY_NAME;
}

const CIRCUITS_DB=[
  {id:'copa_trail',name:'Copa Trail España',color:'#4a90d9',
   desc:'Liga nacional con 3 pruebas clave. Acumula puntos para el podio final.',
   prize:'€500 + patrocinio garantizado para el top 3',
   raceIds:['copa','junio','sierra'],
   pointsForPrize:150,
   reward:{money:500,sponsorBonus:true}},
  {id:'circuito_montana', // T140 (v92): llevaba ñ, y los ids son claves de objeto que acaban en localStorage
   name:'Circuito de Alta Montaña',color:'#4a8a2a',
   desc:'3 pruebas de montaña exigentes. Solo para los mejores.',
   prize:'€800 + acceso directo al Monte Perdido',
   raceIds:['agosto','sm2','sm3'],
   pointsForPrize:180,
   reqRanking:25,
   reward:{money:800,unlockElite:true}},
  {id:'liga_local',name:'Liga Local Trail',color:'#888',
   desc:'Perfecta para el año 1. 3 pruebas accesibles con buena recompensa.',
   prize:'€200 + visibilidad ante sponsors locales',
   raceIds:['pinar','febrero','octubre'],
   pointsForPrize:80,
   reward:{money:200,followerBonus:500}},
];

const FAME_ACTIONS=[
  {id:'reel',      label:'Subir reel de entrenamiento',  icon:'🎬',
   desc:'Contenido rápido. Pocos seguidores pero constante.',
   hours:2, followers:200, cost:0,  cooldown:1},
  {id:'podcast',   label:'Entrevista en podcast',         icon:'🎙',
   desc:'Visibilidad media. Sin coste de tiempo alto.',
   hours:2, followers:350, cost:0,  cooldown:2},
  {id:'clinic',    label:'Clínica de trail running',       icon:'🏫',
   desc:'Enseñas a otros. Seguidores + stat Mental.',
   hours:5, followers:450, cost:0,  cooldown:3, statBonus:{mental:1}},
  {id:'vlog',      label:'Vlog de una carrera',           icon:'🎥',
   desc:'Más currado. Necesitas haber corrido recientemente.',
   hours:4, followers:600, cost:0,  cooldown:2, reqLastRace:true},
  {id:'solidaria', label:'Carrera solidaria',             icon:'🤝',
   desc:'Imagen pública. Seguidores + reputación con sponsors.',
   hours:6, followers:900, cost:30, cooldown:4, sponsorBonus:true},
  {id:'anuncio',   label:'Rodar anuncio con marca',       icon:'📺',
   desc:'Solo si tienes sponsor activo. Ingresos extra.',
   hours:8, followers:1200, cost:0,  cooldown:3, reqSponsor:true, income:150},
];

// Seguidores necesarios para desbloquear beneficios
const FAME_THRESHOLDS=[
  {followers:200,   label:'Cara conocida',        benefit:'Los rivales te reconocen en la salida'},
  {followers:500,   label:'Conocido local',        benefit:'Los eventos locales te mencionan'},
  {followers:1000,  label:'Micro-influencer',      benefit:'+10% salario sponsors · sponsors locales te contactan primero'},
  {followers:2500,  label:'Voz del trail',         benefit:'+15% salario · descuento inscripciones -10%'},
  {followers:5000,  label:'Conocido en el circuito', benefit:'+20% salario · 1 invitación regional/temporada · sponsors tier 2 antes de año 3'},
  {followers:10000, label:'Referente regional',    benefit:'+28% salario · 1 invitación nacional/temporada · sponsors hacen ofertas sin buscarlas'},
  {followers:15000, label:'Figura nacional',       benefit:'+35% salario · 2 invitaciones nacionales/temporada · sponsors tier 3 antes de año 4'},
  {followers:25000, label:'Embajador del trail',   benefit:'+42% salario · 1 invitación élite/temporada'},
  {followers:50000, label:'Leyenda mediática',     benefit:'+52% salario · 2 invitaciones élite/temporada · sponsors tier 4 desde año 3'},
  {followers:100000,label:'Icono del trail',       benefit:'+65% salario · acceso libre a cualquier carrera · marca propia se desbloquea antes'},
];
// ══════════════════════════════════════
//  MODO CLUB — CONSTANTES
// ══════════════════════════════════════
const CLUB_RUNNER_POOL=[
  {id:'cr1', name:'Iker Garmendia',  flag:'🇪🇸', spec:'montanero',  age:24, stats:{resistencia:52,velocidad:44,subida:65,bajada:55}, salary:150, potential:'alto',   bio:'Joven del Pirineo. Sube como un cabra.'},
  {id:'cr2', name:'Amaia Etxeberria',flag:'🇪🇸', spec:'fondista',   age:29, stats:{resistencia:68,velocidad:54,subida:50,bajada:48}, salary:180, potential:'medio',  bio:'Fondo sólido. Gana en los tramos largos.'},
  {id:'cr3', name:'Josu Markiegi',   flag:'🇪🇸', spec:'tecnico',    age:32, stats:{resistencia:55,velocidad:58,subida:52,bajada:70}, salary:200, potential:'bajo',   bio:'Veterano del circuito. Bajadas de manual.'},
  {id:'cr4', name:'Nere Iturbe',     flag:'🇪🇸', spec:'todoterreno',age:26, stats:{resistencia:60,velocidad:56,subida:58,bajada:58}, salary:170, potential:'alto',   bio:'Polivalente. Se adapta a cualquier terreno.'},
  {id:'cr5', name:'Unai Lazkano',    flag:'🇪🇸', spec:'montanero',  age:21, stats:{resistencia:44,velocidad:48,subida:60,bajada:50}, salary:100, potential:'alto',   bio:'Sub-23 con hambre. Poco rodaje, mucho talento.'},
  {id:'cr6', name:'Miren Azpeitia',  flag:'🇪🇸', spec:'fondista',   age:34, stats:{resistencia:70,velocidad:50,subida:48,bajada:46}, salary:190, potential:'bajo',   bio:'Resistencia bruta. Mejor en ultras largas.'},
  {id:'cr7', name:'Gorka Tellería',  flag:'🇪🇸', spec:'tecnico',    age:28, stats:{resistencia:56,velocidad:62,subida:54,bajada:66}, salary:210, potential:'medio',  bio:'Ex-ciclista reconvertido. Rápido en llano.'},
  {id:'cr8', name:'Leire Ugarte',    flag:'🇪🇸', spec:'todoterreno',age:31, stats:{resistencia:62,velocidad:55,subida:60,bajada:58}, salary:175, potential:'medio',  bio:'Constante y fiable. La capitana ideal.'},
  {id:'cr9', name:'Aritz Agirre',    flag:'🇪🇸', spec:'montanero',  age:27, stats:{resistencia:58,velocidad:50,subida:72,bajada:52}, salary:220, potential:'alto',   bio:'Especialista en vertical. Fuera de serie en rampas.'},
  {id:'cr10',name:'Ane Goikoetxea',  flag:'🇪🇸', spec:'fondista',   age:23, stats:{resistencia:50,velocidad:52,subida:46,bajada:50}, salary:120, potential:'alto',   bio:'Recién llegada al trail. Viene del atletismo de pista.'},
  {id:'cr11',name:'Txomin Elosegi',  flag:'🇪🇸', spec:'tecnico',    age:36, stats:{resistencia:60,velocidad:55,subida:50,bajada:68}, salary:160, potential:'bajo',   bio:'Alma del club. Nunca abandona. Liderazgo natural.'},
  {id:'cr12',name:'Itziar Mendiburu',flag:'🇪🇸', spec:'todoterreno',age:25, stats:{resistencia:55,velocidad:58,subida:62,bajada:60}, salary:155, potential:'alto',   bio:'Talento sin pulir. Necesita disciplina de entreno.'},
  // ── Ampliación T115 (v84): de 12 a 30 corredores ─────────────────────────
  // El pool de 12 dejaba sin candidatos el cruce especialidad × arquetipo.
  // Reparto buscado: por cada especialidad, al menos 3 jóvenes de potencial
  // alto (arquetipo Cantera) y 3 de 30+ con potencial bajo/medio (Veteranos).
  // cr1–cr12 se conservan intactos: hay saves con esos ids en plantilla/cantera.
  {id:'cr13',name:'Haritz Zabaleta',   flag:'🇪🇸', spec:'montanero',  age:33, stats:{resistencia:64,velocidad:48,subida:68,bajada:54}, salary:210, potential:'bajo',   bio:'Quince años de vertical en las piernas. Ya no sube igual, pero sabe cuándo apretar.'},
  {id:'cr14',name:'Maialen Otxoa',     flag:'🇪🇸', spec:'montanero',  age:31, stats:{resistencia:61,velocidad:52,subida:64,bajada:57}, salary:185, potential:'medio',  bio:'Llegó tarde al trail desde el esquí de montaña. Nunca pasa frío.'},
  {id:'cr15',name:'Beñat Sarasola',    flag:'🇪🇸', spec:'montanero',  age:35, stats:{resistencia:66,velocidad:45,subida:66,bajada:50}, salary:165, potential:'bajo',   bio:'El más veterano del valle. Conoce cada senda de memoria.'},
  {id:'cr16',name:'Oihana Barandiaran',flag:'🇪🇸', spec:'montanero',  age:22, stats:{resistencia:46,velocidad:47,subida:63,bajada:49}, salary:105, potential:'alto',   bio:'Sub-23. Ligera como el aire en las rampas, verde en todo lo demás.'},
  {id:'cr17',name:'Julen Zubizarreta', flag:'🇪🇸', spec:'montanero',  age:28, stats:{resistencia:59,velocidad:53,subida:62,bajada:56}, salary:180, potential:'medio',  bio:'Sólido, sin alardes. El corredor que siempre está donde tiene que estar.'},
  {id:'cr18',name:'Lide Arruabarrena', flag:'🇪🇸', spec:'fondista',   age:24, stats:{resistencia:57,velocidad:49,subida:47,bajada:48}, salary:130, potential:'alto',   bio:'Motor diésel. Cuanto más larga la carrera, mejor le va.'},
  {id:'cr19',name:'Ekaitz Loiola',     flag:'🇪🇸', spec:'fondista',   age:22, stats:{resistencia:53,velocidad:51,subida:45,bajada:47}, salary:115, potential:'alto',   bio:'Viene del cross escolar. Aún no sabe lo que es una ultra.'},
  {id:'cr20',name:'Garbiñe Alkorta',   flag:'🇪🇸', spec:'fondista',   age:33, stats:{resistencia:72,velocidad:48,subida:50,bajada:47}, salary:200, potential:'bajo',   bio:'Cuatro ultras al año durante una década. El cuerpo empieza a pasar factura.'},
  {id:'cr21',name:'Asier Mendizabal',  flag:'🇪🇸', spec:'fondista',   age:30, stats:{resistencia:69,velocidad:51,subida:52,bajada:49}, salary:195, potential:'medio',  bio:'Estratega de carrera larga. Nunca sale rápido, nunca se hunde.'},
  {id:'cr22',name:'Nahia Erauskin',    flag:'🇪🇸', spec:'fondista',   age:37, stats:{resistencia:71,velocidad:44,subida:48,bajada:45}, salary:150, potential:'bajo',   bio:'Referente del club en distancias imposibles. Última temporada, dice.'},
  {id:'cr23',name:'Xabier Larrañaga',  flag:'🇪🇸', spec:'tecnico',    age:23, stats:{resistencia:50,velocidad:58,subida:48,bajada:64}, salary:135, potential:'alto',   bio:'Baja sin frenos y sin miedo. Habrá que enseñarle lo segundo.'},
  {id:'cr24',name:'Irati Goñi',        flag:'🇪🇸', spec:'tecnico',    age:25, stats:{resistencia:54,velocidad:60,subida:50,bajada:63}, salary:150, potential:'alto',   bio:'Trialera reconvertida. Lee el terreno antes de pisarlo.'},
  {id:'cr25',name:'Ander Uribarri',    flag:'🇪🇸', spec:'tecnico',    age:21, stats:{resistencia:45,velocidad:56,subida:46,bajada:60}, salary:100, potential:'alto',   bio:'Diecinueve años en bici de montaña. Dos corriendo.'},
  {id:'cr26',name:'Saioa Zelaia',      flag:'🇪🇸', spec:'tecnico',    age:34, stats:{resistencia:58,velocidad:57,subida:51,bajada:69}, salary:190, potential:'bajo',   bio:'Descensos de otra época. Las rodillas ya avisan.'},
  {id:'cr27',name:'Peru Etxaniz',      flag:'🇪🇸', spec:'todoterreno',age:22, stats:{resistencia:49,velocidad:52,subida:53,bajada:54}, salary:110, potential:'alto',   bio:'Sirve para todo y no destaca en nada. Todavía.'},
  {id:'cr28',name:'Amets Larrea',      flag:'🇪🇸', spec:'todoterreno',age:24, stats:{resistencia:54,velocidad:55,subida:56,bajada:55}, salary:145, potential:'alto',   bio:'Cabeza fría, piernas obedientes. El perfil que todo club busca.'},
  {id:'cr29',name:'Ainhoa Berasategi', flag:'🇪🇸', spec:'todoterreno',age:32, stats:{resistencia:63,velocidad:56,subida:59,bajada:59}, salary:205, potential:'medio',  bio:'Diez temporadas sin una sola retirada. Fiabilidad pura.'},
  {id:'cr30',name:'Iñaki Olabarria',   flag:'🇪🇸', spec:'todoterreno',age:36, stats:{resistencia:61,velocidad:52,subida:57,bajada:56}, salary:170, potential:'bajo',   bio:'Fue capitán en tres clubes distintos. Hace mejor a quien corre a su lado.'},
];

// ── Roles de plantilla (C8) ────────────────────────────────────────────────
// BUG-16 (v96): los textos dicen lo que hace simClubRace(). crewBonus y dnfShield no los
// lee nadie; el +6 del especialista cuenta cuando su especialidad es la del club.
const CLUB_ROLES={
  capitan:    {label:'Capitán',    emoji:'⭐',color:'#c07a10',
    desc:'Sube la cohesión del equipo en +5 por temporada y rinde +4 en carrera.',
    cohesionBonus:5, perfBonus:4, crewBonus:true},
  promesa:    {label:'Promesa',    emoji:'🌱',color:'#2d7a2d',
    desc:'Progresa un 50% más rápido que el resto. Solo menores de 26 años.',
    growthBonus:1.5, perfBonus:0},
  especialista:{label:'Especialista',emoji:'🎯',color:'#4a90d9',
    desc:'+10 de rendimiento en carrera, y +6 más si su especialidad es la del club.',
    perfBonus:10, specBonus:true},
  gregario:   {label:'Gregario',  emoji:'🤝',color:'#888',
    desc:'Corredor de apoyo: rinde −3 en carrera.',
    perfBonus:-3, dnfShield:true},
  normal:     {label:'Corredor',  emoji:'🏃',color:'#aaa',
    desc:'Sin bonus especial.',
    perfBonus:0},
};

// ── Filosofía del club (C9) ────────────────────────────────────────────────
const CLUB_FILOSOFIAS={
  montanero:  {label:'Montañero',  emoji:'🏔️',color:'#2d7a2d',
    desc:'Especialistas en desnivel. Corredores de subida crecen más rápido.',
    specBonus:'montanero', raceBonus:['regional','nacional'], sponsorBonus:'material',
    statGrowthKey:'subida', cohesionBonus:2},
  tecnico:    {label:'Técnico',   emoji:'⚡',color:'#4a90d9',
    desc:'Precisión en descensos técnicos. Más eventos de visibilidad mediática.',
    specBonus:'tecnico', raceBonus:['local','regional'], sponsorBonus:'tecnologia',
    statGrowthKey:'bajada', cohesionBonus:0},
  estrategico:{label:'Estratégico',emoji:'🧠',color:'#8e44ad',
    desc:'Menos lesiones. Mejor gestión de carga y calendario.',
    specBonus:null, raceBonus:[], sponsorBonus:'nutricion',
    injuryReduction:0.3, cohesionBonus:3},
  comercial:  {label:'Comercial', emoji:'💰',color:'#c07a10',
    desc:'Más patrocinadores disponibles. Ingresos de socios +20%.',
    specBonus:null, raceBonus:[], sponsorBonus:'local',
    socioBonus:1.2, cohesionBonus:0},
};

// ── Arquetipos de club (T115, v84) ─────────────────────────────────────────
// Antes todos los clubes arrancaban con la misma plantilla, presupuesto y
// cohesión: elegir club no cambiaba nada. Cada arquetipo filtra el pool y fija
// las condiciones de salida.
const CLUB_ARCHETYPES={
  cantera:{     label:'Cantera',     emoji:'🌱', color:'#2d7a2d',
    desc:'Tres jóvenes con poco rodaje y mucho techo. Salarios bajos y presupuesto holgado, pero los resultados tardan.',
    ageMax:26, potential:['alto'],           presupuesto:1100, socios:8,  cohesion:45},
  veteranos:{   label:'Veteranos',   emoji:'🧓', color:'#c07a10',
    desc:'Tres corredores hechos. Compiten desde el primer día, pero cobran más y se te caen en tres o cuatro temporadas.',
    ageMin:30, potential:['bajo','medio'],   presupuesto:600,  socios:12, cohesion:60},
  equilibrado:{ label:'Equilibrado', emoji:'⚖️', color:'#4a90d9',
    desc:'Una plantilla mezclada, sin extremos. La opción neutra.',
    potential:null,                          presupuesto:800,  socios:8,  cohesion:50},
};

// ── Staff técnico (C11) ────────────────────────────────────────────────────
const CLUB_STAFF_TYPES={
  fisio:      {label:'Fisioterapeuta',emoji:'🧑‍⚕️',costMonth:200,
    desc:'Reduce lesiones en un 40% y acelera recuperación.',
    injuryReduction:0.4},
  entrenador: {label:'Entrenador',   emoji:'🧑‍🏫',costMonth:300,
    desc:'Todos los corredores progresan un 30% más rápido.',
    growthBonus:1.3},
  marketing:  {label:'Marketing',    emoji:'📣',costMonth:150,
    desc:'+3 socios automáticos al mes. Mejora visibilidad en eventos.',
    sociosPerMonth:3},
  psicologo:  {label:'Psicólogo',    emoji:'🧠',costMonth:180,
    desc:'Cohesión grupal +8 por temporada. Reduce conflictos internos.',
    cohesionBonus:8},
};

// ── Pool de patrocinadores de club (C13) ───────────────────────────────────
const CLUB_SPONSORS_POOL=[
  {id:'cs1',name:'TrailShop Local',    cat:'material',  tier:1, monthlyIncome:150,
   objective:'Top 10 en 3 carreras',   objKey:'top10x3', duration:1},
  {id:'cs2',name:'Turismo Activo',     cat:'turismo',   tier:1, monthlyIncome:120,
   objective:'Participar en 5 carreras',objKey:'part5',   duration:1},
  {id:'cs3',name:'NutriTrail',         cat:'nutricion', tier:1, monthlyIncome:100,
   objective:'Sin abandonos colectivos',objKey:'no_dnf',  duration:1},
  {id:'cs4',name:'Suunto Club',        cat:'tecnologia',tier:2, monthlyIncome:280,
   objective:'Un podio de equipo',     objKey:'podio1',  duration:2},
  {id:'cs5',name:'Salomon Team',       cat:'material',  tier:2, monthlyIncome:350,
   objective:'Top 5 en carrera nacional',objKey:'top5nat',duration:2},
  {id:'cs6',name:'Diputación Foral',   cat:'local',     tier:2, monthlyIncome:400,
   objective:'50+ socios activos',     objKey:'socios50',duration:2},
];

// v96 · Economía del Club (decisión del 2026-09-15). Con la cuota a €25 un club recién
// creado perdía ~€4.000 por temporada y el suelo en 0 del presupuesto lo escondía.
// Cifras de partida: se miden jugando y se tocan aquí, nunca en la lógica.
// v96 (tras el playtest): con €45 el club era rentable desde el primer año y el presupuesto
// crecía sin techo (más de €200.000 en siete temporadas). Con €25 y el techo blando de
// socios, un club pierde dinero de una a tres temporadas antes de despegar: «una empresa de
// base pierde dinero hasta que es rentable». Se mide jugando.
const CLUB_SOCIO_FEE=25;                          // €/socio/mes
const CLUB_SOCIOS_SOFT_CAP=120;                   // los socios que dan los resultados se reducen al acercarse: a 60, la mitad
const CLUB_SPONSOR_SPLIT={base:0.6,failRep:3};    // 60 % al simular; el 40 % restante solo si se cumple el objetivo
const CLUB_RED_SEASONS_MAX=5;                     // temporadas seguidas cerrando en negativo hasta disolverse

// ── Cantera juvenil — pool de jóvenes fichables (C12) ────────────────────
const CLUB_YOUTH_POOL=[
  {id:'y1',name:'Mikel Iturbe',   flag:'🇪🇸',spec:'montanero',  age:18,stats:{resistencia:38,velocidad:40,subida:52,bajada:42},salary:60, potential:'alto', bio:'Ganador del campeonato juvenil de Navarra.'},
  {id:'y2',name:'June Garmendia', flag:'🇪🇸',spec:'fondista',   age:19,stats:{resistencia:45,velocidad:38,subida:40,bajada:38},salary:70, potential:'alto', bio:'Viene del cross. Fondo excepcional para su edad.'},
  {id:'y3',name:'Ander Zubiaurre',flag:'🇪🇸',spec:'tecnico',    age:17,stats:{resistencia:35,velocidad:44,subida:38,bajada:55},salary:50, potential:'alto', bio:'Natural en la bajada. Nadie le enseñó — es instinto.'},
  {id:'y4',name:'Irati Aizpurua', flag:'🇪🇸',spec:'todoterreno',age:20,stats:{resistencia:42,velocidad:42,subida:44,bajada:44},salary:80, potential:'alto', bio:'Polivalente. Acabó tercera en su primera carrera senior.'},
  {id:'y5',name:'Oier Etxabe',    flag:'🇪🇸',spec:'montanero',  age:18,stats:{resistencia:36,velocidad:38,subida:58,bajada:40},salary:55, potential:'alto', bio:'Escalador nato. Sube como un motor.'},
];

// ── Objetivos de temporada del club (C18) ─────────────────────────────────
const CLUB_OBJECTIVES=[
  {id:'subir_nivel',  label:'Subir de nivel de club',
   desc:'Conseguir suficientes socios para el siguiente nivel.',
   check:(d,lvl)=>d.socios>lvl.sociosMax,
   reward:{rep:15,socios:10}, penalty:{rep:-5}},
  {id:'ganar_circuito',label:'Ganar una carrera del circuito',
   desc:'Al menos un corredor del club en el primer puesto.',
   check:(d)=>(d.seasonResults||[]).some(r=>r.pos===1),
   reward:{rep:12,socios:6}, penalty:{rep:-3}},
  {id:'tres_podios',  label:'3 podios en la temporada',
   desc:'El club acumula tres podios entre todos sus corredores.',
   check:(d)=>(d.seasonResults||[]).filter(r=>r.pos<=3).length>=3,
   reward:{rep:10,socios:5}, penalty:{rep:-4}},
  {id:'socios_30',    label:'Llegar a 30 socios activos',
   desc:'Crecer la base social del club.',
   check:(d)=>d.socios>=30,
   reward:{rep:8,socios:8}, penalty:{rep:-2}},
  {id:'socios_80',    label:'Llegar a 80 socios activos',
   desc:'Consolidarse como club regional.',
   check:(d)=>d.socios>=80,
   reward:{rep:15,socios:12}, penalty:{rep:-5}},
  {id:'no_abandono',  label:'Temporada sin abandonos colectivos',
   desc:'Ningún corredor del club abandona este año.',
   check:(d)=>!(d.seasonResults||[]).some(r=>r.dnf),
   reward:{rep:8,cohesion:10}, penalty:{rep:-3,cohesion:-5}},
  {id:'presupuesto',  label:'Cerrar la temporada en positivo',
   desc:'El presupuesto del club no baja de cero.',
   check:(d)=>d.presupuesto>0,
   reward:{rep:5,socios:3}, penalty:{rep:-8}},
];

const CLUB_LEVELS=[
  {id:'local',    label:'Club Local',    icon:'🏘️', sociosMin:0,   sociosMax:30,  presupuestoBase:800,  color:'#888',    repReq:0},
  {id:'regional', label:'Club Regional', icon:'🏔️', sociosMin:31,  sociosMax:100, presupuestoBase:2000, color:'#4a90d9', repReq:40},
  {id:'nacional', label:'Club Nacional', icon:'🏅', sociosMin:101, sociosMax:300, presupuestoBase:5000, color:'#2d7a2d', repReq:70},
  {id:'elite',    label:'Club Élite',    icon:'🌟', sociosMin:301, sociosMax:999, presupuestoBase:12000,color:'#c07a10', repReq:90},
];

// ── Incidentes de rivales (T32, v85) ───────────────────────────────────────
// Los rivales no resuelven eventos como el jugador: sufren incidentes con un
// delta de tiempo y una línea de narración. Deltas positivos = pierden tiempo.
// Los negativos existen para que el pelotón no sea solo un saco de penalización.
const RIVAL_INCIDENTS=[
  {id:'lost',   delta:[90,240], txt:n=>`${n} se ha despistado en una bifurcación`},
  {id:'fall',   delta:[60,150], txt:n=>`${n} se ha caído en la bajada`},
  {id:'cramp',  delta:[45,120], txt:n=>`${n} se para con calambres`},
  {id:'aid',    delta:[30,80],  txt:n=>`${n} pierde tiempo en el avituallamiento`},
  {id:'gear',   delta:[25,70],  txt:n=>`${n} se para a recolocarse el material`},
  {id:'help',   delta:[60,120], txt:n=>`${n} se para a ayudar a un corredor`},
  {id:'attack', delta:[-70,-25],txt:n=>`${n} ataca y abre hueco`},
  {id:'surge',  delta:[-50,-20],txt:n=>`${n} aprieta en la subida`},
];

// ── Fuerza del campo por tier de carrera de club (T21, v83) ────────────────
// Sustituye a la fórmula lineal antigua, en la que ganar en élite era
// aritméticamente imposible con el tope de perf en 98.
// mean = rendimiento del rival medio de ese tier.
// k    = dispersión del campo. Cuanto más bajo, más apretado está el nivel y
//        más hay que destacar para ganar.
const CLUB_TIER_FIELD={
  local:    {rivals:18,  mean:52, k:9},
  regional: {rivals:35,  mean:62, k:7},
  nacional: {rivals:70,  mean:70, k:5.5},
  elite:    {rivals:110, mean:78, k:4},
};

const CLUB_RACES=[
  // Locales — siempre disponibles
  {id:'clr1', name:'Trail Local de Primavera',  km:  21, month:4, cost:0,  tier:'local',    prize:300,  repReq:0,  sociosReq:0,  desc:'Carrera de club. Ambiente familiar.'},
  {id:'clr8', name:'Kilómetro Vertical Otoño',  km:  8,  month:11,cost:50, tier:'local',    prize:200,  repReq:0,  sociosReq:0,  desc:'Cierre de temporada. Corto pero letal.'},
  // Regionales — se desbloquean con rep ≥15
  {id:'clr2', name:'Circuito Vasco Trail',      km:  28, month:5, cost:80, tier:'regional', prize:600,  repReq:15, sociosReq:0,  desc:'Circuito con varios clubes del norte.'},
  {id:'clr3', name:'Vertical del Gorbea',       km:  12, month:6, cost:60, tier:'regional', prize:400,  repReq:15, sociosReq:0,  desc:'Vertical de referencia. Sube sin parar.'},
  {id:'clr5', name:'Vuelta al Txindoki',        km:  35, month:8, cost:90, tier:'regional', prize:700,  repReq:25, sociosReq:15, desc:'Clásica del Goierri. Mucho desnivel.'},
  {id:'clr6', name:'Copa de Clubes País Vasco', km:  42, month:9, cost:0,  tier:'regional', prize:800,  repReq:30, sociosReq:20, desc:'Puntos para el ranking de clubes regional.'},
  // Nacionales — se desbloquean con rep ≥45
  {id:'clr4', name:'Ultra Aralar',              km:  50, month:7, cost:120,tier:'nacional',  prize:1200, repReq:45, sociosReq:30, desc:'Ultra exigente. Solo los mejores del club.'},
  {id:'clr7', name:'Marathon de Montaña',       km:  44, month:10,cost:100,tier:'nacional',  prize:1500, repReq:45, sociosReq:30, desc:'Nacional. Clasifica para el ranking anual.'},
  // Élite — se desbloquean con rep ≥70
  {id:'clr9', name:'Campeonato Nacional de Trail',km:  60,month:6, cost:200,tier:'elite',    prize:3000, repReq:70, sociosReq:60, desc:'Lo más alto del trail nacional. Invitación por méritos.'},
  {id:'clr10',name:'Zegama-Aizkorri Open',      km:  42, month:5, cost:150,tier:'elite',    prize:2500, repReq:80, sociosReq:80, desc:'La carrera más mítica del País Vasco. Pocas plazas de club.'},
];

const CLUB_EVENTS=[
  {id:'cle1', title:'Un socio organiza un taller de nutrición para el club',
   options:[{text:'Apoyarlo públicamente — cohesión del club (+rep, +socios)',repDelta:8,sociosDelta:3},{text:'Dejarlo hacer sin implicarte',repDelta:0,sociosDelta:1}]},
  {id:'cle2', title:'El ayuntamiento os ofrece un espacio para entrenar gratuitamente',
   options:[{text:'Aceptar — base de entrenamiento del club (−€200 acondicionamiento, +rep)',repDelta:12,cost:200,sociosDelta:5},{text:'Rechazar — no tenéis recursos ahora',repDelta:-3}]},
  {id:'cle3', title:'Un corredor local con potencial os contacta para unirse al club',
   options:[{text:'Ficharlo — suma a la plantilla (−€100/mes salario)',repDelta:5,addRunner:true},{text:'No tenemos hueco ahora',repDelta:0}]},
  {id:'cle4', title:'Hay tensión entre dos corredores de la plantilla',
   options:[{text:'Mediar y resolver (+cohesión, +rep)',repDelta:10},{text:'Ignorarlo — que lo resuelvan solos',repDelta:-5,sociosDelta:-1}]},
  {id:'cle5', title:'Os invitan a participar en una carrera benéfica',
   options:[{text:'Mandar a dos corredores (+visibilidad, +socios)',repDelta:6,sociosDelta:4,cost:80},{text:'No podemos permitírnoslo este mes',repDelta:-2}]},
  {id:'cle6', title:'Un patrocinador local ofrece materiales a cambio de llevar su logo',
   options:[{text:'Aceptar — €300 en material gratis',repDelta:3,income:300},{text:'Prefiero mantener la imagen limpia',repDelta:2}]},
  {id:'cle7', title:'Una revista de trail quiere hacer un reportaje sobre el club',
   options:[{text:'Sí — visibilidad nacional (+rep, +socios)',repDelta:15,sociosDelta:8},{text:'Aún no estamos listos',repDelta:0}]},
  {id:'cle8', title:'Uno de tus corredores quiere irse a un club rival',
   options:[{text:'Ofrecerle una mejora salarial (+€50/mes) para retenerle',repDelta:5,salaryIncrease:true},{text:'Dejarle ir — el club no puede forzar a nadie',repDelta:-4,loseRunner:true}]},

  // ── C3: Eventos condicionales según estado del club ──────────────────────

  // Cohesión baja (< 35)
  {id:'cle_tension1', title:'Dos corredores de la plantilla han dejado de hablarse',
   minCohesion:0, maxCohesion:34,
   options:[
     {text:'Reunión de equipo urgente — encaras el conflicto (+cohesión, −€150)',repDelta:4,cohesionDelta:12,cost:150},
     {text:'Dejarles resolver el conflicto solos — puede empeorar',repDelta:0,cohesionDelta:-5},
   ]},
  {id:'cle_tension2', title:'El ambiente en los entrenos es muy malo. Nadie habla.',
   minCohesion:0, maxCohesion:34,
   options:[
     {text:'Organizar una salida de equipo (−€200, +cohesión, +rep)',repDelta:6,cohesionDelta:15,cost:200},
     {text:'Ignorarlo — el rendimiento es lo primero',repDelta:-2,cohesionDelta:-3},
   ]},
  {id:'cle_tension3', title:'Un corredor amenaza con no presentarse a la siguiente carrera por el mal ambiente',
   minCohesion:0, maxCohesion:30,
   options:[
     {text:'Hablar con él personalmente (+confianza, +cohesión)',repDelta:5,cohesionDelta:10},
     {text:'Decirle que es su responsabilidad presentarse',repDelta:-3,cohesionDelta:-4,loseRunner:true},
   ]},

  // Cohesión alta (> 70)
  {id:'cle_buena1', title:'El buen ambiente del club ha llegado a oídos de un talento local',
   minCohesion:70,
   options:[
     {text:'Invitarle a entrenar con vosotros — posible fichaje',repDelta:8,addRunner:true},
     {text:'No tenemos hueco ahora mismo',repDelta:0},
   ]},
  {id:'cle_buena2', title:'Un medio deportivo quiere hacer un reportaje sobre vuestra cohesión de equipo',
   minCohesion:70,
   options:[
     {text:'Aceptar — visibilidad enorme (+rep, +socios)',repDelta:18,sociosDelta:10},
     {text:'Preferimos pasar desapercibidos',repDelta:0},
   ]},

  // Reputación alta (> 50) — oportunidades de nivel superior
  {id:'cle_rep1', title:'Una federación regional os invita a un circuito de élite el próximo año',
   minRep:50,
   options:[
     {text:'Aceptar — compromiso de participar (−€300 inscripción, +rep)',repDelta:14,cost:300},
     {text:'No estamos preparados aún',repDelta:-2},
   ]},
  {id:'cle_rep2', title:'Una empresa tecnológica quiere patrocinaros por vuestra imagen de club serio',
   minRep:55,
   options:[
     {text:'Firmar el acuerdo (€600/año, compromiso de imagen)',repDelta:8,income:600},
     {text:'Preferimos mantener nuestra independencia',repDelta:2},
   ]},

  // Presupuesto bajo (< 500)
  {id:'cle_crisis1', title:'El club no llega a fin de mes. Hay que tomar decisiones difíciles.',
   maxPresupuesto:500,
   options:[
     {text:'Organizar una carrera popular para recaudar fondos (+€800, tiempo de prep)',repDelta:5,income:800,sociosDelta:3},
     {text:'Pedir ayuda al ayuntamiento (trámite lento, +€400)',repDelta:2,income:400},
     {text:'Reducir el salario del staff temporalmente',repDelta:-5,cohesionDelta:-4},
   ]},
  {id:'cle_crisis2', title:'Un patrocinador amenaza con retirarse si los resultados no mejoran',
   maxPresupuesto:600,
   options:[
     {text:'Negociar un plazo — comprometerse a resultados',repDelta:0,cohesionDelta:-2},
     {text:'Dejarle ir y buscar otro — más libertad, menos ingresos',repDelta:-3,income:-300},
   ]},
];
// Clona el esquema completo de una carrera real de RACES_DB (segs, km, desnivel,
// weather_risk, tier, etc.) para evitar mantener a mano un segundo dataset de
// tramos que pueda desincronizarse del esquema real (CR-07).
const EXCLUSIVE_CLUB_RACE=(()=>{
  // T139 (v91): si el id desaparece de RACES_DB, el spread de un undefined dejaba
  // la carrera exclusiva sin tramos, sin km y sin desnivel, y el fallo solo se veía
  // al entrar en ella. Mejor que se note al cargar.
  const template=RACES_DB.find(r=>r.id==='julio'); // Maratón Alpino Madrileño, 42K nacional
  if(!template)console.error('EXCLUSIVE_CLUB_RACE: no existe la carrera plantilla "julio" en RACES_DB');
  return {
    ...template,
    id:'copa_clubes',
    name:'Copa de Clubes Trail',
    type:'42K exclusiva',
    desc:'Carrera exclusiva para miembros con alta reputación en su club. Rivales top, sin inscripción.',
    month:9,monthName:'Septiembre',quarter:3,
    cost:0,prize:300,reqRanking:999,
    isExclusive:true,
  };
})();
const TRAINING_EVENTS_POOL=[
  {id:'revelation', prob:0.12, type:'good',
   title:'Algo hace clic',
   desc:'Llevas semanas martillando el mismo estímulo y de repente el cuerpo responde de otra manera.',
   effMult:1.4, icon:'⚡'},
  {id:'plateau',    prob:0.14, type:'bad',
   title:'Estancamiento',
   desc:'Mismo estímulo, mismo plateau. El cuerpo ya no responde igual a este bloque.',
   effMult:0.6, icon:'📉'},
  {id:'group_run',  prob:0.15, type:'good',
   title:'Entreno en grupo improvisado',
   desc:'Te cruzas con tres corredores locales y entrenáis juntos. La competitividad saca algo extra.',
   effMult:1.3, icon:'👥'},
  {id:'veteran',    prob:0.10, type:'good',
   title:'Consejo de un veterano',
   desc:'En la tirada larga te cruzas con un corredor experimentado. Entrena una hora contigo y te da un truco clave.',
   statBonus:{bajada:2}, icon:'🧓', effMult:1.0},
  {id:'heat_week',  prob:0.10, type:'bad',
   title:'Semana de calor extremo',
   desc:'Las temperaturas se disparan. Entrenas igual pero el rendimiento cae.',
   effMult:0.7, icon:'🌡'},
  {id:'minor_tweak',prob:0.10, type:'bad',
   title:'Molestia en el entreno',
   desc:'Te haces daño leve en una serie. Decides parar dos días. Carga baja pero el bloque rinde menos.',
   effMult:0.8, loadMod:-6, icon:'🩹'},
  {id:'flow_state', prob:0.09, type:'good',
   title:'Semana de flujo',
   desc:'Todo sale bien esta semana. Las piernas responden, la cabeza está limpia. El bloque rinde al máximo.',
   effMult:1.25, icon:'🌊'},
  {id:'illness',    prob:0.08, type:'bad',
   title:'Virus pasajero',
   desc:'Un resfriado a mitad del bloque te corta el ritmo. Dos días en cama, el resto recuperándote.',
   effMult:0.5, icon:'🤧'},
  {id:'gear_test',  prob:0.07, type:'good',
   title:'Test de material nuevo',
   desc:'Una marca te manda unas zapatillas de prueba. No te comprometes a nada pero el material ayuda hoy.',
   statBonus:{velocidad:1,bajada:1}, effMult:1.0, icon:'👟'},
  {id:'bad_weather_week',prob:0.05,type:'bad',
   title:'Semana de lluvia continua',
   desc:'Llueve sin parar. Entrenar en barro constante no es lo mismo que en condiciones normales.',
   effMult:0.75, icon:'🌧'},
];

// ══════════════════════════════════════
//  EVENTOS ECONÓMICOS MENSUALES
// ══════════════════════════════════════
const MONTHLY_EVENTS_POOL=[
  {id:'surplus',  title:'Te han sobrado €50 este mes',  options:[
    {text:'Ahorrar',                effect:'save',     value:50},
    {text:'Calcetines técnicos',    effect:'gear',     value:-30, statBonus:{bajada:1}},
    {text:'Sesión de masajista',    effect:'massage',  value:-40, loadRedux:8},
    {text:'Caja de geles extra',    effect:'gels',     value:-25, statBonus:{nutricion:1}},
  ]},
  {id:'bonus',    title:'Premio inesperado de una carrera antigua (+€80)', options:[
    {text:'Ahorrar',                effect:'save',     value:80},
    {text:'Inscripción extra',      effect:'race',     value:-60, unlockRace:true},
    {text:'Semana de entrenamiento en altitud', effect:'altitude', value:-80, statBonus:{subida:2,resistencia:1}},
  ]},
  {id:'expense',  title:'Rotura de material — tienes que reponer', options:[
    {text:'Material básico (€30)',   effect:'basic',   value:-30},
    {text:'Material técnico (€80)', effect:'tech',    value:-80, statBonus:{velocidad:1}},
  ]},

  // ── 10 NUEVOS EVENTOS ──────────────────────────────────────
  {id:'rival_run', title:'Te cruzas con un rival conocido entrenando en el monte', options:[
    {text:'Salir a correr juntos — te exige más (+subida, +carga)', value:0, statBonus:{subida:2}, loadAdd:6},
    {text:'Charlar un rato y seguir tu plan (+mental)',              value:0, statBonus:{mental:2}},
    {text:'Ignorarle. Foco en lo tuyo',                             value:0},
  ]},
  {id:'bad_weather', title:'Semana de temporal — imposible salir al monte', options:[
    {text:'Gym de montaña (€30 · mantienes base)',    value:-30, statBonus:{resistencia:1}},
    {text:'Descanso forzado — te recuperas bien',     value:0,   loadRedux:14},
    {text:'Salir bajo la lluvia (resistencia, pero pierdes motivación)', value:0, statBonus:{resistencia:2,mental:-2}},
  ]},
  {id:'local_media', title:'Un medio local quiere entrevistarte sobre el trail', options:[
    {text:'Dar la entrevista (+mental, +visibilidad)', value:0, statBonus:{mental:3}},
    {text:'Declinar — te quedas entrenando',           value:0, statBonus:{velocidad:1}},
  ]},
  {id:'friend_race', title:'Un amigo te arrastra a una popular del pueblo el domingo', options:[
    {text:'¡Vamos! Competir sin presión (+velocidad, +carga)',  value:-15, statBonus:{velocidad:2}, loadAdd:8},
    {text:'Solo como espectador y a animar',                    value:0,   statBonus:{mental:2}},
    {text:'Paso — respeto el plan',                             value:0},
  ]},
  {id:'volunteer',  title:'El club necesita voluntarios para una carrera local', options:[
    {text:'Echar una mano — gran ambiente (+mental)',  value:0, statBonus:{mental:4}},
    {text:'No puedo este fin de semana',               value:0},
  ]},
  {id:'medical_check', title:'La federación te pide una revisión médica', options:[
    {text:'Básica — gratis, todo en orden',                                  value:0},
    {text:'Completa (€60 · detectan sobrecarga, carga -15)',                 value:-60, loadRedux:15},
  ]},
  {id:'training_camp', title:'Campo de entrenamiento en los Pirineos — plazas limitadas', options:[
    {text:'Apuntarse (€110 · semana en altitud)',   value:-110, statBonus:{subida:4,resistencia:2}},
    {text:'Demasiado caro este mes',                value:0},
  ]},
  {id:'gear_deal', title:'Flash sale de material técnico — 48 horas', options:[
    {text:'Zapatillas de montaña (€40)',              value:-40,  statBonus:{bajada:1}},
    {text:'Mochila hidratación técnica (€55)',        value:-55,  statBonus:{resistencia:1,nutricion:1}},
    {text:'Paso — no lo necesito ahora',             value:0},
  ]},
  {id:'strained_ankle', title:'Tobillo cargado al bajar por el canal', options:[
    {text:'Reposo inmediato — vale la pena (carga -10)',           value:0, loadRedux:10},
    {text:'Seguir entrenando con precaución (+carga, +riesgo)',    value:0, loadAdd:8},
  ]},
  {id:'podium_party', title:'Celebración en el club — un compañero subió al podio', options:[
    {text:'¡A celebrar! (+mental, algo más de carga)',  value:0, statBonus:{mental:3}, loadAdd:5},
    {text:'Me quedo en casa descansando (carga -5)',    value:0, loadRedux:5},
  ]},
  // ── Eventos extra positivos ──
  {id:'old_friend', title:'Te encuentras con un antiguo compañero de club', options:[
    {text:'Salir a correr juntos como antes (+mental, +velocidad)', value:0, statBonus:{mental:3,velocidad:1}, loadAdd:6},
    {text:'Tomar algo y ponerse al día (+mental sin carga extra)',   value:0, statBonus:{mental:4}},
  ]},
  {id:'local_win', title:'Ganas la popular del pueblo sin ni haberla planificado', options:[
    {text:'Aceptar el trofeo y la camiseta (+mental, +fama)',  value:10, statBonus:{mental:3}},
    {text:'Cederlo al segundo — gesto bonito (+mental extra)', value:0,  statBonus:{mental:5}},
  ]},
  {id:'trail_doc', title:'Un canal de trail quiere grabarte en tu entrenamiento', options:[
    {text:'Aceptar — buena visibilidad (+fama)',   value:0, statBonus:{mental:2}},
    {text:'Pasar — no quieres distracciones',      value:0},
  ]},
  {id:'good_sleep', title:'Una semana de descanso activo — el cuerpo responde bien', options:[
    {text:'Aprovechar la recuperación (carga -12)',       value:0, loadRedux:12},
    {text:'Meter una sesión extra (+velocidad, +carga)',  value:0, statBonus:{velocidad:2}, loadAdd:8},
  ]},
  {id:'club_sponsor', title:'El club consigue un pequeño patrocinador y hay dinero extra', options:[
    {text:'Recibir tu parte: +€40',             value:40},
    {text:'Donarlo al fondo de material (+mental)', value:0, statBonus:{mental:3}},
  ]},
  {id:'mountain_hike', title:'Fin de semana de senderismo con la familia — sin competir', options:[
    {text:'Desconectar del todo (+mental, carga -8)',            value:0, statBonus:{mental:5}, loadRedux:8},
    {text:'Aprovechar para reconocer un tramo de próxima carrera', value:0, statBonus:{bajada:1,subida:1}},
  ]},
  {id:'physio_advice', title:'Tu fisio te da un consejo específico esta semana', options:[
    {text:'Aplicarlo al entrenamiento (carga -10, +resistencia)', value:0, statBonus:{resistencia:1}, loadRedux:10},
    {text:'Pedirle que te haga una sesión completa (€35, carga -18)', value:-35, loadRedux:18},
  ]},
  {id:'challenge_accepted', title:'Un seguidor te desafía a batir un récord de segmento', options:[
    {text:'Aceptar el reto (+velocidad, +carga, +seguidores)',   value:0, statBonus:{velocidad:2}, loadAdd:10},
    {text:'Ignorarlo — no merece la pena cargar extra',          value:0},
  ]},
  // ── Eventos de club con reputación ──
  {id:'club_president',  title:'El presidente del club quiere que corras el campeonato regional', requiresClub:true, options:[
    {text:'Aceptar — el club lo necesita (+reputación, carrera extra)',  value:0, statBonus:{mental:2}, clubRepDelta:12, addChampionship:true},
    {text:'Declinar — no encaja en mi plan (-reputación)',               value:0, clubRepDelta:-8},
  ]},
  {id:'companion_advice', title:'Tu compañero de club te pide consejo antes de su primera ultra', requiresClub:true, options:[
    {text:'Dedicarle una tarde entera — le sale bien (+mental, +reputación)', value:0, statBonus:{mental:4}, clubRepDelta:10},
    {text:'Un consejo rápido por WhatsApp — algo es algo (+rep leve)',        value:0, statBonus:{mental:2}, clubRepDelta:4},
    {text:'No tengo tiempo ahora mismo',                                      value:0, clubRepDelta:-3},
  ]},
  {id:'club_gear_discount', title:'El club negocia un descuento en material para sus miembros', requiresClub:true, options:[
    {text:'Aprovechar el descuento — zapatillas nuevas (€25, +bajada, +rep)', value:-25, statBonus:{bajada:2}, clubRepDelta:5},
    {text:'Pasar — el material que tengo va bien',                            value:0},
  ]},
  {id:'club_conflict', title:'Tensión en el club — dos miembros discuten y te piden que medie', requiresClub:true, options:[
    {text:'Mediar con calma — se resuelve bien (+rep, +mental)',   value:0, statBonus:{mental:3}, clubRepDelta:12},
    {text:'Mantenerse al margen — no es tu pelea',                value:0, clubRepDelta:-2},
    {text:'Tomar partido — resuelves rápido pero hay bando perdedor', value:0, clubRepDelta:-6},
  ]},
  {id:'companion_race', title:'Tu compañero de club corre su primera carrera contigo este fin de semana', requiresClub:true, options:[
    {text:'Correr a su ritmo los primeros km (+mental, +rep)',     value:0, statBonus:{mental:5}, clubRepDelta:8, loadAdd:4},
    {text:'Salir a tu ritmo — cada uno a lo suyo',                value:0},
  ]},
  {id:'club_training_camp', title:'El club organiza un campo de entrenamiento en la sierra — plazas para todos', requiresClub:true, options:[
    {text:'Apuntarse — una semana con el grupo (+subida, +mental, +rep, +carga)', value:-30, statBonus:{subida:3,mental:4}, clubRepDelta:10, loadAdd:12},
    {text:'Unirse solo el fin de semana (+rep leve, menos carga)',                value:-10, statBonus:{mental:2}, clubRepDelta:5, loadAdd:5},
    {text:'Esta vez no puedo',                                                    value:0, clubRepDelta:-2},
  ]},
  // ── Eventos de trabajo (2b) ──────────
  {id:'work_audit', title:'Semana de auditoría en el trabajo — ritmo frenético', requiresWork:true, options:[
    {text:'Afrontarlo — agotado, entrenamientos menos efectivos (carga +15)',  value:0, loadAdd:15},
    {text:'Pedir días de asuntos propios — pierdes €20 pero mantienes el ritmo', value:-20},
  ]},
  {id:'work_overtime', title:'Tu jefe te ofrece horas extra este mes', requiresWork:true, options:[
    {text:'Aceptar (+€40, pero el cuerpo llega cargado al entreno, carga +18)', value:40, loadAdd:18},
    {text:'Rechazar — respeta tu plan de entrenamiento', value:0},
  ]},
  {id:'work_congrats', title:'Tu empresa celebra un trimestre récord — bonus sorpresa', requiresWork:true, options:[
    {text:'Disfrutar el reconocimiento (+€30)', value:30},
    {text:'Invertirlo en material técnico (+€10 · +bajada)', value:10, statBonus:{bajada:1}},
  ]},
];

const PRE_RACE_NUTRITION=[
  {id:'pasta',    label:'Pasta / arroz',          energyBonus:8,  reqYear:1, cost:5,
   desc:'Clásico de corredor. Buena base de carbohidratos. €5 en el restaurante del hotel.'},
  {id:'ayuno',    label:'Ayuno pre-carrera',       energyBonus:-5, reqYear:1, cost:0,
   desc:'Sin desayuno. Energía inicial baja (−5) pero el cuerpo activa la quema de grasas — el gasto de energía en carrera se reduce un 10%. Atención: correr en ayunas aumenta la sed un 8%.'},
  {id:'nada',     label:'Sin planificar',          energyBonus:0,  reqYear:1, cost:0,
   desc:'Sin preparación específica. Sin bonus ni penalización.'},
  {id:'pro',      label:'Protocolo pro',           energyBonus:15, reqYear:3, cost:0,
   desc:'Cena + desayuno específico. Máxima energía inicial. El exceso sobre 100% sube hasta 110%.',
   reqNutSponsor:false,
   yearCosts:{3:15, 4:20, 5:25, 6:30},
   yearReqs:{4:'nutSponsor', 5:'nutSponsorTop10', 6:'nutSponsorRanking50'}},
];

const DROPBAG_OPTIONS=[
  {id:'geles',   label:'Geles extra (x3)',    desc:'+25 energía en el avituallamiento designado', effect:'energy', value:25, cost:15},
  {id:'agua',    label:'Bidón extra',         desc:'+30 hidratación en el avituallamiento',        effect:'hydration', value:30, cost:0},
  {id:'ropa',    label:'Chaqueta/ropa abrigo',desc:'Protección si empeora el tiempo',               effect:'weather', value:0, cost:0},
  {id:'zapatillas',label:'Zapatillas de cambio',desc:'Piernas -10% desgaste en segunda mitad',     effect:'legs', value:10, cost:0},
  {id:'comida',  label:'Comida real sólida',  desc:'+40 energía pero +60 seg en el avituallamiento',effect:'energy_slow', value:40, cost:0},
];
// T46 (v88): 999 era un centinela sin nombre — "resto de temporada", no 999
// carreras. Se lee en race.js (aplicación de lesión y descuento de fisio) y en
// devmode.js. Cualquier lógica que compare injuryRacesLeft debe contemplarlo.
const INJURY_BLOCK_SEASON=999;
const INJURY_TYPES={
  tendinitis:{
    label:'Tendinitis',
    desc:'Inflamación en el tendón. Puedes correr pero con penalización seria.',
    statPenalty:{bajada:-5,velocidad:-2},
    canRace:true,
    racesBlocked:0,
    nextRaceStats:{energy:75,legs:65,hydration:80},
    fisioDiscount:0.5,
  },
  rotura:{
    label:'Rotura de fibras',
    desc:'Rotura muscular grave. No puedes correr las próximas 2 carreras.',
    statPenalty:{velocidad:-6,resistencia:-4,mental:-2},
    canRace:false,
    racesBlocked:2,
    nextRaceStats:{energy:55,legs:45,hydration:70},
    fisioDiscount:0.4,
  },
  fractura:{
    label:'Fractura de estrés',
    desc:'Lesión muy grave. La temporada puede estar comprometida.',
    statPenalty:{resistencia:-9,subida:-5,mental:-4,velocidad:-3},
    canRace:false,
    racesBlocked:INJURY_BLOCK_SEASON, // T46 (v88): centinela = resto de temporada, no 999 carreras
    nextRaceStats:{energy:40,legs:30,hydration:60},
    fisioDiscount:0.3,
  },
};

// ══════════════════════════════════════
const SCREENS_WITH_TABS=['seasonStart','calendar','sponsors','training','betweenRace','seasonBalance','betweenManage','preRace','preRacePrep','segment','aid','raceResult','expresSeasonStart','expresCalendar','expresSponsors','expresPrep','expresPreRacePrep','expresSeasonBalance','coachHome','coachTraining','coachCalendar','coachTrainingReaction','coachEvent','coachPreRace','coachSponsors','clubSetup','canicrossHub','canicrossSeasonBalance'];
const RACE_SCREENS=['preRace','segment','aid','raceResult','midRaceEvent'];

// ── CANICROSS ──────────────────────────────────────────
// Rediseño de Canicross, paso 2 (TG-Diseno-Canicross § 4.12): perfiles FIJOS escritos a mano,
// una identidad por carrera que se puede aprender (antes cnGenerateSegs() los generaba en cada
// salida, todos con la misma secuencia). `month` es el mes del calendario (10…3), como antes;
// el diseño usaba el índice 0-5, que es CN_MONTHS.indexOf(month). Nuevos y aún sin usar:
// `refPace` (s/km del trazado, paso 3), `tempBase` (°C, paso 5) y `surface` por tramo
// (pista · tierra · piedra · hierba · barro · nieve; pasos 5 y 8 del diseño).
const CN_MONTHS=[10,11,12,1,2,3];
const CN_MONTH_NAMES={10:'Octubre',11:'Noviembre',12:'Diciembre',1:'Enero',2:'Febrero',3:'Marzo'};
const CANICROSS_RACES=[
  {id:'cn_otono',      name:'Popular de Otoño',               location:'Navarra',   km:6,  month:10, monthName:'Octubre',   tier:1, prize:100, cost:15, refPace:228, tempBase:13,
    segs:[{km:1.5,type:'flat',gain:5,surface:'pista',name:'Salida entre hayas'},{km:1.6,type:'climb',gain:70,surface:'tierra',name:'Cuesta del hayedo'},
          {km:1.4,type:'descent',gain:-60,surface:'hierba',name:'Prado de bajada'},{km:1.5,type:'flat',gain:-15,surface:'pista',name:'Recta del molino'}]},
  {id:'cn_bienvenida', name:'Canicross de Bienvenida',        location:'Asturias',  km:7,  month:10, monthName:'Octubre',   tier:1, prize:120, cost:20, refPace:232, tempBase:12,
    segs:[{km:1.8,type:'flat',gain:10,surface:'tierra',name:'Senda del río'},{km:1.5,type:'climb',gain:85,surface:'barro',name:'Repecho embarrado'},
          {km:1.2,type:'flat',gain:5,surface:'hierba',name:'Campa de las vacas'},{km:1.2,type:'descent',gain:-80,surface:'tierra',name:'Bajada del castañar'},
          {km:1.3,type:'flat',gain:-20,surface:'pista',name:'Meta en el pueblo'}]},
  {id:'cn_forestal',   name:'Trofeo Forestal',                location:'Soria',     km:8,  month:11, monthName:'Noviembre', tier:1, prize:140, cost:20, refPace:226, tempBase:7,
    segs:[{km:2.0,type:'flat',gain:5,surface:'pista',name:'Pista del pinar'},{km:1.6,type:'climb',gain:70,surface:'tierra',name:'Subida de las setas'},
          {km:1.8,type:'flat',gain:10,surface:'tierra',name:'Cortafuegos'},{km:1.4,type:'descent',gain:-65,surface:'piedra',name:'Pedregal'},
          {km:1.2,type:'flat',gain:-20,surface:'pista',name:'Recta del aserradero'}]},
  {id:'cn_nocturna',   name:'Nocturna de Linternas',          location:'Cantabria', km:9,  month:11, monthName:'Noviembre', tier:2, prize:200, cost:30, refPace:240, tempBase:6,
    segs:[{km:1.6,type:'flat',gain:0,surface:'pista',name:'Salida con frontales'},{km:2.0,type:'climb',gain:120,surface:'tierra',name:'Subida a oscuras'},
          {km:1.5,type:'flat',gain:10,surface:'hierba',name:'Collado de las linternas'},{km:2.1,type:'descent',gain:-110,surface:'barro',name:'Bajada resbaladiza'},
          {km:1.8,type:'flat',gain:-20,surface:'pista',name:'Recta iluminada'}]},
  {id:'cn_montseny',   name:'Canicross del Montseny',         location:'Cataluña',  km:7,  month:12, monthName:'Diciembre', tier:1, prize:130, cost:20, refPace:234, tempBase:4,
    segs:[{km:1.4,type:'flat',gain:5,surface:'tierra',name:'Salida del encinar'},{km:1.8,type:'climb',gain:95,surface:'piedra',name:'Subida de la riera'},
          {km:1.6,type:'descent',gain:-70,surface:'tierra',name:'Bajada del castañar'},{km:2.2,type:'flat',gain:-30,surface:'pista',name:'Pista de vuelta'}]},
  {id:'cn_tramuntana', name:'Canicross Serra de Tramuntana',  location:'Mallorca',  km:10, month:12, monthName:'Diciembre', tier:2, prize:220, cost:35, refPace:244, tempBase:10,
    segs:[{km:1.8,type:'flat',gain:10,surface:'pista',name:'Salida del olivar'},{km:2.2,type:'climb',gain:150,surface:'piedra',name:'Camí de pedra en sec'},
          {km:1.6,type:'flat',gain:10,surface:'piedra',name:'Bancales'},{km:2.0,type:'descent',gain:-130,surface:'piedra',name:'Bajada de la costera'},
          {km:2.4,type:'flat',gain:-40,surface:'tierra',name:'Recta del torrente'}]},
  {id:'cn_guadarrama', name:'Canicross Guadarrama',           location:'Madrid',    km:8,  month:1,  monthName:'Enero',     tier:1, prize:150, cost:25, refPace:236, tempBase:2,
    segs:[{km:1.6,type:'flat',gain:0,surface:'pista',name:'Salida por la pista'},{km:1.8,type:'climb',gain:95,surface:'tierra',name:'Repecho de la Pedriza'},
          {km:1.4,type:'flat',gain:10,surface:'tierra',name:'Llano del pinar'},{km:1.7,type:'descent',gain:-80,surface:'piedra',name:'Bajada suelta'},
          {km:1.5,type:'flat',gain:-25,surface:'pista',name:'Recta de meta'}]},
  {id:'cn_volcanic',   name:'Canicross Volcànic',             location:'Cataluña',  km:7,  month:1,  monthName:'Enero',     tier:1, prize:120, cost:20, refPace:230, tempBase:4,
    segs:[{km:1.5,type:'flat',gain:5,surface:'tierra',name:'Fageda d’en Jordà'},{km:1.4,type:'climb',gain:80,surface:'tierra',name:'Cráter del Croscat'},
          {km:1.3,type:'descent',gain:-70,surface:'tierra',name:'Bajada de greda'},{km:2.8,type:'flat',gain:-15,surface:'pista',name:'Vuelta por los campos'}]},
  {id:'cn_moncayo',    name:'Canicross Moncayo',              location:'Zaragoza',  km:9,  month:2,  monthName:'Febrero',   tier:2, prize:200, cost:30, refPace:246, tempBase:1,
    segs:[{km:1.5,type:'flat',gain:10,surface:'pista',name:'Salida del santuario'},{km:2.2,type:'climb',gain:160,surface:'nieve',name:'Subida con nieve'},
          {km:1.4,type:'flat',gain:10,surface:'nieve',name:'Hayedo blanco'},{km:2.0,type:'descent',gain:-140,surface:'piedra',name:'Bajada de las canales'},
          {km:1.9,type:'flat',gain:-40,surface:'tierra',name:'Recta del agua'}]},
  {id:'cn_copa',       name:'Copa de España Canicross',       location:'Itinerante',km:10, month:2,  monthName:'Febrero',   tier:3, prize:400, cost:50, refPace:238, tempBase:5,
    segs:[{km:2.0,type:'flat',gain:5,surface:'pista',name:'Salida rápida'},{km:1.8,type:'climb',gain:110,surface:'tierra',name:'Muro de la Copa'},
          {km:2.2,type:'flat',gain:10,surface:'hierba',name:'Circuito de praderas'},{km:1.8,type:'descent',gain:-100,surface:'tierra',name:'Bajada técnica'},
          {km:2.2,type:'flat',gain:-25,surface:'pista',name:'Sprint final'}]},
  {id:'cn_benasque',   name:'Canicross Valle de Benasque',    location:'Huesca',    km:12, month:3,  monthName:'Marzo',     tier:3, prize:300, cost:40, refPace:252, tempBase:3,
    segs:[{km:2.0,type:'flat',gain:10,surface:'pista',name:'Salida del valle'},{km:2.4,type:'climb',gain:180,surface:'nieve',name:'Subida a la cabaña'},
          {km:2.0,type:'flat',gain:15,surface:'nieve',name:'Llano helado'},{km:2.2,type:'descent',gain:-170,surface:'piedra',name:'Bajada de la morrena'},
          {km:1.6,type:'climb',gain:60,surface:'tierra',name:'Último repecho'},{km:1.8,type:'flat',gain:-50,surface:'pista',name:'Recta del Ésera'}]},
  {id:'cn_campeonato', name:'Campeonato de España Canicross', location:'Itinerante',km:12, month:3,  monthName:'Marzo',     tier:4, prize:600, cost:60, refPace:242, tempBase:8,
    segs:[{km:2.2,type:'flat',gain:5,surface:'pista',name:'Salida del campeonato'},{km:2.0,type:'climb',gain:120,surface:'tierra',name:'Primera subida'},
          {km:1.8,type:'descent',gain:-90,surface:'piedra',name:'Bajada rota'},{km:2.2,type:'flat',gain:10,surface:'hierba',name:'Pradera central'},
          {km:1.8,type:'climb',gain:95,surface:'barro',name:'Repecho del barro'},{km:2.0,type:'descent',gain:-140,surface:'pista',name:'Bajada a meta'}]},
];

// Rediseño de Canicross, paso 3 (TG-Diseno-Canicross § 4.7 y § 5.2). Equipos rivales que
// PERSISTEN: mismo nombre, misma edad y su nivel evoluciona entre temporadas (G.cnRivals).
// Personas inventadas (v99: nada de personas reales). `level` en la escala absoluta 0-100,
// la misma que cnTeamLevel() del jugador. `style`: salidor · remontador · tecnico · regular.
const CN_RIVAL_TEAMS=[
  {id:'r_aguirre',  human:'Elena Aguirre',     dog:'Nala',   breed:'malinois', level:58, style:'remontador', age:34, dogAge:4, tiers:[1,2,3]},
  {id:'r_lasa',     human:'Unai Lasa',         dog:'Txuri',  breed:'husky',    level:44, style:'regular',    age:27, dogAge:3, tiers:[1,2]},
  {id:'r_moreno',   human:'Carla Moreno',      dog:'Kira',   breed:'vizsla',   level:63, style:'salidor',    age:31, dogAge:5, tiers:[2,3,4]},
  {id:'r_benet',    human:'Pau Benet',         dog:'Llamp',  breed:'mestizo',  level:39, style:'tecnico',    age:45, dogAge:6, tiers:[1,2]},
  {id:'r_quiroga',  human:'Iria Quiroga',      dog:'Breixo', breed:'malinois', level:70, style:'regular',    age:29, dogAge:3, tiers:[3,4]},
  {id:'r_salcedo',  human:'Rubén Salcedo',     dog:'Draco',  breed:'husky',    level:52, style:'salidor',    age:38, dogAge:4, tiers:[1,2,3]},
  {id:'r_vidal',    human:'Marta Vidal',       dog:'Lola',   breed:'mestizo',  level:33, style:'regular',    age:52, dogAge:7, tiers:[1]},
  {id:'r_etxeberria',human:'Ander Etxeberria', dog:'Beltza', breed:'malinois', level:76, style:'remontador', age:33, dogAge:4, tiers:[3,4]},
  {id:'r_navas',    human:'Lucía Navas',       dog:'Coco',   breed:'vizsla',   level:41, style:'tecnico',    age:24, dogAge:2, tiers:[1,2]},
  {id:'r_robles',   human:'Diego Robles',      dog:'Rayo',   breed:'husky',    level:48, style:'remontador', age:41, dogAge:5, tiers:[1,2]},
  {id:'r_ferrer',   human:'Noa Ferrer',        dog:'Koda',   breed:'malinois', level:66, style:'salidor',    age:28, dogAge:3, tiers:[2,3,4]},
  {id:'r_pallares', human:'Sergi Pallarès',    dog:'Nyx',    breed:'mestizo',  level:36, style:'regular',    age:57, dogAge:6, tiers:[1]},
  {id:'r_ortega',   human:'Sofía Ortega',      dog:'Hera',   breed:'vizsla',   level:55, style:'tecnico',    age:36, dogAge:4, tiers:[2,3]},
  {id:'r_garmendia',human:'Iker Garmendia',    dog:'Zeus',   breed:'husky',    level:61, style:'regular',    age:30, dogAge:5, tiers:[2,3]},
  {id:'r_castro',   human:'Andrea Castro',     dog:'Luna',   breed:'mestizo',  level:29, style:'salidor',    age:19, dogAge:2, tiers:[1]},
  {id:'r_mendez',   human:'Tomás Méndez',      dog:'Figo',   breed:'malinois', level:80, style:'regular',    age:35, dogAge:4, tiers:[4]},
  {id:'r_soler',    human:'Clara Soler',       dog:'Ares',   breed:'vizsla',   level:73, style:'remontador', age:42, dogAge:5, tiers:[3,4]},
  {id:'r_iglesias', human:'Hugo Iglesias',     dog:'Bolt',   breed:'husky',    level:46, style:'tecnico',    age:48, dogAge:4, tiers:[1,2]},
  {id:'r_arregui',  human:'Maite Arregui',     dog:'Itzal',  breed:'mestizo',  level:57, style:'regular',    age:44, dogAge:6, tiers:[2,3]},
  {id:'r_campos',   human:'Álex Campos',       dog:'Thor',   breed:'malinois', level:68, style:'tecnico',    age:26, dogAge:3, tiers:[3,4]},
  {id:'r_bravo',    human:'Rocío Bravo',       dog:'Kala',   breed:'husky',    level:50, style:'remontador', age:39, dogAge:5, tiers:[1,2,3]},
  {id:'r_lorente',  human:'Javier Lorente',    dog:'Max',    breed:'vizsla',   level:84, style:'salidor',    age:32, dogAge:4, tiers:[4]},
];
// Nivel de los rivales de relleno por tier (§ 5.2): media, desviación, rango y tamaño del campo.
const CN_TIER_LEVELS={
  1:{mean:38,sd:12,min:15,max:75,n:[8,12]},
  2:{mean:50,sd:11,min:25,max:85,n:[12,18]},
  3:{mean:62,sd:9, min:35,max:92,n:[18,26]},
  4:{mean:72,sd:7, min:45,max:97,n:[26,36]},
};
// Multiplicadores de tiempo por terreno y superficie (§ 5.2).
const CN_TERRAIN_MULT={climb:1.15,descent:0.88,flat:1.00};
const CN_SURFACE_MULT={pista:1.00,tierra:1.02,hierba:1.03,piedra:1.06,barro:1.12,nieve:1.09};

// Rediseño de Canicross, paso 4 (TG-Diseno-Canicross § 4.1-4.5): el perro no tiene barra,
// tiene gestos. Cada conducta es una frase SECA (el juego describe, el jugador concluye: nada
// de «parece», «está cansado», «quiere») y unas causas internas que la pueden producir; cada
// causa puede llevar su propio `wants`, que es lo que hace ambiguas a algunas frases.
// Claves de causa: mood, fatigue, temp ('>12', '<5'…), temperament, terrain, surface, tier,
// injury, rivalNear, mismatch, aid. `distraction:true` marca las que «Deja» puede cortar.
const CN_BEHAVIOURS=[
  // ── Antes de la salida (14) ──
  {id:'pre_tira_salida', when:'pre', wants:'apretar',  text:'[DOG] tira del arnés en la línea de salida y no aparta la vista del frente.', causes:[{mood:'>65'},{temperament:'competitivo'}]},
  {id:'pre_bosteza',     when:'pre', wants:'conservar',text:'[DOG] bosteza dos veces seguidas mientras esperáis.', causes:[{mood:'<40'},{fatigue:'>40'}]},
  {id:'pre_olfatea',     when:'pre', wants:'mantener', text:'[DOG] olfatea el suelo de la zona de salida, sin prisa.', causes:[{temperament:'olfateador'},{mood:'<60',fatigue:'<30'}]},
  {id:'pre_pegado',      when:'pre', wants:'conservar',text:'[DOG] se queda pegado a tu pierna y no se separa.', causes:[{temperament:'miedoso',tier:'>2'},{temperament:'pegajoso'}]},
  {id:'pre_ladra',       when:'pre', wants:'apretar',  text:'[DOG] ladra a los perros de al lado.', causes:[{temperament:'competitivo'},{temperament:'tirador'}]},
  {id:'pre_tiembla',     when:'pre', wants:'conservar',text:'[DOG] tiembla un poco y se sienta sobre tus pies.', causes:[{temperament:'friolero',temp:'<6'},{temp:'<1'}]},
  {id:'pre_jadea',       when:'pre', wants:'conservar',text:'[DOG] jadea antes de empezar, con la lengua fuera.', causes:[{temp:'>11'},{fatigue:'>60'}]},
  {id:'pre_cola_alta',   when:'pre', wants:'apretar',  text:'[DOG] lleva la cola alta y no para de moverse.', causes:[{mood:'>70'}]},
  {id:'pre_tumbado',     when:'pre', wants:'conservar',text:'[DOG] se tumba en cuanto os paráis un momento.', causes:[{fatigue:'>50'}]},
  {id:'pre_mira_cajon',  when:'pre', wants:'apretar',  text:'[DOG] mira fijo al equipo que tenéis delante en el cajón.', causes:[{temperament:'competitivo'},{mood:'>60',tier:'>2'}]},
  {id:'pre_tranquilo',   when:'pre', wants:'mantener', text:'[DOG] espera de pie, quieto, con las orejas hacia ti.', causes:[{mood:'>39',fatigue:'<40'}]},
  {id:'pre_lame_pata',   when:'pre', wants:'conservar',text:'[DOG] se lame una pata delantera.', causes:[{injury:true}]},
  {id:'pre_sacude',      when:'pre', wants:'mantener', text:'[DOG] se sacude entero, como quitándose algo de encima.', causes:[{mood:'>55',wants:'mantener'},{fatigue:'>35',wants:'conservar'}]},
  {id:'pre_estira',      when:'pre', wants:'mantener', text:'[DOG] se estira hacia delante y luego hacia atrás.', causes:[{fatigue:'<35'}]},
  // ── En el tramo (18) ──
  {id:'tira_sin_mirar',  when:'seg', wants:'apretar',  text:'[DOG] tira del arnés y mira al frente. No se gira.', causes:[{mood:'>70',fatigue:'<30'},{temperament:'competitivo'}]},
  {id:'linea_floja',     when:'seg', wants:'conservar',text:'[DOG] se queda medio metro por detrás. La línea va floja.', causes:[{fatigue:'>45'},{mood:'<35'}]},
  {id:'distraido_olor',  when:'seg', wants:'conservar',text:'[DOG] se distrae con el olor del monte y gira la cabeza.', distraction:true, causes:[{temperament:'olfateador'},{mood:'<45'}]},
  {id:'jadeo_ancho',     when:'seg', wants:'conservar',text:'[DOG] jadea con la boca muy abierta y la lengua ancha.', causes:[{temp:'>12'},{fatigue:'>60',terrain:'climb'}]},
  {id:'levanta_pata',    when:'seg', wants:'conservar',text:'[DOG] levanta una pata del suelo cuando os paráis un segundo.', causes:[{injury:true},{surface:'piedra',temperament:'tirador'}]},
  {id:'clavado',         when:'seg', wants:'mantener', text:'[DOG] va clavado a tu ritmo, ni delante ni detrás.', causes:[{mood:'>39',fatigue:'<45'}]},
  {id:'mira_reojo',      when:'seg', wants:'apretar',  text:'[DOG] mira de reojo al equipo que os adelanta.', causes:[{rivalNear:true},{temperament:'competitivo',mood:'>50'}]},
  {id:'sacude_arrancar', when:'seg', wants:'mantener', text:'[DOG] se sacude al empezar el tramo.', causes:[{mood:'>60',wants:'mantener'},{fatigue:'>40',wants:'conservar'}]},
  {id:'cuesta_tira',     when:'seg', wants:'apretar',  text:'En la cuesta, [DOG] baja la cabeza y tira con todo el cuerpo.', causes:[{terrain:'climb',mood:'>55'},{terrain:'climb',temperament:'tirador'}]},
  {id:'bajada_frena',    when:'seg', wants:'conservar',text:'En la bajada, [DOG] frena con las patas delanteras.', causes:[{terrain:'descent',temperament:'miedoso'},{terrain:'descent',fatigue:'>40'}]},
  {id:'bajada_suelto',   when:'seg', wants:'apretar',  text:'En la bajada, [DOG] se lanza y la línea se tensa de golpe.', causes:[{terrain:'descent',mood:'>60'}]},
  {id:'orejas_atras',    when:'seg', wants:'conservar',text:'[DOG] lleva las orejas hacia atrás y la cola baja.', causes:[{temperament:'miedoso',tier:'>2'},{mismatch:true,mood:'<50'}]},
  {id:'busca_mirada',    when:'seg', wants:'mantener', text:'[DOG] gira la cabeza para mirarte cada pocos pasos.', causes:[{mismatch:true},{temperament:'pegajoso'}]},
  {id:'trote_corto',     when:'seg', wants:'conservar',text:'[DOG] acorta el paso y cambia a un trote corto.', causes:[{fatigue:'>55'}]},
  {id:'zigzag',          when:'seg', wants:'mantener', text:'[DOG] va en zigzag de un lado al otro del camino.', distraction:true, causes:[{temperament:'olfateador'},{mood:'>80'}]},
  {id:'bebe_charco',     when:'seg', wants:'conservar',text:'[DOG] intenta beber de cada charco que pasa.', distraction:true, causes:[{temp:'>10'},{aid:true}]},
  {id:'acelera_solo',    when:'seg', wants:'apretar',  text:'[DOG] acelera solo al oír a otro perro detrás.', causes:[{rivalNear:true,mood:'>45'},{temperament:'competitivo'}]},
  {id:'nieve_salta',     when:'seg', wants:'mantener', text:'[DOG] da saltos en la nieve y muerde el suelo.', distraction:true, causes:[{surface:'nieve',mood:'>50'}]},
];
// Rasgos ocultos (§ 4.2): 1 o 2 por perro, nunca en una ficha; se descubren en el cuaderno.
const CN_TEMPERAMENTS=['cabezota','miedoso','olfateador','competitivo','tirador','pegajoso','estoico','friolero'];
// Seis comandos con dominio 0-3 (§ 4.5). `valida`: la intención que la orden hace suya.
const CN_COMMANDS=[
  {id:'forward', label:'Adelante',  desc:'Arrancar o atacar. Si sale bien, el tramo es un 4 % más rápido.', valida:'apretar'},
  {id:'hold',    label:'Aguanta',   desc:'Contener. Si sale bien, el tramo cansa un 30 % menos.',          valida:'mantener'},
  {id:'easy',    label:'Despacio',  desc:'Frenar al que tira demasiado. Si sale bien, +6 de sincronía.',    valida:'conservar'},
  {id:'left',    label:'Izquierda', desc:'Trazar en bajadas y curvas: un 6 % más rápido en la bajada.',     valida:null},
  {id:'leaveit', label:'Deja',      desc:'Ignorar una distracción sin perder tiempo.',                      valida:null},
  {id:'water',   label:'Agua',      desc:'Beber en el avituallamiento: −12 de fatiga.',                     valida:null},
];
// Las tres intenciones (§ 4.4). time: multiplicador del tramo; legs: piernas del corredor;
// fatigue: fatiga del perro en el tramo, antes de terreno y resistencia.
const CN_INTENTS=[
  {id:'conservar', label:'Conservar', desc:'Por debajo de vuestro ritmo.', time:1.10, legs:5,  fatigue:4},
  {id:'mantener',  label:'Mantener',  desc:'Vuestro ritmo.',               time:1.00, legs:10, fatigue:8},
  {id:'apretar',   label:'Apretar',   desc:'Por encima, gastando.',        time:0.92, legs:17, fatigue:14},
];

// Rediseño de Canicross, paso 5 (TG-Diseno-Canicross § 4.6 y § 4.8). Confort térmico por raza
// (°C) y sensibilidad por grado fuera de él; `friolero` lo desplaza +4.
const CN_COMFORT={
  husky:   {min:-12,max:6, heat:1.8,cold:1.0},
  malinois:{min:-6, max:14,heat:1.0,cold:1.0},
  vizsla:  {min:-2, max:16,heat:1.0,cold:1.6},
  mestizo: {min:-8, max:14,heat:1.0,cold:1.0},
};
const CN_WINTER_SHIFT={frio:-4,normal:0,suave:5};
const CN_WINTER_LABEL={frio:'Invierno frío',normal:'Invierno normal',suave:'Invierno suave'};
// Por encima de esta temperatura la organización suspende la prueba (regla de la federación).
const CN_HEAT_CANCEL=16;
// Salud cotidiana, separada de las lesiones. `text`: cómo lo ves (sin decir qué es).
// `days`: duración; `obed`: obediencia; `stamina`: resistencia efectiva; `mood`: ánimo al empezar.
const CN_CONDITIONS=[
  {id:'gastro',      name:'Gastroenteritis',       days:[3,6],  obed:-0.15, text:'[DOG] no ha tocado la comida.'},
  {id:'tos',         name:'Tos de las perreras',   days:[7,12], stamina:-25,text:'[DOG] tose seco al levantarse.'},
  {id:'almohadilla', name:'Almohadilla agrietada', days:[4,8],  injuryRisk:true, text:'[DOG] se lame la pata trasera cuando cree que no le miras.'},
  {id:'garrapata',   name:'Garrapata',             days:[1,2],  mood:-10,   text:'[DOG] se rasca el cuello contra el sofá.'},
  {id:'celo',        name:'Celo',                  days:[14,21],obed:-0.20, onlyFemale:true, text:'[DOG] está inquieta y marca en cada parada.'},
  {id:'decaimiento', name:'Decaimiento',           days:[2,5],  mood:-25,   text:'[DOG] no se ha levantado a recibirte.'},
];
// El tiempo por tramo: lo que cambia cuando llueve o nieva (temperatura y suelo).
const CN_WEATHER_LABEL={seco:'Seco',lluvia:'Lluvia',nieve:'Nieve'};

const CANICROSS_EQUIPMENT={
  dogHarness:[
    {id:'basic_harness', name:'Arnés Corto Básico',    price:35,  desc:'Equilibrado. Viene de inicio.',                     speedMod:0,  staminaMod:0,  default:true},
    {id:'freemotion_pro',name:'Freemotion Pro',         price:95,  desc:'+agilidad técnico, -potencia tracción',             speedMod:2,  staminaMod:-1},
    {id:'xback',         name:'X-Back Competición',    price:120, desc:'+velocidad llano, ideal larga distancia',           speedMod:5,  staminaMod:2},
  ],
  humanBelt:[
    {id:'basic_belt',    name:'Cinturón Simple',        price:25,  desc:'Viene de inicio.',                                  injuryRiskMod:0,   default:true},
    {id:'hip_harness',   name:'Arnés Cadera Completo',  price:140, desc:'-riesgo lesión lumbar, mejor control',              injuryRiskMod:-10},
  ],
  line:[
    {id:'soft_line',     name:'Línea Amortiguador Blando',price:30,desc:'Viene de inicio.',                                  jerkMod:0,  default:true},
    {id:'hard_line',     name:'Línea Amortiguador Duro',  price:55,desc:'Perros con mucha tracción, -tirones bruscos',       jerkMod:-5},
  ],
};

const CANICROSS_TRAINING_BLOCKS=[
  {id:'conjunto',     label:'Entrenamiento conjunto',  hours:5, runnerMod:{resistencia:2,velocidad:1},       dogMod:{speed:2,stamina:2},    bondMod:5,  desc:'Entrenas juntos. Sube vínculo.'},
  {id:'adiestramiento',label:'Adiestramiento',         hours:3, runnerMod:{},                                dogMod:{},                     bondMod:3,  desc:'Enseña comandos al perro (2 sesiones/comando). +3 vínculo.', teachCommand:true},
  {id:'tecnica',      label:'Técnica conjunta',        hours:4, runnerMod:{bajada:2,velocidad:1},            dogMod:{speed:1,stamina:1},    bondMod:4,  desc:'Sincronía en tramos técnicos.'},
  {id:'solo',         label:'Entreno corredor solo',   hours:4, runnerMod:{resistencia:3,velocidad:2,subida:2}, dogMod:{},                  bondMod:-2, desc:'Entrenas sin el perro. -2 vínculo (Malinois: -5 en total).'},
  {id:'descanso',     label:'Descanso activo juntos',  hours:2, runnerMod:{mental:2},                        dogMod:{health:3},             bondMod:3,  desc:'Paseo tranquilo. Descarga física y vínculo.'},
];
