/* =========================================================
   PARADISE MINI WEBSITE — APP.JS
   SPA sederhana: Google Sheets -> Apps Script -> JSON -> UI
   ========================================================= */

// ⚠️ Ganti kalau nanti Bapak deploy ulang Apps Script dan URL berubah
const API_URL = 'https://script.google.com/macros/s/AKfycbyupfHwqHrC1UsbKpnBMDQ6hx1_aumnAGHfvRN9pE3cFle8vITsk53JFKm2HV0vvMpr/exec';

const ASSETS = 'assets/';

/* ---------------------------------------------------------
   KONFIGURASI TETAP (di-hardcode di kode, bukan dari Spreadsheet)
--------------------------------------------------------- */
const WA_NUMBER = '6285895665170'; // 08... diubah jadi 62...

function waLink(message) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

const HOTEL_LOCATION_URL = 'https://maps.app.goo.gl/nRjRBrGsmcunWtj96';

// Lokasi oleh-oleh dicocokkan berdasarkan nama toko (huruf kecil semua)
const OLEH_OLEH_LOCATIONS = {
  'paradise center point oleh-oleh': HOTEL_LOCATION_URL, // 1 lokasi dengan hotel
  'batu paradise factory outlet': 'https://maps.app.goo.gl/5Bur8db4mbX6xa7k6',
};

const CAFE_CONFIG = {
  PCP_BISTRO: {
    name: 'PCP Cafe Bistro',
    image: 'cafe_pcp.jpg',
    menuUrl: null, // belum ada link menu
    mapsUrl: 'https://maps.app.goo.gl/8Qrxkn6xqjFd3va69',
    waMessage: 'Hai, mau tanya cafe PCP',
  },
  ZERO_SIX: {
    name: 'Zero Six Sky Lounge',
    image: 'cafe_zero.jpg',
    menuUrl: 'https://zerosixskylounge.github.io/menu/',
    mapsUrl: 'https://maps.app.goo.gl/z2SKJ7vME3Hbjm9k6',
    waMessage: 'Hai, mau tanya cafe Zero Six',
  },
};

// State global
let DATA = {};          // seluruh isi spreadsheet
let history = ['home']; // stack navigasi untuk tombol "Kembali"

const app = document.getElementById('app');

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

