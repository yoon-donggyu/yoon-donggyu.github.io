/* v14 smooth visual effects. Presentation only; server/game rules stay untouched. */
(function(){
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const completedHands=new Set();
  let previous=snapshot();

  function snapshot(){
    const h=state?.hand;
    const recent=state?.recentActions?.at?.(-1)||null;
    const me=state?.players?.find?.(p=>p.playerId===state?.me?.playerId)||null;
    const players=(state?.players||[]).map(p=>({id:p.playerId,seat:p.seatNo,folded:!!p.folded,stack:Number(p.stack||0)}));
    return {
      handId:h?.id||'',
      handNo:h?.handNo||0,
      street:h?.street||'',
      actor:h?.currentActorPlayerId||'',
      board:[...(state?.board||[])],
      recent:recent?{...recent}:null,
      recentKey:recent&&h?`${h.id}:${recent.seq??''}:${recent.playerId??''}:${recent.type||''}:${recent.amount??''}:${recent.raiseTo??''}`:'',
      meId:state?.me?.playerId||'',
      meSeat:me?.seatNo||null,
      meStack:Number(me?.stack||0),
      players,
      results:(state?.results||[]).map(r=>({playerId:r.playerId,payout:Number(r.payout||0)}))
    };
  }

  function posForPlayer(playerId,snap=previous){
    const max=state?.room?.maxPlayers||6;
    const target=snap?.players?.find(p=>p.id===playerId);
    if(!snap?.meSeat||!target?.seat)return 0;
    return seatPosition((target.seat-snap.meSeat+max)%max,max);
  }

  function posDelta(pos,table){
    const map={0:[.50,.91],1:[.13,.76],2:[.13,.23],3:[.50,.08],4:[.87,.23],5:[.87,.76]};
    const [x,y]=map[pos]||map[0];
    return {x:(x-.5)*table.clientWidth,y:(y-.5)*table.clientHeight};
  }

  function layer(){
    const table=document.querySelector('.poker-table');
    if(!table)return null;
    let el=table.querySelector('.fx14-layer');
    if(!el){el=document.createElement('div');el.className='fx14-layer';table.appendChild(el)}
    return {table,el};
  }

  function wa(el,frames,options){
    if(!el||reduced())return;
    try{
      const a=el.animate(frames,options);
      a.finished.catch(()=>{}).finally(()=>el.remove());
      setTimeout(()=>el.isConnected&&el.remove(),(Number(options.duration)||500)+(Number(options.delay)||0)+180);
    }catch{el.remove()}
  }

  function chipTravel(playerId,toPlayer=false,count=3){
    const l=layer();if(!l||reduced())return;
    const pos=posForPlayer(playerId,snapshot());
    const d=posDelta(pos,l.table);
    for(let i=0;i<count;i++){
      const c=document.createElement('i');
      c.className=`fx14-chip ${i%3===1?'blue':i%3===2?'black':''}`;
      l.el.appendChild(c);
      const start=toPlayer?{x:0,y:0}:d,end=toPlayer?d:{x:0,y:0};
      wa(c,[
        {transform:`translate3d(${start.x}px,${start.y}px,0) scale(.72) rotate(${i*12-10}deg)`,opacity:.12},
        {offset:.62,opacity:1},
        {transform:`translate3d(${end.x}px,${end.y}px,0) scale(1) rotate(${i*20+18}deg)`,opacity:0}
      ],{duration:520+i*35,delay:i*45,easing:'cubic-bezier(.16,.84,.25,1)',fill:'both'});
    }
  }

  function dealGhosts(){
    const l=layer();if(!l||reduced())return;
    const snap=snapshot();
    const players=snap.players.filter(p=>p.seat);
    players.forEach((p,i)=>{
      const pos=posForPlayer(p.id,snap),d=posDelta(pos,l.table);
      const c=document.createElement('i');c.className='fx14-card';l.el.appendChild(c);
      wa(c,[
        {transform:'translate3d(0,0,0) scale(.66) rotate(-7deg)',opacity:0},
        {offset:.16,opacity:1},
        {transform:`translate3d(${d.x}px,${d.y}px,0) scale(.9) rotate(${i%2?7:-5}deg)`,opacity:0}
      ],{duration:460,delay:i*58,easing:'cubic-bezier(.16,.84,.25,1)',fill:'both'});
    });
  }

  function foldEffect(playerId){
    const l=layer();if(!l||reduced())return;
    const pos=posForPlayer(playerId,snapshot()),d=posDelta(pos,l.table);
    for(let i=0;i<2;i++){
      const c=document.createElement('i');c.className='fx14-card';l.el.appendChild(c);
      wa(c,[
        {transform:`translate3d(${d.x+i*8-4}px,${d.y}px,0) scale(.86) rotate(${i?5:-5}deg)`,opacity:.9},
        {transform:`translate3d(${d.x*.34}px,${d.y*.34+10}px,0) scale(.68) rotate(${i?24:-22}deg)`,opacity:0}
      ],{duration:420,delay:i*26,easing:'cubic-bezier(.32,.01,.42,1)',fill:'both'});
    }
    const tag=document.createElement('b');tag.className='fx14-fold-label';tag.textContent='FOLD';l.el.appendChild(tag);
    wa(tag,[
      {transform:`translate3d(${d.x}px,${d.y}px,0) scale(.78)`,opacity:0},
      {offset:.32,opacity:1},
      {transform:`translate3d(${d.x}px,${d.y-16}px,0) scale(1)`,opacity:0}
    ],{duration:620,easing:'cubic-bezier(.16,.84,.25,1)',fill:'both'});
  }

  function allInEffect(){
    const l=layer();if(!l||reduced())return;
    l.table.classList.remove('fx14-allin');void l.table.offsetWidth;l.table.classList.add('fx14-allin');
    setTimeout(()=>l.table.classList.remove('fx14-allin'),650);
    for(let i=0;i<2;i++){
      const r=document.createElement('i');r.className='fx14-flare';l.el.appendChild(r);
      wa(r,[
        {transform:'scale(.5)',opacity:.9},
        {transform:`scale(${i?20:14})`,opacity:0}
      ],{duration:650+i*120,delay:i*90,easing:'cubic-bezier(.08,.7,.25,1)',fill:'both'});
    }
  }

  function boardDeal(oldCount,newCount){
    const cards=[...document.querySelectorAll('.community .card-ui')];
    cards.slice(oldCount,newCount).forEach((c,i)=>{c.classList.add('fx14-board-deal');c.style.animationDelay=`${i*55}ms`});
  }

  function ownDeal(){
    [...document.querySelectorAll('.my-cards .card-ui')].forEach((c,i)=>{c.classList.add('fx14-own-deal');c.style.animationDelay=`${i*70}ms`});
  }

  function actionPop(){document.querySelector('.recent')?.classList.add('fx14-action-pop')}

  function hudPop(){
    document.querySelector('.hud-box.chips b')?.classList.add('fx14-value-pop');
    document.querySelector('.hud-box.profit b')?.classList.add('fx14-value-pop');
  }

  function winEffect(snap){
    if(!snap.handId||completedHands.has(snap.handId))return;
    completedHands.add(snap.handId);
    if(completedHands.size>24)completedHands.delete(completedHands.values().next().value);
    document.querySelector('.results')?.classList.add('fx14-results-in');
    const winners=snap.results.filter(r=>r.payout>0);
    winners.forEach((w,idx)=>{
      chipTravel(w.playerId,true,4);
      const pos=posForPlayer(w.playerId,snap);
      const seat=document.querySelector(`.seat.pos${pos}`);
      seat?.classList.add('fx14-winner');
      if(!reduced()){
        const l=layer();if(!l)return;
        const d=posDelta(pos,l.table);
        for(let i=0;i<7;i++){
          const s=document.createElement('i');s.className='fx14-spark';l.el.appendChild(s);
          const a=(Math.PI*2*i/7)+(idx*.18),r=26+(i%3)*9;
          wa(s,[
            {transform:`translate3d(${d.x}px,${d.y}px,0) scale(.3)`,opacity:0},
            {offset:.22,opacity:1},
            {transform:`translate3d(${d.x+Math.cos(a)*r}px,${d.y+Math.sin(a)*r}px,0) scale(1.25)`,opacity:0}
          ],{duration:720,delay:90+i*28,easing:'cubic-bezier(.16,.84,.25,1)',fill:'both'});
        }
      }
    });
  }

  function runDiff(prev,next){
    if(!next?.handId)return;
    const newHand=prev?.handId!==next.handId;
    if(newHand){dealGhosts();ownDeal()}
    if(!newHand&&next.board.length>prev.board.length)boardDeal(prev.board.length,next.board.length);
    if(next.recentKey&&next.recentKey!==prev.recentKey){
      const a=next.recent;actionPop();
      if(['CALL','BET','RAISE'].includes(a?.type))chipTravel(a.playerId,false,a.type==='RAISE'?4:3);
      if(a?.type==='ALL_IN'){chipTravel(a.playerId,false,6);allInEffect()}
      if(['FOLD','AUTO_FOLD'].includes(a?.type))foldEffect(a.playerId);
    }
    if(next.meStack!==prev.meStack)hudPop();
    if(next.street==='HAND_COMPLETE'&&prev.street!=='HAND_COMPLETE')winEffect(next);
  }

  const baseRenderRoom14=renderRoom;
  renderRoom=function(){
    const before=previous||snapshot();
    const next=snapshot();
    baseRenderRoom14();
    requestAnimationFrame(()=>{runDiff(before,next);previous=next});
  };

  const baseTickTimer14=tickTimer;
  tickTimer=function(){
    baseTickTimer14();
    const t=document.getElementById('turnTimer');
    if(t)t.classList.toggle('fx14-urgent',seconds!=null&&seconds>0&&seconds<=5);
  };

  document.addEventListener('pointerdown',e=>{
    if(reduced())return;
    const b=e.target.closest?.('button');if(!b||b.disabled)return;
    const rect=b.getBoundingClientRect();
    const r=document.createElement('i');r.className='fx14-ripple';
    r.style.left=`${e.clientX-rect.left}px`;r.style.top=`${e.clientY-rect.top}px`;
    b.appendChild(r);setTimeout(()=>r.remove(),520);
  },{capture:true,passive:true});

  /* If v14 loads after an already rendered table, start from that state without replaying old actions. */
  previous=snapshot();
})();
