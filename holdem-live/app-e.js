/* Mobile lobby seating hotfix: keep seat taps from being lost during 1s polling re-renders. */
let seatPending=false;
wireLobby=function(member){
  const copy=document.getElementById('copyCode');
  if(copy) copy.onclick=()=>copyText(state.room.code);

  document.querySelectorAll('.seat-choice[data-seat]').forEach(btn=>{
    btn.onclick=null;
    if(btn.disabled)return;
    btn.style.touchAction='manipulation';
    const seatNo=Number(btn.dataset.seat);
    const takeSeat=async ev=>{
      ev?.preventDefault?.();
      ev?.stopPropagation?.();
      if(seatPending||busy||!Number.isInteger(seatNo))return;
      seatPending=true;
      busy=true;
      stopPoll();
      btn.disabled=true;
      const label=btn.querySelector('b');
      const old=label?.textContent||'앉기';
      if(label)label.textContent='앉는 중…';
      try{
        await api({op:'seat',code:state.room.code,seatNo});
        showToast(`Seat ${seatNo} 착석 완료`);
        await loadRoom(true);
      }catch(e){
        if(label)label.textContent=old;
        btn.disabled=false;
        showToast(`착석 실패 · ${e.message||'다시 시도해주세요.'}`);
        await loadRoom(true);
      }finally{
        busy=false;
        seatPending=false;
        startPoll();
      }
    };
    btn.addEventListener('pointerup',takeSeat,{passive:false});
    btn.addEventListener('click',ev=>{
      if(ev.detail===0)takeSeat(ev); // keyboard/accessibility fallback only
    });
  });

  const start=document.getElementById('startHand');
  if(start)start.onclick=()=>command({op:'start',code:state.room.code});
};
