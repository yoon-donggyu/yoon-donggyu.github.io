/* v7 room membership guard, verified seating, roster, landscape state */
(function(){
  const baseRenderLobby=renderLobby;
  renderLobby=function(member){
    const body=baseRenderLobby(member);
    const ps=Array.isArray(state?.players)?state.players:[];
    const roster=`<aside class="room-roster"><div class="roster-title"><b>입장 중</b><span>${ps.length}명</span></div><div class="roster-list">${ps.length?ps.map(p=>{const mine=p.playerId===state?.me?.playerId;const seat=p.seatNo?`Seat ${p.seatNo}`:'대기 중';return `<div class="roster-person ${p.connected?'online':''}"><i class="roster-dot"></i><div class="roster-name"><b class="${mine?'roster-me':''}">${esc(p.displayName)}${mine?' · 나':''}</b><small>${p.connected?'접속 중':'연결 확인 중'}</small></div><span class="roster-seat">${seat}</span></div>`}).join(''):'<div class="roster-empty">아직 입장자가 없습니다.</div>'}</div></aside>`;
    return `<div class="lobby-shell-grid"><div class="lobby-main">${body}</div>${roster}</div>`;
  };

  loadRoom=async function(quiet=true){
    const code=routeCode();
    if(!code)return renderHome();
    if(!token){renderInvite(code);return}
    try{
      const j=await api({op:'state',code});
      state=j.state;
      const member=state?.players?.find(p=>p.playerId===state?.me?.playerId);
      if(!member){
        stopPoll();
        setNet(false);
        renderInvite(code);
        return;
      }
      setNet(false);
      renderRoom();
      startPoll();
    }catch(e){
      if(e.code==='SESSION_INVALID'){
        setToken('');
        renderInvite(code);
      }else if(!quiet){
        app.innerHTML=`<main class="center"><section class="card"><p class="error">${esc(e.message)}</p><button class="btn secondary" id="homeAfterError">홈으로</button></section></main>`;
        document.getElementById('homeAfterError')?.addEventListener('click',()=>{history.pushState({},'',location.pathname);renderHome()});
      }else setNet(true);
    }
  };

  let seatPendingV7=false;
  wireLobby=function(member){
    const copy=document.getElementById('copyCode');
    if(copy)copy.onclick=()=>copyText(state.room.code);
    document.querySelectorAll('.seat-choice[data-seat]').forEach(btn=>{
      if(btn.disabled)return;
      btn.style.touchAction='manipulation';
      const seatNo=Number(btn.dataset.seat);
      const takeSeat=async ev=>{
        ev?.preventDefault?.();ev?.stopPropagation?.();
        if(seatPendingV7||busy||!Number.isInteger(seatNo))return;
        seatPendingV7=true;busy=true;stopPoll();btn.disabled=true;
        const label=btn.querySelector('b'),old=label?.textContent||'앉기';
        if(label)label.textContent='앉는 중…';
        try{
          await api({op:'seat',code:state.room.code,seatNo});
          const verify=await api({op:'state',code:state.room.code});
          const verified=verify?.state?.players?.find(p=>p.playerId===verify?.state?.me?.playerId);
          if(!verified||Number(verified.seatNo)!==seatNo)throw new Error('서버 좌석 반영 실패');
          state=verify.state;
          showToast(`Seat ${seatNo} 착석 완료`);
          renderRoom();
        }catch(e){
          if(label)label.textContent=old;
          btn.disabled=false;
          showToast(`착석 실패 · ${e.message||'다시 시도해주세요.'}`);
          try{await loadRoom(true)}catch{}
        }finally{
          busy=false;seatPendingV7=false;startPoll();
        }
      };
      btn.addEventListener('pointerup',takeSeat,{passive:false});
      btn.addEventListener('click',ev=>{if(ev.detail===0)takeSeat(ev)});
    });
    const start=document.getElementById('startHand');
    if(start)start.onclick=()=>command({op:'start',code:state.room.code});
  };

  const baseRenderRoomV7=renderRoom;
  renderRoom=function(){
    baseRenderRoomV7();
    const me=state?.players?.find(p=>p.playerId===state?.me?.playerId);
    document.body.classList.toggle('game-active',Boolean(me?.seatNo&&state?.hand));
  };
  window.addEventListener('orientationchange',()=>setTimeout(()=>{if(state)renderRoom()},120));
  window.addEventListener('resize',()=>{if(state&&document.body.classList.contains('game-active'))document.body.classList.toggle('landscape-now',innerWidth>innerHeight)});
})();
