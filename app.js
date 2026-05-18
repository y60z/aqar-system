const KEY = 'rawad_aqar_properties_final_v1';
const SETTINGS_KEY = 'rawad_aqar_settings_final_v1';

let properties = JSON.parse(localStorage.getItem(KEY) || '[]');
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

let editingId = null;
let selectedImages = [];
let currentView = 'active';
let typeFilter = '';

const DEFAULT_SETTINGS = {
  company: 'مؤسسة رواد الأفق للاستثمار',
  phone1: '0552209226',
  phone2: '0500277257',
  email: 'rwadalafq@gmail.com',
  address: 'طريق المطار',
  logo: 'logo.jpeg'
};

settings = { ...DEFAULT_SETTINGS, ...settings };

const $ = id => document.getElementById(id);
const app = () => $('app');

function saveStore(){
  localStorage.setItem(KEY, JSON.stringify(properties));
}

function saveSettings(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function uid(){
  return 'P' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function esc(v=''){
  return String(v ?? '').replace(/[&<>"]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  }[s]));
}

function jsEsc(v=''){
  return String(v ?? '')
    .replace(/\\/g,'\\\\')
    .replace(/'/g,"\\'")
    .replace(/\n/g,' ');
}

function val(id){
  return ($(id)?.value || '').trim();
}

function toast(msg){
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),1800);
}

function ico(name){
  const m = {
    home:'⌂',map:'⌖',area:'⛶',street:'▥',front:'◉',plan:'▤',plot:'▯',
    bed:'▣',bath:'♨',car:'▰',owner:'👤',broker:'♟',save:'💾',edit:'✎',
    delete:'🗑',archive:'▣',share:'⇪',search:'⌕',image:'▧',settings:'⚙',
    back:'‹',phone:'☎',mail:'✉',service:'✦',pdf:'▣',add:'＋'
  };
  return `<span class="ico">${m[name] || '•'}</span>`;
}

function injectPatchStyles(){
  if(document.getElementById('aqar-patch-style')) return;
  const style = document.createElement('style');
  style.id = 'aqar-patch-style';
  style.textContent = `
    .backBtn{ min-width:74px; min-height:40px; font-weight:700; }
    .offerFixedBox{ background:#004d3d; color:#fff; border-radius:16px; padding:14px; margin:14px; text-align:center; box-shadow:0 6px 18px rgba(0,0,0,.12); }
    .offerFixedBox label{ display:block; color:#dfeee9; font-size:13px; margin-bottom:6px; }
    .offerNumber{ color:#fff; font-size:28px; font-weight:900; letter-spacing:1px; user-select:none; pointer-events:none; }
    .previewGrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
    .preview{ position:relative; height:86px; overflow:hidden; border-radius:12px; background:#eef2f1; border:1px solid #d7e1dd; }
    .preview img{ width:100%; height:100%; object-fit:cover; display:block; }
    .preview button{ position:absolute; top:4px; left:4px; width:26px; height:26px; border:0; border-radius:50%; background:#b00020; color:#fff; font-weight:900; }
    .mainBadge{ position:absolute; right:5px; bottom:5px; background:#004d3d; color:#fff; font-size:11px; padding:3px 7px; border-radius:99px; }
    .contactLink{ cursor:pointer; touch-action:manipulation; }
    select{ width:100%; min-height:44px; border:1px solid #d7e1dd; border-radius:12px; padding:8px 10px; background:white; font:inherit; }
  `;
  document.head.appendChild(style);
}

function render(html){
  injectPatchStyles();
  app().innerHTML = `<main class="app">${html}</main>`;
  window.scrollTo(0,0);
}

function statusClass(s=''){
  if(/تفاوض|قيد|تحت|محجوز/.test(s)) return 'warn';
  if(/مباع|مؤجر|تأجير|بيع/.test(s)) return 'danger';
  if(/أرشيف|مؤرشف/.test(s)) return 'gray';
  return '';
}

function isArchiveStatus(s=''){
  return /تم التأجير|تم البيع|مؤرشف/.test(s);
}

function mapUrl(u){
  const link = String(u || '').trim();
  if(!link) return '';
  if(/^https?:\/\//i.test(link)) return link;
  const coords = link.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
  if(coords) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords[0])}`;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(link);
}

function qrUrl(u){
  const link = mapUrl(u);
  if(!link) return '';
  return 'https://quickchart.io/qr?size=180&margin=1&text=' + encodeURIComponent(link);
}

function openMap(link){
  const url = mapUrl(link);
  if(!url){ alert('لا يوجد رابط موقع لهذا العقار'); return; }
  window.location.href = url;
}

function getTypes(){
  return [...new Set(properties.filter(p=>!p.archived && p.type).map(p=>p.type))];
}

function nextOfferNo(){
  const nums = properties
    .map(p=>parseInt(String(p.offerNo||'').replace(/\D/g,''),10))
    .filter(n=>!isNaN(n));
  return String(nums.length ? Math.max(...nums)+1 : 1001);
}

function header(title='إدارة العقارات', showBack=false){
  return `
    <div class="header">
      <div class="brand">
        ${showBack
          ? `<button class="ghost backBtn" onclick="renderHome()">${ico('back')} رجوع</button>`
          : `<img src="${settings.logo}" alt="logo">`}
        <h1>${title}</h1>
      </div>
      <div class="topBtns noPrint">
        <button onclick="renderSettings()">${ico('settings')}</button>
        ${!showBack ? `<button class="primary" onclick="renderForm()">${ico('add')} إضافة عقار</button>` : ''}
      </div>
    </div>
  `;
}

function renderHome(){
  editingId = null; selectedImages = []; currentView = 'active'; typeFilter = '';
  const types = getTypes();
  render(`
    ${header()}
    <div class="searchPanel">
      <input id="qAll" placeholder="بحث شامل في كل التفاصيل" oninput="renderPropertyList()">
      <input id="qOffer" placeholder="بحث برقم العرض فقط" oninput="renderPropertyList()">
      <div class="chips">
        <button class="chip active" id="chip-all" onclick="setTypeFilter('')">الكل</button>
        ${types.map(t=>`<button class="chip" onclick="setTypeFilter('${esc(t)}')">${esc(t)}</button>`).join('')}
        <button class="chip" onclick="renderArchive()">الأرشيف</button>
      </div>
    </div>
    <div id="list" class="list"></div>
  `);
  renderPropertyList();
}

function setTypeFilter(t){ typeFilter=t; renderPropertyList(); }

function filteredList(archived=false){
  const q=($('qAll')?.value||'').toLowerCase();
  const offer=($('qOffer')?.value||'');
  let list=properties.filter(p=>!!p.archived===archived);
  if(typeFilter) list=list.filter(p=>p.type===typeFilter);
  if(offer) list=list.filter(p=>String(p.offerNo||'').includes(offer));
  if(q) list=list.filter(p=>JSON.stringify(p).toLowerCase().includes(q));
  return list.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
}

function renderPropertyList(){
  const box=$('list'); if(!box) return;
  const list=filteredList(false);
  box.innerHTML=list.map(propertyCard).join('')||'<div class="empty">لا توجد عقارات</div>';
}

function propertyCard(p){
  const st=esc(p.status||'متاح');
  return `
    <article class="card">
      <div class="thumb">
        ${p.images?.[0]?`<img src="${p.images[0]}">` : 'لا توجد صورة'}
        <span class="status ${statusClass(st)}">${st}</span>
        ${p.archived?'<div class="badgeArchive">أرشيف</div>':''}
      </div>
      <div class="cardInfo">
        <h3>${esc(p.title||'عقار بدون اسم')}</h3>
        <div class="meta">
          <span>${ico('map')} ${esc([p.city,p.district].filter(Boolean).join(' - ')||'-')}</span>
          <span>${ico('area')} ${esc(p.area||'-')} م²</span>
          <span>${ico('home')} ${esc(p.type||'-')}</span>
          <span>${ico('front')} ${esc(p.frontage||'-')}</span>
        </div>
      </div>
      <div class="offer">رقم العرض<br>${esc(p.offerNo||p.id)}</div>
      <div class="actions noPrint">
        <button onclick="renderDetails('${p.id}')">عرض</button>
        <button onclick="renderForm('${p.id}')">${ico('edit')}</button>
        ${p.archived
          ? `<button onclick="unarchiveProperty('${p.id}')">نقل للعام</button>`
          : `<button onclick="archiveProperty('${p.id}')">${ico('archive')}</button>`}
        <button class="danger" onclick="deleteProperty('${p.id}')">${ico('delete')}</button>
      </div>
    </article>
  `;
}

function renderArchive(){
  currentView='archive';
  render(`
    ${header('الأرشيف',true)}
    <div class="searchPanel">
      <input id="qAll" placeholder="بحث شامل في الأرشيف" oninput="renderArchiveList()">
      <input id="qOffer" placeholder="بحث برقم العرض فقط" oninput="renderArchiveList()">
    </div>
    <div id="archiveList" class="list"></div>
  `);
  renderArchiveList();
}

function renderArchiveList(){
  const box=$('archiveList'); if(!box) return;
  const list=filteredList(true);
  box.innerHTML=list.map(propertyCard).join('')||'<div class="empty">الأرشيف فارغ</div>';
}

function statusSelect(value='متاح'){
  const opts=['متاح','تحت التفاوض','محجوز','تم التأجير','تم البيع','مؤرشف'];
  return `
    <div class="field"><label>الحالة</label>
      <select id="status">
        ${opts.map(o=>`<option value="${o}" ${o===(value||'متاح')?'selected':''}>${o}</option>`).join('')}
      </select>
    </div>
  `;
}

function formSection(title, fields){
  return `
    <section class="section"><h2>${title}</h2>
      <div class="gridForm">
        ${fields.map(([id,label,value])=>`
          <div class="field"><label>${label}</label><input id="${id}" value="${esc(value)}"></div>
        `).join('')}
      </div>
    </section>
  `;
}

async function compressImage(base64, maxWidth=900, quality=0.45){
  return new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxWidth){h=Math.round((h*maxWidth)/w);w=maxWidth;}
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',quality));
    };
    img.src=base64;
  });
}

function renderForm(id=null){
  editingId=id;
  const p=id?properties.find(x=>x.id===id):{};
  selectedImages=p?.images?[...p.images]:[];
  const offerValue=p?.offerNo||nextOfferNo();
  render(`
    ${header(id?'تعديل عقار':'إضافة عقار جديد',true)}
    <div class="offerFixedBox">
      <label>رقم العرض</label>
      <div class="offerNumber">${esc(offerValue)}</div>
    </div>
    <section class="section">
      <h2>${ico('image')} الصور والفيديو</h2>
      <div class="imageUploader">
        <label class="uploadBox">＋ إضافة صور<input type="file" multiple accept="image/*" onchange="handleImages(event)"></label>
        <label class="uploadBox">＋ إضافة فيديو<input type="file" accept="video/*" onchange="handleVideo(event)"></label>
      </div>
      <div id="previews" class="previewGrid"></div>
      <p class="smallNote">الصور يتم تصغيرها تلقائيًا قبل الحفظ. الصورة الأولى تعتبر الرئيسية.</p>
    </section>
    <section class="section">
      <h2>المعلومات الأساسية</h2>
      <div class="gridForm">
        <div class="field"><label>اسم العقار</label><input id="title" value="${esc(p?.title)}"></div>
        <div class="field"><label>نوع العقار</label><input id="type" value="${esc(p?.type)}"></div>
        ${statusSelect(p?.status||'متاح')}
        <div class="field"><label>المدينة</label><input id="city" value="${esc(p?.city)}"></div>
        <div class="field"><label>الحي</label><input id="district" value="${esc(p?.district)}"></div>
        <div class="field"><label>الشارع</label><input id="street" value="${esc(p?.street)}"></div>
        <div class="field"><label>رابط الموقع أو الإحداثيات</label><input id="mapLink" value="${esc(p?.mapLink)}"></div>
      </div>
    </section>
    ${formSection('بيانات الأرض / العقار',[
      ['area','المساحة م²',p?.area],['length','الطول',p?.length],['width','العرض',p?.width],
      ['streetWidth','عرض الشارع',p?.streetWidth],['frontage','واجهة العقار',p?.frontage],
      ['planNo','رقم المخطط',p?.planNo],['plotNo','رقم القطعة',p?.plotNo],
      ['rooms','عدد الغرف',p?.rooms],['baths','دورات المياه',p?.baths],['parking','مواقف السيارات',p?.parking]
    ])}
    <section class="section">
      <h2>${ico('front')} الحدود والأطوال</h2>
      <div class="gridForm">
        <div class="field"><label>الشمال يحده</label><input id="northBound" value="${esc(p?.northBound)}"></div>
        <div class="field"><label>طول الشمال</label><input id="northLength" value="${esc(p?.northLength)}"></div>
        <div class="field"><label>الجنوب يحده</label><input id="southBound" value="${esc(p?.southBound)}"></div>
        <div class="field"><label>طول الجنوب</label><input id="southLength" value="${esc(p?.southLength)}"></div>
        <div class="field"><label>الشرق يحده</label><input id="eastBound" value="${esc(p?.eastBound)}"></div>
        <div class="field"><label>طول الشرق</label><input id="eastLength" value="${esc(p?.eastLength)}"></div>
        <div class="field"><label>الغرب يحده</label><input id="westBound" value="${esc(p?.westBound)}"></div>
        <div class="field"><label>طول الغرب</label><input id="westLength" value="${esc(p?.westLength)}"></div>
      </div>
    </section>
    <section class="section">
      <h2>${ico('service')} الوصف والخدمات</h2>
      <div class="gridForm">
        <div class="field"><label>وصف العقار</label><textarea id="description">${esc(p?.description)}</textarea></div>
        <div class="field"><label>الخدمات المتوفرة - كل خدمة في سطر</label><textarea id="services">${esc((p?.services||[]).join('\n'))}</textarea></div>
      </div>
    </section>
    <section class="section private">
      <h2>${ico('owner')} معلومات داخلية لا تظهر في PDF المشاركة</h2>
      <div class="gridForm">
        <div class="field"><label>اسم المالك</label><input id="ownerName" value="${esc(p?.ownerName)}"></div>
        <div class="field"><label>رقم المالك</label><input id="ownerPhone" value="${esc(p?.ownerPhone)}"></div>
        <div class="field"><label>اسم الوسيط</label><input id="brokerName" value="${esc(p?.brokerName)}"></div>
        <div class="field"><label>رقم الوسيط المباشر</label><input id="brokerPhone" value="${esc(p?.brokerPhone)}"></div>
        <div class="field"><label>عدد الوسطاء</label><input id="brokerCount" value="${esc(p?.brokerCount)}"></div>
        <div class="field"><label>السعي - نسبة أو مبلغ</label><input id="commission" value="${esc(p?.commission)}"></div>
        <div class="field"><label>السعر</label><input id="price" value="${esc(p?.price)}"></div>
        <div class="field"><label>آخر سومة</label><input id="lastBid" value="${esc(p?.lastBid)}"></div>
        <div class="field"><label>ملاحظات خاصة</label><textarea id="privateNotes">${esc(p?.privateNotes)}</textarea></div>
      </div>
    </section>
    <div class="fixedBar noPrint">
      <button class="primary" onclick="saveProperty('home')">${ico('save')} حفظ العقار</button>
      <button onclick="saveProperty('new')">${ico('add')} حفظ وإضافة جديد</button>
      <button onclick="previewProperty()">معاينة</button>
    </div>
  `);
  renderPreviews();
}

async function handleImages(e){
  const files=[...e.target.files]; if(!files.length) return;
  toast('جارٍ تجهيز الصور...');
  for(const file of files){
    const raw=await new Promise((resolve)=>{
      const r=new FileReader(); r.onload=()=>resolve(r.result); r.readAsDataURL(file);
    });
    selectedImages.push(await compressImage(raw,900,0.45));
  }
  renderPreviews(); e.target.value='';
}

function handleVideo(e){
  if(!e.target.files[0]) return;
  toast('تم اختيار فيديو. سيتم دعم حفظ الفيديو في النسخة الموسعة.');
  e.target.value='';
}

function renderPreviews(){
  const box=$('previews'); if(!box) return;
  box.innerHTML=selectedImages.map((src,i)=>`
    <div class="preview">
      <img src="${src}">
      <button onclick="removeImage(${i})">×</button>
      ${i===0?'<span class="mainBadge">رئيسية</span>':''}
    </div>
  `).join('');
}

function removeImage(i){ selectedImages.splice(i,1); renderPreviews(); }

function collect(){
  const status=val('status')||'متاح';
  const offerBox=document.querySelector('.offerNumber');
  const offerNo=offerBox?offerBox.textContent.trim():nextOfferNo();
  return {
    id:editingId||uid(), offerNo,
    title:val('title'), type:val('type'), status,
    city:val('city'), district:val('district'), street:val('street'), mapLink:val('mapLink'),
    area:val('area'), length:val('length'), width:val('width'),
    streetWidth:val('streetWidth'), frontage:val('frontage'),
    planNo:val('planNo'), plotNo:val('plotNo'),
    rooms:val('rooms'), baths:val('baths'), parking:val('parking'),
    northBound:val('northBound'), northLength:val('northLength'),
    southBound:val('southBound'), southLength:val('southLength'),
    eastBound:val('eastBound'), eastLength:val('eastLength'),
    westBound:val('westBound'), westLength:val('westLength'),
    description:val('description'),
    services:val('services').split('\n').map(x=>x.trim()).filter(Boolean),
    ownerName:val('ownerName'), ownerPhone:val('ownerPhone'),
    brokerName:val('brokerName'), brokerPhone:val('brokerPhone'),
    brokerCount:val('brokerCount'), commission:val('commission'),
    price:val('price'), lastBid:val('lastBid'), privateNotes:val('privateNotes'),
    images:selectedImages,
    archived:isArchiveStatus(status)?true:(editingId?!!properties.find(p=>p.id===editingId)?.archived:false),
    updatedAt:new Date().toISOString()
  };
}

function saveProperty(next='home'){
  try{
    const data=collect();
    if(editingId){
      const old=properties.find(p=>p.id===editingId);
      if(old) data.offerNo=old.offerNo;
      properties=properties.map(p=>p.id===editingId?{...p,...data}:p);
    }else{
      properties.push(data); editingId=data.id;
    }
    saveStore(); toast('تم حفظ العقار بنجاح');
    if(next==='new'){ editingId=null; selectedImages=[]; setTimeout(()=>renderForm(),250); return; }
    setTimeout(()=>renderHome(),250);
  }catch(err){
    console.error(err);
    if(String(err).toLowerCase().includes('quota')){
      alert('الصور كثيرة جدًا. جرّب حذف بعض الصور.'); return;
    }
    alert('حدث خطأ أثناء الحفظ: '+err.message);
  }
}

function previewProperty(){ openPdf(collect(),true); }

function renderDetails(id){
  const p=properties.find(x=>x.id===id);
  if(!p) return renderHome();
  render(`
    ${header('عرض رقم '+esc(p.offerNo||p.id),true)}
    <section class="detailsHero">
      <div class="heroImg">${p.images?.[0]?`<img src="${p.images[0]}">` : 'لا توجد صورة'}</div>
      <div class="galleryStrip">${(p.images||[]).map(src=>`<img src="${src}">`).join('')}</div>
    </section>
    <section class="titleBlock">
      <h2>${esc(p.title||'عقار بدون اسم')}</h2>
      <p>${ico('map')} ${esc([p.city,p.district,p.street].filter(Boolean).join(' - ')||'-')}</p>
      ${p.mapLink?`<button class="contactLink" onclick="openMap('${jsEsc(p.mapLink)}')">${ico('map')} فتح الموقع في الخرائط</button>`:''}
    </section>
    <section class="section">
      <h2>معلومات العقار</h2>
      <div class="infoGrid">
        ${cell('home','نوع العقار',p.type)}${cell('service','الحالة',p.status)}
        ${cell('area','المساحة',p.area)}${cell('front','الواجهة',p.frontage)}
        ${cell('street','عرض الشارع',p.streetWidth)}${cell('plan','رقم المخطط',p.planNo)}
        ${cell('plot','رقم القطعة',p.plotNo)}${cell('bed','الغرف',p.rooms)}
        ${cell('bath','دورات المياه',p.baths)}${cell('car','المواقف',p.parking)}
      </div>
    </section>
    <section class="section"><h2>الحدود والأطوال</h2>${boundsTable(p)}</section>
    <section class="section"><h2>وصف العقار</h2><p>${esc(p.description||'-')}</p></section>
    <section class="section">
      <h2>الخدمات المتوفرة</h2>
      <div class="servicesGrid">
        ${(p.services||[]).map(s=>`<div class="serviceItem">${ico('service')} ${esc(s)}</div>`).join('')||'-'}
      </div>
    </section>
    <section class="section private">
      <h2>معلومات داخلية لا تظهر في PDF</h2>
      <div class="infoGrid">
        ${cell('owner','المالك',relatedLink(p.ownerName,'ownerName'))}
        ${cell('phone','رقم المالك',phone(p.ownerPhone))}
        ${cell('broker','الوسيط',relatedLink(p.brokerName,'brokerName'))}
        ${cell('phone','رقم الوسيط',phone(p.brokerPhone))}
        ${cell('broker','عدد الوسطاء',p.brokerCount)}
        ${cell('service','السعي',p.commission)}
        ${cell('service','السعر',p.price)}
        ${cell('service','آخر سومة',p.lastBid)}
        ${cell('service','ملاحظات',p.privateNotes)}
      </div>
    </section>
    <div class="fixedBar noPrint">
      <button class="primary" onclick="renderForm('${p.id}')">${ico('edit')} تعديل</button>
      <button onclick="openPdfById('${p.id}')">${ico('share')} مشاركة PDF</button>
      ${p.archived
        ? `<button onclick="unarchiveProperty('${p.id}')">نقل للعام</button>`
        : `<button class="warn" onclick="archiveProperty('${p.id}')">${ico('archive')} أرشفة</button>`}
      <button class="danger" onclick="deleteProperty('${p.id}')">${ico('delete')} حذف</button>
    </div>
  `);
}

function cell(i,l,v){
  return `<div class="infoCell">${ico(i)}<small>${l}</small><b>${v||'-'}</b></div>`;
}

function phone(v){
  return v?`<a class="contactLink" href="tel:${esc(v)}">${esc(v)}</a>`:'-';
}

function relatedLink(name,key){
  if(!name) return '-';
  return `<a class="contactLink" href="#" onclick="showRelated('${jsEsc(name)}','${key}');return false;">${esc(name)}</a>`;
}

function showRelated(name,key){
  const list=properties.filter(p=>p[key]===name);
  alert(`العقارات المرتبطة بـ ${name}\n\nإجمالي العروض: ${list.length}\n`+
    list.map(p=>`${p.offerNo||p.id} - ${p.title||'عقار بدون اسم'}`).join('\n'));
}

function boundsTable(p){
  return `
    <table class="boundTable">
      <tr><th>الاتجاه</th><th>ما يحده</th><th>الطول</th></tr>
      <tr><td>الشمال</td><td>${esc(p.northBound||'-')}</td><td>${esc(p.northLength||'-')}</td></tr>
      <tr><td>الجنوب</td><td>${esc(p.southBound||'-')}</td><td>${esc(p.southLength||'-')}</td></tr>
      <tr><td>الشرق</td><td>${esc(p.eastBound||'-')}</td><td>${esc(p.eastLength||'-')}</td></tr>
      <tr><td>الغرب</td><td>${esc(p.westBound||'-')}</td><td>${esc(p.westLength||'-')}</td></tr>
    </table>
  `;
}

function archiveProperty(id){
  if(!confirm('نقل العرض إلى الأرشيف؟')) return;
  properties=properties.map(p=>p.id===id?{...p,archived:true,status:p.status||'مؤرشف'}:p);
  saveStore(); renderHome();
}

function unarchiveProperty(id){
  properties=properties.map(p=>p.id===id?{...p,archived:false,status:p.status==='مؤرشف'?'متاح':p.status}:p);
  saveStore(); renderArchive();
}

function deleteProperty(id){
  if(!confirm('حذف نهائي للعرض؟')) return;
  properties=properties.filter(p=>p.id!==id);
  saveStore(); renderHome();
}

function openPdfById(id){
  const p=properties.find(x=>x.id===id);
  if(p) openPdf(p,false);
}

// =============================================
// PDF
// - لا يوجد شريط أدوات أو زر حفظ
// - الهيدر والفوتر داخل كل صفحة بـ position:absolute
//   لا ينقسمان أبداً مهما كان المحتوى
// - رابط الخريطة: QR فقط بدون href قابل للنقر
//   لأن blob URL لا تدعم فتح روابط خارجية
// =============================================

function openPdf(p, preview=false){
  const filename = `تقرير عقاري رقم ${p.offerNo || p.id}`;
  const html = buildFullPageHtml(p, filename);
  const blob = new Blob([html], { type:'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function buildFullPageHtml(p, filename){
  const imgs = p.images || [];
  const gal  = imgs.slice(1).length ? imgs.slice(1) : imgs;
  const galleryPages = [];
  for(let i=0; i<gal.length; i+=6){
    const chunk=gal.slice(i,i+6);
    if(chunk.length) galleryPages.push(chunk);
  }
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${filename}</title>
<style>${pdfStyle()}</style>
</head>
<body>
<div class="pdfPages">
  ${pdfPage(p,imgs)}
  ${galleryPages.map((arr,idx)=>pdfGalleryPage(p,arr,idx+1)).join('')}
</div>
</body>
</html>`;
}

function pdfCell(label,value){
  return `<div class="pdfCell"><small>${esc(label)}</small><b>${esc(value||'-')}</b></div>`;
}

function pdfHeader(p){
  return `
    <div class="head">
      <div class="offerBox">عرض رقم<br><b>${esc(p.offerNo||p.id)}</b></div>
      <div class="title">
        <h1>تقرير عقاري ${esc(p.offerNo||p.id)}</h1>
        <p>للاطلاع على بيانات العقار ومشاركته</p>
      </div>
      <div class="pdfLogoBox">
        <img class="logo" src="${settings.logo}">
        <p>${esc(settings.company)}</p>
      </div>
    </div>
  `;
}

function pdfFooter(){
  return `
    <div class="foot">
      <span>☎ ${esc(settings.phone1)}</span>
      <span>☎ ${esc(settings.phone2)}</span>
      <span>✉ ${esc(settings.email)}</span>
      <span>⌖ ${esc(settings.address)}</span>
      <span>${esc(settings.company)}</span>
    </div>
  `;
}

function pdfMapBox(p){
  if(!p.mapLink) return '';
  const qr = qrUrl(p.mapLink);
  if(!qr) return '';
  return `
    <div class="mapBox">
      <div class="mapText">
        <strong>موقع العقار</strong>
        <span>امسح الكود للوصول للموقع</span>
      </div>
      <div class="qrBox"><img src="${qr}" alt="QR"></div>
    </div>
  `;
}

function pdfPage(p, imgs){
  return `
    <div class="page">
      <div class="wm">رواد</div>
      <div class="pageInner">
        <div class="content">
          ${pdfHeader(p)}
          <div class="hero">
            <div class="heroImg">${imgs[0]?`<img src="${imgs[0]}">`:''}</div>
            <div>
              <div class="bar">معلومات العقار الأساسية</div>
              <div class="pdfGrid">
                ${pdfCell('نوع العقار',p.type)}
                ${pdfCell('الحالة',p.status)}
                ${pdfCell('المدينة',p.city)}
                ${pdfCell('الحي',p.district)}
                ${pdfCell('المساحة',p.area)}
                ${pdfCell('الواجهة',p.frontage)}
                ${pdfCell('عرض الشارع',p.streetWidth)}
                ${pdfCell('رقم القطعة',p.plotNo)}
              </div>
            </div>
          </div>
          <div class="bar">الحدود والأطوال</div>
          <table class="tbl">
            <tr><th>الاتجاه</th><th>ما يحده</th><th>الطول</th></tr>
            <tr><td>الشمال</td><td>${esc(p.northBound||'-')}</td><td>${esc(p.northLength||'-')}</td></tr>
            <tr><td>الجنوب</td><td>${esc(p.southBound||'-')}</td><td>${esc(p.southLength||'-')}</td></tr>
            <tr><td>الشرق</td><td>${esc(p.eastBound||'-')}</td><td>${esc(p.eastLength||'-')}</td></tr>
            <tr><td>الغرب</td><td>${esc(p.westBound||'-')}</td><td>${esc(p.westLength||'-')}</td></tr>
          </table>
          <div class="two">
            <div>
              <div class="bar">تفاصيل العقار</div>
              <div class="pdfGrid" style="grid-template-columns:1fr 1fr">
                ${pdfCell('رقم المخطط',p.planNo)}
                ${pdfCell('الطول',p.length)}
                ${pdfCell('العرض',p.width)}
                ${pdfCell('الغرف',p.rooms)}
                ${pdfCell('دورات المياه',p.baths)}
                ${pdfCell('المواقف',p.parking)}
              </div>
            </div>
            <div>
              <div class="bar">وصف العقار</div>
              <div class="box">${esc(p.description||'-')}</div>
              <div class="bar">الخدمات المتوفرة</div>
              <div class="services">
                ${(p.services||[]).map(s=>`<div>✓ ${esc(s)}</div>`).join('')||'<div>-</div>'}
              </div>
              ${pdfMapBox(p)}
            </div>
          </div>
        </div>
      </div>
      ${pdfFooter()}
    </div>
  `;
}

function pdfGalleryPage(p, arr, n){
  const slots=[...arr];
  while(slots.length<6) slots.push(null);
  return `
    <div class="page">
      <div class="pageInner">
        <div class="content">
          ${pdfHeader(p)}
          <div class="bar">صور العقار - صفحة ${n}</div>
          <div class="gallery sixGallery">
            ${slots.map(src=>`
              <div class="gallerySlot">
                ${src?`<img src="${src}">` : '<div class="emptyPhoto"></div>'}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      ${pdfFooter()}
    </div>
  `;
}

function pdfStyle(){
  return `
    *{ box-sizing:border-box; margin:0; padding:0; }

    html, body{
      background:#888;
      font-family:Arial,Tahoma,sans-serif;
      color:#123;
    }

    .pdfPages{
      width:210mm;
      margin:0 auto;
    }

    /*
      كل صفحة ارتفاعها ثابت 297mm
      الهيدر والفوتر داخلها بـ position:absolute
      المحتوى محصور بين الهيدر والفوتر بـ overflow:hidden
      لا يمكن لأي عنصر أن يتجاوز حدود الصفحة
    */
    .page{
      width:210mm;
      height:297mm;
      background:#fff;
      position:relative;
      overflow:hidden;
      page-break-after:always;
      break-after:page;
      page-break-inside:avoid;
      break-inside:avoid;
      margin-bottom:8px;
    }

    /* المحتوى محصور: من أسفل الهيدر (34mm) إلى أعلى الفوتر (18mm) */
    .pageInner{
      position:absolute;
      top:10mm;
      right:10mm;
      left:10mm;
      bottom:18mm;
      overflow:hidden;
    }

    /* الفوتر مثبت في أسفل الصفحة — لا يتحرك أبداً */
    .foot{
      position:absolute;
      bottom:0;
      left:0;
      right:0;
      height:18mm;
      background:#004d3d;
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:space-around;
      font-size:10px;
      padding:0 8mm;
      z-index:100;
    }

    .head{
      height:24mm;
      display:flex;
      align-items:center;
      justify-content:space-between;
      border-bottom:3px solid #004d3d;
      padding-bottom:6px;
    }

    .pdfLogoBox{
      width:46mm;
      display:flex;
      flex-direction:column;
      align-items:center;
      text-align:center;
    }
    .pdfLogoBox .logo{ width:22mm; max-height:18mm; object-fit:contain; display:block; margin:0 auto 2mm; }
    .pdfLogoBox p{ margin:0; font-weight:bold; font-size:10px; line-height:1.4; }

    .title{ text-align:center; flex:1; }
    .title h1{ margin:0; color:#004d3d; font-size:22px; }
    .title p{ margin:4px 0; color:#52736b; font-size:12px; }

    .offerBox{
      width:34mm;
      background:#004d3d;
      color:#fff;
      border-radius:8px;
      padding:8px 10px;
      text-align:center;
      font-size:15px;
    }
    .offerBox b{ font-size:24px; }

    .hero{ display:grid; grid-template-columns:1fr 1.05fr; gap:10px; margin-top:10px; }

    .heroImg{ height:190px; border-radius:10px; overflow:hidden; background:#eef2f1; }
    .heroImg img{ width:100%; height:100%; object-fit:cover; display:block; }

    .pdfGrid{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      border:1px solid #d8e2df;
      border-radius:9px;
      overflow:hidden;
    }
    .pdfCell{ min-height:50px; border:1px solid #d8e2df; text-align:center; padding:6px; }
    .pdfCell small{ display:block; color:#567; font-size:10px; }
    .pdfCell b{ display:block; margin-top:4px; color:#0a332d; font-size:12px; }

    .bar{
      background:#004d3d; color:#fff;
      text-align:center; font-weight:bold;
      padding:5px; border-radius:6px 6px 0 0;
      margin-top:8px; font-size:12px;
    }

    .tbl{ width:100%; border-collapse:collapse; }
    .tbl th{ background:#00664f; color:#fff; }
    .tbl td,.tbl th{ border:1px solid #d8e2df; padding:5px; text-align:center; font-size:11px; }

    .two{ display:grid; grid-template-columns:1fr 1.15fr; gap:10px; }

    .box{ border:1px solid #d8e2df; border-radius:0 0 8px 8px; padding:8px; min-height:52px; font-size:11px; }

    .services{ display:grid; grid-template-columns:repeat(4,1fr); }
    .services div{ border:1px solid #d8e2df; text-align:center; padding:6px; font-size:10px; }

    .mapBox{
      display:grid; grid-template-columns:1fr 28mm;
      gap:6mm; align-items:center;
      border:1px solid #d8e2df; border-radius:8px;
      padding:7px; margin-top:8px; background:#f8fbfa;
    }
    .mapText{ text-align:right; }
    .mapText strong{ display:block; color:#004d3d; font-size:12px; margin-bottom:3px; }
    .mapText span{ display:block; color:#52736b; font-size:10px; }

    .qrBox{ width:28mm; height:28mm; border:1px solid #004d3d; border-radius:6px; padding:2mm; background:#fff; }
    .qrBox img{ width:100%; height:100%; object-fit:contain; display:block; }

    .sixGallery{
      display:grid;
      grid-template-columns:1fr 1fr;
      grid-template-rows:repeat(3,1fr);
      gap:8mm; margin-top:8mm; height:206mm;
    }
    .gallerySlot{ border:1px solid #d8e2df; border-radius:8px; overflow:hidden; background:#f4f7f6; }
    .gallerySlot img{ width:100%; height:100%; object-fit:cover; display:block; }
    .emptyPhoto{ width:100%; height:100%; background:linear-gradient(135deg,#f4f7f6,#eaf0ed); }

    .wm{
      position:absolute; top:40mm; right:20mm;
      opacity:0.035; font-size:150px; font-weight:bold;
      color:#004d3d; z-index:0; pointer-events:none;
    }
    .content{ position:relative; z-index:1; }

    @media print{
      html,body{ background:#fff; }
      .pdfPages{ width:210mm; margin:0; }
      .page{
        margin:0;
        width:210mm; height:297mm;
        page-break-after:always; break-after:page;
        page-break-inside:avoid; break-inside:avoid;
        position:relative; overflow:hidden;
      }
      .foot{
        position:absolute;
        bottom:0; left:0; right:0;
        height:18mm;
      }
    }
  `;
}

function renderSettings(){
  render(`
    ${header('الإعدادات',true)}
    <section class="section">
      <h2>هوية المؤسسة</h2>
      <div class="gridForm">
        <div class="field"><label>اسم المؤسسة</label><input id="setCompany" value="${esc(settings.company)}"></div>
        <div class="field"><label>الجوال الأول</label><input id="setPhone1" value="${esc(settings.phone1)}"></div>
        <div class="field"><label>الجوال الثاني</label><input id="setPhone2" value="${esc(settings.phone2)}"></div>
        <div class="field"><label>الإيميل</label><input id="setEmail" value="${esc(settings.email)}"></div>
        <div class="field"><label>العنوان</label><input id="setAddress" value="${esc(settings.address)}"></div>
        <div class="field"><label>رفع شعار جديد</label><input type="file" accept="image/*" onchange="loadLogo(event)"></div>
      </div>
      <button class="primary" onclick="saveSettingsForm()">حفظ الإعدادات</button>
    </section>
    <section class="section">
      <h2>النسخ الاحتياطي</h2>
      <div class="settingsGrid">
        <button onclick="exportBackup()">تصدير نسخة احتياطية</button>
        <label class="uploadBox">استيراد نسخة احتياطية<input type="file" accept=".json,.aqarbackup" onchange="importBackup(event)"></label>
        <p class="smallNote">النسخة تحفظ العقارات والصور والشعار والإعدادات محليًا.</p>
      </div>
    </section>
  `);
}

function saveSettingsForm(){
  settings.company=val('setCompany'); settings.phone1=val('setPhone1');
  settings.phone2=val('setPhone2'); settings.email=val('setEmail');
  settings.address=val('setAddress');
  saveSettings(); toast('تم حفظ الإعدادات');
}

function loadLogo(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ settings.logo=r.result; saveSettings(); toast('تم حفظ الشعار'); };
  r.readAsDataURL(f);
}

function exportBackup(){
  const data={properties,settings,exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='AqarBackup.aqarbackup';
  a.click(); URL.revokeObjectURL(a.href);
}

function importBackup(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data=JSON.parse(r.result);
      if(confirm('سيتم استبدال البيانات الحالية بالنسخة الاحتياطية. متابعة؟')){
        properties=data.properties||[];
        settings={...DEFAULT_SETTINGS,...(data.settings||{})};
        saveStore(); saveSettings(); renderHome();
      }
    }catch(err){ alert('ملف النسخة غير صحيح'); }
  };
  r.readAsText(f);
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

renderHome();
