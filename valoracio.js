/* NEXFORM · VALORACIÓ INICIAL (2026-11-18, CLIENTS_01)
   Substitueix la fitxa inicial per a clients nous: una pregunta per diapositiva, 7 blocs, en català o castellà.
   Desa a intake/inicial amb version:2 i els mateixos camps que llegeixen gen_initial_plan, gen_initial_diet i Atlas
   (sex, birth, cm, kg, goal, exp, days, minutes, place, trainTime, pal, injuries, medical, allergies, dislikes, meals, notes, parq, parqAlert),
   més lang i assessment {answers, level, suggestedDays, flags, objectives}.
   En enviar-la, el servidor crea la rutina i la pauta en ESBORRANY (programs/inicial status:"esborrany"):
   el client no les veu fins que l'entrenador les valida des de Resum (planDraftCard).
   Depèn de globals de coach.js i app.js: $, esc, db, S, QStore, IS_CLIENT, CV, intakeDoc, planDoc, todayISO, toast, render. */

/* ---------- textos en castellà (clau = text en català) ---------- */
const VAL_ES={
"Tu":"Tú","Salut":"Salud","Experiència":"Experiencia","Condició física":"Condición física","Dia a dia":"Día a día","Objectius":"Objetivos","Preferències":"Preferencias",
"No":"No","Sí":"Sí","No ho sé":"No lo sé","Prefereixo no dir-ho":"Prefiero no decirlo",
"Comencem per conèixer-te":"Empecemos por conocerte","Dades bàsiques per calcular-ho tot bé. Les preguntes que no siguin obligatòries les pots ometre.":"Datos básicos para calcularlo todo bien. Las preguntas que no sean obligatorias las puedes saltar.",
"Com et dius?":"¿Cómo te llamas?","Nom i cognom":"Nombre y apellido","Quan vas néixer?":"¿Cuándo naciste?","Sexe biològic":"Sexo biológico",
"Només el fem servir per a càlculs fisiològics i rangs de referència.":"Solo lo usamos para cálculos fisiológicos y rangos de referencia.","Dona":"Mujer","Home":"Hombre",
"Quant fas d'alçada?":"¿Cuánto mides?","Quant peses ara?":"¿Cuánto pesas ahora?",
"Si no ho saps exacte, posa-hi un aproximat. A partir de demà et pesaràs cada matí.":"Si no lo sabes exacto, pon un aproximado. A partir de mañana te pesarás cada mañana.",
"A què et dediques?":"¿A qué te dedicas?","Per exemple: administrativa, infermera de torns, estudiant, paleta.":"Por ejemplo: administrativa, enfermera a turnos, estudiante, albañil.","La teva feina":"Tu trabajo",
"Com és el teu dia a dia, sense comptar l'entrenament?":"¿Cómo es tu día a día, sin contar el entrenamiento?",
"Sedentari":"Sedentario","Feina asseguda, menys de 5.000 passos":"Trabajo sentado, menos de 5.000 pasos","Moderat":"Moderado","7.000-10.000 passos":"7.000-10.000 pasos","Actiu":"Activo","Feina de peu o més de 10.000 passos":"Trabajo de pie o más de 10.000 pasos","Molt actiu":"Muy activo","Feina física":"Trabajo físico",
"Ara, la teva salut":"Ahora, tu salud",
"Preguntes de seguretat basades en el PAR-Q+ (2023). Respon amb sinceritat: si dubtes, marca «No ho sé». Un «sí» no t'impedeix entrenar; vol dir que ho revisarem abans.":"Preguntas de seguridad basadas en el PAR-Q+ (2023). Responde con sinceridad: si dudas, marca «No lo sé». Un «sí» no te impide entrenar; significa que lo revisaremos antes.",
"Algun metge t'ha dit que tens un problema de cor o la pressió alta?":"¿Algún médico te ha dicho que tienes un problema de corazón o la tensión alta?",
"Explica'ns-ho una mica":"Cuéntanoslo un poco","Què et van dir, si ho tens controlat i si prens medicació.":"Qué te dijeron, si lo tienes controlado y si tomas medicación.",
"Sents dolor al pit en repòs, en el dia a dia o fent activitat física?":"¿Sientes dolor en el pecho en reposo, en el día a día o haciendo actividad física?",
"Quan et passa i com és aquest dolor?":"¿Cuándo te pasa y cómo es ese dolor?",
"Els darrers 12 mesos, has perdut l'equilibri per un mareig o has perdut el coneixement?":"En los últimos 12 meses, ¿has perdido el equilibrio por un mareo o has perdido el conocimiento?",
"Què va passar?":"¿Qué pasó?",
"Tens alguna altra malaltia crònica diagnosticada o prens medicació habitual?":"¿Tienes alguna otra enfermedad crónica diagnosticada o tomas medicación habitual?",
"Per exemple: diabetis, asma, tiroide, colesterol, ansietat.":"Por ejemplo: diabetes, asma, tiroides, colesterol, ansiedad.","Quina malaltia o medicació?":"¿Qué enfermedad o medicación?",
"Et falta l'aire, notes palpitacions o et canses molt fent esforços petits?":"¿Te falta el aire, notas palpitaciones o te cansas mucho con esfuerzos pequeños?","Per exemple, pujant un pis d'escales.":"Por ejemplo, subiendo un piso de escaleras.",
"Tens algun problema d'ossos, articulacions, músculs o tendons que pugui empitjorar amb l'exercici?":"¿Tienes algún problema de huesos, articulaciones, músculos o tendones que pueda empeorar con el ejercicio?",
"Tens alguna lesió o molèstia ara mateix, o n'has tingut els darrers 12 mesos?":"¿Tienes alguna lesión o molestia ahora mismo, o la has tenido en los últimos 12 meses?",
"On?":"¿Dónde?","Marca totes les zones.":"Marca todas las zonas.",
"Coll":"Cuello","Espatlla":"Hombro","Colze":"Codo","Canell o mà":"Muñeca o mano","Esquena alta":"Espalda alta","Esquena baixa":"Espalda baja","Maluc":"Cadera","Genoll":"Rodilla","Turmell o peu":"Tobillo o pie","Una altra":"Otra",
"Explica'ns què et passa":"Cuéntanos qué te pasa","Què et fa mal, en quins moviments i des de quan. Per exemple: «el genoll dret, baixant escales, des de fa 3 mesos».":"Qué te duele, en qué movimientos y desde cuándo. Por ejemplo: «la rodilla derecha, bajando escaleras, desde hace 3 meses».",
"T'han operat mai d'alguna cosa que afecti el moviment?":"¿Te han operado alguna vez de algo que afecte al movimiento?","Genoll, esquena, espatlla, hèrnies…":"Rodilla, espalda, hombro, hernias…",
"De què i quan?":"¿De qué y cuándo?","Per exemple: lligament creuat, 2021":"Por ejemplo: ligamento cruzado, 2021",
"Estàs embarassada o has tingut un fill els darrers 12 mesos?":"¿Estás embarazada o has tenido un hijo en los últimos 12 meses?",
"Algun metge t'ha dit que només facis activitat física supervisada?":"¿Algún médico te ha dicho que solo hagas actividad física supervisada?",
"Tens el vistiplau del metge per fer exercici?":"¿Tienes el visto bueno del médico para hacer ejercicio?",
"Com que has respost «sí» o «no ho sé» a alguna pregunta, el teu entrenador ho revisarà abans de començar.":"Como has respondido «sí» o «no lo sé» a alguna pregunta, tu entrenador lo revisará antes de empezar.",
"Sí, en tinc":"Sí, lo tengo","L'estic demanant":"Lo estoy pidiendo",
"Hi ha res més de salut que hagi de saber?":"¿Hay algo más de salud que deba saber?","Opcional.":"Opcional.","Res més":"Nada más",
"La teva experiència":"Tu experiencia","Amb això sabrem per on començar: ni massa fàcil ni massa de cop.":"Con esto sabremos por dónde empezar: ni demasiado fácil ni demasiado de golpe.",
"Quant temps fa que entrenes amb pesos de manera regular?":"¿Cuánto tiempo llevas entrenando con pesas de forma regular?",
"Mai he entrenat amb pesos":"Nunca he entrenado con pesas","Menys de 6 mesos":"Menos de 6 meses","6 mesos – 2 anys":"6 meses – 2 años","2 – 5 anys":"2 – 5 años","Més de 5 anys":"Más de 5 años",
"I ara mateix, quants dies per setmana entrenes?":"Y ahora mismo, ¿cuántos días por semana entrenas?","Ara no entreno":"Ahora no entreno","1 dia":"1 día","2 dies":"2 días","3 dies":"3 días","4 dies":"4 días","5 o més":"5 o más","5 dies":"5 días","6 dies":"6 días",
"Com has entrenat fins ara?":"¿Cómo has entrenado hasta ahora?","Marca tot el que hagis fet.":"Marca todo lo que hayas hecho.",
"Màquines del gimnàs":"Máquinas del gimnasio","Pes lliure (barres i manuelles)":"Peso libre (barras y mancuernas)","Classes dirigides":"Clases dirigidas","Funcional o crossfit":"Funcional o crossfit","Calistènia":"Calistenia","Amb entrenador personal":"Con entrenador personal","Pel meu compte amb vídeos o apps":"Por mi cuenta con vídeos o apps",
"Quins d'aquests exercicis saps fer amb bona tècnica?":"¿Cuáles de estos ejercicios sabes hacer con buena técnica?","Només els que faries sense que ningú et corregís.":"Solo los que harías sin que nadie te corrigiera.",
"Sentadeta amb barra":"Sentadilla con barra","Pes mort":"Peso muerto","Press de banca":"Press de banca","Press militar":"Press militar","Dominades":"Dominadas","Rem amb barra":"Remo con barra","Cap d'aquests":"Ninguno de estos",
"Fas o has fet algun esport?":"¿Haces o has hecho algún deporte?","Per exemple: futbol 10 anys, ara pàdel 1 dia":"Por ejemplo: fútbol 10 años, ahora pádel 1 día","Cap":"Ninguno",
"Hi ha exercicis que no t'agradin o que no puguis fer?":"¿Hay ejercicios que no te gusten o que no puedas hacer?","Opcional. Per exemple: «no m'agrada córrer», «els fons em fan mal a l'espatlla».":"Opcional. Por ejemplo: «no me gusta correr», «los fondos me duelen en el hombro».",
"Com estàs ara mateix":"Cómo estás ahora mismo","No cal fer res ara: respon el que creguis. Si vols, ho mesurarem junts a la primera sessió.":"No hace falta hacer nada ahora: responde lo que creas. Si quieres, lo mediremos juntos en la primera sesión.",
"Quantes flexions seguides pots fer amb bona tècnica?":"¿Cuántas flexiones seguidas puedes hacer con buena técnica?","Amb els genolls a terra també compta: digues-ho a «Alguna cosa més» al final.":"Con las rodillas en el suelo también cuenta: dilo en «Algo más» al final.",
"1 a 5":"1 a 5","6 a 15":"6 a 15","16 a 30":"16 a 30","Més de 30":"Más de 30",
"Puges 3 pisos d'escales a pas normal. Com arribes a dalt?":"Subes 3 pisos de escaleras a paso normal. ¿Cómo llegas arriba?","Sense notar-ho":"Sin notarlo","Una mica cansat":"Un poco cansado","Ofegat":"Ahogado","M'he d'aturar":"Me tengo que parar",
"Dret i amb les cames estirades, arribes a tocar-te els peus?":"De pie y con las piernas estiradas, ¿llegas a tocarte los pies?","Gairebé":"Casi","Em queden lluny":"Me quedan lejos",
"Aguantes 30 segons sobre una cama sense recolzar-te?":"¿Aguantas 30 segundos sobre una pierna sin apoyarte?","Sí, amb les dues":"Sí, con las dos","Només amb una":"Solo con una",
"En general, com valores la teva forma física?":"En general, ¿cómo valoras tu forma física?","Molt baixa":"Muy baja","Molt bona":"Muy buena",
"El teu dia a dia":"Tu día a día","El que fas fora del gimnàs pesa tant com l'entrenament: son, estrès i menjar.":"Lo que haces fuera del gimnasio pesa tanto como el entrenamiento: sueño, estrés y comida.",
"Quantes hores dorms normalment?":"¿Cuántas horas duermes normalmente?","Menys de 6":"Menos de 6","6 a 7":"6 a 7","7 a 8":"7 a 8","Més de 8":"Más de 8",
"I com dorms?":"¿Y cómo duermes?","Fatal":"Fatal","Molt bé":"Muy bien",
"Quin nivell d'estrès tens últimament?":"¿Qué nivel de estrés tienes últimamente?","Gens":"Nada","Molt alt":"Muy alto",
"Quantes hores passes assegut al dia?":"¿Cuántas horas pasas sentado al día?","Feina, cotxe, sofà… tot compta.":"Trabajo, coche, sofá… todo cuenta.","Menys de 4":"Menos de 4","4 a 6":"4 a 6","6 a 8":"6 a 8",
"Quin horari de feina tens?":"¿Qué horario de trabajo tienes?","Matí":"Mañana","Tarda":"Tarde","Partit":"Partido","Torns o nits":"Turnos o noches","Flexible":"Flexible","Ara no treballo":"Ahora no trabajo",
"Com descriuries la teva alimentació?":"¿Cómo describirías tu alimentación?","Desordenada":"Desordenada","Menjo el que puc, quan puc":"Como lo que puedo, cuando puedo","Ho intento, però em costa":"Lo intento, pero me cuesta","Bastant ordenada":"Bastante ordenada","Molt controlada":"Muy controlada","Peso o planifico el que menjo":"Peso o planifico lo que como",
"Quants àpats al dia et van bé?":"¿Cuántas comidas al día te van bien?","3 àpats":"3 comidas","4 àpats":"4 comidas","5 àpats":"5 comidas",
"Quanta aigua beus al dia?":"¿Cuánta agua bebes al día?","Menys d'1 litre":"Menos de 1 litro","1 a 2 litres":"1 a 2 litros","Més de 2 litres":"Más de 2 litros",
"Tens al·lèrgies o intoleràncies alimentàries?":"¿Tienes alergias o intolerancias alimentarias?","Per exemple: lactosa":"Por ejemplo: lactosa",
"Hi ha aliments que no mengis o no t'agradin?":"¿Hay alimentos que no comas o no te gusten?","Per exemple: peix blau, bròquil":"Por ejemplo: pescado azul, brócoli",
"Què vols aconseguir":"Qué quieres conseguir","Pots tenir més d'un objectiu, però un ha de manar: és el que decidirà com entrenes.":"Puedes tener más de un objetivo, pero uno tiene que mandar: es el que decidirá cómo entrenas.",
"Quin és el teu objectiu principal?":"¿Cuál es tu objetivo principal?",
"Perdre greix":"Perder grasa","Guanyar múscul":"Ganar músculo","Recomposició (perdre greix i guanyar múscul)":"Recomposición (perder grasa y ganar músculo)","Millorar força o rendiment":"Mejorar fuerza o rendimiento","Salut i benestar":"Salud y bienestar",
"I en segon lloc?":"¿Y en segundo lugar?","Tria'n fins a 2, per ordre d'importància. Opcional.":"Elige hasta 2, por orden de importancia. Opcional.",
"Millorar el cardio":"Mejorar el cardio","Mobilitat i flexibilitat":"Movilidad y flexibilidad","Menys molèsties d'esquena o articulacions":"Menos molestias de espalda o articulaciones","Rendiment en el meu esport":"Rendimiento en mi deporte","Més energia en el dia a dia":"Más energía en el día a día","Millorar la postura":"Mejorar la postura","Guanyar força":"Ganar fuerza",
"Què t'agradaria veure diferent d'aquí a uns mesos?":"¿Qué te gustaría ver diferente dentro de unos meses?","Al mirall, a la roba o al dia a dia. Per exemple: «marcar més les cames», «no cansar-me jugant amb els nens».":"En el espejo, en la ropa o en el día a día. Por ejemplo: «marcar más las piernas», «no cansarme jugando con los niños».",
"Tens algun repte concret?":"¿Tienes algún reto concreto?","Per exemple: fer 5 dominades, córrer 10 km":"Por ejemplo: hacer 5 dominadas, correr 10 km",
"En quant de temps t'agradaria notar-ho?":"¿En cuánto tiempo te gustaría notarlo?","3 mesos":"3 meses","6 mesos":"6 meses","1 any":"1 año","Sense pressa":"Sin prisa",
"Per què ara?":"¿Por qué ahora?","El que t'ha fet decidir. T'ho recordarem els dies que costi.":"Lo que te ha hecho decidirte. Te lo recordaremos los días que cueste.",
"Ho havies intentat abans?":"¿Lo habías intentado antes?","No, és la primera vegada":"No, es la primera vez",
"Què va fallar aquella vegada?":"¿Qué falló aquella vez?","Sense jutjar-te: ens ajuda a no repetir-ho.":"Sin juzgarte: nos ayuda a no repetirlo.",
"Què et pot fer fallar?":"¿Qué te puede hacer fallar?","Marca tot el que et passi.":"Marca todo lo que te pase.",
"Falta de temps":"Falta de tiempo","Ser constant":"Ser constante","Horaris de feina":"Horarios de trabajo","Menjar fora":"Comer fuera","Motivació":"Motivación","Molèsties o lesions":"Molestias o lesiones","Família":"Familia","Cap, de moment":"Ninguno, de momento",
"Del 0 al 10, quin compromís hi poses?":"Del 0 al 10, ¿qué compromiso le pones?","Ho provaré":"Lo probaré","Al 100 %":"Al 100 %",
"Com t'encaixa l'entrenament":"Cómo te encaja el entrenamiento","L'última part: amb això et muntem una rutina que puguis complir de veritat.":"La última parte: con esto te montamos una rutina que puedas cumplir de verdad.",
"Quants dies per setmana pots entrenar de veritat?":"¿Cuántos días por semana puedes entrenar de verdad?","Els que puguis mantenir els mesos dolents, no els d'una setmana bona.":"Los que puedas mantener los meses malos, no los de una semana buena.",
"Quins dies et van millor?":"¿Qué días te van mejor?","Dl":"L","Dt":"M","Dc":"X","Dj":"J","Dv":"V","Ds":"S","Dg":"D",
"Quant de temps tens per sessió?":"¿Cuánto tiempo tienes por sesión?","45 minuts":"45 minutos","1 hora":"1 hora","1 hora i quart":"1 hora y cuarto","1 hora i mitja":"1 hora y media",
"On entrenaràs?":"¿Dónde entrenarás?","Gimnàs":"Gimnasio","Casa":"Casa","Tots dos":"Los dos",
"Quin material tens a casa?":"¿Qué material tienes en casa?","Manuelles":"Mancuernas","Barra i discos":"Barra y discos","Banc":"Banco","Bandes elàstiques":"Bandas elásticas","Barra de dominades":"Barra de dominadas","Kettlebell":"Kettlebell","Res":"Nada",
"A quina hora entrenaràs normalment?":"¿A qué hora entrenarás normalmente?","Migdia":"Mediodía","Vespre":"Noche","Variable":"Variable",
"Com t'agrada entrenar?":"¿Cómo te gusta entrenar?","Intens i curt":"Intenso y corto","Amb calma i ben explicat":"Con calma y bien explicado","Variat, que no m'avorreixi":"Variado, que no me aburra","M'és igual, el que funcioni":"Me da igual, lo que funcione",
"Alguna cosa més que vulguis explicar-me?":"¿Algo más que quieras contarme?",
/* interfície */
"‹ Enrere":"‹ Atrás","Pregunta":"Pregunta","de":"de","Part":"Parte","Som-hi":"Vamos","Continua":"Continuar","Omet":"Saltar","Desa i torna a la revisió":"Guardar y volver a la revisión",
"Aquesta és obligatòria.":"Esta es obligatoria.","Tria'n almenys una.":"Elige al menos una.","Revisa-ho: ha de ser entre":"Revísalo: tiene que estar entre","i":"y",
"Revisa la data: has de tenir entre 18 i 100 anys.":"Revisa la fecha: debes tener entre 18 y 100 años.","Màxim":"Máximo","Treu-ne una per triar-ne una altra.":"Quita una para elegir otra.",
"Revisió":"Revisión","Revisa-ho abans d'enviar":"Revísalo antes de enviar","Toca «Edita» per canviar qualsevol resposta.":"Toca «Editar» para cambiar cualquier respuesta.","Edita":"Editar","Respon":"Responder",
"respostes obligatòries per respondre.":"respuestas obligatorias por responder.","Enviar la valoració":"Enviar la valoración","Enviant…":"Enviando…","No s'ha pogut enviar:":"No se ha podido enviar:",
"(omès)":"(omitido)","anys":"años","Ho tindrem en compte.":"Lo tendremos en cuenta.","Has marcat alguna resposta de salut: el teu entrenador la revisarà abans de preparar-te la rutina.":"Has marcado alguna respuesta de salud: tu entrenador la revisará antes de prepararte la rutina.",
"Gràcies":"Gracias","Ja tinc tota la informació que necessito. Em poso mans a l'obra amb la teva rutina.":"Ya tengo toda la información que necesito. Me pongo manos a la obra con tu rutina.",
"Reviso les teves respostes una per una":"Reviso tus respuestas una por una",", començant per les de salut":", empezando por las de salud","Et preparo la rutina i la pauta a mida.":"Te preparo la rutina y la pauta a medida.","Quan estiguin llestes, et ve un avís i ja pots començar.":"Cuando estén listas, te llega un aviso y ya puedes empezar.",
"Mentrestant, afegeix l'app a la pantalla d'inici i activa les notificacions a ⚙︎. Demà al matí, pesa't en dejú i apunta-ho.":"Mientras tanto, añade la app a la pantalla de inicio y activa las notificaciones en ⚙︎. Mañana por la mañana, pésate en ayunas y apúntalo.",
"Valoració inicial":"Valoración inicial","Uns 8-10 minuts. Es desa a cada pas: pots parar i continuar quan vulguis.":"Unos 8-10 minutos. Se guarda en cada paso: puedes parar y seguir cuando quieras.",
"En quin idioma vols fer-la?":"¿En qué idioma quieres hacerla?","L'app et parlarà en aquest idioma.":"La app te hablará en este idioma.",
"Anar a l'inici":"Ir al inicio","Et preparo la rutina a mida, exercici per exercici.":"Te preparo la rutina a medida, ejercicio por ejercicio.","Te l'envio en PDF, amb el vídeo de cada exercici.":"Te la envío en PDF, con el vídeo de cada ejercicio.","Ja pots tancar aquesta pàgina.":"Ya puedes cerrar esta página.","Et prepararé la rutina en aquest idioma.":"Te prepararé la rutina en este idioma.","Estic preparant la teva rutina":"Estoy preparando tu rutina","He rebut la teva valoració. Rebràs un avís quan la tingui llesta. Mentrestant, pesa't cada matí en dejú.":"He recibido tu valoración. Recibirás un aviso cuando la tenga lista. Mientras tanto, pésate cada mañana en ayunas."
};
let valLang="ca";
const VT=s=>valLang==="es"&&VAL_ES[s]!=null?VAL_ES[s]:s;

