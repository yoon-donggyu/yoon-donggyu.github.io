/* v17: move game status into the top header and keep table space clear. */
(function(){
  function statusInfo(){
    const h=state?.hand;
    if(!h)return null;
    if(state?.room?.status==='PAUSED')return {text:'게임 일시정지',cls:'paused'};
    if(h.street==='HAND_COMPLETE')return {text:'다음 Hand를 준비 중…',cls:''};
    const mine=h.currentActorPlayerId===state?.me?.playerId;
    if(mine){
      const a=state?.private?.allowedActions;
      return {text:a?'내 차례 · 액션을 선택하세요':'액션 정보를 불러오는 중…',cls:'my-turn'};
    }
    return {text:'상대방의 액션을 기다리는 중…',cls:''};
  }

  function decorateV17(){
    const header=document.querySelector('.game-header');
    if(!header)return;
    const info=statusInfo();
    let el=header.querySelector('.game-state-center-v17');
    if(!info){el?.remove();return;}
    if(!el){
      el=document.createElement('div');
      el.className='game-state-center-v17';
      const actions=header.querySelector('.header-actions');
      if(actions)header.insertBefore(el,actions);else header.appendChild(el);
    }
    el.textContent=info.text;
    el.className=`game-state-center-v17 ${info.cls||''}`.trim();
    document.querySelectorAll('.waitbar').forEach(x=>x.setAttribute('aria-hidden','true'));
  }

  const baseRenderRoomV17=renderRoom;
  renderRoom=function(){
    baseRenderRoomV17();
    decorateV17();
  };

  window.addEventListener('orientationchange',()=>setTimeout(decorateV17,140));
  window.addEventListener('resize',()=>setTimeout(decorateV17,80));
  setTimeout(()=>{if(state)decorateV17()},0);
})();
