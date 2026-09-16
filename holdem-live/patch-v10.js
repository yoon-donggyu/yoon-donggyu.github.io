/* v10: prevent full-DOM redraw on every 1s poll. Render only when room state actually changes. */
(function(){
  function stableStateSignature(s){
    if(!s)return '';
    try{return JSON.stringify(s)}catch{return String(Date.now())}
  }

  let lastRenderedSignature = state ? stableStateSignature(state) : '';

  loadRoom = async function(quiet=true){
    const code=routeCode();
    if(!code)return renderHome();
    if(!token){renderInvite(code);return}
    try{
      const j=await api({op:'state',code});
      const next=j.state;
      const member=next?.players?.find(p=>p.playerId===next?.me?.playerId);
      if(!member){
        state=null;
        lastRenderedSignature='';
        stopPoll();
        setNet(false);
        renderInvite(code);
        return;
      }

      const nextSignature=stableStateSignature(next);
      const needsRender=!state || nextSignature!==lastRenderedSignature;
      state=next;
      setNet(false);

      if(needsRender){
        renderRoom();
        lastRenderedSignature=nextSignature;
      }
      startPoll();
    }catch(e){
      if(e.code==='SESSION_INVALID'){
        setToken('');
        state=null;
        lastRenderedSignature='';
        stopPoll();
        renderInvite(code);
      }else if(e.code==='ROOM_NOT_JOINED'||e.code==='ROOM_NOT_FOUND'){
        state=null;
        lastRenderedSignature='';
        stopPoll();
        setNet(false);
        renderInvite(code);
      }else if(!quiet){
        app.innerHTML=`<main class="center"><section class="card"><p class="error">${esc(e.message)}</p><button class="btn secondary" id="homeAfterError">홈으로</button></section></main>`;
        document.getElementById('homeAfterError')?.addEventListener('click',()=>{history.pushState({},'',location.pathname);renderHome()});
      }else{
        setNet(true);
      }
    }
  };

  const baseRenderHomeV10=renderHome;
  renderHome=function(){lastRenderedSignature='';baseRenderHomeV10()};

  const baseRenderInviteV10=renderInvite;
  renderInvite=function(code){lastRenderedSignature='';baseRenderInviteV10(code)};
})();