/* ---------- preguntes ---------- */
const VBLOCKS=[["tu","Tu"],["salut","Salut"],["exp","Experiència"],["cond","Condició física"],["vida","Dia a dia"],["obj","Objectius"],["pref","Preferències"]];
const VYNU=[["no","No"],["si","Sí"],["nose","No ho sé"]];
const vExp0=A=>A.exp&&A.exp!=="Mai he entrenat amb pesos";
const VZONES=["Coll","Espatlla","Colze","Canell o mà","Esquena alta","Esquena baixa","Maluc","Genoll","Turmell o peu","Una altra"];
const VGOALS2=["Millorar el cardio","Mobilitat i flexibilitat","Menys molèsties d'esquena o articulacions","Rendiment en el meu esport","Més energia en el dia a dia","Millorar la postura","Guanyar força","Perdre greix","Guanyar múscul"];
const vHealth=A=>["parq0","parq1","parq2","parq3","parq4","parq5","sympt"].some(k=>A[k]==="si"||A[k]==="nose")||A.preg==="si";
const VQ=[
 {id:"lang",b:"tu",t:"single",q:"En quin idioma vols fer-la?",h:"L'app et parlarà en aquest idioma.",o:[["ca","Català"],["es","Castellano"]],req:true,raw:1},
 {id:"i_tu",b:"tu",t:"intro",q:"Comencem per conèixer-te",h:"Dades bàsiques per calcular-ho tot bé. Les preguntes que no siguin obligatòries les pots ometre."},
 {id:"name",b:"tu",t:"text",q:"Com et dius?",ph:"Nom i cognom",req:true},
 {id:"birth",b:"tu",t:"date",q:"Quan vas néixer?",req:true},
 {id:"sex",b:"tu",t:"single",q:"Sexe biològic",h:"Només el fem servir per a càlculs fisiològics i rangs de referència.",o:[["d","Dona"],["h","Home"]],req:true},
 {id:"cm",b:"tu",t:"number",q:"Quant fas d'alçada?",u:"cm",min:120,max:230,req:true},
 {id:"kg",b:"tu",t:"number",q:"Quant peses ara?",h:"Si no ho saps exacte, posa-hi un aproximat. A partir de demà et pesaràs cada matí.",u:"kg",min:35,max:250,dec:1,req:true},
 {id:"job",b:"tu",t:"text",q:"A què et dediques?",h:"Per exemple: administrativa, infermera de torns, estudiant, paleta.",ph:"La teva feina"},
 {id:"pal",b:"tu",t:"single",q:"Com és el teu dia a dia, sense comptar l'entrenament?",o:[[1.4,"Sedentari","Feina asseguda, menys de 5.000 passos"],[1.55,"Moderat","7.000-10.000 passos"],[1.7,"Actiu","Feina de peu o més de 10.000 passos"],[1.85,"Molt actiu","Feina física"]],req:true},
 {id:"i_salut",b:"salut",t:"intro",q:"Ara, la teva salut",h:"Preguntes de seguretat basades en el PAR-Q+ (2023). Respon amb sinceritat: si dubtes, marca «No ho sé». Un «sí» no t'impedeix entrenar; vol dir que ho revisarem abans."},
 {id:"parq0",b:"salut",t:"single",o:VYNU,req:true,q:"Algun metge t'ha dit que tens un problema de cor o la pressió alta?"},
 {id:"parq0x",b:"salut",t:"textarea",if:A=>A.parq0==="si",q:"Explica'ns-ho una mica",h:"Què et van dir, si ho tens controlat i si prens medicació.",req:true},
 {id:"parq1",b:"salut",t:"single",o:VYNU,req:true,q:"Sents dolor al pit en repòs, en el dia a dia o fent activitat física?"},
 {id:"parq1x",b:"salut",t:"textarea",if:A=>A.parq1==="si",q:"Quan et passa i com és aquest dolor?",req:true},
 {id:"parq2",b:"salut",t:"single",o:VYNU,req:true,q:"Els darrers 12 mesos, has perdut l'equilibri per un mareig o has perdut el coneixement?"},
 {id:"parq2x",b:"salut",t:"textarea",if:A=>A.parq2==="si",q:"Què va passar?",req:true},
 {id:"parq3",b:"salut",t:"single",o:VYNU,req:true,q:"Tens alguna altra malaltia crònica diagnosticada o prens medicació habitual?",h:"Per exemple: diabetis, asma, tiroide, colesterol, ansietat."},
 {id:"parq3x",b:"salut",t:"textarea",if:A=>A.parq3==="si",q:"Quina malaltia o medicació?",req:true},
 {id:"sympt",b:"salut",t:"single",o:VYNU,req:true,q:"Et falta l'aire, notes palpitacions o et canses molt fent esforços petits?",h:"Per exemple, pujant un pis d'escales."},
 {id:"parq4",b:"salut",t:"single",o:VYNU,req:true,q:"Tens algun problema d'ossos, articulacions, músculs o tendons que pugui empitjorar amb l'exercici?"},
 {id:"inj",b:"salut",t:"single",o:[["no","No"],["si","Sí"]],req:true,q:"Tens alguna lesió o molèstia ara mateix, o n'has tingut els darrers 12 mesos?"},
 {id:"injZ",b:"salut",t:"multi",o:VZONES,if:A=>A.inj==="si"||A.parq4==="si",req:true,q:"On?",h:"Marca totes les zones."},
 {id:"injuries",b:"salut",t:"textarea",if:A=>A.inj==="si"||A.parq4==="si",req:true,q:"Explica'ns què et passa",h:"Què et fa mal, en quins moviments i des de quan. Per exemple: «el genoll dret, baixant escales, des de fa 3 mesos»."},
 {id:"surg",b:"salut",t:"single",o:[["no","No"],["si","Sí"]],req:true,q:"T'han operat mai d'alguna cosa que afecti el moviment?",h:"Genoll, esquena, espatlla, hèrnies…"},
 {id:"surgx",b:"salut",t:"text",if:A=>A.surg==="si",req:true,q:"De què i quan?",ph:"Per exemple: lligament creuat, 2021"},
 {id:"preg",b:"salut",t:"single",if:A=>A.sex==="d",o:[["no","No"],["si","Sí"],["nd","Prefereixo no dir-ho"]],req:true,q:"Estàs embarassada o has tingut un fill els darrers 12 mesos?"},
 {id:"parq5",b:"salut",t:"single",o:VYNU,req:true,q:"Algun metge t'ha dit que només facis activitat física supervisada?"},
 {id:"clear",b:"salut",t:"single",if:vHealth,o:[["si","Sí, en tinc"],["no","No"],["tram","L'estic demanant"]],req:true,q:"Tens el vistiplau del metge per fer exercici?",h:"Com que has respost «sí» o «no ho sé» a alguna pregunta, el teu entrenador ho revisarà abans de començar."},
 {id:"medical",b:"salut",t:"textarea",q:"Hi ha res més de salut que hagi de saber?",h:"Opcional.",quick:["Res més"]},
 {id:"i_exp",b:"exp",t:"intro",q:"La teva experiència",h:"Amb això sabrem per on començar: ni massa fàcil ni massa de cop."},
 {id:"exp",b:"exp",t:"single",req:true,q:"Quant temps fa que entrenes amb pesos de manera regular?",o:["Mai he entrenat amb pesos","Menys de 6 mesos","6 mesos – 2 anys","2 – 5 anys","Més de 5 anys"]},
 {id:"freqNow",b:"exp",t:"single",if:vExp0,req:true,q:"I ara mateix, quants dies per setmana entrenes?",o:[["0","Ara no entreno"],["1","1 dia"],["2","2 dies"],["3","3 dies"],["4","4 dies"],["5","5 o més"]]},
 {id:"methods",b:"exp",t:"multi",if:vExp0,q:"Com has entrenat fins ara?",h:"Marca tot el que hagis fet.",o:["Màquines del gimnàs","Pes lliure (barres i manuelles)","Classes dirigides","Funcional o crossfit","Calistènia","Amb entrenador personal","Pel meu compte amb vídeos o apps"]},
 {id:"lifts",b:"exp",t:"multi",if:vExp0,q:"Quins d'aquests exercicis saps fer amb bona tècnica?",h:"Només els que faries sense que ningú et corregís.",o:["Sentadeta amb barra","Pes mort","Press de banca","Press militar","Dominades","Rem amb barra","Cap d'aquests"]},
 {id:"sports",b:"exp",t:"text",q:"Fas o has fet algun esport?",ph:"Per exemple: futbol 10 anys, ara pàdel 1 dia",quick:["Cap"]},
 {id:"noEx",b:"exp",t:"textarea",q:"Hi ha exercicis que no t'agradin o que no puguis fer?",h:"Opcional. Per exemple: «no m'agrada córrer», «els fons em fan mal a l'espatlla».",quick:["Cap"]},
 {id:"i_cond",b:"cond",t:"intro",q:"Com estàs ara mateix",h:"No cal fer res ara: respon el que creguis. Si vols, ho mesurarem junts a la primera sessió."},
 {id:"push",b:"cond",t:"single",req:true,q:"Quantes flexions seguides pots fer amb bona tècnica?",h:"Amb els genolls a terra també compta: digues-ho a «Alguna cosa més» al final.",o:[["0","Cap"],["1-5","1 a 5"],["6-15","6 a 15"],["16-30","16 a 30"],["30+","Més de 30"],["nose","No ho sé"]]},
 {id:"stairs",b:"cond",t:"single",req:true,q:"Puges 3 pisos d'escales a pas normal. Com arribes a dalt?",o:[["be","Sense notar-ho"],["poc","Una mica cansat"],["molt","Ofegat"],["stop","M'he d'aturar"],["nose","No ho sé"]]},
 {id:"toes",b:"cond",t:"single",req:true,q:"Dret i amb les cames estirades, arribes a tocar-te els peus?",o:[["si","Sí"],["quasi","Gairebé"],["no","Em queden lluny"],["nose","No ho sé"]]},
 {id:"bal",b:"cond",t:"single",req:true,q:"Aguantes 30 segons sobre una cama sense recolzar-te?",o:[["si","Sí, amb les dues"],["una","Només amb una"],["no","No"],["nose","No ho sé"]]},
 {id:"selfFit",b:"cond",t:"scale",n:5,req:true,q:"En general, com valores la teva forma física?",ends:["Molt baixa","Molt bona"]},
 {id:"i_vida",b:"vida",t:"intro",q:"El teu dia a dia",h:"El que fas fora del gimnàs pesa tant com l'entrenament: son, estrès i menjar."},
 {id:"sleepH",b:"vida",t:"single",req:true,q:"Quantes hores dorms normalment?",o:[["<6","Menys de 6"],["6-7","6 a 7"],["7-8","7 a 8"],["8+","Més de 8"]]},
 {id:"sleepQ",b:"vida",t:"scale",n:5,req:true,q:"I com dorms?",ends:["Fatal","Molt bé"]},
 {id:"stress",b:"vida",t:"scale",n:5,req:true,q:"Quin nivell d'estrès tens últimament?",ends:["Gens","Molt alt"]},
 {id:"sit",b:"vida",t:"single",req:true,q:"Quantes hores passes assegut al dia?",h:"Feina, cotxe, sofà… tot compta.",o:[["<4","Menys de 4"],["4-6","4 a 6"],["6-8","6 a 8"],["8+","Més de 8"]]},
 {id:"shift",b:"vida",t:"single",req:true,q:"Quin horari de feina tens?",o:["Matí","Tarda","Partit","Torns o nits","Flexible","Ara no treballo"]},
 {id:"food",b:"vida",t:"single",req:true,q:"Com descriuries la teva alimentació?",o:[["1","Desordenada","Menjo el que puc, quan puc"],["2","Ho intento, però em costa"],["3","Bastant ordenada"],["4","Molt controlada","Peso o planifico el que menjo"]]},
 {id:"meals",b:"vida",t:"single",req:true,q:"Quants àpats al dia et van bé?",o:[[3,"3 àpats"],[4,"4 àpats"],[5,"5 àpats"]]},
 {id:"water",b:"vida",t:"single",req:true,q:"Quanta aigua beus al dia?",o:[["<1","Menys d'1 litre"],["1-2","1 a 2 litres"],["2+","Més de 2 litres"],["nose","No ho sé"]]},
 {id:"allergies",b:"vida",t:"text",req:true,q:"Tens al·lèrgies o intoleràncies alimentàries?",ph:"Per exemple: lactosa",quick:["Cap"]},
 {id:"dislikes",b:"vida",t:"text",q:"Hi ha aliments que no mengis o no t'agradin?",ph:"Per exemple: peix blau, bròquil",quick:["Cap"]},
 {id:"i_obj",b:"obj",t:"intro",q:"Què vols aconseguir",h:"Pots tenir més d'un objectiu, però un ha de manar: és el que decidirà com entrenes."},
 {id:"goal",b:"obj",t:"single",req:true,q:"Quin és el teu objectiu principal?",o:INTAKE_GOALS},
 {id:"goal2",b:"obj",t:"multi",max:2,ordered:true,q:"I en segon lloc?",h:"Tria'n fins a 2, per ordre d'importància. Opcional.",o:A=>VGOALS2.filter(g=>!(A.goal||"").toLowerCase().startsWith(g.toLowerCase().split(" ")[0]))},
 {id:"change",b:"obj",t:"textarea",q:"Què t'agradaria veure diferent d'aquí a uns mesos?",h:"Al mirall, a la roba o al dia a dia. Per exemple: «marcar més les cames», «no cansar-me jugant amb els nens»."},
 {id:"challenge",b:"obj",t:"text",q:"Tens algun repte concret?",ph:"Per exemple: fer 5 dominades, córrer 10 km",quick:["No"]},
 {id:"when",b:"obj",t:"single",req:true,q:"En quant de temps t'agradaria notar-ho?",o:[["3m","3 mesos"],["6m","6 mesos"],["1a","1 any"],["sp","Sense pressa"]]},
 {id:"why",b:"obj",t:"textarea",q:"Per què ara?",h:"El que t'ha fet decidir. T'ho recordarem els dies que costi."},
 {id:"tried",b:"obj",t:"single",req:true,q:"Ho havies intentat abans?",o:[["no","No, és la primera vegada"],["si","Sí"]]},
 {id:"triedx",b:"obj",t:"textarea",if:A=>A.tried==="si",q:"Què va fallar aquella vegada?",h:"Sense jutjar-te: ens ajuda a no repetir-ho."},
 {id:"barriers",b:"obj",t:"multi",req:true,q:"Què et pot fer fallar?",h:"Marca tot el que et passi.",o:["Falta de temps","Ser constant","Horaris de feina","Menjar fora","Motivació","Molèsties o lesions","Família","Cap, de moment"]},
 {id:"commit",b:"obj",t:"scale",n:10,req:true,q:"Del 0 al 10, quin compromís hi poses?",ends:["Ho provaré","Al 100 %"]},
 {id:"i_pref",b:"pref",t:"intro",q:"Com t'encaixa l'entrenament",h:"L'última part: amb això et muntem una rutina que puguis complir de veritat."},
 {id:"days",b:"pref",t:"single",req:true,q:"Quants dies per setmana pots entrenar de veritat?",h:"Els que puguis mantenir els mesos dolents, no els d'una setmana bona.",o:[[2,"2 dies"],[3,"3 dies"],[4,"4 dies"],[5,"5 dies"],[6,"6 dies"]]},
 {id:"wdays",b:"pref",t:"multi",q:"Quins dies et van millor?",h:"Opcional.",o:["Dl","Dt","Dc","Dj","Dv","Ds","Dg"],chips:1},
 {id:"minutes",b:"pref",t:"single",req:true,q:"Quant de temps tens per sessió?",o:[[45,"45 minuts"],[60,"1 hora"],[75,"1 hora i quart"],[90,"1 hora i mitja"]]},
 {id:"place",b:"pref",t:"single",req:true,q:"On entrenaràs?",o:["Gimnàs","Casa","Tots dos"]},
 {id:"equip",b:"pref",t:"multi",if:A=>A.place&&A.place!=="Gimnàs",req:true,q:"Quin material tens a casa?",o:["Manuelles","Barra i discos","Banc","Bandes elàstiques","Barra de dominades","Kettlebell","Res"],chips:1},
 {id:"trainTime",b:"pref",t:"single",req:true,q:"A quina hora entrenaràs normalment?",o:["Matí","Migdia","Tarda","Vespre","Variable"]},
 {id:"style",b:"pref",t:"single",req:true,q:"Com t'agrada entrenar?",o:["Intens i curt","Amb calma i ben explicat","Variat, que no m'avorreixi","M'és igual, el que funcioni"]},
 {id:"notes",b:"pref",t:"textarea",q:"Alguna cosa més que vulguis explicar-me?",h:"Opcional."}];

