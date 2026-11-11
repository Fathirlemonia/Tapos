const API_BASE = 'http://localhost:3000/api';

const fallback = {
  salesToday: 2450000,
  transactionCount: 86,
  avgOrder: 28488,
  itemsSold: 142,
  transactions: [
    { id: 'TRX-0086', time: '20:42', cashier: 'Andi', method: 'QRIS', total: 56000, status: 'Selesai' },
    { id: 'TRX-0085', time: '20:35', cashier: 'Rina', method: 'Tunai', total: 42000, status: 'Selesai' },
    { id: 'TRX-0084', time: '20:21', cashier: 'Andi', method: 'QRIS', total: 78000, status: 'Selesai' }
  ],
  activities: [
    { title: 'Transaksi TRX-0086 selesai', detail: 'Pembayaran QRIS berhasil masuk ke sistem.', time: '20:42' },
    { title: 'Stok Susu UHT menipis', detail: 'Persediaan berada di bawah minimum operasional.', time: '19:30' }
  ]
};

const rupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
const statusClass = (status) => (status === 'Selesai' ? 'success' : 'warning');

async function loadOwnerData() {
  const token = localStorage.getItem('taposToken');
  try {
    if (!token) {
      renderOwnerDashboard(fallback);
      return;
    }

    const [summaryRes, txRes, activityRes] = await Promise.all([
      fetch(`${API_BASE}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/activity`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (!summaryRes.ok || !txRes.ok || !activityRes.ok) {
      throw new Error('Owner data unavailable');
    }

    const summary = await summaryRes.json();
    const transactions = await txRes.json();
    const activities = await activityRes.json();

    renderOwnerDashboard({
      salesToday: summary.salesToday,
      transactionCount: summary.transactionCount,
      avgOrder: summary.avgOrder,
      itemsSold: summary.itemsSold,
      transactions: transactions.transactions,
      activities: activities.activities
    });
  } catch (error) {
    renderOwnerDashboard(fallback);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'Mode demo aktif: data fallback ditampilkan.';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }
  }
}

function renderOwnerDashboard(data) {
  const salesToday = document.getElementById('salesToday');
  const transactionCount = document.getElementById('transactionCount');
  const averageOrder = document.getElementById('averageOrder');
  const itemsSold = document.getElementById('itemsSold');
  const transactionsTable = document.getElementById('transactionsTable');
  const activityList = document.getElementById('activityList');

  if (salesToday) salesToday.textContent = rupiah(data.salesToday);
  if (transactionCount) transactionCount.textContent = data.transactionCount;
  if (averageOrder) averageOrder.textContent = rupiah(data.avgOrder);
  if (itemsSold) itemsSold.textContent = data.itemsSold;

  if (transactionsTable) {
    transactionsTable.innerHTML = (data.transactions || []).slice(0, 5).map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.time}</td>
        <td>${item.cashier}</td>
        <td>${rupiah(item.total)}</td>
        <td><span class="status-badge ${statusClass(item.status)}">${item.status}</span></td>
      </tr>
    `).join('');
  }

  if (activityList) {
    activityList.innerHTML = (data.activities || []).map((item) => `
      <div class="activity-item">
        <span class="activity-dot"></span>
        <div>
          <strong>${item.title}</strong>
          <small>${item.detail}</small>
        </div>
        <small>${item.time}</small>
      </div>
    `).join('');
  }
}

function logoutOwner() {
  localStorage.removeItem('taposToken');
  localStorage.removeItem('taposRole');
  localStorage.setItem('taposIsAuthenticated', 'false');
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Anda keluar dari sesi owner.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }
  setTimeout(() => window.location.href = '../index.html', 200);
}

document.getElementById('logoutBtn')?.addEventListener('click', logoutOwner);
loadOwnerData();
