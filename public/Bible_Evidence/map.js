import {escape,pointUrl} from './reference-common.js';

const $=selector=>document.querySelector(selector);
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[–—]/g,'-');
const regions={overview:[[28.7,24.4],[42.3,43.4]],holyland:[[29.1,33.7],[34.3,37.4]],asia:[[35.4,25.2],[42.2,43.8]],world:[[13,-9],[49,66]]};
const periods=[
  {id:'canaan',title:'Ancient Canaan',date:'1400 BCE',year:-1400,color:'#94723c'},
  {id:'first-temple',title:'First Temple period',date:'850 BCE',year:-850,color:'#806f3b'},
  {id:'second-temple',title:'Second Temple period',date:'30 CE',year:30,color:'#7f704c'},
  {id:'byzantine',title:'Byzantine',date:'550 CE',year:550,color:'#766484'},
  {id:'ottoman',title:'Ottoman',date:'1600 CE',year:1600,color:'#527766'},
  {id:'pre-wwi',title:'Pre-WWI',date:'1913 CE',year:1913,color:'#657c8c'},
  {id:'modern',title:'Modern',date:'Present-day',color:'#5f7387'}
];
const state={names:'ancient',boundaries:'ancient',period:'second-temple',opacity:45,compare:false,book:'all',query:'',region:'overview',selected:'',location:0,inView:false,unlocated:false,limit:40};
const landmarks=['place-jerusalem','geo-ephesus','geo-antioch-1','geo-damascus','geo-tarsus','geo-smyrna','geo-pergamum','place-tyre','place-nineveh','place-babylon','geo-corinth','geo-rome','geo-alexandria','geo-capernaum','geo-nazareth','place-jericho','geo-sidon','geo-haran','place-susa','geo-miletus','geo-sardis','geo-laodicea'];
let data,map,places,byId,searches,clusters,labels,selection,alternate,ancient,modern,markerById=new Map(),countryLabels=[],filtered=[],initializing=true;
let periodRequest=0,historicalFill,periodCache=new Map();

