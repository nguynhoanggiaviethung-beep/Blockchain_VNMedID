import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"
const BASE_URL = "http://localhost:5000/api/v1"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const fullName = localStorage.getItem("fullName") || "Quản trị viên"
  const token = localStorage.getItem("token")
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${BASE_URL}/admin/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setSummary(res.data.data))
    .catch(err => console.error("Lỗi lấy summary:", err))
    .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { localStorage.clear(); navigate("/") }

  const stats = [
    {
      icon: "👥",
      label: "Tổng bệnh nhân",
      value: loading ? "..." : (summary?.totalPatients ?? 0),
      trend: "Đã đăng ký trong hệ thống",
      color: "#3B82F6"
    },
    {
      icon: "🩺",
      label: "Tổng bác sĩ",
      value: loading ? "..." : (summary?.totalDoctors ?? 0),
      trend: "Đang hoạt động",
      color: "#10B981"
    },
    {
      icon: "📋",
      label: "Lượt khám hôm nay",
      value: loading ? "..." : (summary?.totalVisitsToday ?? 0),
      trend: `Đã hoàn thành: ${summary?.completedVisitsToday ?? 0}`,
      color: "#F59E0B"
    },
    {
      icon: "🔗",
      label: "Giao dịch Blockchain",
      value: "3,102",
      trend: "100% On-chain",
      color: "#8B5CF6"
    },
  ]

  const recentActivities = summary?.recentActivities?.length
    ? summary.recentActivities
    : [
        { time: "10:24", text: "BS. Nguyễn Thị Hoa vừa tạo hồ sơ mới cho BN005" },
        { time: "09:15", text: "Lễ tân đã thêm bệnh nhân mới: Trần Thị Bình" },
        { time: "08:30", text: "Ca trực sáng bắt đầu với 15 bác sĩ sẵn sàng" },
      ]

  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Navbar */}
      <div style={{ background: PRIMARY, color: "#fff", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 12px rgba(10,45,110,0.18)" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🏥 VNmedID — Quản trị viên</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14 }}>🔑 Chào, {fullName}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ padding: "32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: PRIMARY, margin: 0 }}>Xin chào, {fullName} 👋</h2>
          <p style={{ color: GRAY_TEXT, marginTop: 4, fontSize: 14 }}>Tổng quan hoạt động bệnh viện hôm nay</p>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderTop: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: PRIMARY }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 4 }}>{stat.label}</div>
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: stat.color, background: `${stat.color}15`, display: "inline-block", padding: "3px 10px", borderRadius: 20 }}>
                {stat.trend}
              </div>
            </div>
          ))}
        </div>

        {/* Widgets */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

          {/* Blockchain Status */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: PRIMARY, margin: 0, fontSize: 16 }}>Trạng thái Hệ thống Blockchain</h3>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#10B981", background: "#D1FAE5", padding: "4px 12px", borderRadius: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 2s infinite" }}></span>
                Sepolia Testnet: Đang hoạt động
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "IPFS Node", value: "Đã kết nối (Latency: 45ms)" },
                { label: "Smart Contracts", value: "0x7a250d5630...88d (HealthRecord)" },
                { label: "Gas Price", value: "12 Gwei" },
                { label: "Block Height", value: "#19,234,561" },
              ].map((item, i) => (
                <div key={i} style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px", border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 12, color: GRAY_TEXT, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 600, color: "#1E293B", fontSize: 13 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hoạt động gần đây */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <h3 style={{ color: PRIMARY, margin: "0 0 20px 0", fontSize: 16 }}>Hoạt động gần đây</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {recentActivities.map((act, i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: PRIMARY_MED, marginTop: 3, flexShrink: 0 }}></div>
                    {i !== recentActivities.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: BORDER, margin: "4px 0" }}></div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: PRIMARY_MED, marginBottom: 2 }}>{act.time}</div>
                    <div style={{ fontSize: 13, color: GRAY_TEXT, lineHeight: 1.4 }}>{act.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}