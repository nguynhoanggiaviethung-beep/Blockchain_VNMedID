import { useState, useEffect } from 'react';
import axios from 'axios';

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"
const BASE_URL = "https://victorious-commitment-production-ba03.up.railway.app/api/v1"

export default function AdminOverview() {
  const token = localStorage.getItem("token")
  const fullName = localStorage.getItem("fullName") || "Quản trị viên"

  const [totalPatients, setTotalPatients] = useState(null)
  const [totalDoctors, setTotalDoctors] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` }
    setLoading(true)

    Promise.allSettled([
      axios.get(`${BASE_URL}/patients`, { headers }),
      axios.get(`${BASE_URL}/doctors`, { headers }),
      axios.get(`${BASE_URL}/visits`, { headers }),
    ]).then(([pRes, dRes, rRes]) => {
      // Patients
      if (pRes.status === "fulfilled") {
        const data = pRes.value.data?.data
        const list = data?.patients || data || []
        setTotalPatients(Array.isArray(list) ? list.length : (data?.total ?? 0))
      } else {
        setErrors(e => ({ ...e, patients: true }))
      }

      // Doctors
      if (dRes.status === "fulfilled") {
        const data = dRes.value.data?.data
        const list = data?.doctors || data || []
        setTotalDoctors(Array.isArray(list) ? list.length : (data?.total ?? 0))
      } else {
        setErrors(e => ({ ...e, doctors: true }))
      }

      // Records
      if (rRes.status === "fulfilled") {
        const data = rRes.value.data?.data
        const list = data?.records || data || []
        setRecords(Array.isArray(list) ? list : [])
      } else {
        setErrors(e => ({ ...e, records: true }))
      }
    }).finally(() => setLoading(false))
  }, [])

  // Tính từ records thật
  const todayStr = new Date().toISOString().slice(0, 10)

  const visitsToday = records.filter(r => {
    const d = r.date || r.appointmentDate || r.createdAt || ""
    return d.slice(0, 10) === todayStr
  })

  const completedToday = visitsToday.filter(r => r.status === "completed").length
  const pendingToday   = visitsToday.filter(r => r.status === "pending").length

  // Hoạt động gần đây: 5 record mới nhất
  const recentRecords = [...records]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 5)

  const formatTime = (dateStr) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return "Hôm nay"
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return "Hôm qua"
    return d.toLocaleDateString("vi-VN")
  }

  const getActivityText = (r) => {
    const patient = r.patientId?.fullName || r.patientName || "bệnh nhân"
    const doctor  = r.doctorId?.["Họ và tên"] || r.doctorName || "bác sĩ"
    const status  = r.status
    if (status === "completed") return `BS. ${doctor} đã hoàn thành khám cho ${patient}`
    if (status === "examining") return `BS. ${doctor} đang khám cho ${patient}`
    if (status === "cancelled") return `Lượt khám của ${patient} đã bị hủy`
    return `${patient} đã đăng ký khám với BS. ${doctor}`
  }

  const val = (v) => loading ? "..." : (v ?? 0)

  const stats = [
    {
      icon: "👥", label: "Tổng bệnh nhân",
      value: val(totalPatients),
      trend: errors.patients ? "⚠ Lỗi tải" : "Đã đăng ký",
      color: "#3B82F6",
    },
    {
      icon: "🩺", label: "Tổng bác sĩ",
      value: val(totalDoctors),
      trend: errors.doctors ? "⚠ Lỗi tải" : "Đang hoạt động",
      color: "#10B981",
    },
    {
      icon: "📋", label: "Lượt khám hôm nay",
      value: val(visitsToday.length),
      trend: errors.records ? "⚠ Lỗi tải" : `Hoàn thành: ${completedToday} · Chờ: ${pendingToday}`,
      color: "#F59E0B",
    },
    {
      icon: "📊", label: "Tổng lượt khám",
      value: val(records.length),
      trend: errors.records ? "⚠ Lỗi tải" : `Hoàn thành: ${records.filter(r => r.status === "completed").length}`,
      color: "#8B5CF6",
    },
  ]

  return (
    <div>
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

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Thống kê theo trạng thái */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ color: PRIMARY, margin: "0 0 20px 0", fontSize: 16 }}>📈 Thống kê lượt khám</h3>

          {/* Breakdown bars */}
          {[
            { label: "Chờ khám",   key: "pending",   color: "#F59E0B", bg: "#FEF3C7" },
            { label: "Đang khám",  key: "examining", color: PRIMARY_MED, bg: PRIMARY_LIGHT },
            { label: "Hoàn thành", key: "completed", color: "#10B981", bg: "#D1FAE5" },
            { label: "Đã hủy",     key: "cancelled", color: "#EF4444", bg: "#FEE2E2" },
          ].map(s => {
            const count = records.filter(r => r.status === s.key).length
            const pct = records.length ? Math.round((count / records.length) * 100) : 0
            return (
              <div key={s.key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "#1E293B", fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{loading ? "..." : count} <span style={{ color: GRAY_TEXT, fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "#F1F5F9", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: s.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            )
          })}

          {/* Hôm nay vs tổng */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: PRIMARY_LIGHT, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: GRAY_TEXT, marginBottom: 4 }}>LƯỢT KHÁM HÔM NAY</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: PRIMARY }}>{loading ? "..." : visitsToday.length}</div>
              <div style={{ fontSize: 11, color: PRIMARY_MED, marginTop: 2 }}>✅ {completedToday} hoàn thành · ⏳ {pendingToday} chờ</div>
            </div>
            <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: GRAY_TEXT, marginBottom: 4 }}>TỔNG CỘNG</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#16A34A" }}>{loading ? "..." : records.length}</div>
              <div style={{ fontSize: 11, color: "#16A34A", marginTop: 2 }}>toàn bộ hồ sơ khám</div>
            </div>
          </div>
        </div>

        {/* Hoạt động gần đây từ data thật */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ color: PRIMARY, margin: "0 0 20px 0", fontSize: 16 }}>🕐 Hoạt động gần đây</h3>

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: GRAY_TEXT, fontSize: 13 }}>Đang tải...</div>
          ) : recentRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: GRAY_TEXT, fontSize: 13, fontStyle: "italic" }}>Chưa có hoạt động nào.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {recentRecords.map((r, i) => {
                const ts = r.createdAt || r.date || r.appointmentDate
                return (
                  <div key={r._id || i} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: PRIMARY_MED, marginTop: 3, flexShrink: 0 }} />
                      {i !== recentRecords.length - 1 && (
                        <div style={{ width: 2, flex: 1, background: BORDER, margin: "4px 0" }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY_MED }}>{formatTime(ts)}</span>
                        <span style={{ fontSize: 10, color: GRAY_TEXT }}>{formatDate(ts)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: GRAY_TEXT, lineHeight: 1.5 }}>{getActivityText(r)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {recentRecords.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
              <span style={{ fontSize: 12, color: PRIMARY_MED, fontWeight: 600, cursor: "pointer" }}>
                Xem tất cả lượt khám →
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}