/* ---------- estat (esborrany al dispositiu, per usuari) ---------- */
let VA=null, vCur=VQ[0].id, vScreen="q", vDir=1, vBack=false, vMsg="", vBusy=false;
const vKey=()=>"q_val_"+((window.QStore&&QStore.uid)||"x");
function vLoad(){ if(VA) return; VA={};
  try{const s=JSON.parse(localStorage.getItem(vKey())||"null"); if(s&&s.A){VA=s.A; vCur=s.cur||vCur; vScreen=s.screen==="review"?"review":"q"}}catch(e){}
  if(!VA.name&&QStore.profile&&QStore.profile.name) VA.name=QStore.profile.name; valLang=VA.lang||"ca"}
const vSave=()=>{try{localStorage.setItem(vKey(),JSON.stringify({A:VA,cur:vCur,screen:vScreen}))}catch(e){}};
const vVis=()=>VQ.filter(q=>!q.if||q.if(VA));
const vQ=id=>VQ.find(q=>q.id===id);
const vOpts=q=>(typeof q.o==="function"?q.o(VA):q.o).map(o=>Array.isArray(o)?o:[o,o]);
const vEmpty=v=>v==null||v===""||(Array.isArray(v)&&!v.length);
const vL=(q,s)=>q&&q.raw?s:VT(s);

