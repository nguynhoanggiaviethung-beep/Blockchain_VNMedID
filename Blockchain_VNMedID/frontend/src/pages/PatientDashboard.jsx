import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { DatePicker } from 'antd';
import locale from 'antd/es/date-picker/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import axios from 'axios'; // Đảm bảo đã install axios (npm i axios)

dayjs.locale('vi');

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const WHITE = "#FFFFFF"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"

const BASE_URL = "https://blockchainvnmedid-production.up.railway.app/api/v1"

// ✅ DANH SÁCH BỆNH VIỆN CHO BỆNH NHÂN LỰA CHỌN
const HOSPITALS = [
  "Bệnh viện Chợ Rẫy",
  "Bệnh viện Đại học Y Dược"
];

// ✅ Contract address đúng trên Sepolia
const PAYMENT_CONTRACT_ADDRESS = "0xdE36843aa11C06EAfA9f1fca0d463351A87e4BbF"

// ✅ Hàm encode calldata payInvoice(string) thủ công — chuẩn ABI encoding
function encodePayInvoice(invoiceId) {
  const selector = "7c9495b2"
  const strBytes = Array.from(new TextEncoder().encode(invoiceId))
  const offset = "0000000000000000000000000000000000000000000000000000000000000020"
  const length = strBytes.length.toString(16).padStart(64, "0")
  const strHex = strBytes.map(b => b.toString(16).padStart(2, "0")).join("")
  const paddedStr = strHex.padEnd(Math.ceil(strHex.length / 64) * 64, "0")
  return "0x" + selector + offset + length + paddedStr
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

  // 🚀 CÁC STATE BỔ SUNG CHO BLOCKCHAIN ON-CHAIN HISTORY
  const [blockchainData, setBlockchainData] = useState(null);
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);
  const [blockchainError, setBlockchainError] = useState("");

  // State hóa đơn
  const [invoiceList, setInvoiceList] = useState([])
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [invoiceError, setInvoiceError] = useState("")
  const [invoiceSuccess, setInvoiceSuccess] = useState("")
  const [txPending, setTxPending] = useState("") // txHash đang chờ confirm

  const [formBasic, setFormBasic] = useState({
    fullName: "", dob: "", gender: "", phone: "", address: ""
  })
  const [formHealth, setFormHealth] = useState({
    nhomMau: "", tienSuBenh: "", diUng: "", trieuChung: "", ghiChu: ""
  })
  
  // ✅ ĐÃ CẬP NHẬT: Thêm hospitalName vào state formAppointment ban đầu rỗng
  const [formAppointment, setFormAppointment] = useState({
    specialty: "Nội khoa", hospitalName: "", date: null, reason: ""
  })

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  }

  // 🚀 Hàm bốc lịch sử On-chain từ Backend Railway về dựa vào Ví/Address của bệnh nhân
  const loadBlockchainRecords = async (patientAddress) => {
    if (!patientAddress) return;
    setLoadingBlockchain(true);
    setBlockchainError("");
    try {
      const res = await axios.get(`${BASE_URL}/medical-records/on-chain/${patientAddress}`);
      if (res.data.success) {
        setBlockchainData(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Blockchain:", err);
      setBlockchainError("Không thể kết nối mạng Sepolia để đồng bộ mã Hash.");
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

          // 👉 Khi đã bốc được dữ liệu bệnh nhân và có walletAddress, tiến hành gọi hàm On-chain luôn
          if (d.walletAddress) {
            loadBlockchainRecords(d.walletAddress);
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

  useEffect(() => {
    if (tab === "invoice") loadInvoices()
  }, [tab])

  const handlePayWithMetaMask = async (invoice) => {
    setInvoiceError("")
    setInvoiceSuccess("")
    setTxPending("")

    if (!window.ethereum) {
      setInvoiceError("Vui lòng cài đặt MetaMask để thanh toán!")
      return
    }

    try {
      setPayingId(invoice.invoiceId)
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const walletAddress = accounts[0]

      const chainId = await window.ethereum.request({ method: "eth_chainId" })
      if (chainId !== "0xaa36a7") {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }]
          })
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                rpcUrls: ["https://rpc.sepolia.org"],
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"]
              }]
            })
          } else throw switchErr
        }
      }

      const amountWei = BigInt(Math.round(invoice.amount * 1e18))
      const amountHex = "0x" + amountWei.toString(16)
      const calldata = encodePayInvoice(invoice.invoiceId)

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: PAYMENT_CONTRACT_ADDRESS,
          value: amountHex,
          data: calldata,
          gas: "0x493E0", 
        }]
      })

      setTxPending(txHash)
      setInvoiceSuccess(`⏳ Giao dịch đã gửi! Đang chờ xác nhận trên Sepolia...`)

      let confirmed = false
      let receipt = null
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000))
        try {
          receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [txHash]
          })
          if (receipt) {
            confirmed = receipt.status === "0x1"
            break
          }
        } catch {}
      }

      if (!confirmed) {
        if (receipt && receipt.status === "0x0") {
          setInvoiceError("❌ Giao dịch thất bại trên blockchain! Kiểm tra số dư hoặc địa chỉ ví.")
        } else {
          setInvoiceError("⚠️ Giao dịch chưa được xác nhận sau 2 phút. Kiểm tra lại trên Etherscan.")
        }
        return
      }

      setInvoiceSuccess(`✅ Blockchain đã xác nhận! Đang cập nhật hệ thống...`)

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
        setInvoiceSuccess(`🎉 Thanh toán thành công! TxHash: ${txHash.slice(0, 20)}...`)
        setTxPending("")
        await loadInvoices()
      } else {
        setInvoiceError("Lỗi xác nhận từ server: " + (result.message || ""))
      }

    } catch (err) {
      if (err.code === 4001) {
        setInvoiceError("Bạn đã từ chối giao dịch trong MetaMask.")
      } else if (err.code === -32603) {
        setInvoiceError("Lỗi contract: Kiểm tra địa chỉ ví có khớp với hóa đơn không, và số dư đủ chưa.")
      } else {
        setInvoiceError("Lỗi thanh toán: " + (err.message || String(err)))
      }
    } finally {
      setPayingId(null)
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

  // ✅ ĐÃ CẬP NHẬT: Hàm xử lý Đăng ký khám để gửi cả trường hospitalName lên Server
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
        hospitalName: formAppointment.hospitalName // ✅ Đẩy tên bệnh viện được chọn lên API
      }
      const resRecord = await fetch(`${BASE_URL}/visits`, { method: "POST", headers, body: JSON.stringify(payloadData) })
      const dataRecord = await resRecord.json()
      if (dataRecord.success) {
        const resHistory = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers })
        const dataHistory = await resHistory.json()
        if (dataHistory.success) setHistoryList(dataHistory.data)
        showSuccess("Đăng ký lịch khám bệnh thành công!")
        setFormAppointment({ specialty: "Nội khoa", hospitalName: "", date: null, reason: "" }) // Reset state form
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
                    <Field label="Địa chỉ ví công khai (Web3 Address)" value={patient?.walletAddress} />
                  </div>
                  
                  <h4 style={{ color: PRIMARY }}>Hồ sơ sức khỏe</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                    <Field label="Nhóm máu" value={patient?.nhomMau} />
                    <Field label="Dị ứng" value={patient?.diUng} />
                    <Field label="Tiền sử bệnh" value={patient?.tienSuBenh} />
                    <Field label="Triệu chứng lâm sàng ban đầu" value={patient?.trieuChungLamSang} />
                    <Field label="Ghi chu hệ thống" value={patient?.ghiChu} />
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

                  {/* 🚀 COMPONENT BẢNG XÁC THỰC HỒ SƠ BỆNH ÁN ON-CHAIN (BLOCKCHAIN) */}
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
                        ℹ️ Địa chỉ ví này chưa được khởi tạo lịch sử bệnh án nào trên Smart Contract.
                      </div>
                    ) : (
                      <div style={{ background: WHITE, borderRadius: 10, padding: "16px", border: "1px solid #BBF7D0", boxShadow: "0 4px 12px rgba(22,163,74,0.05)" }}>
                        <div style={{ fontSize: 13, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div><strong>Bệnh nhân (Patient Address):</strong> <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{blockchainData.patientAddress}</code></div>
                          <div><strong>Cơ sở y tế phụ trách (Hospital):</strong> <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{blockchainData.hospitalAddress}</code></div>
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
                  
                  {/* ✅ THÊM MỚI: Bộ chọn Cơ sở Bệnh viện tiếp nhận ca khám */}
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
                    <label style={labelStyle}>Chọn Chuyên Khoa Phù Hợp</label>
                    <select value={formAppointment.specialty} onChange={e => setFormAppointment(p => ({ ...p, specialty: e.target.value }))} style={inputStyle}>
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
                    <textarea value={formAppointment.reason} onChange={e => setFormAppointment(p => ({ ...p, reason: e.target.value }))}
                      placeholder="VD: Đau đầu dai dẳng, sốt nhẹ về chiều..." rows={4}
                      style={{ ...inputStyle, resize: "vertical" }} required />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="submit" disabled={saving} style={{
                      padding: "11px 28px", borderRadius: 8, border: "none",
                      background: saving ? "#93B8E8" : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
                      color: WHITE, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer"
                    }}>{saving ? "Đang xử lý..." : "📅 Xác nhận đăng ký"}</button>
                    <button type="button" onClick={() => setTab("info")} style={{ padding: "11px 24px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: WHITE, fontSize: 14, cursor: "pointer", color: GRAY_TEXT }}>Hủy bỏ</button>
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
                  }}>{loadingInvoice ? "Đang tải..." : "🔄 Làm mới"}</button>
                </div>

                {invoiceError && <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>❌ {invoiceError}</div>}
                {invoiceSuccess && <div style={{ background: "#E6F9F0", color: "#0F6E56", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>✅ {invoiceSuccess}</div>}
                
                {/* Giữ nguyên phần render danh sách hóa đơn bên dưới của bạn... */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}