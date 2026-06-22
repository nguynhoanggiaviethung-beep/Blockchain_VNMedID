import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { DatePicker } from 'antd';
import locale from 'antd/es/date-picker/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import axios from 'axios';

dayjs.locale('vi');

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const WHITE = "#FFFFFF"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"

const BASE_URL = "https://blockchainvnmedid-production.up.railway.app/api/v1"

const HOSPITALS = [
  "Bệnh viện Chợ Rẫy",
  "Bệnh viện Đại học Y Dược"
];

const PAYMENT_CONTRACT_ADDRESS = "0xdE36843aa11C06EAfA9f1fca0d463351A87e4BbF"

function encodePayInvoice(invoiceId) {
  const selector = "7c9495b2"
  const strBytes = Array.from(new TextEncoder().encode(invoiceId))
  const offset = "0000000000000000000000000000000000000000000000000000000000000020"
  const length = strBytes.length.toString(16).padStart(64, "0")
  const strHex = strBytes.map(b => b.toString(16).padStart(2, "0")).join("")
  const paddedStr = strHex.padEnd(Math.ceil(strHex.length / 64) * 64, "0")
  return "0x" + selector + offset + length + paddedStr
}

async function forceSelectWallet() {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask!")
  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    })
  } catch (err) {}
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
  return accounts[0]
}

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

  const [blockchainData, setBlockchainData] = useState(null);
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);
  const [blockchainError, setBlockchainError] = useState("");

  const [invoiceList, setInvoiceList] = useState([])
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [invoiceError, setInvoiceError] = useState("")
  const [invoiceSuccess, setInvoiceSuccess] = useState("")
  const [txPending, setTxPending] = useState("")

  const [accessRequests, setAccessRequests] = useState([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [approvingId, setApprovingId] = useState(null)

  const [formBasic, setFormBasic] = useState({
    fullName: "", dob: "", gender: "", phone: "", address: ""
  })
  const [formHealth, setFormHealth] = useState({
    nhomMau: "", tienSuBenh: "", diUng: "", trieuChung: "", ghiChu: ""
  })
  
  const [formAppointment, setFormAppointment] = useState({
    specialty: "Nội khoa", hospitalName: "", date: null, reason: ""
  })

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  }

  const loadBlockchainRecords = async (patientIdentifier) => {
    if (!patientIdentifier) return;
    setLoadingBlockchain(true);
    setBlockchainError("");
    try {
      const res = await axios.get(`${BASE_URL}/medical-records/on-chain/${patientIdentifier}`, { headers });
      if (res.data.success) {
        setBlockchainData(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Blockchain:", err);
      const apiErrorMessage = err.response?.data?.message || err.message;
      setBlockchainError(`Lỗi đồng bộ Blockchain: ${apiErrorMessage}`);
    } finally {
      setLoadingBlockchain(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/patients/${userId}`, { headers })
        const data = await res.json()
        if (data.success) {
          const d = data.data
          setPatient(d)
          setFormBasic({
            fullName: d.fullName || "", dob: d.dob ? d.dob.substring(0, 10) : "",
            gender: d.gender || "", phone: d.phone || "", address: d.address || "",
          })
          setFormHealth({
            nhomMau: d.nhomMau || "", tienSuBenh: d.tienSuBenh || "",
            diUng: d.diUng || "", trieuChung: d.trieuChung || "", ghiChu: d.ghiChu || "",
          })

          if (userId) {
            loadBlockchainRecords(userId);
          }
        }
      } catch (err) { console.log("Lỗi tải thông tin:", err) }
      finally { setLoading(false) }
    }

    const loadHistory = async () => {
      try {
        const res = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers })
        const data = await res.json()
        if (data.success) setHistoryList(data.data)
      } catch (err) { console.log("Lỗi tải lịch sử:", err) }
      finally { setLoadingHistory(false) }
    }

    if (userId) { load(); loadHistory() }
    else { setLoading(false); setLoadingHistory(false) }
  }, [userId])

  const loadInvoices = async () => {
    setLoadingInvoice(true)
    setInvoiceError("")
    try {
      const res = await fetch(`${BASE_URL}/invoices/my`, { headers })
      const data = await res.json()
      if (data.success) setInvoiceList(data.data || [])
      else setInvoiceError(data.message || "Không thể tải hóa đơn!")
    } catch { setInvoiceError("Lỗi kết nối server!") }
    finally { setLoadingInvoice(false) }
  }

  const loadAccessRequests = async () => {
    if (!userId) return
    setLoadingAccess(true)
    try {
      const res = await axios.get(`${BASE_URL}/access/requests/my?patientId=${userId}`, { headers })
      if (res.data.success) {
        setAccessRequests(res.data.data || [])
      }
    } catch (err) {
      console.error("Lỗi tải yêu cầu phân quyền:", err)
    } finally {
      setLoadingAccess(false)
    }
  }

  useEffect(() => {
    if (tab === "invoice") loadInvoices()
    if (tab === "access") loadAccessRequests()
    if (tab === "info" && userId) loadBlockchainRecords(userId)
  }, [tab])

  // Thay thế toàn bộ hàm handlePayWithMetaMask cũ bằng phiên bản chuẩn hóa EVM này:
  const handlePayWithMetaMask = async (invoice) => {
  setInvoiceError("");
  setInvoiceSuccess("");
  setTxPending("");

  if (!window.ethereum) {
    setInvoiceError("Vui lòng cài đặt MetaMask!");
    return;
  }

  try {
    setPayingId(invoice.invoiceId);
    
    // 1. Lấy ví từ MetaMask và LUÔN LUÔN ép về dạng chữ thường nếu cần so sánh, 
    // nhưng hãy đảm bảo ví Admin nhập lúc tạo hóa đơn HOÀN TOÀN TRÙNG KHỚP với ví đang kết nối.
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const walletAddress = accounts[0]; 

    // Đảm bảo bạn đang đăng nhập đúng ví mà Admin đã chỉ định cho hóa đơn này!
    if (invoice.patientWallet && walletAddress.toLowerCase() !== invoice.patientWallet.toLowerCase()) {
      setInvoiceError(`Sai ví! Hóa đơn này dành cho ví ${invoice.patientWallet}. Bạn đang kết nối ví ${walletAddress}`);
      return;
    }

    // 2. Ép giá trị Amount: Đảm bảo invoice.amount từ API trả về khớp chính xác số Wei đã lưu trên Contract
    // Nếu API trả về dạng ETH (ví dụ: 0.05), ta đổi sang Wei.
    // Nếu API trả về sẵn chuỗi Wei từ Contract, hãy dùng thẳng chuỗi đó, không nhân 1e18 nữa.
    const amountWei = BigInt(invoice.amountInWei || Math.round(invoice.amount * 1e18));
    const amountHex = "0x" + amountWei.toString(16);

    // 3. Đóng gói Calldata (Giữ nguyên phần decode chuẩn hóa chuỗi string)
    const selector = "7c9495b2"; 
    const strBytes = Array.from(new TextEncoder().encode(invoice.invoiceId));
    const strHex = strBytes.map(b => b.toString(16).padStart(2, "0")).join("");
    
    const offsetPart = "0000000000000000000000000000000000000000000000000000000000000020";
    const lengthPart = strBytes.length.toString(16).padStart(64, "0");
    const targetLength = Math.ceil(strHex.length / 64) * 64 || 64;
    const contentPart = strHex.padEnd(targetLength, "0");
    
    const finalCalldata = "0x" + selector + offsetPart + lengthPart + contentPart;

    // 4. Gửi giao dịch sang MetaMask
    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{
        from: walletAddress,
        to: PAYMENT_CONTRACT_ADDRESS,
        value: amountHex, // msg.value bắt buộc phải bằng inv.amount
        data: finalCalldata,
        gas: "0x186A0"
      }]
    });

    setTxPending(txHash);
    setInvoiceSuccess("⏳ Giao dịch đang được xử lý trên mạng lưới...");

    // ... (Các bước đợi receipt phía sau giữ nguyên)

  } catch (err) {
    setInvoiceError(err.message || "Giao dịch thất bại");
  } finally {
    setPayingId(null);
  }
};

  const handleApproveRequest = async (request) => {
    setError("")
    setSaveSuccess("")
    
    if (!window.ethereum) {
      setError("Vui lòng cài đặt ví MetaMask để tiến hành ký xác nhận!")
      return
    }

    try {
      setApprovingId(request._id)
      const walletAddress = await forceSelectWallet()

      if (walletAddress.toLowerCase() !== request.patientWallet.toLowerCase()) {
        setError(`Vui lòng đổi ví MetaMask sang đúng địa chỉ ví: ...${request.patientWallet.slice(-6)}`);
        setApprovingId(null);
        return;
      }

      const message = `Toi dong y cap quyen cho bac si ${request.doctorWallet.toLowerCase()} xem ho so cua toi (${request.patientId})`;

      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      })

      showSuccess("Ký thành công! Đang chuyển chữ ký tới hệ thống tổng đài để thực thi On-chain...")

      const res = await axios.post(`${BASE_URL}/access/requests/${request._id}/approve`, { signature }, { headers })

      if (res.data.success) {
        showSuccess(`🎉 Đã duyệt quyền thành công lên Blockchain Sepolia! TxHash: ${res.data.data?.txHash?.slice(0, 20)}...`)
        await loadAccessRequests()
      } else {
        setError(res.data.message || "Xử lý duyệt quyền thất bại!")
      }

    } catch (err) {
      if (err.code === 4001) {
        setError("Bạn đã hủy thao tác ký xác nhận trên MetaMask.")
      } else {
        setError("Lỗi xử lý: " + (err.message || String(err)))
      }
    } finally {
      setApprovingId(null)
    }
  }

  const showSuccess = (msg) => { setSaveSuccess(msg); setTimeout(() => setSaveSuccess(""), 4000) }

  const handleSaveBasic = async () => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`${BASE_URL}/patients/${userId}`, { method: "PUT", headers, body: JSON.stringify(formBasic) })
      const data = await res.json()
      if (data.success) { setPatient(data.data); showSuccess("Cập nhật thông tin cá nhân thành công!"); setTab("info") }
      else setError(data.message || "Cập nhật thất bại!")
    } catch { setError("Lỗi kết nối server!") }
    finally { setSaving(false) }
  }

  const handleSaveHealth = async () => {
    setSaving(true); setError("")
    try {
      const res = await fetch(`${BASE_URL}/patients/${userId}`, { method: "PUT", headers, body: JSON.stringify(formHealth) })
      const data = await res.json()
      if (data.success) { setPatient(data.data); showSuccess("Cập nhật hồ sơ sức khỏe thành công!"); setTab("info") }
      else setError(data.message || "Cập nhật thất bại!")
    } catch { setError("Lỗi kết nối server!") }
    finally { setSaving(false) }
  }

  const handleBookAppointment = async (e) => {
    e.preventDefault()
    if (!formAppointment.hospitalName) { setError("Vui lòng chọn Cơ sở Bệnh viện muốn khám!"); return }
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
        hospitalName: formAppointment.hospitalName
      }
      const resRecord = await fetch(`${BASE_URL}/visits`, { method: "POST", headers, body: JSON.stringify(payloadData) })
      const dataRecord = await resRecord.json()
      if (dataRecord.success) {
        const resHistory = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers })
        const dataHistory = await resHistory.json()
        if (dataHistory.success) setHistoryList(dataHistory.data)
        showSuccess("Đăng ký lịch khám bệnh thành công!")
        setFormAppointment({ specialty: "Nội khoa", hospitalName: "", date: null, reason: "" })
        setTab("info")
      } else setError(dataRecord.message || "Lỗi tạo phiếu khám bệnh!")
    } catch { setError("Lỗi kết nối đến máy chủ!") }
    finally { setSaving(false) }
  }

  const handleLogout = () => { localStorage.clear(); navigate("/") }

  const handleStatCardClick = (filterType) => {
    setActiveStatFilter(filterType); setTab("info")
    setTimeout(() => {
      const el = document.getElementById("medical-history-section")
      if (el) el.scrollIntoView({ behavior: "smooth" })
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

  const TABS = [
    { key: "info",     label: "📄 Thông tin & Lịch sử" },
    { key: "register", label: "📅 Đăng ký khám" },
    { key: "invoice",  label: "💳 Hóa đơn & Thanh toán" },
    { key: "access",   label: "🛡️ Cấp quyền truy cập" },
    { key: "edit",     label: "✏️ Cập nhật" },
    { key: "health",   label: "🏥 Sức khỏe" },
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
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: WHITE, padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Đăng xuất</button>
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
            { id: "luotKham", icon: "📋", label: "Lượt đã khám",  value: loadingHistory ? "..." : completedList.length },
            { id: "choKham",  icon: "⏳", label: "Đang chờ khám", value: loadingHistory ? "..." : pendingList.length },
            { id: "donThuoc", icon: "💊", label: "Có đơn thuốc",  value: loadingHistory ? "..." : completedList.filter(r => r.huongDieuTri).length },
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
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {saveSuccess && <div style={{ background: "#E6F9F0", color: "#0F6E56", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>✅ {saveSuccess}</div>}
            {error && <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>❌ {error}</div>}

            {/* ===== TAB: THÔNG TIN & LỊCH SỬ ===== */}
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
                    <Field label="Địa chỉ ví công khai (Web3 Address)" value={patient?.walletAddress} />
                  </div>
                  
                  <h4 style={{ color: PRIMARY }}>Hồ sơ sức khỏe</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                    <Field label="Nhóm máu" value={patient?.nhomMau} />
                    <Field label="Dị ứng" value={patient?.diUng} />
                    <Field label="Tiền sử bệnh" value={patient?.tienSuBenh} />
                    <Field label="Triệu chứng lâm sàng ban đầu" value={patient?.trieuChungLamSang} />
                    <Field label="Ghi chú hệ thống" value={patient?.ghiChu} />
                  </div>

                  {/* Lịch sử khám bệnh thường (Web2) */}
                  <div id="medical-history-section" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h4 style={{ color: PRIMARY, margin: 0 }}>
                        {activeStatFilter === "luotKham" && "📋 Lịch sử các ca đã khám"}
                        {activeStatFilter === "choKham"  && "⏳ Lịch hẹn đang chờ khám"}
                        {activeStatFilter === "donThuoc" && "💊 Đơn thuốc điện tử"}
                        {activeStatFilter === "all"      && "📜 Toàn bộ lịch sử khám bệnh (MongoDB)"}
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
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
                              {record.hospitalName && <div><strong>Bệnh viện tiếp nhận:</strong> {record.hospitalName}</div>}
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

                  {/* BẢNG XÁC THỰC HỒ SƠ BỆNH ÁN ON-CHAIN */}
                  <div style={{ borderTop: `2px dashed ${BORDER}`, paddingTop: "24px", marginTop: "16px" }}>
                    <h4 style={{ color: "#16A34A", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 8 }}>
                      🔗 🛡️ DANH SÁCH BỆNH ÁN XÁC THỰC ON-CHAIN (SMART CONTRACT)
                    </h4>
                    <p style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 0, marginBottom: 16 }}>
                      Dữ liệu lịch sử băm bất biến được tải thời gian thực trực tiếp từ hàm <code>getPatientRecord</code> trên mạng thử nghiệm Sepolia.
                    </p>

                    {loadingBlockchain ? (
                      <div style={{ fontSize: 13, color: "#16A34A", fontWeight: 500 }}>🔄 Đang đọc dữ liệu thời gian thực từ Smart Contract Sepolia...</div>
                    ) : blockchainError ? (
                      <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "12px", fontSize: 13 }}>⚠️ {blockchainError}</div>
                    ) : !blockchainData || blockchainData.history.length === 0 ? (
                      <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                        ℹ️ Tài khoản này chưa có lịch sử băm bệnh án nào được khởi tạo trên Smart Contract.
                      </div>
                    ) : (
                      <div style={{ background: WHITE, borderRadius: 10, padding: "16px", border: "1px solid #BBF7D0", boxShadow: "0 4px 12px rgba(22,163,74,0.05)" }}>
                        <div style={{ fontSize: 13, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div><strong>Mã định danh bệnh nhân (Patient ID Key):</strong> <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{blockchainData.patientAddress}</code></div>
                          <div><strong>Ví xử lý (Hospital/Doctor Default):</strong> <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{blockchainData.hospitalAddress}</code></div>
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
                          <thead>
                            <tr style={{ background: "#16A34A", color: WHITE, textAlign: "left" }}>
                              <th style={{ padding: "10px 12px", border: "1px solid #E5E7EB" }}>STT</th>
                              <th style={{ padding: "10px 12px", border: "1px solid #E5E7EB" }}>Mốc thời gian (Block Timestamp)</th>
                              <th style={{ padding: "10px 12px", border: "1px solid #E5E7EB" }}>Mã Hash bệnh án bất biến (Record Hash)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {blockchainData.history.map((item) => (
                              <tr key={item.stt} style={{ borderBottom: "1px solid #E5E7EB" }}>
                                <td style={{ padding: "10px 12px", border: "1px solid #E5E7EB", fontWeight: "bold" }}>{item.stt}</td>
                                <td style={{ padding: "10px 12px", border: "1px solid #E5E7EB", color: "#4B5563" }}>{item.time}</td>
                                <td style={{ padding: "10px 12px", border: "1px solid #E5E7EB" }}>
                                  <code style={{ color: "#D946EF", background: "#FDF4FF", padding: "2px 6px", borderRadius: 4, wordBreak: "break-all", fontWeight: 600 }}>
                                    {item.hash}
                                  </code>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                    <label style={labelStyle}>Chọn Cơ sở Bệnh viện khám <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      value={formAppointment.hospitalName} 
                      onChange={e => setFormAppointment(p => ({ ...p, hospitalName: e.target.value }))} 
                      style={inputStyle}
                      required
                    >
                      <option value="">-- Chọn bệnh viện tiếp nhận --</option>
                      {HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Chọn chuyên khoa</label>
                    <select value={formAppointment.specialty} onChange={e => setFormAppointment(p => ({ ...p, specialty: e.target.value }))} style={inputStyle}>
                      <option value="Nội khoa">Nội khoa</option>
                      <option value="Ngoại khoa">Ngoại khoa</option>
                      <option value="Nhi khoa">Nhi khoa</option>
                      <option value="Sản phụ khoa">Sản phụ khoa</option>
                      <option value="Tai Mũi Họng">Tai Mũi Họng</option>
                      <option value="Răng Hàm Mặt">Răng Hàm Mặt</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Chọn ngày khám bệnh <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ marginTop: 4 }}>
                      <DatePicker locale={locale} value={formAppointment.date} onChange={d => setFormAppointment(p => ({ ...p, date: d }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}` }} format="DD/MM/YYYY" disabledDate={current => current && current < dayjs().startOf('day')} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Triệu chứng lâm sàng / Lý do khám</label>
                    <textarea rows={4} value={formAppointment.reason} onChange={e => setFormAppointment(p => ({ ...p, reason: e.target.value }))} style={{ ...inputStyle, resize: "none" }} placeholder="Mô tả ngắn gọn tình trạng sức khỏe hiện tại của bạn..." />
                  </div>
                  <button type="submit" disabled={saving} style={{ background: PRIMARY, color: WHITE, border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>{saving ? "Đang đăng ký..." : "🚀 Xác nhận đặt lịch hẹn"}</button>
                </form>
              </div>
            )}

            {/* ===== 💳 TAB: HÓA ĐƠN & THANH TOÁN (ĐÃ SỬA CHUẨN HIỂN THỊ THUỐC) ===== */}
            {tab === "invoice" && (
              <div>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 4 }}>💳 Danh sách hóa đơn viện phí</h4>
                <p style={{ fontSize: 13, color: GRAY_TEXT, marginBottom: 20 }}>
                  Thanh toán viện phí minh bạch bằng Sepolia ETH qua cổng Smart Contract liên kết với MetaMask.
                </p>

                {invoiceError && <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>❌ {invoiceError}</div>}
                {invoiceSuccess && <div style={{ background: "#E6F9F0", color: "#0F6E56", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>{invoiceSuccess}</div>}

                {loadingInvoice ? (
                  <div style={{ color: GRAY_TEXT, fontStyle: "italic", fontSize: 13 }}>Đang truy vấn danh sách hóa đơn từ cơ sở dữ liệu...</div>
                ) : invoiceList.length === 0 ? (
                  <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                    Bạn không có hóa đơn nào cần thanh toán.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {invoiceList.map((invoice) => (
                      <div key={invoice._id} style={{ background: WHITE, borderRadius: 12, padding: "20px", border: `1.5px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                          <div>
                            <h4 style={{ margin: "0 0 6px 0", color: PRIMARY }}>Mã Hóa Đơn: #{invoice.invoiceId}</h4>
                            <div style={{ fontSize: 13, color: GRAY_TEXT, display: "flex", flexDirection: "column", gap: 3 }}>
                              <div><strong>Ví bệnh nhân chỉ định:</strong> <code style={{ background: "#F1F5F9", padding: "2px 4px", borderRadius: 4 }}>{invoice.patientWallet}</code></div>
                              {invoice.txHash && <div><strong>Mã giao dịch (TxHash):</strong> <a href={`https://sepolia.etherscan.io/tx/${invoice.txHash}`} target="_blank" rel="noreferrer" style={{ color: PRIMARY_MED, textDecoration: "underline", wordBreak: "break-all" }}>{invoice.txHash}</a></div>}
                              <div style={{ marginTop: 4 }}><span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, fontWeight: 600, background: invoice.paymentStatus === "paid" ? "#D1FAE5" : "#FEF3C7", color: invoice.paymentStatus === "paid" ? "#065F46" : "#D97706" }}>{invoice.paymentStatus === "paid" ? "✅ ĐÃ THANH TOÁN (PAID)" : "⏳ CHƯA THANH TOÁN (PENDING)"}</span></div>
                            </div>
                          </div>

                          {invoice.paymentStatus !== "paid" ? (
                            <button onClick={() => handlePayWithMetaMask(invoice)} disabled={payingId === invoice.invoiceId} style={{ background: "#F59E0B", color: WHITE, border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13, boxShadow: "0 2px 6px rgba(245,158,11,0.3)" }}>
                              {payingId === invoice.invoiceId ? "⏳ Đang kết nối ví..." : "💳 Ký & Thanh toán MetaMask"}
                            </button>
                          ) : (
                            <span style={{ fontSize: 28 }}>✅</span>
                          )}
                        </div>

                        {/* 🌟 ĐOẠN HIỂN THỊ CHI TIẾT BẢNG THUỐC VÀ ĐƠN GIÁ TIỀN MẶT VND */}
                        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "14px", borderTop: `1px dashed ${BORDER}`, marginTop: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>📋 Chi tiết hóa đơn điện tử:</div>
                          
                          {invoice.items && invoice.items.length > 0 ? (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr style={{ background: "#E2E8F0", color: "#475569", textAlign: "left" }}>
                                  <th style={{ padding: "6px 12px", borderBottom: `1px solid ${BORDER}` }}>Danh mục / Tên thuốc thuốc chỉ định</th>
                                  <th style={{ padding: "6px 12px", borderBottom: `1px solid ${BORDER}`, textAlign: "right" }}>Giá thành (VND)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoice.items.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                    <td style={{ padding: "8px 12px", color: "#334155" }}>{item.drugName}</td>
                                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#334155", fontWeight: 500 }}>
                                      {item.priceVND?.toLocaleString('vi-VN')} đ
                                    </td>
                                  </tr>
                                ))}
                                <tr style={{ fontWeight: "bold", background: "#F1F5F9" }}>
                                  <td style={{ padding: "8px 12px", color: PRIMARY }}>Tổng chi phí tiền mặt quy đổi:</td>
                                  <td style={{ padding: "8px 12px", textAlign: "right", color: PRIMARY }}>
                                    {invoice.totalVND?.toLocaleString('vi-VN')} đ
                                  </td>
                                </tr>
                                <tr style={{ fontWeight: "bold", background: "#EFF6FF" }}>
                                  <td style={{ padding: "8px 12px", color: "#1D4ED8" }}>Tỷ giá quy đổi thanh toán Web3:</td>
                                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#1D4ED8", fontSize: 14 }}>
                                    🔷 {invoice.amount} ETH
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ color: "#94A3B8", fontStyle: "italic", fontSize: 12 }}>
                              * Hóa đơn cũ (Dữ liệu lịch sử chưa tích hợp tính năng bóc tách mảng chi tiết thuốc)
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB: CẤP QUYỀN TRUY CẬP ===== */}
            {tab === "access" && (
              <div>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 6 }}>🛡️ Danh sách yêu cầu phân quyền hồ sơ bệnh án</h4>
                <p style={{ fontSize: 13, color: GRAY_TEXT, marginBottom: 20 }}>Bác sĩ cần gửi yêu cầu và được bạn ký xác nhận bằng khóa bí mật (MetaMask) để có quyền giải mã bệnh án IPFS.</p>
                {loadingAccess ? <div style={{ color: GRAY_TEXT, fontSize: 13 }}>Đang tải yêu cầu phân quyền...</div> : accessRequests.length === 0 ? (
                  <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>Bạn hiện chưa nhận được yêu cầu xin cấp quyền truy cập nào.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {accessRequests.map(req => (
                      <div key={req._id} style={{ background: WHITE, borderRadius: 10, padding: "16px", border: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: PRIMARY }}>Bác sĩ phụ trách: {req.doctorName || "Bác sĩ hệ thống"}</div>
                          <div style={{ fontSize: 12, color: GRAY_TEXT, marginTop: 4 }}>
                            <div>Ví công khai Bác sĩ: <code>{req.doctorWallet}</code></div>
                            <div>Trạng thái: <span style={{ fontWeight: 600, color: req.status === "approved" ? "#065F46" : "#D97706" }}>{req.status === "approved" ? "✅ Đã phê duyệt" : "⏳ Chờ người bệnh ký"}</span></div>
                          </div>
                        </div>
                        {req.status === "pending" && (
                          <button onClick={() => handleApproveRequest(req)} disabled={approvingId === req._id} style={{ background: "#10B981", color: WHITE, border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                            {approvingId === req._id ? "⏳ Đang ký..." : "✍️ Ký duyệt quyền"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB: CẬP NHẬT THÔNG TIN ===== */}
            {tab === "edit" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 20 }}>Sửa thông tin hành chính cá nhân</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 20 }}>
                  <div><label style={labelStyle}>Họ và tên bệnh nhân</label><input type="text" value={formBasic.fullName} onChange={e => setFormBasic(p => ({ ...p, fullName: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Ngày tháng năm sinh (YYYY-MM-DD)</label><input type="text" value={formBasic.dob} onChange={e => setFormBasic(p => ({ ...p, dob: e.target.value }))} style={inputStyle} placeholder="Ví dụ: 1998-05-20" /></div>
                  <div><label style={labelStyle}>Giới tính</label><select value={formBasic.gender} onChange={e => setFormBasic(p => ({ ...p, gender: e.target.value }))} style={inputStyle}><option value="Male">Nam</option><option value="Female">Nữ</option></select></div>
                  <div><label style={labelStyle}>Số điện thoại</label><input type="text" value={formBasic.phone} onChange={e => setFormBasic(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Địa chỉ thường trú</label><input type="text" value={formBasic.address} onChange={e => setFormBasic(p => ({ ...p, address: e.target.value }))} style={inputStyle} /></div>
                </div>
                <button onClick={handleSaveBasic} disabled={saving} style={{ background: PRIMARY, color: WHITE, border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{saving ? "Đang lưu..." : "💾 Lưu thay đổi"}</button>
              </div>
            )}

            {/* ===== TAB: SỨC KHỎE ===== */}
            {tab === "health" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 20 }}>Cập nhật hồ sơ sức khỏe nền</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 20 }}>
                  <div><label style={labelStyle}>Nhóm máu</label><input type="text" value={formHealth.nhomMau} onChange={e => setFormHealth(p => ({ ...p, nhomMau: e.target.value }))} style={inputStyle} placeholder="Ví dụ: O+, A+, B+..." /></div>
                  <div><label style={labelStyle}>Tiền sử dị ứng thuốc / thực phẩm</label><input type="text" value={formHealth.diUng} onChange={e => setFormHealth(p => ({ ...p, diUng: e.target.value }))} style={inputStyle} placeholder="Không có / Dị ứng Penicillin..." /></div>
                  <div><label style={labelStyle}>Tiền sử bệnh lý gia đình / cá nhân</label><input type="text" value={formHealth.tienSuBenh} onChange={e => setFormHealth(p => ({ ...p, tienSuBenh: e.target.value }))} style={inputStyle} placeholder="Dạ dày, huyết áp cao..." /></div>
                  <div><label style={labelStyle}>Ghi chú thêm cho bác sĩ lâm sàng</label><textarea rows={3} value={formHealth.ghiChu} onChange={e => setFormHealth(p => ({ ...p, ghiChu: e.target.value }))} style={{ ...inputStyle, resize: "none" }} /></div>
                </div>
                <button onClick={handleSaveHealth} disabled={saving} style={{ background: PRIMARY, color: WHITE, border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{saving ? "Đang cập nhật..." : "🏥 Đồng bộ hồ sơ bệnh án"}</button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}