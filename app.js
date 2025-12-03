(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {

    // Keys
    const STORAGE_KEY = 'lf_items_v2';
    const CLAIMED_KEY = 'lf_claimed_v2';
    const DELETED_KEY = 'lf_deleted_v2'; // bumped version for consistency
    const USER_KEY = 'lf_users_v1';
    const SESSION_KEY = 'lf_session_v1';
    const THEME_KEY = 'lf_theme_v2';

    // DOM refs
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');

    const form = document.getElementById('itemForm');
    const listEl = document.getElementById('list');
    const inventoryEl = document.getElementById('inventory');
    const deletedEl = document.getElementById('deleted');

    const searchInput = document.getElementById('search');
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const sortCtrl = document.getElementById('sortCtrl');
    const filterVerified = document.getElementById('filterVerified');

    const clearAll = document.getElementById('clearAll');
    const darkToggle = document.getElementById('darkToggle');
    const importSample = document.getElementById('importSample');
    const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');

    const inventoryCountEl = document.getElementById('inventoryCount');
    const authArea = document.getElementById('authArea');

    const exportAllCsvBtn = document.getElementById('exportAllCsv');
    const exportAllPdfBtn = document.getElementById('exportAllPdf');
    const exportFilteredCsvBtn = document.getElementById('exportFilteredCsv');

    // state (use defaults safely)
    let items = load(STORAGE_KEY, []);
    let claimed = load(CLAIMED_KEY, []);
    let deleted = load(DELETED_KEY, []);
    let users = load(USER_KEY, []);
    let session = load(SESSION_KEY, null);
    let currentImage = '';
    let currentImageSize = 0;

    // initial UI
    initTheme();
    bindSidebar();
    bindBasic();
    populateCategories();
    renderList();
    renderInventory();
    renderDeleted();
    renderAuth();

    // ---------- FULLSCREEN TOGGLE (top-right) ----------
    (function bindFullscreen(){
      const existing = document.getElementById('fullscreenToggle');
      if (existing) return;

      const btn = document.createElement('button');
      btn.id = 'fullscreenToggle';
      btn.setAttribute('aria-label','Toggle fullscreen');
      btn.title = 'Toggle fullscreen (or press F)';
      btn.style.position = 'fixed';
      btn.style.top = '10px';
      btn.style.right = '10px';
      btn.style.zIndex = 10000;
      btn.style.padding = '6px 8px';
      btn.style.borderRadius = '6px';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.background = 'rgba(255,255,255,0.92)';
      btn.style.boxShadow = '0 1px 6px rgba(0,0,0,0.12)';
      btn.style.fontSize = '14px';
      btn.style.lineHeight = '1';
      btn.style.minWidth = '38px';
      btn.style.minHeight = '34px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.gap = '6px';

      const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || document.webkitIsFullScreen);
      const updateIcon = () => { btn.textContent = isFullscreen() ? '⤢' : '⛶'; };

      function enterFs(){
        try{
          if (document.documentElement.requestFullscreen) return document.documentElement.requestFullscreen();
          if (document.documentElement.webkitRequestFullscreen) return document.documentElement.webkitRequestFullscreen();
          if (document.documentElement.msRequestFullscreen) return document.documentElement.msRequestFullscreen();
        }catch(e){ console.warn('enterFs failed', e); }
      }
      function exitFs(){
        try{
          if (document.exitFullscreen) return document.exitFullscreen();
          if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
          if (document.msExitFullscreen) return document.msExitFullscreen();
        }catch(e){ console.warn('exitFs failed', e); }
      }

      btn.addEventListener('click', async () => {
        if (!isFullscreen()) await enterFs(); else await exitFs();
      });

      // keyboard shortcut for accessibility: press 'F' to toggle fullscreen
      document.addEventListener('keydown', (ev)=>{
        if(ev.key === 'f' || ev.key === 'F'){
          ev.preventDefault();
          if (!isFullscreen()) enterFs(); else exitFs();
        }
      });

      // update on change (user pressed ESC etc)
      document.addEventListener('fullscreenchange', updateIcon);
      document.addEventListener('webkitfullscreenchange', updateIcon);
      document.addEventListener('msfullscreenchange', updateIcon);

      updateIcon();
      document.body.appendChild(btn);
    })();

    // ---------- helpers ----------
    function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ console.warn('localStorage save failed', e); } }
    function load(key, fallback = null){
      try{
        const raw = localStorage.getItem(key);
        if(raw === null) return fallback;
        return JSON.parse(raw);
      }catch(e){ console.warn('localStorage load failed', e); return fallback; }
    }
    function saveAll(){ save(STORAGE_KEY, items); save(CLAIMED_KEY, claimed); save(DELETED_KEY, deleted); save(USER_KEY, users); if(session) save(SESSION_KEY, session); }

    function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
    function flash(msg, timeout=1400, type='info'){
      const el = document.createElement('div'); el.textContent = msg;
      el.style.position='fixed'; el.style.left='50%'; el.style.top='20px'; el.style.transform='translateX(-50%)';
      el.style.padding='8px 12px'; el.style.borderRadius='8px'; el.style.zIndex=9999; el.style.transition='opacity .18s';
      if(type === 'error'){
        el.style.background = '#ff6b6b'; el.style.color = '#2b0b0b';
      } else if(type === 'warn'){
        el.style.background = '#ffd580'; el.style.color = '#2b1700';
      } else {
        el.style.background='var(--accent)'; el.style.color='#03211a';
      }
      document.body.appendChild(el);
      setTimeout(()=> el.style.opacity='0', timeout-200);
      setTimeout(()=> el.remove(), timeout);
    }

    // ---------- THEME ----------
    function initTheme(){
      const saved = load(THEME_KEY, 'dark');
      if(saved === 'light'){ document.body.classList.add('light'); if(darkToggle) darkToggle.textContent='☀️'; }
      else { if(darkToggle) darkToggle.textContent='🌙'; }
      if(darkToggle) darkToggle.addEventListener('click', ()=>{
        const isLight = document.body.classList.toggle('light');
        darkToggle.textContent = isLight ? '☀️' : '🌙';
        save(THEME_KEY, isLight ? 'light' : 'dark');
      });
    }

    // ---------- SIDEBAR ----------
    function bindSidebar(){
      if(menuBtn && sidebar){ menuBtn.addEventListener('click', ()=> sidebar.classList.add('open')); }
      if(closeMenu && sidebar){ closeMenu.addEventListener('click', ()=> sidebar.classList.remove('open')); }
      // side links navigation
      document.querySelectorAll('.side-link').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          const t = btn.dataset.target;
          document.querySelectorAll('.view').forEach(v=> v.style.display = 'none');
          if(t === 'view-items'){
            document.getElementById('view-items')?.classList.remove('hidden');
            if(document.getElementById('list-controls')) document.getElementById('list-controls').style.display = '';
            document.querySelectorAll('#list, #view-inventory, #view-deleted').forEach(el=> el.style.display = (el.id === 'list' ? '' : 'none'));
          }
          if(t === 'view-inventory'){
            if(document.getElementById('list-controls')) document.getElementById('list-controls').style.display = 'none';
            document.getElementById('view-inventory').style.display = '';
            document.getElementById('view-deleted').style.display = 'none';
            document.getElementById('list').style.display='none';
          }
          if(t === 'view-deleted'){
            if(document.getElementById('list-controls')) document.getElementById('list-controls').style.display = 'none';
            document.getElementById('view-deleted').style.display = '';
            document.getElementById('view-inventory').style.display = 'none';
            document.getElementById('list').style.display='none';
          }
          sidebar.classList.remove('open');
        });
      });

      // export controls
      if(exportFilteredCsvBtn) exportFilteredCsvBtn.addEventListener('click', exportFilteredCsv);
      if(exportAllCsvBtn) exportAllCsvBtn.addEventListener('click', exportAllCsv);
      if(exportAllPdfBtn) exportAllPdfBtn.addEventListener('click', ()=> exportPdf('All Items', items.concat(claimed).concat(deleted)));
    }

    // ---------- BASIC bindings ----------
    function bindBasic(){
      if(imageInput){
        imageInput.addEventListener('change', async (e)=>{
          const f = e.target.files[0];
          if(!f){ currentImage=''; currentImageSize = 0; previewShow(); return; }
          const maxRecommended = 5 * 1024 * 1024; // 5MB
          if(f.size > maxRecommended) flash('Image > 5MB recommended max', 2500, 'warn');

          try{
            if(f.size > 1.5 * 1024 * 1024){
              const resized = await resizeImageFile(f, 1200, 0.8);
              currentImage = resized.dataUrl;
              currentImageSize = resized.size;
            } else {
              currentImage = await readFile(f);
              currentImageSize = f.size;
            }
            previewShow();
          }catch(err){
            console.error(err);
            flash('Could not read image', 1800, 'error');
            previewShow();
          }
        });
      }

      if(form){
        form.addEventListener('submit', async (e)=>{
          e.preventDefault();
          const title = (document.getElementById('title')?.value || '').trim();
          const dateVal = (document.getElementById('date')?.value || '').trim();
          const categoryVal = (document.getElementById('category')?.value || '').trim();
          const locationVal = (document.getElementById('location')?.value || '').trim();
          const descVal = (document.getElementById('description')?.value || '').trim();

          if(!title || title.length < 3) { flash('Title is required (min 3 chars)', 1800, 'error'); return; }
          if(categoryVal.length > 60){ flash('Category too long (max 60 chars)',1800,'error'); return; }
          if(locationVal.length > 80){ flash('Location too long (max 80 chars)',1800,'error'); return; }
          if(dateVal){
            const d = new Date(dateVal); const now = new Date(); if(isNaN(d.getTime())) { flash('Invalid date',1600,'error'); return; }
            if(d > now){ if(!confirm('Date is in the future. Continue?')) return; }
          }

          const obj = {
            id: Date.now().toString(36),
            type: document.getElementById('type')?.value || 'lost',
            date: dateVal || new Date().toISOString().slice(0,10),
            title,
            category: categoryVal || 'Misc',
            location: locationVal || 'Unknown',
            description: descVal || '',
            imageDataUrl: currentImage || '',
            postedBy: session?.username || 'Anonymous',
            createdAt: Date.now()
          };
          items.unshift(obj);
          saveAll();
          populateCategories();
          renderList();
          flash('Added');
          form.reset();
          currentImage = '';
          currentImageSize = 0;
          previewShow();
        });
      }

      if(importSample){ importSample.addEventListener('click', importSampleFn); }
      if(clearAll){
        clearAll.addEventListener('click', ()=>{
          if(!confirm('Clear all data?')) return;
          items=[]; claimed=[]; deleted=[]; users=[]; session=null;
          saveAll(); populateCategories(); renderList(); renderInventory(); renderDeleted(); updateCounts(); flash('Cleared');
        });
      }

      if(searchInput) searchInput.addEventListener('input', renderList);
      if(filterType) filterType.addEventListener('change', renderList);
      if(filterCategory) filterCategory.addEventListener('change', renderList);
      if(sortCtrl) sortCtrl.addEventListener('change', renderList);
      if(filterVerified) filterVerified.addEventListener('change', renderList);
    }

    // ---------- preview helper ----------
    function previewShow(){
      if(!preview) return;
      preview.innerHTML = '';
      if(currentImage){
        const img = document.createElement('img'); img.src = currentImage; img.alt='preview'; img.style.maxHeight='100%'; preview.appendChild(img); preview.setAttribute('aria-hidden','false');
        const info = document.createElement('div'); info.style.fontSize='12px'; info.style.color='var(--muted)'; info.style.marginTop='6px';
        const kb = currentImageSize ? Math.round(currentImageSize/1024) + ' KB' : '—';
        info.textContent = `Size: ${kb}`;
        preview.appendChild(info);
      } else {
        preview.innerText = 'No photo'; preview.setAttribute('aria-hidden','true');
      }
    }
    function readFile(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(); fr.readAsDataURL(file); }); }

    // Resize image file using canvas, returns { dataUrl, size }
    async function resizeImageFile(file, maxDim=1200, quality=0.8){
      return new Promise((res, rej)=>{
        const img = document.createElement('img');
        const fr = new FileReader();
        fr.onload = ()=>{
          img.onload = ()=>{
            try{
              const w = img.width, h = img.height;
              const scale = Math.min(1, maxDim / Math.max(w,h));
              const cw = Math.round(w * scale), ch = Math.round(h * scale);
              const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
              const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0,0,cw,ch);
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              const b = Math.round((dataUrl.length - (dataUrl.indexOf(',')+1)) * 3/4);
              res({ dataUrl, size: b });
            }catch(e){ rej(e); }
          };
          img.onerror = ()=> rej(new Error('img load error'));
          img.src = fr.result;
        };
        fr.onerror = ()=> rej(new Error('file read error'));
        fr.readAsDataURL(file);
      });
    }

    // ---------- import sample ----------
    function importSampleFn(){
      const now = Date.now();
      items = [{id:'s1',type:'lost',title:'Black Wallet',category:'Wallet',location:'Library',description:'Leather wallet',date:'2025-11-25',imageDataUrl:'',createdAt:now}].concat(items);
      saveAll(); populateCategories(); renderList(); flash('Sample added');
    }

    // ---------- render active list ----------
    function renderList(){
      if(!listEl) return;
      const q = (searchInput?.value||'').toLowerCase().trim();
      const ft = filterType?.value || 'all';
      const fc = filterCategory?.value || 'all';
      const sort = sortCtrl?.value || 'newest';

      let out = items.slice();
      if(ft !== 'all') out = out.filter(i=> i.type === ft);
      if(fc !== 'all') out = out.filter(i=> i.category === fc);
      if(filterVerified && filterVerified.value){
        const fv = filterVerified.value;
        if(fv === 'verified') out = out.filter(i=> !!i.verifiedBy);
        else if(fv === 'unverified') out = out.filter(i=> !i.verifiedBy);
      }
      if(q) out = out.filter(i => (i.title||'').toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q) || (i.location||'').toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
      out.sort((a,b)=> sort==='newest' ? (b.createdAt||0) - (a.createdAt||0) : (a.createdAt||0) - (b.createdAt||0));

      listEl.innerHTML = '';
      if(out.length === 0) { listEl.innerHTML = '<div class=\"card muted\" style=\"grid-column:1/-1\">No items</div>'; return; }

      out.forEach(it=>{
        const card = document.createElement('article'); card.className='item fade-in';
        const imgWrap = document.createElement('div'); imgWrap.className='img';
        if(it.imageDataUrl){ const im=document.createElement('img'); im.src=it.imageDataUrl; im.alt = it.title || 'item photo'; imgWrap.appendChild(im); } else imgWrap.innerHTML=`<div class=\"muted\" style=\"padding:12px\">No photo</div>`;
        card.appendChild(imgWrap);

        const meta = document.createElement('div'); meta.className='meta';
        const shortDate = it.date ? formatShortDate(it.date) : (it.createdAt ? formatShortDate(it.createdAt) : '—');
        const rel = it.createdAt ? ` • ${relativeTime(it.createdAt)}` : '';
        const postedBy = it.postedBy || 'Anonymous';
        meta.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class=\"muted\">${escapeHtml(it.category)} • ${escapeHtml(it.location)}</div><p class=\"muted\">${escapeHtml(it.description)}</p><div class=\"muted\">Date: ${escapeHtml(shortDate)}${escapeHtml(rel)}</div><div class=\"muted\" style=\"font-size:12px\">Posted by: ${escapeHtml(postedBy)}</div>`;

        const actions = document.createElement('div'); actions.className='actions-row';
        const claimBtn = document.createElement('button'); claimBtn.className='btn-ghost'; claimBtn.innerText='Claim';
        claimBtn.addEventListener('click', ()=>{
          if(!session || !session.username){
            flash('Please sign in or register to claim items', 2500, 'error');
            renderAuth();
            return;
          }
          items = items.filter(x=> x.id !== it.id);
          const claimedItem = Object.assign({}, it, { claimedBy: session.username, claimedAt: Date.now() });
          claimed.unshift(claimedItem);
          saveAll();
          populateCategories(); renderList(); renderInventory(); updateCounts();
          flash('Item claimed and moved to Inventory');
        });

        const delBtn = document.createElement('button'); delBtn.className='btn-ghost'; delBtn.innerText='Delete';
        delBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          if(!confirm('Delete this item?')) return;
          items = items.filter(x=> x.id !== it.id);
          deleted.unshift(Object.assign({}, it, { deletedAt: Date.now() }));
          saveAll();
          populateCategories(); renderList(); renderDeleted(); updateCounts();
          flash('Moved to Deleted');
        });

        actions.appendChild(claimBtn); actions.appendChild(delBtn);
        meta.appendChild(actions);
        card.appendChild(meta);
        if(it.verifiedBy){ const vb=document.createElement('div'); vb.className='verified-badge'; vb.textContent='VERIFIED'; card.appendChild(vb); }
        const titleEl = meta.querySelector('h3'); if(titleEl){ titleEl.style.cursor='pointer'; titleEl.addEventListener('click', ()=> showItemDetail(it)); }
        const imgEl = imgWrap.querySelector('img'); if(imgEl){ imgEl.style.cursor='pointer'; imgEl.addEventListener('click', ()=> showItemDetail(it)); }
        listEl.appendChild(card);
      });
    }

    // ---------- render inventory ----------
    function renderInventory(){
      if(!inventoryEl) return;
      inventoryEl.innerHTML = '';
      if(claimed.length===0) { inventoryEl.innerHTML = '<div class=\"card muted\">No claimed items</div>'; return; }
      claimed.forEach(it=>{
        const card = document.createElement('article'); card.className='item fade-in';
        const imgWrap = document.createElement('div'); imgWrap.className='img';
        if(it.imageDataUrl){ const im=document.createElement('img'); im.src=it.imageDataUrl; im.alt = it.title || 'claimed item photo'; imgWrap.appendChild(im); } else imgWrap.innerHTML=`<div class=\"muted\" style=\"padding:12px\">No photo</div>`;
        card.appendChild(imgWrap);

        const meta = document.createElement('div'); meta.className='meta';
        const claimant = it.claimedBy || 'Unknown';
        const claimedAtShort = it.claimedAt ? formatShortDate(it.claimedAt) : (it.createdAt ? formatShortDate(it.createdAt) : '—');
        const claimedRel = it.claimedAt ? ` • ${relativeTime(it.claimedAt)}` : (it.createdAt ? ` • ${relativeTime(it.createdAt)}` : '');
        const verifiedBy = it.verifiedBy || '';
        const verifiedAtShort = it.verifiedAt ? formatShortDate(it.verifiedAt) : '';
        const verifiedRel = it.verifiedAt ? ` • ${relativeTime(it.verifiedAt)}` : '';
        const verifiedLine = verifiedBy ? `<p class=\"muted\">Verified: ${escapeHtml(verifiedBy)} • ${escapeHtml(verifiedAtShort)}${escapeHtml(verifiedRel)}</p>` : '';
        const postedBy = it.postedBy || 'Anonymous';
        meta.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class=\"muted\">${escapeHtml(it.category)} • ${escapeHtml(it.location)}</div><p class=\"muted\">Posted by: ${escapeHtml(postedBy)}</p><p class=\"muted\">Claimed by: ${escapeHtml(claimant)} • ${escapeHtml(claimedAtShort)}${escapeHtml(claimedRel)}</p>${verifiedLine}<p class=\"muted\">${escapeHtml(it.description)}</p>`;

        const actions = document.createElement('div'); actions.className='actions-row';
        const verifyBtn = document.createElement('button'); verifyBtn.className='btn-ghost'; verifyBtn.innerText = verifiedBy ? 'Unverify' : 'Verify';
        verifyBtn.addEventListener('click', ()=>{
          if(!(isStaff() || isAdmin())) return alert('Staff only');
          if(it.verifiedBy){ delete it.verifiedBy; delete it.verifiedAt; flash('Marked as unverified'); }
          else { it.verifiedBy = session?.username || 'staff'; it.verifiedAt = Date.now(); flash('Verified'); }
          saveAll(); renderInventory();
        });

        const delBtn = document.createElement('button'); delBtn.className='btn-ghost'; delBtn.innerText='Delete';
        delBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          if(!confirm('Delete from inventory?')) return;
          claimed = claimed.filter(x=> x.id !== it.id);
          deleted.unshift(Object.assign({}, it, { deletedAt: Date.now() }));
          saveAll();
          renderInventory(); renderDeleted(); updateCounts();
          flash('Deleted to bin');
        });

        const editBtn = document.createElement('button'); editBtn.className='btn-ghost'; editBtn.innerText='Edit';
        editBtn.addEventListener('click', ()=>{
          if(!(isAdmin() || isStaff() || (session && session.username === it.claimedBy))){ return alert('Only staff, admin, or the claimant can edit this item'); }
          showEditModal(it);
        });

        actions.appendChild(verifyBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
        meta.appendChild(actions);
        card.appendChild(meta);
        if(it.verifiedBy){ const vb=document.createElement('div'); vb.className='verified-badge'; vb.textContent='VERIFIED'; card.appendChild(vb); }
        const titleInv = meta.querySelector('h3'); if(titleInv){ titleInv.style.cursor='pointer'; titleInv.addEventListener('click', ()=> showItemDetail(it)); }
        const imgInv = imgWrap.querySelector('img'); if(imgInv){ imgInv.style.cursor='pointer'; imgInv.addEventListener('click', ()=> showItemDetail(it)); }
        inventoryEl.appendChild(card);
      });
    }

    // ---------- render deleted ----------
    function renderDeleted(){
      if(!deletedEl) return;
      deletedEl.innerHTML = '';
      if(deleted.length===0) { deletedEl.innerHTML = '<div class=\"card muted\">Bin is empty</div>'; return; }
      deleted.forEach(it=>{
        const card = document.createElement('article'); card.className='item fade-in';
        const imgWrap = document.createElement('div'); imgWrap.className='img';
        if(it.imageDataUrl){ const im=document.createElement('img'); im.src=it.imageDataUrl; im.alt = it.title || 'deleted item photo'; imgWrap.appendChild(im); } else imgWrap.innerHTML=`<div class=\"muted\" style=\"padding:12px\">No photo</div>`;
        card.appendChild(imgWrap);

        const meta = document.createElement('div'); meta.className='meta';
        const deletedAtText = it.deletedAt ? formatShortDate(it.deletedAt) : (it.createdAt ? formatShortDate(it.createdAt) : '—');
        meta.innerHTML = `<h3>${escapeHtml(it.title)}</h3><div class=\"muted\">${escapeHtml(it.category)} • ${escapeHtml(it.location)}</div><p class=\"muted\">${escapeHtml(it.description)}</p><div class=\"muted\">Deleted: ${escapeHtml(deletedAtText)}</div>`;

        const actions = document.createElement('div'); actions.className='actions-row';
        const restoreBtn = document.createElement('button'); restoreBtn.className='btn-ghost'; restoreBtn.innerText='Restore';
        restoreBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          deleted = deleted.filter(x=> x.id !== it.id);
          items.unshift(it);
          saveAll();
          renderDeleted(); renderList(); updateCounts();
          flash('Restored');
        });
        const purgeBtn = document.createElement('button'); purgeBtn.className='btn-ghost'; purgeBtn.innerText='Permanently Delete';
        purgeBtn.addEventListener('click', ()=>{
          if(!isAdmin()) return alert('Admin only');
          if(!confirm('Permanently delete?')) return;
          deleted = deleted.filter(x=> x.id !== it.id);
          saveAll();
          renderDeleted(); updateCounts();
          flash('Permanently deleted');
        });

        actions.appendChild(restoreBtn); actions.appendChild(purgeBtn);
        meta.appendChild(actions);
        card.appendChild(meta);
        deletedEl.appendChild(card);
      });
    }

    // ---------- utility: categories / counts / auth ----------
    function populateCategories(){
      if(!filterCategory) return;
      const cats = [...new Set(items.map(i=> i.category).filter(Boolean))];
      filterCategory.innerHTML = '<option value="all">All categories</option>' + cats.map(c=> `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    function updateCounts(){ if(inventoryCountEl) inventoryCountEl.textContent = String(claimed.length || 0); }

    // ---------- AUTH UI (client demo) ----------
    function renderAuth(){
      if(!authArea) return;
      authArea.innerHTML = '';
      const hasAdmin = Array.isArray(users) && users.some(u => u.role === 'admin');
      if(session && session.username){
        const box = document.createElement('div'); box.className='auth-box';
        const userRecord = Array.isArray(users) ? users.find(u => u.username === session.username) : null;
        const displayName = userRecord?.name || session.username;
        const displayEmail = userRecord?.email ? ` — ${escapeHtml(userRecord.email)}` : '';
        box.innerHTML = `<div>Signed in as <strong>${escapeHtml(displayName)}</strong> (${escapeHtml(session.role||'user')})${displayEmail}</div>`;
        const out = document.createElement('button'); out.className='ghost'; out.textContent='Logout'; out.addEventListener('click', ()=>{ session=null; localStorage.removeItem(SESSION_KEY); renderAuth(); flash('Logged out'); });
        box.appendChild(out); authArea.appendChild(box);
        const help = document.createElement('div'); help.className='role-help'; help.style.marginTop='8px';
        if(session.role === 'staff'){
          help.innerHTML = `<div style="font-size:13px;color:var(--muted)"><strong>Staff tips</strong><ul style="margin:6px 0 0 18px"><li>Use Inventory → Verify to confirm claims.</li><li>Use the Verified filter to find unverified claims quickly.</li></ul></div>`;
        } else if(session.role === 'student'){
          help.innerHTML = `<div style="font-size:13px;color:var(--muted)"><strong>Student tips</strong><ul style="margin:6px 0 0 18px"><li>Register and log in before claiming items.</li><li>Include your email so staff can contact you.</li></ul></div>`;
        } else if(session.role === 'admin'){
          help.innerHTML = `<div style="font-size:13px;color:var(--muted)"><strong>Admin tips</strong><ul style="margin:6px 0 0 18px"><li>Admins can delete/purge items and manage users (client-side demo).</li></ul></div>`;
        }
        authArea.appendChild(help);
        return;
      }

      const box = document.createElement('div'); box.className='auth-box';
      if(!hasAdmin){
        box.innerHTML = `<input id="authUser" placeholder="username" aria-label="username" required/><input id="authPass" placeholder="password" type="password" aria-label="password" required/><input id="authName" placeholder="Full name (optional)" aria-label="full name" style="margin-top:6px"/><input id="authEmail" placeholder="Email" aria-label="email" style="margin-top:6px" required/><label style="font-size:12px;color:var(--muted);display:block;margin-top:6px"><input id="authAdmin" type="checkbox"/> Register as admin</label><div style="margin-top:8px;font-size:13px;color:var(--muted)">Role: <select id="authRole"><option value="student">Student</option><option value="staff">Staff</option></select></div>`;
      } else {
        box.innerHTML = `<input id="authUser" placeholder="username" aria-label="username" required/><input id="authPass" placeholder="password" type="password" aria-label="password" required/><input id="authName" placeholder="Full name (optional)" aria-label="full name" style="margin-top:6px"/><input id="authEmail" placeholder="Email" aria-label="email" style="margin-top:6px" required/><div style="margin-top:8px;font-size:13px;color:var(--muted)">Role: <select id="authRole"><option value="student">Student</option><option value="staff">Staff</option></select></div><div style="font-size:12px;color:var(--muted);margin-top:6px">An admin account already exists. New registrations will be regular users.</div>`;
      }

      const register = document.createElement('button'); register.className='ghost'; register.textContent='Register';
      register.addEventListener('click', ()=> {
        const u = document.getElementById('authUser')?.value?.trim();
        const p = document.getElementById('authPass')?.value || '';
        const name = document.getElementById('authName')?.value?.trim() || '';
        const email = document.getElementById('authEmail')?.value?.trim() || '';
        const asAdmin = (!hasAdmin) && (document.getElementById('authAdmin')?.checked);
        const selRole = document.getElementById('authRole')?.value || 'student';
        if(!u || !p) { flash('Enter username & password', 1600, 'error'); return; }
        if(!email){ flash('Email is required', 1600, 'error'); return; }
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRe.test(email)){ flash('Invalid email address', 1800, 'error'); return; }
        if(Array.isArray(users) && users.find(x=> x.username === u)) { flash('User exists', 1600, 'error'); return; }
        if(asAdmin && hasAdmin){ flash('An admin already exists; cannot register another admin', 2000, 'error'); return; }
        users = Array.isArray(users) ? users : [];
        const role = asAdmin ? 'admin' : (selRole === 'staff' ? 'staff' : 'student');
        users.push({ username: u, hash: hashSimple(p), role, name, email });
        save(USER_KEY, users);
        flash('Registered. Now login.', 1400, 'info');
        renderAuth();
      });

      const login = document.createElement('button'); login.className='primary'; login.textContent='Login';
      login.addEventListener('click', () => {
        const u = document.getElementById('authUser')?.value?.trim(); const p = document.getElementById('authPass')?.value || '';
        const found = Array.isArray(users) ? users.find(x=> x.username === u && x.hash === hashSimple(p)) : null;
        if(!found) { flash('Invalid credentials', 1400, 'error'); return; }
        session = { username: found.username, role: found.role };
        save(SESSION_KEY, session);
        renderAuth(); flash('Logged in');
      });
      box.appendChild(register); box.appendChild(login); authArea.appendChild(box);
    }

    function isAdmin(){ return session && session.role === 'admin'; }
    function isStaff(){ return session && session.role === 'staff'; }
    function isStudent(){ return session && session.role === 'student'; }
    function hashSimple(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h=h&h; } return 'h'+Math.abs(h); }

    // ---------- date helpers ----------
    function formatShortDate(v){
      if(!v) return '—';
      let d;
      if(typeof v === 'number') d = new Date(v);
      else if(typeof v === 'string' && /^\d+$/.test(v)) d = new Date(Number(v));
      else d = new Date(v);
      try{ return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(); } catch(e){ return String(v); }
    }
    function relativeTime(v){
      if(!v) return '';
      const t = (typeof v === 'number') ? v : (+new Date(v));
      const s = Math.floor((Date.now() - t) / 1000);
      if(s < 60) return `${s}s ago`;
      const m = Math.floor(s/60); if(m < 60) return `${m}m ago`;
      const h = Math.floor(m/60); if(h < 24) return `${h}h ago`;
      const d = Math.floor(h/24); if(d < 30) return `${d}d ago`;
      const mo = Math.floor(d/30); if(mo < 12) return `${mo}mo ago`;
      const y = Math.floor(mo/12); return `${y}y ago`;
    }

    // ---------- item detail modal ----------
    function showItemDetail(it){
      try{
        const overlay = document.createElement('div'); overlay.className='lf-modal';
        Object.assign(overlay.style, {position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100000});
        const box = document.createElement('div');
        Object.assign(box.style, {background:'var(--card)',color:'var(--text)',padding:'18px',borderRadius:'10px',maxWidth:'720px',width:'92%',maxHeight:'86%',overflow:'auto',boxShadow:'0 8px 30px rgba(0,0,0,0.6)'});
        const h = document.createElement('h3'); h.textContent = it.title || 'Item';
        const meta = document.createElement('div'); meta.style.color='var(--muted)'; meta.style.fontSize='13px';
        const dateText = it.claimedAt ? `${formatShortDate(it.claimedAt)} (${relativeTime(it.claimedAt)})` : (it.date ? `${formatShortDate(it.date)} (${relativeTime(it.createdAt||it.date)})` : formatShortDate(it.createdAt));
        const claimant = it.claimedBy ? `${it.claimedBy}` : (it.claimedBy===undefined ? '—' : it.claimedBy);
        const verifiedBy = it.verifiedBy || '';
        const verifiedAtShort = it.verifiedAt ? formatShortDate(it.verifiedAt) : '';
        const verifiedRel = it.verifiedAt ? ` • ${relativeTime(it.verifiedAt)}` : '';
        const verifiedLine = verifiedBy ? `<div style="margin-top:6px;color:var(--muted);font-size:13px">Verified: ${escapeHtml(verifiedBy)} • ${escapeHtml(verifiedAtShort)}${escapeHtml(verifiedRel)}</div>` : '';
        const postedBy = it.postedBy || 'Anonymous';
        meta.innerHTML = `<div>${escapeHtml(it.category||'')} • ${escapeHtml(it.location||'')}</div><div style="margin-top:6px">Posted by: ${escapeHtml(postedBy)}</div><div style="margin-top:6px">Claimed by: ${escapeHtml(claimant)} • ${escapeHtml(dateText)}</div>${verifiedLine}`;
        try{ const claimantRec = Array.isArray(users) ? users.find(u=> u.username === it.claimedBy) : null; if(claimantRec && claimantRec.email){ meta.innerHTML += `<div style="margin-top:6px"><a href="mailto:${escapeHtml(claimantRec.email)}">Contact claimant</a></div>`; } }catch(e){}

        const desc = document.createElement('p'); desc.className='muted'; desc.textContent = it.description || '';
        box.appendChild(h); box.appendChild(meta);
        if(it.imageDataUrl){ const im=document.createElement('img'); im.src=it.imageDataUrl; im.style.maxWidth='100%'; im.style.borderRadius='8px'; im.style.margin='10px 0'; box.appendChild(im); }
        box.appendChild(desc);
        if(session && (isAdmin() || isStaff() || session.username === it.claimedBy)){
          const editNow = document.createElement('button'); editNow.textContent='Edit item'; editNow.className='ghost'; editNow.style.marginLeft='8px';
          editNow.addEventListener('click', ()=>{ showEditModal(it); overlay.remove(); });
          box.appendChild(editNow);
        }
        const close = document.createElement('button'); close.textContent='Close'; close.className='ghost'; close.style.marginTop='8px'; close.addEventListener('click', ()=> overlay.remove());
        box.appendChild(close);
        overlay.appendChild(box);
        overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
        document.body.appendChild(overlay);
      }catch(e){ console.error(e); }
    }

    // ---------- edit modal for items ----------
    function showEditModal(it){
      try{
        const overlay = document.createElement('div'); overlay.className='lf-modal';
        Object.assign(overlay.style, {position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100000});
        const box = document.createElement('div');
        Object.assign(box.style, {background:'var(--card)',color:'var(--text)',padding:'18px',borderRadius:'10px',maxWidth:'720px',width:'92%',maxHeight:'86%',overflow:'auto',boxShadow:'0 8px 30px rgba(0,0,0,0.6)'});
        const h = document.createElement('h3'); h.textContent = 'Edit Item';
        const form = document.createElement('form'); form.className='form';
        form.innerHTML = `\n          <label><span class="label">Title</span><input id="editTitle" value="${escapeHtml(it.title||'')}" /></label>\n          <label><span class="label">Category</span><input id="editCategory" value="${escapeHtml(it.category||'')}" /></label>\n          <label><span class="label">Location</span><input id="editLocation" value="${escapeHtml(it.location||'')}" /></label>\n          <label><span class="label">Description</span><textarea id="editDescription">${escapeHtml(it.description||'')}</textarea></label>\n        `;
        const saveBtn = document.createElement('button'); saveBtn.type='button'; saveBtn.className='primary'; saveBtn.textContent='Save';
        saveBtn.addEventListener('click', ()=>{
          const t = document.getElementById('editTitle')?.value?.trim() || '';
          const c = document.getElementById('editCategory')?.value?.trim() || '';
          const l = document.getElementById('editLocation')?.value?.trim() || '';
          const d = document.getElementById('editDescription')?.value?.trim() || '';
          if(!t){ flash('Title required',1400,'error'); return; }
          const updateObj = (arr)=>{ const idx = arr.findIndex(x=> x.id === it.id); if(idx >=0){ arr[idx] = Object.assign({}, arr[idx], { title: t, category: c, location: l, description: d }); return true; } return false; };
          if(updateObj(items) || updateObj(claimed) || updateObj(deleted)){
            saveAll(); populateCategories(); renderList(); renderInventory(); renderDeleted(); updateCounts(); flash('Saved'); overlay.remove();
          } else { flash('Item not found',1400,'error'); }
        });
        const cancel = document.createElement('button'); cancel.type='button'; cancel.className='ghost'; cancel.textContent='Cancel'; cancel.addEventListener('click', ()=> overlay.remove());
        box.appendChild(h); box.appendChild(form); box.appendChild(saveBtn); box.appendChild(cancel);
        overlay.appendChild(box); overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); }); document.body.appendChild(overlay);
      }catch(e){ console.error(e); }
    }

    // ---------- EXPORT helpers ----------
    function toCSV(rows){
      if(!rows || !rows.length) return '';
      const esc = v => `\"${String(v||'').replaceAll('\"','\"\"')}"`;
      const preferredKeys = ['type','title','category','location','description','date','createdAt','postedBy','claimedBy','claimedAt','verifiedBy','verifiedAt','id'];
      const union = rows.reduce((acc,r)=>{ Object.keys(r||{}).forEach(k=> acc.add(k)); return acc; }, new Set());
      const other = Array.from(union).filter(k=> !preferredKeys.includes(k)).sort();
      const keys = preferredKeys.filter(k=> union.has(k)).concat(other);
      const formatVal = (k,v) => {
        if(v === null || v === undefined) return '';
        if(/At$/.test(k) || k==='date' || k==='createdAt'){
          try{ return formatShortDate(v); }catch(e){ return String(v); }
        }
        return String(v);
      };
      const header = keys.map(esc).join(',');
      const body = rows.map(r => keys.map(k=>esc(formatVal(k, r[k]))).join(',')).join('\n');
      return header + '\n' + body;
    }
    function download(name, content, mime='text/csv'){
      const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }
    function exportAllCsv(){ const rows = items.concat(claimed).concat(deleted); if(rows.length===0) { flash('No data to export',1400,'warn'); return; } download('lostfound_all.csv', toCSV(rows)); }
    function exportPdf(title, rows){
      try{
        const html = rows.map(i=>`<div style="border-bottom:1px solid #ddd;padding:8px"><strong>${escapeHtml(i.title)}</strong><div>${escapeHtml(i.category)} • ${escapeHtml(i.location)}</div><div>${escapeHtml(i.description)}</div></div>`).join('');
        const w = window.open('','_blank','width=900,height=700');
        if(!w) { flash('Unable to open print window — please allow popups',2000,'warn'); return; }
        w.document.write(`<html><head><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,Segoe UI,Roboto,Arial;padding:16px}h1{font-size:20px}</style></head><body><h1>${escapeHtml(title)}</h1>${html}<script>setTimeout(()=>window.print(),200)</script></body></html>`);
        w.document.close();
      }catch(e){ console.error(e); flash('Unable to export PDF',1400,'error'); }
    }

    function getFilteredRows(){
      const q = (searchInput?.value||'').toLowerCase().trim();
      const ft = filterType?.value || 'all';
      const fc = filterCategory?.value || 'all';
      const fv = filterVerified?.value || 'all';
      const sort = sortCtrl?.value || 'newest';
      let out = items.slice();
      if(ft !== 'all') out = out.filter(i=> i.type === ft);
      if(fc !== 'all') out = out.filter(i=> i.category === fc);
      if(fv !== 'all'){
        if(fv === 'verified') out = out.filter(i=> !!i.verifiedBy);
        else out = out.filter(i=> !i.verifiedBy);
      }
      if(q) out = out.filter(i => (i.title||'').toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q) || (i.location||'').toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
      out.sort((a,b)=> sort==='newest' ? (b.createdAt||0) - (a.createdAt||0) : (a.createdAt||0) - (b.createdAt||0));
      return out;
    }

    function exportFilteredCsv(){ const rows = getFilteredRows(); if(!rows.length){ flash('No filtered rows to export',1400,'warn'); return; } download('lostfound_filtered.csv', toCSV(rows)); }

    // ---------- finishers ----------
    function updateCounts(){ if(inventoryCountEl) inventoryCountEl.textContent = String(claimed.length || 0); }
    updateCounts();

  });
})();
