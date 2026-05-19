// =============================================
// رواد الأفق — نظام إدارة العقارات
// النسخة النهائية الكاملة
// =============================================

const KEY          = 'rawad_aqar_properties_final_v1';
const SETTINGS_KEY = 'rawad_aqar_settings_final_v1';
const DB_NAME      = 'RawadAqarDB';
const DB_VERSION   = 1;

let properties = [];
let settings   = {};
let db         = null;

// =============================================
// IndexedDB — تهيئة قاعدة البيانات
// =============================================
function initDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains('properties')){
        d.createObjectStore('properties', { keyPath:'id' });
      }
      if(!d.objectStoreNames.contains('settings')){
        d.createObjectStore('settings', { keyPath:'key' });
      }
    };

    req.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(store){
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbPut(store, item){
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(item);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function dbDelete(store, id){
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function dbClear(store){
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

let editingId     = null;
let selectedImages = [];
let currentView   = 'active';
let typeFilter    = '';

const DEFAULT_SETTINGS = {
  company   : 'مؤسسة رواد الأفق للاستثمار',
  phone1    : '0552209226',
  phone2    : '0500277257',
  email     : 'rwadalafq@gmail.com',
  address   : 'طريق المطار - TADA8833',
  website   : '',
  logo      : 'logo.jpeg'
};

settings = { ...DEFAULT_SETTINGS, ...settings };

// الشعار — يُحمَّل من الإعدادات أو من logo.jpeg
function getLogoSrc(){ return settings.logo || 'logo.jpeg'; }

const $   = id => document.getElementById(id);
const app = ()  => $('app');

// =============================================
// تخزين
// =============================================
async function saveStore(){
  if(!db) return;
  // احفظ كل عقار على حدة في IndexedDB
  for(const p of properties){
    await dbPut('properties', p);
  }
}

async function saveSettings(){
  if(!db) return;
  await dbPut('settings', { key: SETTINGS_KEY, value: settings });
  // احتياطي في localStorage للإعدادات فقط (خفيفة)
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }catch(e){}
}

async function deleteFromStore(id){
  if(!db) return;
  await dbDelete('properties', id);
}

async function clearAndSaveAll(){
  if(!db) return;
  await dbClear('properties');
  for(const p of properties){
    await dbPut('properties', p);
  }
}

// =============================================
// مساعدات
// =============================================
function uid(){
  return 'P' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function esc(v=''){
  return String(v??'').replace(/[&<>"]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

function jsEsc(v=''){
  return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');
}

function val(id){ return ($(id)?.value||'').trim(); }

function toast(msg){
  const d = document.createElement('div');
  d.className   = 'toast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 2000);
}

function ico(name){
  const m = {
    home:'⌂',map:'⌖',area:'⛶',street:'▥',front:'◉',plan:'▤',plot:'▯',
    bed:'▣',bath:'♨',owner:'👤',broker:'♟',save:'💾',edit:'✎',
    delete:'🗑',archive:'📁',share:'⇪',image:'▧',settings:'⚙',
    back:'‹',phone:'☎',mail:'✉',service:'✦',add:'＋'
  };
  return `<span class="ico">${m[name]||'•'}</span>`;
}

// =============================================
// حالة العقار — ألوان
// =============================================
const STATUS_COLORS = {
  'متاح'          : { bg:'#e6f7f0', color:'#00875a', dot:'#00875a' },
  'تحت التفاوض'   : { bg:'#fff7e0', color:'#b07800', dot:'#b07800' },
  'محجوز'         : { bg:'#fff0d0', color:'#d08000', dot:'#d08000' },
  'تم التأجير'    : { bg:'#e8f0ff', color:'#2255cc', dot:'#2255cc' },
  'تم البيع'      : { bg:'#fde8e8', color:'#c0392b', dot:'#c0392b' },
  'مؤرشف'         : { bg:'#f0f0f0', color:'#777',    dot:'#999'    },
};

function statusStyle(s=''){
  const c = STATUS_COLORS[s] || { bg:'#f0f5f3', color:'#004d3d', dot:'#004d3d' };
  return `background:${c.bg};color:${c.color};`;
}

function statusDot(s=''){
  const c = STATUS_COLORS[s] || { dot:'#004d3d' };
  return `background:${c.dot};`;
}

function isArchiveStatus(s=''){ return /تم التأجير|تم البيع|مؤرشف/.test(s); }

// =============================================
// خريطة
// =============================================
function mapUrl(u){
  const link = String(u||'').trim();
  if(!link) return '';
  if(/^https?:\/\//i.test(link)) return link;
  const coords = link.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
  if(coords) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords[0])}`;
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(link);
}

function qrUrl(u){
  const link = mapUrl(u);
  if(!link) return '';
  return 'https://quickchart.io/qr?size=180&margin=1&text='+encodeURIComponent(link);
}

function openMap(link){
  const url = mapUrl(link);
  if(!url){ alert('لا يوجد رابط موقع'); return; }
  window.location.href = url;
}

// =============================================
// أنواع وأرقام
// =============================================
function getTypes(){
  return [...new Set(properties.filter(p=>!p.archived&&p.type).map(p=>p.type))];
}

function maxOfferNo(){
  const nums = properties
    .map(p=>parseInt(String(p.offerNo||'').replace(/\D/g,''),10))
    .filter(n=>!isNaN(n));
  return nums.length ? Math.max(...nums) : 1000;
}

function nextOfferNo(){ return String(maxOfferNo()+1); }

// =============================================
// إحصائيات
// =============================================
function getStats(){
  const active = properties.filter(p=>!p.archived);
  return {
    total    : active.length,
    available: active.filter(p=>p.status==='متاح').length,
    reserved : active.filter(p=>['تحت التفاوض','محجوز'].includes(p.status)).length,
    sold     : active.filter(p=>['تم التأجير','تم البيع'].includes(p.status)).length,
  };
}

// =============================================
// CSS الرئيسي المُضاف
// =============================================
function injectStyles(){
  if(document.getElementById('aqar-style')) return;
  const s = document.createElement('style');
  s.id = 'aqar-style';
  s.textContent = `
    /* هيدر */
    .appHeader{
      background:linear-gradient(160deg,#004d3d 0%,#006652 100%);
      padding:14px 16px 16px;
      position:sticky;top:0;z-index:100;
    }
    .headerTop{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:12px;gap:8px;
    }
    .logoArea{display:flex;align-items:center;gap:10px;}
    .logoBox{
      width:44px;height:44px;border-radius:14px;
      overflow:hidden;background:rgba(255,255,255,0.15);
      border:1.5px solid rgba(255,255,255,0.25);
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;
    }
    .logoBox img{width:100%;height:100%;object-fit:contain;}
    .appTitle{color:#fff;font-size:16px;font-weight:900;line-height:1.2;}
    .appSub{color:rgba(255,255,255,0.6);font-size:10px;}
    .headerBtns{display:flex;gap:7px;align-items:center;}
    .hBtn{
      width:38px;height:38px;border-radius:11px;
      background:rgba(255,255,255,0.12);
      border:1px solid rgba(255,255,255,0.2);
      color:#fff;font-size:16px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
    }
    .hBtn.archive{color:#c8a84b;border-color:rgba(200,168,75,0.4);}
    .hBtnAdd{
      height:38px;padding:0 14px;border-radius:11px;
      background:#c8a84b;color:#003d30;
      font-size:13px;font-weight:900;border:none;
      display:flex;align-items:center;gap:5px;cursor:pointer;
      font-family:inherit;white-space:nowrap;
    }

    /* إحصائيات */
    .statsRow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
    .statPill{
      background:rgba(255,255,255,0.1);
      border:1px solid rgba(255,255,255,0.15);
      border-radius:12px;padding:8px 4px;text-align:center;
    }
    .statNum{font-size:18px;font-weight:900;line-height:1;}
    .statLabel{color:rgba(255,255,255,0.6);font-size:9px;margin-top:2px;}

    /* بحث */
    .searchWrap{padding:12px 14px 0;}
    .searchRow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:10px;}
    .searchBox{
      background:#fff;border:1.5px solid #d5e5e0;border-radius:14px;
      padding:10px 14px;display:flex;align-items:center;gap:8px;
      box-shadow:0 2px 8px rgba(0,77,61,0.06);
    }
    .searchBox input{
      border:none;outline:none;background:transparent;
      font-family:inherit;font-size:13px;color:#0d2b24;
      width:100%;direction:rtl;
    }
    .searchBox input::placeholder{color:#aabbb5;}
    .offerSearch{
      background:#fff;border:1.5px solid #c8a84b;border-radius:14px;
      padding:10px 14px;display:flex;align-items:center;gap:6px;
      white-space:nowrap;min-width:130px;
    }
    .offerSearch input{
      border:none;outline:none;background:transparent;
      font-family:inherit;font-size:13px;color:#0d2b24;
      width:80px;direction:rtl;
    }
    .offerSearch input::placeholder{color:#c8a84b;font-size:11px;}

    /* فلاتر */
    .filtersRow{
      display:flex;gap:7px;padding:0 14px 10px;
      overflow-x:auto;scrollbar-width:none;
    }
    .filtersRow::-webkit-scrollbar{display:none;}
    .chip{
      padding:7px 16px;border-radius:99px;font-size:12px;font-weight:700;
      white-space:nowrap;border:1.5px solid #d5e5e0;background:#fff;
      color:#52736b;flex-shrink:0;cursor:pointer;font-family:inherit;
      transition:all .2s;
    }
    .chip.active{background:#004d3d;color:#fff;border-color:#004d3d;}
    .chip.archiveChip{background:#fff8ee;color:#b07800;border-color:#e8d090;}

    /* قائمة البطاقات */
    .propList{padding:0 14px 100px;}

    /* بطاقة العقار */
    .propCard{
      background:#fff;border-radius:20px;overflow:hidden;
      margin-bottom:12px;box-shadow:0 2px 16px rgba(0,77,61,0.07);
      border:1px solid #dceae5;
    }
    .cardTop{display:flex;}
    .cardImg{
      width:110px;height:115px;object-fit:cover;flex-shrink:0;
      background:linear-gradient(135deg,#c8e6de,#90c4b8);
      display:flex;align-items:center;justify-content:center;
      font-size:36px;
    }
    .cardImg img{width:110px;height:115px;object-fit:cover;}
    .cardBody{flex:1;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between;}
    .cardTitle{font-size:14px;font-weight:900;color:#0d2b24;margin-bottom:5px;}
    .cardMeta{display:flex;flex-direction:column;gap:3px;margin-bottom:7px;}
    .metaRow{display:flex;align-items:center;gap:5px;font-size:11px;color:#52736b;}
    .statusBadge{
      display:inline-flex;align-items:center;gap:5px;
      padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;
      width:fit-content;
    }
    .statusDot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
    .cardFoot{
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 12px;border-top:1px solid #edf4f1;background:#fafcfb;
    }
    .offerNum{font-size:11px;color:#52736b;}
    .offerNum span{font-size:15px;font-weight:900;color:#004d3d;margin-right:4px;}
    .cardActions{display:flex;gap:6px;}
    .actBtn{
      width:32px;height:32px;border-radius:9px;border:1px solid #dceae5;
      background:#fff;display:flex;align-items:center;justify-content:center;
      font-size:14px;color:#52736b;cursor:pointer;
    }
    .actBtn.primary{
      background:#004d3d;color:#fff;border-color:#004d3d;
      width:auto;padding:0 12px;font-size:12px;font-weight:700;font-family:inherit;
    }
    .actBtn.danger{color:#c0392b;border-color:#fde8e8;background:#fff8f8;}

    /* شاشة التفاصيل */
    .detailHeroImg{
      width:100%;height:210px;object-fit:cover;display:block;
      background:linear-gradient(135deg,#004d3d,#00876b);
    }
    .detailGallery{display:flex;gap:6px;padding:10px 14px 0;overflow-x:auto;}
    .detailGallery img{width:64px;height:54px;border-radius:10px;object-fit:cover;flex-shrink:0;}
    .detailSection{padding:14px;}
    .sectionBar{
      font-size:12px;font-weight:900;color:#004d3d;
      margin-bottom:8px;display:flex;align-items:center;gap:6px;
    }
    .sectionBar::after{content:'';flex:1;height:1px;background:#dceae5;}
    .infoGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
    .infoCell{
      background:#f5faf8;border:1px solid #dceae5;border-radius:12px;padding:8px;text-align:center;
    }
    .infoLabel{font-size:9px;color:#52736b;margin-bottom:3px;}
    .infoVal{font-size:12px;font-weight:900;color:#0d2b24;}

    /* شريط الإجراءات السفلي */
    .actionBar{
      display:flex;gap:8px;padding:12px 14px;
      background:#fff;border-top:1px solid #dceae5;
      position:sticky;bottom:0;z-index:50;
    }
    .abBtn{
      flex:1;height:44px;border-radius:13px;font-family:inherit;
      font-size:12px;font-weight:700;border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;gap:5px;
    }
    .abBtn.primary{background:#004d3d;color:#fff;}
    .abBtn.share{background:#e8f5f1;color:#004d3d;border:1.5px solid #b0d8cc;}
    .abBtn.warn{background:#fff8e0;color:#b07800;border:1.5px solid #e8d090;}
    .abBtn.danger{background:#fff0f0;color:#c0392b;border:1.5px solid #f5c0c0;}

    /* نموذج الإضافة */
    .formSection{
      background:#fff;border-radius:18px;margin:12px 14px;
      padding:16px;box-shadow:0 2px 12px rgba(0,77,61,0.06);
      border:1px solid #dceae5;
    }
    .formSection h2{font-size:14px;font-weight:900;color:#004d3d;margin-bottom:12px;}
    .gridForm{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .field{display:flex;flex-direction:column;gap:5px;}
    .field label{font-size:11px;font-weight:700;color:#52736b;}
    .field input,.field textarea,.field select{
      border:1.5px solid #dceae5;border-radius:11px;
      padding:9px 12px;font-family:inherit;font-size:13px;
      background:#fff;color:#0d2b24;outline:none;
      transition:border-color .2s;
    }
    .field input:focus,.field textarea:focus,.field select:focus{border-color:#004d3d;}
    .field textarea{resize:vertical;min-height:80px;}
    .field.full{grid-column:1/-1;}

    /* حالات العقار */
    .statusGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
    .statusOpt{
      border:2px solid #dceae5;border-radius:12px;padding:8px 6px;
      text-align:center;cursor:pointer;font-size:11px;font-weight:700;
      font-family:inherit;transition:all .2s;background:#fff;
    }
    .statusOpt.selected{border-width:2px;}
    .statusDotSm{width:8px;height:8px;border-radius:50%;display:inline-block;margin-left:4px;}

    /* الخدمات عداد */
    .servicesWrap{position:relative;}
    .servicesCount{
      position:absolute;left:10px;bottom:8px;
      font-size:10px;color:#aabbb5;font-weight:700;
    }

    /* قائمة الملاك/وسطاء */
    .personCard{
      background:#fff;border-radius:16px;margin-bottom:10px;
      border:1px solid #dceae5;overflow:hidden;
      box-shadow:0 2px 10px rgba(0,77,61,0.05);
    }
    .personHeader{
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 14px;background:#f5faf8;border-bottom:1px solid #dceae5;
    }
    .personName{font-size:14px;font-weight:900;color:#0d2b24;}
    .personPhone{font-size:12px;color:#52736b;}
    .personStats{display:flex;gap:6px;padding:10px 14px;}
    .pStat{
      padding:4px 10px;border-radius:99px;font-size:10px;font-weight:700;
    }
    .personProps{padding:0 14px 12px;}

    /* رفع صور */
    .uploadBox{
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      border:2px dashed #b0d8cc;border-radius:14px;padding:16px;
      cursor:pointer;color:#52736b;font-size:12px;gap:6px;
      background:#f5faf8;font-family:inherit;
    }
    .uploadBox input{display:none;}
    .previewGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;}
    .preview{position:relative;height:90px;border-radius:12px;overflow:hidden;border:1px solid #dceae5;}
    .preview img{width:100%;height:100%;object-fit:cover;display:block;}
    .preview button{
      position:absolute;top:4px;left:4px;width:24px;height:24px;
      border:none;border-radius:50%;background:#c0392b;color:#fff;font-size:14px;
      font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;
    }
    .mainBadge{
      position:absolute;right:5px;bottom:5px;background:#004d3d;color:#fff;
      font-size:10px;padding:2px 7px;border-radius:99px;
    }

    /* فار بار */
    .fixedBar{
      position:fixed;bottom:0;left:0;right:0;
      background:#fff;border-top:1px solid #dceae5;
      padding:12px 16px;display:flex;gap:8px;z-index:200;
      box-shadow:0 -4px 20px rgba(0,77,61,0.08);
    }
    .fixedBar button{
      flex:1;height:44px;border-radius:13px;font-family:inherit;
      font-size:13px;font-weight:700;border:none;cursor:pointer;
    }
    .fixedBar .primary{background:#004d3d;color:#fff;}
    .fixedBar .secondary{background:#e8f5f1;color:#004d3d;border:1.5px solid #b0d8cc;}

    /* إعدادات */
    .settingsCard{
      background:#fff;border-radius:18px;margin:12px 14px;
      padding:16px;border:1px solid #dceae5;
      box-shadow:0 2px 12px rgba(0,77,61,0.06);
    }
    .settingsCard h2{font-size:14px;font-weight:900;color:#004d3d;margin-bottom:14px;}

    /* عام */
    .pageWrap{padding-bottom:80px;}
    .empty{text-align:center;padding:48px 20px;color:#aabbb5;font-size:14px;}
    .backRow{
      display:flex;align-items:center;gap:10px;
      padding:12px 16px;background:#fff;border-bottom:1px solid #dceae5;
      position:sticky;top:0;z-index:100;
    }
    .backBtn{
      background:#f0f5f3;color:#004d3d;border:1px solid #dceae5;
      border-radius:10px;padding:7px 14px;font-family:inherit;
      font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;
    }
    .pageTitle{font-size:15px;font-weight:900;color:#0d2b24;}
    .offerFixedBox{
      background:#004d3d;color:#fff;border-radius:16px;
      padding:14px;margin:14px;text-align:center;
    }
    .offerFixedBox label{display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:4px;}
    .offerNumber{font-size:28px;font-weight:900;letter-spacing:1px;}
    .smallNote{font-size:10px;color:#aabbb5;margin-top:6px;text-align:center;}
    .boundTable{width:100%;border-collapse:collapse;font-size:11px;}
    .boundTable th{background:#004d3d;color:#fff;padding:6px;text-align:center;}
    .boundTable td{border:1px solid #dceae5;padding:6px;text-align:center;}
    .boundTable tr:nth-child(even) td{background:#f5faf8;}
    .servicesGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;}
    .serviceItem{
      background:#e8f5f1;color:#004d3d;border:1px solid #b0d8cc;
      border-radius:99px;padding:5px 12px;font-size:11px;font-weight:700;
      display:flex;align-items:center;gap:4px;
    }
    .privateSection{
      background:#fffbf0;border:1.5px dashed #e8d090;border-radius:18px;
      margin:12px 14px;padding:16px;
    }
    .privateSection h2{font-size:13px;font-weight:900;color:#b07800;margin-bottom:12px;}

    select{
      width:100%;min-height:44px;border:1.5px solid #dceae5;
      border-radius:11px;padding:8px 12px;background:#fff;
      font-family:inherit;font-size:13px;color:#0d2b24;outline:none;
    }
  `;
  document.head.appendChild(s);
}

function render(html){
  injectStyles();
  app().innerHTML = html;
  window.scrollTo(0,0);
}

// =============================================
// الهيدر الجديد
// =============================================
function renderHeader(){
  const st = getStats();
  const logoSrc = settings.logo || 'logo.jpeg';
  return `
    <div class="appHeader">
      <div class="headerTop">
        <div class="logoArea">
          <div class="logoBox">
            <img src="${logoSrc}" onerror="this.style.display='none';this.parentNode.innerHTML='رو';">
          </div>
          <div>
            <div class="appTitle">${esc(settings.company||'رواد الأفق')}</div>
            <div class="appSub">نظام إدارة العقارات</div>
          </div>
        </div>
        <div class="headerBtns">
          <button class="hBtn" onclick="renderSettings()" title="الإعدادات">⚙</button>
          <button class="hBtn archive" onclick="renderArchive()" title="الأرشيف">📁</button>
          <button class="hBtnAdd" onclick="renderForm()">＋ عقار</button>
        </div>
      </div>
      <div class="statsRow">
        <div class="statPill">
          <div class="statNum" style="color:#fff">${st.total}</div>
          <div class="statLabel">إجمالي</div>
        </div>
        <div class="statPill">
          <div class="statNum" style="color:#6ee7c0">${st.available}</div>
          <div class="statLabel">متاح</div>
        </div>
        <div class="statPill">
          <div class="statNum" style="color:#ffd580">${st.reserved}</div>
          <div class="statLabel">محجوز</div>
        </div>
        <div class="statPill">
          <div class="statNum" style="color:#ff9a9a">${st.sold}</div>
          <div class="statLabel">مباع/مؤجر</div>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// الصفحة الرئيسية
// =============================================
function renderHome(){
  editingId = null; selectedImages = []; currentView = 'active'; typeFilter = '';
  const types = getTypes();
  render(`
    ${renderHeader()}
    <div class="searchWrap">
      <div class="searchRow">
        <div class="searchBox">
          <span style="color:#aabbb5;font-size:14px;">🔍</span>
          <input id="qAll" placeholder="بحث شامل في كل التفاصيل..." oninput="renderPropertyList()">
        </div>
        <div class="offerSearch">
          <span style="color:#c8a84b;font-size:12px;">رقم</span>
          <input id="qOffer" placeholder="العرض..." oninput="renderPropertyList()" type="number">
        </div>
      </div>
    </div>
    <div class="filtersRow">
      <button class="chip active" id="chip-all" onclick="setTypeFilter('')">الكل</button>
      ${types.map(t=>`<button class="chip" onclick="setTypeFilter('${esc(t)}')">${esc(t)}</button>`).join('')}
      
    </div>
    <div class="propList" id="list"></div>
  `);
  renderPropertyList();
}

function setTypeFilter(t){ typeFilter=t; renderPropertyList(); }

function filteredList(archived=false){
  const q     = ($('qAll')?.value||'').toLowerCase();
  const offer = ($('qOffer')?.value||'');
  let list = properties.filter(p=>!!p.archived===archived);
  if(typeFilter) list = list.filter(p=>p.type===typeFilter);
  if(offer) list = list.filter(p=>String(p.offerNo||'').includes(offer));
  if(q) list = list.filter(p=>JSON.stringify(p).toLowerCase().includes(q));
  return list.sort((a,b)=>parseInt(b.offerNo||0,10)-parseInt(a.offerNo||0,10));
}

function renderPropertyList(){
  const box = $('list'); if(!box) return;
  const list = filteredList(false);
  box.innerHTML = list.map(propertyCard).join('') || '<div class="empty">لا توجد عقارات</div>';
}

function propertyCard(p){
  const st  = p.status||'متاح';
  const img = p.images?.[0];
  return `
    <div class="propCard">
      <div class="cardTop">
        <div class="cardImg">
          ${img?`<img src="${img}" alt="">`:'🏠'}
        </div>
        <div class="cardBody">
          <div class="cardTitle">${esc(p.title||'عقار بدون اسم')}</div>
          <div class="cardMeta">
            <div class="metaRow">📍 ${esc([p.city,p.district].filter(Boolean).join(' - ')||'-')}</div>
            <div class="metaRow">📐 ${esc(p.area||'-')} م² ${p.frontage?'| '+esc(p.frontage):''}</div>
          </div>
          <div class="statusBadge" style="${statusStyle(st)}">
            <span class="statusDot" style="${statusDot(st)}"></span>
            ${esc(st)}
          </div>
        </div>
      </div>
      <div class="cardFoot">
        <div class="offerNum">عرض رقم <span>${esc(p.offerNo||p.id)}</span></div>
        <div class="cardActions">
          <div class="actBtn danger" onclick="deleteProperty('${p.id}')">🗑</div>
          <div class="actBtn" onclick="archiveProperty('${p.id}')">📁</div>
          <div class="actBtn" onclick="renderForm('${p.id}')">✎</div>
          <div class="actBtn primary" onclick="renderDetails('${p.id}')">عرض</div>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// الأرشيف
// =============================================
function renderArchive(){
  currentView = 'archive';
  render(`
    <div class="backRow">
      <button class="backBtn" onclick="renderHome()">‹ رجوع</button>
      <div class="pageTitle">📁 الأرشيف</div>
    </div>
    <div class="searchWrap">
      <div class="searchRow">
        <div class="searchBox">
          <span style="color:#aabbb5;">🔍</span>
          <input id="qAll" placeholder="بحث في الأرشيف..." oninput="renderArchiveList()">
        </div>
        <div class="offerSearch">
          <span style="color:#c8a84b;font-size:12px;">رقم</span>
          <input id="qOffer" placeholder="العرض..." oninput="renderArchiveList()" type="number">
        </div>
      </div>
    </div>
    <div class="propList" id="archiveList"></div>
  `);
  renderArchiveList();
}

function renderArchiveList(){
  const box = $('archiveList'); if(!box) return;
  const list = filteredList(true);
  box.innerHTML = list.map(archivedCard).join('') || '<div class="empty">الأرشيف فارغ</div>';
}

function archivedCard(p){
  const st  = p.status||'مؤرشف';
  const img = p.images?.[0];
  return `
    <div class="propCard">
      <div class="cardTop">
        <div class="cardImg">${img?`<img src="${img}" alt="">`:'🏠'}</div>
        <div class="cardBody">
          <div class="cardTitle">${esc(p.title||'عقار بدون اسم')}</div>
          <div class="cardMeta">
            <div class="metaRow">📍 ${esc([p.city,p.district].filter(Boolean).join(' - ')||'-')}</div>
          </div>
          <div class="statusBadge" style="${statusStyle(st)}">
            <span class="statusDot" style="${statusDot(st)}"></span>
            ${esc(st)}
          </div>
        </div>
      </div>
      <div class="cardFoot">
        <div class="offerNum">عرض رقم <span>${esc(p.offerNo||p.id)}</span></div>
        <div class="cardActions">
          <div class="actBtn danger" onclick="deleteProperty('${p.id}')">🗑</div>
          <div class="actBtn" onclick="unarchiveProperty('${p.id}')">↩</div>
          <div class="actBtn primary" onclick="renderDetails('${p.id}')">عرض</div>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// نموذج الإضافة / التعديل
// =============================================
function renderForm(id=null){
  editingId = id;
  const p = id ? properties.find(x=>x.id===id) : {};
  selectedImages = p?.images ? [...p.images] : [];
  const offerValue = p?.offerNo || nextOfferNo();
  const currentStatus = p?.status || 'متاح';

  const statusOpts = ['متاح','تحت التفاوض','محجوز','تم التأجير','تم البيع','أخرى'];

  render(`
    <div class="backRow">
      <button class="backBtn" onclick="renderHome()">‹ رجوع</button>
      <div class="pageTitle">${id?'تعديل عقار':'إضافة عقار جديد'}</div>
    </div>

    <div class="offerFixedBox">
      <label>رقم العرض</label>
      <div class="offerNumber" id="offerNoDisplay">${esc(offerValue)}</div>
    </div>

    <!-- صور -->
    <div class="formSection">
      <h2>▧ الصور</h2>
      <label class="uploadBox">
        <span style="font-size:24px;">📷</span>
        <span>اضغط لإضافة صور (بحد أقصى 12)</span>
        <input type="file" multiple accept="image/*" onchange="handleImages(event)">
      </label>
      <div class="previewGrid" id="previews"></div>
      <p class="smallNote">الصورة الأولى هي الرئيسية</p>
    </div>

    <!-- المعلومات الأساسية -->
    <div class="formSection">
      <h2>المعلومات الأساسية</h2>
      <div class="gridForm">
        <div class="field full">
          <label>اسم العقار</label>
          <input id="title" value="${esc(p?.title)}">
        </div>
        <div class="field">
          <label>نوع العقار</label>
          <input id="type" value="${esc(p?.type)}">
        </div>
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
        <div class="field full">
          <label>رابط الموقع أو الإحداثيات</label>
          <input id="mapLink" value="${esc(p?.mapLink)}">
        </div>
      </div>
    </div>

    <!-- الحالة -->
    <div class="formSection">
      <h2>حالة العقار</h2>
      <div class="statusGrid" id="statusGrid">
        ${statusOpts.map(o=>`
          <button class="statusOpt ${o===currentStatus||(!statusOpts.slice(0,-1).includes(currentStatus)&&o==='أخرى')?'selected':''}"
            style="${o===currentStatus||(!statusOpts.slice(0,-1).includes(currentStatus)&&o==='أخرى')?statusStyle(o):''}"
            onclick="selectStatus('${o}',this)">
            <span class="statusDotSm" style="${statusDot(o)}"></span>
            ${o}
          </button>
        `).join('')}
      </div>
      <input id="statusCustom" placeholder="اكتب الحالة هنا..." value="${!statusOpts.slice(0,-1).includes(currentStatus)?esc(currentStatus):''}"
        style="margin-top:8px;display:${!statusOpts.slice(0,-1).includes(currentStatus)?'block':'none'};width:100%;border:1.5px solid #dceae5;border-radius:11px;padding:9px 12px;font-family:inherit;font-size:13px;">
      <input type="hidden" id="statusValue" value="${esc(currentStatus)}">
    </div>

    <!-- بيانات الأرض -->
    <div class="formSection">
      <h2>بيانات الأرض / العقار</h2>
      <div class="gridForm">
        <div class="field"><label>المساحة م²</label><input id="area" value="${esc(p?.area)}"></div>
        <div class="field"><label>الطول</label><input id="length" value="${esc(p?.length)}"></div>
        <div class="field"><label>العرض</label><input id="width" value="${esc(p?.width)}"></div>
        <div class="field"><label>عرض الشارع</label><input id="streetWidth" value="${esc(p?.streetWidth)}"></div>
        <div class="field"><label>واجهة العقار</label><input id="frontage" value="${esc(p?.frontage)}"></div>
        <div class="field"><label>رقم المخطط</label><input id="planNo" value="${esc(p?.planNo)}"></div>
        <div class="field"><label>رقم القطعة</label><input id="plotNo" value="${esc(p?.plotNo)}"></div>
        <div class="field"><label>عدد الغرف</label><input id="rooms" value="${esc(p?.rooms)}"></div>
        <div class="field"><label>دورات المياه</label><input id="baths" value="${esc(p?.baths)}"></div>
      </div>
    </div>

    <!-- الحدود -->
    <div class="formSection">
      <h2>◉ الحدود والأطوال</h2>
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
    </div>

    <!-- وصف وخدمات -->
    <div class="formSection">
      <h2>✦ الوصف والخدمات</h2>
      <div class="gridForm">
        <div class="field full">
          <label>وصف العقار (كل سطر فقرة مستقلة في PDF)</label>
          <textarea id="description" rows="4">${esc(p?.description)}</textarea>
        </div>
        <div class="field full">
          <label>الخدمات المتوفرة — كل خدمة في سطر (بحد أقصى 12)</label>
          <div class="servicesWrap">
            <textarea id="services" rows="6"
              oninput="limitServices(this)">${esc((p?.services||[]).join('\n'))}</textarea>
            <span class="servicesCount" id="servicesCount">${(p?.services||[]).length}/12</span>
          </div>
        </div>
      </div>
    </div>

    <!-- معلومات داخلية -->
    <div class="privateSection">
      <h2>👤 معلومات داخلية — لا تظهر في PDF</h2>
      <div class="gridForm">
        <div class="field">
          <label>اسم المالك</label>
          <input id="ownerName" value="${esc(p?.ownerName)}">
        </div>
        <div class="field">
          <label>رقم المالك</label>
          <input id="ownerPhone" value="${esc(p?.ownerPhone)}" type="tel">
        </div>
        <div class="field">
          <label>اسم الوسيط</label>
          <input id="brokerName" value="${esc(p?.brokerName)}">
        </div>
        <div class="field">
          <label>رقم الوسيط</label>
          <input id="brokerPhone" value="${esc(p?.brokerPhone)}" type="tel">
        </div>
        <div class="field">
          <label>عدد الوسطاء</label>
          <input id="brokerCount" value="${esc(p?.brokerCount)}">
        </div>
        <div class="field">
          <label>السعي</label>
          <input id="commission" value="${esc(p?.commission)}">
        </div>
        <div class="field">
          <label>السعر</label>
          <input id="price" value="${esc(p?.price)}">
        </div>
        <div class="field">
          <label>آخر سومة</label>
          <input id="lastBid" value="${esc(p?.lastBid)}">
        </div>
        <div class="field full">
          <label>ملاحظات خاصة</label>
          <textarea id="privateNotes">${esc(p?.privateNotes)}</textarea>
        </div>
      </div>
    </div>

    <div style="height:90px;"></div>

    <div class="fixedBar">
      <button class="primary" onclick="saveProperty('home')">💾 حفظ العقار</button>
      <button class="secondary" onclick="saveProperty('new')">＋ حفظ وجديد</button>
    </div>
  `);
  renderPreviews();
}

function selectStatus(val, btn){
  document.querySelectorAll('.statusOpt').forEach(b=>{
    b.classList.remove('selected');
    b.removeAttribute('style');
  });
  btn.classList.add('selected');
  btn.style.cssText = statusStyle(val);
  $('statusValue').value = val;
  const customInput = $('statusCustom');
  if(val==='أخرى'){
    customInput.style.display='block';
    customInput.focus();
  } else {
    customInput.style.display='none';
    customInput.value='';
  }
}

function limitServices(el){
  const lines = el.value.split('\n');
  if(lines.length > 12){
    el.value = lines.slice(0,12).join('\n');
    toast('الحد الأقصى 12 خدمة');
  }
  const count = el.value.split('\n').filter(l=>l.trim()).length;
  const counter = $('servicesCount');
  if(counter) counter.textContent = `${count}/12`;
}

// =============================================
// ضغط الصور
// =============================================
async function compressImage(base64, maxWidth=800, quality=0.25){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      let w=img.width, h=img.height;
      if(w>maxWidth){ h=Math.round((h*maxWidth)/w); w=maxWidth; }
      const c = document.createElement('canvas');
      c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg',quality));
    };
    img.src = base64;
  });
}

async function handleImages(e){
  const files = [...e.target.files]; if(!files.length) return;
  toast('جارٍ تجهيز الصور...');
  for(const file of files){
    if(selectedImages.length>=12){ toast('الحد الأقصى 12 صورة'); break; }
    const raw = await new Promise(resolve=>{
      const r=new FileReader(); r.onload=()=>resolve(r.result); r.readAsDataURL(file);
    });
    selectedImages.push(await compressImage(raw,800,0.25));
  }
  renderPreviews(); e.target.value='';
}

function renderPreviews(){
  const box=$('previews'); if(!box) return;
  box.innerHTML = selectedImages.map((src,i)=>`
    <div class="preview">
      <img src="${src}">
      <button onclick="removeImage(${i})">×</button>
      ${i===0?'<span class="mainBadge">رئيسية</span>':''}
    </div>
  `).join('');
}

function removeImage(i){ selectedImages.splice(i,1); renderPreviews(); }

// =============================================
// جمع البيانات
// =============================================
function collect(){
  let status = $('statusValue')?.value || 'متاح';
  if(status==='أخرى'){
    const custom = ($('statusCustom')?.value||'').trim();
    status = custom || 'متاح';
  }
  const offerNo = $('offerNoDisplay')?.textContent.trim() || nextOfferNo();

  const servicesRaw = ($('services')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,12);

  return {
    id       : editingId || uid(),
    offerNo,
    title    : val('title'),    type     : val('type'),     status,
    city     : val('city'),     district : val('district'), street   : val('street'),
    mapLink  : val('mapLink'),
    area     : val('area'),     length   : val('length'),   width    : val('width'),
    streetWidth: val('streetWidth'), frontage: val('frontage'),
    planNo   : val('planNo'),   plotNo   : val('plotNo'),
    rooms    : val('rooms'),    baths    : val('baths'),
    northBound: val('northBound'), northLength: val('northLength'),
    southBound: val('southBound'), southLength: val('southLength'),
    eastBound : val('eastBound'),  eastLength : val('eastLength'),
    westBound : val('westBound'),  westLength : val('westLength'),
    description: $('description')?.value || '',
    services : servicesRaw,
    ownerName: val('ownerName'), ownerPhone: val('ownerPhone'),
    brokerName:val('brokerName'),brokerPhone:val('brokerPhone'),
    brokerCount:val('brokerCount'), commission:val('commission'),
    price    : val('price'),    lastBid  : val('lastBid'),
    privateNotes: $('privateNotes')?.value||'',
    images   : selectedImages,
    archived : isArchiveStatus(status) ? true :
               (editingId ? !!properties.find(p=>p.id===editingId)?.archived : false),
    updatedAt: new Date().toISOString()
  };
}

async function saveProperty(next='home'){
  try{
    const data = collect();
    if(editingId){
      const old = properties.find(p=>p.id===editingId);
      if(old) data.offerNo = old.offerNo;
      properties = properties.map(p=>p.id===editingId?{...p,...data}:p);
    } else {
      properties.push(data); editingId = data.id;
    }
    await dbPut('properties', data);
    toast('تم حفظ العقار ✅');
    if(next==='new'){ editingId=null; selectedImages=[]; setTimeout(()=>renderForm(),300); return; }
    setTimeout(()=>renderHome(),300);
  }catch(err){
    console.error(err);
    alert('خطأ: '+err.message);
  }
}

// =============================================
// تفاصيل العقار
// =============================================
function renderDetails(id){
  const p = properties.find(x=>x.id===id);
  if(!p) return renderHome();
  const st = p.status||'متاح';

  render(`
    <div class="backRow">
      <button class="backBtn" onclick="goBack('${p.id}')">‹ رجوع</button>
      <div class="pageTitle">عرض رقم ${esc(p.offerNo||p.id)}</div>
    </div>

    ${p.images?.[0]
      ? `<img class="detailHeroImg" src="${p.images[0]}" alt="">`
      : `<div class="detailHeroImg" style="display:flex;align-items:center;justify-content:center;font-size:60px;">🏠</div>`
    }

    ${p.images?.length>1 ? `
      <div class="detailGallery">
        ${p.images.map(src=>`<img src="${src}" alt="">`).join('')}
      </div>
    ` : ''}

    <div class="detailSection">

      <!-- العنوان والحالة -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:10px;">
        <div>
          <div style="font-size:17px;font-weight:900;color:#0d2b24;margin-bottom:4px;">${esc(p.title||'عقار بدون اسم')}</div>
          <div style="font-size:12px;color:#52736b;">📍 ${esc([p.city,p.district,p.street].filter(Boolean).join(' - ')||'-')}</div>
        </div>
        <div class="statusBadge" style="${statusStyle(st)};flex-shrink:0;">
          <span class="statusDot" style="${statusDot(st)}"></span>
          ${esc(st)}
        </div>
      </div>

      ${p.mapLink?`
        <button onclick="openMap('${jsEsc(p.mapLink)}')"
          style="width:100%;height:40px;border-radius:11px;background:#e8f5f1;color:#004d3d;border:1.5px solid #b0d8cc;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px;">
          📍 فتح الموقع في الخرائط
        </button>
      `:''}

      <div class="sectionBar">معلومات العقار</div>
      <div class="infoGrid">
        ${infoCell('نوع العقار',p.type)}
        ${infoCell('المساحة',p.area?p.area+' م²':'')}
        ${infoCell('الواجهة',p.frontage)}
        ${infoCell('عرض الشارع',p.streetWidth)}
        ${infoCell('رقم المخطط',p.planNo)}
        ${infoCell('رقم القطعة',p.plotNo)}
        ${infoCell('الغرف',p.rooms)}
        ${infoCell('دورات المياه',p.baths)}
        ${infoCell('الطول×العرض',p.length&&p.width?p.length+'×'+p.width:'')}
      </div>

      <div class="sectionBar">الحدود والأطوال</div>
      <table class="boundTable" style="margin-bottom:14px;">
        <tr><th>الاتجاه</th><th>ما يحده</th><th>الطول</th></tr>
        <tr><td>الشمال</td><td>${esc(p.northBound||'-')}</td><td>${esc(p.northLength||'-')}</td></tr>
        <tr><td>الجنوب</td><td>${esc(p.southBound||'-')}</td><td>${esc(p.southLength||'-')}</td></tr>
        <tr><td>الشرق</td><td>${esc(p.eastBound||'-')}</td><td>${esc(p.eastLength||'-')}</td></tr>
        <tr><td>الغرب</td><td>${esc(p.westBound||'-')}</td><td>${esc(p.westLength||'-')}</td></tr>
      </table>

      ${p.description?`
        <div class="sectionBar">وصف العقار</div>
        <div style="font-size:12px;color:#334;line-height:1.8;margin-bottom:14px;white-space:pre-line;">${esc(p.description)}</div>
      `:''}

      ${p.services?.length?`
        <div class="sectionBar">الخدمات المتوفرة</div>
        <div class="servicesGrid" style="margin-bottom:14px;">
          ${p.services.map(s=>`<div class="serviceItem">✓ ${esc(s)}</div>`).join('')}
        </div>
      `:''}

      <!-- معلومات داخلية -->
      <div style="background:#fffbf0;border:1.5px dashed #e8d090;border-radius:14px;padding:12px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:900;color:#b07800;margin-bottom:10px;">👤 معلومات داخلية</div>
        <div class="infoGrid">
          ${infoCell('المالك', p.ownerName ? `<a onclick="renderPersonPage('${jsEsc(p.ownerName)}','ownerName')" style="color:#004d3d;font-weight:900;text-decoration:none;cursor:pointer;">${esc(p.ownerName)}</a>` : '-')}
          ${infoCell('رقم المالك', p.ownerPhone ? `<a href="tel:${esc(p.ownerPhone)}" style="color:#004d3d;">${esc(p.ownerPhone)}</a>` : '-')}
          ${infoCell('الوسيط', p.brokerName ? `<a onclick="renderPersonPage('${jsEsc(p.brokerName)}','brokerName')" style="color:#004d3d;font-weight:900;text-decoration:none;cursor:pointer;">${esc(p.brokerName)}</a>` : '-')}
          ${infoCell('رقم الوسيط', p.brokerPhone ? `<a href="tel:${esc(p.brokerPhone)}" style="color:#004d3d;">${esc(p.brokerPhone)}</a>` : '-')}
          ${infoCell('عدد الوسطاء',p.brokerCount)}
          ${infoCell('السعي',p.commission)}
          ${infoCell('السعر',p.price)}
          ${infoCell('آخر سومة',p.lastBid)}
        </div>
        ${p.privateNotes?`<div style="font-size:11px;color:#666;margin-top:8px;white-space:pre-line;">${esc(p.privateNotes)}</div>`:''}
      </div>

    </div>

    <div style="height:80px;"></div>

    <div class="actionBar">
      <button class="abBtn primary" onclick="renderForm('${p.id}')">✎ تعديل</button>
      <button class="abBtn share" onclick="openPdfById('${p.id}')">⇪ PDF</button>
      ${p.archived
        ? `<button class="abBtn warn" onclick="unarchiveProperty('${p.id}')">↩ نقل للعام</button>`
        : `<button class="abBtn warn" onclick="archiveProperty('${p.id}')">📁 أرشفة</button>`}
      <button class="abBtn danger" onclick="deleteProperty('${p.id}')">🗑</button>
    </div>
  `);
}

function infoCell(label, value){
  return `
    <div class="infoCell">
      <div class="infoLabel">${label}</div>
      <div class="infoVal">${value||'-'}</div>
    </div>
  `;
}

// =============================================
// صفحة المالك / الوسيط
// =============================================
function renderPersonPage(name, key){
  const list = properties.filter(p=>p[key]===name);
  const phone = list[0]?.[key==='ownerName'?'ownerPhone':'brokerPhone']||'';
  const label = key==='ownerName' ? 'المالك' : 'الوسيط';

  const available = list.filter(p=>p.status==='متاح').length;
  const reserved  = list.filter(p=>['تحت التفاوض','محجوز'].includes(p.status)).length;
  const sold      = list.filter(p=>['تم التأجير','تم البيع'].includes(p.status)).length;
  const archived  = list.filter(p=>p.archived).length;

  render(`
    <div class="backRow">
      <button class="backBtn" onclick="renderHome()">‹ رجوع</button>
      <div class="pageTitle">${label}: ${esc(name)}</div>
    </div>

    <div style="padding:14px;">
      <!-- بطاقة الشخص -->
      <div style="background:linear-gradient(135deg,#004d3d,#006652);border-radius:18px;padding:16px;color:#fff;margin-bottom:14px;">
        <div style="font-size:18px;font-weight:900;margin-bottom:6px;">👤 ${esc(name)}</div>
        ${phone?`<a href="tel:${esc(phone)}" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 14px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:10px;">
          ☎ ${esc(phone)}
        </a>`:''}
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;">
          <div style="text-align:center;background:rgba(255,255,255,0.1);border-radius:10px;padding:8px;">
            <div style="font-size:18px;font-weight:900;">${list.length}</div>
            <div style="font-size:9px;opacity:0.7;">إجمالي</div>
          </div>
          <div style="text-align:center;background:rgba(110,231,192,0.2);border-radius:10px;padding:8px;">
            <div style="font-size:18px;font-weight:900;color:#6ee7c0;">${available}</div>
            <div style="font-size:9px;opacity:0.7;">متاح</div>
          </div>
          <div style="text-align:center;background:rgba(255,213,128,0.2);border-radius:10px;padding:8px;">
            <div style="font-size:18px;font-weight:900;color:#ffd580;">${reserved}</div>
            <div style="font-size:9px;opacity:0.7;">محجوز</div>
          </div>
          <div style="text-align:center;background:rgba(255,154,154,0.2);border-radius:10px;padding:8px;">
            <div style="font-size:18px;font-weight:900;color:#ff9a9a;">${sold}</div>
            <div style="font-size:9px;opacity:0.7;">مباع/مؤجر</div>
          </div>
        </div>
      </div>

      <!-- عقاراته -->
      <div style="font-size:13px;font-weight:900;color:#004d3d;margin-bottom:10px;">العقارات المرتبطة</div>
      ${list.length ? list.map(p=>`
        <div class="propCard" onclick="renderDetails('${p.id}')" style="cursor:pointer;">
          <div class="cardTop">
            <div class="cardImg">${p.images?.[0]?`<img src="${p.images[0]}" alt="">`: '🏠'}</div>
            <div class="cardBody">
              <div class="cardTitle">${esc(p.title||'عقار بدون اسم')}</div>
              <div class="cardMeta">
                <div class="metaRow">📍 ${esc([p.city,p.district].filter(Boolean).join(' - ')||'-')}</div>
                <div class="metaRow">📐 ${esc(p.area||'-')} م²</div>
              </div>
              <div class="statusBadge" style="${statusStyle(p.status||'متاح')}">
                <span class="statusDot" style="${statusDot(p.status||'متاح')}"></span>
                ${esc(p.status||'متاح')}
              </div>
            </div>
          </div>
          <div class="cardFoot">
            <div class="offerNum">عرض رقم <span>${esc(p.offerNo||p.id)}</span></div>
          </div>
        </div>
      `).join('') : '<div class="empty">لا توجد عقارات</div>'}
    </div>
  `);
}

// =============================================
// أرشفة / إلغاء / حذف
// =============================================
async function archiveProperty(id){
  if(!confirm('نقل العرض إلى الأرشيف؟')) return;
  properties = properties.map(p=>p.id===id?{...p,archived:true}:p);
  const p = properties.find(x=>x.id===id);
  if(p) await dbPut('properties', p);
  renderHome();
}

async function unarchiveProperty(id){
  properties = properties.map(p=>p.id===id?{...p,archived:false,status:p.status==='مؤرشف'?'متاح':p.status}:p);
  const p = properties.find(x=>x.id===id);
  if(p) await dbPut('properties', p);
  renderArchive();
}

function deleteProperty(id){
  if(!confirm('حذف نهائي للعرض؟')) return;
  properties = properties.filter(p=>p.id!==id);
  saveStore(); renderHome();
}

function goBack(id){
  const p = properties.find(x=>x.id===id);
  if(p && p.archived) renderArchive();
  else renderHome();
}

function openPdfById(id){
  const p = properties.find(x=>x.id===id);
  if(p) openPdf(p,false);
}

// =============================================
// PDF — html2canvas + jsPDF
// =============================================
async function openPdf(p, preview=false){
  const filename = `تقرير عقاري رقم ${p.offerNo||p.id}`;
  if(typeof window.jspdf==='undefined' || typeof html2canvas==='undefined'){
    alert('مكتبات PDF لم تُحمَّل بعد. تأكد من الاتصال بالإنترنت وأعد المحاولة.');
    return;
  }
  toast('جارٍ تجهيز الملف...');
  try{
    const imgs = p.images||[];
    const galImgs = imgs.slice(0,12);
    const galleryChunks = [];
    for(let i=0;i<galImgs.length;i+=6){
      const chunk=galImgs.slice(i,i+6);
      if(chunk.length) galleryChunks.push(chunk);
    }

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;';
    container.innerHTML = buildPdfHtmlPages(p,imgs,galleryChunks);
    document.body.appendChild(container);

    await new Promise(r=>setTimeout(r,800));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pages = container.querySelectorAll('.pdfPage');

    for(let i=0;i<pages.length;i++){
      if(i>0) pdf.addPage();
      const canvas = await html2canvas(pages[i],{
        scale:2, useCORS:true, allowTaint:true,
        backgroundColor:'#ffffff', width:794, height:1123
      });
      pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297);
    }

    container.remove();

    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], filename+'.pdf', {type:'application/pdf'});

    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:filename});
    } else {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href=url; a.download=filename+'.pdf'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
    }
    toast('تم تجهيز الملف ✅');
  }catch(err){
    console.error(err);
    alert('خطأ أثناء إنشاء PDF: '+err.message);
  }
}

function rawEsc(v=''){ return String(v??'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function buildPdfHtmlPages(p,imgs,galleryChunks){
  return [
    buildDataPage(p,imgs),
    ...galleryChunks.map((chunk,i)=>buildGalleryPage(p,chunk,i+1))
  ].join('');
}

function buildDataPage(p,imgs){
  const qr    = qrUrl(p.mapLink);
  const short = p.mapLink ? (p.mapLink.length>55?p.mapLink.slice(0,55)+'...':p.mapLink) : '';
  const descHtml = p.description
    ? p.description.split('\n').map(line=>`<div style="min-height:14px;">${rawEsc(line)||'&nbsp;'}</div>`).join('')
    : '-';

  const logoSrc = settings.logo||'logo.jpeg';
  const company = settings.company||'مؤسسة رواد الأفق للاستثمار';
  const phone1  = settings.phone1||'';
  const phone2  = settings.phone2||'';
  const email   = settings.email||'';
  const address = settings.address||'';
  const website = settings.website||'';

  return `
  <div class="pdfPage" style="width:794px;height:1123px;background:#fff;position:relative;overflow:hidden;font-family:Arial,Tahoma,sans-serif;direction:rtl;box-sizing:border-box;padding:36px 36px 28px;color:#123;">
    <div style="position:absolute;top:160px;right:80px;opacity:0.025;font-size:200px;font-weight:900;color:#004d3d;pointer-events:none;">رواد</div>

    <!-- هيدر -->
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #004d3d;padding-bottom:10px;margin-bottom:12px;position:relative;z-index:1;">
      <div style="background:#004d3d;color:#fff;border-radius:10px;padding:8px 14px;text-align:center;min-width:88px;">
        <div style="font-size:10px;opacity:0.8;">عرض رقم</div>
        <div style="font-size:26px;font-weight:900;">${rawEsc(p.offerNo||p.id)}</div>
      </div>
      <div style="text-align:center;flex:1;padding:0 14px;">
        <div style="font-size:21px;font-weight:900;color:#004d3d;">تقرير عقاري ${rawEsc(p.offerNo||p.id)}</div>
        <div style="font-size:11px;color:#52736b;margin-top:3px;">للاطلاع على بيانات العقار ومشاركته</div>
      </div>
      <div style="text-align:center;min-width:110px;">
        <img src="${getLogoSrc()}" style="height:50px;object-fit:contain;display:block;margin:0 auto 4px;">
        <div style="font-size:9px;font-weight:bold;color:#004d3d;line-height:1.3;">${rawEsc(company)}</div>
      </div>
    </div>

    <!-- صورة + بيانات -->
    <div style="display:grid;grid-template-columns:1fr 1.05fr;gap:12px;margin-bottom:10px;position:relative;z-index:1;">
      <div style="height:180px;border-radius:10px;overflow:hidden;background:#eef2f1;">
        ${imgs[0]?`<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover;display:block;">` : ''}
      </div>
      <div>
        <div style="background:#004d3d;color:#fff;text-align:center;font-weight:bold;padding:5px;border-radius:6px 6px 0 0;font-size:11px;">معلومات العقار الأساسية</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #d8e2df;border-radius:0 0 8px 8px;overflow:hidden;">
          ${[
            ['نوع العقار',p.type],['الحالة',p.status],['المدينة',p.city],
            ['الحي',p.district],['المساحة م²',p.area],['الواجهة',p.frontage],
            ['عرض الشارع',p.streetWidth],['رقم القطعة',p.plotNo],['الشارع',p.street]
          ].map(([l,v])=>`
            <div style="border:1px solid #d8e2df;text-align:center;padding:5px;">
              <div style="font-size:9px;color:#567;">${l}</div>
              <div style="font-size:11px;font-weight:bold;color:#0a332d;margin-top:2px;">${rawEsc(v||'-')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- الحدود -->
    <div style="position:relative;z-index:1;margin-bottom:10px;">
      <div style="background:#004d3d;color:#fff;text-align:center;font-weight:bold;padding:4px;border-radius:6px 6px 0 0;font-size:11px;">الحدود والأطوال</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <tr>${['الاتجاه','ما يحده','الطول'].map(h=>`<th style="background:#00664f;color:#fff;border:1px solid #d8e2df;padding:4px;text-align:center;">${h}</th>`).join('')}</tr>
        ${[['الشمال',p.northBound,p.northLength],['الجنوب',p.southBound,p.southLength],
           ['الشرق',p.eastBound,p.eastLength],['الغرب',p.westBound,p.westLength]]
          .map(([d,b,l],i)=>`
            <tr style="background:${i%2?'#f5f9f7':'#fff'}">
              <td style="border:1px solid #d8e2df;padding:4px;text-align:center;font-weight:bold;color:#004d3d;">${d}</td>
              <td style="border:1px solid #d8e2df;padding:4px;text-align:center;">${rawEsc(b||'-')}</td>
              <td style="border:1px solid #d8e2df;padding:4px;text-align:center;">${rawEsc(l||'-')}</td>
            </tr>`).join('')}
      </table>
    </div>

    <!-- قسمان -->
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:12px;position:relative;z-index:1;">
      <div>
        <div style="background:#004d3d;color:#fff;text-align:center;font-weight:bold;padding:4px;border-radius:6px 6px 0 0;font-size:11px;">تفاصيل العقار</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #d8e2df;border-radius:0 0 8px 8px;overflow:hidden;margin-bottom:8px;">
          ${[['رقم المخطط',p.planNo],['الطول',p.length],['العرض',p.width],
             ['الغرف',p.rooms],['دورات المياه',p.baths],['الطول×العرض',p.length&&p.width?p.length+'×'+p.width:'']]
            .map(([l,v])=>`
              <div style="border:1px solid #d8e2df;text-align:center;padding:5px;">
                <div style="font-size:9px;color:#567;">${l}</div>
                <div style="font-size:11px;font-weight:bold;color:#0a332d;margin-top:2px;">${rawEsc(v||'-')}</div>
              </div>`).join('')}
        </div>
        <div style="background:#004d3d;color:#fff;text-align:center;font-weight:bold;padding:4px;border-radius:6px 6px 0 0;font-size:11px;">وصف العقار</div>
        <div style="border:1px solid #d8e2df;border-radius:0 0 8px 8px;padding:6px;font-size:10px;min-height:40px;line-height:1.7;margin-bottom:8px;">${descHtml}</div>
        <div style="background:#004d3d;color:#fff;text-align:center;font-weight:bold;padding:4px;border-radius:6px 6px 0 0;font-size:11px;">الخدمات المتوفرة</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #d8e2df;border-radius:0 0 8px 8px;overflow:hidden;">
          ${(p.services||[]).map(s=>`<div style="border:1px solid #d8e2df;text-align:center;padding:4px;font-size:9px;">✓ ${rawEsc(s)}</div>`).join('')||'<div style="padding:6px;font-size:10px;">-</div>'}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        ${(qr||short)?`
        <div style="border:1px solid #cce0d8;border-radius:8px;overflow:hidden;">
          <div style="background:#004d3d;color:#fff;text-align:center;font-weight:bold;padding:5px;font-size:11px;">📍 موقع العقار</div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f5faf8;">
            ${qr?`<img src="${qr}" style="width:68px;height:68px;border:1px solid #004d3d;border-radius:6px;padding:2px;background:#fff;flex-shrink:0;">` : ''}
            <div style="flex:1;">
              <div style="font-size:9px;color:#52736b;margin-bottom:4px;">امسح الكود أو انسخ الرابط:</div>
              <div style="font-size:8px;color:#003d30;background:#e8f5f1;border:1px dashed #004d3d;border-radius:4px;padding:4px 6px;word-break:break-all;line-height:1.5;font-family:monospace;">${rawEsc(short)}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div style="background:linear-gradient(135deg,#003d30,#005a45);border-radius:12px;padding:14px;color:#fff;flex:1;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">
            <div style="width:54px;height:54px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:4px;">
              <img src="${getLogoSrc()}" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <div style="font-size:12px;font-weight:900;">${rawEsc(company)}</div>
            ${phone1?`<div style="font-size:10px;color:#c8f0e4;">☎ ${rawEsc(phone1)}${phone2?' | ☎ '+rawEsc(phone2):''}</div>`:''}
            ${email?`<div style="font-size:10px;color:#c8f0e4;">✉ ${rawEsc(email)}</div>`:''}
            ${address?`<div style="font-size:10px;color:#c8f0e4;">📍 ${rawEsc(address)}</div>`:''}
            ${website?`<div style="font-size:10px;color:#c8f0e4;">🌐 ${rawEsc(website)}</div>`:''}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function buildGalleryPage(p,imgs,pageNum){
  const slots=[...imgs]; while(slots.length<6) slots.push(null);
  const logoSrc = settings.logo||'logo.jpeg';
  const company = settings.company||'مؤسسة رواد الأفق للاستثمار';
  return `
  <div class="pdfPage" style="width:794px;height:1123px;background:#fff;position:relative;overflow:hidden;font-family:Arial,Tahoma,sans-serif;direction:rtl;box-sizing:border-box;padding:36px 36px 28px;color:#123;">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #004d3d;padding-bottom:10px;margin-bottom:14px;">
      <div style="background:#004d3d;color:#fff;border-radius:10px;padding:8px 14px;text-align:center;min-width:88px;">
        <div style="font-size:10px;opacity:0.8;">عرض رقم</div>
        <div style="font-size:26px;font-weight:900;">${rawEsc(p.offerNo||p.id)}</div>
      </div>
      <div style="text-align:center;flex:1;padding:0 14px;">
        <div style="font-size:18px;font-weight:900;color:#004d3d;">${rawEsc(p.title||'عقار')}</div>
        <div style="font-size:11px;color:#52736b;margin-top:3px;">${rawEsc([p.city,p.district].filter(Boolean).join(' - '))}</div>
      </div>
      <div style="text-align:center;min-width:110px;">
        <img src="${getLogoSrc()}" style="height:50px;object-fit:contain;display:block;margin:0 auto 4px;">
        <div style="font-size:9px;font-weight:bold;color:#004d3d;">${rawEsc(company)}</div>
      </div>
    </div>
    <div style="background:#004d3d;color:#fff;text-align:center;font-weight:bold;padding:6px;border-radius:6px;margin-bottom:12px;font-size:12px;">صور العقار — صفحة ${pageNum}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:14px;height:870px;">
      ${slots.map(src=>`
        <div style="border:1px solid #d8e2df;border-radius:10px;overflow:hidden;background:#f4f7f6;">
          ${src?`<img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;">` : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#f4f7f6,#eaf0ed);"></div>'}
        </div>
      `).join('')}
    </div>
  </div>`;
}

// =============================================
// الإعدادات
// =============================================
function renderSettings(){
  render(`
    <div class="backRow">
      <button class="backBtn" onclick="renderHome()">‹ رجوع</button>
      <div class="pageTitle">⚙ الإعدادات</div>
    </div>
    <div style="padding-bottom:80px;">
      <div class="settingsCard">
        <h2>هوية المؤسسة — تظهر في PDF</h2>
        <div class="gridForm">
          <div class="field full"><label>اسم المؤسسة</label><input id="setCompany" value="${esc(settings.company)}"></div>
          <div class="field"><label>الجوال الأول</label><input id="setPhone1" value="${esc(settings.phone1)}" type="tel"></div>
          <div class="field"><label>الجوال الثاني</label><input id="setPhone2" value="${esc(settings.phone2)}" type="tel"></div>
          <div class="field"><label>الإيميل</label><input id="setEmail" value="${esc(settings.email)}" type="email"></div>
          <div class="field"><label>العنوان</label><input id="setAddress" value="${esc(settings.address)}"></div>
          <div class="field"><label>رابط الشركة / موقعها</label><input id="setWebsite" value="${esc(settings.website)}" placeholder="https://..."></div>
        </div>
        <div style="margin-top:12px;">
          <label style="font-size:11px;font-weight:700;color:#52736b;display:block;margin-bottom:6px;">شعار المؤسسة</label>
          <label class="uploadBox" style="padding:12px;">
            <span>📷 اضغط لرفع شعار جديد</span>
            <input type="file" accept="image/*" onchange="loadLogo(event)">
          </label>
        </div>
        <button onclick="saveSettingsForm()"
          style="margin-top:14px;width:100%;height:44px;background:#004d3d;color:#fff;border:none;border-radius:13px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">
          💾 حفظ الإعدادات
        </button>
      </div>

      <div class="settingsCard">
        <h2>النسخ الاحتياطي</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button onclick="exportBackup()"
            style="height:44px;background:#e8f5f1;color:#004d3d;border:1.5px solid #b0d8cc;border-radius:13px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">
            📤 تصدير نسخة احتياطية
          </button>
          <label class="uploadBox" style="padding:12px;border-color:#b0d8cc;">
            <span>📥 استيراد ودمج نسخة احتياطية</span>
            <input type="file" accept=".json,.aqarbackup" onchange="importBackup(event)">
          </label>
          <p style="font-size:10px;color:#aabbb5;text-align:center;">
            عند الاستيراد يتم الدمج مع البيانات الحالية. العقارات المكررة الأرقام تأخذ أرقاماً جديدة تلقائياً.
          </p>
        </div>
      </div>
    </div>
  `);
}

async function saveSettingsForm(){
  settings.company = val('setCompany');
  settings.phone1  = val('setPhone1');
  settings.phone2  = val('setPhone2');
  settings.email   = val('setEmail');
  settings.address = val('setAddress');
  settings.website = val('setWebsite');
  await saveSettings();
  toast('تم حفظ الإعدادات ✅');
}

function loadLogo(e){
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = async ()=>{ settings.logo=r.result; await saveSettings(); toast('تم حفظ الشعار ✅'); };
  r.readAsDataURL(f);
}

// =============================================
// تصدير واستيراد — مع دمج ذكي
// =============================================
function exportBackup(){
  const data = { properties, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'AqarBackup_'+new Date().toLocaleDateString('ar').replace(/\//g,'-')+'.aqarbackup';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup(e){
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = async ()=>{
    try{
      const data = JSON.parse(r.result);
      if(!data.properties){ alert('ملف النسخة غير صحيح'); return; }

      const imported = data.properties || [];
      const existingNums = new Set(
        properties.map(p=>String(p.offerNo||'').replace(/\D/g,'')).filter(Boolean)
      );

      let nextNum = maxOfferNo();
      const merged = [...properties];

      for(const imp of imported){
        if(merged.find(p=>p.id===imp.id)) continue;
        const impNum = String(imp.offerNo||'').replace(/\D/g,'');
        if(impNum && existingNums.has(impNum)){
          nextNum++;
          imp.offerNo = String(nextNum);
        }
        if(impNum) existingNums.add(String(imp.offerNo));
        merged.push(imp);
      }

      properties = merged;
      settings = { ...DEFAULT_SETTINGS, ...(data.settings||{}), ...settings };

      // احفظ في IndexedDB
      for(const p of properties){
        await dbPut('properties', p);
      }
      await saveSettings();

      toast(`تم الدمج ✅ — ${imported.length} عقار من النسخة`);
      renderHome();
    }catch(err){
      alert('ملف النسخة غير صحيح');
    }
  };
  r.readAsText(f);
}

// =============================================
// تشغيل
// =============================================
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// تحميل البيانات من IndexedDB ثم تشغيل التطبيق
async function loadAndStart(){
  try{
    await initDB();

    // تحميل العقارات
    const stored = await dbGetAll('properties');
    if(stored && stored.length > 0){
      properties = stored;
    } else {
      // ترحيل من localStorage إن وجد
      const old = localStorage.getItem(KEY);
      if(old){
        try{
          properties = JSON.parse(old);
          // نقل للـ IndexedDB
          for(const p of properties){
            await dbPut('properties', p);
          }
          localStorage.removeItem(KEY);
          toast('تم نقل البيانات لمساحة أكبر ✅');
        }catch(e){ properties = []; }
      }
    }

    // تحميل الإعدادات
    const storedSettings = await dbGetAll('settings');
    const settingsRecord  = storedSettings.find(s=>s.key===SETTINGS_KEY);
    if(settingsRecord){
      settings = { ...DEFAULT_SETTINGS, ...settingsRecord.value };
    } else {
      // ترحيل من localStorage
      const oldS = localStorage.getItem(SETTINGS_KEY);
      if(oldS){
        try{ settings = { ...DEFAULT_SETTINGS, ...JSON.parse(oldS) }; }
        catch(e){}
      }
    }

  }catch(err){
    console.warn('IndexedDB غير متاح، نرجع للـ localStorage:', err);
    try{
      properties = JSON.parse(localStorage.getItem(KEY)||'[]');
      settings   = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}') };
    }catch(e){}
  }

  renderHome();
}

loadAndStart();
