"use strict";

/* =====================================================
   PENGATURAN TOKO — GANTI BAGIAN INI DENGAN DATA ASLIMU
   ===================================================== */
const STORE = {
  name: "Churros jacko",
  wa: "6285815754148",          // nomor WhatsApp toko, format 62... (tanpa + dan tanpa 0 di depan)
  sheetUrl: "",                 // URL Google Apps Script (kosongkan kalau belum dipakai)
  promoCode: "CHURROS10",
  promoPercent: 10,
  shipping: 8000,               // ongkir
  freeShippingMin: 50000        // gratis ongkir kalau subtotal >= ini
};

const PAY = {
  qris:    { label: "QRIS", info: "Scan QRIS di bawah, lalu kirim bukti pembayaran lewat WhatsApp.", img: true },
  bank:    { label: "Transfer Bank", info: "BCA 1234567890 a.n. Churros jacko. Kirim bukti transfer lewat WhatsApp." },
  ewallet: { label: "E-Wallet", info: "DANA / OVO / GoPay: 0812-3456-7890 a.n. Churros jacko. Kirim bukti bayar lewat WhatsApp." },
  cod:     { label: "Bayar di tempat (COD)", info: "Bayar tunai ke kurir saat pesanan sampai. Siapkan uang pas ya." }
};
/* ===================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rupiah = n => "Rp" + Math.round(n).toLocaleString("id-ID");

/* ===== Menu mobile ===== */
const burger = $("#burger");
const menu = $("#menu");
burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
menu.addEventListener("click", e => {
  if (e.target.tagName === "A") {
    menu.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }
});

/* ===== Menu aktif saat scroll ===== */
const links = $$(".menu a");
const spy = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
["home", "menu-churros", "about", "contact"].forEach(id => {
  const el = document.getElementById(id);
  if (el) spy.observe(el);
});

/* ===== Filter rasa ===== */
$$(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    $$(".card").forEach(c => c.classList.toggle("hide", f !== "all" && c.dataset.cat !== f));
  });
});

