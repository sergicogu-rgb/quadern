/* Pantalla d'entrada motivadora (2026-11-27, VSCOMA_07): compte enrere 3-2-1 «Som-hi!» mentre l'app carrega.
   No fa esperar: app.js la treu quan ja hi ha la primera pantalla pintada (nxSplashOff). Seguretat: es treu sola als 12 s. */
(function(){
  const F=["Avui, millor que ahir.","Cada sèrie compta.","La constància guanya al talent.","El teu jo del futur t'ho agrairà.","Un entrenament més a prop del teu objectiu.","Disciplina avui, resultats demà.","Fes-ho per tu."];
  const el=document.getElementById("splash"); if(!el) return;
  const p=el.querySelector(".sp-f"); if(p) p.textContent=F[Math.floor(Math.random()*F.length)];
  let off=false;
  window.nxSplashOff=function(){ if(off) return; off=true; el.classList.add("out"); setTimeout(()=>{el.hidden=true},300); };
  setTimeout(window.nxSplashOff,12000);
})();
