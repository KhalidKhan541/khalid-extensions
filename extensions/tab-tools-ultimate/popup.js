document.addEventListener("DOMContentLoaded",()=>{const c=document.getElementById("content");document.getElementById("actionBtn").addEventListener("click",()=>{chrome.tabs.query({active:true,currentWindow:true},tabs=>{chrome.tabs.sendMessage(tabs[0].id,{type:"ANALYZE"},resp=>{if(resp){c.innerHTML=`
<div class="card"><h3>Page Info</h3>
<div class="stat-row"><span class="stat-label">Title</span><span class="stat-value">${resp.title.substring(0,50)}</span></div>
<div class="stat-row"><span class="stat-label">URL</span><span class="stat-value">${resp.url.substring(0,40)}</span></div>
<div class="stat-row"><span class="stat-label">Links</span><span class="stat-value">${resp.links}</span></div>
<div class="stat-row"><span class="stat-label">Images</span><span class="stat-value">${resp.images}</span></div></div>
<div class="card"><h3>Content Preview</h3><p style="font-size:13px;color:var(--muted);line-height:1.5">${resp.body.substring(0,200)}...</p></div>`}else{c.innerHTML="<div class=\"empty\">Could not analyze page</div>"}})})});document.getElementById("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("light")})});
