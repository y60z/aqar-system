const KEY = 'rawad_aqar_properties_final_v1';
const SETTINGS_KEY = 'rawad_aqar_settings_final_v1';

let properties = JSON.parse(localStorage.getItem(KEY) || '[]');
let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

let editingId = null;
let selectedImages = [];
let currentView = 'active';
let typeFilter = '';

const DEFAULT_SETTINGS = {
  company:'مؤسسة رواد الأفق للاستثمار',
  phone1:'0552209226',
  phone2:'0500277257',
  email:'rwadalafq@gmail.com',
  address:'طريق المطار',
  logo:'logo.jpeg'
};

settings = {...DEFAULT_SETTINGS, ...settings};

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
  return String(v ?? '')
    .replace(/[&<>"]/g, s => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;'
    }[s]));
}

function val(id){
  return ($(id)?.value || '').trim();
}

function toast(msg){

  const d=document.createElement('div');

  d.className='toast';

  d.textContent=msg;

  document.body.appendChild(d);

  setTimeout(()=>d.remove(),1800);

}

function ico(name){

  const m={
    home:'⌂',
    map:'⌖',
    area:'⛶',
    street:'▥',
    front:'◉',
    plan:'▤',
    plot:'▯',
    bed:'▣',
    bath:'♨',
    car:'▰',
    owner:'👤',
    broker:'♟',
    save:'💾',
    edit:'✎',
    delete:'🗑',
    archive:'▣',
    share:'⇪',
    search:'⌕',
    image:'▧',
    settings:'⚙',
    back:'‹',
    phone:'☎',
    mail:'✉',
    service:'✦',
    pdf:'▣',
    add:'＋'
  };

  return `<span class="ico">${m[name]||'•'}</span>`;
}

function render(html){

  app().innerHTML = `
    <main class="app">
      ${html}
    </main>
  `;

  window.scrollTo(0,0);

}

function statusClass(s=''){

  if(/تفاوض|قيد|تحت|محجوز/.test(s))
    return 'warn';

  if(/مباع|مؤجر|تأجير|بيع/.test(s))
    return 'danger';

  if(/أرشيف|مؤرشف/.test(s))
    return 'gray';

  return '';

}

function isArchiveStatus(s=''){

  return /تم التأجير|تم البيع|مؤرشف/.test(s);

}

function mapUrl(u){

  if(!u)
    return '#';

  if(/^https?:/i.test(u))
    return u;

  return 'https://maps.google.com/?q=' + encodeURIComponent(u);

}

function openMap(link){

  if(!link){

    alert('لا يوجد رابط موقع');

    return;

  }

  window.location.href = mapUrl(link);

}

function getTypes(){

  return [
    ...new Set(
      properties
        .filter(p=>!p.archived && p.type)
        .map(p=>p.type)
    )
  ];

}

function nextOfferNo(){

  const nums = properties
    .map(p => parseInt(String(p.offerNo || '').replace(/\D/g,''),10))
    .filter(n => !isNaN(n));

  return String(
    nums.length
      ? Math.max(...nums) + 1
      : 1001
  );

}

function header(title='إدارة العقارات', showBack=false){

  return `
    <div class="header">

      <div class="brand">

        ${
          showBack
          ? `
            <button class="ghost backBtn" onclick="renderHome()">
              ${ico('back')} رجوع
            </button>
          `
          : `
            <img src="${settings.logo}" alt="logo">
          `
        }

        <h1>${title}</h1>

      </div>

      <div class="topBtns noPrint">

        <button onclick="renderSettings()">
          ${ico('settings')}
        </button>

        ${
          !showBack
          ? `
            <button class="primary" onclick="renderForm()">
              ${ico('add')} إضافة عقار
            </button>
          `
          : ''
        }

      </div>

    </div>
  `;

}
function renderHome(){

  editingId = null;
  selectedImages = [];
  currentView = 'active';
  typeFilter = '';

  const types = getTypes();

  render(`

    ${header()}

    <div class="searchPanel">

      <input
        id="qAll"
        placeholder="بحث شامل في كل التفاصيل"
        oninput="renderPropertyList()"
      >

      <input
        id="qOffer"
        placeholder="بحث برقم العرض فقط"
        oninput="renderPropertyList()"
      >

      <div class="chips">

        <button
          class="chip active"
          id="chip-all"
          onclick="setTypeFilter('')"
        >
          الكل
        </button>

        ${types.map(t=>`
          <button
            class="chip"
            onclick="setTypeFilter('${esc(t)}')"
          >
            ${esc(t)}
          </button>
        `).join('')}

        <button
          class="chip"
          onclick="renderArchive()"
        >
          الأرشيف
        </button>

      </div>

    </div>

    <div id="list" class="list"></div>

  `);

  renderPropertyList();

}

