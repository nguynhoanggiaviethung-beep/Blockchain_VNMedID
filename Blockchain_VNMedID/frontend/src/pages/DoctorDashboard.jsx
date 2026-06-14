import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosOriginal from 'axios'

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"

const BASE_URL = "https://blockchainvnmedid-production.up.railway.app/api/v1"

export default function DoctorDashboard() {
  const navigate = useNavigate()

  const [doctorInfo, setDoctorInfo] = useState({
    fullName: localStorage.getItem("fullName") || "Bác sĩ hệ thống",
    specialty: localStorage.getItem("chuyenKhoa") || "Da liễu",
    licenseNumber: localStorage.getItem("maBacSi") || "BS-123450"
  })

  const [patientList, setPatientList] = useState([])
  const [completedList, setCompletedList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [activeFilter, setActiveFilter] = useState("pending")

  const [selectedPatient, setSelectedPatient] = useState(null)
  const [diagnose, setDiagnose] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [treatmentDays, setTreatmentDays] = useState(7)
  const [drugList, setDrugList] = useState([{ name: "", suggestions: [], qty: 1, timesPerDay: 1, meals: [], note: "" }])
  const [doctorNote, setDoctorNote] = useState("")
  const [drugSearchTimers, setDrugSearchTimers] = useState({})

  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')

  // ✅ Lấy danh sách bệnh nhân từ /visits (đúng endpoint)
  const fetchPatients = useCallback(async (specialtyName, dateQuery) => {
    try {
      setLoading(true)

      const [pendingRes, completedRes] = await Promise.all([
        axiosOriginal.get(`${BASE_URL}/visits`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'pending', specialty: specialtyName, date: dateQuery }
        }),
        axiosOriginal.get(`${BASE_URL}/visits`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'completed', specialty: specialtyName, date: dateQuery }
        })
      ])

      setPatientList(pendingRes?.data?.data?.records || [])
      setCompletedList(completedRes?.data?.data?.records || [])
    } catch (error) {
      console.error("Lỗi lấy danh sách:", error)
      setPatientList([])
      setCompletedList([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token || !userId) { navigate("/"); return }

    const init = async () => {
      let currentSpecialty = doctorInfo.specialty
      try {
        const res = await axiosOriginal.get(`${BASE_URL}/doctors/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res?.data?.success && res?.data?.data) {
          const d = res.data.data
          currentSpecialty = d?.specialty || d?.["Chuyên Khoa"] || currentSpecialty
          setDoctorInfo({
            fullName: d?.fullName || d?.["Họ và tên"] || localStorage.getItem("fullName") || "Bác sĩ",
            specialty: currentSpecialty,
            licenseNumber: d?.licenseNumber || d?.["Giấy phép hành nghề"] || "---"
          })
        }
      } catch {}
      await fetchPatients(currentSpecialty, selectedDate)
    }

    init()
  }, [navigate, selectedDate, fetchPatients])

  const handleLogout = () => { localStorage.clear(); navigate("/") }

  const resetForm = () => {
    setSelectedPatient(null)
    setDiagnose('')
    setDrugList([{ name: "", suggestions: [], qty: 1, timesPerDay: 1, meals: [], note: "" }])
    setTreatmentDays(7)
    setDoctorNote("")
  }

  const searchDrug = async (index, keyword) => {
    const updated = [...drugList]
    updated[index].name = keyword
    setDrugList([...updated])
    if (keyword.length < 2) { updated[index].suggestions = []; setDrugList([...updated]); return }
    clearTimeout(drugSearchTimers[index])
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_URL}/drugs/search?q=${encodeURIComponent(keyword)}`)
        const data = await res.json()
        const next = [...drugList]
        next[index].suggestions = Array.isArray(data) ? data.slice(0, 6) : []
        setDrugList([...next])
      } catch {}
    }, 400)
    setDrugSearchTimers(prev => ({ ...prev, [index]: timer }))
  }

  const updateDrug = (index, field, value) => {
    const updated = [...drugList]; updated[index][field] = value; setDrugList([...updated])
  }

  const toggleMeal = (index, meal) => {
    const updated = [...drugList]
    const meals = updated[index].meals
    updated[index].meals = meals.includes(meal) ? meals.filter(m => m !== meal) : [...meals, meal]
    setDrugList([...updated])
  }

  const addDrug = () => setDrugList(prev => [...prev, { name: "", suggestions: [], qty: 1, timesPerDay: 1, meals: [], note: "" }])
  const removeDrug = (index) => setDrugList(prev => prev.filter((_, i) => i !== index))

  const handleCompletePrescription = async () => {
    if (!diagnose.trim()) { alert("Vui lòng nhập chẩn đoán!"); return }
    if (drugList.some(d => !d.name.trim())) { alert("Vui lòng nhập tên thuốc!"); return }

    const prescriptionText = [
      `⏱ Thời gian điều trị: ${treatmentDays} ngày`, ``,
      ...drugList.map((d, i) => [
        `${i + 1}. ${d.name}`,
        `   - Số lượng: ${d.qty} viên/gói`,
        `   - Uống ${d.timesPerDay} lần/ngày`,
        d.meals.length ? `   - Thời điểm: ${d.meals.join(", ")}` : "",
        d.note ? `   - Lưu ý: ${d.note}` : ""
      ].filter(Boolean).join("\n")),
      ``, doctorNote ? `📝 Dặn dò: ${doctorNote}` : ""
    ].filter(s => s !== undefined).join("\n")

    setSubmitting(true)
    try {
      // ✅ Gọi đúng endpoint /visits/:id để cập nhật trạng thái
      const response = await axiosOriginal.put(
        `${BASE_URL}/visits/${selectedPatient._id}`,
        {
          status: "completed",
          chanDoanChuyenMon: diagnose,
          huongDieuTri: prescriptionText,
          doctorName: doctorInfo.fullName,
          doctorId: userId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        alert("🎉 Đã lưu bệnh án thành công!")
        resetForm()
        await fetchPatients(doctorInfo.specialty, selectedDate)
      }
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || error.message))
    } finally {
      setSubmitting(false)
    }
  }

  const displayList = activeFilter === "pending" ? patientList
    : activeFilter === "completed" ? completedList
    : [...patientList, ...completedList]

  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, color: "#fff", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🏥 VNmedID — Bác sĩ</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14 }}>🩺 Chào, {doctorInfo.fullName}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Đăng xuất</button>
        </div>
      </div>

      <div style={{ padding: "32px" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: PRIMARY, margin: 0 }}>Xin chào, BS. {doctorInfo.fullName} 👋</h2>
          <p style={{ color: GRAY_TEXT, marginTop: 4, fontSize: 14 }}>
            Chuyên khoa: <span style={{ color: PRIMARY_MED, fontWeight: 600 }}>{doctorInfo.specialty}</span> · GP: <strong>{doctorInfo.licenseNumber}</strong>
          </p>
        </div>

        {/* 3 Ô thống kê */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          {[
            { id: "all", icon: "👥", label: "Tổng ca hẹn trong ngày", value: loading ? "..." : patientList.length + completedList.length },
            { id: "completed", icon: "📋", label: "Đã khám xong", value: loading ? "..." : completedList.length },
            { id: "pending", icon: "⏳", label: "Đang chờ khám", value: loading ? "..." : patientList.length },
          ].map(card => {
            const isSelected = activeFilter === card.id
            return (
              <div key={card.id} onClick={() => setActiveFilter(card.id)} style={{
                background: "#fff", borderRadius: 14, padding: "24px", cursor: "pointer",
                boxShadow: isSelected ? `0 0 0 2px ${PRIMARY_MED}, 0 4px 20px rgba(26,79,168,0.15)` : "0 2px 12px rgba(0,0,0,0.07)",
                transform: isSelected ? "scale(1.02)" : "scale(1)", transition: "all 0.2s"
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: PRIMARY }}>{card.value}</div>
                <div style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 4 }}>{card.label}</div>
              </div>
            )
          })}
        </div>

        {/* Bảng danh sách */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: PRIMARY, margin: 0 }}>
              👥 {activeFilter === "pending" ? "Đang chờ khám" : activeFilter === "completed" ? "Đã khám xong" : "Tất cả"} — Khoa {doctorInfo.specialty}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: GRAY_TEXT }}>Ngày:</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: PRIMARY, fontWeight: 600, outline: "none", background: "#fff", colorScheme: "light" }} />
              <span style={{ fontSize: 12, background: PRIMARY_LIGHT, color: PRIMARY_MED, padding: "6px 12px", borderRadius: 20, fontWeight: 600 }}>Live DB</span>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: PRIMARY_LIGHT }}>
                {["STT", "Họ tên bệnh nhân", "Chuyên khoa", "Ngày khám", "Triệu chứng", "Trạng thái", "Thao tác"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 13, color: PRIMARY, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: GRAY_TEXT }}>Đang tải...</td></tr>
              ) : displayList.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: GRAY_TEXT, fontStyle: "italic" }}>
                  Không có bệnh nhân nào.
                </td></tr>
              ) : displayList.map((p, i) => (
                <tr key={p._id || i} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFC", borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: PRIMARY_MED }}>#{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1E293B" }}>{p.patientName || "---"}</td>
                  <td style={{ padding: "12px 14px", color: "#475569" }}>{p.specialty || "---"}</td>
                  <td style={{ padding: "12px 14px", color: "#0284C7", fontWeight: 600 }}>{p.appointmentDate || "---"}</td>
                  <td style={{ padding: "12px 14px", color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.trieuChungLamSang || "---"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                      background: p.status === "completed" ? "#D1FAE5" : "#FEF3C7",
                      color: p.status === "completed" ? "#065F46" : "#D97706"
                    }}>
                      {p.status === "completed" ? "✅ Đã khám" : "⏳ Chờ khám"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {p.status !== "completed" ? (
                      <button onClick={() => { setSelectedPatient(p); setDiagnose('') }}
                        style={{ background: PRIMARY, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        Vào khám
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: GRAY_TEXT }}>Hoàn tất</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form kê đơn */}
        {selectedPatient && (
          <div style={{ marginTop: 32, background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: `1px solid ${PRIMARY_MED}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `2px solid ${PRIMARY_LIGHT}`, paddingBottom: 12 }}>
              <h3 style={{ color: PRIMARY, margin: 0 }}>🩺 Khám cho: <span style={{ color: "#EF4444" }}>{selectedPatient.patientName}</span></h3>
              <button onClick={resetForm} style={{ background: "#EF4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Hủy ❌</button>
            </div>

            {/* Thông tin bệnh nhân */}
            <div style={{ background: PRIMARY_LIGHT, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13 }}>
                <div><strong>Chuyên khoa:</strong> {selectedPatient.specialty}</div>
                <div><strong>Ngày hẹn:</strong> {selectedPatient.appointmentDate}</div>
                <div><strong>Trạng thái:</strong> {selectedPatient.status}</div>
                <div style={{ gridColumn: "1 / span 3" }}><strong>Triệu chứng:</strong> {selectedPatient.trieuChungLamSang || "---"}</div>
              </div>
            </div>

            {/* Chẩn đoán */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: PRIMARY, marginBottom: 6 }}>🔬 Chẩn đoán bệnh lý:</label>
              <textarea value={diagnose} onChange={e => setDiagnose(e.target.value)}
                placeholder="Nhập kết quả chẩn đoán lâm sàng..." rows={3}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", background: "#F8FAFC", color: "#1E293B", boxSizing: "border-box" }} />
            </div>

            {/* Thời gian điều trị */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: PRIMARY, marginBottom: 10 }}>⏱ Thời gian điều trị:</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[3, 5, 7, 10, 14, 21, 30].map(d => (
                  <button key={d} onClick={() => setTreatmentDays(d)} style={{
                    padding: "8px 18px", borderRadius: 20, border: `2px solid ${treatmentDays === d ? PRIMARY : BORDER}`,
                    background: treatmentDays === d ? PRIMARY : "#F8FAFC", color: treatmentDays === d ? "#fff" : GRAY_TEXT,
                    fontWeight: 600, fontSize: 13, cursor: "pointer"
                  }}>
                    {d < 14 ? `${d} ngày` : d === 14 ? "2 tuần" : d === 21 ? "3 tuần" : "1 tháng"}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách thuốc */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: PRIMARY, marginBottom: 10 }}>💊 Kê đơn thuốc:</label>
              {drugList.map((drug, index) => (
                <div key={index} style={{ background: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, color: PRIMARY_MED, fontSize: 13 }}>Thuốc #{index + 1}</span>
                    {drugList.length > 1 && <button onClick={() => removeDrug(index)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 18 }}>✕</button>}
                  </div>
                  <div style={{ position: "relative", marginBottom: 12 }}>
                    <input value={drug.name} onChange={e => searchDrug(index, e.target.value)}
                      placeholder="Gõ tên thuốc (openFDA)..."
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", background: "#fff", color: "#1E293B", boxSizing: "border-box" }} />
                    {drug.suggestions.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto" }}>
                        {drug.suggestions.map((s, si) => (
                          <div key={si} onClick={() => { updateDrug(index, "name", s); updateDrug(index, "suggestions", []) }}
                            style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, color: "#1E293B" }}
                            onMouseEnter={e => e.currentTarget.style.background = PRIMARY_LIGHT}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: GRAY_TEXT }}>Số lượng (viên/gói)</label>
                      <input type="number" min={1} value={drug.qty} onChange={e => updateDrug(index, "qty", parseInt(e.target.value) || 1)}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: GRAY_TEXT }}>Số lần/ngày</label>
                      <input type="number" min={1} max={4} value={drug.timesPerDay} onChange={e => updateDrug(index, "timesPerDay", parseInt(e.target.value) || 1)}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 6 }}>Thời điểm uống:</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Sáng", "Trưa", "Chiều", "Tối"].map(meal => (
                        <button key={meal} onClick={() => toggleMeal(index, meal)} style={{
                          padding: "6px 16px", borderRadius: 20, border: `2px solid ${drug.meals.includes(meal) ? PRIMARY_MED : BORDER}`,
                          background: drug.meals.includes(meal) ? PRIMARY_LIGHT : "#fff",
                          color: drug.meals.includes(meal) ? PRIMARY_MED : GRAY_TEXT, fontWeight: 600, fontSize: 13, cursor: "pointer"
                        }}>{meal}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: GRAY_TEXT }}>Lưu ý riêng</label>
                    <input value={drug.note} onChange={e => updateDrug(index, "note", e.target.value)}
                      placeholder="VD: Uống sau ăn 30 phút..."
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: "none", marginTop: 4, background: "#fff", color: "#1E293B", boxSizing: "border-box" }} />
                  </div>
                </div>
              ))}
              <button onClick={addDrug} style={{ background: PRIMARY_LIGHT, color: PRIMARY_MED, border: `1.5px dashed ${PRIMARY_MED}`, padding: "9px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, width: "100%" }}>
                + Thêm thuốc
              </button>
            </div>

            {/* Dặn dò */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: PRIMARY, marginBottom: 6 }}>📝 Dặn dò của bác sĩ:</label>
              <textarea value={doctorNote} onChange={e => setDoctorNote(e.target.value)}
                placeholder="VD: Uống nhiều nước, nghỉ ngơi, tái khám sau 1 tuần..." rows={3}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", background: "#F8FAFC", color: "#1E293B", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleCompletePrescription} disabled={submitting} style={{
                background: "#10B981", color: "#fff", border: "none", padding: "11px 28px",
                borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
                boxShadow: "0 2px 6px rgba(16,185,129,0.3)"
              }}>
                {submitting ? "Đang ghi nhận..." : "💾 Hoàn thành & Lưu bệnh án"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}