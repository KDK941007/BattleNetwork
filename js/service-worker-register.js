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
      const review=document.createElement('script');
      review.src='./js/ui/attack-effect-review.js?v=182';
      review.async=false;
      document.body.appendChild(review);
      const sword=document.createElement('script');
      sword.src='./js/ui/sword-effect-direct.js?v=1';
      sword.async=false;
      document.body.appendChild(sword);
      const registration=await navigator.serviceWorker.register('./sw.js?v=182',{scope:'./',updateViaCache:'none'});
      await registration.update();
    }catch(error){
      console.warn(error);
    }
  });
})();