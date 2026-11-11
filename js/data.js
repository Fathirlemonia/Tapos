const defaultData = {
  transactions: [
    {id:"TRX-0086",time:"20:42",cashier:"Andi",method:"QRIS",total:56000,status:"Selesai"},
    {id:"TRX-0085",time:"20:35",cashier:"Rina",method:"Tunai",total:42000,status:"Selesai"},
    {id:"TRX-0084",time:"20:21",cashier:"Andi",method:"QRIS",total:78000,status:"Selesai"},
    {id:"TRX-0083",time:"20:10",cashier:"Rina",method:"Tunai",total:35000,status:"Diproses"},
    {id:"TRX-0082",time:"19:58",cashier:"Andi",method:"QRIS",total:64000,status:"Selesai"}
  ],
  products: [
    {name:"Kopi Susu Meteora",category:"Minuman",price:20000,sold:48,stock:18},
    {name:"Es Kopi Aren",category:"Minuman",price:20000,sold:36,stock:22},
    {name:"Mie Goreng",category:"Makanan",price:20000,sold:29,stock:7},
    {name:"Teh Tarik",category:"Minuman",price:15000,sold:22,stock:5},
    {name:"Roti Bakar",category:"Makanan",price:18000,sold:17,stock:12}
  ],
  inventory: [
    {name:"Biji kopi",qty:4,unit:"kg",min:3},{name:"Susu UHT",qty:2,unit:"liter",min:5},
    {name:"Gula aren",qty:1,unit:"kg",min:2},{name:"Mie instan",qty:24,unit:"pcs",min:10},
    {name:"Gelas plastik",qty:120,unit:"pcs",min:50}
  ],
  staff: [
    {name:"Andi Pratama",role:"Kasir",shift:"Pagi",status:"Aktif"},
    {name:"Rina Amelia",role:"Kasir",shift:"Malam",status:"Aktif"},
    {name:"Dimas Saputra",role:"Karyawan",shift:"Malam",status:"Aktif"}
  ],
  activities: [
    {title:"Transaksi TRX-0086 selesai",detail:"Andi mencatat transaksi melalui QRIS.",time:"20:42"},
    {title:"Stok Susu UHT menipis",detail:"Persediaan berada di bawah batas minimum.",time:"19:30"},
    {title:"Kasir Rina memulai shift",detail:"Sesi kerja dimulai.",time:"16:00"}
  ]
};

function loadDashboardData(){
  try {
    const saved = localStorage.getItem('taposOwnerDashboardData');
    if (!saved) return defaultData;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return defaultData;
    if (Array.isArray(parsed.staff)) {
      parsed.staff = parsed.staff.map((staff) => ({
        ...staff,
        role: staff.role === 'Kasir' ? 'Kasir' : 'Karyawan'
      }));
    }
    return parsed;
  } catch (error) {
    return defaultData;
  }
}

window.TAPOS_DATA = loadDashboardData();
window.persistDashboardData = function(){
  try {
    localStorage.setItem('taposOwnerDashboardData', JSON.stringify(window.TAPOS_DATA));
  } catch (error) {
    console.warn('Storage tidak tersedia:', error);
  }
};