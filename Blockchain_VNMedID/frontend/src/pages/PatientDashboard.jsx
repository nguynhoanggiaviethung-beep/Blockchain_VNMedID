import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { DatePicker } from 'antd';
import locale from 'antd/es/date-picker/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import axios from 'axios';

dayjs.locale('vi');

// Định nghĩa màu sắc thương hiệu hệ thống VNmedID
const PRIMARY = "#0A2D6E";
const PRIMARY_MED = "#1A4FA8";
const PRIMARY_LIGHT = "#E6F1FB";
const WHITE = "#FFFFFF";
const GRAY_TEXT = "#5F6B7A";
const BORDER = "#CBD5E1";

const BASE_URL = "https://blockchainvnmedid-production.up.railway.app/api/v1";
const PAYMENT_CONTRACT_ADDRESS = "0xdE36843aa11C06EAfA9f1fca0d463351A87e4BbF";

const HOSPITALS = [
  "Bệnh viện Chợ Rẫy",
  "Bệnh viện Đại học Y Dược"
];

// Inline Styles dùng chung cố định tránh việc re-render tạo đối tượng mới liên tục
const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: `1.5px solid ${BORDER}`, fontSize: 14, outline: "none",
  boxSizing: "border-box", background: WHITE, marginTop: 4, color: "#0A2D6E",
};
const labelStyle = { fontSize: 13, fontWeight: 500, color: "#374151" };