/* ---------- vista del client ---------- */
function renderValoracio(){
  const el=$("#v-valoracio"); if(!el) return; vLoad();
  const ik=intakeDoc(); if(ik&&+ik.version>=2&&vScreen!=="done"){VA=ik.assessment&&ik.assessment.answers||VA; valLang=ik.lang||"ca"; vScreen="done"}
  if(vScreen==="done") return el.innerHTML=vDone();
  if(vScreen==="review") return el.innerHTML=vHeader(null)+vReview();
  const q=vQ(vCur)||VQ[0], v=VA[q.id];
  let b="";
  if(q.t==="intro"){const bi=VBLOCKS.findIndex(x=>x[0]===q.b);
    b=`<span class="vbadge">${VT("Part")} ${bi+1} ${VT("de")} 7</span><h1 class="vbig">${esc(VT(q.q))}</h1><p class="vhelp" style="margin:0">${esc(VT(q.h||""))}</p>`}
  else{
    b=`${q.id==="lang"?`<span class="vbadge">${VT("Valoració inicial")}</span><p class="vhelp" style="margin:0">${VT("Uns 8-10 minuts. Es desa a cada pas: pots parar i continuar quan vulguis.")}</p>`:""}<h1 id="vql" class="vq">${esc(VT(q.q))}</h1>${q.h?`<p class="vhelp">${esc(VT(q.h))}</p>`:""}`;
    if(q.t==="single") b+=`<div class="vopts" role="group" aria-labelledby="vql">${vOpts(q).map(([val,l,sub],i)=>`<button type="button" class="vopt ${val==="nose"||val==="nd"?"unk":""}" data-vv="${esc(val)}" aria-pressed="${String(v)===String(val)}"><span class="k">${String.fromCharCode(65+i)}</span><span>${esc(vL(q,l))}${sub?`<small>${esc(VT(sub))}</small>`:""}</span></button>`).join("")}</div>`;
    else if(q.t==="multi"){const arr=v||[];
      b+=q.chips?`<div class="vchips" role="group" aria-labelledby="vql">${vOpts(q).map(([val,l])=>`<button type="button" class="vchip" data-vm="${esc(val)}" aria-pressed="${arr.includes(val)}">${esc(VT(l))}</button>`).join("")}</div>`
        :`<div class="vopts" role="group" aria-labelledby="vql">${vOpts(q).map(([val,l])=>{const k=arr.indexOf(val);return `<button type="button" class="vopt" data-vm="${esc(val)}" aria-pressed="${k>=0}"><span class="k">${k>=0?(q.ordered?k+1:"✓"):""}</span><span>${esc(VT(l))}</span></button>`}).join("")}</div>`}
    else if(q.t==="scale"){const nums=[...Array(q.n===10?11:q.n)].map((_,i)=>q.n===10?i:i+1);
      b+=`<div class="vscale"><div class="row" style="grid-template-columns:repeat(${q.n===10?6:5},1fr)">${nums.map(x=>`<button type="button" data-vv="${x}" aria-pressed="${v!=null&&v!==""&&+v===x}">${x}</button>`).join("")}</div><div class="ends"><span>${esc(VT(q.ends[0]))}</span><span>${esc(VT(q.ends[1]))}</span></div></div>`}
    else if(q.t==="textarea") b+=`<textarea id="vinp" class="vta" aria-labelledby="vql" placeholder="${esc(VT(q.ph||""))}">${esc(v||"")}</textarea>`;
    else b+=`<label class="vfield"><input id="vinp" type="${q.t==="date"?"date":"text"}" ${q.t==="number"?`inputmode="${q.dec?"decimal":"numeric"}"`:""} aria-labelledby="vql" placeholder="${esc(VT(q.ph||""))}" value="${esc(v??"")}" autocomplete="off">${q.u?`<span class="u">${esc(q.u)}</span>`:""}</label>`;
    if(q.quick) b+=`<div class="vchips">${q.quick.map(x=>`<button type="button" class="vchip" data-vq="${esc(x)}" aria-pressed="${v===VT(x)}">${esc(VT(x))}</button>`).join("")}</div>`;
    if(q.id==="parq5"&&vHealth(VA)) b+=`<div class="note"><b>${VT("Ho tindrem en compte.")}</b> ${VT("Has marcat alguna resposta de salut: el teu entrenador la revisarà abans de preparar-te la rutina.")}</div>`;
  }
  const auto=q.t==="single"||q.t==="scale";
  const lbl=q.t==="intro"?VT(q.b==="tu"?"Som-hi":"Continua"):vEmpty(v)&&!q.req?VT("Omet"):VT("Continua");
  el.innerHTML=vHeader(q)+`<section class="vslide ${vDir<0?"rev":""}" aria-live="polite">${b}<div class="vfoot"><p class="vmsg">${esc(vMsg)}</p>${auto&&vEmpty(v)?"":`<button type="button" class="vcta" id="v-next">${vBack&&q.t!=="intro"?VT("Desa i torna a la revisió"):lbl}</button>`}</div></section>`;
  vMsg="";
}
function vHeader(q){
  const list=vVis(), qs=list.filter(x=>x.t!=="intro"), bi=VBLOCKS.findIndex(b=>b[0]===(q?q.b:"pref"));
  const segs=VBLOCKS.map(([k],i)=>{const inB=list.filter(x=>x.b===k), pos=q?inB.findIndex(x=>x.id===q.id):-1;
    const w=!q||i<bi?100:i>bi?0:Math.round((pos+1)/inB.length*100); return `<div class="vseg"><i style="width:${w}%"></i></div>`}).join("");
  const n=q&&q.t!=="intro"?qs.findIndex(x=>x.id===q.id)+1:null;
  return `<div class="vtop"><div class="vrow"><button type="button" class="vback" id="v-back" ${q&&list[0].id===q.id?"disabled":""}>${VT("‹ Enrere")}</button>
    <span class="vblk">${q?`<b>${bi+1}/7</b> · ${esc(VT(VBLOCKS[bi][1]))}`:`<b>${VT("Revisió")}</b>`}</span></div><div class="vsegs" aria-hidden="true">${segs}</div>${n?`<span class="vqn">${VT("Pregunta")} ${n} ${VT("de")} ${qs.length}</span>`:""}</div>`;
}
function vFmt(q,v){
  if(vEmpty(v)) return q.req?"—":VT("(omès)");
  if(q.t==="multi") return v.map((x,i)=>(q.ordered?(i+1)+". ":"")+VT(x)).join(", ");
  if(q.t==="single"){const o=vOpts(q).find(x=>String(x[0])===String(v)); return o?vL(q,o[1]):v}
  if(q.t==="scale") return v+(q.n===10?" / 10":" / 5");
  if(q.t==="date") return dt(v).toLocaleDateString(valLang==="es"?"es-ES":"ca-ES",{day:"numeric",month:"long",year:"numeric"})+` (${ageFrom(v)} ${VT("anys")})`;
  if(q.t==="number") return String(v).replace(".",",")+" "+q.u;
  return v;
}
function vReview(){
  const list=vVis().filter(q=>q.t!=="intro"), miss=list.filter(q=>q.req&&vEmpty(VA[q.id]));
  return `<section class="vslide"><h1 class="vq">${VT("Revisa-ho abans d'enviar")}</h1><p class="vhelp">${VT("Toca «Edita» per canviar qualsevol resposta.")}</p>
    ${VBLOCKS.map(([k,l])=>{const qs=list.filter(q=>q.b===k); if(!qs.length) return "";
      return `<div class="card stack" style="gap:8px"><div style="display:flex;justify-content:space-between;align-items:center"><b>${esc(VT(l))}</b><button type="button" class="plain" data-ve="${qs[0].id}" style="color:var(--accent);font-weight:700">${VT("Edita")}</button></div>
        <dl class="vkv">${qs.map(q=>`<dt>${esc(VT(q.q))}</dt><dd>${esc(vFmt(q,VA[q.id]))}${q.req&&vEmpty(VA[q.id])?` <button type="button" class="plain" data-ve="${q.id}" style="color:var(--bad);font-weight:700;padding:0">${VT("Respon")}</button>`:""}</dd>`).join("")}</dl></div>`}).join("")}
    <div class="vfoot">${miss.length?`<p class="vmsg">${miss.length} ${VT("respostes obligatòries per respondre.")}</p>`:""}<p class="vmsg" id="v-err"></p>
      <button type="button" class="vcta" id="v-send" ${miss.length||vBusy?"disabled":""}>${vBusy?VT("Enviant…"):VT("Enviar la valoració")}</button></div></section>`;
}
function vDone(){
  const n=String(VA.name||"").trim().split(" ")[0];
  return `<section class="vslide vdone"><div class="vok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h1 class="vbig">${VT("Gràcies")}${n?", "+esc(n):""}!</h1>
    <p style="font-size:18px;margin:0;max-width:34ch">${VT("Ja tinc tota la informació que necessito. Em poso mans a l'obra amb la teva rutina.")}</p>
    ${window.V_FORM?`<ol class="vsteps"><li>${VT("Reviso les teves respostes una per una")}${vHealth(VA)?VT(", començant per les de salut"):""}.</li><li>${VT("Et preparo la rutina a mida, exercici per exercici.")}</li><li>${VT("Te l'envio en PDF, amb el vídeo de cada exercici.")}</li></ol>
    <p class="vhelp" style="margin:0">${VT("Ja pots tancar aquesta pàgina.")}</p></section>`
    :`<ol class="vsteps"><li>${VT("Reviso les teves respostes una per una")}${vHealth(VA)?VT(", començant per les de salut"):""}.</li><li>${VT("Et preparo la rutina i la pauta a mida.")}</li><li>${VT("Quan estiguin llestes, et ve un avís i ja pots començar.")}</li></ol>
    <p class="vhelp" style="margin:0">${VT("Mentrestant, afegeix l'app a la pantalla d'inici i activa les notificacions a ⚙︎. Demà al matí, pesa't en dejú i apunta-ho.")}</p>
    <div class="vfoot"><a class="vcta" href="#avui" style="display:grid;place-items:center;text-decoration:none">${VT("Anar a l'inici")}</a></div></section>`}`;
}
function vValidate(q){
  if(q.t==="intro") return true;
  const inp=$("#vinp"); if(inp) VA[q.id]=q.t==="number"?(inp.value.trim()===""?"":+inp.value.replace(",",".")):inp.value.trim();
  const v=VA[q.id];
  if(q.req&&vEmpty(v)){vMsg=VT(q.t==="multi"?"Tria'n almenys una.":"Aquesta és obligatòria.");return false}
  if(q.t==="number"&&!vEmpty(v)&&(isNaN(v)||v<q.min||v>q.max)){vMsg=`${VT("Revisa-ho: ha de ser entre")} ${q.min} ${VT("i")} ${q.max} ${q.u}.`;return false}
  if(q.id==="birth"){const a=ageFrom(v); if(a==null||a<18||a>100){vMsg=VT("Revisa la data: has de tenir entre 18 i 100 anys.");return false}}
  return true;
}
function vNext(){
  const q=vQ(vCur); if(!vValidate(q)){renderValoracio();return}
  const list=vVis(), i=list.findIndex(x=>x.id===vCur);
  if(vBack&&q.t!=="intro"){const f=list[i+1]; if(f&&f.if&&vEmpty(VA[f.id])) vCur=f.id; else {vBack=false; vScreen="review"}}
  else if(i<list.length-1) vCur=list[i+1].id; else vScreen="review";
  vDir=1; vSave(); renderValoracio(); window.scrollTo(0,0);
}
function vPrev(){
  if(vScreen==="review"){vScreen="q"; vCur=vVis().slice(-1)[0].id}
  else{const list=vVis(), i=list.findIndex(x=>x.id===vCur); if(i>0) vCur=list[i-1].id}
  vDir=-1; vSave(); renderValoracio(); window.scrollTo(0,0);
}

