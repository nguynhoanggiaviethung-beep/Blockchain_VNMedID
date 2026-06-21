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

  const handleApproveRequest = async (request) => {
    setError("")
    setSaveSuccess("")
    
    if (!window.ethereum) {
      setError("Vui lòng cài đặt ví MetaMask để tiến hành ký xác nhận!")
      return
    }

    try {
      setApprovingId(request._id)
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const walletAddress = accounts[0]

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

                                  {/* 🌐 HIỂN THỊ ĐƯỜNG DẪN TỆP IPFS CHUẨN ĐÉT NẰM TRONG LỊCH SỬ KHÁM */}
                                  {record.ipfsHash && (
                                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 13, background: "#E6F1FB", padding: "8px 12px", borderRadius: 6 }}>
                                      <span style={{ color: PRIMARY_MED, fontWeight: "bold" }}>📦 Tệp dữ liệu bệnh án gốc (IPFS CID):</span>
                                      <a 
                                        href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ color: "#1D4ED8", fontWeight: 600, textDecoration: "underline", wordBreak: "break-all" }}
                                      >
                                        {record.ipfsHash} 🔗
                                      </a>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 🚀 COMPONENT BẢNG XÁC THỰC HỒ SƠ BỆNH ÁN ON-CHAIN */}
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
                    <label style={labelStyle}>Chọn Chuyên Khoa Phù Hợp</label>
                    <select value={formAppointment.specialty} onChange={e => setFormAppointment(p => ({ ...p, specialty: e.target.value }))} style={inputStyle}>
                      <option value="Nội khoa">Nội khoa tổng quát</option>
                      <option value="Ngoại khoa">Ngoại khoa chuyên sâu</option>
                      <option value="Răng Hàm Mặt">Răng Hàm Mặt</option>
                      <option value="Nhi khoa">Nhi khoa (Trẻ em)</option>
                      <option value="Sản phụ khoa">Sản phụ khoa</option>
                      <option value="Tai Mũi Họng">Tai Mũi Họng</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Chọn ngày hẹn khám <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ marginTop: 4 }}>
                      <DatePicker 
                        locale={locale} 
                        format="DD/MM/YYYY" 
                        value={formAppointment.date}
                        onChange={val => setFormAppointment(p => ({ ...p, date: val }))}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${BORDER}` }}
                        disabledDate={current => current && current < dayjs().startOf('day')}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Lý do khám bệnh / Triệu chứng lâm sàng</label>
                    <textarea 
                      rows={4} 
                      value={formAppointment.reason} 
                      onChange={e => setFormAppointment(p => ({ ...p, reason: e.target.value }))} 
                      style={{ ...inputStyle, resize: "vertical" }}
                      placeholder="Mô tả sơ lược tình trạng sức khỏe hiện tại của bạn..."
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={saving}
                    style={{ background: PRIMARY, color: WHITE, border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                  >
                    {saving ? "Đang xử lý tạo lịch..." : "🚀 Xác nhận đăng ký lịch hẹn"}
                  </button>
                </form>
              </div>
            )}

            {/* ===== TAB: HÓA ĐƠN & THANH TOÁN ===== */}
            {tab === "invoice" && (
              <div>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 16 }}>Danh sách hóa đơn viện phí viện phí</h4>
                {loadingInvoice ? (
                  <div style={{ fontSize: 13, color: GRAY_TEXT }}>Đang tải hóa đơn...</div>
                ) : invoiceList.length === 0 ? (
                  <div style={{ fontStyle: "italic", color: GRAY_TEXT, fontSize: 13 }}>Bạn hiện không có hóa đơn nào cần thanh toán.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {invoiceList.map(invoice => (
                      <div key={invoice._id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <span style={{ fontWeight: 700, color: PRIMARY }}>Mã Hóa đơn: #{invoice.invoiceId}</span>
                          <span style={{
                            fontSize: 12, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                            background: invoice.status === "paid" ? "#D1FAE5" : "#FEF3C7",
                            color: invoice.status === "paid" ? "#065F46" : "#D97706"
                          }}>
                            {invoice.status === "paid" ? "✅ Đã thanh toán" : "⏳ Chưa thanh toán"}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div><strong>Nội dung viện phí:</strong> {invoice.description}</div>
                          <div><strong>Số tiền:</strong> <span style={{ color: "#E24B4A", fontWeight: "bold" }}>{invoice.amount} ETH</span></div>
                          {invoice.status === "paid" && (
                            <div style={{ wordBreak: "break-all" }}>
                              <strong>Transaction Hash:</strong> <code style={{ color: "#16A34A" }}>{invoice.txHash}</code>
                            </div>
                          )}
                          {invoice.status !== "paid" && (
                            <button 
                              onClick={() => handlePayWithMetaMask(invoice)}
                              disabled={payingId !== null}
                              style={{ background: "#F59E0B", color: WHITE, border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer", width: "fit-content", marginTop: 8 }}
                            >
                              {payingId === invoice.invoiceId ? "⏳ Đang kết nối ví..." : "💳 Thanh toán qua MetaMask"}
                            </button>
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
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 16 }}>Yêu cầu cấp quyền xem hồ sơ từ Bác sĩ</h4>
                {loadingAccess ? (
                  <div style={{ fontSize: 13, color: GRAY_TEXT }}>Đang tải danh sách yêu cầu...</div>
                ) : accessRequests.length === 0 ? (
                  <div style={{ fontStyle: "italic", color: GRAY_TEXT, fontSize: 13 }}>Hiện tại không có yêu cầu phân quyền nào từ đội ngũ y bác sĩ.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {accessRequests.map(req => (
                      <div key={req._id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <span style={{ fontWeight: 700, color: PRIMARY }}>Bác sĩ đề xuất: {req.doctorName || "Hệ thống"}</span>
                          <span style={{
                            fontSize: 12, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                            background: req.status === "approved" ? "#D1FAE5" : req.status === "rejected" ? "#FEF2F2" : "#FEF3C7",
                            color: req.status === "approved" ? "#065F46" : req.status === "rejected" ? "#E24B4A" : "#D97706"
                          }}>
                            {req.status === "approved" ? "✅ Đã đồng ý" : req.status === "rejected" ? "❌ Đã từ chối" : "⏳ Đang chờ duyệt"}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div><strong>Lý do truy cập:</strong> {req.reason || "Xem hồ sơ kiểm tra bệnh trạng"}</div>
                          <div><strong>Địa chỉ ví Bác sĩ:</strong> <code style={{ wordBreak: "break-all" }}>{req.doctorWallet}</code></div>
                          {req.status === "pending" && (
                            <button 
                              onClick={() => handleApproveRequest(req)}
                              disabled={approvingId !== null}
                              style={{ background: "#10B981", color: WHITE, border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer", width: "fit-content", marginTop: 8 }}
                            >
                              {approvingId === req._id ? "✍️ Đang ký ví điện tử..." : "🛡️ Ký số Duyệt quyền (Web3)"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB: CẬP NHẬT THÔNG TIN ===== */}
            {tab === "edit" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 16 }}>Cập nhật thông tin tài khoản cá nhân</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Họ và tên bệnh nhân</label>
                    <input type="text" value={formBasic.fullName} onChange={e => setFormBasic(p => ({ ...p, fullName: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ngày tháng năm sinh (YYYY-MM-DD)</label>
                    <input type="text" value={formBasic.dob} onChange={e => setFormBasic(p => ({ ...p, dob: e.target.value }))} style={inputStyle} placeholder="Ví dụ: 1998-10-25" />
                  </div>
                  <div>
                    <label style={labelStyle}>Giới tính</label>
                    <select value={formBasic.gender} onChange={e => setFormBasic(p => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                      <option value="">-- Chọn giới tính --</option>
                      <option value="Male">Nam (Male)</option>
                      <option value="Female">Nữ (Female)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Số điện thoại liên lạc</label>
                    <input type="text" value={formBasic.phone} onChange={e => setFormBasic(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Địa chỉ thường trú</label>
                    <input type="text" value={formBasic.address} onChange={e => setFormBasic(p => ({ ...p, address: e.target.value }))} style={inputStyle} />
                  </div>
                  <button onClick={handleSaveBasic} disabled={saving} style={{ background: PRIMARY, color: WHITE, border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", marginTop: 10, fontWeight: 600 }}>
                    {saving ? "Đang lưu..." : "💾 Lưu thay đổi thông tin"}
                  </button>
                </div>
              </div>
            )}

            {/* ===== TAB: HỒ SƠ SỨC KHỎE ===== */}
            {tab === "health" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 16 }}>Cập nhật chỉ số Hồ sơ sức khỏe cá nhân</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nhóm máu</label>
                    <input type="text" value={formHealth.nhomMau} onChange={e => setFormHealth(p => ({ ...p, nhomMau: e.target.value }))} style={inputStyle} placeholder="Ví dụ: O+, A-, AB+..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Tiền sử bệnh lý (Cá nhân & Gia đình)</label>
                    <textarea rows={3} value={formHealth.tienSuBenh} onChange={e => setFormHealth(p => ({ ...p, tienSuBenh: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Dị ứng (Thuốc, Thức ăn, Thời tiết)</label>
                    <textarea rows={2} value={formHealth.diUng} onChange={e => setFormHealth(p => ({ ...p, diUng: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Triệu chứng lâm sàng bất thường gần đây</label>
                    <textarea rows={3} value={formHealth.trieuChung} onChange={e => setFormHealth(p => ({ ...p, trieuChung: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ghi chú thêm</label>
                    <input type="text" value={formHealth.ghiChu} onChange={e => setFormHealth(p => ({ ...p, ghiChu: e.target.value }))} style={inputStyle} />
                  </div>
                  <button onClick={handleSaveHealth} disabled={saving} style={{ background: PRIMARY, color: WHITE, border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", marginTop: 10, fontWeight: 600 }}>
                    {saving ? "Đang lưu..." : "💾 Cập nhật dữ liệu sức khỏe"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}