export function setupPageControls({detailPanel,detailButton,onLayoutChange=()=>{}}={}){
  const fullscreenButton=document.querySelector('#fullscreen-toggle');
  const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
  async function toggleFullscreen(){
    try{
      if(fullscreenElement())await (document.exitFullscreen?.()||document.webkitExitFullscreen?.());
      else await (document.documentElement.requestFullscreen?.()||document.documentElement.webkitRequestFullscreen?.());
    }catch{fullscreenButton.textContent='全屏不可用'}
  }
  function syncFullscreen(){
    const active=Boolean(fullscreenElement());
    fullscreenButton.textContent=active?'退出全屏':'页面全屏';
    fullscreenButton.setAttribute('aria-pressed',String(active));
    requestAnimationFrame(onLayoutChange);
  }
  fullscreenButton?.addEventListener('click',toggleFullscreen);
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('webkitfullscreenchange',syncFullscreen);
  if(detailPanel&&detailButton){
    const collapseDetail=()=>{
      detailPanel.classList.remove('expanded');
      document.body.classList.remove('detail-zoom');
      detailButton.textContent='放大细节';
      detailButton.setAttribute('aria-expanded','false');
      requestAnimationFrame(onLayoutChange);
    };
    detailButton.addEventListener('click',()=>{
      const expanded=detailPanel.classList.toggle('expanded');
      document.body.classList.toggle('detail-zoom',expanded);
      detailButton.textContent=expanded?'缩小细节':'放大细节';
      detailButton.setAttribute('aria-expanded',String(expanded));
      requestAnimationFrame(onLayoutChange);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&detailPanel.classList.contains('expanded'))collapseDetail();
    });
    new MutationObserver(()=>{if(detailPanel.hidden&&detailPanel.classList.contains('expanded'))collapseDetail()}).observe(detailPanel,{attributes:true,attributeFilter:['hidden']});
  }
  syncFullscreen();
}