/* ---------- anàlisi amb regles visibles (la veu l'entrenador i es desa amb la valoració) ---------- */
function valLevel(A){
  const e=A.exp||"", lifts=(A.lifts||[]).filter(x=>x!=="Cap d'aquests").length, f=+A.freqNow||0;
  let L=/^(Mai|Menys)/.test(e)?0:/^6 mesos/.test(e)?1:2; const why=[`anys amb pesos: «${e}»`];
  if(L===2&&lifts<4){L=1; why.push(`domina ${lifts} dels 6 bàsics (cal 4 o més per a avançat)`)}
  if(L>=1&&lifts<2){L=0; why.push(`domina ${lifts} bàsics: principiant tècnic`)}
  if(L>=1&&f<=1){L-=1; why.push(`ara entrena ${f} dies: baixem un nivell`)}
  return {L:Math.max(0,L),txt:["Principiant","Intermedi","Avançat"][Math.max(0,L)],why};
}
function valDays(A){
  const lv=valLevel(A), d=+A.days||3, max=[4,5,6][lv.L]; let f=Math.min(d,max); const why=[`pot ${d} dies`,`${lv.txt.toLowerCase()}: fins a ${max}`];
  if((A.sleepH==="<6"||+A.stress>=4)&&f>4){f-=1; why.push("dorm poc o té estrès alt: un dia menys")}
  return {f,why};
}
function valFlags(A){
  const F=[], P=[["parq0","Problema de cor o pressió alta"],["parq1","Dolor al pit"],["parq2","Marejos o pèrdua de coneixement"],["parq3","Malaltia crònica o medicació"],["parq4","Problema d'ossos o articulacions"],["parq5","Un metge li ha dit que només faci activitat supervisada"],["sympt","Falta d'aire, palpitacions o fatiga amb esforços petits"]];
  P.forEach(([k,t])=>{ if(A[k]==="si") F.push({level:["parq1","parq2","sympt","parq5"].includes(k)?"hi":"md",text:t,detail:A[k+"x"]||""}); else if(A[k]==="nose") F.push({level:"md",text:t+": no ho sap",detail:"Cal confirmar-ho"}) });
  if(A.preg==="si") F.push({level:"hi",text:"Embaràs o postpart (darrers 12 mesos)",detail:"Cal el vistiplau del metge o la llevadora"});
  if(A.inj==="si"||A.parq4==="si") F.push({level:"md",text:"Lesió o molèstia: "+(A.injZ||[]).join(", "),detail:A.injuries||""});
  if(A.surg==="si") F.push({level:"md",text:"Operació",detail:A.surgx||""});
  return F;
}
function vBuildDoc(){
  const A=VA, lv=valLevel(A), fr=valDays(A), now=new Date().toISOString();
  const parq=["parq0","parq1","parq2","parq3","parq4","parq5"].map(k=>A[k]==="nose"?"si":A[k]);
  const doc={version:2,lang:A.lang||"ca",name:A.name,sex:A.sex,birth:A.birth,cm:A.cm,kg:A.kg,goal:A.goal,exp:A.exp,days:A.days,minutes:A.minutes,place:A.place,trainTime:A.trainTime,pal:A.pal,
    injuries:A.injuries||"",medical:[A.medical&&A.medical!==VT("Res més")?A.medical:"",A.parq0x,A.parq1x,A.parq2x,A.parq3x,A.surgx?"Operació: "+A.surgx:""].filter(Boolean).join(" · "),
    allergies:A.allergies||"",dislikes:A.dislikes||"",meals:A.meals,notes:A.notes||"",parq,parqAlert:vHealth(A),
    assessment:{answers:A,level:lv.txt,levelWhy:lv.why,suggestedDays:fr.f,suggestedWhy:fr.why,flags:valFlags(A)},createdAt:now,updatedAt:now};
  return doc;
}
async function vSend(){
  const b=$("#v-send"); vBusy=true; if(b){b.disabled=true;b.textContent=VT("Enviant…")}
  const A=VA, doc=vBuildDoc();
  try{
    await db.collection("intake").doc("inicial").set(doc);
    const t=todayISO(); if(A.kg&&!S.bodyweight.some(x=>x.date===t)) await db.collection("bodyweight").doc(t).set({date:t,kg:A.kg});
    vScreen="done"; vBusy=false; vSave(); renderValoracio(); window.scrollTo(0,0);
  }catch(err){vBusy=false; renderValoracio(); const m=$("#v-err"); if(m) m.textContent=VT("No s'ha pogut enviar:")+" "+err.message}
}
document.addEventListener("click",e=>{
  if(!e.target.closest("#v-valoracio")) return; const b=e.target.closest("button"); if(!b) return;
  if(vScreen==="done"){return}
  if(b.id==="v-back") return vPrev();
  if(b.id==="v-next") return vNext();
  if(b.id==="v-send") return vSend();
  if(b.dataset.ve){vScreen="q"; vCur=b.dataset.ve; vBack=true; vDir=-1; renderValoracio(); window.scrollTo(0,0); return}
  const q=vQ(vCur); if(vScreen!=="q"||!q) return;
  if(b.dataset.vq!=null){VA[q.id]=VT(b.dataset.vq); return vNext()}
  if(b.dataset.vv!=null){
    VA[q.id]=q.t==="scale"?+b.dataset.vv:vOpts(q).find(x=>String(x[0])===b.dataset.vv)[0];
    if(q.id==="lang") valLang=VA.lang;
    vSave(); renderValoracio(); setTimeout(vNext,matchMedia("(prefers-reduced-motion:reduce)").matches?0:220); return}
  if(b.dataset.vm!=null){
    const val=vOpts(q).find(x=>String(x[0])===b.dataset.vm)[0]; let arr=(VA[q.id]||[]).slice(); const k=arr.indexOf(val), excl=["Cap d'aquests","Cap, de moment","Res"];
    if(k>=0) arr.splice(k,1);
    else if(q.max&&arr.length>=q.max) vMsg=`${VT("Màxim")} ${q.max}. ${VT("Treu-ne una per triar-ne una altra.")}`;
    else arr=excl.includes(val)?[val]:[...arr.filter(x=>!excl.includes(x)),val];
    VA[q.id]=arr; vSave(); renderValoracio(); return}
});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="vinp"&&e.target.tagName==="INPUT"){e.preventDefault();vNext()}});

