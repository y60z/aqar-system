const STORAGE_KEY = "aqar_properties_v1";

let properties = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let editingId = null;
let currentImages = [];
let view = "home";

const $ = (id) => document.getElementById(id);

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

function uid() {
  return Date.now().toString();
}

function val(id) {
  return $(id)?.value?.trim() || "";
}

function setApp(html) {
  document.body.innerHTML = `<div id="app">${html}</div>`;
}

function icon(name) {
  const icons = {
    add: "＋",
    edit: "✎",
    del: "🗑",
    archive: "▣",
    save: "💾",
    back: "‹",
    image: "▧",
    map: "⌖",
    phone: "☎",
    pdf: "⇪",
    search: "⌕"
  };
  return icons[name] || "•";
}

function renderHome() {
  view = "home";
  const types = [...new Set(properties.filter(p => !p.archived && p.type).map(p => p.type))];

  setApp(`
    <header class="topbar">
      <button onclick="renderSettings()">⚙</button>
      <h1>إدارة العقارات</h1>
      <button onclick="renderForm()">${icon("add")} إضافة عقار</button>
    </header>

    <div class="searchBox">
      <input id="searchAll" placeholder="بحث شامل في كل التفاصيل..." oninput="renderList()" />
      <input id="searchOffer" placeholder="بحث برقم العرض فقط" oninput="renderList()" />
    </div>

    <div class="filters">
      <button onclick="filterType('')">الكل</button>
      ${types.map(t => `<button onclick="filterType('${t}')">${t}</button>`).join("")}
      <button onclick="renderArchive()">الأرشيف</button>
    </div>

    <div id="list"></div>
  `);

  window.activeType = "";
  renderList();
}

function filterType(type) {
  window.activeType = type;
  renderList();
}

function renderList() {
  const q = $("searchAll")?.value?.toLowerCase() || "";
  const offer = $("searchOffer")?.value || "";

  let list = properties.filter(p => !p.archived);

  if (window.activeType) list = list.filter(p => p.type === window.activeType);
  if (offer) list = list.filter(p => String(p.offerNo || "").includes(offer));

  if (q) {
    list = list.filter(p => JSON.stringify(p).toLowerCase().includes(q));
  }

  $("list").innerHTML = list.map(cardHTML).join("") || `<p class="empty">لا توجد عقارات</p>`;
}

function cardHTML(p) {
  return `
    <div class="propertyCard">
      <div class="thumb">
        ${p.images?.[0] ? `<img src="${p.images[0]}">` : `<div class="noImg">لا توجد صورة</div>`}
      </div>
      <div class="cardInfo">
        <b>${p.title || "عقار بدون اسم"}</b>
        <small>رقم العرض: ${p.offerNo || p.id}</small>
        <small>${p.city || ""} ${p.district || ""}</small>
        <small>${p.type || ""} - ${p.category || ""}</small>
        <small>المساحة: ${p.area || "-"} م²</small>
      </div>
      <div class="cardActions">
        <button onclick="renderDetails('${p.id}')">عرض</button>
        <button onclick="renderForm('${p.id}')">${icon("edit")}</button>
        <button onclick="archiveProperty('${p.id}')">${icon("archive")}</button>
        <button onclick="deleteProperty('${p.id}')">${icon("del")}</button>
      </div>
    </div>
  `;
}

