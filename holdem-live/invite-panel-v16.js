/* v16 — move Kakao sharing into the fixed top area of the right roster panel. */
(function(){
  const baseRenderLobbyV16=renderLobby;
  renderLobby=function(member){
    let html=baseRenderLobbyV16(member);

    /* Remove the older full-width yellow/share button from the main lobby column. */
    html=html.replace(/<button id="kakaoShare"[^>]*>[\s\S]*?<\/button>/,'');

    /* Insert the share action into the top of the player roster. */
    html=html.replace(
      /<aside class="room-roster"><div class="roster-title">([\s\S]*?)<\/div><div class="roster-list">/,
      `<aside class="room-roster"><div class="roster-head-fixed"><div class="roster-title">$1</div><button id="kakaoShare" class="kakao-share-btn" type="button" aria-label="카카오톡 공유하기"><span class="share-copy"><b>카카오톡 공유하기</b><small>방 링크를 친구에게 보내기</small></span><span class="share-arrow">›</span></button></div><div class="roster-list">`
    );
    return html;
  };
})();