/* ---------- client: rutina en esborrany (no la veu fins que l'entrenador la valida) ---------- */
function draftHidden(){
  if(!IS_CLIENT()||CV()) return false;
  const p=planDoc(), ik=intakeDoc();
  if(p) return p.status==="esborrany";
  return !!(ik&&+ik.version>=2);
}
function draftWaitCard(){
  valLang=((intakeDoc()||{}).lang)||"ca";
  return `<article class="card stack" style="border:1.5px solid var(--accent)"><span class="lbl">⏳</span><h3 style="margin:0">${VT("Estic preparant la teva rutina")}</h3><p class="sub" style="margin:0">${VT("He rebut la teva valoració. Rebràs un avís quan la tingui llesta. Mentrestant, pesa't cada matí en dejú.")}</p></article>`;
}

/* ---------- entrenador: informe de la valoració (a Resum) ---------- */
function assessCard(doc,open=true){
  const d=doc||intakeDoc(); if(!d||+d.version<2) return null;
  const s=d.assessment||{}, A=s.answers||{}, F=s.flags||[], hi=F.some(f=>f.level==="hi");
  const fq=k=>{const q=vQ(k); return q?esc(vFmtCA(q,A[k])):""};
  const tag=(t,x)=>`<div class="vln"><span class="vtag v-${t}">${{d:"Declarat",i:"Interpretació",f:"Falta"}[t]}</span><span>${x}</span></div>`;
  const unk=VQ.filter(q=>q.t==="single"&&A[q.id]==="nose").map(q=>q.q);
  return `<details class="card" ${open?"open":""}><summary><b>Valoració inicial</b>${F.length?` <span class="pill w">${hi?"Salut: revisar abans de començar":"Salut: tenir en compte"}</span>`:""} <span class="sub" style="font-size:12px">${d.lang==="es"?"· castellà":""}</span></summary><div class="stack" style="gap:10px;margin-top:10px">
    ${tag("d",`${A.sex==="d"?"Dona":"Home"}, ${ageFrom(A.birth)} anys · ${esc(A.cm)} cm · ${esc(String(A.kg).replace(".",","))} kg · ${esc(A.job||"feina no indicada")}`)}
    ${tag("d",`Dia a dia: ${fq("pal")} · horari: ${fq("shift")} · asseguda ${fq("sit")} h`)}
    ${F.length?F.map(f=>`<div class="note" style="${f.level==="hi"?"border-left:3px solid var(--bad)":""}"><b>${esc(f.text)}</b>${f.detail?`<div class="sub">${esc(f.detail)}</div>`:""}</div>`).join(""):`<div class="sub">Sense alertes de salut (PAR-Q+ tot «no»).</div>`}
    ${A.clear?tag("d","Vistiplau mèdic: "+fq("clear")):""}
    ${tag("i",`<b>${esc(s.level||"")}</b>: ${esc((s.levelWhy||[]).join("; "))}`)}
    ${tag("d","Tècnica: "+esc((A.lifts||["–"]).join(", "))+(A.methods?" · ha fet: "+esc(A.methods.join(", ")):""))}
    ${A.noEx&&A.noEx!=="Cap"?tag("d","Evitar: "+esc(A.noEx)):""}
    ${tag("d",`Flexions ${fq("push")} · escales ${fq("stairs")} · peus ${fq("toes")} · equilibri ${fq("bal")} · es valora ${esc(A.selfFit)}/5`)}
    ${tag("f","Sense mesures. Tests per a la primera sessió: flexions màximes, sentadeta a la paret (s), flexibilitat asseguda (cm), equilibri a una cama (s).")}
    ${tag("d",`Son ${fq("sleepH")} h (${esc(A.sleepQ)}/5) · estrès ${esc(A.stress)}/5 · aigua ${fq("water")} · alimentació: ${fq("food")}`)}
    ${tag("d",`Objectiu: <b>${esc(A.goal||"")}</b>${(A.goal2||[]).length?" · després: "+esc(A.goal2.join(", ")):""} · termini ${fq("when")} · compromís ${esc(A.commit)}/10`)}
    ${A.change?tag("d","Vol veure: «"+esc(A.change)+"»"):""}${A.why?tag("d","Per què ara: «"+esc(A.why)+"»"):""}${A.triedx?tag("d","Va fallar: «"+esc(A.triedx)+"»"):""}
    ${tag("d","Obstacles: "+esc((A.barriers||[]).join(", ")))}
    ${tag("i",`<b>${esc(s.suggestedDays)} dies recomanats</b> (${esc((s.suggestedWhy||[]).join("; "))}) · ${esc(A.minutes)} min · ${esc(A.place||"")}${(A.wdays||[]).length?" · prefereix "+esc(A.wdays.join(", ")):""}${(A.equip||[]).length?" · material: "+esc(A.equip.join(", ")):""} · estil: ${esc(A.style||"")}`)}
    ${unk.length?tag("f","«No ho sé»: "+esc(unk.join(" · "))):""}
    ${A.notes?tag("d","Notes: "+esc(A.notes)):""}
  </div></details>`;
}
const vFmtCA=(q,v)=>{const l=valLang; valLang="ca"; const r=vFmt(q,v); valLang=l; return r};

