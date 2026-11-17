/* NEXFORM · fotos orientatives dels exercicis (inici i final del moviment).
   Font: Free Exercise DB (github.com/yuhonas/free-exercise-db), domini públic (Unlicense). Imatges a ex/<slug>-0|1.webp.
   Clau = nom de l'exercici en minúscules; el 2n valor és 1 si la foto és d'un exercici semblant (no la mateixa màquina).
   La foto pròpia de l'exercici (ex.photo) sempre té prioritat. */
window.EX_IMG={
"abductors a màquina": [
"thigh-abductor",
0
],
"adductors a màquina": [
"thigh-adductor",
0
],
"adductors assegut a màquina": [
"thigh-adductor",
0
],
"creuat de tríceps a politja alta": [
"cable-one-arm-tricep-extension",
1
],
"crunch a màquina": [
"ab-crunch-machine",
0
],
"crunch a politja": [
"cable-crunch",
0
],
"crunch abdominal a màquina": [
"ab-crunch-machine",
0
],
"crunch abdominal a politja amb corda": [
"cable-crunch",
0
],
"curl bayesian a politja": [
"standing-one-arm-cable-curl",
1
],
"curl de bíceps a màquina (predicador)": [
"machine-preacher-curls",
0
],
"curl de bíceps amb barra recta": [
"barbell-curl",
0
],
"curl de bíceps dret a politja": [
"standing-biceps-cable-curl",
0
],
"curl femoral assegut": [
"seated-leg-curl",
0
],
"curl femoral estirat": [
"lying-leg-curls",
0
],
"curl predicador unilateral amb manuella": [
"one-arm-dumbbell-preacher-curl",
0
],
"dominades supines llastrades": [
"chin-up",
0
],
"elevacions laterals a màquina": [
"side-lateral-raise",
1
],
"elevacions laterals a politja": [
"cable-seated-lateral-raise",
1
],
"elevacions laterals amb manuelles": [
"side-lateral-raise",
0
],
"elevacions laterals unilaterals a politja": [
"cable-seated-lateral-raise",
1
],
"elevació de talons a màquina (bessons)": [
"standing-calf-raises",
0
],
"extensió de quàdriceps": [
"leg-extensions",
0
],
"extensió de tríceps a politja alta": [
"triceps-pushdown",
0
],
"extensió de tríceps per sobre del cap a politja": [
"cable-rope-overhead-triceps-extension",
0
],
"hack squat (jaca)": [
"hack-squat",
0
],
"hack squat (màquina)": [
"hack-squat",
0
],
"hip thrust a màquina": [
"barbell-hip-thrust",
1
],
"hiperextensions a 45° (glutis i isquios)": [
"hyperextensions-back-extensions",
0
],
"jaló al pit agafada ampla": [
"wide-grip-lat-pulldown",
0
],
"jaló al pit agafada ampla prona": [
"wide-grip-lat-pulldown",
0
],
"jaló al pit agafada neutra": [
"v-bar-pulldown",
0
],
"kazz press a multipower": [
"smith-machine-close-grip-bench-press",
1
],
"leg curl assegut a màquina": [
"seated-leg-curl",
0
],
"leg curl estirat a màquina": [
"lying-leg-curls",
0
],
"leg extension assegut": [
"leg-extensions",
0
],
"leg extension unilateral a màquina": [
"single-leg-leg-extension",
0
],
"obertures a peck deck": [
"butterfly",
0
],
"peck deck (obertures)": [
"butterfly",
0
],
"peck deck panatta (pectoral inferior)": [
"butterfly",
1
],
"pes mort convencional": [
"barbell-deadlift",
0
],
"pes mort romanès": [
"romanian-deadlift",
0
],
"premsa de cames": [
"leg-press",
0
],
"premsa de cames de discs": [
"leg-press",
0
],
"press d'espatlles a màquina": [
"machine-shoulder-military-press",
0
],
"press de pit a màquina": [
"leverage-chest-press",
0
],
"press francès panatta assegut": [
"machine-triceps-extension",
1
],
"press inclinat a màquina": [
"leverage-incline-chest-press",
0
],
"press militar assegut a màquina, agafada prona": [
"machine-shoulder-military-press",
0
],
"press militar assegut amb manuelles": [
"dumbbell-shoulder-press",
0
],
"press pla (lleugerament declinat)": [
"leverage-decline-chest-press",
0
],
"rem alt agafada ampla prona": [
"leverage-high-row",
0
],
"rem amb colzes oberts a màquina": [
"leverage-iso-row",
1
],
"rem amb pit recolzat (màquina)": [
"lying-t-bar-row",
1
],
"rem assegut a politja": [
"seated-cable-rows",
0
],
"rem gironda unilateral semiagenollat": [
"seated-one-arm-cable-pulley-rows",
1
],
"sentadilla pendular": [
"hack-squat",
1
],
"tríceps unilateral a politja alta": [
"cable-one-arm-tricep-extension",
0
]
};
window.exStock=function(ex){if(!ex||!ex.name)return null;const k=String(ex.name).trim().toLowerCase().replace(/\s+/g," ");const v=window.EX_IMG[k];return v?{a:"ex/"+v[0]+"-0.webp",b:"ex/"+v[0]+"-1.webp",approx:!!v[1]}:null};