export default function PatientDashboard() {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Bệnh nhân";
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  // State quản lý dữ liệu Bệnh nhân
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("info");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [error, setError] = useState("");

  // State quản lý Lịch sử khám bệnh (MongoDB)
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeStatFilter, setActiveStatFilter] = useState("all");

  // State quản lý Bệnh án On-chain (Blockchain)
  const [blockchainData, setBlockchainData] = useState(null);
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);
  const [blockchainError, setBlockchainError] = useState("");

  // State quản lý Hóa đơn & Viện phí
  const [invoiceList, setInvoiceList] = useState([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState("");
  const [txPending, setTxPending] = useState("");

  // State quản lý Yêu cầu cấp quyền xem hồ sơ của Bác sĩ
  const [accessRequests, setAccessRequests] = useState([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  // States quản lý biểu mẫu (Forms)
  const [formBasic, setFormBasic] = useState({ fullName: "", dob: "", gender: "", phone: "", address: "" });
  const [formHealth, setFormHealth] = useState({ nhomMau: "", tienSuBenh: "", diUng: "", trieuChung: "", ghiChu: "" });
  const [formAppointment, setFormAppointment] = useState({ specialty: "Nội khoa", hospitalName: "", date: null, reason: "" });

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // 1. Tải hồ sơ bệnh án On-chain từ Smart Contract (thông qua Backend Oracle)
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
      setBlockchainError(`Không thể đồng bộ thời gian thực với Blockchain Sepolia: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingBlockchain(false);
    }
  };

  // 2. Chạy lần đầu: Lấy thông tin cá nhân và lịch sử khám chung (Web2 MongoDB)
  useEffect(() => {
    const loadPatientInfo = async () => {
      try {
        const res = await fetch(`${BASE_URL}/patients/${userId}`, { headers });
        const data = await res.json();
        if (data.success) {
          const d = data.data;
          setPatient(d);
          setFormBasic({
            fullName: d.fullName || "", dob: d.dob ? d.dob.substring(0, 10) : "",
            gender: d.gender || "", phone: d.phone || "", address: d.address || "",
          });
          setFormHealth({
            nhomMau: d.nhomMau || "", tienSuBenh: d.tienSuBenh || "",
            diUng: d.diUng || "", trieuChung: d.trieuChung || "", ghiChu: d.ghiChu || "",
          });
          if (userId) loadBlockchainRecords(userId);
        }
      } catch (err) { console.error("Lỗi tải thông tin bệnh nhân:", err); }
      finally { setLoading(false); }
    };

    const loadMedicalHistory = async () => {
      try {
        const res = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers });
        const data = await res.json();
        if (data.success) setHistoryList(data.data || []);
      } catch (err) { console.error("Lỗi tải lịch sử khám:", err); }
      finally { setLoadingHistory(false); }
    };

    if (userId) {
      loadPatientInfo();
      loadMedicalHistory();
    } else {
      setLoading(false);
      setLoadingHistory(false);
    }
  }, [userId]);

  // 3. Tải danh sách Hóa đơn
  const loadInvoices = async () => {
    setLoadingInvoice(true);
    setInvoiceError("");
    try {
      const res = await fetch(`${BASE_URL}/invoices/my`, { headers });
      const data = await res.json();
      if (data.success) setInvoiceList(data.data || []);
      else setInvoiceError(data.message || "Không thể tải danh sách hóa đơn!");
    } catch { setInvoiceError("Lỗi kết nối máy chủ hóa đơn!"); }
    finally { setLoadingInvoice(false); }
  };

  // 4. Tải danh sách Yêu cầu cấp quyền truy cập từ Bác sĩ
  const loadAccessRequests = async () => {
    if (!userId) return;
    setLoadingAccess(true);
    try {
      const res = await axios.get(`${BASE_URL}/access/requests/my?patientId=${userId}`, { headers });
      if (res.data.success) setAccessRequests(res.data.data || []);
    } catch (err) { console.error("Lỗi tải yêu cầu phân quyền:", err); }
    finally { setLoadingAccess(false); }
  };

  // Trình điều phối tải lại dữ liệu động khi chuyển đổi các Tab chức năng
  useEffect(() => {
    if (tab === "invoice") loadInvoices();
    if (tab === "access") loadAccessRequests();
    if (tab === "info" && userId) loadBlockchainRecords(userId);
  }, [tab]);

  // 5. Xử lý thanh toán hóa đơn bằng ví Web3 MetaMask (Khớp chuẩn xác luồng EVM)
  const handlePayWithMetaMask = async (invoice) => {
    setInvoiceError("");
    setInvoiceSuccess("");
    setTxPending("");

    if (!window.ethereum) {
      setInvoiceError("Hệ thống không tìm thấy ví MetaMask. Vui lòng cài đặt tiện ích này!");
      return;
    }

    try {
      setPayingId(invoice.invoiceId);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0]; 

      // Kiểm tra tính chính chủ của ví định danh trên hóa đơn
      if (invoice.patientWallet && walletAddress.toLowerCase() !== invoice.patientWallet.toLowerCase()) {
        setInvoiceError(`Hóa đơn này được tạo riêng cho ví: ...${invoice.patientWallet.slice(-6)}. Ví hiện tại của bạn là: ...${walletAddress.slice(-6)}`);
        return;
      }

      // Đổi định dạng tiền sang Wei bất biến
      const amountWei = BigInt(invoice.amountInWei || Math.round(invoice.amount * 1e18));
      const amountHex = "0x" + amountWei.toString(16);

      // Mã hóa dữ liệu Calldata chuẩn ABI Encoding của Ethereum cho hàm truyền tham số Chuỗi (String)
      const selector = "7c9495b2"; // 4-byte hash selector cho hàm payInvoice(string)
      const strBytes = Array.from(new TextEncoder().encode(invoice.invoiceId));
      const strHex = strBytes.map(b => b.toString(16).padStart(2, "0")).join("");
      
      const offsetPart = "0000000000000000000000000000000000000000000000000000000000000020";
      const lengthPart = strBytes.length.toString(16).padStart(64, "0");
      const targetLength = Math.ceil(strHex.length / 64) * 64 || 64;
      const contentPart = strHex.padEnd(targetLength, "0");
      
      const finalCalldata = "0x" + selector + offsetPart + lengthPart + contentPart;

      // Thực thi ký duyệt lệnh gửi tiền lên MetaMask
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: PAYMENT_CONTRACT_ADDRESS,
          value: amountHex,
          data: finalCalldata,
          gas: "0x186A0" // Giới hạn an toàn 100,000 Gas
        }]
      });

      setTxPending(txHash);
      setInvoiceSuccess("⏳ Lệnh chuyển tiền thành công! Đang đợi thợ đào xác thực khối trên Sepolia...");

      let isSuccess = false;
      let receipt = null;

      // Cơ chế Thăm dò (Polling Receipt) tối đa 40 lần, giãn cách 3 giây/lần
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [txHash]
          });
          if (receipt) {
            isSuccess = receipt.status === "0x1" || receipt.status === 1 || receipt.status === "1";
            break;
          }
        } catch (err) { console.error("Đang đọc tiến trình receipt ngầm...", err); }
      }

      // Xử lý các kịch bản kết quả giao dịch sau khi kết thúc vòng lặp
      if (!receipt) {
        setTxPending("");
        setInvoiceError("⚠️ Không nhận được biên lai từ mạng lưới Sepolia (Mạng bận). Hãy kiểm tra lại sau ít phút.");
        return;
      }

      if (!isSuccess) {
        setTxPending("");
        setInvoiceError("❌ Giao dịch đã bị từ chối/thất bại trên Blockchain (Reverted)! Vui lòng kiểm tra số dư ví.");
        return;
      }

      // LUỒNG XUÔI CHUẨN: Sau khi Blockchain thành công -> Gọi API thông báo cơ sở dữ liệu Backend cập nhật trạng thái
      try {
        const response = await axios.post(
          `${BASE_URL}/invoices/payments`,
          { invoiceId: invoice.invoiceId, txHash: txHash, senderWallet: walletAddress },
          { headers }
        );

        if (response.data.success) {
          setInvoiceSuccess("🎉 Thanh toán viện phí thành công! Trạng thái hệ thống đã được đồng bộ đồng nhất.");
          setTxPending("");
          await loadInvoices(); 
        } else {
          setInvoiceError(`Cảnh báo: Tiền đã trừ trên Blockchain, nhưng máy chủ backend trả về lỗi: ${response.data.message}`);
        }
      } catch (apiErr) {
        console.error("Lỗi gọi API hậu thanh toán:", apiErr);
        setInvoiceError("⚠️ Tiền đã chuyển thành công qua Smart Contract, nhưng xảy ra lỗi kết nối đồng bộ cơ sở dữ liệu.");
      }

    } catch (err) {
      if (err.code === 4001) setInvoiceError("Thao tác hủy bỏ: Bạn đã chủ động hủy giao dịch trên ví MetaMask.");
      else setInvoiceError(err.message || "Xảy ra lỗi trong quá trình xử lý giao dịch.");
    } finally {
      setPayingId(null);
    }
  };

  // 6. Xử lý ký duyệt cấp quyền truy cập bệnh án bảo mật cho Bác sĩ bằng mã hóa EIP-191
  const handleApproveRequest = async (request) => {
    setError("");
    setSaveSuccess("");
    
    if (!window.ethereum) {
      setError("Vui lòng tải ví điện tử MetaMask để thực hiện ký xác thực danh tính bảo mật!");
      return;
    }

    try {
      setApprovingId(request._id);
      
      // Yêu cầu chuyển đúng ví bệnh nhân chỉ định để ký số công khai
      await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0];

      if (walletAddress.toLowerCase() !== request.patientWallet.toLowerCase()) {
        setError(`Sai địa chỉ ví! Vui lòng chọn tài khoản ví kết thúc bằng: ...${request.patientWallet.slice(-6)}`);
        setApprovingId(null);
        return;
      }

      // Thông điệp ký mã hóa đồng nhất với cấu trúc giải mã tại Backend
      const message = `Toi dong y cap quyen cho bac si ${request.doctorWallet.toLowerCase()} xem ho so cua toi (${request.patientId})`;

      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      });

      showSuccess("Ký số danh tính thành công! Đang truyền gói tin bảo mật tới hệ thống tổng đài...");

      const res = await axios.post(`${BASE_URL}/access/requests/${request._id}/approve`, { signature }, { headers });

      if (res.data.success) {
        showSuccess(`🎉 Duyệt quyền thành công! Giao dịch băm bảo mật đã ghi nhận lên Blockchain.`);
        await loadAccessRequests();
      } else {
        setError(res.data.message || "Cơ sở dữ liệu từ chối xử lý chữ ký số này.");
      }

    } catch (err) {
      if (err.code === 4001) setError("Thao tác hủy bỏ: Bạn đã từ chối ký số thông điệp trên MetaMask.");
      else setError("Lỗi thực thi ký số: " + (err.message || String(err)));
    } finally {
      setApprovingId(null);
    }
  };

  const showSuccess = (msg) => { setSaveSuccess(msg); setTimeout(() => setSaveSuccess(""), 4000); };

  // 7. Lưu thay đổi dữ liệu cơ bản (MongoDB)
  const handleSaveBasic = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${BASE_URL}/patients/${userId}`, { method: "PUT", headers, body: JSON.stringify(formBasic) });
      const data = await res.json();
      if (data.success) { setPatient(data.data); showSuccess("Cập nhật thông tin cá nhân thành công!"); setTab("info"); }
      else setError(data.message || "Cập nhật dữ liệu thất bại!");
    } catch { setError("Lỗi đường truyền kết nối máy chủ!"); }
    finally { setSaving(false); }
  };

  // 8. Lưu thay đổi hồ sơ sức khỏe thường thức (MongoDB)
  const handleSaveHealth = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`${BASE_URL}/patients/${userId}`, { method: "PUT", headers, body: JSON.stringify(formHealth) });
      const data = await res.json();
      if (data.success) { setPatient(data.data); showSuccess("Cập nhật hồ sơ sức khỏe thành công!"); setTab("info"); }
      else setError(data.message || "Cập nhật dữ liệu thất bại!");
    } catch { setError("Lỗi đường truyền kết nối máy chủ!"); }
    finally { setSaving(false); }
  };

  // 9. Đăng ký lịch hẹn khám mới
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!formAppointment.hospitalName) { setError("Vui lòng chỉ định Bệnh viện bạn muốn đến khám!"); return; }
    if (!formAppointment.date) { setError("Vui lòng chọn thời gian ngày hẹn khám bệnh!"); return; }
    setSaving(true); setError("");
    try {
      const formattedDate = formAppointment.date.format("YYYY-MM-DD");
      const payloadData = {
        patientId: userId, patientName: localStorage.getItem("fullName"),
        specialty: formAppointment.specialty, appointmentDate: formattedDate,
        trieuChungLamSang: formAppointment.reason, hospitalName: formAppointment.hospitalName
      };
      const resRecord = await fetch(`${BASE_URL}/visits`, { method: "POST", headers, body: JSON.stringify(payloadData) });
      const dataRecord = await resRecord.json();
      if (dataRecord.success) {
        const resHistory = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers });
        const dataHistory = await resHistory.json();
        if (dataHistory.success) setHistoryList(dataHistory.data || []);
        showSuccess("Khởi tạo phiếu hẹn đăng ký khám bệnh thành công!");
        setFormAppointment({ specialty: "Nội khoa", hospitalName: "", date: null, reason: "" });
        setTab("info");
      } else setError(dataRecord.message || "Lỗi xử lý tạo lịch khám từ máy chủ.");
    } catch { setError("Lỗi kết nối mạng tổng đài."); }
    finally { setSaving(false); }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  const handleStatCardClick = (filterType) => {
    setActiveStatFilter(filterType); setTab("info");
    setTimeout(() => {
      const el = document.getElementById("medical-history-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const Field = ({ label, value }) => (
    <div style={{ background: PRIMARY_LIGHT, borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: GRAY_TEXT }}>{label}</div>
      <div style={{ fontWeight: 600, color: PRIMARY, marginTop: 2 }}>{value || "—"}</div>
    </div>
  );

  const TABS = [
    { key: "info",     label: "📄 Hồ sơ & Lịch sử" },
    { key: "register", label: "📅 Đăng ký khám" },
    { key: "invoice",  label: "💳 Hóa đơn viện phí" },
    { key: "access",   label: "🛡️ Cấp quyền Bác sĩ" },
    { key: "edit",     label: "✏️ Sửa lý lịch" },
    { key: "health",   label: "🏥 Sửa Sức khỏe" },
  ];

  const completedList = historyList.filter(r => r.status === "completed");
  const pendingList   = historyList.filter(r => r.status === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Thanh Điều Hướng Trên Cùng */}
      <div style={{ background: PRIMARY, color: WHITE, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🏥 Hệ thống VNmedID — Cổng Bệnh nhân</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14 }}>👤 Tài khoản: {fullName}</span>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: WHITE, padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Đăng xuất</button>
        </div>
      </div>

      <div style={{ padding: "32px" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: PRIMARY, margin: 0 }}>Xin chào bệnh nhân, {fullName} 👋</h2>
          <p style={{ color: GRAY_TEXT, marginTop: 4 }}>Trang tổng hợp hồ sơ bệnh án cá nhân, hóa đơn dịch vụ tích hợp dữ liệu On-chain tối mật.</p>
        </div>

        {/* Khối Thống Kê Tổng Hợp */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          {[
            { id: "luotKham", icon: "📋", label: "Lượt đã hoàn thành", value: loadingHistory ? "..." : completedList.length },
            { id: "choKham",  icon: "⏳", label: "Lịch hẹn đang chờ", value: loadingHistory ? "..." : pendingList.length },
            { id: "donThuoc", icon: "💊", label: "Toa thuốc đã cấp",   value: loadingHistory ? "..." : completedList.filter(r => r.huongDieuTri).length },
          ].map(card => {
            const isSelected = activeStatFilter === card.id;
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
            );
          })}
        </div>

        {/* Khối Giao Diện Chức Năng (Tabs Content) */}
        <div style={{ background: WHITE, borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, overflowX: "auto" }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => { setTab(key); setError(""); setActiveStatFilter("all"); }} style={{
                padding: "14px 20px", border: "none", background: "none", cursor: "pointer", whiteSpace: "nowrap",
                fontSize: 14, fontWeight: tab === key ? 600 : 400,
                color: tab === key ? PRIMARY : GRAY_TEXT,
                borderBottom: tab === key ? `2px solid ${PRIMARY}` : "2px solid transparent",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {saveSuccess && <div style={{ background: "#E6F9F0", color: "#0F6E56", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, fontWeight: 500 }}>✅ {saveSuccess}</div>}
            {error && <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, fontWeight: 500 }}>❌ {error}</div>}
            {invoiceSuccess && <div style={{ background: "#E6F9F0", color: "#0F6E56", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, fontWeight: 500 }}>{invoiceSuccess}</div>}
            {invoiceError && <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, fontWeight: 500 }}>{invoiceError}</div>}

            {/* ===== TAB 1: THÔNG TIN LÝ LỊCH & LỊCH SỬ KHÁM ===== */}
            {tab === "info" && (
              loading ? <div style={{ textAlign: "center", padding: 20, color: GRAY_TEXT }}>Đang tải thông tin...</div> : (
                <>
                  <h4 style={{ color: PRIMARY, marginTop: 0 }}>Thông tin hành chính cá nhân</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <Field label="Họ tên bệnh nhân" value={patient?.fullName} />
                    <Field label="Ngày tháng năm sinh" value={patient?.dob?.substring(0, 10)} />
                    <Field label="Giới tính công khai" value={patient?.gender === "Male" ? "Nam" : patient?.gender === "Female" ? "Nữ" : patient?.gender} />
                    <Field label="Số điện thoại liên lạc" value={patient?.phone} />
                    <Field label="Số thẻ CCCD/Định danh" value={patient?.citizenId} />
                    <Field label="Địa chỉ cư trú hiện tại" value={patient?.address} />
                    <Field label="Mã hóa địa chỉ ví Web3 liên kết" value={patient?.walletAddress} />
                  </div>
                  
                  <h4 style={{ color: PRIMARY }}>Hồ sơ trạng thái sức khỏe</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                    <Field label="Nhóm máu" value={patient?.nhomMau} />
                    <Field label="Tiền sử dị ứng bản thân" value={patient?.diUng} />
                    <Field label="Bệnh lý nền mắc phải" value={patient?.tienSuBenh} />
                    <Field label="Triệu chứng lâm sàng ghi nhận" value={patient?.trieuChungLamSang} />
                    <Field label="Ghi chú mở rộng" value={patient?.ghiChu} />
                  </div>

                  {/* Lịch Sử Ghi Nhận Phía MongoDB */}
                  <div id="medical-history-section" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h4 style={{ color: PRIMARY, margin: 0 }}>
                        {activeStatFilter === "luotKham" && "📋 Danh sách bệnh án đã hoàn tất khám"}
                        {activeStatFilter === "choKham"  && "⏳ Danh sách lịch hẹn đang chờ tiếp đón"}
                        {activeStatFilter === "donThuoc" && "💊 Chi tiết các đơn thuốc được cấp phát"}
                        {activeStatFilter === "all"      && "📜 Bản ghi lịch sử y khoa tổng hợp (MongoDB DB)"}
                      </h4>
                      {activeStatFilter !== "all" && (
                        <button onClick={() => setActiveStatFilter("all")}
                          style={{ background: PRIMARY_LIGHT, border: "none", color: PRIMARY, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Xem toàn bộ
                        </button>
                      )}
                    </div>
                    {loadingHistory ? (
                      <div style={{ fontSize: 13, color: GRAY_TEXT }}>Đang đồng bộ cổng dữ liệu...</div>
                    ) : historyList.length === 0 ? (
                      <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                        Không có bản ghi dữ liệu phù hợp với bộ lọc hiện tại.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                        {historyList.filter(record => {
                          if (activeStatFilter === "luotKham") return record.status === "completed";
                          if (activeStatFilter === "choKham")  return record.status === "pending";
                          if (activeStatFilter === "donThuoc") return record.huongDieuTri;
                          return true;
                        }).map((record, index, filteredArr) => (
                          <div key={record._id || index} style={{ background: "#F8FAFC", borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
                              <span style={{ fontWeight: 700, color: PRIMARY }}>Mã ca khám #{filteredArr.length - index}</span>
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <span style={{
                                  fontSize: 12, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                                  background: record.status === "completed" ? "#D1FAE5" : "#FEF3C7",
                                  color: record.status === "completed" ? "#065F46" : "#D97706"
                                }}>
                                  {record.status === "completed" ? "Đã khám" : "Chờ tiếp đón"}
                                </span>
                                <span style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: 500 }}>
                                  🗓️ Ngày: {record.appointmentDate || "—"}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, fontSize: 14 }}>
                              <div><strong>Cơ sở y tế tiếp quản:</strong> {record.hospitalName || "Hệ thống tổng hợp VNmedID"}</div>
                              <div><strong>Chuyên khoa đăng ký:</strong> {record.specialty || "Khám đa khoa tổng quát"}</div>
                              {record.doctorName && <div><strong>Bác sĩ chuyên môn phụ trách:</strong> ThS. BS {record.doctorName}</div>}
                              <div><strong>Triệu chứng khai báo trước:</strong> {record.trieuChungLamSang || "Không khai báo."}</div>
                              {record.status === "completed" && (
                                <>
                                  <div style={{ marginTop: 4 }}>
                                    <strong>Kết luận chẩn đoán chuyên môn:</strong>{" "}
                                    <span style={{ color: PRIMARY, fontWeight: 600 }}>{record.chanDoanChuyenMon || "Đang đợi ký số kết luận"}</span>
                                  </div>
                                  <div style={{ whiteSpace: "pre-wrap", background: WHITE, padding: "12px", borderRadius: 6, border: `1px solid ${BORDER}`, marginTop: 6, fontSize: 13, color: "#1E293B" }}>
                                    <strong style={{ color: PRIMARY_MED }}>💊 Chỉ định toa thuốc & Hướng điều trị bổ sung:</strong><br />
                                    {record.huongDieuTri || "Không ghi nhận kê đơn."}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bản Ghi Hồ Sơ Băm Khớp Xác Thực On-Chain */}
                  <div style={{ borderTop: `2px dashed ${BORDER}`, paddingTop: "24px", marginTop: "16px" }}>
                    <h4 style={{ color: "#16A34A", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 8 }}>
                      🔗 BANH GHI CHỨNG THỰC BỆNH ÁN BẤT BIẾN ON-CHAIN (SEPOLIA NETWORK)
                    </h4>
                    <p style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 0, marginBottom: 16 }}>
                      Dữ liệu băm mật mã học (Record Hash) được trích xuất thời gian thực trực tiếp từ mạng phi tập trung Sepolia Testnet thông qua Smart Contract.
                    </p>

                    {loadingBlockchain ? (
                      <div style={{ fontSize: 13, color: "#16A34A", fontWeight: 500 }}>🔄 Đang truy quét dữ liệu phân đoạn khối Smart Contract...</div>
                    ) : blockchainError ? (
                      <div style={{ background: "#FEF2F2", color: "#E24B4A", borderRadius: 8, padding: "12px", fontSize: 13 }}>⚠️ {blockchainError}</div>
                    ) : !blockchainData || !blockchainData.history || blockchainData.history.length === 0 ? (
                      <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                        ℹ️ Tài khoản định danh này chưa được ghi nhận dữ liệu băm lịch sử trên mạng lưới Blockchain.
                      </div>
                    ) : (
                      <div style={{ background: WHITE, borderRadius: 10, padding: "16px", border: "1px solid #BBF7D0", boxShadow: "0 4px 12px rgba(22,163,74,0.05)" }}>
                        <div style={{ fontSize: 13, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div><strong>Khóa tài khoản bệnh nhân (Patient Identity):</strong> <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{blockchainData.patientAddress}</code></div>
                          <div><strong>Địa chỉ ví Oracle xử lý (Hospital Master Authority):</strong> <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{blockchainData.hospitalAddress}</code></div>
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
                          <thead>
                            <tr style={{ background: "#16A34A", color: WHITE, textAlign: "left" }}>
                              <th style={{ padding: "10px 12px", border: "1px solid #E5E7EB" }}>Thứ tự Block</th>
                              <th style={{ padding: "10px 12px", border: "1px solid #E5E7EB" }}>Thời gian đóng khối (Timestamp)</th>
                              <th style={{ padding: "10px 12px", border: "1px solid #E5E7EB" }}>Mã băm dữ liệu bệnh án gốc (IPFS/Record Hash)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {blockchainData.history.map((item, idx) => (
                              <tr key={item.stt || idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
                                <td style={{ padding: "10px 12px", border: "1px solid #E5E7EB", fontWeight: "bold" }}>{item.stt || (idx + 1)}</td>
                                <td style={{ padding: "10px 12px", border: "1px solid #E5E7EB", color: "#4B5563" }}>{item.time || "Vừa xong"}</td>
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

            {/* ===== TAB 2: ĐĂNG KÝ HẸN ĐẶT LỊCH KHÁM ===== */}
            {tab === "register" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 20 }}>Đặt lịch khám bệnh trực tuyến liên kết cơ sở</h4>
                <form onSubmit={handleBookAppointment}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Cơ sở y tế mong muốn tiếp tiếp nhận <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      style={inputStyle} 
                      value={formAppointment.hospitalName} 
                      onChange={e => setFormAppointment(p => ({ ...p, hospitalName: e.target.value }))}
                      disabled={loadingHospitals} // Vô hiệu hóa khi chưa tải xong dữ liệu
                    >
                      <option value="">
                        {loadingHospitals ? "-- Đang đồng bộ danh sách cơ sở... --" : "-- Click chọn cơ sở bệnh viện tương thích --"}
                      </option>
                      
                      {!loadingHospitals && hospitals.map(h => {
                        // 💡 Lưu ý: Hãy kiểm tra field tên bệnh viện trong DB của bạn là 'name', 'fullName' hay 'hospitalName' để chọn đúng nhé.
                        // Ví dụ ở đây tôi dùng: h.name || h.hospitalName || h["Tên Bệnh viện"]
                        const hospitalNameText = h.name || h.hospitalName || h["Tên Bệnh viện"] || h;
                        const hospitalValue = h.name || h.hospitalName || h._id || h; // Nếu bạn lưu string vào phiếu hẹn thì để tên, lưu ID thì để h._id

                        return (
                          <option key={h._id || hospitalNameText} value={hospitalValue}>
                            {hospitalNameText}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Sắp xếp Chuyên khoa đăng ký</label>
                    <select style={inputStyle} value={formAppointment.specialty} onChange={e => setFormAppointment(p => ({ ...p, specialty: e.target.value }))}>
                      <option value="Nội khoa">Nội khoa tổng quát</option>
                      <option value="Ngoại khoa">Ngoại khoa chỉnh hình</option>
                      <option value="Nhi khoa">Nhi khoa tổng hợp</option>
                      <option value="Tim mạch">Chuyên khoa Tim mạch</option>
                      <option value="Da liễu">Chuyên khoa Da liễu</option>
                      <option value="Tai mũi họng">Chuyên khoa Tai mũi họng</option>
                      <option value="Răng hàm mặt">Chuyên khoa Răng hàm mặt</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Thời gian mong muốn đặt hẹn <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ marginTop: 4 }}>
                      <DatePicker 
                        locale={locale} format="DD/MM/YYYY" style={{ width: "100%", height: 42, borderRadius: 8 }}
                        value={formAppointment.date} onChange={val => setFormAppointment(p => ({ ...p, date: val }))}
                        disabledDate={current => current && current < dayjs().startOf('day')}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Lý do đăng ký khám / Mô tả dấu hiệu bệnh</label>
                    <textarea 
                      style={{ ...inputStyle, height: 100, resize: "none" }}
                      placeholder="Mô tả chi tiết triệu chứng của bạn để điều phối bác sĩ chính xác nhất..."
                      value={formAppointment.reason} onChange={e => setFormAppointment(p => ({ ...p, reason: e.target.value }))}
                    />
                  </div>

                  <button type="submit" disabled={saving} style={{
                    background: PRIMARY, color: WHITE, border: "none", padding: "12px 24px",
                    borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, width: "100%"
                  }}>
                    {saving ? "Đang gửi hồ sơ..." : "🚀 Hoàn tất gửi yêu cầu đặt lịch hẹn"}
                  </button>
                </form>
              </div>
            )}

            {/* ===== TAB 3: THANH TOÁN HÓA ĐƠN QUA METAMASK ===== */}
            {tab === "invoice" && (
              <div>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 4 }}>💳 Cổng thanh toán viện phí tập trung (Web3 Pay)</h4>
                <p style={{ fontSize: 13, color: GRAY_TEXT, marginBottom: 20 }}>
                  Thanh toán trực tiếp, minh bạch các khoản chi phí y tế thông qua Smart Contract trên mạng thử nghiệm Sepolia.
                </p>
                
                {loadingInvoice ? (
                  <div style={{ fontSize: 14, color: GRAY_TEXT }}>Đang đồng bộ danh sách hóa đơn từ máy chủ...</div>
                ) : invoiceList.length === 0 ? (
                  <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                    Hiện không tìm thấy hóa đơn viện phí nào phát sinh cần chi trả.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {invoiceList.map((inv) => (
                      <div key={inv._id || inv.invoiceId} style={{ background: WHITE, borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 }}>
                          <div>
                            <span style={{ fontWeight: 700, color: PRIMARY, fontSize: 15 }}>Mã số hóa đơn viện phí: {inv.invoiceId}</span>
                            <div style={{ fontSize: 12, color: GRAY_TEXT, marginTop: 2 }}>Ngày xuất: {new Date(inv.createdAt).toLocaleString('vi-VN')}</div>
                          </div>
                          <span style={{
                            fontSize: 12, padding: "4px 12px", borderRadius: 20, fontWeight: 600,
                            background: inv.status === "paid" ? "#D1FAE5" : "#FEE2E2",
                            color: inv.status === "paid" ? "#065F46" : "#991B1B"
                          }}>
                            {inv.status === "paid" ? "Đã tất toán" : "Chưa chi trả"}
                          </span>
                        </div>

                        <div style={{ fontSize: 14, display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                          <div><strong>Nội dung chỉ định thanh toán:</strong> {inv.description || "Chi phí dịch vụ cận lâm sàng tổng hợp"}</div>
                          <div><strong>Định mức chi phí quy đổi:</strong> <span style={{ color: "#E11D48", fontWeight: 700, fontSize: 16 }}>{inv.amount} ETH</span></div>
                          {inv.patientWallet && (
                            <div><strong>Địa chỉ ví thụ hưởng bắt buộc:</strong> <code style={{ fontSize: 12, background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>{inv.patientWallet}</code></div>
                          )}
                          {inv.txHash && (
                            <div><strong>Mã băm biên lai giao dịch (TxHash):</strong> <code style={{ fontSize: 12, color: "#2563EB", wordBreak: "break-all" }}>{inv.txHash}</code></div>
                          )}
                        </div>

                        {inv.status !== "paid" && (
                          <button 
                            onClick={() => handlePayWithMetaMask(inv)}
                            disabled={payingId === inv.invoiceId}
                            style={{
                              background: payingId === inv.invoiceId ? "#94A3B8" : "#2563EB",
                              color: WHITE, border: "none", padding: "10px 20px", borderRadius: 8,
                              cursor: payingId === inv.invoiceId ? "not-allowed" : "pointer",
                              fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8
                            }}
                          >
                            {payingId === inv.invoiceId ? "🔄 Đang gọi cổng MetaMask..." : "🦊 Kích hoạt ví MetaMask & Thanh toán"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB 4: DUYỆT CẤP QUYỀN TRUY CẬP CHO BÁC SĨ ===== */}
            {tab === "access" && (
              <div>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 4 }}>🛡️ Phân quyền chia sẻ hồ sơ bệnh án phi tập trung</h4>
                <p style={{ fontSize: 13, color: GRAY_TEXT, marginBottom: 20 }}>
                  Danh sách bác sĩ đang yêu cầu truy cập thông tin bệnh án để chẩn đoán. Bạn kiểm soát quyền hạn bằng chữ ký mã hóa của mình.
                </p>

                {loadingAccess ? (
                  <div style={{ fontSize: 14, color: GRAY_TEXT }}>Đang tải thông tin cấp quyền từ mạng...</div>
                ) : accessRequests.length === 0 ? (
                  <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                    Hiện tại chưa có yêu cầu cấp quyền truy xuất nào từ các y bác sĩ.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {accessRequests.map((req) => (
                      <div key={req._id} style={{ background: WHITE, borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 }}>
                          <div>
                            <strong style={{ color: PRIMARY }}>Bác sĩ đề xuất: {req.doctorName || "Yêu cầu ẩn danh"}</strong>
                            <div style={{ fontSize: 12, color: GRAY_TEXT, marginTop: 2 }}>Đơn vị: {req.hospitalName || "Hệ thống chung"}</div>
                          </div>
                          <span style={{
                            fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 600,
                            background: req.status === "approved" ? "#D1FAE5" : req.status === "pending" ? "#FEF3C7" : "#FEE2E2",
                            color: req.status === "approved" ? "#065F46" : req.status === "pending" ? "#D97706" : "#991B1B"
                          }}>
                            {req.status === "approved" ? "Đã ủy quyền" : req.status === "pending" ? "Đang chờ ký số" : "Từ chối"}
                          </span>
                        </div>

                        <div style={{ fontSize: 13, color: "#374151", marginBottom: 14 }}>
                          <div><strong>Địa chỉ định danh ví Bác sĩ:</strong> <code style={{ background: "#F3F4F6", padding: "2px 4px", borderRadius: 4 }}>{req.doctorWallet}</code></div>
                          <div style={{ marginTop: 4 }}><strong>Lý do xin cấp quyền:</strong> Truy cứu tiền sử bệnh án phục vụ ca điều trị hiện hành.</div>
                        </div>

                        {req.status === "pending" && (
                          <button 
                            onClick={() => handleApproveRequest(req)}
                            disabled={approvingId === req._id}
                            style={{
                              background: approvingId === req._id ? "#94A3B8" : "#16A34A",
                              color: WHITE, border: "none", padding: "8px 16px", borderRadius: 6,
                              cursor: approvingId === req._id ? "not-allowed" : "pointer",
                              fontWeight: 600, fontSize: 13
                            }}
                          >
                            {approvingId === req._id ? "✍️ Đang chờ xác thực ví..." : "✓ Xác nhận Ký Số Phê Duyệt"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB 5: SỬA THÔNG TIN CÁ NHÂN ===== */}
            {tab === "edit" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 16 }}>Hiệu chỉnh lý lịch hành chính</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><label style={labelStyle}>Họ và tên công dân</label><input style={inputStyle} value={formBasic.fullName} onChange={e => setFormBasic(p => ({ ...p, fullName: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Ngày sinh (Định dạng mẫu: YYYY-MM-DD)</label><input style={inputStyle} type="date" value={formBasic.dob} onChange={e => setFormBasic(p => ({ ...p, dob: e.target.value }))} /></div>
                  <div>
                    <label style={labelStyle}>Giới tính sinh học</label>
                    <select style={inputStyle} value={formBasic.gender} onChange={e => setFormBasic(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">Chọn giới tính</option>
                      <option value="Male">Nam</option>
                      <option value="Female">Nữ</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Số điện thoại chính chủ</label><input style={inputStyle} value={formBasic.phone} onChange={e => setFormBasic(p => ({ ...p, phone: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Địa chỉ thường trú</label><input style={inputStyle} value={formBasic.address} onChange={e => setFormBasic(p => ({ ...p, address: e.target.value }))} /></div>
                  <button onClick={handleSaveBasic} disabled={saving} style={{ background: PRIMARY, color: WHITE, border: "none", padding: "12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, marginTop: 10 }}>
                    {saving ? "Đang tiến hành lưu..." : "Lưu dữ liệu thay đổi"}
                  </button>
                </div>
              </div>
            )}

            {/* ===== TAB 6: HIỆU CHỈNH HỒ SƠ SỨC KHỎE KHAI BÁO ===== */}
            {tab === "health" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 16 }}>Hiệu chỉnh hồ sơ sức khỏe khai báo ban đầu</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><label style={labelStyle}>Nhóm máu hệ ABO</label><input style={inputStyle} value={formHealth.nhomMau} onChange={e => setFormHealth(p => ({ ...p, nhomMau: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Tiền sử bệnh lý gia đình / cá nhân trước đây</label><input style={inputStyle} value={formHealth.tienSuBenh} onChange={e => setFormHealth(p => ({ ...p, tienSuBenh: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Các chất dị ứng nguy hại ghi nhận</label><input style={inputStyle} value={formHealth.diUng} onChange={e => setFormHealth(p => ({ ...p, diUng: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Triệu chứng lâm sàng bổ sung thêm</label><input style={inputStyle} value={formHealth.trieuChung} onChange={e => setFormHealth(p => ({ ...p, trieuChung: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Lời nhắn/Ghi chú gửi tới Hội đồng Bác sĩ</label><textarea style={{ ...inputStyle, height: 80, resize: "none" }} value={formHealth.ghiChu} onChange={e => setFormHealth(p => ({ ...p, ghiChu: e.target.value }))} /></div>
                  <button onClick={handleSaveHealth} disabled={saving} style={{ background: PRIMARY, color: WHITE, border: "none", padding: "12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, marginTop: 10 }}>
                    {saving ? "Đang cập nhật..." : "Xác nhận cập nhật hồ sơ"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}