(function(){chrome.runtime.onMessage.addListener((msg,s,send)=>{if(msg.type==="ANALYZE"){send({url:location.href,title:document.title,links:document.querySelectorAll("a").length})}return true)})()
