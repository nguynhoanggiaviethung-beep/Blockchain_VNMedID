import { useState, useEffect } from 'react';
import axios from 'axios';

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"
const ERROR = "#E24B4A"
const SUCCESS = "#16A34A"
const SUCCESS_LIGHT = "#DCFCE7"
const WARNING = "#D97706"
const WARNING_LIGHT = "#FEF3C7"
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"

const SHIFT_MAP = {
  morning:   { label: "Sáng",   time: "07:00 – 11:30", icon: "🌅", color: WARNING,    bg: WARNING_LIGHT },
  afternoon: { label: "Chiều",  time: "13:00 – 17:00", icon: "☀️",  color: PRIMARY_MED, bg: PRIMARY_LIGHT },
  evening:   { label: "Tối",    time: "17:30 – 21:00", icon: "🌙", color: "#7C3AED",   bg: "#F5F3FF" },
}

const ShiftBadge = ({ shift }) => {
  const s = SHIFT_MAP[shift] || { label: shift || "—", time: "", icon: "📅", color: GRAY_TEXT, bg: "#F1F5F9" }
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        {s.icon} {s.label}
      </span>
      {s.time && <span style={{ fontSize: 11, color: GRAY_TEXT, marginTop: 2, paddingLeft: 2 }}>{s.time}</span>}
    </div>
  )
}

const DAYS_VI = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]

