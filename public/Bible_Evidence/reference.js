import {escape,sourceLink,pointUrl,quoteMarkup,loadData} from './reference-common.js';
const $=selector=>document.querySelector(selector);
const state={view:'timeline',zoom:'overview',query:'',book:'all',stage:'all',showEmpty:false,bookLimits:new Map(),sourceLimit:60};
let data,nodesById,sourcesById,searchIndex,bookSets;
const normalize=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[–—]/g,'-');
function readUrl(){
  const p=new URLSearchParams(location.search);
  state.view=p.get('view')==='sources'?'sources':'timeline';state.query=p.get('query')||'';
  state.book=data.books.some(b=>b.title===p.get('book'))?p.get('book'):'all';
  state.stage=data.stages.some(s=>s.id===p.get('stage'))?p.get('stage'):'all';
  state.zoom=['overview','discoveries','passages'].includes(p.get('zoom'))?p.get('zoom'):(p.get('expand')==='all'?'passages':state.book!=='all'?'discoveries':'overview');state.showEmpty=p.get('empty')==='show';
  state.bookLimits=new Map((p.get('shown')||'').split(',').map(value=>value.split(':')).filter(([id,count])=>data.books.some(b=>b.id===id)&&/^\d+$/.test(count)).map(([id,count])=>[id,Math.min(Number(count),data.nodes.length)]));
  $('#research-search').value=state.query;$('#book-filter').value=state.book;$('#show-empty').checked=state.showEmpty;
}
function syncUrl(){
  const url=new URL(location.href);for(const key of ['evidence','kind','expand','expanded'])url.searchParams.delete(key);
  for(const [key,value,baseline] of [['view',state.view,'timeline'],['zoom',state.zoom,state.book==='all'?'overview':''],['query',state.query,''],['book',state.book,'all'],['stage',state.stage,'all'],['empty',state.showEmpty?'show':'','']])value===baseline?url.searchParams.delete(key):url.searchParams.set(key,value);
  const shown=[...state.bookLimits].map(([id,count])=>`${id}:${count}`).join(',');if(shown)url.searchParams.set('shown',shown);else url.searchParams.delete('shown');history.replaceState(null,'',url);
}
function nodeMatches(node,ignoreBook=false){
  if(state.stage!=='all'&&!node.stageIds.includes(state.stage))return false;
  if(!ignoreBook&&state.book!=='all'&&!bookSets.get(node.id).has(state.book))return false;
  if(!state.query)return true;
  return searchIndex.get(node.id).includes(normalize(state.query));
}
function fromBook(book){const url=new URL(location.href);url.hash=`book-${book.id}`;return `${url.pathname}${url.search}${url.hash}`;}
function tile(node,book){
  const quote=node.quotes.find(q=>q.book===book.title);
  const date=node.geography&&!node.startYear?'':node.dateLabel;
  if(state.zoom==='overview')return `<a class="overview-point" href="${escape(pointUrl(node.id,book.title,fromBook(book)))}" title="${escape(node.title)}"><strong>${escape(node.title)}</strong><span title="${escape(quote.reference)}${date?` · ${escape(date)}`:''}">${escape(quote.reference)}${date?` · ${escape(date)}`:''}</span></a>`;
  return `<article class="discovery-tile"><a class="tile-link" href="${escape(pointUrl(node.id,book.title,fromBook(book)))}" aria-labelledby="tile-${book.id}-${node.id}">${state.zoom==='passages'&&node.image?`<div class="tile-image"><img src="/Bible_Evidence/assets/${escape(node.image)}" alt="${escape(node.title)}" loading="lazy"></div>`:''}<div class="tile-body">${date?`<p class="tile-date">${escape(date)}</p>`:''}<h3 id="tile-${book.id}-${node.id}">${escape(node.title)}</h3>${state.zoom==='passages'?quoteMarkup(quote):`<p class="tile-reference">${escape(quote.reference)}</p>`}${state.zoom==='passages'?`${node.geography&&quote.editorialNote?.startsWith('OpenBible indexes')?'<p class="quotation-note">The indexed name varies by translation. See passage notes.</p>':''}<p class="tile-summary">${escape(node.summary)}</p>`:''}</div></a></article>`;
}
function renderBooks(visible){
  const books=data.books.filter(b=>(state.book==='all'||state.book===b.title)&&(state.stage==='all'||b.stageIds.includes(state.stage))&&(state.book===b.title||visible.some(n=>n.quotes.some(q=>q.book===b.title))||state.showEmpty&&!state.query));
  let lastTestament;
  $('#bible-matrix').innerHTML=books.map(book=>{
    const nodes=visible.filter(n=>bookSets.get(n.id).has(book.title)),limit=state.zoom==='overview'?4:(state.bookLimits.get(book.id)||(state.book!=='all'?24:4)),shown=nodes.slice(0,limit);
    const testament=book.order<=39?'HEBREW BIBLE / OLD TESTAMENT':'NEW TESTAMENT',marker=testament!==lastTestament?`<h2 class="testament-marker">${testament}</h2>`:'';lastTestament=testament;
    return `${marker}<section class="book-section" data-view="${state.zoom}" id="book-${book.id}" aria-labelledby="book-title-${book.id}"><header class="book-heading"><div class="book-heading-main"><h2 id="book-title-${book.id}"><button class="book-focus" data-book="${escape(book.title)}" aria-label="Explore ${escape(book.title)}">${escape(book.title)}</button></h2><button class="book-total" data-book="${escape(book.title)}" aria-label="Explore all ${nodes.length} data points in ${escape(book.title)}">${nodes.length.toLocaleString()} ${nodes.length===1?'point':'points'}</button></div><div class="book-period"><p>${escape(book.periodLabel)}</p><details><summary>About this period</summary><p>${escape(book.periodNote)}</p>${book.sources.map(s=>`<div>${sourceLink(s)}</div>`).join('')}</details></div></header>${state.zoom!=='overview'&&state.book!=='all'?`<details class="book-context"><summary>Book context</summary><p>${escape(book.summary)}</p></details>`:''}<div class="${state.zoom==='overview'?'overview-points':'discovery-tiles'}">${shown.map(n=>tile(n,book)).join('')||'<p class="book-empty">No connected points in this view.</p>'}</div>${state.zoom!=='overview'&&nodes.length>shown.length?`<button class="book-more" data-load="${book.id}" data-limit="${limit+24}">Show ${Math.min(24,nodes.length-shown.length)} more · ${shown.length} of ${nodes.length} shown</button>`:''}</section>`;
  }).join('');return books.length;
}
function renderSources(visible){
  const selected=new Set(visible.flatMap(n=>n.sourceIds)),sources=data.sources.filter(s=>selected.has(s.id));
  $('#source-list').innerHTML=sources.slice(0,state.sourceLimit).map(s=>`<article class="source-entry"><span class="source-meta">${escape(s.institution)}</span><h3>${sourceLink(s)}</h3><p>${escape(s.claimSupport)}</p><div class="source-records"><span>Connected points</span>${s.nodeIds.map(id=>`<a href="${escape(pointUrl(id))}">${escape(nodesById.get(id).title)}</a>`).join('')}</div><details><summary>Source notes</summary>${s.uses.filter(u=>visible.some(n=>n.id===u.nodeId)).map(u=>`<p><strong>${escape(nodesById.get(u.nodeId).title)}:</strong> ${escape(u.claimSupport)}<br>${escape(u.accessNote)}</p>`).join('')}<p>Source check: ${escape(s.checked||data.updated)}</p></details></article>`).join('');
  $('#source-more').hidden=sources.length<=state.sourceLimit;$('#source-more').textContent=`Show more sources · ${Math.min(state.sourceLimit,sources.length)} of ${sources.length} shown`;
  $('#collection-directory-title').textContent=`Explore ${data.collections.length} research collections`;
  $('#collection-list').innerHTML=data.collections.map(c=>`<article class="collection-entry"><span class="source-meta">${escape(c.institution)}</span><h3>${sourceLink(c)}</h3><p>${escape(c.scope)}</p><p><strong>Find more points:</strong> ${escape(c.use)}</p><details><summary>Collection notes</summary><p>${escape(c.limit)}</p><p>${escape(c.access)}</p>${c.verificationUrl?`<a href="${escape(c.verificationUrl)}" target="_blank" rel="noopener noreferrer">Collection description</a>`:''}</details></article>`).join('');return sources.length;
}
function render(){
  syncUrl();const visible=data.nodes.filter(n=>nodeMatches(n)),allBookMatches=data.nodes.filter(n=>nodeMatches(n,true));
  $('#book-filter').innerHTML='<option value="all">All books</option>'+data.books.map(b=>{const count=allBookMatches.filter(n=>bookSets.get(n.id).has(b.title)).length;return `<option value="${escape(b.title)}">${escape(b.title)} (${count})</option>`;}).join('');$('#book-filter').value=state.book;
  const count=renderBooks(visible),sourceCount=state.view==='sources'?renderSources(visible):new Set(visible.flatMap(n=>n.sourceIds)).size;
  $('#timeline-panel').hidden=state.view!=='timeline';$('#sources-panel').hidden=state.view!=='sources';$('#zoom-controls').hidden=state.view!=='timeline';$('.timeline-options').hidden=state.view!=='timeline';
  $('#timeline-view').hidden=state.view==='timeline';
  document.body.dataset.zoom=state.zoom;document.querySelectorAll('button[data-zoom]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.zoom===state.zoom));
  $('#research-results').textContent=state.view==='timeline'?`${visible.length.toLocaleString()} data ${visible.length===1?'point':'points'} · ${count} book ${count===1?'section':'sections'}`:`${sourceCount} source documents · ${visible.length.toLocaleString()} data ${visible.length===1?'point':'points'}`;
  $('#research-results').title=state.view==='timeline'?'Selected points per book. Select a book to explore all its data points. Historical periods may overlap.':'Sources behind the discoveries';$('#research-empty').hidden=count>0;
}
function reset(){Object.assign(state,{query:'',book:'all',stage:'all',zoom:'overview',sourceLimit:60,bookLimits:new Map()});$('#research-search').value='';$('#book-filter').value='all';render();}
function focusBook(title){state.book=title;state.stage='all';if(state.zoom==='overview'&&title!=='all')state.zoom='discoveries';render();$('.workbench').scrollIntoView({block:'start'});}
async function init(){
  if(location.hash.startsWith('#discovery/')){location.replace(`/Bible_Evidence/gallery.html${location.hash}`);return;}
  try{
    data=await loadData();nodesById=new Map(data.nodes.map(n=>[n.id,n]));sourcesById=new Map(data.sources.map(s=>[s.id,s]));
    bookSets=new Map(data.nodes.map(n=>[n.id,new Set(n.quotes.map(q=>q.book))]));
    searchIndex=new Map(data.nodes.map(n=>[n.id,normalize([n.title,n.summary,n.observation,n.connection,n.place,...(n.aliases||[]),...(n.geography?.identifications||[]),...(n.recordExcerpts||[]).map(e=>`${e.text} ${e.reference}`),...n.passages,...n.quotes.map(q=>q.fullText),...n.sourceIds.map(id=>{const s=sourcesById.get(id);return `${s.title} ${s.institution}`;})].join(' '))]));
    if(location.hash.startsWith('#record/')){location.replace(pointUrl(location.hash.slice(8)));return;}
    $('#collection-stats').innerHTML=`<div><strong>${data.nodes.length.toLocaleString()}</strong><small>data points</small></div><div><strong>${data.sources.length.toLocaleString()}</strong><small>source documents</small></div>`;
    $('#book-filter').innerHTML='<option value="all">All books</option>'+data.books.map(b=>{const count=data.nodes.filter(n=>n.quotes.some(q=>q.book===b.title)).length;return `<option value="${escape(b.title)}">${escape(b.title)} (${count})</option>`;}).join('');
    $('#geography-stats').textContent=`All ${data.geography.entries.toLocaleString()} geographic entries included · ${data.geography.placeVerseAssociations.toLocaleString()} verse connections`;
    $('#dataset-version').textContent=`Source selection · ${data.updated}`;readUrl();render();
    if(location.hash.startsWith('#book-'))document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'});
  }catch(error){$('#research-error').hidden=false;$('#timeline-panel').hidden=true;$('#research-results').textContent='Unable to load the collection';console.error(error);return;}
  let searchTimer;$('#research-search').addEventListener('input',e=>{state.query=e.target.value.trim();state.bookLimits.clear();state.sourceLimit=60;clearTimeout(searchTimer);searchTimer=setTimeout(render,150);});
  $('#source-more').addEventListener('click',()=>{state.sourceLimit+=60;render();});
  $('#book-filter').addEventListener('change',e=>focusBook(e.target.value));
  $('#show-empty').addEventListener('change',e=>{state.showEmpty=e.target.checked;render();});
  $('#reset-filters').addEventListener('click',reset);$('#empty-reset').addEventListener('click',reset);
  $('#timeline-view').addEventListener('click',()=>{state.view='timeline';render();});
  $('#header-sources').addEventListener('click',()=>{state.view='sources';render();$('.workbench').scrollIntoView({block:'start'});});
  document.addEventListener('click',e=>{
    const zoom=e.target.closest('button[data-zoom]');if(zoom){const anchor=scrollY>200?[...document.querySelectorAll('.book-section')].find(section=>section.getBoundingClientRect().bottom>0)?.id:null;state.zoom=zoom.dataset.zoom;render();if(anchor)document.getElementById(anchor)?.scrollIntoView({block:'start'});return;}
    const jump=e.target.closest('[data-jump]');if(jump){reset();document.getElementById(`book-${jump.dataset.jump}`)?.scrollIntoView({block:'start'});return;}
    const b=e.target.closest('[data-book]');if(b){focusBook(b.dataset.book);return;}
    const load=e.target.closest('[data-load]');if(load){const id=load.dataset.load;state.bookLimits.set(id,Number(load.dataset.limit));render();const next=document.querySelector(`[data-load="${id}"]`);if(next)next.focus({preventScroll:true});else document.querySelector(`#book-${id} .book-focus`)?.focus({preventScroll:true});return;}
  });
  window.addEventListener('popstate',()=>{readUrl();render();});
}
init();
