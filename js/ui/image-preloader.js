(()=>{
  const IMAGE_EXT=/\.(?:png|webp|jpe?g|gif|avif|svg)(?:[?#].*)?$/i;
  const pending=new Map();

  function absoluteUrl(src){
    if(!src||typeof src!=='string')return null;
    try{return new URL(src,document.baseURI).href}catch{return null}
  }

  function preloadOne(src){
    const absolute=absoluteUrl(src);
    if(!absolute||!IMAGE_EXT.test(absolute))return Promise.resolve({src:absolute,ok:false,skipped:true});
    if(pending.has(absolute))return pending.get(absolute);

    const promise=new Promise(resolve=>{
      const image=new Image();
      image.decoding='async';
      image.onload=()=>{
        const decoded=typeof image.decode==='function'?image.decode().catch(()=>{}):Promise.resolve();
        decoded.finally(()=>resolve({src:absolute,ok:true}));
      };
      image.onerror=()=>resolve({src:absolute,ok:false});
      image.src=absolute;
    });
    pending.set(absolute,promise);
    return promise;
  }

  function preload(urls){
    const unique=[...new Set((urls||[]).map(absoluteUrl).filter(Boolean))];
    return Promise.all(unique.map(preloadOne));
  }

  function urlsFromCssText(text){
    const urls=[];
    const regex=/url\(\s*(["']?)(.*?)\1\s*\)/g;
    let match;
    while((match=regex.exec(String(text||'')))){
      const src=match[2];
      if(src&&!src.startsWith('data:')&&IMAGE_EXT.test(src))urls.push(src);
    }
    return urls;
  }

  function collectCssImageUrls(){
    const urls=[];
    const visitRules=rules=>{
      for(const rule of rules||[]){
        if(rule.cssRules){visitRules(rule.cssRules);continue}
        urls.push(...urlsFromCssText(rule.cssText));
      }
    };
    for(const sheet of document.styleSheets){
      try{visitRules(sheet.cssRules)}catch{}
    }
    return urls;
  }

  function collectElementImageUrls(root){
    if(!root)return [];
    const urls=[];
    const elements=[];
    if(root.nodeType===1)elements.push(root);
    if(root.querySelectorAll)elements.push(...root.querySelectorAll('img,source,[style]'));
    for(const element of elements){
      if(element.tagName==='IMG'){
        const src=element.currentSrc||element.getAttribute('src');
        if(src)urls.push(src);
      }
      if(element.tagName==='SOURCE'){
        const srcset=element.getAttribute('srcset');
        if(srcset)srcset.split(',').forEach(part=>{const src=part.trim().split(/\s+/)[0];if(src)urls.push(src)});
      }
      const style=element.getAttribute?.('style');
      if(style)urls.push(...urlsFromCssText(style));
    }
    return urls;
  }

  function collectActiveFolderImageUrls(){
    const folder=window.BattleNetworkFolder;
    const master=window.BattleNetworkMaster;
    if(!folder?.toLegacyCards||!master?.getChipImagePath)return [];
    try{
      return folder.toLegacyCards()
        .map(card=>card?.chipId?master.getChipImagePath(card.chipId):null)
        .filter(Boolean);
    }catch{return []}
  }

  function collectAttributeImageUrls(){
    return (window.BattleNetworkData?.CHIP_ATTRIBUTE_MASTER||[])
      .map(row=>row?.iconPath)
      .filter(Boolean);
  }

  const kokoroImages=[
    './assets/ui/kokoro-normal.webp?v=2',
    './assets/ui/kokoro-fullsynchro.webp?v=3',
    './assets/ui/kokoro-anxious.webp',
    './assets/ui/kokoro-angry.webp',
    './assets/ui/kokoro-evil.webp'
  ];

  const gateStyle=document.createElement('style');
  gateStyle.id='battleNetworkImagePreloadGate';
  gateStyle.textContent='#customModal.open{visibility:hidden}html[data-critical-images-ready="true"] #customModal.open{visibility:visible}';
  document.head.appendChild(gateStyle);

  const criticalUrls=[
    ...kokoroImages,
    ...collectCssImageUrls(),
    ...collectActiveFolderImageUrls(),
    ...collectAttributeImageUrls()
  ];

  const ready=preload(criticalUrls).finally(()=>{
    document.documentElement.dataset.criticalImagesReady='true';
  });

  const observer=new MutationObserver(records=>{
    const urls=[];
    for(const record of records){
      if(record.type==='childList'){
        for(const node of record.addedNodes)urls.push(...collectElementImageUrls(node));
      }else if(record.type==='attributes'){
        urls.push(...collectElementImageUrls(record.target));
      }
    }
    if(urls.length)preload(urls);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset','style']});

  window.BattleNetworkImagePreloader=Object.freeze({
    ready,
    preload,
    preloadOne,
    preloadElement:root=>preload(collectElementImageUrls(root)),
    preloadCssImages:()=>preload(collectCssImageUrls()),
    destroy(){observer.disconnect()}
  });
})();
