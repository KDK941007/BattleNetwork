(()=>{
  if(!('serviceWorker' in navigator)) return;
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading)return;
    reloading=true;
    window.location.reload();
  });
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('./sw.js?v=167',{scope:'./',updateViaCache:'none'});
      await registration.update();
    }catch(error){
      console.warn(error);
    }
  });
})();