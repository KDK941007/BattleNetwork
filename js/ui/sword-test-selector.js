(()=>{
  // Sword / WideSword / LongSword の実機確認は完了済み。
  // 確認用UIおよびフォルダ差し替え処理は無効化する。
  window.BattleNetworkSwordTestSelector=Object.freeze({
    version:'SWORD_TEST_SELECTOR_DISABLED_AFTER_APPROVAL',
    getSelected:()=>null,
    getTestTarget:()=>Object.freeze({enabled:false})
  });
})();
