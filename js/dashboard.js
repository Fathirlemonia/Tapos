const rupiah = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const statusClass = s => s === 'Selesai' || s === 'Aktif' ? 'success' : s === 'Diproses' ? 'warning' : 'neutral';
function renderRecent(){
 const rows=TAPOS_DATA.transactions.slice(0,4);
 document.getElementById('recentTransactions').innerHTML=rows.map(t=>`<tr><td><b>${t.id}</b></td><td>${t.time}</td><td>${t.cashier}</td><td>${rupiah(t.total)}</td><td><span class="status-pill ${statusClass(t.status)}">${t.status}</span></td></tr>`).join('');
}
function renderTransactions(){
 const q=(document.getElementById('transactionSearch')?.value||'').toLowerCase();
 const filter=document.getElementById('statusFilter')?.value||'all';
 const rows=TAPOS_DATA.transactions.filter(t=>(t.id.toLowerCase().includes(q)||t.cashier.toLowerCase().includes(q))&&(filter==='all'||t.status===filter));
 document.getElementById('allTransactions').innerHTML=rows.map(t=>`<tr><td><b>${t.id}</b></td><td>08 Nov 2026 · ${t.time}</td><td>${t.cashier}</td><td>${t.method}</td><td>${rupiah(t.total)}</td><td><span class="status-pill ${statusClass(t.status)}">${t.status}</span></td></tr>`).join('')||'<tr><td colspan="6">Tidak ada transaksi yang cocok.</td></tr>';
}
function renderProducts(){
 const tbody=document.getElementById('productRows');
 tbody.replaceChildren();
 TAPOS_DATA.products.forEach(product=>{
  const row=tbody.insertRow();
  const nameCell=row.insertCell();
  const name=document.createElement('b');
  name.textContent=product.name;
  nameCell.append(name);
  row.insertCell().textContent=product.category;
  row.insertCell().textContent=rupiah(product.price);
  row.insertCell().textContent=product.sold;
  const statusCell=row.insertCell();
  const badge=document.createElement('span');
  badge.className='status-pill success';
  badge.textContent='Tersedia';
  statusCell.append(badge);
 });
}
function renderInventory(){
 const tbody=document.getElementById('stockRows');
 tbody.replaceChildren();
 TAPOS_DATA.inventory.forEach(item=>{
  const row=tbody.insertRow();
  const nameCell=row.insertCell();
  const name=document.createElement('b');
  name.textContent=item.name;
  nameCell.append(name);
  row.insertCell().textContent=`${item.qty} ${item.unit}`;
  row.insertCell().textContent=`${item.min} ${item.unit}`;
  const statusCell=row.insertCell();
  const badge=document.createElement('span');
  const status=item.qty<=0?'Habis':item.qty<item.min?'Stok rendah':'Aman';
  badge.className=`status-pill ${status==='Aman'?'success':'warning'}`;
  badge.textContent=status;
  statusCell.append(badge);
 });
}
function renderStaff(){
 const tbody=document.getElementById('staffRows');
 tbody.replaceChildren();
 TAPOS_DATA.staff.forEach(staff=>{
  const row=tbody.insertRow();
  [staff.name,staff.role,staff.shift].forEach((value,index)=>{
   const cell=row.insertCell();
   if(index===0){const name=document.createElement('b');name.textContent=value;cell.append(name)}
   else cell.textContent=value;
  });
  const statusCell=row.insertCell();
  const badge=document.createElement('span');
  badge.className='status-pill success';
  badge.textContent=staff.status;
  statusCell.append(badge);
 });
}
function renderActivity(){document.getElementById('activityList').innerHTML=TAPOS_DATA.activities.map(a=>`<div class="activity-item"><span class="activity-dot"></span><div><b>${a.title}</b><p>${a.detail}</p></div><time>${a.time}</time></div>`).join('')||'<p class="muted">Belum ada aktivitas.</p>'}
function renderAll(){renderRecent();renderTransactions();renderProducts();renderInventory();renderStaff();renderActivity()}
window.renderAll=renderAll;