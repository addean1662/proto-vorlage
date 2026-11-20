const items = window.discoveries;
const grid = document.querySelector('#discovery-grid');
const search = document.querySelector('#search');
const detailDialog = document.querySelector('#detail-dialog');
const creditsDialog = document.querySelector('#credits-dialog');
const bookIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 6v15"/></svg>';
const bookmarkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
let filter = 'all', savedOnly = false, credits = [], toastTimer;
let saved;
try { const stored = JSON.parse(localStorage.getItem('text-stone-saved') || '[]'); saved = new Set(Array.isArray(stored) ? stored.filter(id => items.some(item => item.id === id)) : []); } catch { saved = new Set(); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function notify(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400); }
function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const visible = items.filter(item => (filter === 'all' || item.category === filter) && (!savedOnly || saved.has(item.id)) && (!query || [item.title,item.short,item.description,item.categoryLabel,item.place,item.passage,item.material,item.found].join(' ').toLocaleLowerCase().includes(query)));
  grid.innerHTML = visible.map(item => `<article class="discovery-card"><button class="card-visual" data-open="${item.id}" aria-label="Explore ${escapeHtml(item.title)}"><img src="assets/${item.image}" alt="${escapeHtml(item.alt)}" loading="lazy"></button><button class="save-button" data-save="${item.id}" aria-pressed="${saved.has(item.id)}" aria-label="${saved.has(item.id) ? 'Remove' : 'Save'} ${escapeHtml(item.title)} ${saved.has(item.id) ? 'from' : 'to'} reading list">${bookmarkIcon}</button><div class="card-body"><p class="card-category">CONNECTED DATA POINT</p><h3 class="card-title"><button data-open="${item.id}">${item.title}</button></h3><p class="card-date">${item.date} · ${item.place}</p><p class="card-description">${item.description}</p><div class="card-bottom"><span class="passage-label">${bookIcon}${item.passage}</span><button data-open="${item.id}">Read the story</button></div></div></article>`).join('');
  document.querySelector('#results-count').textContent = savedOnly ? `${visible.length} ${visible.length === 1 ? 'discovery' : 'discoveries'} in your reading list` : `Showing ${visible.length} of ${items.length} discoveries`;
  document.querySelector('#empty-state').hidden = visible.length > 0;
  document.querySelector('#empty-state h3').textContent = savedOnly && saved.size === 0 ? 'Your reading list starts here' : 'No discoveries found';
  document.querySelector('#empty-state p').textContent = savedOnly && saved.size === 0 ? 'Use the bookmark on any discovery to keep it in your reading list on this device.' : 'Try a name, place, or passage such as “Isaiah,” “Jerusalem,” or “Kings.”';
  document.querySelector('#clear-filters').hidden = !query && filter === 'all' && !savedOnly;
  document.querySelector('#saved-count').textContent = saved.size;
  document.querySelector('#saved-nav').setAttribute('aria-pressed',savedOnly);
  document.querySelectorAll('[data-filter]').forEach(button => { const active = button.dataset.filter === filter; button.classList.toggle('active',active); button.setAttribute('aria-pressed',active); });
}
function resetFilters() { filter='all'; savedOnly=false; search.value=''; render(); }
function saveItem(id) {
  const removing = saved.has(id); removing ? saved.delete(id) : saved.add(id);
  let persisted = true; try { localStorage.setItem('text-stone-saved',JSON.stringify([...saved])); } catch { persisted = false; }
  render();
  document.querySelectorAll(`.detail-actions [data-save="${id}"]`).forEach(button => { button.textContent = saved.has(id) ? 'Remove from reading list' : 'Save to reading list'; button.setAttribute('aria-pressed',saved.has(id)); });
  notify(persisted ? (removing ? 'Removed from your reading list' : 'Saved to your reading list on this device') : 'Updated for this visit; browser storage is unavailable');
}
function getCredit(file) { return credits.find(credit => (credit.file || credit.filename || '').endsWith(file)); }
function creditMarkup(credit) { if (!credit) return ''; return `${escapeHtml(credit.author || credit.artist || '')} · <a href="${escapeHtml(credit.source_url || credit.source || '')}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · <a href="${escapeHtml(credit.license_url || credit.licenseUrl || '')}" target="_blank" rel="noopener noreferrer">${escapeHtml(credit.license || '')}</a>`; }
function openItem(id,updateHash=true) {
  const item = items.find(item=>item.id===id); if(!item) return;
  const credit = getCredit(item.image);
  document.querySelector('#detail-content').innerHTML = `<img class="detail-image" src="assets/${item.image}" alt="${escapeHtml(item.alt)}"><div class="photo-credit">${creditMarkup(credit)}${item.id==='isaiah-scroll' ? '<br>Photographic reproduction arranged into three rows; not the physical layout of the scroll.' : ''}</div><div class="detail-body"><p class="eyebrow">DATA POINT</p><h2 id="detail-title">${item.title}</h2><p class="detail-date">${item.date} · ${item.place}<br>${item.material}</p><p class="detail-lead">${item.lead}</p><h3>The discovery</h3><p>${item.found}</p><div class="detail-passage"><strong>THE BIBLICAL CONNECTION · <a href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(item.bibleQuery)}&version=KJV" target="_blank" rel="noopener noreferrer">${item.passage}</a></strong><p>${item.connection}</p></div><h3>What this find supports</h3><p>${item.supports}</p><h3>Research notes</h3><p>${item.limits}</p><div class="detail-sources"><h3>Follow the sources</h3>${item.sources.map(source=>`<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a><small>${source.note}</small>`).join('')}</div><p><a href="timeline.html#record/${item.id}">Follow this point in the Bible timeline</a></p><div class="detail-actions"><button class="button" data-save="${item.id}" aria-pressed="${saved.has(item.id)}">${saved.has(item.id)?'Remove from reading list':'Save to reading list'}</button><button class="button button-outline" data-copy="${item.id}">Copy link to discovery</button></div></div>`;
  if(!detailDialog.open) detailDialog.showModal();
  detailDialog.scrollTop=0;
  document.body.style.overflow='hidden';
  if(updateHash) history.replaceState(null,'',`#discovery/${id}`);
}
function closeDialog(dialog) { dialog.close(); document.body.style.overflow=''; if(dialog===detailDialog && location.hash.startsWith('#discovery/')) history.replaceState(null,'','#discoveries'); }
document.addEventListener('click',async event=>{
  const open=event.target.closest('[data-open]'); if(open){openItem(open.dataset.open);return;}
  const save=event.target.closest('[data-save]'); if(save){saveItem(save.dataset.save);return;}
  const copy=event.target.closest('[data-copy]'); if(copy){const url=new URL(location.href);url.hash=`discovery/${copy.dataset.copy}`;try{await navigator.clipboard.writeText(url.href);notify('Discovery link copied');}catch{notify('Copy the discovery link from your browser address bar');}return;}
  const filterButton=event.target.closest('[data-filter]'); if(filterButton){filter=filterButton.dataset.filter;render();return;}
  if(event.target.closest('.dialog-close')) closeDialog(event.target.closest('dialog'));
});
for(const dialog of [detailDialog,creditsDialog]) { dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);}); dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeDialog(dialog);}}); }
search.addEventListener('input',render);
document.querySelector('#saved-nav').addEventListener('click',()=>{savedOnly=!savedOnly;filter='all';search.value='';render();document.querySelector('#discoveries').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
document.querySelector('#clear-filters').addEventListener('click',resetFilters);
document.querySelector('#empty-reset').addEventListener('click',resetFilters);
document.querySelector('#credits-button').addEventListener('click',()=>{creditsDialog.showModal();document.body.style.overflow='hidden';});
function syncHash(){if(location.hash.startsWith('#discovery/'))openItem(decodeURIComponent(location.hash.slice(11)),false);else if(detailDialog.open)closeDialog(detailDialog);}
window.addEventListener('hashchange',syncHash);
window.addEventListener('storage',event=>{if(event.key==='text-stone-saved'){try{const value=JSON.parse(event.newValue||'[]');saved=new Set(Array.isArray(value)?value:[]);render();}catch{}}});
render();
fetch('assets/image-credits.json').then(response=>{if(!response.ok)throw new Error('credits');return response.json();}).then(data=>{
  credits=Array.isArray(data)?data:(data.images||[]);
  document.querySelector('#credits-list').innerHTML=credits.map(credit=>`<article class="credit-entry"><h3>${escapeHtml(credit.title || credit.file || credit.filename || 'Artifact photograph')}</h3><p>${creditMarkup(credit)}</p><p>${escapeHtml(credit.changes || credit.notes || credit.note || '')} Collection previews may crop the photograph; any adapted views retain the stated license.</p></article>`).join('');
  syncHash();
}).catch(()=>{document.querySelector('#credits-list').textContent='Image credits could not load. Reload this page to try again.';syncHash();});
