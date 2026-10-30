(()=>{'use strict';
const data=window.FermyxHelpData,$=id=>document.getElementById(id),root=document.documentElement;
const params=new URLSearchParams(location.search),languages=Object.keys(data.languages);
const saved={get:key=>{try{return localStorage.getItem(key);}catch{return null;}},set:(key,value)=>{try{localStorage.setItem(key,value);}catch{/* The complete guide also works when browser storage is blocked. */}}};
const canonical=value=>languages.find(id=>id.toLowerCase()===String(value).replace('_','-').toLowerCase())||languages.find(id=>id.split('-')[0]===String(value).split(/[-_]/)[0])||'en';
let language=canonical(params.get('lang')||saved.get('fermyx-help-language')||navigator.language),theme=params.get('theme')||saved.get('fermyx-help-theme')||'dark',query='',composing=false,timer;
let appLanguage=canonical(params.get('lang')||language);
const norm=value=>window.FermyxHelpSearch.normalizeSearchText(value).trim();
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=key=>data.languages[language].labels[key]||key;
function setAppearance(){root.dataset.theme=theme==='light'?'light':'dark';const accent=params.get('accent')||saved.get('fermyx-help-accent');if(/^#[\da-f]{6}$/i.test(accent||''))root.style.setProperty('--accent',accent);root.lang=language;for(const button of document.querySelectorAll('[data-accent]'))button.setAttribute('aria-pressed',String(button.dataset.accent===accent));}
function topics(){return data.languages[language].topics;}
function topic(){let id='start';try{id=decodeURIComponent(location.hash.slice(1)).split('/')[0];}catch{/* A malformed link opens Getting started. */}return topics().find(row=>row.id===id)||topics()[0];}
function navigation(){const groups=['Getting started','Control','Create & edit','Automation','Your space'];$('navigation').innerHTML=groups.map(group=>`<div class="nav-group">${escape(t(group))}</div>`+topics().filter(row=>row.group===group).map(row=>`<a href="#${row.id}" ${row.id===topic().id?'aria-current="page"':''}>${escape(row.title)}</a>`).join('')).join('');}
function render(){
 setAppearance();for(const element of document.querySelectorAll('[data-label]'))element.textContent=t(element.dataset.label);
 for(const [id,label]of [['menu','Navigation'],['language','Language'],['theme','Toggle light/dark'],['navigation','User guide'],['contents','On this page']])$(id).setAttribute('aria-label',t(label));
 $('search').placeholder=t('Search help…');$('search').setAttribute('aria-label',t('Search help…'));navigation();
 const row=topic();document.title=row.title+' · Fermyx';
 if(query){renderSearch();return;}
 $('content').innerHTML=`<div class="eyebrow">Fermyx · ${escape(data.version)} · ${escape(t('Available offline'))}</div><h1>${escape(row.title)}</h1>${row.intro?`<p class="lead">${escape(row.intro)}</p>`:''}${window.parent!==window?`<button class="open-app" id="openInApp">${escape(t('Open in Fermyx'))} ↗</button>`:''}${row.sections.map((section,index)=>`<section class="section" id="section-${index}"><h2>${escape(section.title)}</h2>${section.body.map(text=>`<p>${escape(text)}</p>`).join('')}${section.controls.map(control=>!(control.description||control.values.length||control.range)?`<div class="reference-label">${escape(control.label)}</div>`:`<details class="reference"><summary>${escape(control.label)}</summary><div>${control.description?`<p>${escape(control.description)}</p>`:''}${control.values.length?`<div class="guide-links">${control.values.map(value=>`<span>${escape(value)}</span>`).join('')}</div>`:''}${control.range?`<p class="range">${escape(control.range)}</p>`:''}</div></details>`).join('')}</section>`).join('')}<h2>${escape(t('Related guides'))}</h2><div class="guide-links">${row.related.map(id=>{const match=topics().find(t=>t.id===id);return match?`<a href="#${id}">${escape(match.title)}</a>`:'';}).join('')}</div><div class="swatches" aria-label="${escape(t('Accent color'))}">${['#4fc9b8','#73aaff','#bca3ff','#f29abe','#f3b45b'].map(color=>`<button aria-label="${color}" data-accent="${color}" style="--swatch:${color}"></button>`).join('')}</div>`;
 $('contents').innerHTML=`<strong>${escape(t('On this page'))}</strong>`+row.sections.map((section,index)=>`<a href="#${row.id}/section-${index}" data-section="section-${index}">${escape(section.title)}</a>`).join('');
 $('openInApp')?.addEventListener('click',()=>window.parent.postMessage({type:'fermyx-help-open',page:row.page},location.origin==='null'?'*':location.origin));
 const section=location.hash.split('/')[1];if(!section&&document.activeElement?.closest('.result, #navigation, .brand'))$('content').focus({preventScroll:true});
 if(section)requestAnimationFrame(()=>document.getElementById(section)?.scrollIntoView({block:'start'}));
 $('announcement').textContent=row.title;setAppearance();
}
let indexedLanguage=null,searchIndex=[];
function indexedHelp(){
 if(indexedLanguage===language)return searchIndex;
 indexedLanguage=language;searchIndex=topics().flatMap(row=>{
  const items=[{title:row.title,body:row.intro,section:null},...row.sections.flatMap((section,index)=>[{title:section.title,body:section.body.join(' '),section:index},...section.controls.map(control=>({title:control.label,body:control.description+' '+control.values.join(' '),section:index}))])];
  const aliases=norm(row.search);return items.map(item=>({row,item,title:norm(item.title),body:norm(item.body),aliases}));
 });return searchIndex;
}
function renderSearch(){
 const variants=window.FermyxHelpSearch.localizedSearchQueries(query,language,key=>data.languages[language].labels[key]||key,()=>Object.keys(data.languages[language].labels)),words=norm(query).split(' ').filter(Boolean).slice(0,12),results=[];
 for(const {row,item,title,body,aliases}of indexedHelp()){
     let score=0,hits=0;
     for(const word of words){if(title===word){score+=12;hits++;}else if(title.includes(word)){score+=7;hits++;}else if(body.includes(word)){score+=2;hits++;}else if(aliases.includes(word)){score+=3;hits++;}}
     const fuzzy=Math.max(0,...variants.map(value=>window.FermyxHelpSearch.fuzzySearchMatch(value,item.title)?.score||0));
     if(hits===words.length&&hits||fuzzy>=300)results.push({row,item,score:score+fuzzy/50});
 }
 results.sort((a,b)=>b.score-a.score);const unique=new Set(),shown=results.filter(result=>{const key=result.row.id+'/'+result.item.section;if(unique.has(key))return false;unique.add(key);return true;}).slice(0,40);
 $('content').innerHTML=`<h1>${escape(t('Search'))}</h1><p>${shown.length} · ${escape(t('Results'))}</p><div class="results">${shown.map(({row,item})=>`<a class="result" href="#${row.id}${item.section==null?'':'/section-'+item.section}"><strong>${escape(item.title)}</strong><small>${escape(row.title)}</small><p>${escape(String(item.body||'').slice(0,220))}</p></a>`).join('')||`<p class="empty">${escape(t('No matching help. Try a shorter phrase or a control name.'))}</p>`}</div>`;
 $('contents').replaceChildren();$('announcement').textContent=shown.length+' '+t('Results');
}
$('language').innerHTML=languages.map(id=>`<option value="${id}">${escape(data.languages[id].name)}</option>`).join('');$('language').value=language;
$('language').addEventListener('change',event=>{language=event.target.value;saved.set('fermyx-help-language',language);render();});
$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';saved.set('fermyx-help-theme',theme);setAppearance();};
$('menu').onclick=()=>{const open=$('navigation').classList.toggle('open');$('menu').setAttribute('aria-expanded',String(open));};
$('search').addEventListener('compositionstart',()=>composing=true);$('search').addEventListener('compositionend',()=>{composing=false;search();});$('search').addEventListener('input',()=>{if(!composing)search();});
function search(){clearTimeout(timer);timer=setTimeout(()=>{query=$('search').value.slice(0,180).trim();render();},120);}
window.addEventListener('hashchange',()=>{query='';$('search').value='';$('navigation').classList.remove('open');$('menu').setAttribute('aria-expanded','false');render();if(!location.hash.includes('/'))$('content').focus({preventScroll:true});});
document.addEventListener('click',event=>{const accent=event.target.closest('[data-accent]');if(accent){params.set('accent',accent.dataset.accent);saved.set('fermyx-help-accent',accent.dataset.accent);setAppearance();}
 const result=event.target.closest('.result');if(result&&result.hash===location.hash){query='';$('search').value='';render();}
});
document.addEventListener('keydown',event=>{if(event.isComposing)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('search').focus();}if(event.key==='Escape'&&query){$('search').value='';query='';render();}});
window.addEventListener('message',event=>{if(event.source!==window.parent||window.parent===window||event.origin!==location.origin||event.data?.type!=='fermyx-help-appearance')return;const nextLanguage=canonical(event.data.lang),changed=nextLanguage!==appLanguage;if(changed){language=nextLanguage;appLanguage=nextLanguage;}theme=event.data.theme==='light'?'light':'dark';if(/^#[\da-f]{6}$/i.test(event.data.accent||''))params.set('accent',event.data.accent);$('language').value=language;if(changed)render();else setAppearance();});
if(window.parent!==window){document.addEventListener('contextmenu',event=>event.preventDefault());document.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if((event.ctrlKey||event.metaKey)&&!event.altKey&&['p','r','s','o','n','t','w','l','u','h','j','d','g','e','+','=','-','0'].includes(key)||['f1','f5','f11','f12'].includes(key))event.preventDefault();if((event.ctrlKey||event.metaKey)&&key==='f'){event.preventDefault();$('search').focus();}});}
render();
})();
