import React,{useEffect,useMemo,useState} from 'react';

const STORE='acl-foundboard-v3';
// Fictional campus locations for this standalone teaching demo.
// A found report can exist before the item has been received by staff.
const seed=[
 {id:'f1',title:'Black backpack',category:'accessories',status:'lost',location:'Library - second floor',description:'Black backpack with a small red keychain. Left near the study desks.',owner:'you',created:'Oct 23',emoji:'🎒'},
 {id:'f2',title:'Dark backpack',category:'accessories',status:'found',location:'Library - main stairwell',description:'Found a dark backpack with a small red keychain near the library stairs.',owner:'other',created:'Oct 24',emoji:'🎒',collectionPoint:'Campus Security Desk',handoverStatus:'received'},
 {id:'f3',title:'Student ID card',category:'documents',status:'found',location:'Near Gate 3',description:'A student card was turned in. No personal details are published.',owner:'other',created:'Oct 24',emoji:'🪪',collectionPoint:'Student Services Office',handoverStatus:'received'},
 {id:'f4',title:'Wireless earbuds',category:'electronics',status:'lost',location:'Main cafeteria',description:'White earbuds in a distinctive blue case. Lost on Monday.',owner:'other',created:'Oct 24',emoji:'🎧'},
 {id:'f5',title:'Earbuds in blue case',category:'electronics',status:'found',location:'Cafeteria entrance',description:'White earbuds in a blue charging case found near the coffee counter.',owner:'other',created:'Oct 25',emoji:'🎧',collectionPoint:'',handoverStatus:'reported'},
 {id:'f6',title:'Blue sports bottle',category:'other',status:'lost',location:'Sports Hall - lockers',description:'Tall blue metal water bottle, possibly left after practice.',owner:'other',created:'Oct 25',emoji:'🥤'},
 {id:'f7',title:'Metal water bottle',category:'other',status:'found',location:'Sports Hall - benches',description:'Blue reusable metal bottle found after a basketball session.',owner:'other',created:'Oct 25',emoji:'🥤',collectionPoint:'Campus Security Desk',handoverStatus:'received'},
 {id:'f8',title:'Engineering lab coat',category:'clothing',status:'claimed',location:'Building C',description:'Owner verified the item and collected it from the reception desk.',owner:'you',created:'Oct 22',emoji:'🥼',collectionPoint:'Library Reception',handoverStatus:'released'},
 {id:'f9',title:'Small notebook',category:'other',status:'lost',location:'C7 lecture room',description:'Brown cover with handwritten engineering notes.',owner:'other',created:'Oct 25',emoji:'📒'},
 {id:'f10',title:'Scientific calculator',category:'electronics',status:'lost',location:'B2 lecture hall',description:'Black scientific calculator with a protective cover.',owner:'other',created:'Oct 26',emoji:'🧮'},
 {id:'f11',title:'Calculator',category:'electronics',status:'found',location:'B2 study area',description:'Scientific calculator with a black cover, found on a desk.',owner:'you',created:'Oct 26',emoji:'🧮',collectionPoint:'Library Reception',handoverStatus:'received'},
 {id:'f12',title:'Canvas tote bag',category:'accessories',status:'lost',location:'Main campus bus stop',description:'Beige tote with green writing on one side.',owner:'other',created:'Oct 26',emoji:'👜'},
 {id:'f13',title:'USB flash drive',category:'electronics',status:'found',location:'Building A computer lab',description:'A small black flash drive was found beside a workstation.',owner:'other',created:'Oct 27',emoji:'💾',collectionPoint:'',handoverStatus:'reported'},
];
const categories=['all','electronics','clothing','documents','accessories','other'];
const statuses=['lost','found','claimed'];
const clean={title:'',category:'',status:'',location:'',description:''};
function getSaved(){try{const s=JSON.parse(localStorage.getItem(STORE));return Array.isArray(s)?s:seed;}catch{return seed;}}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const noFilters={q:'',cat:'all',status:'all'};
const matches=(x,f)=>(f.cat==='all'||x.category===f.cat)&&(f.status==='all'||x.status===f.status)&&`${x.title} ${x.location} ${x.description}`.toLowerCase().includes(f.q.toLowerCase());
// Returns one message per invalid field so the form can point at the exact problem.
// A duplicate (same title + same location) marks both fields; the message lives under the title.
function validate(f,arr,id){
 const e={};
 if(!f.title.trim()||f.title.trim().length<2)e.title='Title must be at least 2 characters.';
 if(!statuses.includes(f.status))e.status='Choose lost, found or claimed.';
 if(!categories.slice(1).includes(f.category))e.category='Choose a category.';
 const dup=!e.title&&arr.find(r=>r.id!==id&&r.title.toLowerCase()===f.title.trim().toLowerCase()&&(r.location||'').toLowerCase()===(f.location||'').trim().toLowerCase());
 if(dup){e.title=`A "${dup.title}" report ${dup.location?`at ${dup.location}`:'with no location'} already exists. Change the title or the location${dup.owner==='you'?', or edit your existing report instead':''}.`;e.location=true;}
 return e;
}
// Explains WHY a column is empty and offers the next step, instead of a misleading "Nothing here yet".
function EmptyColumn({col,q,cat,filterStatus,onShowAll,onClear,onCreate}){
 const name=col.title.toLowerCase();
 if(filterStatus!=='all'&&filterStatus!==col.key)return <div className="empty-column"><p>{cap(name)} reports are hidden: you are only viewing {filterStatus} items.</p><button onClick={onShowAll}>Show all statuses</button></div>;
 const what=[q.trim()&&`match “${q.trim()}”`,cat!=='all'&&`in ${cap(cat)}`].filter(Boolean).join(' ');
 if(what)return <div className="empty-column"><p>No {name} reports {what}.</p><button onClick={onClear}>Clear search and filters</button></div>;
 return <div className="empty-column"><p>No {name} reports yet.</p>{col.key!=='claimed'&&<button onClick={onCreate}>Post a report</button>}</div>;
}
function Field({id,label,required,error,children}){
 return <div className="field"><label htmlFor={'field-'+id}>{label}{required&&<> <b>*</b></>}</label>{children}{typeof error==='string'&&<span className="field-error" id={'err-'+id}>{error}</span>}</div>;
}
export default function App(){
 const [items,setItems]=useState(getSaved);
 const [page,setPage]=useState('board');
 const [filters,setFilters]=useState(noFilters); // what the board is showing
 const [draft,setDraft]=useState(noFilters);     // what is in the sidebar; only takes effect on Apply / Enter
 const pending=draft.q.trim()!==filters.q||draft.cat!==filters.cat||draft.status!==filters.status;
 const [current,setCurrent]=useState(null);
 const [form,setForm]=useState(clean);
 const [errors,setErrors]=useState({});
 const [message,setMessage]=useState('');
 const errorCount=Object.values(errors).filter(v=>typeof v==='string').length;
 const invalid=k=>errors[k]?{'aria-invalid':true,'aria-describedby':typeof errors[k]==='string'?'err-'+k:'err-title'}:{};
 function setField(k,v){setForm(s=>({...s,[k]:v}));setErrors(e=>{const n={...e};delete n[k];if((k==='title'||k==='location')&&e.location){delete n.title;delete n.location;}return n;});}
 useEffect(()=>localStorage.setItem(STORE,JSON.stringify(items)),[items]);
 const filtered=useMemo(()=>items.filter(x=>matches(x,filters)),[items,filters]);
 function create(){setCurrent(null);setForm({...clean});setErrors({});setPage('form');}
 function edit(row){if(row.owner!=='you')return;setCurrent(row.id);setForm({title:row.title,category:row.category,status:row.status,location:row.location,description:row.description});setErrors({});setPage('form');}
 function submit(e){e.preventDefault();const v=validate(form,items,current);if(Object.keys(v).length){setErrors(v);const first=['title','status','category'].find(k=>v[k]);document.getElementById('field-'+first)?.focus();return;}setErrors({});const d={...form,title:form.title.trim(),location:form.location.trim(),description:form.description.trim(),owner:'you',created:'Today',emoji:current?items.find(x=>x.id===current)?.emoji:'📌',...(current?{}:{collectionPoint:'',handoverStatus:'reported'})};
 if(current){setItems(items.map(x=>x.id===current?{...x,...d}:x));setMessage('Report updated.');}else{setItems([{id:`f-${Date.now()}`,...d},...items]);setMessage('Your report has been posted.');}setPage('board');setCurrent(null);}
 function applyFilters(f){setFilters(f);setDraft(f);}
 function applyDraft(e){e.preventDefault();const f={...draft,q:draft.q.trim()};applyFilters(f);setMessage(`${items.filter(x=>matches(x,f)).length} reports shown.`);}
 // Header links and "Show all statuses" change only the status, immediately; unapplied sidebar text is kept.
 function setStatusNow(s){setFilters(f=>({...f,status:s}));setDraft(d=>({...d,status:s}));}
 function clearFilters(){applyFilters(noFilters);}
 function reset(){setItems(seed);setPage('board');applyFilters(noFilters);setMessage('Example reports restored.');}
 return <div className="notice-app"><header className="header"><div className="headline"><span className="sun">✺</span><button onClick={()=>setPage('board')} className="wordmark">FOUND<span>on campus</span></button><p>Community noticeboard</p></div><div className="header-links"><button onClick={()=>setPage('board')}>Noticeboard</button><button onClick={()=>{setStatusNow('lost');setPage('board')}}>Missing items</button><button onClick={()=>{setStatusNow('found');setPage('board')}}>Recently found</button></div><button className="report-button" onClick={create}>+ Post a report</button></header>
  <div className="ruleline"><span>SEARCH • DISCOVER • REUNITE</span><span>Helping lost things find their way back.</span></div>
  {page==='board'?<main className="workspace"><aside className="filters"><p className="kicker">YOUR NOTICEBOARD</p><h1>Lost something?<br/><em>You're in the right place.</em></h1><p className="intro">Browse what the campus community has shared or post what you've lost or found.</p><form className="filterbox" onSubmit={applyDraft}><h3>Browse reports</h3><label>Search items<input value={draft.q} onChange={e=>setDraft(d=>({...d,q:e.target.value}))} placeholder="What are you looking for?"/></label><label>Item category<select value={draft.cat} onChange={e=>setDraft(d=>({...d,cat:e.target.value}))}><option value="all">All categories</option>{categories.slice(1).map(c=><option key={c} value={c}>{cap(c)}</option>)}</select></label><label>Report status<select value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value}))}><option value="all">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>{pending&&<p className="pending-note" role="status">Changes not applied yet. Press Apply or Enter.</p>}<div className="filterbuttons"><button type="submit">Apply</button><button type="button" onClick={clearFilters}>Clear</button></div></form><div className="side-message"><span>📍</span><strong>Lost or found something?</strong><p>Every report gets us a little closer.</p><button onClick={create}>Share your report →</button></div><button className="reset" onClick={reset}>Reset demo data</button></aside>
   <section className="board"><div className="board-top"><div><p className="kicker">CAMPUS COMMUNITY</p><h2>Latest notices <span>({filtered.length})</span></h2></div><span className="time-note">Updated today</span></div>{message&&<div className="message" role="status">{message}<button onClick={()=>setMessage('')}>✕</button></div>}
    <div className="board-grid">{[{key:'lost',title:'LOST',sub:'Searching for these things',icon:'↗'},{key:'found',title:'FOUND',sub:'Looking for the owners',icon:'⌁'},{key:'claimed',title:'CLAIMED',sub:'Back where they belong',icon:'✓'}].map(col=><div className="board-column" key={col.key}><div className="column-head"><span className={'col-icon '+col.key}>{col.icon}</span><div><strong>{col.title}</strong><small>{col.sub}</small></div><span className="col-count">{filtered.filter(r=>r.status===col.key).length}</span></div><div className="sticky-list">{filtered.filter(r=>r.status===col.key).map((item,i)=><article className={'sticky'+(item.owner==='you'?' mine':'')} key={item.id}><div className="sticky-top"><span>{item.category}</span>{item.owner==='you'&&<span className="mine-tag">Your report</span>}</div><div className="sticky-emoji" aria-hidden="true">{item.emoji}</div><h3>{item.title}</h3><p>{item.description||'No additional description.'}</p>{item.status!=='lost'&&<div className="handover-note">{item.handoverStatus==='received'&&item.collectionPoint?`Received at ${item.collectionPoint}`:item.handoverStatus==='released'?'Collected by owner':'Reported found - not confirmed at a collection point'}</div>}<div className="sticky-bottom"><span>⌖ {item.location||'Location not provided'}</span><small>{item.created}</small></div>{item.owner==='you'&&<button className="edit-button" onClick={()=>edit(item)} aria-label={`Edit your report: ${item.title}`}>Edit report</button>}</article>)}{filtered.every(x=>x.status!==col.key)&&<EmptyColumn col={col} q={filters.q} cat={filters.cat} filterStatus={filters.status} onShowAll={()=>setStatusNow('all')} onClear={clearFilters} onCreate={create}/>}</div></div>)}</div>
   </section></main>:<main className="report-page"><div className="crumbs"><button onClick={()=>setPage('board')}>← Noticeboard</button><span>/</span><span>Report an item</span></div><div className="report-layout"><div className="report-intro"><span className="seal">✺</span><p className="kicker">HELP THE COMMUNITY</p><h1>{current?'Update your report':'Tell us what happened.'}</h1><p>Small details can help someone recognize their belongings.</p><div className="paper-note">Your report will appear on the public campus noticeboard with the details you provide.</div></div><section className="form-paper"><header><p>NEW NOTICE / FORM 01</p><h2>{current?'Edit report':'Report an item'}</h2></header><form onSubmit={submit} noValidate><Field id="title" label="Item title" required error={errors.title}><input id="field-title" {...invalid('title')} value={form.title} onChange={e=>setField('title',e.target.value)} placeholder="e.g., Black backpack"/></Field><Field id="status" label="Status" required error={errors.status}><select id="field-status" {...invalid('status')} value={form.status} onChange={e=>setField('status',e.target.value)}><option value="">Choose one</option>{statuses.map(s=><option key={s} value={s}>{cap(s)}</option>)}</select></Field><Field id="category" label="Category" required error={errors.category}><select id="field-category" {...invalid('category')} value={form.category} onChange={e=>setField('category',e.target.value)}><option value="">Select item category</option>{categories.slice(1).map(s=><option key={s}>{s}</option>)}</select></Field><Field id="location" label="Last known location" error={errors.location}><input id="field-location" {...invalid('location')} value={form.location} onChange={e=>setField('location',e.target.value)} placeholder="Location (optional)"/></Field><Field id="description" label="More details"><textarea id="field-description" rows="6" value={form.description} onChange={e=>setField('description',e.target.value)} placeholder="Describe your item"/></Field>{errorCount>0&&<div className="form-error" role="alert">{errorCount===1?'1 field needs':`${errorCount} fields need`} attention before you can {current?'save':'publish'}.</div>}<div className="form-actions"><button type="button" onClick={()=>setPage('board')}>Go back</button><button className="report-button" type="submit">{current?'Save report':'Publish notice'}</button></div></form></section></div></main>}
  <footer className="pagefooter"><span>FOUND / Campus noticeboard</span><span>Community project • Demo only</span></footer>
 </div>;
}
