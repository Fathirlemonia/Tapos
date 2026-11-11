const pageInfo={
 overview:['Ringkasan usaha','Pantau performa Warkop Meteora dalam satu tampilan.'],
 transactions:['Transaksi','Pantau riwayat transaksi yang tercatat.'],
 products:['Menu & produk','Kelola daftar menu dan informasi produk.'],
 inventory:['Persediaan stok','Pantau ketersediaan bahan dan kebutuhan operasional.'],
 staff:['Karyawan','Lihat data staf dan pembagian shift.'],
 reports:['Laporan','Tinjau ringkasan performa usaha.'],
 activity:['Log aktivitas','Pantau catatan aktivitas pada sistem.'],
 integrations:['Integrasi & API','Lihat arsitektur layanan yang mendukung TAPOS.'],
 settings:['Pengaturan','Atur preferensi dashboard TAPOS.']
};
const toastEl=document.getElementById('toast');
const integrationList = [
  {name:'Auth Service', route:'/api/v1/auth', status:'Aktif', detail:'Token JWT untuk owner, cashier, dan supervisor.'},
  {name:'POS Gateway', route:'/api/v1/pos', status:'Aktif', detail:'Menerima transaksi dari tablet kasir dan update stok.'},
  {name:'Inventory Sync', route:'/api/v1/inventory', status:'Standby', detail:'Sinkronisasi stok antar cabang dan pusat.'},
  {name:'Analytics Core', route:'/api/v1/analytics', status:'Aktif', detail:'Menghitung KPI, omzet, dan laporan performa.'}
];
const state={
  user: localStorage.getItem('taposUser') || 'Owner',
  isAuthenticated: localStorage.getItem('taposIsAuthenticated') === 'true'
};
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2300)}
function saveState(){
  if (window.persistDashboardData) window.persistDashboardData();
}
function showAuth(){
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.add('active');
}
function hideAuth(){
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('active');
}
function updateOwnerUI(){
  const avatar = document.getElementById('roleAvatar');
  const title = document.getElementById('roleTitle');
  const subtitle = document.getElementById('roleSubtitle');
  const status = document.getElementById('connectionStatus');
  if (avatar) avatar.textContent = 'PM';
  if (title) title.textContent = 'Pemilik';
  if (subtitle) subtitle.textContent = 'Administrator';
  if (status) status.innerHTML = navigator.onLine ? '● <span>Online</span>' : '● <span>Offline</span>';
}
function navigate(page){
  const pageEl = document.getElementById('page-'+page);
  if (!pageEl) return;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  pageEl.classList.add('active');
  document.querySelectorAll('.nav-link[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  if (pageInfo[page]) {
    document.getElementById('pageTitle').textContent=pageInfo[page][0];
    document.getElementById('pageDescription').textContent=pageInfo[page][1];
    document.getElementById('pageCrumb').textContent=pageInfo[page][0];
  }
  document.getElementById('sidebar').classList.remove('open');
}
function renderIntegrations(){
  const grid = document.getElementById('integrationGrid');
  if (!grid) return;
  grid.innerHTML = integrationList.map(item => `
    <article class="arch-card">
      <div class="arch-head"><span class="arch-badge ${item.status === 'Aktif' ? 'success' : 'warning'}">${item.status}</span></div>
      <h3>${item.name}</h3>
      <p>${item.detail}</p>
      <small>${item.route}</small>
    </article>
  `).join('');
}
document.querySelectorAll('.nav-link[data-page]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.goto)));
document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('todayLabel').textContent=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
document.getElementById('transactionSearch').addEventListener('input',renderTransactions);
document.getElementById('statusFilter').addEventListener('change',renderTransactions);
const productDialog = document.getElementById('productDialog');
const productForm = document.getElementById('productForm');
document.getElementById('addProduct').addEventListener('click',()=>{
  productForm.reset();
  productDialog.showModal();
  document.getElementById('productName').focus();
});
document.getElementById('closeProductDialog').addEventListener('click',()=>productDialog.close());
document.getElementById('cancelAddProduct').addEventListener('click',()=>productDialog.close());
productForm.addEventListener('submit',(event)=>{
  event.preventDefault();
  const name = document.getElementById('productName').value.trim();
  const price = document.getElementById('productPrice').valueAsNumber;
  const sold = document.getElementById('productSold').valueAsNumber;
  if (!name || !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(sold) || sold < 0) {
    toast('Isi nama, harga, dan jumlah terjual dengan benar.');
    return;
  }
  if (TAPOS_DATA.products.some((product)=>product.name.toLowerCase()===name.toLowerCase())) {
    toast('Nama produk sudah terdaftar.');
    return;
  }
  TAPOS_DATA.products.push({
    name,
    category: document.getElementById('productCategory').value,
    price,
    sold,
    stock: 0
  });
  saveState();
  renderAll();
  productDialog.close();
  toast('Produk berhasil ditambahkan.');
});
const inventoryDialog = document.getElementById('inventoryDialog');
const inventoryForm = document.getElementById('inventoryForm');
const inventoryName = document.getElementById('inventoryName');
const inventoryQuantity = document.getElementById('inventoryQuantity');
const inventoryMinimum = document.getElementById('inventoryMinimum');
const inventoryStatusPreview = document.getElementById('inventoryStatusPreview');

function inventoryStatus(quantity, minimum) {
  if (quantity <= 0) return 'Habis';
  if (quantity < minimum) return 'Stok rendah';
  return 'Aman';
}

function updateInventoryStatusPreview() {
  const quantity = inventoryQuantity.valueAsNumber;
  const minimum = inventoryMinimum.valueAsNumber;
  const status = inventoryStatus(Number.isFinite(quantity) ? quantity : 0, Number.isFinite(minimum) ? minimum : 0);
  inventoryStatusPreview.textContent = status;
  inventoryStatusPreview.className = `status-pill ${status === 'Aman' ? 'success' : 'warning'}`;
}

document.getElementById('stockUpdate').addEventListener('click',()=>{
  inventoryForm.reset();
  updateInventoryStatusPreview();
  inventoryDialog.showModal();
  inventoryName.focus();
});
document.getElementById('closeInventoryDialog').addEventListener('click',()=>inventoryDialog.close());
document.getElementById('cancelInventory').addEventListener('click',()=>inventoryDialog.close());
inventoryQuantity.addEventListener('input',updateInventoryStatusPreview);
inventoryMinimum.addEventListener('input',updateInventoryStatusPreview);
inventoryForm.addEventListener('submit',(event)=>{
  event.preventDefault();
  const name = inventoryName.value.trim();
  const quantity = inventoryQuantity.valueAsNumber;
  const minimum = inventoryMinimum.valueAsNumber;
  const unit = document.getElementById('inventoryUnit').value.trim();
  if (!name || !unit || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minimum) || minimum < 0) {
    toast('Isi nama, stok saat ini, minimum, dan satuan dengan benar.');
    return;
  }

  const existing = TAPOS_DATA.inventory.find((item)=>item.name.toLowerCase()===name.toLowerCase());
  if (existing) {
    existing.qty = quantity;
    existing.min = minimum;
    existing.unit = unit;
  } else {
    TAPOS_DATA.inventory.push({name, qty:quantity, min:minimum, unit});
  }
  saveState();
  renderAll();
  inventoryDialog.close();
  toast(existing ? 'Data stok berhasil diperbarui.' : 'Bahan baru berhasil ditambahkan.');
});
const staffDialog = document.getElementById('staffDialog');
const staffForm = document.getElementById('staffForm');
document.getElementById('addStaff').addEventListener('click',()=>{
  staffForm.reset();
  staffDialog.showModal();
  document.getElementById('staffName').focus();
});
document.getElementById('closeStaffDialog').addEventListener('click',()=>staffDialog.close());
document.getElementById('cancelAddStaff').addEventListener('click',()=>staffDialog.close());
staffForm.addEventListener('submit',(event)=>{
  event.preventDefault();
  const name = document.getElementById('staffName').value.trim();
  if (!name) {
    toast('Nama karyawan wajib diisi.');
    return;
  }
  if (TAPOS_DATA.staff.some((staff)=>staff.name.toLowerCase()===name.toLowerCase())) {
    toast('Nama karyawan sudah terdaftar.');
    return;
  }
  TAPOS_DATA.staff.push({
    name,
    role: document.getElementById('staffRole').value,
    shift: document.getElementById('staffShift').value,
    status: 'Aktif'
  });
  saveState();
  renderAll();
  staffDialog.close();
  toast('Data karyawan berhasil ditambahkan.');
});
document.getElementById('clearActivity').addEventListener('click',()=>{if(confirm('Bersihkan seluruh log aktivitas?')){TAPOS_DATA.activities=[];saveState();renderAll();toast('Log aktivitas dibersihkan.')} });
document.getElementById('exportReport').addEventListener('click',()=>{const csv='Indikator,Nilai\nPenjualan kotor,14820000\nDiskon,320000\nPenjualan bersih,14500000\nTotal transaksi,512';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='laporan-tapos.csv';a.click();URL.revokeObjectURL(a.href);toast('Laporan CSV diunduh.')});
document.getElementById('resetDashboard').addEventListener('click',()=>{if(confirm('Reset data dashboard ke kondisi awal?')){localStorage.removeItem('taposOwnerDashboardData');location.reload()}});
document.getElementById('loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!username || !password) {
    toast('Username dan password wajib diisi.');
    return;
  }
  if (username.toLowerCase() !== 'owner@tapos' || password !== 'admin123') {
    toast('Kredensial tidak valid.');
    return;
  }
  state.user = username;
  state.isAuthenticated = true;
  localStorage.setItem('taposUser', username);
  localStorage.setItem('taposIsAuthenticated', 'true');
  hideAuth();
  updateOwnerUI();
  navigate('overview');
  toast(`Selamat datang, ${username}.`);
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  state.isAuthenticated = false;
  localStorage.setItem('taposIsAuthenticated', 'false');
  showAuth();
  toast('Anda telah keluar.');
});
if (!state.isAuthenticated) {
  showAuth();
}
updateOwnerUI();
window.addEventListener('online', updateOwnerUI);
window.addEventListener('offline', updateOwnerUI);
renderIntegrations();
renderAll();