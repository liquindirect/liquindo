import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-client.js";
(() => {
 const db=supabase,root=document.getElementById("admin-tools-content");if(!root)return;
 const css=document.createElement("style");css.textContent=".ac-wrap{display:grid;gap:1rem;margin-top:2rem}.ac-panel#ac-accounts{padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}.ac-panel#ac-accounts .ac-list{display:block;gap:0;margin-top:1rem}#ac-accounts-list .account-role-row{display:block;margin:0;padding:1.1rem 0;border:0;border-bottom:1px solid rgba(0,0,50,.18);border-radius:0;background:transparent;box-shadow:none}#ac-accounts-list .account-role-row:last-child{border-bottom:0}#ac-accounts-list .account-role-row h3{margin:0 0 .4rem}#ac-accounts-list .account-role-row .ac-form{background:transparent;border:0;box-shadow:none;padding:0}.ac-panel#ac-accounts .ac-form{margin-top:.75rem}.ac-panel#ac-accounts .ac-form select{max-width:100%}.ac-panel{padding:1.2rem;border:1px solid #d8dce1;border-radius:14px;background:#fff;color:#172033;scroll-margin-top:1rem}.ac-panel h2{color:#000032;margin:.1rem 0 .6rem}.ac-muted{color:#566273;line-height:1.5}.ac-nav,.ac-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin:.8rem 0}.ac-nav a,.ac-btn{padding:.6rem .85rem;border:1px solid #c6ccd4;border-radius:8px;background:#fff;color:#172033;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}.ac-btn.primary{background:#fdbe00;border-color:#fdbe00;color:#000032}.ac-btn.danger{color:#a3221a;border-color:#a3221a}.ac-btn:disabled{opacity:.55}.ac-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:.7rem}.ac-stat,.ac-item{border:1px solid #e0e4e9;border-radius:10px;padding:.8rem;overflow-wrap:anywhere}.ac-stat strong{display:block;font-size:1.7rem;color:#000032}.ac-stat span,.ac-meta{font-size:.85rem;color:#647084}.ac-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:.7rem;align-items:end}.ac-form label,.ac-label{display:grid;gap:.35rem;font-weight:700;font-size:.92rem}.ac-form input,.ac-form select,.ac-form textarea,.ac-panel input,.ac-panel select,.ac-panel textarea{box-sizing:border-box;width:100%;min-width:0;padding:.6rem;border:1px solid #b9c1cb;border-radius:7px;background:#fff;color:#172033;font:inherit}.ac-form textarea,.ac-panel textarea{min-height:85px}.ac-list{display:grid;gap:.6rem;margin-top:.8rem}.ac-item h3{font-size:1rem;margin:0 0 .4rem;color:#000032}.ac-status{min-height:1.2rem;color:#425466}.ac-status.error{color:#b42318}.ac-tablewrap{overflow:auto}.ac-table{width:100%;border-collapse:collapse;min-width:600px}.ac-table th,.ac-table td{text-align:left;padding:.6rem;border-bottom:1px solid #e0e4e9;vertical-align:top}.ac-warn{padding:.8rem;background:#fff8df;border:1px solid #e7cb73;border-radius:8px}.ac-hidden{display:none!important}.ac-tool-menu{display:grid;gap:.65rem;margin:.9rem 0 1.5rem}.ac-tool-dropdown{border:1px solid #d8dce1;border-radius:12px;background:#fff;overflow:hidden}.ac-tool-toggle{width:100%;min-height:52px;padding:1rem 1.1rem;border:0;background:#fff;color:#000032;font:inherit;font-weight:800;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;touch-action:manipulation}.ac-tool-toggle:after{content:"＋";color:#9a7200;font-size:1.1rem}.ac-tool-toggle[aria-expanded="true"]{border-bottom:1px solid #e0e4e9;background:#fffdf5}.ac-tool-toggle[aria-expanded="true"]:after{content:"−"}.ac-tool-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:.55rem;padding:.8rem}.ac-tool-options[hidden]{display:none!important}.ac-tool-options a{display:block;padding:.75rem .85rem;border:1px solid #e0e4e9;border-radius:8px;background:#f8f9fb;color:#172033;text-decoration:none;font-weight:650}.ac-tool-options a:hover,.ac-tool-options a:focus-visible{border-color:#fdbe00;background:#fffdf5}";document.head.append(css);
 const wrap=document.createElement("div");wrap.className="ac-wrap";wrap.innerHTML=String.raw`
 <nav class="ac-tool-menu" aria-label="Administration tools">
 <section class="ac-tool-dropdown"><button type="button" class="ac-tool-toggle" aria-expanded="true">Dashboard</button><div class="ac-tool-options"> <a href="#ac-overview">Overview and live statistics</a></div></section>
 <section class="ac-tool-dropdown"><button type="button" class="ac-tool-toggle" aria-expanded="false">People &amp; permissions</button><div class="ac-tool-options" hidden><a href="#ac-accounts">Accounts &amp; roles</a></div></section>
 <section class="ac-tool-dropdown"><button type="button" class="ac-tool-toggle" aria-expanded="false">Content management</button><div class="ac-tool-options" hidden><a href="#ac-search">Global content search</a><a href="wiki-editor.html?admin=1">LiquinWiki editor and revision review</a></div></section>
 <section class="ac-tool-dropdown"><button type="button" class="ac-tool-toggle" aria-expanded="false">Website configuration</button><div class="ac-tool-options" hidden><a href="#ac-site">Homepage and website settings</a><a href="#ac-settings-history">Settings history</a><a href="#ac-i18n">Translations and link checker</a></div></section>
 <section class="ac-tool-dropdown"><button type="button" class="ac-tool-toggle" aria-expanded="false">Security &amp; operations</button><div class="ac-tool-options" hidden><a href="#ac-audit">Administrative audit log</a><a href="#ac-health">System health checker</a><a href="#ac-backup">Backup and recovery</a><a href="#ac-incidents">Incident log</a><a href="#ac-visitor-logs">Visitor access logs</a></div></section>
 </nav>
 <section class="ac-panel" id="ac-overview"><h2>Administration overview</h2><p class="ac-muted">Live counts from the existing Supabase project.</p><div class="ac-grid" id="ac-stats">Loading…</div><button class="ac-btn primary" id="ac-refresh">Refresh overview</button> <a class="ac-btn" href="wiki-editor.html?admin=1">Wiki review</a><p class="ac-status" id="ac-overview-status"></p></section>
 <section class="ac-panel" id="ac-accounts"><h2>Accounts &amp; roles</h2><p class="ac-muted">Manage website access and LiquinWiki permissions together from this page. Wiki Editor can edit and submit new articles for approval; Trusted Editor can edit, create and publish directly. Display names and biographies are read-only.</p><label class="ac-label">Search accounts<input id="ac-account-filter" type="search" placeholder="Display name, bio, role, or ID"></label><div class="ac-list" id="ac-accounts-list"></div><button type="button" class="ac-btn" id="ac-accounts-load-more" hidden>Load more accounts</button><p class="ac-status" id="ac-accounts-status" role="status" aria-live="polite"></p></section>
 <section class="ac-panel" id="ac-site"><h2>Website settings and content</h2><p class="ac-muted">Edit public notices and featured content. Announcement, maintenance, and featured content are rendered on the homepage.</p><div class="ac-grid">
 <div><h3>Announcement</h3><label class="ac-label"><input id="ac-ann-on" type="checkbox"> Enabled</label><label class="ac-label">Text<textarea id="ac-ann-text" maxlength="1000"></textarea></label><label class="ac-label">Start<input id="ac-ann-start" type="datetime-local"></label><label class="ac-label">End<input id="ac-ann-end" type="datetime-local"></label></div>
 <div><h3>Maintenance</h3><label class="ac-label"><input id="ac-maint-on" type="checkbox"> Enabled</label><label class="ac-label">Notice<textarea id="ac-maint-text" maxlength="1000"></textarea></label></div>
 <div><h3>Featured content</h3><label class="ac-label">Title<input id="ac-feature-title" maxlength="120"></label><label class="ac-label">Description<textarea id="ac-feature-desc" maxlength="1000"></textarea></label><label class="ac-label">Link<input id="ac-feature-url" placeholder="https://… or relative path"></label><h3>Additional FAQs (JSON)</h3><p class="ac-muted">Enter an array of objects with question and answer fields.</p><label class="ac-label">FAQ entries<textarea id="ac-faq-json" placeholder='[{"question":"Example question?","answer":"Example answer."}]'></textarea></label><h3>Additional navigation links (JSON)</h3><p class="ac-muted">Adds links to the Contents menu without replacing core site navigation.</p><label class="ac-label">Extra links<textarea id="ac-nav-json" placeholder='[{"label":"Resources","url":"resources.html"}]'></textarea></label></div>
 <div><h3>Directory and language</h3><label class="ac-label"><input id="ac-bio-on" type="checkbox"> Directory bios enabled (preference)</label><label class="ac-label">Default language<select id="ac-language"><option value="en">English</option><option value="pt">Português</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option><option value="hr">Hrvatski</option><option value="el">Ελληνικά</option><option value="pl">Polski</option><option value="ru">Русский</option><option value="zh">中文</option></select></label><label class="ac-label">Footer contact text<input id="ac-footer-text" maxlength="200"></label></div></div>
 <div class="ac-actions"><button class="ac-btn primary" id="ac-save-settings">Save settings</button><button class="ac-btn" id="ac-preview-settings">Preview</button></div><div id="ac-preview" class="ac-warn ac-hidden"></div><p class="ac-status" id="ac-settings-status"></p><details><summary>Settings JSON</summary><pre id="ac-settings-raw" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></details></section>
 <section class="ac-panel" id="ac-search"><h2>Global content search</h2><p class="ac-muted">Search public profiles and wiki pages; authentication secrets and visitor IP addresses are not searched.</p><form id="ac-search-form" class="ac-form"><label>Search phrase<input id="ac-search-q" maxlength="120" required></label><button class="ac-btn primary">Search</button></form><div id="ac-search-results" class="ac-list"></div><p class="ac-status" id="ac-search-status"></p></section>
 <section class="ac-panel" id="ac-audit"><h2>Administrative audit log</h2><p class="ac-muted">Database triggers log profile, wiki, permission, shape and settings changes without storing bios or article bodies.</p><button class="ac-btn primary" id="ac-audit-refresh">Refresh log</button> <button class="ac-btn" id="ac-audit-export">Export visible log</button><div class="ac-tablewrap"><table class="ac-table"><thead><tr><th>Time UTC</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody id="ac-audit-rows"></tbody></table></div><p class="ac-status" id="ac-audit-status"></p></section>
 <section class="ac-panel" id="ac-health"><h2>System health checker</h2><p class="ac-muted">Read-only checks of core tables and important website resources.</p><button class="ac-btn primary" id="ac-health-run">Run checks</button><div class="ac-list" id="ac-health-results"></div><p class="ac-status" id="ac-health-status"></p></section>
 <section class="ac-panel" id="ac-backup"><h2>Backup and recovery</h2><p class="ac-muted">Restore only upserts settings and shapes. It never deletes rows or overwrites profiles, wiki pages, revisions, visitor logs, or authentication accounts.</p><button class="ac-btn primary" id="ac-backup-config">Export configuration</button> <button class="ac-btn" id="ac-backup-full">Export content snapshot</button><label class="ac-label">Configuration backup JSON<input type="file" id="ac-backup-file" accept=".json,application/json"></label><div id="ac-backup-preview" class="ac-warn ac-hidden"></div><button class="ac-btn danger" id="ac-backup-apply" disabled>Apply safe restore</button><p class="ac-status" id="ac-backup-status"></p></section>
 <section class="ac-panel" id="ac-visitor-logs"><h2>Visitor access logs</h2><p class="ac-muted">IP address and visit timestamp only. Records are automatically removed after seven days. Restrict access and use these records only for legitimate security and administration.</p><button type="button" class="ac-btn primary" id="ac-visitor-refresh">Refresh visitor logs</button><div class="ac-tablewrap"><table class="ac-table"><thead><tr><th>Timestamp (UTC)</th><th>IP address</th><th>Visitor</th><th>Member</th></tr></thead><tbody id="ac-visitor-rows"><tr><td colspan="4">Open this section to load visitor records.</td></tr></tbody></table></div><p class="ac-status" id="ac-visitor-status" role="status" aria-live="polite"></p></section>
 <section class="ac-panel" id="ac-incidents"><h2>Incident log</h2><form id="ac-incident-form" class="ac-form"><label>Title<input id="ac-incident-title" required maxlength="160"></label><label>Severity<select id="ac-incident-severity"><option value="low">Low</option><option value="normal" selected>Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Description<textarea id="ac-incident-desc" maxlength="4000"></textarea></label><button class="ac-btn primary">Record incident</button></form><div id="ac-incidents-list" class="ac-list"></div><p class="ac-status" id="ac-incidents-status"></p></section>
 <section class="ac-panel" id="ac-i18n"><h2>Translation and link checker</h2><p class="ac-muted">Checks translation key references and important page availability. This does not assess translation quality.</p><button class="ac-btn primary" id="ac-i18n-run">Check translations and links</button><div id="ac-i18n-results" class="ac-list"></div><p class="ac-status" id="ac-i18n-status"></p></section>
 <section class="ac-panel"><h2>More administration</h2><div class="ac-grid"><article class="ac-item"><h3>LiquinWiki review</h3><p class="ac-muted">Uses the established approval workflow; admin edits remain exempt from member approval.</p><a href="wiki-editor.html?admin=1">Review wiki →</a></article><article class="ac-item"><h3>Visitor logs</h3><p class="ac-muted">Existing seven-day retention.</p><a href="visitor-logs.html">Open logs →</a></article><article class="ac-item"><h3>Account recovery</h3><p class="ac-muted">Use secure recovery; passwords cannot be viewed.</p><a href="login.html">Account page →</a></article></div></section>
 `;
 const settingsHistoryPanel=document.createElement("section");settingsHistoryPanel.className="ac-panel";settingsHistoryPanel.id="ac-settings-history";
 settingsHistoryPanel.innerHTML='<h2>Site settings change history</h2><p class="ac-muted">Previous settings values are retained when a setting changes or is deleted. Restore a snapshot to undo a mistaken settings edit.</p><button type="button" class="ac-btn primary" id="ac-settings-history-refresh">Refresh settings history</button><div class="ac-list" id="ac-settings-history-list"></div><p class="ac-status" id="ac-settings-history-status"></p>';
 wrap.append(settingsHistoryPanel);
  root.append(wrap);
  const toolMenu=wrap.querySelector(".ac-tool-menu");
 toolMenu.querySelectorAll(".ac-tool-dropdown").forEach((section,index)=>{const button=section.querySelector(".ac-tool-toggle"),panel=section.querySelector(".ac-tool-options");const panelId="ac-tool-options-"+index;panel.id=panelId;button.setAttribute("aria-controls",panelId);});
 toolMenu.addEventListener("click",event=>{
  const button=event.target.closest(".ac-tool-toggle");
  if(button&&toolMenu.contains(button)){
   const panel=button.nextElementSibling,opening=button.getAttribute("aria-expanded")!=="true";
   toolMenu.querySelectorAll(".ac-tool-toggle").forEach(other=>{const otherPanel=other.nextElementSibling,active=other===button&&opening;other.setAttribute("aria-expanded",String(active));otherPanel.hidden=!active;});
   return;
  }
  const link=event.target.closest(".ac-tool-options a");
  if(link&&toolMenu.contains(link)){
   const targetId=link.getAttribute("href")?.startsWith("#")?link.getAttribute("href").slice(1):null;
   if(targetId){event.preventDefault();const target=$(targetId);if(target){history.replaceState(null,"","#"+targetId);target.scrollIntoView({behavior:"smooth",block:"start"});target.setAttribute("tabindex","-1");target.focus({preventScroll:true});}}
  }
 });
 const $=id=>document.getElementById(id);let adminId=null,profiles=[],auditRows=[],backup=null,settings={};const langs=["en","pt","es","fr","de","it","hr","el","pl","ru","zh"];
 function say(id,msg,err=false){const e=$(id);if(e){e.textContent=msg;e.classList.toggle("error",err);}}
 function download(name,data){const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 async function log(action,type,id,details={}){const r=await db.from("admin_audit_log").insert({actor_id:adminId,action,target_type:type,target_id:String(id||""),details});if(r.error)console.warn("Audit log insert failed",r.error.message);}
 async function loadSettingsHistory(){const o=$("ac-settings-history-list");o.replaceChildren();const r=await db.from("site_settings_history").select("id,setting_key,action,snapshot,changed_by,changed_at").order("changed_at",{ascending:false}).limit(50);if(r.error){say("ac-settings-history-status",r.error.message,true);return;}for(const row of (r.data||[])){const card=document.createElement("article");card.className="account-role-row";const h=document.createElement("h3");h.textContent=row.setting_key+" · "+row.action;const p=document.createElement("p");p.className="ac-meta";p.textContent="Changed "+new Date(row.changed_at).toLocaleString();const d=document.createElement("p");d.className="ac-muted";d.textContent="Previous value: "+JSON.stringify(row.snapshot?.setting_value);const b=document.createElement("button");b.type="button";b.className="ac-btn";b.textContent="Restore this setting";b.addEventListener("click",async()=>{if(!confirm("Restore the previous value for “"+row.setting_key+"”?"))return;b.disabled=true;try{const s=row.snapshot||{};const u=await db.from("site_settings").upsert({setting_key:s.setting_key||row.setting_key,setting_value:s.setting_value,updated_at:new Date().toISOString(),updated_by:adminId},{onConflict:"setting_key"});if(u.error)throw u.error;await log("site_settings.snapshot_restored","site_settings",row.setting_key,{history_id:row.id});say("ac-settings-history-status","Restored setting "+row.setting_key+".");await loadSettingsHistory();await loadSettings();}catch(e){say("ac-settings-history-status",e.message,true);}finally{b.disabled=false;}});card.append(h,p,d,b);o.append(card);}if(!r.data?.length)o.textContent="No settings changes have been recorded yet.";say("ac-settings-history-status","Showing "+(r.data||[]).length+" recent snapshots.");}
 $("ac-settings-history-refresh").addEventListener("click",loadSettingsHistory);
 async function loadVisitorLogs(){
  const button=$("ac-visitor-refresh"),rows=$("ac-visitor-rows");button.disabled=true;rows.replaceChildren();say("ac-visitor-status","Loading visitor records…");
  try{
   const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;if(!session?.access_token)throw new Error("Your administrator session has expired. Sign in again.");
   const response=await fetch(SUPABASE_URL+"/functions/v1/visitor-log-admin",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:"Bearer "+session.access_token}});
   const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Visitor log access was denied.");
   if(!payload.logs?.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=4;td.textContent="No visits recorded in the last seven days.";tr.append(td);rows.append(tr);}
   else for(const item of payload.logs){const tr=document.createElement("tr");for(const value of [new Date(item.visited_at).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"medium",timeZone:"UTC"})+" UTC",item.ip_address,item.visitor_type,item.member||"—"]){const td=document.createElement("td");td.textContent=String(value??"—");tr.append(td);}rows.append(tr);}
   say("ac-visitor-status","Loaded "+(payload.logs?.length||0)+" visit record(s).");
  }catch(error){say("ac-visitor-status",error.message||"Could not load visitor logs.",true);}
  finally{button.disabled=false;}
 }
 $("ac-visitor-refresh").addEventListener("click",loadVisitorLogs);
 document.querySelector('a[href="#ac-visitor-logs"]')?.addEventListener("click",loadVisitorLogs);
 async function count(t,c){const r=await db.from(t).select(c,{count:"exact",head:true});if(r.error)throw r.error;return r.count||0;}
 async function overview(){const o=$("ac-stats");o.replaceChildren();try{const v=await Promise.all([count("profiles","id"),count("wiki_pages","id"),db.from("wiki_revisions").select("id",{count:"exact",head:true}).eq("status","pending"),count("site_settings","setting_key"),db.from("admin_incidents").select("id",{count:"exact",head:true}).neq("status","resolved")]);if(v[2].error)throw v[2].error;if(v[4].error)throw v[4].error;["Profiles","Wiki articles","Pending revisions","Site settings","Open incidents"].forEach((s,i)=>{const e=document.createElement("div");e.className="ac-stat";const b=document.createElement("strong");b.textContent=String([v[0],v[1],v[2].count||0,v[3],v[4].count||0][i]);const t=document.createElement("span");t.textContent=s;e.append(b,t);o.append(e);});say("ac-overview-status","Refreshed "+new Date().toLocaleTimeString());}catch(e){say("ac-overview-status",e.message,true);}}
 let profilesOffset=0,profilesTotal=0,profilesLoading=false,profilesQueued=false,profilesQueuedReset=false;
 async function loadProfiles(reset=false){
  if(profilesLoading){profilesQueued=true;profilesQueuedReset=profilesQueuedReset||reset;return;}
  profilesLoading=true;
  const more=$("ac-accounts-load-more");
  if(more)more.disabled=true;
  say("ac-accounts-status","Loading accounts and roles…");
  let nextReset=reset;
  try{
   do{
    profilesQueued=false;
    const shouldReset=nextReset||profilesQueuedReset;
    profilesQueuedReset=false;nextReset=false;
    if(shouldReset){profiles=[];profilesOffset=0;profilesTotal=0;}
    const search=$("ac-account-filter").value.trim()||null;
    const offset=profilesOffset;
    const r=await db.rpc("admin_list_profiles",{p_offset:offset,p_limit:100,p_search:search});
    if(r.error)throw r.error;
    // Never let an older response overwrite results for a newer search.
    if(search!==($("ac-account-filter").value.trim()||null)){
      profilesQueued=true;profilesQueuedReset=true;continue;
    }
    const payload=r.data||{},batch=Array.isArray(payload.profiles)?payload.profiles:[];
    profiles=shouldReset?batch:profiles.concat(batch);
    profilesOffset=offset+batch.length;profilesTotal=Number(payload.total)||0;
    renderProfiles();
    say("ac-accounts-status","Showing "+profiles.length+" of "+profilesTotal+" accounts.");
    if(more)more.hidden=profilesOffset>=profilesTotal;
    
   }while(profilesQueued);
  }catch(e){say("ac-accounts-status",e.message||"Could not load accounts and roles.",true);}
  finally{
   profilesLoading=false;
   const canLoadMore=profilesOffset<profilesTotal;
   if(more)more.disabled=!canLoadMore;
   
   if(profilesQueued){const queuedReset=profilesQueuedReset;profilesQueued=false;profilesQueuedReset=false;queueMicrotask(()=>loadProfiles(queuedReset));}
  }
 }
 function renderProfiles(){
  const o=$("ac-accounts-list");o.replaceChildren();
  const q=$("ac-account-filter").value.toLowerCase().trim();
  const rows=profiles.filter(p=>[p.id,p.display_name,p.role,p.bio,p.wiki_role].some(x=>String(x||"").toLowerCase().includes(q)));
  if(!rows.length){o.textContent="No matching accounts.";return;}
  rows.forEach(p=>{
   const card=document.createElement("article");card.className="account-role-row";
   const h=document.createElement("h3");h.textContent=p.display_name||"Unnamed profile";
   const meta=document.createElement("p");meta.className="ac-meta";
   const wikiLabel=value=>value==="liquinwiki_editor"?"Wiki Editor":value==="liquinwiki_trusted_editor"?"Trusted Editor":"None";
   const updateMeta=()=>{meta.textContent=p.id+" · Website: "+(p.role==="admin"?"Administrator":"Member")+" · LiquinWiki: "+wikiLabel(p.wiki_role);};
   updateMeta();
   const details=document.createElement("p");details.className="ac-muted";details.textContent="Display name and biography are read-only. "+(p.bio||"No biography provided.");
   const f=document.createElement("div");f.className="ac-form";
   function field(labelText,control){const label=document.createElement("label");label.textContent=labelText;label.append(control);f.append(label);}
   const websiteRole=document.createElement("select");
   [["member","Member"],["admin","Administrator"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;websiteRole.append(option);});
   websiteRole.value=p.role||"member";
   if(p.id===adminId)websiteRole.disabled=true;
   field("Website role",websiteRole);
   const currentWikiRole=p.wiki_role||"none";
   const wikiRole=document.createElement("select");
   [["none","None"],["liquinwiki_editor","Wiki Editor"],["liquinwiki_trusted_editor","Trusted Editor"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;wikiRole.append(option);});
   wikiRole.value=currentWikiRole;
   field("LiquinWiki role",wikiRole);
   const save=document.createElement("button");save.type="button";save.className="ac-btn primary";save.textContent="Save roles";
   const updateSaveState=()=>{save.disabled=websiteRole.value===p.role&&wikiRole.value===currentWikiRole;};
   websiteRole.addEventListener("change",updateSaveState);
   wikiRole.addEventListener("change",updateSaveState);
   updateSaveState();
   save.onclick=async()=>{
    const nextWebsite=websiteRole.value,nextWiki=wikiRole.value;
    if(nextWebsite===p.role&&nextWiki===currentWikiRole)return;
    const changes=[];
    if(nextWebsite!==p.role)changes.push("website role to "+(nextWebsite==="admin"?"Administrator":"Member"));
    if(nextWiki!==currentWikiRole)changes.push("LiquinWiki role to "+wikiLabel(nextWiki));
    if(!window.confirm("Save "+changes.join(" and ")+" for "+(p.display_name||"this account")+"?")){
     websiteRole.value=p.role;wikiRole.value=currentWikiRole;updateSaveState();return;
    }
    save.disabled=true;websiteRole.disabled=true;wikiRole.disabled=true;
    say("ac-accounts-status","Saving both roles together…");
    try{
     const result=await db.rpc("admin_update_account_roles",{p_user_id:p.id,p_website_role:nextWebsite,p_wiki_role:nextWiki});
     if(result.error)throw result.error;
     Object.assign(p,result.data||{});
     updateMeta();
     say("ac-accounts-status","Website and LiquinWiki roles saved together for "+(p.display_name||"this account")+".");
     await Promise.all([overview(),loadProfiles(true)]);
    }catch(error){
     websiteRole.value=p.role;wikiRole.value=currentWikiRole;
     say("ac-accounts-status",error.message||"Could not save account roles.",true);
    }finally{
     websiteRole.disabled=p.id===adminId;wikiRole.disabled=false;updateSaveState();
    }
   };
   f.append(save);
   card.append(h,meta,details,f);o.append(card);
  });
 }
 function local(v){if(!v)return"";const d=new Date(v);return Number.isNaN(d.getTime())?"":new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 function utc(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();}
 async function loadSettings(){const r=await db.from("site_settings").select("setting_key,setting_value");if(r.error)throw r.error;settings=Object.fromEntries((r.data||[]).map(x=>[x.setting_key,x.setting_value]));const a=settings.announcement||{},m=settings.maintenance_notice||{},f=settings.homepage_featured||{},d=settings.directory_settings||{},l=settings.language_settings||{},ft=settings.footer_settings||{},faq=settings.faq_items||{},nav=settings.custom_nav_links||{};$("ac-ann-on").checked=!!a.enabled;$("ac-ann-text").value=a.text||"";$("ac-ann-start").value=local(a.start_at);$("ac-ann-end").value=local(a.end_at);$("ac-maint-on").checked=!!m.enabled;$("ac-maint-text").value=m.text||"";$("ac-feature-title").value=f.title||"";$("ac-feature-desc").value=f.description||"";$("ac-feature-url").value=f.url||"";$("ac-bio-on").checked=d.show_bio!==false;$("ac-language").value=langs.includes(l.default)?l.default:"en";$("ac-footer-text").value=ft.text||"Contact: liquindohq@yahoo.com";$("ac-faq-json").value=JSON.stringify(Array.isArray(faq.items)?faq.items:[],null,2);$("ac-nav-json").value=JSON.stringify(Array.isArray(nav.items)?nav.items:[],null,2);$("ac-settings-raw").textContent=JSON.stringify(settings,null,2);say("ac-settings-status","Loaded "+Object.keys(settings).length+" settings.");}
 async function saveSettings(){const a={enabled:$("ac-ann-on").checked,text:$("ac-ann-text").value.trim(),start_at:utc($("ac-ann-start").value),end_at:utc($("ac-ann-end").value)},m={enabled:$("ac-maint-on").checked,text:$("ac-maint-text").value.trim()},f={title:$("ac-feature-title").value.trim(),description:$("ac-feature-desc").value.trim(),url:$("ac-feature-url").value.trim()};let faqItems,navItems;try{faqItems=JSON.parse($("ac-faq-json").value||"[]");navItems=JSON.parse($("ac-nav-json").value||"[]");}catch{throw Error("FAQ and navigation entries must be valid JSON.");}if(!Array.isArray(faqItems)||faqItems.length>20||faqItems.some(x=>!x||typeof x.question!=="string"||typeof x.answer!=="string"||!x.question.trim()||x.question.length>200||x.answer.length>2000))throw Error("Use up to 20 FAQ objects with a question (max 200 chars) and answer (max 2,000 chars).");if(!Array.isArray(navItems)||navItems.length>10||navItems.some(x=>!x||typeof x.label!=="string"||typeof x.url!=="string"||!x.label.trim()||x.label.length>60||x.url.length>300||!(/^(https:\/\/|\/|\.\/|\.\.\/|#)/i.test(x.url))))throw Error("Use up to 10 navigation links with a label (max 60 chars) and safe URL.");if(a.start_at&&a.end_at&&new Date(a.start_at)>=new Date(a.end_at))throw Error("Announcement end must be later than start.");if(f.url&&!/^(https?:\/\/|\/|\.\/|#)/i.test(f.url))throw Error("Featured link must be http(s), relative, or anchor.");const vals={announcement:a,maintenance_notice:m,homepage_featured:f,directory_settings:{show_bio:$("ac-bio-on").checked},language_settings:{default:$("ac-language").value,enabled:langs},footer_settings:{text:$("ac-footer-text").value.trim(),links:Array.isArray(settings.footer_settings?.links)?settings.footer_settings.links:[]},faq_items:{items:faqItems},custom_nav_links:{items:navItems}},rows=Object.entries(vals).map(([setting_key,setting_value])=>({setting_key,setting_value,updated_at:new Date().toISOString(),updated_by:adminId})),r=await db.from("site_settings").upsert(rows,{onConflict:"setting_key"});if(r.error)throw r.error;await log("site_settings.saved","site_settings","homepage",{keys:Object.keys(vals)});await loadSettings();await overview();say("ac-settings-status","Saved. Homepage display settings apply on reload.");}
 $("ac-save-settings").onclick=async()=>{
  const button=$("ac-save-settings");if(button.disabled)return;
  button.disabled=true;say("ac-settings-status","Saving settings to Supabase…");
  try{await saveSettings();}
  catch(e){say("ac-settings-status",e.message||"Could not save settings.",true);}
  finally{button.disabled=false;}
 };
 $("ac-preview-settings").onclick=()=>{const x=[];if($("ac-ann-on").checked)x.push("Announcement: "+$("ac-ann-text").value);if($("ac-maint-on").checked)x.push("Maintenance: "+$("ac-maint-text").value);if($("ac-feature-title").value)x.push("Featured: "+$("ac-feature-title").value+" — "+$("ac-feature-desc").value);$("ac-preview").textContent=x.join(" | ")||"No active notices."; $("ac-preview").classList.remove("ac-hidden");};
 $("ac-search-form").onsubmit=async e=>{e.preventDefault();const o=$("ac-search-results");o.replaceChildren();say("ac-search-status","Searching…");const q=$("ac-search-q").value.trim().replace(/[%_,]/g," ");try{const [p,w]=await Promise.all([db.from("profiles").select("id,display_name,role,bio").or("display_name.ilike.%"+q+"%,bio.ilike.%"+q+"%").limit(25),db.from("wiki_pages").select("slug,title,description").or("title.ilike.%"+q+"%,slug.ilike.%"+q+"%,description.ilike.%"+q+"%").limit(25)]);if(p.error)throw p.error;if(w.error)throw w.error;const add=(title,desc,meta,href)=>{const a=document.createElement("article");a.className="ac-item";const h=document.createElement("h3");h.textContent=title;const d=document.createElement("p");d.textContent=desc||"";const m=document.createElement("p");m.className="ac-meta";m.textContent=meta;const l=document.createElement("a");l.href=href;l.textContent="Open →";a.append(h,d,m,l);o.append(a);};(p.data||[]).forEach(x=>add(x.display_name||"Profile",x.bio,"Profile · "+x.role,"members.html"));(w.data||[]).forEach(x=>add(x.title,x.description,"Wiki · "+x.slug,"wiki.html#"+encodeURIComponent(x.slug)));say("ac-search-status","Found "+o.children.length+" results.");}catch(err){say("ac-search-status",err.message,true);}};
 async function audit(){const o=$("ac-audit-rows");o.replaceChildren();const r=await db.from("admin_audit_log").select("id,actor_id,action,target_type,target_id,details,created_at").order("created_at",{ascending:false}).limit(100);if(r.error){say("ac-audit-status",r.error.message,true);return;}auditRows=r.data||[];auditRows.forEach(x=>{const tr=document.createElement("tr");[new Date(x.created_at).toISOString().replace("T"," ").replace("Z"," UTC"),x.actor_id||"System",x.action,x.target_type+" · "+(x.target_id||""),JSON.stringify(x.details||{})].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});o.append(tr);});if(!auditRows.length)o.innerHTML='<tr><td colspan="5">No entries yet.</td></tr>';say("ac-audit-status","Showing "+auditRows.length+" recent entries.");}
 async function health(){const o=$("ac-health-results");o.replaceChildren();const add=(title,ok,msg)=>{const a=document.createElement("article");a.className="ac-item";const h=document.createElement("h3");h.textContent=(ok?"✓ ":"⚠ ")+title;const p=document.createElement("p");p.textContent=msg;a.append(h,p);o.append(a);};const columns={profiles:"id",wiki_pages:"id",wiki_revisions:"id",wiki_permissions:"user_id",site_settings:"setting_key",site_settings_history:"id",admin_audit_log:"id",admin_incidents:"id"};for(const [t,col] of Object.entries(columns)){const r=await db.from(t).select(col,{head:true,count:"exact"}).limit(1);add("Table "+t,!r.error,r.error?r.error.message:"Reachable.");}for(const p of ["index.html","members.html","wiki.html","wiki-editor.html","admin-tools.html","i18n.js"]){try{const r=await fetch(p,{cache:"no-store"});add(p,r.ok,"HTTP "+r.status);}catch(e){add(p,false,e.message);}}say("ac-health-status","Read-only checks complete.");}
 async function exportBackup(full){try{const s=await db.from("site_settings").select("*");if(s.error)throw s.error;const b={format:"liquindo-admin-backup-v1",created_at:new Date().toISOString(),kind:full?"content-snapshot":"configuration",site_settings:s.data||[]};if(full){const [p,w,r]=await Promise.all([db.from("profiles").select("id,display_name,role,bio"),db.from("wiki_pages").select("id,slug,title,description,content,created_by,updated_by,created_at,updated_at"),db.from("wiki_revisions").select("id,page_id,slug,title,content,edited_by,edited_at,status,reviewed_by,reviewed_at,review_note")]);if(p.error)throw p.error;if(w.error)throw w.error;if(r.error)throw r.error;Object.assign(b,{profiles:p.data||[],wiki_pages:w.data||[],wiki_revisions:r.data||[],note:"Read-only snapshot; excludes authentication secrets and visitor IP logs."});}download("liquindo-"+(full?"content":"config")+"-"+Date.now()+".json",b);say("ac-backup-status","Export generated; store it securely.");}catch(e){say("ac-backup-status",e.message,true);}}
 $("ac-backup-config").onclick=()=>exportBackup(false);$("ac-backup-full").onclick=()=>exportBackup(true);
 $("ac-backup-file").onchange=async e=>{backup=null;$("ac-backup-apply").disabled=true;const f=e.target.files?.[0],box=$("ac-backup-preview");box.classList.add("ac-hidden");if(!f)return;try{if(f.size>5*1024*1024)throw Error("File exceeds 5 MB.");const b=JSON.parse(await f.text());if(b.format!=="liquindo-admin-backup-v1"||!Array.isArray(b.site_settings))throw Error("Not a recognised backup.");if(b.site_settings.some(x=>!x.setting_key||!("setting_value"in x)))throw Error("Malformed backup entries.");backup=b;box.textContent="Ready to upsert "+b.site_settings.length+" site settings. No rows will be deleted and profiles/wiki content will not be changed.";box.classList.remove("ac-hidden");$("ac-backup-apply").disabled=false;}catch(err){box.textContent=err.message;box.classList.remove("ac-hidden");say("ac-backup-status",err.message,true);}};
 $("ac-backup-apply").onclick=async()=>{if(!backup||!confirm("Restore these site settings? Matching entries will be overwritten; nothing will be deleted."))return;try{const s=backup.site_settings.map(x=>({setting_key:x.setting_key,setting_value:x.setting_value,updated_at:new Date().toISOString(),updated_by:adminId}));if(s.length){const r=await db.from("site_settings").upsert(s,{onConflict:"setting_key"});if(r.error)throw r.error;}await log("backup.restored","configuration","site",{settings:s.length});backup=null;$("ac-backup-file").value="";$("ac-backup-preview").classList.add("ac-hidden");say("ac-backup-status","Restore complete; no rows deleted.");await loadSettings();await overview();}catch(e){say("ac-backup-status",e.message,true);}};
 async function incidents(){const o=$("ac-incidents-list");o.replaceChildren();const r=await db.from("admin_incidents").select("*").order("updated_at",{ascending:false}).limit(100);if(r.error){say("ac-incidents-status",r.error.message,true);return;}(r.data||[]).forEach(x=>{const a=document.createElement("article");a.className="ac-item";const h=document.createElement("h3");h.textContent=x.title;const p=document.createElement("p");p.textContent=x.description||"No description.";const m=document.createElement("p");m.className="ac-meta";m.textContent=x.severity.toUpperCase()+" · "+x.status+" · "+new Date(x.created_at).toLocaleString();const s=document.createElement("select");[["open","Open"],["investigating","Investigating"],["resolved","Resolved"]].forEach(([v,t])=>{const z=document.createElement("option");z.value=v;z.textContent=t;s.append(z);});s.value=x.status;const b=document.createElement("button");b.type="button";b.className="ac-btn";b.textContent="Update status";b.onclick=async()=>{if(s.value===x.status){say("ac-incidents-status","Choose a different status first.");return;}b.disabled=true;s.disabled=true;say("ac-incidents-status","Saving incident status…");try{const nextStatus=s.value;const u=await db.from("admin_incidents").update({status:nextStatus,updated_at:new Date().toISOString(),updated_by:adminId}).eq("id",x.id).select("id,status").maybeSingle();if(u.error)throw u.error;if(!u.data)throw new Error("No incident was updated. Refresh and check your administrator access.");await log("incident.status_changed","incident",x.id,{status:nextStatus});say("ac-incidents-status","Incident status saved.");await incidents();await overview();}catch(error){s.value=x.status;say("ac-incidents-status",error.message||"Could not update incident status.",true);}finally{b.disabled=false;s.disabled=false;}};a.append(h,p,m,s,b);o.append(a);});say("ac-incidents-status",(r.data||[]).length+" incidents.");}
 $("ac-incident-form").onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button[type="submit"]');b.disabled=true;try{const x={title:$("ac-incident-title").value.trim(),description:$("ac-incident-desc").value.trim(),severity:$("ac-incident-severity").value,created_by:adminId,updated_by:adminId},r=await db.from("admin_incidents").insert(x);if(r.error)throw r.error;await log("incident.created","incident",x.title,{severity:x.severity});e.currentTarget.reset();await incidents();await overview();}catch(err){say("ac-incidents-status",err.message,true);}finally{b.disabled=false;}};
 async function i18nCheck(){
  const out=$("ac-i18n-results");out.replaceChildren();say("ac-i18n-status","Checking translation keys and same-site links…");
  const pages=["index.html","admin-tools.html","members.html","wiki.html","hierarchy.html","gallery.html","login.html"];
  try{
   const [tr,...responses]=await Promise.all([fetch("i18n.js",{cache:"no-store"}),...pages.map(p=>fetch(p,{cache:"no-store"}))]);
   const source=tr.ok?await tr.text():"";const seenLinks=new Set();let broken=0;
   const add=(title,detail,ok)=>{const a=document.createElement("article");a.className="ac-item";const h=document.createElement("h3");h.textContent=(ok?"✓ ":"⚠ ")+title;const p=document.createElement("p");p.className="ac-muted";p.textContent=detail;a.append(h,p);out.append(a);};
   for(let i=0;i<pages.length;i++){
    const response=responses[i];if(!response.ok){add(pages[i],"HTTP "+response.status,false);continue;}
    const html=await response.text();const keys=[...html.matchAll(/data-i18n(?:-placeholder|-title)?=["']([^"']+)["']/g)].map(m=>m[1]);const missing=[...new Set(keys.filter(k=>!source.includes(k)))];
    add(pages[i]+" translation keys",keys.length+" references; "+missing.length+" not found"+(missing.length?": "+missing.join(", "):""),missing.length===0);
    const hrefs=[...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m=>m[1]);
    for(const href of hrefs){
      if(!href||/^(#|mailto:|tel:|javascript:|data:|https?:\/\/)/i.test(href))continue;
      let target;try{target=new URL(href,new URL(pages[i],location.href));}catch{continue;}
      if(target.origin!==location.origin||seenLinks.has(target.pathname)||!/\.(html|js|css|json|png|jpe?g|webp|svg|ico)$/i.test(target.pathname))continue;
      seenLinks.add(target.pathname);
      try{const check=await fetch(target.pathname,{cache:"no-store"});if(!check.ok){broken++;add("Broken internal resource",href+" referenced from "+pages[i]+" returned HTTP "+check.status,false);}}
      catch(err){broken++;add("Unreachable internal resource",href+" referenced from "+pages[i]+": "+err.message,false);}
    }
   }
   say("ac-i18n-status","Checked "+pages.length+" pages and "+seenLinks.size+" unique same-site resources; "+broken+" resource failures. Translation checks only verify key presence, not translation quality.");
  }catch(e){say("ac-i18n-status",e.message,true);}
 }
 let accountSearchTimer=null;$("ac-account-filter").addEventListener("input",()=>{clearTimeout(accountSearchTimer);accountSearchTimer=setTimeout(()=>loadProfiles(true),250);});$("ac-refresh").onclick=()=>{overview();loadProfiles(true);loadSettings();};
 const loadMoreProfiles=$("ac-accounts-load-more");if(loadMoreProfiles)loadMoreProfiles.addEventListener("click",()=>loadProfiles(false));$("ac-audit-refresh").onclick=audit;$("ac-audit-export").onclick=()=>download("liquindo-audit.json",auditRows);$("ac-health-run").onclick=health;$("ac-i18n-run").onclick=i18nCheck;
 async function start(id){if(!id||adminId===id)return;adminId=id;const tasks=[overview,()=>loadProfiles(true),loadSettings,audit,incidents,loadSettingsHistory];const results=await Promise.allSettled(tasks.map(task=>Promise.resolve().then(task)));const failed=results.filter(result=>result.status==="rejected");if(failed.length)say("ac-overview-status",failed.length+" administration task(s) failed to load. Check the relevant section for details.",true);}
 const verifiedId=document.documentElement.dataset.liquindoAdminUserId;
 if(verifiedId)start(verifiedId);
 document.addEventListener("liquindo-admin-verified",event=>start(event.detail?.userId));
})();