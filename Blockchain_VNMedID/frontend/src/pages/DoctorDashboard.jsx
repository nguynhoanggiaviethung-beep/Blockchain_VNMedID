import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosOriginal from 'axios'

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"

export default function DoctorDashboard() {
  const navigate = useNavigate()

  // Khởi tạo thông tin bác sĩ dự phòng từ localStorage nếu API lỗi
  const [doctorInfo, setDoctorInfo] = useState({
    fullName: localStorage.getItem("fullName") || "Bác sĩ hệ thống",
    specialty: localStorage.getItem("chuyenKhoa") || "Da liễu",
    licenseNumber: localStorage.getItem("maBacSi") || "BS-123450"
  });

  const [patientList, setPatientList] = useState([])
  const [loading, setLoading] = useState(true)

  // Bộ lọc Ngày làm việc của Bác sĩ: Mặc định lấy ngày hôm nay (Định dạng YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // ================= STATE CHO HỒ SƠ BỆNH ÁN =================
  const [selectedPatient, setSelectedPatient] = useState(null) // Bệnh nhân được chọn khám
  const [diagnose, setDiagnose] = useState('')                 // Nội dung chẩn đoán
  const [prescription, setPrescription] = useState('')         // Nội dung đơn thuốc
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
      navigate("/");
      return;
    }

    // 1. Lấy thông tin chi tiết bác sĩ từ API
    const fetchDoctorProfile = async () => {
      let currentSpecialty = doctorInfo.specialty;

      try {
        const response = await axiosOriginal.get(`http://localhost:5000/api/v1/doctors/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response?.data?.success && response?.data?.data) {
          const d = response.data.data;
          currentSpecialty = d?.["Chuyên Khoa"] || d?.specialty || currentSpecialty;
          
          setDoctorInfo({
            fullName: d?.["Họ và tên"] || d?.fullName || localStorage.getItem("fullName") || "Nguyễn Hoàng",
            specialty: currentSpecialty,
            licenseNumber: d?.["Giấy phép hành nghề"] || d?.licenseNumber || localStorage.getItem("maBacSi") || "BS-123450"
          });
        }
      } catch (error) {
        console.warn("⚠️ Không tìm thấy hồ sơ bác sĩ riêng biệt, sử dụng dữ liệu mặc định.");
      } finally {
        // Đồng bộ tải dữ liệu theo Chuyên khoa và Ngày đang chọn
        await fetchRealPatients(currentSpecialty, token, selectedDate);
      }
    };

    // 2. Hàm lấy danh sách bệnh nhân từ DB (Đã lọc theo khoa và đồng bộ xử lý Ngày hẹn)
    const fetchRealPatients = async (specialtyName, userToken, dateQuery) => {
      try {
        setLoading(true);
        const response = await axiosOriginal.get(`http://localhost:5000/api/v1/medical-records/doctor/pending`, {
          headers: { Authorization: `Bearer ${userToken}` },
          params: { specialty: specialtyName }
        });
        
        if (response?.data?.success && response.data.data) {
          // Lọc dữ liệu thô từ backend khớp chính xác với ngày đặt lịch (appointmentDate)
          const filteredByDate = response.data.data.filter(p => {
            if (!p.appointmentDate) return false;
            // Chuẩn hóa chuỗi ngày để so sánh chính xác YYYY-MM-DD
            const pDate = p.appointmentDate.trim();
            return pDate === dateQuery;
          });
          setPatientList(filteredByDate); 
        }
      } catch (error) {
        console.error("Lỗi lấy danh sách bệnh nhân thực tế:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [navigate, selectedDate]); // Tự động load lại danh sách khi Bác sĩ đổi ngày trên giao diện

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // ================= HÀM XỬ LÝ LƯU HỒ SƠ BỆNH ÁN =================
  const handleCompletePrescription = async () => {
    if (!diagnose.trim() || !prescription.trim()) {
      alert("Vui lòng nhập đầy đủ Chẩn đoán bệnh và Đơn thuốc chỉ định!");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axiosOriginal.post(`http://localhost:5000/api/v1/medical-records/complete`, {
        recordId: selectedPatient._id,
        diagnose: diagnose,
        prescription: prescription,
        doctorName: doctorInfo.fullName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert("🎉 Đã lưu lượt khám và hồ sơ bệnh án thành công vào MongoDB!");
        setPatientList(prev => prev.filter(p => p._id !== selectedPatient._id));
        setSelectedPatient(null);
        setDiagnose('');
        setPrescription('');
      }
    } catch (error) {
      alert("Lỗi hệ thống khi lưu bệnh án: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, color: "#fff", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🏥 VNmedID — Bác sĩ</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14 }}>🩺 Chào, {doctorInfo.fullName}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ padding: "32px" }}>
        {/* Lời chào */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: PRIMARY, margin: 0 }}>Xin chào, BS. {doctorInfo.fullName} 👋</h2>
          <p style={{ color: GRAY_TEXT, marginTop: 4, fontSize: 14 }}>
            Chuyên khoa phụ trách: <span style={{ color: PRIMARY_MED, fontWeight: 600 }}>{doctorInfo.specialty}</span> · Số GP hành nghề: <strong>{doctorInfo.licenseNumber}</strong>
          </p>
        </div>

        {/* 3 Ô Thống kê dữ liệu */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          {[
            { icon: "👥", label: "Bệnh nhân trong ngày", value: loading ? "..." : patientList.length },
            { icon: "📋", label: "Hồ sơ đã xử lý thành công", value: "12" },
            { icon: "⏳", label: "Đang xếp hàng chờ", value: loading ? "..." : patientList.length },
          ].map(card => (
            <div key={card.label} style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: PRIMARY }}>{card.value}</div>
              <div style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Bảng phân công */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: PRIMARY, margin: 0 }}>👥 Danh sách tài khoản bệnh nhân thực tế thuộc khoa ({doctorInfo.specialty})</h3>
            
            {/* Bộ chọn ngày trực tiếp trên UI */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: GRAY_TEXT }}>Lịch hẹn ngày:</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  fontSize: 13,
                  color: PRIMARY,
                  fontWeight: 600,
                  outline: "none",
                  background: "#fff",
                  colorScheme: "light"
                }}
              />
              <span style={{ fontSize: 12, background: PRIMARY_LIGHT, color: PRIMARY_MED, padding: "6px 12px", borderRadius: 20, fontWeight: 600 }}>
                Dữ liệu Live DB
              </span>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: PRIMARY_LIGHT }}>
                {["STT", "Họ tên", "Ngày sinh", "Giới tính", "SĐT", "Thời gian hẹn", "Trạng thái khám", "Thao tác"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 13, color: PRIMARY, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: GRAY_TEXT, fontSize: 14 }}>
                    Đang tải danh sách bệnh nhân...
                  </td>
                </tr>
              ) : patientList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: GRAY_TEXT, fontSize: 14, fontStyle: "italic" }}>
                    Chưa có bệnh nhân nào đặt lịch khám khoa {doctorInfo.specialty} vào ngày {selectedDate}.
                  </td>
                </tr>
              ) : (
                patientList.map((p, i) => (
                  <tr key={p._id || i} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFC", borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 700, color: PRIMARY_MED }}>
                      {p.stt ? `#${p.stt}` : `#${i + 1}`}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                      {p.patientName || p.fullName || p["Họ và tên"]}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "#475569" }}>
                      {p.dob || p["Ngày sinh"] ? new Date(p.dob || p["Ngày sinh"]).toLocaleDateString('vi-VN') : "---"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "#475569" }}>
                      {p.gender || p["Giới tính"] || "Chưa cập nhật"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "#475569" }}>
                      {p.phone || p["Số điện thoại"] || "---"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "#0284C7", fontWeight: 600 }}>
                      {p.timeSlot ? `⏰ ${p.timeSlot}` : "---"}
                      {p.appointmentDate && <div style={{ fontSize: 11, color: GRAY_TEXT, fontWeight: 400 }}>{p.appointmentDate}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13 }}>
                      <span style={{ background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>
                        Chờ khám ({doctorInfo.specialty})
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        onClick={() => {
                          setSelectedPatient(p);
                          setDiagnose('');
                          setPrescription('');
                        }}
                        style={{ background: PRIMARY, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                      >
                        Vào khám
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ======================= FORM TẠO HỒ SƠ BỆNH ÁN MVP ======================= */}
        {selectedPatient && (
          <div style={{ marginTop: 32, background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: `1px solid ${PRIMARY_MED}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `2px solid ${PRIMARY_LIGHT}`, paddingBottom: 12 }}>
              <h3 style={{ color: PRIMARY, margin: 0 }}>🩺 Tiến hành khám cho bệnh nhân: <span style={{ color: "#EF4444" }}>{selectedPatient.patientName || selectedPatient.fullName}</span></h3>
              <button 
                onClick={() => setSelectedPatient(null)} 
                style={{ background: "#EF4444", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
              >
                Hủy lượt khám ❌
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: PRIMARY, marginBottom: 6 }}>Chẩn đoán bệnh lý:</label>
                <textarea
                  value={diagnose}
                  onChange={(e) => setDiagnose(e.target.value)}
                  placeholder="Nhập kết quả chẩn đoán lâm sàng..."
                  rows={5}
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: PRIMARY, marginBottom: 6 }}>Đơn thuốc và cách dùng:</label>
                <textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Ghi rõ tên thuốc và liều dùng..."
                  rows={5}
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={handleCompletePrescription}
                disabled={submitting}
                style={{ background: "#10B981", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)" }}
              >
                {submitting ? "Đang ghi nhận..." : "💾 Hoàn thành & Lưu bệnh án"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}