function renderForm(id = null) {
  editingId = id;
  const p = id ? properties.find(x => x.id === id) : {};
  currentImages = p?.images ? [...p.images] : [];

  setApp(`
    <header class="topbar">
      <button onclick="renderHome()">${icon("back")}</button>
      <h1>${id ? "تعديل عقار" : "إضافة عقار"}</h1>
    </header>

    <section class="formSec">
      <h2>الصور</h2>
      <input type="file" id="imgInput" multiple accept="image/*" onchange="loadImages(event)">
      <div id="imgPreview" class="imgPreview"></div>
    </section>

    <section class="formSec">
      <h2>البيانات العامة</h2>
      <input id="title" placeholder="اسم العقار" value="${p?.title || ""}">
      <input id="offerNo" placeholder="رقم العرض" value="${p?.offerNo || ""}">
      <input id="type" placeholder="نوع العقار: فيلا، أرض، محل..." value="${p?.type || ""}">
      <input id="category" placeholder="التصنيف: سكني، تجاري..." value="${p?.category || ""}">
      <input id="status" placeholder="الحالة" value="${p?.status || ""}">
      <input id="city" placeholder="المدينة" value="${p?.city || ""}">
      <input id="district" placeholder="الحي" value="${p?.district || ""}">
      <input id="street" placeholder="الشارع" value="${p?.street || ""}">
      <input id="mapUrl" placeholder="رابط الموقع أو الإحداثيات" value="${p?.mapUrl || ""}">
    </section>

    <section class="formSec">
      <h2>بيانات العقار</h2>
      <input id="area" placeholder="المساحة" value="${p?.area || ""}">
      <input id="length" placeholder="الطول" value="${p?.length || ""}">
      <input id="width" placeholder="العرض" value="${p?.width || ""}">
      <input id="streetWidth" placeholder="عرض الشارع" value="${p?.streetWidth || ""}">
      <input id="frontage" placeholder="واجهة العقار" value="${p?.frontage || ""}">
      <input id="planNo" placeholder="رقم المخطط" value="${p?.planNo || ""}">
      <input id="plotNo" placeholder="رقم القطعة" value="${p?.plotNo || ""}">
      <input id="rooms" placeholder="عدد الغرف" value="${p?.rooms || ""}">
      <input id="baths" placeholder="دورات المياه" value="${p?.baths || ""}">
      <input id="parking" placeholder="مواقف السيارات" value="${p?.parking || ""}">
    </section>

    <section class="formSec">
      <h2>الحدود والأطوال</h2>
      <input id="northBound" placeholder="الحد الشمالي" value="${p?.northBound || ""}">
      <input id="northLength" placeholder="طول الشمال" value="${p?.northLength || ""}">
      <input id="southBound" placeholder="الحد الجنوبي" value="${p?.southBound || ""}">
      <input id="southLength" placeholder="طول الجنوب" value="${p?.southLength || ""}">
      <input id="eastBound" placeholder="الحد الشرقي" value="${p?.eastBound || ""}">
      <input id="eastLength" placeholder="طول الشرق" value="${p?.eastLength || ""}">
      <input id="westBound" placeholder="الحد الغربي" value="${p?.westBound || ""}">
      <input id="westLength" placeholder="طول الغرب" value="${p?.westLength || ""}">
    </section>

    <section class="formSec">
      <h2>الوصف والخدمات</h2>
      <textarea id="description" placeholder="وصف العقار">${p?.description || ""}</textarea>
      <textarea id="services" placeholder="الخدمات، كل خدمة في سطر">${(p?.services || []).join("\n")}</textarea>
    </section>

    <section class="formSec private">
      <h2>معلومات داخلية لا تظهر في PDF</h2>
      <input id="ownerName" placeholder="اسم المالك" value="${p?.ownerName || ""}">
      <input id="ownerPhone" placeholder="رقم المالك" value="${p?.ownerPhone || ""}">
      <input id="brokerName" placeholder="اسم الوسيط" value="${p?.brokerName || ""}">
      <input id="brokerPhone" placeholder="رقم الوسيط" value="${p?.brokerPhone || ""}">
      <input id="brokerCount" placeholder="عدد الوسطاء" value="${p?.brokerCount || ""}">
      <input id="commission" placeholder="السعي: نسبة أو مبلغ" value="${p?.commission || ""}">
      <input id="price" placeholder="السعر" value="${p?.price || ""}">
      <input id="lastBid" placeholder="آخر سومة" value="${p?.lastBid || ""}">
      <textarea id="privateNotes" placeholder="ملاحظات خاصة">${p?.privateNotes || ""}</textarea>
    </section>

    <div class="bottomActions">
      <button onclick="saveProperty(false)">${icon("save")} حفظ العقار</button>
      <button onclick="saveProperty(true)">حفظ وإضافة جديد</button>
      <button onclick="previewProperty()">معاينة</button>
    </div>
  `);

  renderImgPreview();
}

function collectForm() {
  return {
    id: editingId || uid(),
    offerNo: val("offerNo") || editingId || uid(),
    title: val("title"),
    type: val("type"),
    category: val("category"),
    status: val("status"),
    city: val("city"),
    district: val("district"),
    street: val("street"),
    mapUrl: val("mapUrl"),

    area: val("area"),
    length: val("length"),
    width: val("width"),
    streetWidth: val("streetWidth"),
    frontage: val("frontage"),
    planNo: val("planNo"),
    plotNo: val("plotNo"),
    rooms: val("rooms"),
    baths: val("baths"),
    parking: val("parking"),

    northBound: val("northBound"),
    northLength: val("northLength"),
    southBound: val("southBound"),
    southLength: val("southLength"),
    eastBound: val("eastBound"),
    eastLength: val("eastLength"),
    westBound: val("westBound"),
    westLength: val("westLength"),

    description: val("description"),
    services: val("services").split("\n").map(x => x.trim()).filter(Boolean),

    ownerName: val("ownerName"),
    ownerPhone: val("ownerPhone"),
    brokerName: val("brokerName"),
    brokerPhone: val("brokerPhone"),
    brokerCount: val("brokerCount"),
    commission: val("commission"),
    price: val("price"),
    lastBid: val("lastBid"),
    privateNotes: val("privateNotes"),

    images: currentImages,
    archived: false,
    updatedAt: new Date().toLocaleString("ar-SA")
  };
}

