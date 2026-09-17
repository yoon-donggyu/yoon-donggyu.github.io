/* v12 consolidated room runtime: roster, verified seating, race-safe polling, landscape. */
(function(){
  const stableStateSignature=s=>{try{return s?JSON.stringify(s):''}catch{return ''}};
  let lastRenderedSignature=state?stableStateSignature(state):'';
  let loadSeq=0;
  let appliedSeq=0;
  let seatPending=false;
  let nativeLandscapeLocked=false;
  let nativeLandscapeAttempted=false;

  function memberOf(s=state){return s?.players?.find?.(p=>p.playerId===s?.me?.playerId)||null}
  function inRoom(){return Boolean(routeCode?.()&&state?.room&&memberOf())}
  function portrait(){return window.innerHeight>window.innerWidth}

  function resetRuntimeView(){
    lastRenderedSignature='';
    nativeLandscapeLocked=false;
    nativeLandscapeAttempted=false;
    document.documentElement.classList.remove('virtual-landscape');
    document.body.classList.remove('virtual-landscape','room-landscape','game-active','landscape-now');
  }

  function applyLandscapeClass(){
    const active=inRoom();
    document.body.classList.toggle('room-landscape',active);
    const virtual=active&&portrait()&&!nativeLandscapeLocked;
    document.documentElement.classList.toggle('virtual-landscape',virtual);
    document.body.classList.toggle('virtual-landscape',virtual);
    document.body.classList.toggle('landscape-now',active&&!portrait());
  }

  async function tryNativeLandscape(){
    if(!inRoom()||nativeLandscapeLocked)return;
    nativeLandscapeAttempted=true;
    try{
      if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
        try{await document.documentElement.requestFullscreen({navigationUI:'hide'})}catch{}
      }
      if(screen.orientation?.lock){
        await screen.orientation.lock('landscape');
        nativeLandscapeLocked=true;
      }
    }catch{}
    applyLandscapeClass();
  }

  async function shareKakaoInvite(){
    const code=state?.room?.code;
    if(!code)return;
    const url=`${location.origin}${location.pathname}?room=${code}`;
    const title=`${state?.room?.name||'Hold\'em'} 초대`;
    const text=`홀덤 방에 초대합니다.\n방 코드: ${code}`;
    try{
      if(navigator.share){
        await navigator.share({title,text,url});
      }else{
        await copyText(url);
        showToast('초대 링크를 복사했습니다. 카카오톡에 붙여넣어 주세요.');
      }
    }catch(e){
      if(e?.name!=='AbortError'){
        await copyText(url);
        showToast('초대 링크를 복사했습니다.');
      }
    }
  }

  const baseRenderLobby=renderLobby;
  renderLobby=function(member){
    let body=baseRenderLobby(member)
      .replaceAll('>앉기<','>준비<')
      .replaceAll('>빈 자리<','>대기<')
      .replace('2명 이상 착석하면 시작할 수 있습니다.','2명 이상 준비하면 시작할 수 있습니다.');

    body=body.replace(
      '</div><div class="lobby-settings">',
      '</div><button id="kakaoShare" class="btn" style="width:100%;height:44px;margin:8px 0 10px;background:#FEE500;color:#191919;border:1px solid rgba(0,0,0,.08);font-weight:800;box-shadow:0 8px 22px rgba(0,0,0,.18)">💬 카카오톡 공유</button><div class="lobby-settings">'
    );

    const ps=Array.isArray(state?.players)?state.players:[];
    const roster=`<aside class="room-roster"><div class="roster-title"><b>입장 중</b><span>${ps.length}명</span></div><div class="roster-list">${ps.length?ps.map(p=>{const mine=p.playerId===state?.me?.playerId;const seat=p.seatNo?`준비 · ${p.seatNo}번`:'대기 중';return `<div class="roster-person ${p.connected?'online':''}"><i class="roster-dot"></i><div class="roster-name"><b class="${mine?'roster-me':''}">${esc(p.displayName)}${mine?' · 나':''}</b><small>${p.connected?'접속 중':'연결 확인 중'}</small></div><span class="roster-seat">${seat}</span></div>`}).join(''):'<div class="roster-empty">아직 입장자가 없습니다.</div>'}</div></aside>`;
    return `<div class="lobby-shell-grid"><div class="lobby-main">${body}</div>${roster}</div>`;
  };

  wireLobby=function(member){
    const copy=document.getElementById('copyCode');
    if(copy)copy.onclick=()=>copyText(state.room.code);
    const kakao=document.getElementById('kakaoShare');
    if(kakao)kakao.onclick=shareKakaoInvite;

    document.querySelectorAll('.seat-choice[data-seat]').forEach(btn=>{
      if(btn.disabled)return;
      btn.style.touchAction='manipulation';
      const seatNo=Number(btn.dataset.seat);
      const takeSeat=async ev=>{
        ev?.preventDefault?.();ev?.stopPropagation?.();
        if(seatPending||busy||!Number.isInteger(seatNo))return;
        seatPending=true;busy=true;stopPoll();btn.disabled=true;
        const label=btn.querySelector('b'),old=label?.textContent||'준비';
        if(label)label.textContent='준비 중…';
        try{
          await api({op:'seat',code:state.room.code,seatNo});
          const verify=await api({op:'state',code:state.room.code});
          const verified=memberOf(verify?.state);
          if(!verified||Number(verified.seatNo)!==seatNo)throw new Error('서버 준비 상태 반영 실패');
          state=verify.state;
          lastRenderedSignature=stableStateSignature(state);
          renderRoom();
          showToast(`${seatNo}번 자리 준비 완료`);
        }catch(e){
          if(label)label.textContent=old;
          btn.disabled=false;
          showToast(`준비 실패 · ${e.message||'다시 시도해주세요.'}`);
          try{await loadRoom(true)}catch{}
        }finally{
          busy=false;seatPending=false;startPoll();
        }
      };
      btn.addEventListener('pointerup',takeSeat,{passive:false});
      btn.addEventListener('click',ev=>{if(ev.detail===0)takeSeat(ev)});
    });
    const start=document.getElementById('startHand');
    if(start)start.onclick=()=>command({op:'start',code:state.room.code});
  };

  loadRoom=async function(quiet=true){
    const code=routeCode();
    if(!code)return renderHome();
    if(!token){renderInvite(code);return}
    const seq=++loadSeq;
    try{
      const j=await api({op:'state',code});
      if(seq<appliedSeq)return;
      const next=j.state;
      const member=memberOf(next);
      if(!member){
        appliedSeq=seq;state=null;lastRenderedSignature='';stopPoll();setNet(false);renderInvite(code);return;
      }
      appliedSeq=seq;
      const nextSignature=stableStateSignature(next);
      const needsRender=!state||nextSignature!==lastRenderedSignature;
      state=next;
      setNet(false);
      if(needsRender){
        renderRoom();
        lastRenderedSignature=nextSignature;
      }else{
        applyLandscapeClass();
      }
      startPoll();
    }catch(e){
      if(seq<appliedSeq)return;
      if(e.code==='SESSION_INVALID'){
        appliedSeq=seq;setToken('');state=null;lastRenderedSignature='';stopPoll();renderInvite(code);
      }else if(e.code==='ROOM_NOT_JOINED'||e.code==='ROOM_NOT_FOUND'){
        appliedSeq=seq;state=null;lastRenderedSignature='';stopPoll();setNet(false);renderInvite(code);
      }else if(!quiet){
        app.innerHTML=`<main class="center"><section class="card"><p class="error">${esc(e.message)}</p><button class="btn secondary" id="homeAfterError">홈으로</button></section></main>`;
        document.getElementById('homeAfterError')?.addEventListener('click',()=>{history.pushState({},'',location.pathname);renderHome()});
      }else setNet(true);
    }
  };

  const baseRenderRoom=renderRoom;
  renderRoom=function(){
    baseRenderRoom();
    const me=memberOf();
    document.body.classList.toggle('game-active',Boolean(me?.seatNo&&state?.hand));
    applyLandscapeClass();
  };

  const baseRenderHome=renderHome;
  renderHome=function(){resetRuntimeView();baseRenderHome()};
  const baseRenderInvite=renderInvite;
  renderInvite=function(code){resetRuntimeView();baseRenderInvite(code)};

  document.addEventListener('pointerup',()=>{if(inRoom())tryNativeLandscape()},{capture:true,passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(applyLandscapeClass,120));
  window.addEventListener('resize',()=>setTimeout(applyLandscapeClass,60));
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement&&nativeLandscapeLocked){nativeLandscapeLocked=false;applyLandscapeClass()}
  });
  setTimeout(()=>{if(inRoom()&&!nativeLandscapeAttempted)tryNativeLandscape();else applyLandscapeClass()},250);
})();