function setTypeFilter(t){

  typeFilter = t;

  renderPropertyList();

}

function filteredList(archived=false){

  let q = ($('qAll')?.value || '').toLowerCase();

  let offer = ($('qOffer')?.value || '');

  let list = properties.filter(
    p => !!p.archived === archived
  );

  if(typeFilter){

    list = list.filter(
      p => p.type === typeFilter
    );

  }

  if(offer){

    list = list.filter(
      p => String(p.offerNo || '').includes(offer)
    );

  }

  if(q){

    list = list.filter(
      p => JSON.stringify(p).toLowerCase().includes(q)
    );

  }

  return list.sort(
    (a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')
  );

}

function renderPropertyList(){

  const box = $('list');

  if(!box) return;

  const list = filteredList(false);

  box.innerHTML =

    list.map(propertyCard).join('')

    ||

    '<div class="empty">لا توجد عقارات</div>';

}

function propertyCard(p){

  const st = esc(p.status || 'متاح');

  return `

    <article class="card">

      <div class="thumb">

        ${
          p.images?.[0]
          ? `<img src="${p.images[0]}">`
          : 'لا توجد صورة'
        }

        <span class="status ${statusClass(st)}">
          ${st}
        </span>

        ${
          p.archived
          ? '<div class="badgeArchive">أرشيف</div>'
          : ''
        }

      </div>

      <div class="cardInfo">

        <h3>
          ${esc(p.title || 'عقار بدون اسم')}
        </h3>

        <div class="meta">

          <span>
            ${ico('map')}
            ${esc([p.city,p.district].filter(Boolean).join(' - ')||'-')}
          </span>

          <span>
            ${ico('area')}
            ${esc(p.area || '-')} م²
          </span>

          <span>
            ${ico('home')}
            ${esc(p.type || '-')}
          </span>

          <span>
            ${ico('front')}
            ${esc(p.frontage || '-')}
          </span>

        </div>

      </div>

      <div class="offer">

        رقم العرض

        <br>

        ${esc(p.offerNo || p.id)}

      </div>

      <div class="actions noPrint">

        <button onclick="renderDetails('${p.id}')">
          عرض
        </button>

        <button onclick="renderForm('${p.id}')">
          ${ico('edit')}
        </button>

        ${
          p.archived
          ? `
            <button onclick="unarchiveProperty('${p.id}')">
              نقل للعام
            </button>
          `
          : `
            <button onclick="archiveProperty('${p.id}')">
              ${ico('archive')}
            </button>
          `
        }

        <button
          class="danger"
          onclick="deleteProperty('${p.id}')"
        >
          ${ico('delete')}
        </button>

      </div>

    </article>

  `;

}

function renderArchive(){

  currentView='archive';

  render(`

    ${header('الأرشيف',true)}

    <div class="searchPanel">

      <input
        id="qAll"
        placeholder="بحث شامل في الأرشيف"
        oninput="renderArchiveList()"
      >

      <input
        id="qOffer"
        placeholder="بحث برقم العرض فقط"
        oninput="renderArchiveList()"
      >

    </div>

    <div id="archiveList" class="list"></div>

  `);

  renderArchiveList();

}

function renderArchiveList(){

  const box = $('archiveList');

  const list = filteredList(true);

  box.innerHTML =

    list.map(propertyCard).join('')

    ||

    '<div class="empty">الأرشيف فارغ</div>';

}
function statusSelect(value='متاح'){

  const opts = [
    'متاح',
    'تحت التفاوض',
    'محجوز',
    'تم التأجير',
    'تم البيع',
    'مؤرشف'
  ];

  return `

    <div class="field">

      <label>الحالة</label>

      <select id="status">

        ${opts.map(o=>`

          <option
            value="${o}"
            ${o === (value || 'متاح') ? 'selected' : ''}
          >
            ${o}
          </option>

        `).join('')}

      </select>

    </div>

  `;

}

function renderForm(id=null){

  editingId=id;

  const p=id
    ? properties.find(x=>x.id===id)
    : {};

  selectedImages = p?.images
    ? [...p.images]
    : [];

  const offerValue = p?.offerNo || nextOfferNo();

  render(`

    ${header(id ? 'تعديل عقار' : 'إضافة عقار جديد', true)}

    <div class="offerFixedBox">

      <label>رقم العرض</label>

      <div class="offerNumber">

        ${esc(offerValue)}

      </div>

    </div>

    <section class="section">

      <h2>
        ${ico('image')}
        الصور والفيديو
      </h2>

      <div class="imageUploader">

        <label class="uploadBox">

          ＋ إضافة صور

          <input
            type="file"
            multiple
            accept="image/*"
            onchange="handleImages(event)"
          >

        </label>

        <label class="uploadBox">

          ＋ إضافة فيديو

          <input
            type="file"
            accept="video/*"
            onchange="handleVideo(event)"
          >

        </label>

      </div>

      <div id="previews" class="previewGrid"></div>

      <p class="smallNote">

        الصور تظهر مصغرة هنا ولا تكبر داخل الصفحة

      </p>

    </section>

    <section class="section">

      <h2>المعلومات الأساسية</h2>

      <div class="gridForm">

        <div class="field">
          <label>اسم العقار</label>
          <input id="title" value="${esc(p?.title)}">
        </div>

        <div class="field">
          <label>نوع العقار</label>
          <input id="type" value="${esc(p?.type)}">
        </div>

        <div class="field">
          <label>التصنيف</label>
          <input id="category" value="${esc(p?.category)}">
        </div>

        ${statusSelect(p?.status || 'متاح')}

        <div class="field">
          <label>المدينة</label>
          <input id="city" value="${esc(p?.city)}">
        </div>

        <div class="field">
          <label>الحي</label>
          <input id="district" value="${esc(p?.district)}">
        </div>

        <div class="field">
          <label>الشارع</label>
          <input id="street" value="${esc(p?.street)}">
        </div>

        <div class="field">
          <label>رابط الموقع</label>
          <input id="mapLink" value="${esc(p?.mapLink)}">
        </div>

      </div>

    </section>

    <div class="fixedBar noPrint">

      <button
        class="primary"
        onclick="saveProperty('details')"
      >
        ${ico('save')}
        حفظ العقار
      </button>

      <button onclick="saveProperty('new')">

        ${ico('add')}
        حفظ وإضافة جديد

      </button>

      <button onclick="previewProperty()">

        معاينة

      </button>

    </div>

  `);

  renderPreviews();

}

function handleImages(e){

  const files=[...e.target.files];

  if(!files.length) return;

  let done=0;

  files.forEach(file=>{

    const r=new FileReader();

    r.onload=()=>{

      selectedImages.push(r.result);

      done++;

      if(done===files.length){

        renderPreviews();

      }

    };

    r.readAsDataURL(file);

  });

  e.target.value='';

}

function handleVideo(e){

  const file=e.target.files[0];

  if(!file) return;

  toast('الفيديو سيتم دعمه لاحقًا');

  e.target.value='';

}

function renderPreviews(){

  const box=$('previews');

  if(!box) return;

  box.innerHTML = selectedImages.map((src,i)=>`

    <div class="preview">

      <img src="${src}">

      <button onclick="removeImage(${i})">
        ×
      </button>

      ${
        i===0
        ? '<span class="mainBadge">رئيسية</span>'
        : ''
      }

    </div>

  `).join('');

}

function removeImage(i){

  selectedImages.splice(i,1);

  renderPreviews();

}
function formSection(title, fields){

  return `

    <section class="section">

      <h2>${title}</h2>

      <div class="gridForm">

        ${fields.map(([id,label,value])=>`

          <div class="field">

            <label>${label}</label>

            <input id="${id}" value="${esc(value)}">

          </div>

        `).join('')}

      </div>

    </section>

  `;

}

function collect(){

  const status = val('status') || 'متاح';

  const offerBox = document.querySelector('.offerNumber');

  const offerNo = offerBox
    ? offerBox.textContent.trim()
    : nextOfferNo();

  return {

    id: editingId || uid(),

    offerNo: offerNo,

    title: val('title'),

    type: val('type'),

    category: val('category'),

    status: status,

    city: val('city'),

    district: val('district'),

    street: val('street'),

    mapLink: val('mapLink'),

    area: val('area'),

    length: val('length'),

    width: val('width'),

    streetWidth: val('streetWidth'),

    frontage: val('frontage'),

    planNo: val('planNo'),

    plotNo: val('plotNo'),

    rooms: val('rooms'),

    baths: val('baths'),

    parking: val('parking'),

    northBound: val('northBound'),

    northLength: val('northLength'),

    southBound: val('southBound'),

    southLength: val('southLength'),

    eastBound: val('eastBound'),

    eastLength: val('eastLength'),

    westBound: val('westBound'),

    westLength: val('westLength'),

    description: val('description'),

    services: val('services')
      .split('\n')
      .map(x=>x.trim())
      .filter(Boolean),

    ownerName: val('ownerName'),

    ownerPhone: val('ownerPhone'),

    brokerName: val('brokerName'),

    brokerPhone: val('brokerPhone'),

    brokerCount: val('brokerCount'),

    commission: val('commission'),

    price: val('price'),

    lastBid: val('lastBid'),

    privateNotes: val('privateNotes'),

    images: selectedImages,

    archived: isArchiveStatus(status)
      ? true
      : (
          editingId
          ? !!properties.find(p=>p.id===editingId)?.archived
          : false
        ),

    updatedAt: new Date().toISOString()

  };

}

function saveProperty(next='details'){

  try{

    const data = collect();

    if(editingId){

      const old = properties.find(p=>p.id===editingId);

      if(old){

        data.offerNo = old.offerNo;

      }

      properties = properties.map(p=>
        p.id===editingId
          ? {...p,...data}
          : p
      );

    }else{

      properties.push(data);

      editingId = data.id;

    }

    saveStore();

    toast('تم حفظ العقار بنجاح');

    if(next === 'new'){

      editingId = null;

      selectedImages = [];

      setTimeout(()=>{

        renderForm();

      },250);

      return;

    }

    setTimeout(()=>{

      renderHome();

    },250);

  }catch(err){

    console.error(err);

    if(String(err).toLowerCase().includes('quota')){

      toast('تم الحفظ لكن الصور كبيرة جدًا');

      renderHome();

      return;

    }

    alert('حدث خطأ أثناء الحفظ');

  }

}

function previewProperty(){

  const data = collect();

  openPdf(data,true);

}

function renderDetails(id){

  const p = properties.find(x=>x.id===id);

  if(!p) return renderHome();

  render(`

    ${header('عرض رقم '+esc(p.offerNo||p.id),true)}

    <section class="detailsHero">

      <div class="heroImg">

        ${
          p.images?.[0]
          ? `<img src="${p.images[0]}">`
          : 'لا توجد صورة'
        }

      </div>

      <div class="galleryStrip">

        ${(p.images||[]).map(src=>`

          <img src="${src}">

        `).join('')}

      </div>

    </section>

    <section class="titleBlock">

      <h2>${esc(p.title || 'عقار بدون اسم')}</h2>

      <p>

        ${ico('map')}

        ${esc([p.city,p.district,p.street].filter(Boolean).join(' - ') || '-')}

      </p>

      ${
        p.mapLink
        ? `
          <button
            class="contactLink"
            onclick="openMap('${esc(p.mapLink)}')"
          >
            ${ico('map')}
            فتح الموقع في الخرائط
          </button>
        `
        : ''
      }

    </section>

    <section class="section">

      <h2>معلومات العقار</h2>

      <div class="infoGrid">

        ${cell('home','نوع العقار',p.type)}

        ${cell('home','التصنيف',p.category)}

        ${cell('service','الحالة',p.status)}

        ${cell('area','المساحة',p.area)}

        ${cell('front','الواجهة',p.frontage)}

        ${cell('street','عرض الشارع',p.streetWidth)}

        ${cell('plan','رقم المخطط',p.planNo)}

        ${cell('plot','رقم القطعة',p.plotNo)}

        ${cell('bed','الغرف',p.rooms)}

        ${cell('bath','دورات المياه',p.baths)}

        ${cell('car','المواقف',p.parking)}

      </div>

    </section>

    <section class="section">

      <h2>الحدود والأطوال</h2>

      ${boundsTable(p)}

    </section>

    <section class="section">

      <h2>وصف العقار</h2>

      <p>${esc(p.description || '-')}</p>

    </section>

    <section class="section">

      <h2>الخدمات المتوفرة</h2>

      <div class="servicesGrid">

        ${
          (p.services||[]).map(s=>`

            <div class="serviceItem">

              ${ico('service')}

              ${esc(s)}

            </div>

          `).join('') || '-'
        }

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

      <button
        class="primary"
        onclick="renderForm('${p.id}')"
      >
        ${ico('edit')}
        تعديل
      </button>

      <button onclick="openPdfById('${p.id}')">

        ${ico('share')}
        مشاركة PDF

      </button>

      ${
        p.archived
        ? `
          <button onclick="unarchiveProperty('${p.id}')">
            نقل للعام
          </button>
        `
        : `
          <button
            class="warn"
            onclick="archiveProperty('${p.id}')"
          >
            ${ico('archive')}
            أرشفة
          </button>
        `
      }

      <button
        class="danger"
        onclick="deleteProperty('${p.id}')"
      >
        ${ico('delete')}
        حذف
      </button>

    </div>

  `);

}
function cell(i,l,v){

  return `

    <div class="infoCell">

      ${ico(i)}

      <small>${l}</small>

      <b>${v || '-'}</b>

    </div>

  `;

}

function phone(v){

  return v

    ? `<a class="contactLink" href="tel:${esc(v)}">${esc(v)}</a>`

    : '-';

}

function relatedLink(name,key){

  if(!name) return '-';

  return `

    <a
      class="contactLink"
      href="#"
      onclick="showRelated('${esc(name)}','${key}');return false;"
    >
      ${esc(name)}
    </a>

  `;

}

function showRelated(name,key){

  const list = properties.filter(p => p[key] === name);

  alert(
    `العقارات المرتبطة بـ ${name}\n\n` +
    `إجمالي العروض: ${list.length}\n` +
    list
      .map(p => `${p.offerNo || p.id} - ${p.title || 'عقار بدون اسم'}`)
      .join('\n')
  );

}

function boundsTable(p){

  return `

    <table class="boundTable">

      <tr>
        <th>الاتجاه</th>
        <th>ما يحده</th>
        <th>الطول</th>
      </tr>

      <tr>
        <td>الشمال</td>
        <td>${esc(p.northBound || '-')}</td>
        <td>${esc(p.northLength || '-')}</td>
      </tr>

      <tr>
        <td>الجنوب</td>
        <td>${esc(p.southBound || '-')}</td>
        <td>${esc(p.southLength || '-')}</td>
      </tr>

      <tr>
        <td>الشرق</td>
        <td>${esc(p.eastBound || '-')}</td>
        <td>${esc(p.eastLength || '-')}</td>
      </tr>

      <tr>
        <td>الغرب</td>
        <td>${esc(p.westBound || '-')}</td>
        <td>${esc(p.westLength || '-')}</td>
      </tr>

    </table>

  `;

}

function archiveProperty(id){

  if(!confirm('نقل العرض إلى الأرشيف؟')) return;

  properties = properties.map(p =>
    p.id === id
      ? {
          ...p,
          archived:true,
          status:p.status || 'مؤرشف'
        }
      : p
  );

  saveStore();

  renderHome();

}

function unarchiveProperty(id){

  properties = properties.map(p =>
    p.id === id
      ? {
          ...p,
          archived:false,
          status:p.status === 'مؤرشف' ? 'متاح' : p.status
        }
      : p
  );

  saveStore();

  renderArchive();

}

function deleteProperty(id){

  if(!confirm('حذف نهائي للعرض؟')) return;

  properties = properties.filter(p => p.id !== id);

  saveStore();

  renderHome();

}

function openPdfById(id){

  const p = properties.find(x => x.id === id);

  if(p) openPdf(p,false);

}

function pdfCell(label,value){

  return `

    <div class="pdfCell">

      <small>${esc(label)}</small>

      <b>${esc(value || '-')}</b>

    </div>

  `;

}

function openPdf(p,preview=false){

  const imgs = p.images || [];

  const gal = imgs.slice(1).length
    ? imgs.slice(1)
    : imgs;

  const galleryPages = [];

  for(let i=0; i<gal.length; i+=6){

    galleryPages.push(gal.slice(i,i+6));

  }

  const html = `<!doctype html>

  <html dir="rtl" lang="ar">

  <head>

    <meta charset="utf-8">

    <title>تقرير عقاري ${esc(p.offerNo || p.id)}</title>

    <style>

      @page{
        size:A4;
        margin:0;
      }

      body{
        margin:0;
        background:#eee;
        font-family:Arial,Tahoma,sans-serif;
        color:#123;
      }

      .page{
        width:210mm;
        height:297mm;
        background:#fff;
        margin:0 auto;
        position:relative;
        padding:12mm 12mm 25mm;
        box-sizing:border-box;
        page-break-after:always;
        overflow:hidden;
      }

      .head{
        height:24mm;
        display:flex;
        align-items:center;
        justify-content:space-between;
        border-bottom:3px solid #004d3d;
        padding-bottom:6px;
        box-sizing:border-box;
      }

      .logo{
        width:78px;
        max-height:64px;
        object-fit:contain;
      }

      .title{
        text-align:center;
      }

      .title h1{
        margin:0;
        color:#004d3d;
        font-size:24px;
      }

      .title p{
        margin:4px 0;
        color:#52736b;
      }

      .offerBox{
        background:#004d3d;
        color:#fff;
        border-radius:8px;
        padding:8px 14px;
        text-align:center;
        font-size:15px;
      }

      .offerBox b{
        font-size:25px;
      }

      .hero{
        display:grid;
        grid-template-columns:1fr 1.05fr;
        gap:10px;
        margin-top:10px;
      }

      .heroImg{
        height:205px;
        border-radius:10px;
        overflow:hidden;
        background:#eef2f1;
      }

      .heroImg img{
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .pdfGrid{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        border:1px solid #d8e2df;
        border-radius:9px;
        overflow:hidden;
      }

      .pdfCell{
        min-height:55px;
        border:1px solid #d8e2df;
        text-align:center;
        padding:7px;
      }

      .pdfCell small{
        display:block;
        color:#567;
        font-size:11px;
      }

      .pdfCell b{
        display:block;
        margin-top:5px;
        color:#0a332d;
        font-size:13px;
      }

      .bar{
        background:#004d3d;
        color:#fff;
        text-align:center;
        font-weight:bold;
        padding:6px;
        border-radius:6px 6px 0 0;
        margin-top:10px;
      }

      .tbl{
        width:100%;
        border-collapse:collapse;
      }

      .tbl th{
        background:#00664f;
        color:#fff;
      }

      .tbl td,
      .tbl th{
        border:1px solid #d8e2df;
        padding:6px;
        text-align:center;
        font-size:12px;
      }

      .two{
        display:grid;
        grid-template-columns:1fr 1.15fr;
        gap:10px;
      }

      .box{
        border:1px solid #d8e2df;
        border-radius:0 0 8px 8px;
        padding:9px;
        min-height:62px;
        font-size:12px;
      }

      .services{
        display:grid;
        grid-template-columns:repeat(4,1fr);
      }

      .services div{
        border:1px solid #d8e2df;
        text-align:center;
        padding:8px;
        font-size:11px;
      }

      .gallery{
        display:grid;
        grid-template-columns:1fr 1fr;
        grid-template-rows:repeat(3,1fr);
        gap:10px;
        margin-top:14px;
        height:210mm;
      }

      .gallery img{
        width:100%;
        height:100%;
        object-fit:cover;
        border-radius:8px;
        border:1px solid #d8e2df;
      }

      .mapBox{
        border:1px solid #d8e2df;
        border-radius:8px;
        padding:10px;
        text-align:center;
        margin-top:8px;
      }

      .mapBox a{
        color:#004d3d;
        font-weight:bold;
        text-decoration:none;
      }

      .foot{
        position:absolute;
        left:0;
        right:0;
        bottom:0;
        background:#004d3d;
        color:#fff;
        height:18mm;
        display:flex;
        align-items:center;
        justify-content:space-around;
        font-size:11px;
      }

      .wm{
        position:absolute;
        inset:40mm 20mm auto;
        opacity:.035;
        text-align:center;
        font-size:150px;
        font-weight:bold;
        color:#004d3d;
        z-index:0;
      }

      .content{
        position:relative;
        z-index:1;
      }

      .printBtn{
        position:fixed;
        top:10px;
        left:10px;
        z-index:99;
        padding:12px 18px;
        border:0;
        border-radius:10px;
        background:#004d3d;
        color:white;
      }

      .closeBtn{
        position:fixed;
        top:10px;
        right:10px;
        z-index:99;
        padding:12px 18px;
        border:0;
        border-radius:10px;
        background:#777;
        color:white;
      }

      @media print{
        body{background:#fff}
        .printBtn,.closeBtn{display:none}
        .page{margin:0}
      }

    </style>

  </head>

  <body>

    <button class="closeBtn" onclick="window.close()">
      إغلاق المعاينة
    </button>

    <button class="printBtn" onclick="window.print()">
      طباعة / حفظ PDF
    </button>

    ${pdfPage(p,imgs)}

    ${galleryPages.map((arr,idx)=>pdfGalleryPage(p,arr,idx+1)).join('')}

  </body>

  </html>`;

  const w = window.open('','_blank');

  w.document.write(html);

  w.document.close();

}
function pdfHeader(p){

  return `

    <div class="head">

      <div class="offerBox">

        عرض رقم

        <br>

        <b>${esc(p.offerNo || p.id)}</b>

      </div>

      <div class="title">

        <h1>تقرير عقاري</h1>

        <p>للاطلاع على البيانات ومشاركة العرض</p>

      </div>

      <div>

        <img class="logo" src="${settings.logo}">

        <p style="margin:0;text-align:center;font-weight:bold">
          ${esc(settings.company)}
        </p>

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

function pdfPage(p,imgs){

  return `

    <section class="page">

      <div class="wm">رواد</div>

      <div class="content">

        ${pdfHeader(p)}

        <div class="hero">

          <div class="heroImg">

            ${
              imgs[0]
              ? `<img src="${imgs[0]}">`
              : ''
            }

          </div>

          <div>

            <div class="bar">معلومات العقار الأساسية</div>

            <div class="pdfGrid">

              ${pdfCell('نوع العقار',p.type)}

              ${pdfCell('التصنيف',p.category)}

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

          <tr>

            <th>الاتجاه</th>

            <th>ما يحده</th>

            <th>الطول</th>

          </tr>

          <tr>

            <td>الشمال</td>

            <td>${esc(p.northBound || '-')}</td>

            <td>${esc(p.northLength || '-')}</td>

          </tr>

          <tr>

            <td>الجنوب</td>

            <td>${esc(p.southBound || '-')}</td>

            <td>${esc(p.southLength || '-')}</td>

          </tr>

          <tr>

            <td>الشرق</td>

            <td>${esc(p.eastBound || '-')}</td>

            <td>${esc(p.eastLength || '-')}</td>

          </tr>

          <tr>

            <td>الغرب</td>

            <td>${esc(p.westBound || '-')}</td>

            <td>${esc(p.westLength || '-')}</td>

          </tr>

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

            <div class="box">

              ${esc(p.description || '-')}

            </div>

            <div class="bar">الخدمات المتوفرة</div>

            <div class="services">

              ${
                (p.services || []).map(s=>`

                  <div>✓ ${esc(s)}</div>

                `).join('') || '<div>-</div>'
              }

            </div>

            ${
              p.mapLink
              ? `
                <div class="mapBox">

                  <a
                    href="${mapUrl(p.mapLink)}"
                    target="_blank"
                  >
                    فتح الموقع في الخرائط
                  </a>

                </div>
              `
              : ''
            }

          </div>

        </div>

      </div>

      ${pdfFooter()}

    </section>

  `;

}

function pdfGalleryPage(p,arr,n){

  return `

    <section class="page">

      <div class="content">

        ${pdfHeader(p)}

        <div class="bar">صور العقار</div>

        <div class="gallery">

          ${
            arr.map(src=>`

              <img src="${src}">

            `).join('')
          }

        </div>

      </div>

      ${pdfFooter()}

    </section>

  `;

}

function renderSettings(){

  render(`

    ${header('الإعدادات',true)}

    <section class="section">

      <h2>هوية المؤسسة</h2>

      <div class="gridForm">

        <div class="field">

          <label>اسم المؤسسة</label>

          <input id="setCompany" value="${esc(settings.company)}">

        </div>

        <div class="field">

          <label>الجوال الأول</label>

          <input id="setPhone1" value="${esc(settings.phone1)}">

        </div>

        <div class="field">

          <label>الجوال الثاني</label>

          <input id="setPhone2" value="${esc(settings.phone2)}">

        </div>

        <div class="field">

          <label>الإيميل</label>

          <input id="setEmail" value="${esc(settings.email)}">

        </div>

        <div class="field">

          <label>العنوان</label>

          <input id="setAddress" value="${esc(settings.address)}">

        </div>

        <div class="field">

          <label>رفع شعار جديد</label>

          <input
            type="file"
            accept="image/*"
            onchange="loadLogo(event)"
          >

        </div>

      </div>

      <button
        class="primary"
        onclick="saveSettingsForm()"
      >
        حفظ الإعدادات
      </button>

    </section>

    <section class="section">

      <h2>النسخ الاحتياطي</h2>

      <div class="settingsGrid">

        <button onclick="exportBackup()">

          تصدير نسخة احتياطية

        </button>

        <label class="uploadBox">

          استيراد نسخة احتياطية

          <input
            type="file"
            accept=".json,.aqarbackup"
            onchange="importBackup(event)"
          >

        </label>

        <p class="smallNote">

          النسخة تحفظ العقارات والصور والشعار والإعدادات محليًا.
          لا ترفع بياناتك إلى GitHub.

        </p>

      </div>

    </section>

  `);

}

function saveSettingsForm(){

  settings.company = val('setCompany');

  settings.phone1 = val('setPhone1');

  settings.phone2 = val('setPhone2');

  settings.email = val('setEmail');

  settings.address = val('setAddress');

  saveSettings();

  toast('تم حفظ الإعدادات');

}

function loadLogo(e){

  const f = e.target.files[0];

  if(!f) return;

  const r = new FileReader();

  r.onload = ()=>{

    settings.logo = r.result;

    saveSettings();

    toast('تم حفظ الشعار');

  };

  r.readAsDataURL(f);

}

function exportBackup(){

  const data = {
    properties,
    settings,
    exportedAt:new Date().toISOString()
  };

  const blob = new Blob(
    [JSON.stringify(data)],
    {type:'application/json'}
  );

  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);

  a.download = 'AqarBackup.aqarbackup';

  a.click();

  URL.revokeObjectURL(a.href);

}

function importBackup(e){

  const f = e.target.files[0];

  if(!f) return;

  const r = new FileReader();

  r.onload = ()=>{

    try{

      const data = JSON.parse(r.result);

      if(confirm('سيتم استبدال البيانات الحالية بالنسخة الاحتياطية. متابعة؟')){

        properties = data.properties || [];

        settings = {
          ...DEFAULT_SETTINGS,
          ...(data.settings || {})
        };

        saveStore();

        saveSettings();

        renderHome();

      }

    }catch(err){

      alert('ملف النسخة غير صحيح');

    }

  };

  r.readAsText(f);

}

if('serviceWorker' in navigator){

  navigator.serviceWorker.register('sw.js').catch(()=>{});

}

renderHome();