async function json(url){const response=await fetch(url);if(!response.ok)throw new Error(`Map resource unavailable: ${url}`);return response.json();}
function readState(){
  const p=new URLSearchParams(location.search);
  state.names=p.get('names')==='modern'?'modern':'ancient';
  state.boundaries=['modern','none'].includes(p.get('boundaries'))?p.get('boundaries'):'ancient';
  state.period=periods.some(period=>period.id===p.get('period'))?p.get('period'):'second-temple';
  state.opacity=p.has('opacity')?Math.max(0,Math.min(100,Number(p.get('opacity'))||0)):45;state.compare=p.get('compare')==='1';
  state.book=data.books.some(b=>b.title===p.get('book'))?p.get('book'):'all';
  state.query=p.get('query')||'';state.region=p.get('region') in regions?p.get('region'):'overview';
  state.selected=byId.has(p.get('place'))?p.get('place'):'';
  const selected=byId.get(state.selected);state.location=selected?Math.max(0,Math.min(Number.parseInt(p.get('loc')||'0',10)||0,selected.locations.length-1)):0;
  state.inView=p.get('inview')==='1';state.unlocated=p.get('unlocated')==='1';
}
function syncUrl(){
  if(initializing)return;
  const url=new URL(location.href);url.search='';
  for(const [key,value,defaultValue] of [['names',state.names,'ancient'],['boundaries',state.boundaries,'ancient'],['period',state.period,'second-temple'],['opacity',String(state.opacity),'45'],['compare',state.compare?'1':'',''],['book',state.book,'all'],['query',state.query,''],['region',state.region,'overview'],['place',state.selected,''],['loc',String(state.location),'0'],['inview',state.inView?'1':'',''],['unlocated',state.unlocated?'1':'','']])if(value!==defaultValue)url.searchParams.set(key,value);
  if(map){const c=map.getCenter();url.searchParams.set('center',`${c.lat.toFixed(5)},${c.lng.toFixed(5)}`);url.searchParams.set('zoom',String(map.getZoom()));}
  history.replaceState(null,'',url);
  document.querySelectorAll('#place-detail a[href*="discovery.html?"]').forEach(link=>{const target=new URL(link.href);target.searchParams.set('from',`${url.pathname}${url.search}`);link.href=`${target.pathname}${target.search}`;});
}
function returnPath(){syncUrl();return `${location.pathname}${location.search}`;}
function isArea(location){return location?.featureType==='region'||location?.ancientGeometry==='polygon';}
function displayName(place,location=0){const c=place.locations[location];return state.names==='modern'&&c?`${c.name}${isArea(c)?' · area reference':''}`:place.name;}
function coordinate(place){return place.locations[place.id===state.selected?state.location:0];}
function matches(place){return (!state.unlocated||!place.locations.length)&&(state.book==='all'||place.quotes.some(q=>q.book===state.book))&&(!state.query||searches.get(place.id).includes(normalize(state.query)));}
function matchesViewport(place){const c=coordinate(place);return !state.inView||c&&map.getBounds().contains([c.lat,c.lon]);}
function updateControls(){
  $('#map-search').value=state.query;$('#map-book').value=state.book;$('#in-view').checked=state.inView;
  $('#map-period').value=state.period;$('#layer-opacity').value=state.opacity;$('#opacity-value').textContent=`${state.opacity}%`;$('#compare-modern').checked=state.compare;
  document.querySelectorAll('[data-names]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.names===state.names));
  document.querySelectorAll('[data-boundaries]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.boundaries===state.boundaries));
  document.querySelectorAll('[data-region]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.region===state.region));
  $('#map-name-label').textContent=state.names==='ancient'?'Ancient / biblical place names':'Present-day site names';
  const period=periods.find(p=>p.id===state.period);
  $('#map-boundary-label').textContent=state.boundaries==='ancient'?`${period.title} · ${period.date}`:state.boundaries==='modern'?'Present-day boundaries · disputed lines dashed':'Boundary lines hidden';
  $('#period-caption').textContent=period.id==='modern'?'Present-day boundaries from Natural Earth.':`${period.date} snapshot · Holy Land & Asia Minor · All reference pins remain available`;
  $('#period-download').href=period.id==='modern'?'assets/map/modern-boundaries.geojson':`assets/map/period-${period.id}.geojson`;
  $('#compare-modern').disabled=state.period==='modern'||state.boundaries!=='ancient';
  $('#layer-opacity').disabled=state.period==='modern'||state.boundaries!=='ancient';
  $('#unlocated-places').textContent=state.unlocated?'Show all places':`Places without coordinates (${data.counts.unlocated})`;
}
async function setBoundaryLayers(){
  const request=++periodRequest,period=periods.find(p=>p.id===state.period);
  if(ancient&&map.hasLayer(ancient))map.removeLayer(ancient);if(map.hasLayer(modern))map.removeLayer(modern);
  renderLabels();$('#period-status').textContent='';
  if(state.boundaries==='none')return;
  if(state.boundaries==='modern'||period.id==='modern'){modern.addTo(map);return;}
  $('#period-status').textContent=`Loading ${period.title}…`;
  try{
    if(!periodCache.has(period.id))periodCache.set(period.id,json(`assets/map/period-${period.id}.geojson`));
    const geojson=await periodCache.get(period.id);if(request!==periodRequest)return;
    historicalFill=L.geoJSON(geojson,{style:{stroke:false,fillColor:period.color,fillOpacity:state.opacity/100*.45,pane:'atlasAncient',interactive:false},interactive:false});
    const outlines={type:'FeatureCollection',features:geojson.features.filter(f=>f.displayBoundary).map(f=>({type:'Feature',properties:f.properties,geometry:f.displayBoundary}))};
    ancient=L.layerGroup([historicalFill,L.geoJSON(outlines,{style:{color:period.color,weight:1.4,opacity:.82,pane:'atlasAncient',interactive:false},interactive:false})]).addTo(map);
    if(state.compare)modern.addTo(map);
    $('#period-status').textContent='Regional reconstructions · Cliopatria / Seshat';renderLabels();
  }catch(error){if(request!==periodRequest)return;periodCache.delete(period.id);$('#period-status').textContent='This period could not load. Select it again to retry; reference pins remain available.';console.error(error);}
}
function label(lat,lon,text,kind){return L.marker([lat,lon],{interactive:false,keyboard:false,pane:'atlasLabels',icon:L.divIcon({className:`map-label ${kind}`,html:`<span>${escape(text)}</span>`,iconSize:[0,0],iconAnchor:[0,0]})}).addTo(labels);}
function renderLabels(){
  labels.clearLayers();const bounds=map.getBounds(),zoom=map.getZoom(),occupied=[];
  const canLabel=(lat,lon,width=100)=>{if(!bounds.contains([lat,lon]))return false;const p=map.latLngToContainerPoint([lat,lon]);if(p.x<35||p.x>map.getSize().x-35||p.y<75||p.y>map.getSize().y-30)return false;const collision=occupied.some(o=>Math.abs(p.x-o.x)<(width+o.width)/2&&Math.abs(p.y-o.y)<30);if(collision)return false;occupied.push({x:p.x,y:p.y,width});return true;};
  if(state.names==='modern')for(const country of countryLabels){if(zoom>=Math.max(3,country.minLabel||3)&&canLabel(country.lat,country.lon,110))label(country.lat,country.lon,country.name,'country');}
  for(const id of landmarks){const place=byId.get(id);if(!place||!filtered.includes(place))continue;const c=coordinate(place),name=displayName(place,place.id===state.selected?state.location:0);if(c&&canLabel(c.lat,c.lon,Math.max(80,name.length*7)))label(c.lat,c.lon,name,'landmark');}
  for(const water of [{lat:34.1,lon:27.5,name:'Mediterranean Sea'},{lat:43,lon:34,name:'Black Sea'},{lat:26.6,lon:34.6,name:'Red Sea'}])if(canLabel(water.lat,water.lon,150))label(water.lat,water.lon,water.name,'water');
}
function renderList(){
  const query=normalize(state.query),relevance=place=>{if(!query)return 0;const names=[place.name,...place.aliases,...place.locations.map(c=>c.name)].map(normalize);return names.includes(query)?2:names.some(name=>name.startsWith(query))?1:0;};
  const visible=filtered.filter(matchesViewport).sort((a,b)=>relevance(b)-relevance(a)||b.verseCount-a.verseCount||a.name.localeCompare(b.name));
  const shown=visible.slice(0,state.limit);
  $('#map-results').textContent=`${visible.length.toLocaleString()} ${visible.length===1?'place':'places'}${state.inView?' in view':''}${state.book!=='all'?` · ${state.book}`:''}`;
  $('#place-list').innerHTML=shown.map(place=>{const c=coordinate(place),name=displayName(place);return `<button class="place-row" data-place="${escape(place.id)}"><strong>${escape(name)}</strong><span>${escape(state.names==='modern'&&name!==place.name?`In the Bible: ${place.name}`:c&&c.name!==place.name?`${isArea(c)?'Map reference':'Today'}: ${c.name}`:c?'View the passages':'Location unresolved')}</span><span>${place.verseCount} verse ${place.verseCount===1?'connection':'connections'} · ${place.quotes.length} ${place.quotes.length===1?'book':'books'}</span></button>`;}).join('')||'<p class="location-note">No places match these filters. Try another name, book, or map area.</p>';
  $('#more-places').hidden=visible.length<=shown.length;$('#more-places').textContent=`Show more places · ${shown.length} of ${visible.length} shown`;
}
function renderStatus(){
  const mapped=filtered.filter(p=>p.locations.length),inView=mapped.filter(p=>{const c=coordinate(p);return map.getBounds().contains([c.lat,c.lon]);});
  $('#fit-matches').disabled=!mapped.length;
  $('#map-status').textContent=`${inView.length.toLocaleString()} places in view · ${mapped.length.toLocaleString()} mapped matches${filtered.length>mapped.length?` · ${filtered.length-mapped.length} without coordinates`:''}`;
}
function pin(place){
  const c=coordinate(place),name=displayName(place,place.id===state.selected?state.location:0);const marker=L.marker([c.lat,c.lon],{title:`${name} · open references`,alt:name,keyboard:true,icon:L.divIcon({className:'map-pin',html:'<span></span>',iconSize:[18,18],iconAnchor:[9,9]})});
  marker.bindTooltip(escape(name),{className:'place-tip',direction:'top',offset:[0,-7]});
  marker.on('click',()=>selectPlace(place.id,place.id===state.selected?state.location:0,false));return marker;
}
function renderPins(){
  filtered=places.filter(matches);clusters.clearLayers();markerById.clear();
  const markers=[];for(const place of filtered){if(!place.locations.length)continue;const marker=pin(place);markerById.set(place.id,marker);markers.push(marker);}clusters.addLayers(markers);
  renderList();renderLabels();renderStatus();
}
function clearSelection(){const restore=state.location!==0;state.selected='';state.location=0;selection.clearLayers();alternate.clearLayers();$('#place-detail').hidden=true;$('#place-browser').hidden=false;$('#clear-selection').hidden=true;$('#sidebar-title').textContent='Explore the places';syncUrl();if(restore)renderPins();else renderList();}
function selectedQuote(place){return place.quotes.find(q=>q.book===state.book)||place.quotes[0];}
function renderDetail(){
  const place=byId.get(state.selected);if(!place)return;
  const c=coordinate(place),quote=selectedQuote(place),back=returnPath(),modernName=c?.name;
  $('#sidebar-title').textContent='Place & references';$('#clear-selection').hidden=false;$('#place-browser').hidden=true;$('#place-detail').hidden=false;
  $('#place-detail').innerHTML=`<article class="selected-place"><p class="kicker">${escape(quote.book)} · ${place.verseCount} VERSE CONNECTION${place.verseCount===1?'':'S'}</p><h3>${escape(displayName(place,state.location))}</h3><p class="dual-name">${escape(state.names==='modern'?`Biblical name: ${place.name}`:modernName?`${isArea(c)?'Representative location':'Present-day site'}: ${modernName}`:'No coordinates supplied in the source')}</p><p class="place-summary">${escape(place.summary)}</p><blockquote class="map-quote"><p>“${escape(quote.text)}”</p><cite>${escape(quote.reference)} · ${escape(quote.translation)}${quote.isExcerpt?' · excerpt':''}</cite></blockquote>${quote.editorialNote?`<p class="translation-note">${escape(quote.editorialNote)}</p>`:''}<a class="detail-open" href="${escape(pointUrl(place.id,quote.book,back))}">Open full reference page</a>${c?`<div class="location-choice"><label for="location-choice">${place.locations.length>1?`Recorded locations (${place.locations.length})`:'Mapped location'}</label>${place.locations.length>1?`<select id="location-choice">${place.locations.map((location,index)=>`<option value="${index}" ${index===state.location?'selected':''}>${escape(location.name)}${location.description!==location.name?` · ${escape(location.description)}`:''}</option>`).join('')}</select>`:`<p class="location-note">${escape(c.description)}</p>`}<p class="location-note">${isArea(c)?`The source uses ${escape(c.name)} as a representative point for ${escape(place.name)}. `:''}${escape(c.identification)}. ${escape(c.precision.description||coordinateDescription(c.coordinateType))}${c.coordinateType==='representative point'?' · representative point for a larger feature':''}${c.coordinateType==='center'?' · approximate area center':''}${c.coordinateType==='settlement'?' · containing settlement':''}.${c.precisionNotes.length?` ${c.precisionNotes.map(escape).join(' ')}`:''}</p><p class="location-note"><a href="${escape(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">Location source</a> · <a href="${escape(place.sourceUrl)}" target="_blank" rel="noopener noreferrer">Identification discussion</a></p>${place.locations.length>1?'<p class="location-note">The open circles show other recorded locations. Choose a location above or select a circle to compare.</p>':''}</div>`:`<p class="location-note">${escape(place.locationNote||'The source supplies no coordinates for this entry. Its passages and research remain available.')}</p><p class="location-note"><a href="${escape(place.sourceUrl)}" target="_blank" rel="noopener noreferrer">Read the source entry</a></p>`}${place.unlocated.length?`<details><summary>Other readings in the source</summary>${place.unlocated.map(item=>`<p>${escape(item.identificationDescription||item.description||item.reason)}</p>`).join('')}</details>`:''}<details><summary>Follow through ${place.quotes.length} ${place.quotes.length===1?'book':'books'}</summary><div class="passage-pills">${place.quotes.map(q=>`<a href="${escape(pointUrl(place.id,q.book,back))}">${escape(q.book)}</a>`).join('')}</div></details>${place.related.length?`<div class="related-places"><h4>Connected data points</h4>${place.related.slice(0,8).map(item=>`<a href="${escape(pointUrl(item.id,'',back))}">${escape(item.title)}</a>`).join('')}${place.related.length>8?`<a href="${escape(pointUrl(place.id,quote.book,back))}">See all ${place.related.length} connections</a>`:''}</div>`:''}</article>`;
}
function coordinateDescription(type){return ({point:'Source-listed site point',center:'A point representing an approximate area','representative point':'Source representative point',settlement:'A containing settlement'})[type]||'Source-listed location';}
function renderSelection(){
  selection.clearLayers();alternate.clearLayers();const place=byId.get(state.selected);if(!place)return;const c=coordinate(place);if(!c)return;
  const seen=new Set();place.locations.forEach((location,index)=>{const key=`${location.lat},${location.lon}`;if(seen.has(key)||location.lat===c.lat&&location.lon===c.lon)return;seen.add(key);L.circleMarker([location.lat,location.lon],{radius:6,color:'#966f39',weight:2,fillColor:'#fcf7df',fillOpacity:.85,pane:'atlasSelections'}).bindTooltip(escape(location.description),{className:'place-tip'}).on('click',()=>selectPlace(place.id,index,false)).addTo(alternate);});
  L.circleMarker([c.lat,c.lon],{radius:10,color:'#fffbea',weight:3,fillColor:'#b17b2e',fillOpacity:1,pane:'atlasSelections',interactive:false}).addTo(selection);
}
function selectPlace(id,index=0,move=true){
  const place=byId.get(id);if(!place)return;const refresh=state.location!==0||index!==0;state.selected=id;state.location=Math.min(Math.max(0,index),Math.max(0,place.locations.length-1));if(refresh)renderPins();
  const c=coordinate(place);if(c&&move)map.setView([c.lat,c.lon],Math.max(8,map.getZoom()),{animate:false});
  syncUrl();renderDetail();renderSelection();renderLabels();
}
function renderFilters(){clearSelection();state.limit=40;renderPins();updateControls();syncUrl();}
function fitMatches(){const coordinates=filtered.filter(p=>p.locations.length).map(p=>{const c=coordinate(p);return [c.lat,c.lon];});if(coordinates.length)map.fitBounds(L.latLngBounds(coordinates),{padding:[45,45],maxZoom:10,animate:false});}

async function init(){
  try{
    const resources=await Promise.all(['map-data.json','assets/map/world-land.geojson','assets/map/detailed-land.geojson','assets/map/waters.geojson','assets/map/modern-boundaries.geojson','assets/map/country-labels.json'].map(json));
    [data]=resources;places=data.places;byId=new Map(places.map(p=>[p.id,p]));countryLabels=Array.isArray(resources[5])?resources[5]:resources[5].labels;
    searches=new Map(places.map(p=>[p.id,normalize([p.name,...p.aliases,p.summary,...p.locations.map(c=>`${c.name} ${c.description} ${c.nameVariants.join(' ')}`),...p.passages,...p.quotes.map(q=>`${q.book} ${q.text}`),...p.related.map(n=>n.title)].join(' '))]));
    $('#map-book').innerHTML='<option value="all">All books</option>'+data.books.map(b=>`<option value="${escape(b.title)}">${escape(b.title)} (${places.filter(p=>p.quotes.some(q=>q.book===b.title)).length})</option>`).join('');
    $('#map-period').innerHTML=periods.map(p=>`<option value="${p.id}">${p.title} · ${p.date}</option>`).join('');
    readState();$('#atlas-total').textContent=data.counts.entries.toLocaleString();$('#atlas-coverage').textContent=`${data.counts.mapped.toLocaleString()} mapped · ${data.counts.unlocated} without coordinates`;
    map=L.map('bible-map',{preferCanvas:true,center:[35.5,33.9],zoom:5,minZoom:2,maxZoom:14,zoomSnap:.5,scrollWheelZoom:true,zoomAnimation:!matchMedia('(prefers-reduced-motion: reduce)').matches});
    for(const [name,z] of [['atlasLand',210],['atlasAncient',240],['atlasWater',260],['atlasBorders',330],['atlasLabels',450],['atlasSelections',550]]){map.createPane(name);map.getPane(name).style.zIndex=z;if(name==='atlasLabels')map.getPane(name).style.pointerEvents='none';}
    const land={stroke:false,fillColor:'#e8ecd7',fillOpacity:1,pane:'atlasLand',interactive:false};
    L.geoJSON(resources[1],{style:land,interactive:false}).addTo(map);
    L.rectangle([[8,-15],[58,85]],{stroke:false,fillColor:'#c6dce0',fillOpacity:1,pane:'atlasLand',interactive:false}).addTo(map);
    L.geoJSON(resources[2],{style:land,interactive:false}).addTo(map);
    L.geoJSON(resources[3],{style:f=>({color:'#84a9b2',weight:f.properties.waterType==='river'?1:0.5,fillColor:'#c6dce0',fillOpacity:1,pane:'atlasWater',interactive:false}),interactive:false}).addTo(map);
    modern=L.geoJSON(resources[4],{style:f=>({color:'#5f7387',weight:1.6,opacity:.9,dashArray:f.properties.disputed?'5 4':f.properties.uncertain?'2 4':null,pane:'atlasBorders',interactive:false}),interactive:false});
    labels=L.layerGroup().addTo(map);selection=L.layerGroup().addTo(map);alternate=L.layerGroup().addTo(map);
    clusters=L.markerClusterGroup({maxClusterRadius:36,showCoverageOnHover:false,spiderfyOnMaxZoom:true,animate:false,spiderLegPolylineOptions:{weight:1.3,color:'#51776b',opacity:.6},iconCreateFunction:cluster=>L.divIcon({className:`map-cluster ${cluster.getChildCount()>100?'large':''}`,html:`<span>${cluster.getChildCount()}</span>`,iconSize:[36,36],iconAnchor:[18,18]})}).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a>');
    map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> · <a href="https://seshat-db.com/core/cliopatria/" target="_blank" rel="noopener noreferrer">Cliopatria / Seshat · CC BY 4.0</a> · <a href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer">OpenBible</a>');
    L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
    map.fitBounds(regions[state.region],{padding:[30,30],animate:false});
    const url=new URL(location.href),center=(url.searchParams.get('center')||'').split(',').map(Number),zoom=Number(url.searchParams.get('zoom'));
    if(center.length===2&&center.every(Number.isFinite)&&Math.abs(center[0])<85&&Math.abs(center[1])<=180&&zoom>=2&&zoom<=14)map.setView(center,zoom,{animate:false});
    updateControls();renderPins();await setBoundaryLayers();initializing=false;
    if(state.selected)selectPlace(state.selected,state.location,!url.searchParams.has('center'));else syncUrl();
    $('#map-loading').hidden=true;
    map.on('moveend',()=>{renderLabels();renderStatus();if(state.inView)renderList();syncUrl();});
    new ResizeObserver(()=>map.invalidateSize({pan:false})).observe($('#bible-map'));
    let timer;$('#map-search').addEventListener('input',e=>{state.query=e.target.value.trim();clearTimeout(timer);timer=setTimeout(renderFilters,160);});
    $('#map-book').addEventListener('change',e=>{state.book=e.target.value;renderFilters();});
    $('#map-period').addEventListener('change',e=>{state.period=e.target.value;state.boundaries='ancient';updateControls();setBoundaryLayers();syncUrl();});
    $('#compare-modern').addEventListener('change',e=>{state.compare=e.target.checked;setBoundaryLayers();syncUrl();});
    $('#layer-opacity').addEventListener('input',e=>{state.opacity=Number(e.target.value);$('#opacity-value').textContent=`${state.opacity}%`;if(historicalFill)historicalFill.setStyle({fillOpacity:state.opacity/100*.45});syncUrl();});
    $('#in-view').addEventListener('change',e=>{state.inView=e.target.checked;state.limit=40;renderList();syncUrl();});
    $('#more-places').addEventListener('click',()=>{state.limit+=40;renderList();});
    $('#clear-selection').addEventListener('click',clearSelection);$('#fit-matches').addEventListener('click',fitMatches);
    $('#unlocated-places').addEventListener('click',()=>{state.unlocated=!state.unlocated;state.inView=false;renderFilters();});
    $('#reset-map-filters').addEventListener('click',()=>{Object.assign(state,{book:'all',query:'',inView:false,unlocated:false});renderFilters();});
    document.addEventListener('click',e=>{
      const names=e.target.closest('[data-names]');if(names){state.names=names.dataset.names;updateControls();renderPins();if(state.selected){renderDetail();renderSelection();}syncUrl();return;}
      const boundary=e.target.closest('[data-boundaries]');if(boundary){state.boundaries=boundary.dataset.boundaries;updateControls();setBoundaryLayers();syncUrl();return;}
      const region=e.target.closest('[data-region]');if(region){state.region=region.dataset.region;updateControls();map.fitBounds(regions[state.region],{padding:[30,30],animate:false});return;}
      const place=e.target.closest('[data-place]');if(place)selectPlace(place.dataset.place);
    });
    $('#place-detail').addEventListener('change',e=>{if(e.target.id==='location-choice')selectPlace(state.selected,Number(e.target.value));});
    window.addEventListener('popstate',()=>location.reload());
  }catch(error){$('#map-loading').hidden=true;$('#map-error').hidden=false;$('#map-status').textContent='Map unavailable';console.error(error);}
}
init();