/* ===== Elemen keranjang ===== */
const drawer = $("#drawer");
const overlay = $("#overlay");
const list = $("#cartList");
const empty = $("#cartEmpty");
const area = $("#checkoutArea");
const count = $("#cartCount");
const toast = $("#toast");
const checkoutBtn = $("#checkout");
let toastTimer;
let promoApplied = false;
let cart = [];
try { cart = JSON.parse(localStorage.getItem("churros-jacko-cart")) || []; } catch (e) { cart = []; }

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ===== Hitung total ===== */
function calc() {
  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const discount = promoApplied ? subtotal * STORE.promoPercent / 100 : 0;
  const shipping = subtotal === 0 || subtotal >= STORE.freeShippingMin ? 0 : STORE.shipping;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

function render() {
  list.innerHTML = "";
  cart.forEach(item => {
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <strong>${item.name}</strong>
      <span>${rupiah(item.price * item.qty)}</span>
      <div class="qty">
        <button data-act="dec" data-id="${item.id}" aria-label="Kurangi ${item.name}">−</button>
        <span>${item.qty}</span>
        <button data-act="inc" data-id="${item.id}" aria-label="Tambah ${item.name}">+</button>
        <button class="remove" data-act="del" data-id="${item.id}">Hapus</button>
      </div>`;
    list.appendChild(li);
  });

  const t = calc();
  count.textContent = cart.reduce((s, i) => s + i.qty, 0);
  $("#sumSub").textContent = rupiah(t.subtotal);
  $("#sumDisc").textContent = "-" + rupiah(t.discount);
  $("#sumShip").textContent = t.shipping === 0 && t.subtotal > 0 ? "Gratis" : rupiah(t.shipping);
  $("#cartTotal").textContent = rupiah(t.total);

  empty.hidden = cart.length > 0;
  area.hidden = cart.length === 0;
  checkoutBtn.disabled = cart.length === 0;

  try { localStorage.setItem("churros-jacko-cart", JSON.stringify(cart)); } catch (e) { /* abaikan */ }
}

function addToCart({ id, name, price }) {
  const found = cart.find(i => i.id === id);
  found ? found.qty++ : cart.push({ id, name, price, qty: 1 });
  render();
  count.classList.add("pop");
  setTimeout(() => count.classList.remove("pop"), 250);
  showToast(`${name} masuk keranjang`);
}

$$(".btn-add").forEach(btn => {
  btn.addEventListener("click", () => {
    const c = btn.closest(".card");
    addToCart({ id: c.dataset.id, name: c.dataset.name, price: Number(c.dataset.price) });
  });
});

list.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const item = cart.find(i => i.id === b.dataset.id);
  if (!item) return;
  if (b.dataset.act === "inc") item.qty++;
  if (b.dataset.act === "dec") item.qty--;
  if (b.dataset.act === "del" || item.qty <= 0) cart = cart.filter(i => i !== item);
  render();
});

/* ===== Buka / tutup keranjang ===== */
function openCart() {
  overlay.hidden = false;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  $("#cartClose").focus();
}
function closeCart() {
  overlay.hidden = true;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}
$("#cartOpen").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeCart(); });

/* ===== Metode pembayaran ===== */
function updatePay() {
  const key = $('input[name="bayar"]:checked').value;
  $("#payText").textContent = PAY[key].info;
  $("#qrisImg").hidden = !PAY[key].img;
}
$("#payOptions").addEventListener("change", updatePay);
$("#qrisImg").addEventListener("error", e => { e.target.hidden = true; });
updatePay();

/* ===== Kode promo ===== */
const promoMsg = $("#promoMsg");
$("#promoBtn").addEventListener("click", () => {
  const code = $("#promo").value.trim().toUpperCase();
  if (!code) return;
  if (code === STORE.promoCode) {
    promoApplied = true;
    promoMsg.textContent = `Kode dipakai: diskon ${STORE.promoPercent}%`;
    promoMsg.className = "promo-msg ok";
  } else {
    promoApplied = false;
    promoMsg.textContent = "Kode tidak valid";
    promoMsg.className = "promo-msg bad";
  }
  render();
});

/* ===== Checkout: simpan ke Sheets lalu buka WhatsApp ===== */
checkoutBtn.addEventListener("click", () => {
  if (!cart.length) return;

  const fields = { nama: $("#nama"), hp: $("#hp"), alamat: $("#alamat") };
  Object.values(fields).forEach(f => f.classList.remove("error"));

  const nama = fields.nama.value.trim();
  const hp = fields.hp.value.trim();
  const alamat = fields.alamat.value.trim();
  const catatan = $("#catatan").value.trim();

  let valid = true;
  if (nama.length < 2) { fields.nama.classList.add("error"); valid = false; }
  if (hp.replace(/\D/g, "").length < 9) { fields.hp.classList.add("error"); valid = false; }
  if (alamat.length < 8) { fields.alamat.classList.add("error"); valid = false; }
  if (!valid) { showToast("Lengkapi nama, nomor HP, dan alamat dulu ya"); return; }

  const key = $('input[name="bayar"]:checked').value;
  const t = calc();
  const orderId = "BC" + Date.now().toString().slice(-7);
  const items = cart.map(i => `- ${i.name} x${i.qty} (${rupiah(i.price * i.qty)})`).join("\n");

  const text =
`Halo ${STORE.name}, saya mau pesan.

ID Pesanan: ${orderId}
Nama: ${nama}
No. HP: ${hp}
Alamat: ${alamat}${catatan ? "\nCatatan: " + catatan : ""}

Pesanan:
${items}

Subtotal: ${rupiah(t.subtotal)}
Diskon: -${rupiah(t.discount)}
Ongkir: ${t.shipping === 0 ? "Gratis" : rupiah(t.shipping)}
TOTAL: ${rupiah(t.total)}

Metode bayar: ${PAY[key].label}
${key === "cod" ? "Saya bayar saat pesanan sampai." : "Bukti pembayaran saya kirim setelah ini."}`;

  // 1. Simpan ke Google Sheets (jika sheetUrl diisi)
  if (STORE.sheetUrl) {
    fetch(STORE.sheetUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        orderId, nama, hp, alamat, catatan,
        pesanan: cart.map(i => `${i.name} x${i.qty}`).join(", "),
        subtotal: t.subtotal, diskon: t.discount, ongkir: t.shipping,
        total: t.total, metode: PAY[key].label
      })
    }).catch(() => {});
  }

  // 2. Buka WhatsApp
  window.open(`https://wa.me/${STORE.wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener");

  // 3. Reset keranjang
  cart = [];
  promoApplied = false;
  $("#promo").value = "";
  promoMsg.textContent = "";
  render();
  closeCart();
  showToast("Pesanan dibuat! Lanjutkan pembayaran di WhatsApp");
});

/* ===== Ulasan pelanggan ===== */
const reviews = [
  { q: "“Crispy outside, fluffy inside!”", by: "Nadia, Jakarta" },
  { q: "“Matcha-nya wangi, nggak terlalu manis.”", by: "Rizky, Bandung" },
  { q: "“Sampai rumah masih hangat, packaging-nya lucu banget.”", by: "Salsa, Surabaya" }
];
const quote = $("#quote");
const by = $("#quoteBy");
const dots = $("#dots");
let idx = 0, timer;

reviews.forEach((_, i) => {
  const d = document.createElement("button");
  d.setAttribute("aria-label", `Ulasan ${i + 1}`);
  d.addEventListener("click", () => { show(i); restart(); });
  dots.appendChild(d);
});

function show(i) {
  idx = i;
  quote.style.opacity = 0;
  setTimeout(() => {
    quote.textContent = reviews[i].q;
    by.textContent = reviews[i].by;
    quote.style.opacity = 1;
  }, 250);
  $$("button", dots).forEach((d, n) => d.classList.toggle("on", n === i));
}
function restart() {
  clearInterval(timer);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    timer = setInterval(() => show((idx + 1) % reviews.length), 5000);
  }
}
show(0);
restart();

/* ===== Animasi muncul saat scroll ===== */
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  });
}, { threshold: .15 });
$$(".section, .promo").forEach(el => { el.classList.add("reveal"); io.observe(el); });

render();