function saveProperty(addNew = false) {
  const data = collectForm();

  if (editingId) {
    properties = properties.map(p => p.id === editingId ? { ...p, ...data } : p);
  } else {
    properties.push(data);
  }

  saveDB();
  alert("تم حفظ العقار بنجاح");

  if (addNew) {
    editingId = null;
    currentImages = [];
    renderForm();
  } else {
    renderDetails(data.id);
  }
}

function loadImages(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  let loaded = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      currentImages.push(reader.result);
      loaded++;
      if (loaded === files.length) renderImgPreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderImgPreview() {
  const box = $("imgPreview");
  if (!box) return;

  box.innerHTML = currentImages.map((src, i) => `
    <div class="imgItem">
      <img src="${src}">
      <button onclick="removeImage(${i})">×</button>
    </div>
  `).join("");
}

function removeImage(i) {
  currentImages.splice(i, 1);
  renderImgPreview();
}

function renderDetails(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return renderHome();

  setApp(`
    <header class="topbar">
      <button onclick="renderHome()">${icon("back")}</button>
      <h1>عرض رقم ${p.offerNo || p.id}</h1>
    </header>

    <section class="details">
      <div class="mainImg">
        ${p.images?.[0] ? `<img src="${p.images[0]}">` : `<div class="noImg">لا توجد صورة</div>`}
      </div>

      <h2>${p.title || "عقار بدون اسم"}</h2>
      <p>${p.city || ""} - ${p.district || ""}</p>

      <div class="grid">
        ${info("نوع العقار", p.type)}
        ${info("التصنيف", p.category)}
        ${info("الحالة", p.status)}
        ${info("المساحة", p.area)}
        ${info("الواجهة", p.frontage)}
        ${info("عرض الشارع", p.streetWidth)}
        ${info("رقم المخطط", p.planNo)}
        ${info("رقم القطعة", p.plotNo)}
      </div>

      <h3>الوصف</h3>
      <p>${p.description || "-"}</p>

      <h3>الخدمات</h3>
      <div class="services">
        ${(p.services || []).map(s => `<span>✓ ${s}</span>`).join("") || "-"}
      </div>

      <h3>معلومات داخلية لا تظهر في PDF</h3>
      <div class="grid private">
        ${info("المالك", p.ownerName)}
        ${info("رقم المالك", phoneLink(p.ownerPhone))}
        ${info("الوسيط", p.brokerName)}
        ${info("رقم الوسيط", phoneLink(p.brokerPhone))}
        ${info("عدد الوسطاء", p.brokerCount)}
        ${info("السعي", p.commission)}
        ${info("السعر", p.price)}
        ${info("آخر سومة", p.lastBid)}
        ${info("ملاحظات", p.privateNotes)}
      </div>

      <div class="bottomActions">
        <button onclick="renderForm('${p.id}')">${icon("edit")} تعديل</button>
        <button onclick="printPDF('${p.id}')">${icon("pdf")} مشاركة PDF</button>
        <button onclick="archiveProperty('${p.id}')">${icon("archive")} أرشفة</button>
        <button onclick="deleteProperty('${p.id}')">${icon("del")} حذف</button>
      </div>
    </section>
  `);
}

function info(label, value) {
  return `<div class="infoBox"><small>${label}</small><b>${value || "-"}</b></div>`;
}

function phoneLink(phone) {
  return phone ? `<a href="tel:${phone}">${phone}</a>` : "-";
}

function archiveProperty(id) {
  properties = properties.map(p => p.id === id ? { ...p, archived: true } : p);
  saveDB();
  renderHome();
}

function unarchiveProperty(id) {
  properties = properties.map(p => p.id === id ? { ...p, archived: false } : p);
  saveDB();
  renderArchive();
}

function deleteProperty(id) {
  if (!confirm("هل تريد حذف العقار؟")) return;
  properties = properties.filter(p => p.id !== id);
  saveDB();
  renderHome();
}

function renderArchive() {
  setApp(`
    <header class="topbar">
      <button onclick="renderHome()">${icon("back")}</button>
      <h1>الأرشيف</h1>
    </header>
    <div class="list">
      ${properties.filter(p => p.archived).map(p => `
        <div class="propertyCard archived">
          <div class="thumb">${p.images?.[0] ? `<img src="${p.images[0]}">` : ""}</div>
          <div class="cardInfo">
            <b>${p.title || "عقار بدون اسم"}</b>
            <small>رقم العرض: ${p.offerNo || p.id}</small>
          </div>
          <button onclick="unarchiveProperty('${p.id}')">نقل إلى العام</button>
        </div>
      `).join("") || `<p class="empty">الأرشيف فارغ</p>`}
    </div>
  `);
}

function previewProperty() {
  const temp = collectForm();
  openPDFWindow(temp, true);
}

function printPDF(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  openPDFWindow(p, false);
}

function mapHref(url) {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://maps.google.com/?q=${encodeURIComponent(url)}`;
}

function openPDFWindow(p) {
  const imgs = p.images || [];

  const html = `
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="UTF-8">
    <title>تقرير عقاري</title>
    <style>
      body{font-family:Arial,Tahoma,sans-serif;margin:0;background:#fff;color:#173b35}
      .page{width:210mm;min-height:297mm;padding:12mm;box-sizing:border-box}
      .head{display:flex;align-items:center;justify-content:space-between}
      .logo{height:70px}
      h1{color:#005b46;font-size:34px;margin:0}
      .badge{background:#005b46;color:white;padding:18px;border-radius:10px;font-size:28px}
      .bar{background:#005b46;color:white;padding:8px;border-radius:6px;text-align:center;font-weight:bold;margin-top:14px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #ccd8d3;margin-top:8px}
      .cell{padding:12px;border:1px solid #ccd8d3;text-align:center}
      .cell small{display:block;color:#557}
      .hero img{width:100%;height:270px;object-fit:cover;border-radius:10px;margin-top:14px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#005b46;color:white}
      td,th{border:1px solid #ccd8d3;padding:8px;text-align:center}
      .services{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px}
      .services div{border:1px solid #ccd8d3;padding:12px;text-align:center;border-radius:6px}
      .gallery{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
      .gallery img{width:100%;height:210px;object-fit:cover;border-radius:8px}
      footer{position:fixed;bottom:0;left:0;right:0;background:#005b46;color:white;padding:14px 30px;display:flex;justify-content:space-around}
      a{color:#005b46;text-decoration:none}
      @media print{button{display:none}.page{page-break-after:always}}
    </style>
  </head>
  <body>
    <div class="page">
      <div class="head">
        <div class="badge">عرض رقم<br>${p.offerNo || p.id}</div>
        <div><h1>تقرير عقاري</h1><p>مؤسسة رواد الأفق للاستثمار</p></div>
        <img class="logo" src="logo.jpeg">
      </div>

      <div class="hero">${imgs[0] ? `<img src="${imgs[0]}">` : ""}</div>

      <div class="bar">معلومات العقار الأساسية</div>
      <div class="grid">
        ${pdfCell("نوع العقار", p.type)}
        ${pdfCell("التصنيف", p.category)}
        ${pdfCell("الحالة", p.status)}
        ${pdfCell("المدينة", p.city)}
        ${pdfCell("الحي", p.district)}
        ${pdfCell("المساحة", p.area)}
        ${pdfCell("الواجهة", p.frontage)}
        ${pdfCell("عرض الشارع", p.streetWidth)}
        ${pdfCell("رقم القطعة", p.plotNo)}
      </div>

      <div class="bar">الحدود والأطوال</div>
      <table>
        <tr><th>الاتجاه</th><th>الحد</th><th>الطول</th></tr>
        <tr><td>الشمال</td><td>${p.northBound || "-"}</td><td>${p.northLength || "-"}</td></tr>
        <tr><td>الجنوب</td><td>${p.southBound || "-"}</td><td>${p.southLength || "-"}</td></tr>
        <tr><td>الشرق</td><td>${p.eastBound || "-"}</td><td>${p.eastLength || "-"}</td></tr>
        <tr><td>الغرب</td><td>${p.westBound || "-"}</td><td>${p.westLength || "-"}</td></tr>
      </table>

      <div class="bar">وصف العقار</div>
      <p>${p.description || "-"}</p>

      <div class="bar">الخدمات المتوفرة</div>
      <div class="services">${(p.services || []).map(s => `<div>✓ ${s}</div>`).join("") || "-"}</div>

      ${p.mapUrl ? `<p><a href="${mapHref(p.mapUrl)}">فتح الموقع في الخرائط</a></p>` : ""}
    </div>

    <div class="page">
      <div class="head">
        <div class="badge">عرض ${p.offerNo || p.id}</div>
        <h1>صور العقار</h1>
        <img class="logo" src="logo.jpeg">
      </div>
      <div class="gallery">
        ${imgs.map(src => `<img src="${src}">`).join("")}
      </div>
    </div>

    <footer>
      <span>0552209226</span>
      <span>0500277257</span>
      <span>rwadalafq@gmail.com</span>
      <span>طريق المطار</span>
      <span>مؤسسة رواد الأفق للاستثمار</span>
    </footer>

    <script>setTimeout(()=>window.print(),500)</script>
  </body>
  </html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

function pdfCell(label, value) {
  return `<div class="cell"><small>${label}</small><b>${value || "-"}</b></div>`;
}

function renderSettings() {
  alert("الإعدادات والنسخ الاحتياطي نضيفها بعد تثبيت الحفظ بالكامل.");
}

renderHome();