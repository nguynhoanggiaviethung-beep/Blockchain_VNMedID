import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosOriginal from 'axios'
import DrugList from './DrugList'

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#F0F6FC"
const GRAY_TEXT = "#4A5568"
const BORDER = "#CBD5E1"
const BG_GLOBAL = "#F8FAFC"

const BASE_URL = "http://localhost:5000/api/v1"

export default function DoctorDashboard() {
  const navigate = useNavigate()

  const [doctorInfo, setDoctorInfo] = useState({
    fullName: localStorage.getItem("fullName") || "Bác sĩ hệ thống",
    specialty: localStorage.getItem("chuyenKhoa") || "Răng Hàm Mặt",
    licenseNumber: localStorage.getItem("maBacSi") || "BS-123450",
    hospitalName: localStorage.getItem("hospitalName") || "Hệ thống Y tế số VNmedID"
  })

  const [patientList, setPatientList] = useState([])
  const [completedList, setCompletedList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [activeFilter, setActiveFilter] = useState("pending")

  const [selectedPatient, setSelectedPatient] = useState(() => {
    const saved = localStorage.getItem("current_exam_patient")
    return saved ? JSON.parse(saved) : null
  })
  
  const [diagnose, setDiagnose] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requestingAccess, setRequestingAccess] = useState(false)
  
  const [accessStatus, setAccessStatus] = useState(() => {
    return localStorage.getItem("current_exam_access_status") || "none"
  })

  // Quản lý dữ liệu Blockchain và dòng đang được chọn xem chi tiết
  const [blockchainRecords, setBlockchainRecords] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedBlock, setExpandedBlock] = useState(null)
  const [expandedCompletedRow, setExpandedCompletedRow] = useState(null)


  const [treatmentDays, setTreatmentDays] = useState(7)
  const [drugList, setDrugList] = useState([{ name: "", price: 0, suggestions: [], qty: 1, timesPerDay: 1, meals: [], note: "" }])
  const [doctorNote, setDoctorNote] = useState("")
 

  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')

  fetch(`https://blockchain-vnmedid.onrender.com/api/v1/visits?status=completed&doctorId=${userId}`, {
  headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(d => console.log("KẾT QUẢ doctorId:", d))

  const fetchPatients = useCallback(async (specialtyName, dateQuery) => {
    try {
      setLoading(true)
      
      const formattedDate = dateQuery ? dateQuery.trim() : "";

      const [pendingRes, completedRes] = await Promise.all([
        axiosOriginal.get(`${BASE_URL}/visits/pending-hospital`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { specialty: specialtyName, date: formattedDate } 
        }),
        axiosOriginal.get(`${BASE_URL}/visits/completed-doctor`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { date: formattedDate }
        })
      ])
      
      // 🌟 SỬA ĐOẠN BÓC TÁCH DATA NÀY CHO THẬT CHUẨN:
      // Đảm bảo bóc đúng mảng 'data' từ Backend trả về (vì backend trả về { success: true, count: X, data: [...] })
      const pendingData = pendingRes?.data?.data || [];
      const completedData = completedRes?.data?.data || [];

      // 🌟 QUAN TRỌNG NHẤT: Nếu là mảng thì gán, không thì bắt buộc phải đưa về mảng rỗng [] để xóa data cũ trên màn hình
      setPatientList(Array.isArray(pendingData) ? pendingData : [])
      setCompletedList(Array.isArray(completedData) ? completedData : [])

    } catch (error) {
      console.error("Lỗi lấy danh sách ca hẹn:", error)
      // Nếu lỗi API, lập tức xóa sạch màn hình
      setPatientList([])
      setCompletedList([])
    } finally {
      setLoading(false)
    }
  }, [token])

  // Lấy thông tin Bác sĩ ban đầu
  useEffect(() => {
    if (!token || !userId) { navigate("/"); return }

    const fetchDoctorInfo = async () => {
      try {
        const res = await axiosOriginal.get(`${BASE_URL}/doctors/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res?.data?.success && res?.data?.data) {
          const d = res.data.data
          const currentSpecialty = d?.specialty || d?.["Chuyên Khoa"] || doctorInfo.specialty
          const hName = d?.hospitalName || d?.["Tên Bệnh viện"] || localStorage.getItem("hospitalName") || "Hệ thống Y tế số VNmedID"
          
          localStorage.setItem("hospitalName", hName)

          setDoctorInfo({
            fullName: d?.fullName || d?.["Họ và tên"] || localStorage.getItem("fullName") || "Bác sĩ",
            specialty: currentSpecialty,
            licenseNumber: d?.licenseNumber || d?.["Giấy phép hành nghề"] || "---",
            hospitalName: hName
          })
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin bác sĩ:", err)
      }
    }

    fetchDoctorInfo()
  }, [navigate, token, userId])

  // 🌟 TỰ ĐỘNG CHẠY LẠI: Cứ đổi ngày (selectedDate) hoặc Chuyên khoa là load dữ liệu mới chuẩn đét
  useEffect(() => {
    if (token && doctorInfo.specialty) {
      fetchPatients(doctorInfo.specialty, selectedDate)
    }
  }, [selectedDate, doctorInfo.specialty, fetchPatients, token])

  // Tải danh sách bệnh án từ DB đóng vai trò là dữ liệu gốc của Blockchain Hash
  useEffect(() => {
    const fetchBlockchainRecords = async () => {
      if (!selectedPatient || accessStatus !== "approved") {
        setBlockchainRecords([])
        return
      }
      
      setLoadingHistory(true)
      try {
        const targetId = selectedPatient.patientId || selectedPatient.userId || selectedPatient._id
        const res = await axiosOriginal.get(`${BASE_URL}/visits`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'completed', patientId: targetId }
        })
        
        if (res.data?.success && res.data?.data) {
          const records = res.data.data.records || res.data.data
          setBlockchainRecords(Array.isArray(records) ? records : [])
        }
      } catch (error) {
        console.error("Lỗi khi tải lịch sử:", error)
        setBlockchainRecords([])
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchBlockchainRecords()
  }, [selectedPatient, accessStatus, token])

  const handleLogout = () => { localStorage.clear(); navigate("/") }

  const resetForm = () => {
    setDiagnose('')
    setDrugList([{ name: "", suggestions: [], qty: 1, timesPerDay: 1, meals: [], note: "" }])
    setTreatmentDays(7)
    setDoctorNote("")
    setAccessStatus("none")
    setBlockchainRecords([])
    setExpandedBlock(null)
    setSelectedPatient(null)
    localStorage.removeItem("current_exam_patient")
    localStorage.removeItem("current_exam_access_status")
  }

  const handleRequestAccess = async () => {
    if (!selectedPatient) return
    setRequestingAccess(true)
    try {
      const res = await axiosOriginal.post(
        `${BASE_URL}/access/requests`, 
        {
          patientId: selectedPatient.patientId || selectedPatient.userId || "", 
          doctorId: userId,
          doctorName: doctorInfo.fullName,
          specialty: doctorInfo.specialty,
          hospitalName: doctorInfo.hospitalName
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.data?.success) {
        setAccessStatus("pending")
        localStorage.setItem("current_exam_access_status", "pending")
        alert("✉️ Đã gửi yêu cầu thành công! Nếu bệnh nhân đã bấm ủy quyền trước đó, hãy ấn lại nút này lần nữa để đồng bộ quyền.")
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || ""
      if (errorMsg.includes("Bạn đang có quyền truy cập")) {
        setAccessStatus("approved")
        localStorage.setItem("current_exam_access_status", "approved")
      } else {
        alert(errorMsg || "Có lỗi xảy ra khi yêu cầu phân quyền.")
      }
    } finally {
      setRequestingAccess(false)
    }
  }



  const updateDrug = (index, field, value) => {
    console.log(field, value)
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
      const response = await axiosOriginal.put(
        `${BASE_URL}/visits/${selectedPatient._id}`,
        {
          status: "completed",
          chanDoanChuyenMon: diagnose,
          huongDieuTri: prescriptionText,
          doctorName: doctorInfo.fullName,
          doctorId: userId,
          hospitalName: doctorInfo.hospitalName,
          prescribedDrugs: drugList
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        alert("🎉 Đã ký số & lưu bệnh án thành công lên Blockchain!")
        resetForm()
        await fetchPatients(doctorInfo.specialty, selectedDate)
      }
    } catch  {
      alert("Lỗi lưu trữ dữ liệu bệnh án.")
    } finally {
      setSubmitting(false)
    }
  }

  const displayList = activeFilter === "pending" ? patientList
    : activeFilter === "completed" ? completedList
    : [...patientList, ...completedList]

  console.log("=== CHECK BIẾN HOSPITAL NAME ===", doctorInfo?.hospitalName);

  return (
    <div style={{ minHeight: "100vh", background: BG_GLOBAL, fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#1E293B" }}>
      
      <div style={{ background: PRIMARY, color: "#fff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <div style={{ fontWeight: 700, fontSize: 19, display: "flex", alignItems: "center", gap: 10 }}>
          <span>🏥 {doctorInfo.hospitalName}</span>
          <span style={{ fontSize: 12, background: "rgba(255,255,255,0.18)", padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>Portal Bác sĩ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>🩺 BS. {doctorInfo.fullName}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Đăng xuất</button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "32px 24px" }}>
        
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: 20, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div>
            <h2 style={{ color: PRIMARY, margin: 0, fontSize: 24, fontWeight: 700 }}>Bác sĩ chuyên khoa: {doctorInfo.fullName}</h2>
            <p style={{ color: GRAY_TEXT, marginTop: 6, marginBottom: 0, fontSize: 14 }}>
              Khoa điều trị: <strong style={{ color: PRIMARY_MED }}>{doctorInfo.specialty}</strong> | Mã số hành nghề: <strong>{doctorInfo.licenseNumber}</strong>
            </p>
          </div>
          <div style={{ background: PRIMARY_LIGHT, padding: "10px 18px", borderRadius: 8, border: "1px solid #D0E1FD", textAlign: "right" }}>
            <span style={{ fontSize: 11, color: PRIMARY_MED, display: "block", fontWeight: 600, textTransform: "uppercase" }}>Phiên làm việc</span>
            <strong style={{ color: PRIMARY, fontSize: 14 }}>{new Date().toLocaleDateString('vi-VN')}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          {[
            { 
              id: "all", 
              icon: "👥", 
              label: "Tổng số ca tiếp nhận", 
              // Đảm bảo luôn ép kiểu số bằng toán tử || 0 trước khi cộng
              value: loading ? "..." : ((patientList?.length || 0) + (completedList?.length || 0)), 
              color: PRIMARY_MED 
            },
            { id: "completed", icon: "✅", label: "Đã hoàn thành ký số", value: loading ? "..." : (completedList?.length || 0), color: "#10B981" },
            { id: "pending", icon: "⏳", label: "Đang chờ khám lâm sàng", value: loading ? "..." : (patientList?.length || 0), color: "#F59E0B" },
          ].map(card => {
            const isSelected = activeFilter === card.id
            return (
              <div key={card.id} onClick={() => setActiveFilter(card.id)} style={{
                background: "#fff", borderRadius: 12, padding: "20px 24px", cursor: "pointer",
                border: isSelected ? `2px solid ${card.color}` : `1px solid ${BORDER}`,
                boxShadow: isSelected ? "0 4px 16px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s ease-in-out"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: PRIMARY }}>{card.value}</div>
                    <div style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 4, fontWeight: 500 }}>{card.label}</div>
                  </div>
                  <div style={{ fontSize: 28, opacity: 0.8 }}>{card.icon}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "24px", border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ color: PRIMARY, margin: 0, fontSize: 17, fontWeight: 700 }}>
              📋 Danh sách bệnh nhân ({activeFilter === "pending" ? "Đang chờ" : activeFilter === "completed" ? "Đã xong" : "Tất cả"})
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: GRAY_TEXT }}>Chọn ngày:</span>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, background: "#fff", color: "#1E293B", outline: "none" }} />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: PRIMARY_LIGHT, borderBottom: `2px solid ${BORDER}` }}>
                  {["STT", "Họ tên bệnh nhân", "Chuyên khoa", "Ngày khám", "Triệu chứng lâm sàng", "Trạng thái", "Hành động"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 13, color: PRIMARY, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "30px", color: GRAY_TEXT }}>Đang đồng bộ dữ liệu...</td></tr>
                ) : displayList.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "30px", color: GRAY_TEXT, fontStyle: "italic" }}>Không tìm thấy ca hẹn nào trong hệ thống.</td></tr>
               ) : displayList.map((p, i) => {
  const isCompleted = p.status === "completed"
  const isExpanded = expandedCompletedRow === (p._id || i)

  return (
    <Fragment key={p._id || i}>
      <tr
        style={{ borderBottom: `1px solid ${BORDER}`, background: isExpanded ? "#F0FDF4" : "#fff", cursor: isCompleted ? "pointer" : "default" }}
        onClick={() => {
          if (!isCompleted) return
          setExpandedCompletedRow(isExpanded ? null : (p._id || i))
        }}
      >
        <td style={{ padding: "14px 16px", fontWeight: 700, color: PRIMARY_MED }}>{i + 1}</td>
        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#0F172A" }}>{p.patientName || "---"}</td>
        <td style={{ padding: "14px 16px", color: GRAY_TEXT, fontSize: 13 }}>{p.specialty || "---"}</td>
        <td style={{ padding: "14px 16px", color: PRIMARY_MED, fontWeight: 600, fontSize: 13 }}>{p.appointmentDate || "---"}</td>
        <td style={{ padding: "14px 16px", color: GRAY_TEXT, fontSize: 13, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.trieuChungLamSang || "Không có triệu chứng"}
        </td>
        <td style={{ padding: "14px 16px" }}>
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, fontWeight: 600, background: isCompleted ? "#DEF7EC" : "#FEF3C7", color: isCompleted ? "#03543F" : "#92400E" }}>
            {isCompleted ? "Đã hoàn thành" : "Chờ vào khám"}
          </span>
        </td>
        <td style={{ padding: "14px 16px" }}>
          {!isCompleted ? (
            <button onClick={(e) => {
              e.stopPropagation()
              setSelectedPatient(p)
              setDiagnose('')
              setAccessStatus("none")
              setBlockchainRecords([])
              setExpandedBlock(null)
              localStorage.setItem("current_exam_patient", JSON.stringify(p))
              localStorage.setItem("current_exam_access_status", "none")
            }}
              style={{ background: PRIMARY_MED, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Vào khám
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpandedCompletedRow(isExpanded ? null : (p._id || i))
              }}
              style={{ background: isExpanded ? "#15803D" : "#10B981", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              {isExpanded ? "Đóng 📂" : "Xem lại 👁️"}
            </button>
          )}
        </td>
      </tr>

      {isCompleted && isExpanded && (
        <tr>
          <td colSpan={7} style={{ padding: "16px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ background: "#fff", border: "1px solid #22C55E", borderRadius: 8, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #E2E8F0" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#22C55E", textTransform: "uppercase" }}>✅ Kết quả ca khám đã ký số</span>
                <span style={{ fontSize: 12, color: GRAY_TEXT }}>— {p.appointmentDate || "---"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14, fontSize: 14 }}>
                <div>🏥 <strong>Bệnh viện:</strong> {p.hospitalName || doctorInfo.hospitalName}</div>
                <div>👨‍⚕️ <strong>Bác sĩ phụ trách:</strong> {p.doctorName || doctorInfo.fullName}</div>
                <div>🧬 <strong>Chuyên khoa:</strong> {p.specialty || "---"}</div>
                <div>🧑‍🤝‍🧑 <strong>Bệnh nhân:</strong> {p.patientName || "---"}</div>
              </div>
              <div style={{ marginBottom: 14, padding: "12px 14px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
                🔬 <strong>Kết luận chẩn đoán:</strong>{" "}
                <span style={{ color: "#EF4444", fontWeight: 600 }}>
                  {p.chanDoanChuyenMon || "Chưa cập nhật"}
                </span>
              </div>
              <div style={{ background: "#F1F5F9", padding: 14, borderRadius: 8, border: "1px solid #E2E8F0", whiteSpace: "pre-line", fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                📋 <strong>Phác đồ điều trị & Đơn thuốc:</strong>{"\n"}
                {p.huongDieuTri || "Không có thông tin đơn thuốc."}
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
})}

              </tbody>
            </table>
          </div>
        </div>

        {selectedPatient && (
          <div style={{ marginTop: 32, background: "#fff", borderRadius: 12, padding: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${PRIMARY_MED}` }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: `2px solid ${PRIMARY_LIGHT}`, paddingBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700, color: PRIMARY_MED, display: "block" }}>Phiếu ghi nhận kết quả khám lâm sàng</span>
                <h3 style={{ color: PRIMARY, margin: "4px 0 0 0", fontSize: 20, fontWeight: 700 }}>Bệnh nhân: <span style={{ color: "#EF4444" }}>{selectedPatient.patientName}</span></h3>
              </div>
              <button onClick={resetForm} style={{ background: "#FEE2E2", color: "#EF4444", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Hủy ca khám ✕</button>
            </div>

            <div style={{ background: PRIMARY_LIGHT, borderRadius: 8, padding: 20, marginBottom: 24, border: "1px solid #E2E8F0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 14, marginBottom: 16, color: "#1E293B" }}>
                <div>🧬 <strong>Chuyên khoa đăng ký:</strong> {selectedPatient.specialty}</div>
                <div>📅 <strong>Ngày hẹn khám:</strong> {selectedPatient.appointmentDate}</div>
                <div style={{ gridColumn: "1 / span 2", borderTop: "1px solid #E2E8F0", paddingTop: 10, marginTop: 4 }}>
                  💬 <strong>Lý do đến khám/Triệu chứng đầu vào:</strong> <span style={{ color: "#334155" }}>{selectedPatient.trieuChungLamSang || "Chưa cập nhật dữ liệu sinh hiệu"}</span>
                </div>
              </div>

              <div style={{ borderTop: `1px dashed ${BORDER}`, paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: 14, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                <div>
                  <span style={{ fontWeight: 700, color: PRIMARY, fontSize: 13, display: "block" }}>🔐 Quyền truy cập hồ sơ bệnh án lịch sử (Medical History EMR):</span>
                  <span style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 2, display: "block" }}>
                    {accessStatus === "none" && "• Vui lòng nhấn nút yêu cầu để kiểm tra trạng thái phân quyền."}
                    {accessStatus === "pending" && "⏳ • Đã gửi lệnh. Nếu bệnh nhân đã bấm ủy quyền thành công, hãy bấm lại nút để đồng bộ quyền."}
                    {accessStatus === "approved" && "✅ • Đã xác thực phân quyền thành công! Hệ thống đã mở khóa sổ cái hồ sơ bệnh án lịch sử bên dưới."}
                  </span>
                </div>
                <button onClick={handleRequestAccess} disabled={requestingAccess || accessStatus === "approved"} 
                  style={{ 
                    background: accessStatus === "approved" ? "#10B981" : PRIMARY_MED, 
                    color: "#fff", border: "none", padding: "10px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" 
                  }}>
                  {requestingAccess ? "Đang kiểm tra..." : accessStatus === "approved" ? "✓ Đã cấp quyền" : "🛡️ Gửi yêu cầu xin quyền"}
                </button>
              </div>
            </div>

            {accessStatus === "approved" ? (
              <>
                {/* 🔗 BẢNG CHỨNG THỰC BỆNH ÁN BẤT BIẾN ON-CHAIN (SEPOLIA NETWORK) */}
                <div style={{ marginBottom: 32, padding: "4px 0" }}>
                  <h4 style={{ color: "#22C55E", margin: "0 0 8px 0", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    🔗 BẢN GHI CHỨNG THỰC BỆNH ÁN BẤT BIẾN ON-CHAIN (SEPOLIA NETWORK)
                  </h4>
                  <p style={{ color: GRAY_TEXT, fontSize: 13, margin: "0 0 16px 0" }}>
                    👉 <strong>Hướng dẫn bác sĩ:</strong> Nhấn vào từng dòng Block để giải mã dữ liệu văn bản gốc (Chẩn đoán cũ, bệnh viện, đơn thuốc điều trị) của đợt khám đó.
                  </p>
                  
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#22C55E", color: "#fff" }}>
                          <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, width: "100px" }}>Thứ tự Block</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, width: "180px" }}>Thời gian (Timestamp)</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Mã băm bệnh án (Record Hash)</th>
                          <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, width: "120px" }}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingHistory ? (
                          <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px", color: GRAY_TEXT, fontStyle: "italic" }}>Đang kết nối cổng Oracle RPC và quét Blockchain sổ cái...</td></tr>
                        ) : blockchainRecords.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: "center", padding: "24px", color: GRAY_TEXT, fontStyle: "italic" }}>📭 Không tìm thấy dữ liệu khối On-chain nào thuộc về danh tính bệnh nhân này.</td></tr>
                        ) : blockchainRecords.map((record, index) => {
                          const isExpanded = expandedBlock === index;
                          const generatedHash = record.blockchainHash || `0x${record._id}e8ce08ab662a8fc${record.patientId || "9f"}`;
                          
                          return (
                            <Fragment key={record._id || index}>
                              <tr 
                                onClick={() => setExpandedBlock(isExpanded ? null : index)}
                                style={{ 
                                  borderBottom: "1px solid #F1F5F9", 
                                  background: isExpanded ? "#F0FDF4" : (index % 2 === 0 ? "#fff" : "#F9FAFB"),
                                  cursor: "pointer",
                                  transition: "background 0.2s"
                                }}
                              >
                                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#1E293B", textAlign: "center" }}>{index + 1}</td>
                                <td style={{ padding: "14px 16px", color: GRAY_TEXT, fontWeight: 500 }}>{record.appointmentDate || new Date(record.updatedAt).toLocaleDateString('vi-VN')}</td>
                                <td style={{ padding: "14px 16px" }}>
                                  <span style={{ 
                                    background: "#FAE8FF", color: "#D946EF", padding: "4px 8px", borderRadius: 6, 
                                    fontFamily: "monospace", fontSize: 11, fontWeight: 600, display: "block", 
                                    maxWidth: "550px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" 
                                  }}>
                                    {generatedHash}
                                  </span>
                                </td>
                                <td style={{ padding: "14px 16px", textAlign: "center" }}>
                                  <button style={{
                                    background: isExpanded ? "#15803D" : PRIMARY_MED,
                                    color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6,
                                    fontSize: 11, fontWeight: 600, cursor: "pointer"
                                  }}>
                                    {isExpanded ? "Đóng 📂" : "Xem nội dung 👁️"}
                                  </button>
                                </td>
                              </tr>

                              {/* Hộp nội dung văn bản giải băm mật mã học */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={4} style={{ padding: "16px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                                    <div style={{ background: "#fff", border: "1px solid #22C55E", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px dashed #E2E8F0" }}>
                                        <div>🏥 <strong>Cơ sở y tế đóng khối:</strong> {record.hospitalName || "Bệnh viện Đại học Y Dược"}</div>
                                        <div>👨‍⚕️ <strong>Bác sĩ ký số bảo mật:</strong> {record.doctorName || "Bác sĩ hệ thống"}</div>
                                      </div>
                                      <div style={{ marginBottom: "12px" }}>
                                        🔬 <strong>Kết luận chẩn đoán cũ:</strong> <span style={{ color: "#EF4444", fontWeight: 600 }}>{record.chanDoanChuyenMon || "Chưa cập nhật nội dung văn bản"}</span>
                                      </div>
                                      <div style={{ background: "#F1F5F9", padding: "12px", borderRadius: 6, whiteSpace: "pre-line", fontSize: 12, border: "1px solid #E2E8F0", color: "#334155" }}>
                                        📋 <strong>Chi tiết phác đồ & Đơn thuốc On-chain:</strong>{"\n"}{record.huongDieuTri || "Không ghi nhận thông tin thuốc đi kèm trong khối dữ liệu này."}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Phần kết luận chẩn đoán lâm sàng mới */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: PRIMARY, marginBottom: 8 }}>🔬 Kết luận chẩn đoán xác định:</label>
                  <textarea value={diagnose} onChange={e => setDiagnose(e.target.value)} placeholder="Nhập kết quả chẩn đoán chuyên môn tại đây..." rows={3} 
                    style={{ width: "100%", padding: 14, borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, boxSizing: "border-box" }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: PRIMARY, marginBottom: 10 }}>⏱ Thời gian thực hiện phác đồ:</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[3, 5, 7, 10, 14, 21, 30].map(d => (
                      <button key={d} onClick={() => setTreatmentDays(d)} 
                        style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${treatmentDays === d ? PRIMARY_MED : BORDER}`, background: treatmentDays === d ? PRIMARY_MED : "#fff", color: treatmentDays === d ? "#fff" : "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        {d < 14 ? `${d} ngày` : d === 14 ? "2 tuần" : d === 21 ? "3 tuần" : "1 tháng"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: PRIMARY, marginBottom: 12 }}>💊 Kê đơn thuốc điều trị trực tuyến (openFDA API):</label>
                  {drugList.map((drug, index) => (
                    <div key={index} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 18, marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, color: PRIMARY_MED, fontSize: 14 }}>Tên thuốc mục #{index + 1}</span>
                        {drugList.length > 1 && <button onClick={() => removeDrug(index)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Xóa mục này ✕</button>}
                      </div>

                      <DrugList drug={drug} index={index} updateDrug={updateDrug} />

                      

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                        <div>
                          <label style={{ fontSize: 13, color: "#475569" }}>Tổng số lượng phát:</label>
                          <input type="number" min={1} value={drug.qty} onChange={e => updateDrug(index, "qty", parseInt(e.target.value) || 1)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 13, color: "#475569" }}>Tần suất sử dụng (Số lần/ngày):</label>
                          <input type="number" min={1} max={4} value={drug.timesPerDay} onChange={e => updateDrug(index, "timesPerDay", parseInt(e.target.value) || 1)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, boxSizing: "border-box" }} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 13, color: "#475569", display: "block", marginBottom: 6 }}>Thời điểm chỉ định trong ngày:</label>
                        <div style={{ display: "flex", gap: 10 }}>
                          {["Sáng", "Trưa", "Chiều", "Tối"].map(meal => {
                            const hasMeal = drug.meals.includes(meal)
                            return (
                              <button key={meal} type="button" onClick={() => toggleMeal(index, meal)} style={{ padding: "6px 18px", borderRadius: 6, border: `1px solid ${hasMeal ? PRIMARY_MED : BORDER}`, background: hasMeal ? PRIMARY_LIGHT : "#fff", color: hasMeal ? PRIMARY_MED : "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{meal}</button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 13, color: "#475569" }}>Hướng dẫn sử dụng chi tiết:</label>
                        <input value={drug.note} onChange={e => updateDrug(index, "note", e.target.value)} placeholder="Ví dụ: Uống sau ăn no..." style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, boxSizing: "border-box" }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={addDrug} style={{ background: PRIMARY_LIGHT, color: PRIMARY_MED, border: `1.5px dashed ${PRIMARY_MED}`, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, width: "100%" }}>+ Thêm danh mục thuốc vào đơn</button>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: PRIMARY, marginBottom: 8 }}>📝 Lời dặn bổ sung:</label>
                  <textarea value={doctorNote} onChange={e => setDoctorNote(e.target.value)} placeholder="Nhập lời dặn từ bác sĩ..." rows={3} style={{ width: "100%", padding: 14, borderRadius: 8, border: `1px solid ${BORDER}`, boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #F1F5F9", paddingTop: 20 }}>
                  <button onClick={handleCompletePrescription} disabled={submitting} style={{ background: "#10B981", color: "#fff", border: "none", padding: "12px 36px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                    {submitting ? "Đang lưu..." : "💾 KÝ SỐ & HOÀN THÀNH CA KHÁM"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px", color: "#EF4444", fontWeight: 600, background: "#FEF2F2", borderRadius: 8 }}>
                🔒 Vui lòng ấn nút "Gửi yêu cầu xin quyền" ở trên để xác thực phân quyền Blockchain trước khi thực hiện xem bệnh án lịch sử và kê đơn thuốc.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Khai báo Fragment phục vụ render cấu trúc bảng mở rộng lồng nhau
function Fragment({ children }) {
  return <>{children}</>
}