/* v15 GSAP + PixiJS motion engine. Visual-only: no server/game-state mutation. */
(function(){
  'use strict';

  const G=window.gsap;
  const P=window.PIXI;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const enabled=Boolean(G)&&!reduced;
  let pixiApp=null,pixiTable=null,pixiSeq=0;
  let last={handId:null,board:0,actionKey:'',turn:null,completed:null};

  const style=document.createElement('style');
  style.textContent=`
    .fx15-layer{position:absolute;inset:0;z-index:34;pointer-events:none;overflow:visible;contain:layout style;transform:translateZ(0)}
    .fx15-chip{position:absolute;left:0;top:0;width:15px;height:8px;margin:-4px 0 0 -8px;border-radius:50%;background:radial-gradient(ellipse at 50% 25%,#fff7d9 0 8%,#d24b57 10% 28%,#efd594 30% 39%,#7c1d28 41% 100%);border:1px solid rgba(25,8,8,.72);box-shadow:0 4px 8px rgba(0,0,0,.48),inset 0 1px rgba(255,255,255,.5);will-change:transform,opacity}
    .fx15-chip:nth-child(3n){background:radial-gradient(ellipse at 50% 25%,#fff7db 0 8%,#3477ad 10% 28%,#ead59d 30% 39%,#123c60 41% 100%)}
    .fx15-card{position:absolute;left:0;top:0;width:34px;height:49px;margin:-25px 0 0 -17px;border-radius:6px;background:linear-gradient(135deg,#153629,#315f4e);border:1px solid #d3bb7e;box-shadow:0 10px 22px rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.04);will-change:transform,opacity}
    .fx15-card:after{content:'♠';position:absolute;inset:0;display:grid;place-items:center;color:rgba(239,214,159,.5);font:700 14px Georgia,serif}
    .fx15-title{position:absolute;left:50%;top:50%;z-index:36;transform:translate(-50%,-50%);padding:7px 15px;border:1px solid rgba(241,205,122,.52);border-radius:999px;background:rgba(10,15,12,.78);box-shadow:0 10px 35px rgba(0,0,0,.38),0 0 26px rgba(233,192,101,.15);color:#f5d991;font-weight:900;font-size:clamp(12px,2.6vw,23px);letter-spacing:.16em;text-shadow:0 2px 10px rgba(0,0,0,.65);white-space:nowrap;will-change:transform,opacity}
    .fx15-pixi{position:absolute!important;inset:0;width:100%!important;height:100%!important;z-index:33;pointer-events:none!important;transform:translateZ(0)}
  `;
  document.head.appendChild(style);

  function table(){return document.querySelector('.poker-table')}
  function layer(){
    const t=table(); if(!t)return null;
    let l=t.querySelector(':scope > .fx15-layer');
    if(!l){l=document.createElement('div');l.className='fx15-layer';t.appendChild(l)}
    return l;
  }
  function point(el,t=table()){
    if(!el||!t)return{x:0,y:0};
    const a=el.getBoundingClientRect(),b=t.getBoundingClientRect();
    return{x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};
  }
  function center(t=table()){return t?{x:t.clientWidth/2,y:t.clientHeight/2}:{x:0,y:0}}
  function seatFor(playerId){
    if(!playerId||!window.state)return null;
    const max=state?.room?.maxPlayers||6,me=state?.players?.find(p=>p.playerId===state?.me?.playerId),p=state?.players?.find(p=>p.playerId===playerId);
    if(!me?.seatNo||!p?.seatNo)return null;
    const rel=(p.seatNo-me.seatNo+max)%max;
    const pos=typeof seatPosition==='function'?seatPosition(rel,max):rel;
    return document.querySelector(`.poker-table .seat.pos${pos}`);
  }
  function potPoint(){return point(document.querySelector('.poker-table .pot'))}
  function rm(el){try{el?.remove()}catch{}}

  async function ensurePixi(){
    const t=table();
    if(!P||!t||reduced)return null;
    if(pixiApp&&pixiTable===t&&pixiApp.stage)return pixiApp;
    const seq=++pixiSeq;
    if(pixiApp){try{pixiApp.destroy(true,{children:true})}catch{} pixiApp=null}
    pixiTable=t;
    try{
      const a=new P.Application();
      await a.init({resizeTo:t,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:Math.min(window.devicePixelRatio||1,2)});
      if(seq!==pixiSeq||!t.isConnected){a.destroy(true,{children:true});return null}
      a.canvas.className='fx15-pixi';
      t.appendChild(a.canvas);
      pixiApp=a;
      return a;
    }catch(e){console.warn('[HoldemMotion] Pixi init skipped',e);return null}
  }

  function burstAt(x,y,{count=18,power=48,colors=[0xf5d991,0xffffff,0xd84a55]}={}){
    if(!P||reduced)return;
    ensurePixi().then(a=>{
      if(!a)return;
      for(let i=0;i<count;i++){
        const r=1.4+Math.random()*2.7;
        const g=new P.Graphics().circle(0,0,r).fill(colors[i%colors.length]);
        g.x=x;g.y=y;g.alpha=.92;
        a.stage.addChild(g);
        const ang=Math.random()*Math.PI*2,dist=power*(.45+Math.random());
        G.to(g,{x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist,alpha:0,duration:.55+Math.random()*.35,ease:'power2.out',onComplete:()=>{try{a.stage.removeChild(g);g.destroy()}catch{}}});
        G.fromTo(g.scale,{x:.45,y:.45},{x:1.05+Math.random()*.7,y:1.05+Math.random()*.7,duration:.28,ease:'power2.out'});
      }
    });
  }

  function chipsToPot(playerId,heavy=false){
    if(!enabled)return;
    const l=layer(),s=point(seatFor(playerId)),p=potPoint();
    if(!l||(!s.x&&!s.y))return;
    const count=heavy?9:5;
    for(let i=0;i<count;i++){
      const c=document.createElement('i');c.className='fx15-chip';l.appendChild(c);
      const sx=s.x+(Math.random()-.5)*22,sy=s.y+(Math.random()-.5)*14;
      G.set(c,{x:sx,y:sy,scale:.84+Math.random()*.25,rotation:(Math.random()-.5)*35,opacity:0});
      G.to(c,{opacity:1,duration:.08,delay:i*.025});
      G.to(c,{x:p.x+(Math.random()-.5)*14,y:p.y+(Math.random()-.5)*8,rotation:(Math.random()-.5)*150,duration:.42+Math.random()*.12,delay:i*.032,ease:'power2.inOut',onComplete:()=>rm(c)});
    }
    setTimeout(()=>burstAt(p.x,p.y,{count:heavy?22:10,power:heavy?54:32}),heavy?390:280);
  }

  function dealHand(){
    if(!enabled)return;
    const l=layer(),t=table();if(!l||!t)return;
    const origin=center(t),seats=[...t.querySelectorAll('.seat:not(.empty)')];
    const tl=G.timeline();
    for(let round=0;round<2;round++){
      seats.forEach((s,i)=>{
        const d=point(s,t),c=document.createElement('i');c.className='fx15-card';l.appendChild(c);
        G.set(c,{x:origin.x,y:origin.y,scale:.72,rotation:-10+Math.random()*20,opacity:0});
        const at=(round*seats.length+i)*.065;
        tl.to(c,{opacity:1,duration:.05},at)
          .to(c,{x:d.x,y:d.y,scale:.82,rotation:(Math.random()-.5)*9,duration:.38,ease:'power3.out',onComplete:()=>rm(c)},at);
      });
    }
  }

  function boardDeal(from,to){
    if(!enabled||to<=from)return;
    requestAnimationFrame(()=>{
      const cards=[...document.querySelectorAll('.community .card-ui')];
      cards.slice(from,to).forEach((c,i)=>G.fromTo(c,{y:-22,scale:.72,rotationY:70,opacity:0},{y:0,scale:1,rotationY:0,opacity:1,duration:.5,delay:i*.075,ease:'back.out(1.45)',clearProps:'transform,opacity'}));
      const p=point(document.querySelector('.community'));
      setTimeout(()=>burstAt(p.x,p.y,{count:8,power:24,colors:[0xf5d991,0xffffff]}),180);
    });
  }

  function foldFx(playerId){
    if(!enabled)return;
    const s=seatFor(playerId);if(!s)return;
    G.fromTo(s,{x:0},{x:-5,duration:.08,yoyo:true,repeat:3,ease:'power1.inOut',clearProps:'x'});
    G.fromTo(s,{filter:'brightness(1)'},{filter:'brightness(.62) saturate(.5)',duration:.34,ease:'power2.out',clearProps:'filter'});
  }

  function checkFx(playerId){
    if(!enabled)return;
    const s=seatFor(playerId);if(!s)return;
    G.fromTo(s,{scale:1},{scale:1.035,duration:.12,yoyo:true,repeat:1,ease:'power2.out',clearProps:'scale'});
    const p=point(s);burstAt(p.x,p.y,{count:6,power:18,colors:[0xd9f5e6,0xffffff]});
  }

  function allInFx(playerId){
    if(!enabled)return;
    chipsToPot(playerId,true);
    const t=table(),l=layer();if(!t||!l)return;
    G.fromTo(t,{scale:1},{scale:1.018,duration:.11,yoyo:true,repeat:3,ease:'power1.inOut',clearProps:'scale'});
    const title=document.createElement('div');title.className='fx15-title';title.textContent='ALL IN';l.appendChild(title);
    G.fromTo(title,{scale:.45,opacity:0},{scale:1,opacity:1,duration:.28,ease:'back.out(1.8)'});
    G.to(title,{scale:1.16,opacity:0,duration:.38,delay:.55,ease:'power2.in',onComplete:()=>rm(title)});
    const c=center(t);burstAt(c.x,c.y,{count:30,power:80,colors:[0xf5d991,0xd84a55,0xffffff]});
  }

  function turnFx(playerId){
    if(!enabled)return;
    const s=seatFor(playerId);if(!s)return;
    G.fromTo(s,{scale:.985},{scale:1.035,duration:.23,yoyo:true,repeat:1,ease:'power2.out',clearProps:'scale'});
  }

  function winnerFx(){
    if(!enabled)return;
    const winners=(state?.results||[]).filter(r=>Number(r.payout)>0);
    if(!winners.length)return;
    const l=layer(),t=table();if(!l||!t)return;
    winners.forEach((r,i)=>{
      const s=seatFor(r.playerId);if(!s)return;
      const p=point(s,t);
      setTimeout(()=>{
        G.fromTo(s,{scale:1},{scale:1.055,duration:.22,yoyo:true,repeat:3,ease:'power2.out',clearProps:'scale'});
        burstAt(p.x,p.y,{count:28,power:72,colors:[0xf5d991,0xffffff,0x69d9a7]});
      },i*130);
    });
    const title=document.createElement('div');title.className='fx15-title';title.textContent=winners.length>1?'WINNERS':'WINNER';l.appendChild(title);
    G.fromTo(title,{y:12,scale:.7,opacity:0},{y:0,scale:1,opacity:1,duration:.38,ease:'back.out(1.7)'});
    G.to(title,{y:-10,opacity:0,duration:.42,delay:1.15,ease:'power2.in',onComplete:()=>rm(title)});
  }

  function actionKey(h,recent){return recent?`${h?.id||''}:${recent.seq??''}:${recent.playerId??''}:${recent.type||''}:${recent.amount??''}:${recent.raiseTo??''}`:''}
  function snapshot(){
    const h=state?.hand,recent=state?.recentActions?.at?.(-1);
    return{handId:h?.id||null,board:state?.board?.length||0,actionKey:actionKey(h,recent),actionType:recent?.type||'',actionPlayer:recent?.playerId||null,turn:h?.currentActorPlayerId||null,completed:h?.street==='HAND_COMPLETE'?h.id:null};
  }

  function syncMotion(next,prev){
    if(!table()){last=next;return}
    ensurePixi();
    if(next.handId&&next.handId!==prev.handId)dealHand();
    if(next.handId===prev.handId&&next.board>prev.board)boardDeal(prev.board,next.board);
    if(next.actionKey&&next.actionKey!==prev.actionKey){
      if(['CALL','BET','RAISE'].includes(next.actionType))chipsToPot(next.actionPlayer,false);
      else if(next.actionType==='ALL_IN')allInFx(next.actionPlayer);
      else if(['FOLD','AUTO_FOLD'].includes(next.actionType))foldFx(next.actionPlayer);
      else if(['CHECK','AUTO_CHECK'].includes(next.actionType))checkFx(next.actionPlayer);
    }
    if(next.turn&&next.turn!==prev.turn&&next.completed==null)turnFx(next.turn);
    if(next.completed&&next.completed!==prev.completed)winnerFx();
    last=next;
  }

  if(typeof renderRoom==='function'){
    const baseRenderRoom=renderRoom;
    renderRoom=function(){
      const prev={...last},next=snapshot();
      baseRenderRoom();
      requestAnimationFrame(()=>syncMotion(next,prev));
    };
  }

  document.addEventListener('pointerdown',e=>{
    if(!enabled)return;
    const b=e.target.closest?.('.action,.btn,.icon-btn,.seat-choice');if(!b||b.disabled)return;
    G.fromTo(b,{scale:1},{scale:.965,duration:.07,yoyo:true,repeat:1,ease:'power2.out',clearProps:'scale'});
  },{passive:true});

  window.HoldemMotion={
    version:'15.0',
    gsap:window.gsap?.version||null,
    pixi:window.PIXI?.VERSION||null,
    deal:dealHand,
    chips:chipsToPot,
    allIn:allInFx,
    winner:winnerFx,
    burst:burstAt,
    refresh:()=>{pixiSeq++;pixiTable=null;ensurePixi()}
  };
  console.info('[HoldemMotion] ready',window.HoldemMotion);
})();
