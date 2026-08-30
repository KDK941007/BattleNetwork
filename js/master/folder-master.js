(()=>{
  const root=window.BattleNetworkData=window.BattleNetworkData||{};

  const FOLDER_MASTER=[
    {
      folderId:'INITIAL_FOLDER',
      folderName:'初期フォルダ',
      sourceName:'EXE4 Folder1',
      editableFlg:true,
      defaultFlg:true
    }
  ];

  // Rockman EXE4 Folder1 (30 chips)
  // Source: The Rockman EXE Zone Wiki / Folders (MMBN4)
  const FOLDER_CHIP_RELATION=[
    {folderId:'INITIAL_FOLDER',slotNo:1,chipId:'CHIP_0001',codeId:'A'},
    {folderId:'INITIAL_FOLDER',slotNo:2,chipId:'CHIP_0001',codeId:'A'},
    {folderId:'INITIAL_FOLDER',slotNo:3,chipId:'CHIP_0001',codeId:'B'},
    {folderId:'INITIAL_FOLDER',slotNo:4,chipId:'CHIP_0001',codeId:'B'},
    {folderId:'INITIAL_FOLDER',slotNo:5,chipId:'CHIP_EXE4_S004',codeId:'A'},
    {folderId:'INITIAL_FOLDER',slotNo:6,chipId:'CHIP_EXE4_S004',codeId:'A'},
    {folderId:'INITIAL_FOLDER',slotNo:7,chipId:'CHIP_EXE4_S004',codeId:'A'},
    {folderId:'INITIAL_FOLDER',slotNo:8,chipId:'CHIP_EXE4_S005',codeId:'V'},
    {folderId:'INITIAL_FOLDER',slotNo:9,chipId:'CHIP_EXE4_S005',codeId:'V'},
    {folderId:'INITIAL_FOLDER',slotNo:10,chipId:'CHIP_EXE4_S005',codeId:'V'},
    {folderId:'INITIAL_FOLDER',slotNo:11,chipId:'CHIP_0004',codeId:'B'},
    {folderId:'INITIAL_FOLDER',slotNo:12,chipId:'CHIP_0004',codeId:'B'},
    {folderId:'INITIAL_FOLDER',slotNo:13,chipId:'CHIP_0004',codeId:'L'},
    {folderId:'INITIAL_FOLDER',slotNo:14,chipId:'CHIP_0004',codeId:'L'},
    {folderId:'INITIAL_FOLDER',slotNo:15,chipId:'CHIP_0002',codeId:'S'},
    {folderId:'INITIAL_FOLDER',slotNo:16,chipId:'CHIP_0002',codeId:'S'},
    {folderId:'INITIAL_FOLDER',slotNo:17,chipId:'CHIP_0002',codeId:'S'},
    {folderId:'INITIAL_FOLDER',slotNo:18,chipId:'CHIP_0002',codeId:'S'},
    {folderId:'INITIAL_FOLDER',slotNo:19,chipId:'CHIP_0003',codeId:'S'},
    {folderId:'INITIAL_FOLDER',slotNo:20,chipId:'CHIP_0003',codeId:'S'},
    {folderId:'INITIAL_FOLDER',slotNo:21,chipId:'CHIP_EXE4_S106',codeId:'*'},
    {folderId:'INITIAL_FOLDER',slotNo:22,chipId:'CHIP_EXE4_S106',codeId:'*'},
    {folderId:'INITIAL_FOLDER',slotNo:23,chipId:'CHIP_EXE4_S106',codeId:'*'},
    {folderId:'INITIAL_FOLDER',slotNo:24,chipId:'CHIP_0005',codeId:'A'},
    {folderId:'INITIAL_FOLDER',slotNo:25,chipId:'CHIP_0005',codeId:'A'},
    {folderId:'INITIAL_FOLDER',slotNo:26,chipId:'CHIP_0005',codeId:'L'},
    {folderId:'INITIAL_FOLDER',slotNo:27,chipId:'CHIP_0005',codeId:'L'},
    {folderId:'INITIAL_FOLDER',slotNo:28,chipId:'CHIP_EXE4_S119',codeId:'S'},
    {folderId:'INITIAL_FOLDER',slotNo:29,chipId:'CHIP_EXE4_S148',codeId:'*'},
    {folderId:'INITIAL_FOLDER',slotNo:30,chipId:'CHIP_EXE4_S148',codeId:'*'}
  ];

  Object.assign(root,{FOLDER_MASTER,FOLDER_CHIP_RELATION});
})();