// Ambil field dari object walau nama kolom di sheet sedikit beda
// (case-insensitive & alias). Mengembalikan fallback kalau tak ada.
function field(obj, keys, fallback = '') {
  if (!obj) return fallback;
  const lowerMap = {};
  Object.keys(obj).forEach(k => { lowerMap[k.trim().toLowerCase()] = obj[k]; });
  for (const key of keys) {
    const v = lowerMap[key.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

function img(filename) {
  return `${ASSETS}${filename}`;
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function iconSvg(name) {
  const icons = {
    hotel: '<path d="M3 21h18M6 21V9l6-4 6 4v12M9 21v-6h6v6"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 8h18M12 8v13M12 8c-1.5-4-6-4-6-1s3 1 6 1M12 8c1.5-4 6-4 6-1s-3 1-6 1"/>',
    coffee: '<path d="M4 8h13a3 3 0 0 1 0 6h-1"/><path d="M4 8v6a5 5 0 0 0 5 5h3a5 5 0 0 0 5-5V8"/><path d="M6 3c0 1-1 1-1 2M10 3c0 1-1 1-1 2"/>',
    ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    wa: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.4L3 20l1.15-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
    tiktok: '<path d="M16 3v10.5a3.5 3.5 0 1 1-3-3.46V7a6.5 6.5 0 1 0 6 6.48V9.5a6 6 0 0 0 3 1"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
}

function topbar({ showBack = true } = {}) {
  return `
    <div class="topbar">
      ${showBack ? `<button class="back-btn" onclick="goBack()">${iconSvg('back')} Kembali</button>` : `<span></span>`}
      <button class="home-btn" onclick="goHome()">${iconSvg('home')} Home</button>
    </div>`;
}

function bottomNav(active) {
  const items = [
    { key: 'home', label: 'Home', icon: 'home', go: 'goHome()' },
    { key: 'hotel', label: 'PCP Hotel', icon: 'hotel', go: "navigate('hotel')" },
    { key: 'oleh-oleh', label: 'PCP Oleh-Oleh', icon: 'gift', go: "navigate('oleh-oleh')" },
    { key: 'cafe', label: 'Cafe', icon: 'coffee', go: "navigate('cafe')" },
    { key: 'tiket', label: 'Info Tiket', icon: 'ticket', go: "navigate('tiket')" },
    { key: 'back', label: 'Kembali', icon: 'back', go: 'goBack()' },
  ];
  return `
    <nav class="bottom-nav">
      ${items.map(i => `
        <button class="${active === i.key ? 'active' : ''}" onclick="${i.go}">
          ${iconSvg(i.icon)}<span>${i.label}</span>
        </button>`).join('')}
    </nav>`;
}

/* ---------------------------------------------------------
   ROUTER
--------------------------------------------------------- */
function navigate(route, push = true) {
  if (push && history[history.length - 1] !== route) history.push(route);
  render(route);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() {
  history = ['home'];
  render('home');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (history.length > 1) history.pop();
  render(history[history.length - 1]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------------------------------------
   RENDER: HOME
--------------------------------------------------------- */
function renderHome() {
  const home = (DATA.HOME && DATA.HOME[0]) || {};
  const name = field(home, ['name', 'nama'], 'Jimmy');
  const headline = field(home, ['headline', 'judul'], 'WELCOME TO<br>MY WORLD');
  const tagline = field(home, ['tagline', 'deskripsi', 'description'], 'Everything you need, all in one place.');

  app.querySelector('#view').innerHTML = `
    <div class="hero">
      <img class="jimmy-portrait" src="${img('jimmy_stand.png')}" alt="${name}" onerror="this.style.display='none'">
      <p class="eyebrow">WELCOME TO</p>
      <h1 class="script-name">${name}</h1>
      <h2 class="headline">MY WORLD</h2>
      <p class="tagline">${tagline}</p>
      ${renderSocialRow()}
    </div>

    <div class="card-list">
      <button class="nav-card" onclick="navigate('hotel')">
        <span class="icon-badge">${iconSvg('hotel')}</span>
        <span class="card-text">
          <div class="card-title">PARADISE<br>CENTER POINT HOTEL</div>
          <div class="card-sub">Video &amp; Pemesanan</div>
        </span>
        <span class="thumb"><img src="${img('header.jpg')}" alt="Hotel" onerror="this.parentElement.style.display='none'"></span>
      </button>

      <button class="nav-card" onclick="navigate('oleh-oleh')">
        <span class="icon-badge">${iconSvg('gift')}</span>
        <span class="card-text">
          <div class="card-title">PUSAT<br>OLEH-OLEH</div>
          <div class="card-sub">Video &amp; Pemesanan</div>
        </span>
        <span class="thumb"><img src="${img('store_oleh_oleh.jpg')}" alt="Oleh-oleh" onerror="this.parentElement.style.display='none'"></span>
      </button>

      <button class="nav-card" onclick="navigate('cafe')">
        <span class="icon-badge">${iconSvg('coffee')}</span>
        <span class="card-text">
          <div class="card-title">CAFE</div>
          <div class="card-sub">PCP Cafe Bistro &amp; Zero Six</div>
        </span>
        <span class="thumb"><img src="${img('cafe_pcp.jpg')}" alt="Cafe" onerror="this.parentElement.style.display='none'"></span>
      </button>

      <button class="nav-card" onclick="navigate('tiket')">
        <span class="icon-badge">${iconSvg('ticket')}</span>
        <span class="card-text">
          <div class="card-title">INFO TIKET<br>WISATA</div>
          <div class="card-sub">Lihat Gambar &amp; Info</div>
        </span>
        <span class="thumb"><img src="${img('tiket.jpg')}" alt="Tiket" onerror="this.parentElement.style.display='none'"></span>
      </button>
    </div>
  `;
}

function renderSocialRow() {
  const socials = DATA.SOCIAL || [
    { PLATFORM: 'WhatsApp', URL: '#' },
    { PLATFORM: 'Instagram', URL: '#' },
    { PLATFORM: 'TikTok', URL: '#' },
  ];
  const iconFor = p => {
    const s = p.toLowerCase();
    if (s.includes('wa')) return 'wa';
    if (s.includes('ig') || s.includes('insta')) return 'ig';
    if (s.includes('tik')) return 'tiktok';
    return 'ig';
  };
  return `
    <div class="social-row">
      ${socials.map(s => {
        const platform = field(s, ['platform', 'nama'], 'Link');
        const url = field(s, ['url', 'link'], '#');
        return `
          <a class="social-pill" href="${url}" target="_blank" rel="noopener">
            ${iconSvg(iconFor(platform))}
            <span>${platform.toUpperCase()}</span>
          </a>`;
      }).join('')}
    </div>`;
}

/* ---------------------------------------------------------
   RENDER: HOTEL
--------------------------------------------------------- */
function renderHotel() {
  const hotel = (DATA.HOTEL && DATA.HOTEL[0]) || {};
  const title = field(hotel, ['title', 'judul'], 'Paradise Center Point Hotel');
  const desc = field(hotel, ['description', 'deskripsi'], 'Kenyamanan menginap dengan sentuhan mewah di jantung kota.');
  const cover = field(hotel, ['cover_image', 'cover', 'image'], 'header.jpg');
  const video = field(hotel, ['hotel_video', 'video'], '');
  const rooms = getActiveRooms();

  app.querySelector('#view').innerHTML = `
    ${topbar()}
    <div class="detail-wrap">
      <div class="detail-cover"><img src="${img(cover)}" alt="${title}" onerror="this.parentElement.style.display='none'"></div>
      <h2 class="detail-title">${title}</h2>
      <p class="detail-desc">${desc}</p>
      ${video ? `<button class="btn-gold" onclick="window.open('${video}','_blank')">▶ &nbsp; VIDEO HOTEL</button>` : ''}
      <button class="btn-gold" onclick="window.open('${HOTEL_LOCATION_URL}','_blank')">📍 &nbsp; LOKASI</button>
      <button class="btn-gold solid" onclick="window.open('${waLink('Hai, mau tanya kamar Paradise Center Point Hotel')}','_blank')">💬 &nbsp; PESAN KAMAR</button>
      <div class="divider"></div>
      <h3 class="section-title" style="font-size:20px;">Pilihan Kamar</h3>
      <div class="room-grid" style="margin-top:14px;">
        ${rooms.length ? rooms.map((r, idx) => {
          const name = field(r, ['nama', 'name', 'title'], `Room ${idx + 1}`);
          const image = field(r, ['foto_1', 'foto1', 'foto', 'image', 'asset'], '');
          return `
            <div class="room-card" onclick="openRoom(${idx})">
              <div class="room-photo"><img src="${img(image)}" alt="${name}" onerror="this.parentElement.style.display='none'"></div>
              <div class="room-body">
                <div class="room-name">${name}</div>
                <div class="room-btn">LIHAT DETAIL</div>
              </div>
            </div>`;
        }).join('') : `<p class="empty-state">Data kamar belum tersedia di Spreadsheet.</p>`}
      </div>
    </div>
  `;
}

function openRoom(idx) {
  window.__roomIdx = idx;
  navigate('room-detail');
}

// Ambil hanya kamar dengan AKTIF = TRUE, diurutkan sesuai kolom URUTAN
function getActiveRooms() {
  const rooms = DATA.HOTEL_ROOM || [];
  return rooms
    .filter(r => {
      const aktif = field(r, ['aktif', 'active'], 'TRUE');
      return String(aktif).trim().toUpperCase() !== 'FALSE';
    })
    .sort((a, b) => {
      const ua = Number(field(a, ['urutan', 'order'], 999)) || 999;
      const ub = Number(field(b, ['urutan', 'order'], 999)) || 999;
      return ua - ub;
    });
}

function renderRoomDetail() {
  const rooms = getActiveRooms();
  const r = rooms[window.__roomIdx] || {};
  const name = field(r, ['nama', 'name', 'title'], 'Kamar');
  const image = field(r, ['foto_1', 'foto1', 'foto', 'image', 'asset'], '');
  const image2 = field(r, ['foto_2', 'foto2'], '');
  const desc = field(r, ['deskripsi', 'description'], 'Deskripsi kamar belum diisi.');
  const facilitiesRaw = field(r, ['fasilitas', 'facilities'], '');
  const facilities = facilitiesRaw ? String(facilitiesRaw).split(/[,•\n]/).map(s => s.trim()).filter(Boolean) : [];
  const videoMp4 = field(r, ['video_mp4'], '');

  app.querySelector('#view').innerHTML = `
    ${topbar()}
    <div class="detail-wrap">
      <div class="detail-cover"><img src="${img(image)}" alt="${name}" onerror="this.parentElement.style.display='none'"></div>
      ${image2 ? `<div class="detail-cover" style="margin-top:-4px;"><img src="${img(image2)}" alt="${name} 2" onerror="this.parentElement.style.display='none'"></div>` : ''}
      <h2 class="detail-title">${name}</h2>
      <p class="detail-desc">${desc}</p>
      ${facilities.length ? `
        <h4 class="section-title" style="font-size:16px; text-align:left;">Fasilitas</h4>
        <ul class="facility-list">${facilities.map(f => `<li>${f}</li>`).join('')}</ul>
      ` : ''}
      ${videoMp4 ? `<div class="video-embed"><video src="${videoMp4.startsWith('http') ? videoMp4 : img(videoMp4)}" controls playsinline preload="metadata"></video></div>` : ''}
      <button class="btn-gold solid" onclick="window.open('${waLink(`Hai, mau pesan kamar ${name}`)}','_blank')">💬 &nbsp; PESAN</button>
    </div>
  `;
}
function renderOlehOleh() {
  const stores = DATA.OLEH_OLEH || [
    { NAMA: 'Paradise Center Point Oleh-Oleh', IMAGE: 'store_oleh_oleh.jpg' },
    { NAMA: 'Batu Paradise Factory Outlet', IMAGE: 'store_batu_paradise.jpg' },
  ];
  app.querySelector('#view').innerHTML = `
    ${topbar()}
    <h2 class="section-title">🎁 Pusat Oleh-Oleh</h2>
    <div class="detail-wrap">
      ${stores.map((s, idx) => {
        const name = field(s, ['nama', 'name', 'title'], `Store ${idx + 1}`);
        const image = field(s, ['image', 'foto'], '');
        const desc = field(s, ['deskripsi', 'description'], '');
        return `
          <div class="store-card">
            <img src="${img(image)}" alt="${name}" onerror="this.style.display='none'">
            <div class="store-overlay">
              <div class="store-name">${name}</div>
              <button class="btn-gold solid" onclick="openStore('OLEH_OLEH', ${idx})">BUKA</button>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}

/* ---------------------------------------------------------
   RENDER: CAFE (listing + detail via PCP_BISTRO / ZERO_SIX)
--------------------------------------------------------- */
function renderCafe() {
  const cafes = [
    { key: 'PCP_BISTRO', name: 'PCP Cafe Bistro', image: 'cafe_pcp.jpg' },
    { key: 'ZERO_SIX', name: 'Zero Six Sky Lounge', image: 'cafe_zero.jpg' },
  ];
  app.querySelector('#view').innerHTML = `
    ${topbar()}
    <h2 class="section-title">☕ Cafe</h2>
    <div class="detail-wrap">
      ${cafes.map(c => `
        <div class="store-card">
          <img src="${img(c.image)}" alt="${c.name}" onerror="this.style.display='none'">
          <div class="store-overlay">
            <div class="store-name">${c.name}</div>
            <button class="btn-gold solid" onclick="openCafeDetail('${c.key}')">BUKA</button>
          </div>
        </div>`).join('')}
    </div>
  `;
}

function openCafeDetail(key) {
  window.__cafeKey = key;
  navigate('cafe-detail');
}

function renderCafeDetail() {
  const key = window.__cafeKey;
  const rows = DATA[key] || [];
  const c = rows[0] || {};
  const cfg = CAFE_CONFIG[key] || {};
  const name = field(c, ['nama', 'name', 'title'], cfg.name);
  const image = field(c, ['image', 'foto'], cfg.image);
  const desc = field(c, ['deskripsi', 'description'], 'Deskripsi cafe belum diisi di Spreadsheet.');

  app.querySelector('#view').innerHTML = `
    ${topbar()}
    <div class="detail-wrap">
      <div class="detail-cover"><img src="${img(image)}" alt="${name}" onerror="this.parentElement.style.display='none'"></div>
      <h2 class="detail-title">${name}</h2>
      <p class="detail-desc">${desc}</p>
      ${cfg.menuUrl ? `<button class="btn-gold" onclick="window.open('${cfg.menuUrl}','_blank')">🍽️ &nbsp; MENU</button>` : ''}
      <button class="btn-gold" onclick="window.open('${cfg.mapsUrl}','_blank')">📍 &nbsp; LOKASI</button>
      <button class="btn-gold solid" onclick="window.open('${waLink(cfg.waMessage)}','_blank')">💬 &nbsp; RESERVASI</button>
    </div>
  `;
}

/* ---------------------------------------------------------
   RENDER: TIKET WISATA
--------------------------------------------------------- */
function renderTiket() {
  const t = (DATA.TIKET_WISATA && DATA.TIKET_WISATA[0]) || {};
  const title = field(t, ['title', 'judul'], 'Info Tiket Wisata');
  const image = field(t, ['image', 'foto'], 'tiket.jpg');
  const desc = field(t, ['deskripsi', 'description'], 'Informasi tiket wisata akan segera tersedia.');

  app.querySelector('#view').innerHTML = `
    ${topbar()}
    <h2 class="section-title">🎟️ Tiket Wisata</h2>
    <div class="detail-wrap">
      <div class="detail-cover portrait"><img src="${img(image)}" alt="${title}" onerror="this.parentElement.style.display='none'"></div>
      <h2 class="detail-title">${title}</h2>
      <p class="detail-desc" style="text-align:center;">${desc}</p>
      <button class="btn-gold solid" onclick="window.open('${waLink('Hai, mau tanya tiket wisata')}','_blank')">💬 &nbsp; TANYA TIKET WISATA</button>
    </div>
  `;
}

// generic "openStore" digunakan untuk oleh-oleh (belum ada halaman detail per-toko
// spesifik di spreadsheet -> tampilkan info dasar dari sheet OLEH_OLEH)
function openStore(sheetKey, idx) {
  const rows = DATA[sheetKey] || [];
  const s = rows[idx] || {};
  const name = field(s, ['nama', 'name', 'title'], 'Toko');
  const image = field(s, ['image', 'foto'], '');
  const desc = field(s, ['deskripsi', 'description'], 'Deskripsi toko belum diisi di Spreadsheet.');
  const mapsUrl = OLEH_OLEH_LOCATIONS[name.toLowerCase().trim()] || field(s, ['lokasi_url', 'maps'], '');

  window.__storeDetail = { name, image, desc, mapsUrl };
  navigate('store-detail');
}

function renderStoreDetail() {
  const s = window.__storeDetail || {};
  app.querySelector('#view').innerHTML = `
    ${topbar()}
    <div class="detail-wrap">
      <div class="detail-cover"><img src="${img(s.image)}" alt="${s.name}" onerror="this.parentElement.style.display='none'"></div>
      <h2 class="detail-title">${s.name}</h2>
      <p class="detail-desc">${s.desc}</p>
      ${s.mapsUrl ? `<button class="btn-gold" onclick="window.open('${s.mapsUrl}','_blank')">📍 &nbsp; LOKASI</button>` : ''}
      <button class="btn-gold solid" onclick="window.open('${waLink('Hai, mau tanya oleh-oleh')}','_blank')">💬 &nbsp; HUBUNGI</button>
    </div>
  `;
}

/* ---------------------------------------------------------
   MASTER RENDER
--------------------------------------------------------- */
const ROUTES = {
  'home': { fn: renderHome, nav: 'home' },
  'hotel': { fn: renderHotel, nav: 'hotel' },
  'room-detail': { fn: renderRoomDetail, nav: 'hotel' },
  'oleh-oleh': { fn: renderOlehOleh, nav: 'oleh-oleh' },
  'store-detail': { fn: renderStoreDetail, nav: 'oleh-oleh' },
  'cafe': { fn: renderCafe, nav: 'cafe' },
  'cafe-detail': { fn: renderCafeDetail, nav: 'cafe' },
  'tiket': { fn: renderTiket, nav: 'tiket' },
};

function render(route) {
  const r = ROUTES[route] || ROUTES['home'];
  r.fn();
  const nav = document.getElementById('bottomNavSlot');
  nav.innerHTML = bottomNav(r.nav);
}

/* ---------------------------------------------------------
   EXIT BUTTON — kabur terus, tidak pernah bisa diklik
--------------------------------------------------------- */
function setupExitButton() {
  const btn = document.getElementById('exitBtn');
  const DANGER_RADIUS = 110; // px, jarak minimal sebelum tombol kabur

  function randomPos() {
    const maxX = window.innerWidth - btn.offsetWidth - 16;
    const maxY = window.innerHeight - btn.offsetHeight - 16;
    return {
      x: Math.max(8, Math.random() * maxX),
      y: Math.max(8, Math.random() * maxY),
    };
  }

  function moveTo(x, y) {
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
  }

  function maybeFlee(clientX, clientY) {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    if (dist < DANGER_RADIUS) {
      const pos = randomPos();
      moveTo(pos.x, pos.y);
    }
  }

  document.addEventListener('mousemove', e => maybeFlee(e.clientX, e.clientY));
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if (t) maybeFlee(t.clientX, t.clientY);
  }, { passive: true });

  // Kalau berhasil "diklik" (jarang terjadi, misal touch cepat) -> tetap kabur, tidak melakukan apa-apa
  btn.addEventListener('click', e => {
    e.preventDefault();
    const pos = randomPos();
    moveTo(pos.x, pos.y);
  });

  // posisi awal
  const start = randomPos();
  moveTo(start.x, start.y);
}

/* ---------------------------------------------------------
   STARFIELD
--------------------------------------------------------- */
function setupStarfield() {
  const field = document.getElementById('starfield');
  const count = 26;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 3.5}s`;
    field.appendChild(s);
  }
}

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */
async function init() {
  setupStarfield();
  setupExitButton();
  try {
    const res = await fetch(API_URL);
    DATA = await res.json();
  } catch (err) {
    console.error('Gagal mengambil data dari Apps Script:', err);
    DATA = {};
  } finally {
    document.getElementById('loader').style.display = 'none';
    render('home');
  }
}

document.addEventListener('DOMContentLoaded', init);
