import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { DatePicker } from 'antd';
import locale from 'antd/es/date-picker/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const WHITE = "#FFFFFF"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"

const BASE_URL = "https://victorious-commitment-production-250c.up.railway.app/api/v1"

// ✅ Payment contract address trên Sepolia
const PAYMENT_CONTRACT_ADDRESS = "0x1f2db9bc029a2d2851ba25241f6cb0c06a21bdcc1d1e4cfe364f1cdcdb614f05"

// ✅ ABI chỉ lấy hàm payInvoice cần thiết
const PAYMENT_ABI = [
  {
    "inputs": [{ "internalType": "string", "name": "invoiceId", "type": "string" }],
    "name": "payInvoice",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
]

export default function PatientDashboard() {
  const navigate = useNavigate()
  const fullName = localStorage.getItem("fullName") || "Bệnh nhân"
  const userId = localStorage.getItem("userId")
  const token = localStorage.getItem("token")

  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("info")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState("")
  const [error, setError] = useState("")

  const [historyList, setHistoryList] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeStatFilter, setActiveStatFilter] = useState("all")

  // ✅ State hóa đơn
  const [invoiceList, setInvoiceList] = useState([])
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [invoiceError, setInvoiceError] = useState("")
  const [invoiceSuccess, setInvoiceSuccess] = useState("")

  const [formBasic, setFormBasic] = useState({
    fullName: "", dob: "", gender: "", phone: "", address: ""
  })

  const [formHealth, setFormHealth] = useState({
    nhomMau: "", tienSuBenh: "", diUng: "", trieuChung: "", ghiChu: ""
  })

  const [formAppointment, setFormAppointment] = useState({
    specialty: "Nội khoa",
    date: null,
    reason: ""
  })

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/patients/${userId}`, { headers })
        const data = await res.json()
        if (data.success) {
          const d = data.data
          setPatient(d)
          setFormBasic({
            fullName: d.fullName || "",
            dob: d.dob ? d.dob.substring(0, 10) : "",
            gender: d.gender || "",
            phone: d.phone || "",
            address: d.address || "",
          })
          setFormHealth({
            nhomMau: d.nhomMau || "",
            tienSuBenh: d.tienSuBenh || "",
            diUng: d.diUng || "",
            trieuChung: d.trieuChung || "",
            ghiChu: d.ghiChu || "",
          })
        }
      } catch (err) {
        console.log("Lỗi tải thông tin bệnh nhân:", err)
      } finally {
        setLoading(false)
      }
    }

    const loadHistory = async () => {
      try {
        const res = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers })
        const data = await res.json()
        if (data.success) setHistoryList(data.data)
      } catch (err) {
        console.log("Lỗi tải lịch sử:", err)
      } finally {
        setLoadingHistory(false)
      }
    }

    if (userId) { load(); loadHistory() }
    else { setLoading(false); setLoadingHistory(false) }
  }, [userId])

  // ✅ Fetch hóa đơn khi vào tab invoice
  const loadInvoices = async () => {
    setLoadingInvoice(true)
    setInvoiceError("")
    try {
      const res = await fetch(`${BASE_URL}/invoices/my`, { headers })
      const data = await res.json()
      if (data.success) {
        setInvoiceList(data.data || [])
      } else {
        setInvoiceError(data.message || "Không thể tải hóa đơn!")
      }
    } catch {
      setInvoiceError("Lỗi kết nối server!")
    } finally {
      setLoadingInvoice(false)
    }
  }

  useEffect(() => {
    if (tab === "invoice") loadInvoices()
  }, [tab])

  // ✅ Hàm thanh toán bằng MetaMask
  const handlePayWithMetaMask = async (invoice) => {
    setInvoiceError("")
    setInvoiceSuccess("")

    if (!window.ethereum) {
      setInvoiceError("Vui lòng cài đặt MetaMask để thanh toán!")
      return
    }

    try {
      setPayingId(invoice.invoiceId)

      // 1. Kết nối MetaMask
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const walletAddress = accounts[0]

      // 2. Chuyển sang mạng Sepolia nếu chưa đúng
      const chainId = await window.ethereum.request({ method: "eth_chainId" })
      if (chainId !== "0xaa36a7") {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }]
        })
      }

      // 3. Tính amount theo ETH (amount trong DB là ETH)
      const amountInWei = BigInt(Math.round(invoice.amount * 1e18)).toString(16)

      // 4. Encode calldata cho payInvoice(invoiceId)
      const encoder = new TextEncoder()
      const invoiceIdBytes = encoder.encode(invoice.invoiceId)
      
      // Dùng ethers từ window hoặc import động
      // Encode function call thủ công với eth_sendTransaction
      const iface = {
        encodeFunctionData: (name, args) => {
          // Function selector: keccak256("payInvoice(string)") = 0x7c9495b2
          const selector = "7c9495b2"
          // Encode string argument
          const str = args[0]
          const strHex = Array.from(new TextEncoder().encode(str))
            .map(b => b.toString(16).padStart(2, "0")).join("")
          const offset = "0000000000000000000000000000000000000000000000000000000000000020"
          const length = str.length.toString(16).padStart(64, "0")
          const padded = strHex.padEnd(Math.ceil(strHex.length / 64) * 64, "0")
          return "0x" + selector + offset + length + padded
        }
      }

      const data = iface.encodeFunctionData("payInvoice", [invoice.invoiceId])

      // 5. Gửi transaction qua MetaMask
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: PAYMENT_CONTRACT_ADDRESS,
          value: "0x" + amountInWei,
          data: data,
          gas: "0x30D40", // 200000 gas
        }]
      })

      setInvoiceSuccess(`⏳ Đang xử lý giao dịch... TxHash: ${txHash.slice(0, 20)}...`)

      // 6. Chờ transaction confirm (poll 3s x 20 lần)
      let confirmed = false
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try {
          const receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [txHash]
          })
          if (receipt && receipt.status === "0x1") {
            confirmed = true
            break
          }
        } catch {}
      }

      if (!confirmed) {
        setInvoiceError("Giao dịch chưa được xác nhận sau 60 giây. Vui lòng thử lại.")
        return
      }

      // 7. Gọi backend xác nhận
      const res = await fetch(`${BASE_URL}/invoices/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          invoiceId: invoice.invoiceId,
          txHash,
          patientWallet: walletAddress
        })
      })
      const result = await res.json()

      if (result.success) {
        setInvoiceSuccess(`✅ Thanh toán thành công! TxHash: ${txHash.slice(0, 20)}...`)
        await loadInvoices() // reload
      } else {
        setInvoiceError("Lỗi xác nhận từ server: " + (result.message || ""))
      }
    } catch (err) {
      if (err.code === 4001) {
        setInvoiceError("Bạn đã từ chối giao dịch trong MetaMask.")
      } else {
        setInvoiceError("Lỗi thanh toán: " + (err.message || err))
      }
    } finally {
      setPayingId(null)
    }
  }

  const showSuccess = (msg) => {
    setSaveSuccess(msg)
    setTimeout(() => setSaveSuccess(""), 4000)
  }

  const handleSaveBasic = async () => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`${BASE_URL}/patients/${userId}`, {
        method: "PUT", headers, body: JSON.stringify(formBasic)
      })
      const data = await res.json()
      if (data.success) { setPatient(data.data); showSuccess("Cập nhật thông tin cá nhân thành công!"); setTab("info") }
      else setError(data.message || "Cập nhật thất bại!")
    } catch { setError("Lỗi kết nối server!") }
    finally { setSaving(false) }
  }

  const handleSaveHealth = async () => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`${BASE_URL}/patients/${userId}`, {
        method: "PUT", headers, body: JSON.stringify(formHealth)
      })
      const data = await res.json()
      if (data.success) { setPatient(data.data); showSuccess("Cập nhật hồ sơ sức khỏe thành công!"); setTab("info") }
      else setError(data.message || "Cập nhật thất bại!")
    } catch { setError("Lỗi kết nối server!") }
    finally { setSaving(false) }
  }

  const handleBookAppointment = async (e) => {
    e.preventDefault()
    if (!formAppointment.date) { setError("Vui lòng chọn ngày muốn khám bệnh!"); return }
    setSaving(true); setError("")
    try {
      const formattedDate = formAppointment.date.format("YYYY-MM-DD")
      const payloadData = {
        patientId: userId,
        patientName: localStorage.getItem("fullName"),
        specialty: formAppointment.specialty,
        appointmentDate: formattedDate,
        trieuChungLamSang: formAppointment.reason,
      }
      const resRecord = await fetch(`${BASE_URL}/visits`, { method: "POST", headers, body: JSON.stringify(payloadData) })
      const dataRecord = await resRecord.json()
      if (dataRecord.success) {
        const resHistory = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers })
        const dataHistory = await resHistory.json()
        if (dataHistory.success) setHistoryList(dataHistory.data)
        showSuccess("Đăng ký lịch khám bệnh thành công!")
        setFormAppointment({ specialty: "Nội khoa", date: null, reason: "" })
        setTab("info")
      } else setError(dataRecord.message || "Lỗi tạo phiếu khám bệnh!")
    } catch { setError("Lỗi kết nối đến máy chủ!") }
    finally { setSaving(false) }
  }

  const handleLogout = () => { localStorage.clear(); navigate("/") }

  const handleStatCardClick = (filterType) => {
    setActiveStatFilter(filterType); setTab("info")
    setTimeout(() => {
      const element = document.getElementById("medical-history-section")
      if (element) element.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: `1.5px solid ${BORDER}`, fontSize: 14, outline: "none",
    boxSizing: "border-box", background: WHITE, marginTop: 4, color: "#0A2D6E",
  }
  const labelStyle = { fontSize: 13, fontWeight: 500, color: "#374151" }

  const Field = ({ label, value }) => (
    <div style={{ background: PRIMARY_LIGHT, borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: GRAY_TEXT }}>{label}</div>
      <div style={{ fontWeight: 600, color: PRIMARY, marginTop: 2 }}>{value || "—"}</div>
    </div>
  )

  // ✅ Thêm tab Hóa đơn
  const TABS = [
    { key: "info",    label: "📄 Thông tin & Lịch sử" },
    { key: "register",label: "📅 Đăng ký khám" },
    { key: "invoice", label: "💳 Hóa đơn & Thanh toán" },
    { key: "edit",    label: "✏️ Cập nhật" },
    { key: "health",  label: "🏥 Sức khỏe" },
  ]

  const completedList = historyList.filter(r => r.status === "completed")
  const pendingList   = historyList.filter(r => r.status === "pending")

  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Navbar */}
      <div style={{ background: PRIMARY, color: WHITE, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🏥 VNmedID — Bệnh nhân</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14 }}>👤 {fullName}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: WHITE, padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ padding: "32px" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: PRIMARY, margin: 0 }}>Xin chào, {fullName} 👋</h2>
          <p style={{ color: GRAY_TEXT, marginTop: 4 }}>Đây là trang quản lý thông tin sức khỏe và lịch sử khám bệnh của bạn</p>
        </div>

        {/* Thống kê */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          {[
            { id: "luotKham", icon: "📋", label: "Lượt đã khám",   value: loadingHistory ? "..." : completedList.length },
            { id: "choKham",  icon: "⏳", label: "Đang chờ khám",  value: loadingHistory ? "..." : pendingList.length },
            { id: "donThuoc", icon: "💊", label: "Có đơn thuốc",   value: loadingHistory ? "..." : completedList.filter(r => r.huongDieuTri).length },
          ].map(card => {
            const isSelected = activeStatFilter === card.id
            return (
              <div key={card.id} onClick={() => handleStatCardClick(card.id)} style={{
                background: WHITE, borderRadius: 14, padding: "24px",
                boxShadow: isSelected ? `0 0 0 2px ${PRIMARY_MED}, 0 4px 20px rgba(26,79,168,0.15)` : "0 2px 12px rgba(0,0,0,0.07)",
                cursor: "pointer", transition: "all 0.2s ease", transform: isSelected ? "scale(1.02)" : "scale(1)"
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: PRIMARY }}>{card.value}</div>
                <div style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 4 }}>{card.label}</div>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div style={{ background: WHITE, borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, overflowX: "auto" }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => { setTab(key); setError(""); setActiveStatFilter("all") }} style={{
                padding: "14px 20px", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap",
                fontSize: 14, fontWeight: tab === key ? 600 : 400,
                color: tab === key ? PRIMARY : GRAY_TEXT,
                borderBottom: tab === key ? `2px solid ${PRIMARY}` : "2px solid transparent",
              }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {saveSuccess && (
              <div style={{ background: "#E6F9F0", color: "#0F6E56", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>
                ✅ {saveSuccess}
              </div>
            )}
            {error && (
              <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>
                ❌ {error}
              </div>
            )}

            {/* ===== TAB: THÔNG TIN ===== */}
            {tab === "info" && (
              loading ? <div style={{ textAlign: "center", padding: 20, color: GRAY_TEXT }}>Đang tải...</div> : (
                <>
                  <h4 style={{ color: PRIMARY, marginTop: 0 }}>Thông tin cơ bản</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <Field label="Họ tên" value={patient?.fullName} />
                    <Field label="Ngày sinh" value={patient?.dob?.substring(0, 10)} />
                    <Field label="Giới tính" value={patient?.gender === "Male" ? "Nam" : patient?.gender === "Female" ? "Nữ" : patient?.gender} />
                    <Field label="Số điện thoại" value={patient?.phone} />
                    <Field label="CCCD" value={patient?.citizenId} />
                    <Field label="Địa chỉ" value={patient?.address} />
                  </div>

                  <h4 style={{ color: PRIMARY }}>Hồ sơ sức khỏe</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                    <Field label="Nhóm máu" value={patient?.nhomMau} />
                    <Field label="Dị ứng" value={patient?.diUng} />
                    <Field label="Tiền sử bệnh" value={patient?.tienSuBenh} />
                    <Field label="Triệu chứng lâm sàng ban đầu" value={patient?.trieuChungLamSang} />
                    <Field label="Ghi chú hệ thống" value={patient?.ghiChu} />
                  </div>

                  <div id="medical-history-section" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h4 style={{ color: PRIMARY, margin: 0 }}>
                        {activeStatFilter === "luotKham" && "📋 Lịch sử các ca đã khám"}
                        {activeStatFilter === "choKham"  && "⏳ Lịch hẹn đang chờ khám"}
                        {activeStatFilter === "donThuoc" && "💊 Đơn thuốc điện tử"}
                        {activeStatFilter === "all"      && "📜 Toàn bộ lịch sử khám bệnh"}
                      </h4>
                      {activeStatFilter !== "all" && (
                        <button onClick={() => setActiveStatFilter("all")}
                          style={{ background: PRIMARY_LIGHT, border: "none", color: PRIMARY, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Hiển thị tất cả
                        </button>
                      )}
                    </div>

                    {loadingHistory ? (
                      <div style={{ fontSize: 13, color: GRAY_TEXT }}>Đang đồng bộ bệnh án...</div>
                    ) : historyList.length === 0 ? (
                      <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                        Bạn chưa có lịch khám nào trên hệ thống VNmedID.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {historyList.filter(record => {
                          if (activeStatFilter === "luotKham") return record.status === "completed"
                          if (activeStatFilter === "choKham")  return record.status === "pending"
                          if (activeStatFilter === "donThuoc") return record.huongDieuTri
                          return true
                        }).map((record, index, filteredArr) => (
                          <div key={record._id || index} style={{ background: "#F8FAFC", borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
                              <span style={{ fontWeight: 700, color: PRIMARY }}>Ca khám #{filteredArr.length - index}</span>
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <span style={{
                                  fontSize: 12, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                                  background: record.status === "completed" ? "#D1FAE5" : "#FEF3C7",
                                  color: record.status === "completed" ? "#065F46" : "#D97706"
                                }}>
                                  {record.status === "completed" ? "✅ Đã khám" : "⏳ Chờ khám"}
                                </span>
                                <span style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: 500 }}>
                                  🗓️ {record.appointmentDate || (record.updatedAt ? new Date(record.updatedAt).toLocaleDateString('vi-VN') : "---")}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, fontSize: 14 }}>
                              <div><strong>Chuyên khoa:</strong> {record.specialty || "Tổng quát"}</div>
                              {record.doctorName && <div><strong>Bác sĩ phụ trách:</strong> BS. {record.doctorName}</div>}
                              <div><strong>Triệu chứng báo trước:</strong> {record.trieuChungLamSang || "Không điền triệu chứng"}</div>
                              {record.status === "completed" && (
                                <>
                                  <div style={{ marginTop: 4 }}>
                                    <strong>Chẩn đoán lâm sàng:</strong>{" "}
                                    <span style={{ color: PRIMARY, fontWeight: 600 }}>{record.chanDoanChuyenMon || "---"}</span>
                                  </div>
                                  <div style={{ whiteSpace: "pre-wrap", background: WHITE, padding: "12px", borderRadius: 6, border: `1px solid ${BORDER}`, marginTop: 6, fontSize: 13, color: "#1E293B" }}>
                                    <strong style={{ color: PRIMARY_MED }}>💊 Đơn thuốc & Hướng điều trị:</strong><br />
                                    {record.huongDieuTri || "Không có đơn thuốc."}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            )}

            {/* ===== TAB: ĐĂNG KÝ KHÁM ===== */}
            {tab === "register" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 20 }}>Đặt lịch hẹn khám trực tuyến</h4>
                <form onSubmit={handleBookAppointment}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Chọn Chuyên Khoa Phù Hợp</label>
                    <select value={formAppointment.specialty}
                      onChange={e => setFormAppointment(p => ({ ...p, specialty: e.target.value }))}
                      style={inputStyle}>
                      <option value="Nội khoa">Nội khoa tổng quát</option>
                      <option value="Ngoại khoa">Ngoại khoa chuyên sâu</option>
                      <option value="Nhi khoa">Nhi khoa (Trẻ em)</option>
                      <option value="Sản phụ khoa">Sản phụ khoa</option>
                      <option value="Tai Mũi Họng">Tai Mũi Họng</option>
                      <option value="Răng Hàm Mặt">Răng Hàm Mặt</option>
                      <option value="Da liễu">Da liễu</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Chọn Ngày Muốn Khám</label>
                    <div style={{ marginTop: 4 }}>
                      <DatePicker locale={locale} format="DD/MM/YYYY" placeholder="Chọn ngày khám"
                        value={formAppointment.date}
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                        onChange={dateObj => setFormAppointment(p => ({ ...p, date: dateObj }))}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, color: "#0A2D6E", height: "41px" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Lý do khám / Triệu chứng lâm sàng</label>
                    <textarea value={formAppointment.reason}
                      onChange={e => setFormAppointment(p => ({ ...p, reason: e.target.value }))}
                      placeholder="VD: Đau đầu dai dẳng, sốt nhẹ về chiều..." rows={4}
                      style={{ ...inputStyle, resize: "vertical" }} required />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="submit" disabled={saving} style={{
                      padding: "11px 28px", borderRadius: 8, border: "none",
                      background: saving ? "#93B8E8" : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
                      color: WHITE, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer"
                    }}>
                      {saving ? "Đang xử lý..." : "📅 Xác nhận đăng ký"}
                    </button>
                    <button type="button" onClick={() => setTab("info")} style={{
                      padding: "11px 24px", borderRadius: 8, border: `1.5px solid ${BORDER}`,
                      background: WHITE, fontSize: 14, cursor: "pointer", color: GRAY_TEXT
                    }}>Hủy bỏ</button>
                  </div>
                </form>
              </div>
            )}

            {/* ===== TAB: HÓA ĐƠN & THANH TOÁN ===== */}
            {tab === "invoice" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h4 style={{ color: PRIMARY, margin: 0 }}>💳 Hóa đơn & Thanh toán Blockchain</h4>
                  <button onClick={loadInvoices} disabled={loadingInvoice} style={{
                    background: PRIMARY_LIGHT, color: PRIMARY_MED, border: `1px solid ${PRIMARY_MED}`,
                    padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600
                  }}>
                    {loadingInvoice ? "Đang tải..." : "🔄 Làm mới"}
                  </button>
                </div>

                {/* Thông báo */}
                {invoiceError && (
                  <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>
                    ❌ {invoiceError}
                  </div>
                )}
                {invoiceSuccess && (
                  <div style={{ background: "#E6F9F0", color: "#0F6E56", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, wordBreak: "break-all" }}>
                    {invoiceSuccess}
                  </div>
                )}

                {/* Hướng dẫn */}
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#1E40AF" }}>
                  <strong>ℹ️ Hướng dẫn thanh toán:</strong> Bấm "Thanh toán bằng MetaMask" → Xác nhận giao dịch trên ví → Hệ thống sẽ tự động xác nhận sau khi blockchain confirm.
                  Đảm bảo ví MetaMask đang kết nối mạng <strong>Sepolia Testnet</strong> và có đủ SepoliaETH.
                </div>

                {/* Danh sách hóa đơn */}
                {loadingInvoice ? (
                  <div style={{ textAlign: "center", padding: 40, color: GRAY_TEXT }}>Đang tải hóa đơn...</div>
                ) : invoiceList.length === 0 ? (
                  <div style={{ background: "#F8FAFC", padding: "32px", borderRadius: 10, textAlign: "center", color: GRAY_TEXT, fontSize: 14, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                    Bạn chưa có hóa đơn nào. Hóa đơn sẽ được tạo sau khi khám xong.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {invoiceList.map((invoice) => (
                      <div key={invoice.invoiceId} style={{
                        background: invoice.paymentStatus === "paid" ? "#F0FDF4" : WHITE,
                        borderRadius: 12, padding: "20px 24px",
                        border: `1.5px solid ${invoice.paymentStatus === "paid" ? "#86EFAC" : BORDER}`,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: PRIMARY, fontSize: 16, marginBottom: 6 }}>
                              Hóa đơn #{invoice.invoiceId}
                            </div>
                            <div style={{ fontSize: 13, color: GRAY_TEXT, marginBottom: 4 }}>
                              💰 Số tiền: <strong style={{ color: PRIMARY, fontSize: 15 }}>{invoice.amount} ETH</strong>
                              <span style={{ color: GRAY_TEXT, fontSize: 12 }}> (≈ {(invoice.amount * 3500).toLocaleString('vi-VN')} VNĐ)</span>
                            </div>
                            {invoice.txHash && (
                              <div style={{ fontSize: 12, color: GRAY_TEXT, marginTop: 4 }}>
                                🔗 TxHash:{" "}
                                <a href={`https://sepolia.etherscan.io/tx/${invoice.txHash}`} target="_blank" rel="noreferrer"
                                  style={{ color: PRIMARY_MED, textDecoration: "none", wordBreak: "break-all" }}>
                                  {invoice.txHash.slice(0, 30)}...
                                </a>
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: GRAY_TEXT, marginTop: 4 }}>
                              🕐 Ngày tạo: {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('vi-VN') : "---"}
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                            {/* Badge trạng thái */}
                            <span style={{
                              fontSize: 13, padding: "4px 14px", borderRadius: 20, fontWeight: 600,
                              background: invoice.paymentStatus === "paid" ? "#D1FAE5" : invoice.paymentStatus === "failed" ? "#FEE2E2" : "#FEF3C7",
                              color: invoice.paymentStatus === "paid" ? "#065F46" : invoice.paymentStatus === "failed" ? "#991B1B" : "#D97706"
                            }}>
                              {invoice.paymentStatus === "paid" ? "✅ Đã thanh toán" : invoice.paymentStatus === "failed" ? "❌ Thất bại" : "⏳ Chờ thanh toán"}
                            </span>

                            {/* Nút thanh toán */}
                            {invoice.paymentStatus !== "paid" && (
                              <button
                                onClick={() => handlePayWithMetaMask(invoice)}
                                disabled={payingId === invoice.invoiceId}
                                style={{
                                  display: "flex", alignItems: "center", gap: 8,
                                  background: payingId === invoice.invoiceId ? "#93B8E8" : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
                                  color: WHITE, border: "none", padding: "10px 20px", borderRadius: 8,
                                  cursor: payingId === invoice.invoiceId ? "not-allowed" : "pointer",
                                  fontSize: 14, fontWeight: 600, boxShadow: "0 2px 8px rgba(10,45,110,0.3)"
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 35 33" fill="none">
                                  <path d="M32.958 1L19.41 10.692l2.519-5.937L32.958 1z" fill="#E2761B"/>
                                  <path d="M2.025 1l13.435 9.784-2.4-5.937L2.025 1z" fill="#E4761B"/>
                                </svg>
                                {payingId === invoice.invoiceId ? "Đang xử lý..." : "Thanh toán bằng MetaMask"}
                              </button>
                            )}

                            {invoice.paymentStatus === "paid" && (
                              <a href={`https://sepolia.etherscan.io/tx/${invoice.txHash}`} target="_blank" rel="noreferrer"
                                style={{ fontSize: 13, color: PRIMARY_MED, textDecoration: "none", fontWeight: 600 }}>
                                🔍 Xem trên Etherscan
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB: CẬP NHẬT ===== */}
            {tab === "edit" && (
              <div style={{ maxWidth: 600 }}>
                {[
                  { label: "Họ tên",         field: "fullName", type: "text" },
                  { label: "Ngày sinh",       field: "dob",      type: "date" },
                  { label: "Số điện thoại",   field: "phone",    type: "text" },
                  { label: "Địa chỉ",         field: "address",  type: "text" },
                ].map(({ label, field, type }) => (
                  <div key={field} style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} value={formBasic[field]}
                      onChange={e => setFormBasic(p => ({ ...p, [field]: e.target.value }))}
                      style={inputStyle} />
                  </div>
                ))}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Giới tính</label>
                  <select value={formBasic.gender} onChange={e => setFormBasic(p => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                    <option value="">-- Chọn --</option>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={handleSaveBasic} disabled={saving} style={{
                    padding: "10px 24px", borderRadius: 8, border: "none",
                    background: saving ? "#93B8E8" : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
                    color: WHITE, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer"
                  }}>
                    {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
                  </button>
                  <button onClick={() => setTab("info")} style={{ padding: "10px 24px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: WHITE, fontSize: 14, cursor: "pointer", color: GRAY_TEXT }}>Huỷ</button>
                </div>
              </div>
            )}

            {/* ===== TAB: SỨC KHỎE ===== */}
            {tab === "health" && (
              <div style={{ maxWidth: 600 }}>
                {[
                  { label: "Nhóm máu",             field: "nhomMau",    placeholder: "A, B, AB, O..." },
                  { label: "Tiền sử bệnh",          field: "tienSuBenh", placeholder: "VD: Tiểu đường, cao huyết áp..." },
                  { label: "Dị ứng",                field: "diUng",      placeholder: "VD: Penicillin, hải sản..." },
                  { label: "Triệu chứng nền lâu dài",field: "trieuChung",placeholder: "Mô tả triệu chứng..." },
                  { label: "Ghi chú thêm",          field: "ghiChu",     placeholder: "Ghi chú thêm..." },
                ].map(({ label, field, placeholder }) => (
                  <div key={field} style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>{label}</label>
                    <textarea value={formHealth[field]}
                      onChange={e => setFormHealth(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={placeholder} rows={2}
                      style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={handleSaveHealth} disabled={saving} style={{
                    padding: "10px 24px", borderRadius: 8, border: "none",
                    background: saving ? "#93B8E8" : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
                    color: WHITE, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer"
                  }}>
                    {saving ? "Đang lưu..." : "💾 Lưu hồ sơ sức khỏe"}
                  </button>
                  <button onClick={() => setTab("info")} style={{ padding: "10px 24px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: WHITE, fontSize: 14, cursor: "pointer", color: GRAY_TEXT }}>Huỷ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}