/* ---------- entrenador: rutina en esborrany → validar i enviar ---------- */
let draftMsg=null, draftFor=null;
function planDraftCard(){
  if(!CV()) return ""; const p=planDoc(); if(!p||p.status!=="esborrany") return "";
  const v=QStore.viewing||{}, n=String(v.name||"").trim().split(" ")[0], ik=intakeDoc()||{}, es=ik.lang==="es";
  if(draftFor!==v.id){draftFor=v.id; draftMsg=es?`¡Hola ${n}! He revisado tu valoración y aquí tienes tu rutina y tu pauta. Las primeras semanas, prioriza la técnica y deja siempre 2-3 repeticiones en la recámara. ¡Vamos! 💪`
    :`Hola ${n}! He revisat la teva valoració i aquí tens la teva rutina i la teva pauta. Les primeres setmanes, prioritza la tècnica i deixa't sempre 2-3 repeticions a la recambra. Som-hi! 💪`}
  const nut=(S.nutrition||[]).find(x=>x.provisional);
  return `<article class="card stack" style="border:2px solid var(--accent)"><span class="lbl">Rutina en esborrany · ${esc(n||"el client")} encara no la veu</span>
    <div><b>${esc(p.split||"")}</b> · ${esc(p.days||"")} dies · fins a ${esc(p.setsPerSession||"")} sèries per sessió</div>
    <div class="sub" style="font-size:13px">${esc(p.rir||"")}</div>
    ${(p.flags||[]).length?`<ul class="tips">${p.flags.map(f=>`<li>⚠️ ${esc(f)}</li>`).join("")}</ul>`:""}
    ${nut?`<div><b>Pauta:</b> ${esc(nut.title||nut.phase||"")} · ${esc((nut.meals||[]).length)} àpats</div>`:""}
    <ol class="sub" style="margin:0;padding-left:20px;font-size:14px;line-height:1.5"><li>Llegeix la valoració (a sota).</li><li>Adapta la <a href="#rutines">rutina</a> i la <a href="#pauta">pauta</a> al que ha demanat: és un punt de partida, no la rutina final.</li><li>Retoca el missatge i prem Validar i enviar.</li></ol>
    <label class="f"><span class="lbl">Missatge de benvinguda${es?" (en castellà)":""}</span><textarea id="draft-msg" rows="5">${esc(draftMsg)}</textarea></label>
    <button class="good" id="draft-ok" style="height:52px">✅ Validar i enviar a ${esc(n||"el client")}</button></article>`;
}
document.addEventListener("input",e=>{if(e.target.id==="draft-msg") draftMsg=e.target.value});
document.addEventListener("click",async e=>{
  const b=e.target.closest("#draft-ok"); if(!b||!db||!CV()) return; b.disabled=true;
  const msg=String(draftMsg||"").trim(), ik=intakeDoc()||{}, now=new Date().toISOString();
  try{
    for(const x of (S.nutrition||[]).filter(x=>x.provisional)) await db.collection("nutrition").doc(x.id).update({provisional:false});
    if(msg) await db.collection("reports").doc("benvinguda").set({week:todayISO(),title:ik.lang==="es"?"Tu rutina está lista":"La teva rutina ja està llesta",text:msg,from:"coach",createdAt:now});
    await db.collection("programs").doc("inicial").update({status:"revisat",reviewedAt:now,via:"coach",welcome:msg});
    toast("Enviada: el client ja veu la rutina i rep l'avís"); draftFor=null; render();
  }catch(err){b.disabled=false; toast("No s'ha pogut enviar: "+err.message)}
});
