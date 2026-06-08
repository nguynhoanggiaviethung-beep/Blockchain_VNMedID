import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminOverview from './AdminOverview';
import AdminPatients from './AdminPatients';
import AdminDoctors from './AdminDoctors';
import AdminRecords from './AdminRecords';
import AdminSchedule from './AdminSchedule';

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"

const MENU = [
  { key: "overview",  icon: "📊", label: "Tổng quan" },
  { key: "patients",  icon: "👥", label: "Bệnh nhân" },
  { key: "doctors",   icon: "🩺", label: "Bác sĩ" },
  { key: "records",   icon: "📋", label: "Lượt khám" },
  { key: "schedule",  icon: "📅", label: "Lịch khám" },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const fullName = localStorage.getItem("fullName") || "Quản trị viên"
  const [activeTab, setActiveTab] = useState("overview")

  const handleLogout = () => { localStorage.clear(); navigate("/") }

  const renderContent = () => {
    if (activeTab === "overview") return <AdminOverview />
    if (activeTab === "patients") return <AdminPatients />
    if (activeTab === "doctors")  return <AdminDoctors />
    if (activeTab === "records")  return <AdminRecords />
    if (activeTab === "schedule") return <AdminSchedule />
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F4F7FB", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Navbar */}
      <div style={{ background: PRIMARY, color: "#fff", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 12px rgba(10,45,110,0.18)", zIndex: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🏥 VNmedID — Quản trị viên</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14 }}>🔑 {fullName}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: "#fff", borderRight: "1px solid #E2E8F0", padding: "24px 0", display: "flex", flexDirection: "column", gap: 4 }}>
          {MENU.map(item => {
            const isActive = activeTab === item.key
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 24px", border: "none", cursor: "pointer",
                  background: isActive ? PRIMARY_LIGHT : "transparent",
                  color: isActive ? PRIMARY_MED : "#5F6B7A",
                  fontWeight: isActive ? 700 : 400, fontSize: 14,
                  borderLeft: isActive ? `3px solid ${PRIMARY_MED}` : "3px solid transparent",
                  transition: "all 0.15s", textAlign: "left",
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}