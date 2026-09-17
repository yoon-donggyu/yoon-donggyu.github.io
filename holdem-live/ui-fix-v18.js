/* v18 — authoritative lobby + seat presentation. Keeps game/server logic unchanged. */
(function(){
  function playerStatusText(p){
    if(p?.allIn)return 'ALL-IN';
    if(p?.folded)return 'FOLD';
    if(p?.status==='SIT_OUT')return '자리 비움';
    if(!p?.connected)return '연결 확인 중';
    return 'PLAYING';
  }

  /* Final lobby markup: Kakao share lives only inside the right roster panel. */
  renderLobby=function(member){
    const seated=!!member?.seatNo;
    const activePlayers=(state?.players||[]).filter(p=>p.seatNo&&p.status==='ACTIVE').length;
    const canStart=!!state?.room?.isHost&&activePlayers>=2;
    const ps=Array.isArray(state?.players)?state.players:[];

    const seats=Array.from({length:state.room.maxPlayers},(_,i)=>i+1).map(n=>{
      const p=ps.find(x=>x.seatNo===n);
      const label=p?esc(p.displayName):(seated?'대기':'준비');
      return `<button class="seat-choice ${p?'occupied':''}" data-seat="${n}" ${p?'disabled':''}><span>${n}번 자리</span><b>${label}</b></button>`;
    }).join('');

    const rosterList=ps.length?ps.map(p=>{
      const mine=p.playerId===state?.me?.playerId;
      const ready=p.seatNo?`준비 · ${p.seatNo}번`:'대기 중';
      return `<div class="roster-person ${p.connected?'online':''}"><i class="roster-dot"></i><div class="roster-name"><b class="${mine?'roster-me':''}">${esc(p.displayName)}${mine?' · 나':''}</b><small>${p.connected?'접속 중':'연결 확인 중'}</small></div><span class="roster-seat">${ready}</span></div>`;
    }).join(''):'<div class="roster-empty">아직 입장자가 없습니다.</div>';

    const main=`<section class="lobby lobby-v18">
      <div class="lobby-top"><div class="code-box"><small>방 코드</small><b>${esc(state.room.code)}</b></div><button id="copyCode" class="btn secondary lobby-copy">복사</button></div>
      <div class="lobby-settings"><span>시작 칩<b>${fmt(state.room.settings.startingStack)}</b></span><span>블라인드<b>${fmt(state.room.settings.smallBlind)} / ${fmt(state.room.settings.bigBlind)}</b></span><span>타이머<b>${state.room.settings.actionTimerSeconds?state.room.settings.actionTimerSeconds+'초':'없음'}</b></span></div>
      <div class="seat-grid">${seats}</div>
      ${!seated?'<p class="host-note">빈 좌석을 선택하세요.</p>':state.room.isHost?`<button id="startHand" class="btn primary lobby-start" ${canStart?'':'disabled'}>게임 시작</button><p class="host-note">2명 이상 준비하면 시작할 수 있습니다.</p>`:'<p class="host-note">방장이 게임을 시작할 때까지 기다려주세요.</p>'}
    </section>`;

    const roster=`<aside class="room-roster roster-v18">
      <div class="roster-head-v18">
        <div class="roster-title"><b>입장 중</b><span>${ps.length}명</span></div>
        <button id="kakaoShare" class="kakao-share-v18" type="button" aria-label="카카오톡 공유하기"><span class="kakao-mark-v18">K</span><span><b>카카오톡 공유하기</b><small>방 링크 보내기</small></span><i>›</i></button>
      </div>
      <div class="roster-list">${rosterList}</div>
    </aside>`;

    return `<div class="lobby-shell-grid lobby-shell-v18"><div class="lobby-main">${main}</div>${roster}</div>`;
  };

  /* Final seat markup: stack/nickname live in their own plate; cards never overlap them. */
  renderSeat=function(p,seatNo,pos){
    if(!p)return `<div class="seat empty pos${pos} seat-v18"><span>${seatNo}번</span><small>EMPTY</small></div>`;
    const hand=state.hand;
    const isMe=p.playerId===state.me?.playerId;
    const isTurn=hand?.currentActorPlayerId===p.playerId;
    const badges=[hand?.dealerSeat===seatNo?'D':'',hand?.sbSeat===seatNo?'SB':'',hand?.bbSeat===seatNo?'BB':''].filter(Boolean);
    let mini='';
    if(!isMe&&hand){
      if(p.revealedCards?.length)mini=p.revealedCards.map(c=>card(c,true)).join('');
      else if(!p.folded)mini=back(true)+back(true);
    }
    const status=playerStatusText(p);
    return `<div class="seat seat-v18 pos${pos} ${isMe?'me':''} ${isTurn?'turn':''} ${p.folded?'folded':''}">
      <div class="badges">${badges.map(x=>`<i>${x}</i>`).join('')}</div>
      <div class="seat-plate-v18">
        <div class="avatar">${esc((p.displayName||'?')[0])}</div>
        <div class="seat-copy-v18">
          <strong>${esc(p.displayName)}</strong>
          <div class="stack-v18"><i></i><span>${fmt(p.stack)}</span></div>
          <small>${status}</small>
        </div>
      </div>
      ${p.streetBet>0?`<i class="bet-chip">${fmt(p.streetBet)}</i>`:''}
      ${isTurn&&seconds!=null?`<i class="timer" id="turnTimer">${seconds}</i>`:''}
      ${mini?`<div class="mini-hole mini-hole-v18">${mini}</div>`:''}
    </div>`;
  };
})();