const toLocalDateString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD}`;
};

export default function AdminSchedule() {
  const token = localStorage.getItem("token")
  const today = new Date() 

  const [schedules, setSchedules] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDoctor, setFilterDoctor] = useState("")
  
  const formattedToday = toLocalDateString(today);

  const [filterDate, setFilterDate] = useState(formattedToday)
  const [filterShift, setFilterShift] = useState("")
  const [viewMode, setViewMode] = useState("table") 

  // Modal tạo mới
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    doctorId: "", date: formattedToday, shift: "morning", 
    room: "101", note: "", status: "active", maxPatients: 9
  })
  const [creating, setCreating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })

  // Modal sửa
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Modal xóa
  const [confirmDelete, setConfirmDelete] = useState(null)

  const getStatusLabel = (shiftDate) => {
    if (!shiftDate) return { label: "Không xác định", bg: "#F1F5F9", color: GRAY_TEXT, icon: "❓" };
    const checkToday = new Date();
    checkToday.setHours(0, 0, 0, 0);
    
    const d = new Date(shiftDate);
    d.setHours(0, 0, 0, 0);

    if (d < checkToday) return { label: "Đã khám", bg: "#F1F5F9", color: GRAY_TEXT, icon: "⏳" };
    if (d.getTime() === checkToday.getTime()) return { label: "Đang khám", bg: SUCCESS_LIGHT, color: SUCCESS, icon: "🔥" };
    return { label: "Chưa khám", bg: PRIMARY_LIGHT, color: PRIMARY_MED, icon: "📅" };
  };

  const fetchSchedules = async () => {
    setLoading(true)
    const params = {}
    if (filterDoctor) params.doctorId = filterDoctor
    if (filterDate) params.date = toLocalDateString(filterDate)
    if (filterShift) params.shift = filterShift
    
    axios.get(`${BASE_URL}/shifts`, {
      headers: { Authorization: `Bearer ${token}` }, params
    })
    .then(res => {
      // Bóc tách linh hoạt cấu trúc data trả về từ API
      const data = res.data?.data?.schedules || res.data?.data || res.data?.shifts || res.data || [];
      setSchedules(Array.isArray(data) ? data : []);
    })
    .catch(err => console.error("Lỗi fetchSchedules:", err))
    .finally(() => setLoading(false))
  }

  // ✅ SỬA ĐỂ KHÔNG BỊ RỖNG DOCTORS: Tự động đoán cấu trúc array của Backend
  const fetchDoctors = () => {
    axios.get(`${BASE_URL}/doctors`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      console.log("Dữ liệu bác sĩ từ API trả về:", res.data); // Xem log ở F12 xem cấu trúc trả về là gì
      
      let rawDocs = [];
      if (Array.isArray(res.data)) {
        rawDocs = res.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        rawDocs = res.data.data;
      } else if (res.data?.data?.doctors && Array.isArray(res.data.data.doctors)) {
        rawDocs = res.data.data.doctors;
      } else if (res.data?.doctors && Array.isArray(res.data.doctors)) {
        rawDocs = res.data.doctors;
      }

      setDoctors(rawDocs);
    })
    .catch(err => {
      console.error("Lỗi nghiêm trọng khi fetchDoctors:", err);
    })
  }

  useEffect(() => { 
    fetchSchedules(); 
    fetchDoctors(); 
  }, [])

 const handleTriggerAutoSchedule = async () => {
    // Bước 1: Hỏi Admin muốn phân ca cho khoa nào
    const inputSpecialty = window.prompt("Nhập Chuyên khoa bạn muốn tự động xếp lịch (Ví dụ: Nội khoa, Răng Hàm Mặt...):", "Nội khoa");
    if (!inputSpecialty) return; // Hủy nếu Admin không nhập

    // Bước 2: Hỏi ngày bắt đầu, gán sẵn ngày hôm nay cho tiện
    const inputStartDate = window.prompt("Nhập ngày bắt đầu chạy lịch (Định dạng YYYY-MM-DD):", formattedToday);
    if (!inputStartDate) return;

    // Bước 3: Xác nhận lần cuối
    if (!window.confirm(`⚡ Xác nhận tự động phân ca cho bác sĩ khoa [${inputSpecialty}] bắt đầu từ ngày [${inputStartDate}]?`)) return;

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/shifts/auto-schedule`, {
        specialty: inputSpecialty,
        startDate: inputStartDate,
        weeks: 4 // Phân ca xoay vòng trong 4 tuần như code backend của bạn
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert(response.data.message || "🎉 Kích hoạt phân ca khám tự động thành công!");
        fetchSchedules(); // Reset lại bảng dữ liệu
      }
    } catch (err) {
      alert("❌ Lỗi kích hoạt xếp lịch: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  

  const handleCreate = async () => {
    if (!createForm.doctorId || !createForm.date) {
      alert("Vui lòng chọn bác sĩ và ngày trực!")
      return
    }

    let selectedDate = toLocalDateString(createForm.date) || formattedToday;
    setCreating(true)

    // TRƯỜNG HỢP TẠO HÀNG LOẠT CHO TẤT CẢ BÁC SĨ
    if (createForm.doctorId === "ALL_DOCTORS") {
      if (!doctors || doctors.length === 0) {
        alert(`Không thể tạo! Hiện tại danh sách bác sĩ trên hệ thống đang trống (Lấy về từ: ${BASE_URL}/doctors). Vui lòng kiểm tra lại data hoặc Token.`);
        setCreating(false)
        return
      }

      setBulkProgress({ current: 0, total: doctors.length })
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < doctors.length; i++) {
        const doc = doctors[i];
        if (!doc || !doc._id) {
          failCount++;
          continue;
        }

        setBulkProgress({ current: i + 1, total: doctors.length })
        
        const batchPayload = {
          doctorId: doc._id,
          date: selectedDate,
          shift: createForm.shift || "morning",
          room: createForm.room || "101",
          note: createForm.note || "",
          status: createForm.status || "active",
          maxPatients: Number(createForm.maxPatients) || 9,
          doctorName: doc.fullName || doc["Họ và tên"] || "Bác sĩ",
          specialty: doc.specialty || doc["Chuyên khoa"] || "Đa khoa"
        };

        try {
          await axios.post(`${BASE_URL}/shifts`, batchPayload, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error("Lỗi tạo lịch cho 1 bác sĩ trong danh sách:", err);
          failCount++;
        }
      }

      alert(`Hoàn thành! Tạo thành công ${successCount} lịch trực. Thất bại: ${failCount}.`);
      setShowCreate(false)
      setCreateForm({ doctorId: "", date: formattedToday, shift: "morning", room: "101", note: "", status: "active", maxPatients: 9 })
      fetchSchedules()
      setCreating(false)
      return;
    }

    // TRƯỜNG HỢP TẠO ĐƠN LẺ MỘT BÁC SĨ
    const currentDoc = doctors.find(d => d._id === createForm.doctorId);
    const singlePayload = {
      doctorId: createForm.doctorId,
      date: selectedDate,
      shift: createForm.shift || "morning",
      room: createForm.room || "101",
      note: createForm.note || "",
      status: createForm.status || "active",
      maxPatients: Number(createForm.maxPatients) || 9,
      doctorName: currentDoc ? (currentDoc.fullName || currentDoc["Họ và tên"]) : "Bác sĩ",
      specialty: currentDoc ? (currentDoc.specialty || currentDoc["Chuyên khoa"]) : "Đa khoa"
    };

    try {
      await axios.post(`${BASE_URL}/shifts`, singlePayload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowCreate(false)
      setCreateForm({ doctorId: "", date: formattedToday, shift: "morning", room: "101", note: "", status: "active", maxPatients: 9 })
      fetchSchedules()
    } catch (err) {
      alert("Lỗi tạo lịch: " + (err.response?.data?.message || err.message))
    } finally { setCreating(false) }
  }

  const openEdit = (s) => {
    if (!s) return;
    let formattedDate = toLocalDateString(s.date);
    setEditTarget(s._id)
    setEditForm({
      doctorId: s.doctorId?._id || s.doctorId || "",
      date: formattedDate,
      shift: s.shift || "morning",
      room: s.room || "",
      note: s.note || "",
      status: s.status || "active",
      maxPatients: s.maxPatients || 9
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatePayload = {
        ...editForm,
        date: toLocalDateString(editForm.date),
        maxPatients: Number(editForm.maxPatients)
      };
      await axios.put(`${BASE_URL}/shifts/${editTarget}`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEditTarget(null)
      fetchSchedules()
    } catch (err) {
      alert("Lỗi cập nhật: " + (err.response?.data?.message || err.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/shifts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConfirmDelete(null)
      fetchSchedules()
    } catch (err) {
      alert("Lỗi xóa: " + (err.response?.data?.message || err.message))
    }
  }

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: `1px solid ${BORDER}`, fontSize: 13, outline: "none",
    boxSizing: "border-box", background: "#F8FAFC", color: "#1E293B"
  }

  const [weekOffset, setWeekOffset] = useState(0)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const getSchedulesForDay = (date) => {
    if (!date) return [];
    const dateStr = toLocalDateString(date);
    return schedules.filter(s => {
      if (!s.date) return false;
      const sDate = toLocalDateString(s.date);
      return sDate === dateStr;
    })
  }

  const stats = {
    total: schedules.length,
    active: schedules.filter(s => s.status === "active").length,
    morning: schedules.filter(s => s.shift === "morning").length,
    afternoon: schedules.filter(s => s.shift === "afternoon").length,
  }

  const FormFields = ({ form, setForm, isEdit = false }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Bác sĩ <span style={{ color: ERROR }}>*</span></label>
        <select value={form.doctorId || ""} onChange={e => setForm({ ...form, doctorId: e.target.value })} style={inputStyle}>
          <option value="">-- Chọn bác sĩ --</option>
          {!isEdit && <option value="ALL_DOCTORS" style={{ fontWeight: "bold", color: PRIMARY_MED }}>🌟 TẤT CẢ BÁC SĨ</option>}
          {doctors.map(d => (
            <option key={d._id} value={d._id}>
              {d.fullName || d["Họ và tên"]} {d.specialty ? `– ${d.specialty}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Ngày trực <span style={{ color: ERROR }}>*</span></label>
        <input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Ca trực</label>
        <select value={form.shift || "morning"} onChange={e => setForm({ ...form, shift: e.target.value })} style={inputStyle}>
          <option value="morning">🌅 Ca sáng (07:00 – 11:30)</option>
          <option value="afternoon">☀️ Ca chiều (13:00 – 17:00)</option>
          <option value="evening">🌙 Ca tối (17:30 – 21:00)</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Phòng khám</label>
        <input type="text" value={form.room || ""} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="VD: Phòng 101..." style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Số BN tối đa (Mỗi bác sĩ)</label>
        <input type="number" value={form.maxPatients || ""} onChange={e => setForm({ ...form, maxPatients: e.target.value })} style={inputStyle} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Trạng thái</label>
        <select value={form.status || "active"} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
          <option value="active">✅ Hoạt động</option>
          <option value="inactive">⛔ Tạm nghỉ</option>
          <option value="full">🔴 Đã đầy</option>
        </select>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Ghi chú</label>
        <input type="text" value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú thêm..." style={inputStyle} />
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: PRIMARY, margin: 0 }}>📅 Quản lý lịch khám</h2>
          <p style={{ color: GRAY_TEXT, marginTop: 4, fontSize: 14 }}>Phân công bác sĩ theo ca và ngày trực</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleTriggerAutoSchedule}
            style={{ background: "#16A34A", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            ⚡ Tự động xếp lịch
          </button>
          <button onClick={() => setShowCreate(true)}
            style={{ background: PRIMARY, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            ＋ Tạo lịch mới
          </button>
        </div>
      </div>

      {/* Cảnh báo nếu fetch bác sĩ thất bại */}
      {doctors.length === 0 && !loading && (
        <div style={{ background: WARNING_LIGHT, color: WARNING, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ⚠️ Cảnh báo: Hiện hệ thống không lấy được danh sách Bác sĩ nào từ API. Vui lòng kiểm tra lại Database Collection `doctors` hoặc log mạng.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Tổng lịch",   value: stats.total,     icon: "📊", color: PRIMARY,     bg: PRIMARY_LIGHT },
          { label: "Đang hoạt động", value: stats.active,  icon: "✅", color: SUCCESS,     bg: SUCCESS_LIGHT },
          { label: "Ca sáng",     value: stats.morning,   icon: "🌅", color: WARNING,     bg: WARNING_LIGHT },
          { label: "Ca chiều",    value: stats.afternoon, icon: "☀️",  color: PRIMARY_MED, bg: PRIMARY_LIGHT },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14, border: `1px solid ${BORDER}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: GRAY_TEXT }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 8, padding: 3, gap: 3 }}>
            {[{ k: "table", label: "≡ Bảng" }, { k: "week", label: "📅 Tuần" }].map(v => (
              <button key={v.k} onClick={() => setViewMode(v.k)}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: viewMode === v.k ? PRIMARY : "transparent",
                  color: viewMode === v.k ? "#fff" : GRAY_TEXT }}>
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 28, background: BORDER }} />
          <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} style={{ ...inputStyle, width: 200, flex: "none" }}>
            <option value="">Tất cả bác sĩ</option>
            {doctors.map(d => (
              <option key={d._id} value={d._id}>{d.fullName || d["Họ và tên"]}</option>
            ))}
          </select>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inputStyle, width: 160, flex: "none" }} />
          <select value={filterShift} onChange={e => setFilterShift(e.target.value)} style={{ ...inputStyle, width: 140, flex: "none" }}>
            <option value="">Tất cả ca</option>
            <option value="morning">🌅 Ca sáng</option>
            <option value="afternoon">☀️ Ca chiều</option>
          </select>
          <button onClick={fetchSchedules} style={{ background: PRIMARY, color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>🔍 Lọc</button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: PRIMARY_LIGHT }}>
                {["STT", "Bác sĩ", "Chuyên khoa", "Ngày trực", "Ca trực", "Phòng", "Trạng thái", "Thao tác"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 13, color: PRIMARY, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: GRAY_TEXT }}>⏳ Đang tải dữ liệu...</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: GRAY_TEXT, fontStyle: "italic" }}>📭 Chưa có lịch trực nào.</td></tr>
              ) : schedules.map((s, i) => {
                const dateObj = s.date ? new Date(s.date) : null
                const dayLabel = dateObj ? DAYS_VI[dateObj.getDay()] : ""
                return (
                  <tr key={s._id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFC", borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: PRIMARY_MED }}>#{i + 1}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{s.doctorId?.fullName || s.doctorName || s.doctorId?.["Họ và tên"] || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {(s.doctorId?.specialty || s.specialty) && (
                        <span style={{ background: PRIMARY_LIGHT, color: PRIMARY_MED, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {s.doctorId?.specialty || s.specialty}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{dateObj ? dateObj.toLocaleDateString("vi-VN") : "—"}</div>
                      {dayLabel && <div style={{ fontSize: 11, color: PRIMARY_MED }}>{dayLabel}</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}><ShiftBadge shift={s.shift} /></td>
                    <td style={{ padding: "12px 14px" }}>{s.room || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {(() => {
                        const stt = getStatusLabel(s.date);
                        return <span style={{ background: stt.bg, color: stt.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{stt.label}</span>
                      })()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(s)} style={{ background: PRIMARY_LIGHT, color: PRIMARY_MED, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️ Sửa</button>
                        <button onClick={() => setConfirmDelete(s)} style={{ background: "#FEE2E2", color: ERROR, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: PRIMARY_LIGHT }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>← Tuần trước</button>
            <span style={{ fontWeight: 700 }}>📅 Tuần {weekDays[0].toLocaleDateString("vi-VN")} – {weekDays[6].toLocaleDateString("vi-VN")}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}>Tuần sau →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {weekDays.map((day, i) => {
              const daySchedules = getSchedulesForDay(day)
              return (
                <div key={i} style={{ borderRight: `1px solid ${BORDER}`, minHeight: 150, padding: 8 }}>
                  <div style={{ textTransform: "uppercase", fontSize: 11, color: GRAY_TEXT, textAlign: "center" }}>{DAYS_VI[day.getDay()]}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, textAlign: "center", color: PRIMARY }}>{day.getDate()}</div>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {daySchedules.map(s => (
                      <div key={s._id} style={{ background: PRIMARY_LIGHT, fontSize: 11, padding: 4, borderRadius: 4, borderLeft: `3px solid ${PRIMARY_MED}` }}>
                        <strong>{s.shift === 'morning' ? 'Sáng' : 'Chiều'}</strong>: {s.doctorId?.fullName || s.doctorName || "Bác sĩ"}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Tạo mới */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560 }}>
            <h3 style={{ color: PRIMARY, marginTop: 0 }}>📅 Tạo lịch trực mới</h3>
            <FormFields form={createForm} setForm={setCreateForm} isEdit={false} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: "9px 20px", borderRadius: 8, background: "#fff" }}>Hủy</button>
              <button onClick={handleCreate} disabled={creating} style={{ padding: "9px 24px", borderRadius: 8, background: PRIMARY, color: "#fff", cursor: "pointer" }}>
                {creating ? "Đang xử lý..." : "✅ Tạo lịch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa */}
      {editTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560 }}>
            <h3 style={{ color: PRIMARY, marginTop: 0 }}>✏️ Chỉnh sửa lịch trực</h3>
            <FormFields form={editForm} setForm={setEditForm} isEdit={true} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setEditTarget(null)} style={{ padding: "9px 20px", borderRadius: 8, background: "#fff" }}>Hủy</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", borderRadius: 8, background: PRIMARY, color: "#fff" }}>
                {saving ? "Đang lưu..." : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400, textAlign: "center" }}>
            <h3>Xác nhận xóa lịch</h3>
            <p>Xóa lịch trực này? Hành động không thể hoàn tác.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "9px 24px", borderRadius: 8 }}>Hủy</button>
              <button onClick={() => handleDelete(confirmDelete._id)} style={{ padding: "9px 24px", borderRadius: 8, background: ERROR, color: "#fff" }}>🗑 Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}