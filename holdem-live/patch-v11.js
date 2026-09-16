/* v11 automatic landscape behavior + virtual-landscape fallback. */
(function(){
  let nativeLandscapeLocked=false;
  let nativeLandscapeAttempted=false;

  function roomMember(){
    return state?.players?.find?.(p=>p.playerId===state?.me?.playerId)||null;
  }
  function inRoom(){return Boolean(routeCode?.()&&state?.room&&roomMember())}
  function portrait(){return window.innerHeight>window.innerWidth}

  function applyLandscapeClass(){
    const active=inRoom();
    document.body.classList.toggle('room-landscape',active);
    const shouldVirtual=active&&portrait()&&!nativeLandscapeLocked;
    document.documentElement.classList.toggle('virtual-landscape',shouldVirtual);
    document.body.classList.toggle('virtual-landscape',shouldVirtual);
  }

  async function tryNativeLandscape(){
    if(!inRoom()||nativeLandscapeLocked)return;
    nativeLandscapeAttempted=true;
    try{
      if(document.documentElement.requestFullscreen && !document.fullscreenElement){
        try{await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch{}
      }
      if(screen.orientation?.lock){
        await screen.orientation.lock('landscape');
        nativeLandscapeLocked=true;
      }
    }catch{}
    applyLandscapeClass();
  }

  const baseRenderRoomV11=renderRoom;
  renderRoom=function(){
    baseRenderRoomV11();
    applyLandscapeClass();
  };

  const baseRenderHomeV11=renderHome;
  renderHome=function(){
    nativeLandscapeLocked=false;
    document.documentElement.classList.remove('virtual-landscape');
    document.body.classList.remove('virtual-landscape','room-landscape');
    baseRenderHomeV11();
  };

  const baseRenderInviteV11=renderInvite;
  renderInvite=function(code){
    document.documentElement.classList.remove('virtual-landscape');
    document.body.classList.remove('virtual-landscape','room-landscape');
    baseRenderInviteV11(code);
  };

  /* Orientation lock is only permitted from a user gesture on many browsers. Any tap in a room retries it. */
  document.addEventListener('pointerup',()=>{
    if(inRoom())tryNativeLandscape();
  },{capture:true,passive:true});

  window.addEventListener('orientationchange',()=>setTimeout(applyLandscapeClass,120));
  window.addEventListener('resize',()=>setTimeout(applyLandscapeClass,60));
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement && nativeLandscapeLocked){
      nativeLandscapeLocked=false;
      applyLandscapeClass();
    }
  });

  /* Best-effort automatic attempt; gesture retry handles browsers that reject this first call. */
  setTimeout(()=>{if(inRoom()&&!nativeLandscapeAttempted)tryNativeLandscape();else applyLandscapeClass()},250);
})();
