import React from 'react';
import { Icon } from '../components/ui';

export default function AdminDashboard() {
  // Lấy tên admin từ bộ nhớ cục bộ (localStorage), mặc định là "Quản trị viên" nếu chưa có
  const fullName = localStorage.getItem("fullName") || "Quản trị viên";

  // ─── DỮ LIỆU MOCK (GIÀN GIÁO UI) ──────────────────────────────────────────
  // TODO (Backend): Gọi API lấy thống kê tổng quan (vd: dashboardApi.getSummary) và thay thế mảng này
  const stats = [
    { label: "Tổng bệnh nhân", value: "1,245", icon: "👥", trend: "+12% so với tháng trước" },
    { label: "Tổng bác sĩ", value: "48", icon: "🩺", trend: "Trực hôm nay: 15" },
    { label: "Lượt khám hôm nay", value: "86", icon: "📋", trend: "Đã hoàn thành: 42" },
    { label: "Giao dịch Blockchain", value: "3,102", icon: "🔗", trend: "100% On-chain" },
  ];

  // TODO (Backend): Gọi API lấy danh sách log hoạt động/nhật ký mới nhất
  const recentActivities = [
    { time: "10:24", text: "BS. Nguyễn Thị Hoa vừa tạo hồ sơ mới cho BN005" },
    { time: "09:15", text: "Lễ tân đã thêm bệnh nhân mới: Trần Thị Bình" },
    { time: "08:30", text: "Ca trực sáng bắt đầu với 15 bác sĩ sẵn sàng" },
  ];
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 1. KHU VỰC TIÊU ĐỀ (HEADER) */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Xin chào, {fullName} 👋</h2>
        <p className="text-slate-500 text-sm mt-1">Tổng quan hoạt động bệnh viện hôm nay</p>
      </div>

      {/* 2. KHU VỰC THẺ THỐNG KÊ (STAT CARDS) */}
      {/* CSS Grid: Tự động chia 1 cột trên mobile, 2 cột trên tablet và 4 cột trên màn hình lớn */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-2xl">
                {stat.icon}
              </div>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
              {/* Badge hiển thị xu hướng (Trend/Ghi chú nhỏ) */}
              <p className="text-xs text-violet-600 font-semibold mt-2 bg-violet-50 inline-block px-2 py-1 rounded-md">
                {stat.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. KHU VỰC WIDGET BỔ SUNG (SYSTEM STATUS & TIMELINE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 3.1. Widget Trạng thái Hệ thống Blockchain (Chiếm 2/3 không gian lưới) */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
           <div className="flex items-center justify-between mb-6">
             <h3 className="font-bold text-slate-800 text-lg">Trạng thái Hệ thống Blockchain</h3>
             {/* Nút báo hiệu trạng thái mạng lưới (Mô phỏng đèn tín hiệu Web3) */}
             <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               Sepolia Testnet: Đang hoạt động
             </span>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">IPFS Node</p>
                <p className="font-semibold text-slate-700">Đã kết nối (Latency: 45ms)</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Smart Contracts</p>
                <p className="font-semibold text-slate-700 text-sm truncate">0x7a250d5630...88d (HealthRecord)</p>
              </div>
           </div>
        </div>

        {/* 3.2. Widget Hoạt động gần đây (Chiếm 1/3 không gian, hiển thị dạng Timeline dọc) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-800 text-lg mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex gap-3">
                {/* Trục dọc của Timeline */}
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400 mt-1"></div>
                  {/* Ẩn đường kẻ dọc nối tiếp ở phần tử cuối cùng của mảng */}
                  {i !== recentActivities.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1"></div>}
                </div>
                {/* Nội dung chi tiết của hoạt động */}
                <div>
                  <p className="text-xs font-semibold text-violet-600 mb-0.5">{act.time}</p>
                  <p className="text-sm text-slate-600">{act.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}