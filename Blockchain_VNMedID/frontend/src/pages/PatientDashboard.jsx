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

const HOSPITALS = [
  "Bệnh viện Chợ Rẫy",
  "Bệnh viện Đại học Y Dược",
  "Bệnh viện Nhi Đồng 1",
  "Bệnh viện Nhi Đồng 2",
  "Bệnh viện Thống Nhất",
  "Bệnh viện Bình Dân",
  "Bệnh viện Phạm Ngọc Thạch",
  "Bệnh viện Nguyễn Tri Phương",
  "Bệnh viện Hùng Vương",
  "Bệnh viện Từ Dũ",
  "Bệnh viện Gia Định",
  "Bệnh viện 115",
  "Bệnh viện Quận 1",
  "Bệnh viện Quận 3",
  "Bệnh viện Quận 4",
  "Bệnh viện Quận 5",
  "Bệnh viện Đa khoa Bình Phú",
  "Bệnh viện Đa khoa Sài Gòn",
  "Bệnh viện Đa khoa Hoàn Mỹ",
  "Bệnh viện Đa khoa Hồng Đức",
  "Bệnh viện Đa khoa Quốc tế Vinmec Central Park",
  "Bệnh viện Răng Hàm Mặt",
  "Bệnh viện Mắt Sài Gòn",
  "Bệnh viện Tai Mũi Họng",
  "Bệnh viện Da Liễu",
  "Bệnh viện Tâm Thần",
  "Bệnh viện Phục Hồi Chức Năng",
  "Bệnh viện Y học Cổ truyền",
  "Bệnh viện Ung Bướu",
  "Bệnh viện Quốc tế City",
  "Bệnh viện Quốc tế Hạnh Phúc"
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

  // State và cấu hình API đặt bên trong Component theo chuẩn React Hook
  const [hospitals, setHospitals] = useState([]);
  const BASE_URL = import.meta.env.VITE_API_URL || "https://blockchain-vnmedid.onrender.com/api/v1";
  const PAYMENT_CONTRACT_ADDRESS = "0x1bBBa8DCC7f01C43DA82b4935BD93a80EA1f6Ef6";

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

  // States quản lý biểu mẫu (Forms) - Đã thêm caKham mặc định là rỗng để người dùng chọn công tâm
  const [formBasic, setFormBasic] = useState({ fullName: "", dob: "", gender: "", phone: "", address: "" });
  const [formHealth, setFormHealth] = useState({ nhomMau: "", tienSuBenh: "", diUng: "", trieuChung: "", ghiChu: "" });
  const [formAppointment, setFormAppointment] = useState({ specialty: "", hospitalName: "", date: null, caKham: "", reason: "" });

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

  // 2. Chạy lần đầu: Lấy thông tin cá nhân, lịch sử khám và danh sách bệnh viện động
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/doctors/hospitals`, { headers });
        if (res.data?.success) {
          const hospitalData = res.data.hospitals || res.data.data || [];
          setHospitals(hospitalData);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách bệnh viện từ API (Có thể bỏ qua nếu dùng danh sách cứng):", err.message);
      }
    };

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
      fetchHospitals();
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

  // 5. Xử lý thanh toán hóa đơn bằng ví Web3 MetaMask
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

      if (invoice.patientWallet && walletAddress.toLowerCase() !== invoice.patientWallet.toLowerCase()) {
        setInvoiceError(`Hóa đơn này được tạo riêng cho ví: ...${invoice.patientWallet.slice(-6)}. Ví hiện tại của bạn là: ...${walletAddress.slice(-6)}`);
        return;
      }

      const amountWei = invoice.amountInWei 
        ? BigInt(invoice.amountInWei) 
        : BigInt(Math.round(invoice.amount * 1e18));

      const amountHex = "0x" + amountWei.toString(16);

      const selector = "7c9495b2"; // ← thay bằng kết quả thực
      const strBytes = Array.from(new TextEncoder().encode(invoice.invoiceId));
      const strHex = strBytes.map(b => b.toString(16).padStart(2, "0")).join("");
      
      const offsetPart = "0000000000000000000000000000000000000000000000000000000000000020";
      const lengthPart = strBytes.length.toString(16).padStart(64, "0");
      const targetLength = Math.ceil(strHex.length / 64) * 64 || 64;
      const contentPart = strHex.padEnd(targetLength, "0");
      
      const finalCalldata = "0x" + selector + offsetPart + lengthPart + contentPart;

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: PAYMENT_CONTRACT_ADDRESS,
          value: amountHex,
          data: finalCalldata,
          gas: "0x186A0"
        }]
      });

      setTxPending(txHash);
      setInvoiceSuccess("⏳ Lệnh chuyển tiền thành công! Đang đợi thợ đào xác thực khối trên Sepolia...");

      let isSuccess = false;
      let receipt = null;

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

  // 6. Xử lý ký duyệt cấp quyền truy cập bệnh án bảo mật cho Bác sĩ
  const handleApproveRequest = async (request) => {
    setError("");
    setSaveSuccess("");
    
    if (!window.ethereum) {
      setError("Vui lòng tải ví điện tử MetaMask để thực hiện ký xác thực danh tính bảo mật!");
      return;
    }

    try {
      setApprovingId(request._id);
      
      await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0];

      if (walletAddress.toLowerCase() !== request.patientWallet.toLowerCase()) {
        setError(`Sai địa chỉ ví! Vui lòng chọn tài khoản ví kết thúc bằng: ...${request.patientWallet.slice(-6)}`);
        setApprovingId(null);
        return;
      }

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
  // 6b. Bệnh nhân chủ động thu hồi quyền truy cập đã cấp
const handleRevokeAccess = async (request) => {
  if (!window.confirm(`Bạn có chắc muốn thu hồi quyền truy cập của BS. ${request.doctorName}?`)) return;
  
  setError("");
  setSaveSuccess("");

  try {
    setApprovingId(request._id);

    const res = await axios.put(
      `${BASE_URL}/access/requests/${request._id}/revoke`,
      {},
      { headers }
    );

    if (res.data.success) {
      showSuccess(`✅ Đã thu hồi quyền truy cập của BS. ${request.doctorName} thành công!`);
      await loadAccessRequests();
    } else {
      setError(res.data.message || "Không thể thu hồi quyền!");
    }
  } catch (err) {
    setError("Lỗi thu hồi quyền: " + (err.response?.data?.message || err.message));
  } finally {
    setApprovingId(null);
  }
};

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
    if (!formAppointment.specialty) { setError("Vui lòng chọn Chuyên khoa đăng ký khám!"); return; }
    if (!formAppointment.date) { setError("Vui lòng chọn thời gian ngày hẹn khám bệnh!"); return; }
    if (!formAppointment.caKham) { setError("Vui lòng chỉ định Ca khám thích hợp (Ca Sáng / Ca Chiều)!"); return; }
    
    setSaving(true); 
    setError("");
    
    try {
      const formattedDate = formAppointment.date.format("YYYY-MM-DD");
      
      // Đồng bộ các loại key ca khám để vượt qua lớp filter nghiêm ngặt của Backend
      const payloadData = {
        patientId: userId, 
        patientName: localStorage.getItem("fullName") || fullName,
        specialty: formAppointment.specialty, 
        chuyenKhoa: formAppointment.specialty,
        date: formattedDate,
        appointmentDate: formattedDate,
        ngayKham: formattedDate,
        hospitalName: formAppointment.hospitalName,
        benhVien: formAppointment.hospitalName,
        trieuChungLamSang: formAppointment.reason, 
        status: "pending",
        reason: formAppointment.reason,
        
        // Cung cấp trường ca khám giải quyết dứt điểm lỗi trong ảnh image_c66be3.png
        shift: formAppointment.caKham,
        caKham: formAppointment.caKham,
        timeSlot: formAppointment.caKham
      };
      
      const resRecord = await fetch(`${BASE_URL}/visits`, { 
        method: "POST", 
        headers, 
        body: JSON.stringify(payloadData) 
      });
      const dataRecord = await resRecord.json();
      
      if (dataRecord.success) {
        const resHistory = await fetch(`${BASE_URL}/visits/my?patientId=${userId}`, { headers });
        const dataHistory = await resHistory.json();
        if (dataHistory.success) setHistoryList(dataHistory.data || []);
        
        showSuccess("Khởi tạo phiếu hẹn đăng ký khám bệnh thành công!");
        setFormAppointment({ specialty: "", hospitalName: "", date: null, caKham: "", reason: "" });
        setTab("info");
      } else {
        setError(dataRecord.message || "Lỗi xử lý tạo lịch khám từ máy chủ.");
      }
    } catch { 
      setError("Lỗi kết nối mạng tổng đài."); 
    } finally { 
      setSaving(false); 
    }
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
                          if (activeStatFilter === "dangKham") return record.status === "examining";
                          if (activeStatFilter === "donThuoc") return record.huongDieuTri;
                          return true;
                        }).map((record, index, filteredArr) => (
                          <div key={record._id || index} style={{ background: "#F8FAFC", borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
                              <span style={{ fontWeight: 700, color: PRIMARY }}>Mã ca khám #{filteredArr.length - index}</span>
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <span style={{
                                  fontSize: 12, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                                  // 🌟 Logic màu sắc lồng nhau (Ternary operator)
                                  // [lite: completed -> xanh lá] [lite: examining -> xanh dương] [lite: pending -> vàng]
                                  background: record.status === "completed" ? "#D1FAE5" : (record.status === "examining" ? "#DBEAFE" : "#FEF3C7"),
                                  color: record.status === "completed" ? "#065F46" : (record.status === "examining" ? "#1E40AF" : "#D97706")
                                }}>
                                  {/* 🌟 Logic chữ hiển thị lồng nhau */}
                                  {
                                    record.status === "completed" ? "Đã hoàn thành" : 
                                    record.status === "pending" ? "Chờ khám" : "Chờ tiếp đón"
                                  }
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
                      🔗 BẢN GHI CHỨNG THỰC BỆNH ÁN BẤT BIẾN ON-CHAIN (SEPOLIA NETWORK)
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
                            {blockchainData?.history && blockchainData.history.length > 0 ? (
                              blockchainData.history.map((block, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
                                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>#{block.stt || idx + 1}</td>
                                  {/* 🌟 ĐỔI THÀNH block.time như trong Network trả về */}
                                  <td style={{ padding: "10px 12px", color: GRAY_TEXT }}>
                                    {(() => {
                                      if (!block.time) return "Chưa xác định";
                                      try {
                                        const dateObj = new Date(block.time);
                                        return isNaN(dateObj.getTime()) ? block.time : dateObj.toLocaleString('vi-VN');
                                      } catch {
                                        return block.time;
                                      }
                                    })()}
                                  </td>
                                  <td style={{ padding: "10px 12px" }}>
                                    {/* 🌟 ĐỔI THÀNH block.hash như trong Network trả về */}
                                    <code style={{ color: "#16A34A", fontWeight: 500, wordBreak: "break-all" }}>{block.hash || block.recordHash}</code>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="3" style={{ padding: "20px", textAlign: "center", color: GRAY_TEXT }}>
                                  Chưa có lịch sử chứng thực on-chain nào.
                                </td>
                              </tr>
                            )}
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
                  
                  {/* 1. Chọn Bệnh Viện */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Cơ sở y tế mong muốn tiếp nhận <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      style={inputStyle} 
                      value={formAppointment.hospitalName} 
                      onChange={e => setFormAppointment(p => ({ ...p, hospitalName: e.target.value }))}
                    >
                      <option value="">-- Click chọn cơ sở bệnh viện tương thích --</option>
                      {hospitals && hospitals.length > 0 ? (
                        hospitals.map((h, idx) => {
                          const nameStr = h.name || h.hospitalName || h.tenBenhVien || (typeof h === 'string' ? h : "");
                          if (!nameStr) return null;
                          return (
                            <option key={h._id || idx} value={nameStr}>
                              {nameStr}
                            </option>
                          );
                        })
                      ) : (
                        HOSPITALS.map((hospital, idx) => (
                          <option key={idx} value={hospital}>
                            {hospital}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* 2. Chọn Chuyên Khoa Đầy Đủ */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Sắp xếp Chuyên khoa đăng ký <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      style={inputStyle} 
                      value={formAppointment.specialty} 
                      onChange={e => setFormAppointment(p => ({ ...p, specialty: e.target.value }))}
                    >
                      <option value="">-- Chọn chuyên khoa khám --</option>
                      <option value="Nội khoa">Nội khoa tổng quát</option>
                      <option value="Ngoại khoa">Ngoại khoa chuyên sâu</option>
                      <option value="Nhi khoa">Nhi khoa cộng đồng</option>
                      <option value="Sản phụ khoa">Sản phụ khoa</option>
                      <option value="Tai Mũi Họng">Tai Mũi Họng</option>
                      <option value="Răng Hàm Mặt">Răng Hàm Mặt</option>
                      <option value="Da liễu">Da liễu thẩm mỹ</option>
                      <option value="Nhãn khoa">Nhãn khoa (Mắt)</option>
                      <option value="Tim mạch">Tim mạch học</option>
                    </select>
                  </div>

                  {/* 3. Chọn Ngày Khám */}
                  <div style={{ marginBottom: 16, display: "flex", flexDirection: "column" }}>
                    <label style={labelStyle}>Thời gian ngày đặt lịch hẹn khám bệnh <span style={{ color: 'red' }}>*</span></label>
                    <DatePicker 
                      style={{ ...inputStyle, display: "flex", alignItems: "center" }} 
                      locale={locale} 
                      format="DD/MM/YYYY" 
                      value={formAppointment.date} 
                      onChange={val => setFormAppointment(p => ({ ...p, date: val }))} 
                      placeholder="Chọn ngày khám (DD/MM/YYYY)"
                    />
                  </div>

                  {/* 4. CHỌN CA KHÁM (GIẢI QUYẾT TRIỆT ĐỂ LỖI 400 BACKEND) */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Ca khám mong muốn <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      style={inputStyle} 
                      value={formAppointment.caKham} 
                      onChange={e => setFormAppointment(p => ({ ...p, caKham: e.target.value }))}
                    >
                      <option value="">-- Chọn ca khám trong ngày --</option>
                      <option value="Sáng">Ca Sáng (07:30 - 11:30)</option>
                      <option value="Chiều">Ca Chiều (13:30 - 17:00)</option>
                    </select>
                  </div>

                  {/* 5. Lý Do Khám */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Triệu chứng lâm sàng sơ bộ / Lý do khám</label>
                    <textarea 
                      style={{ ...inputStyle, height: 100, resize: "none" }} 
                      value={formAppointment.reason} 
                      onChange={e => setFormAppointment(p => ({ ...p, reason: e.target.value }))} 
                      placeholder="Mô tả chi tiết tình trạng sức khỏe hiện tại để bác sĩ tiện tiếp quản..." 
                    />
                  </div>

                  <button type="submit" disabled={saving} style={{
                    background: PRIMARY, color: WHITE, border: "none", padding: "12px 24px",
                    borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14, width: "100%"
                  }}>
                    {saving ? "Đang xử lý biểu mẫu dữ liệu..." : "Hoàn tất gửi yêu cầu giữ chỗ hẹn khám"}
                  </button>
                </form>
              </div>
            )}

            {/* ===== TAB 3: DANH SÁCH HÓA ĐƠN & VIỆN PHÍ ===== */}
            {tab === "invoice" && (
              loadingInvoice ? <div style={{ textAlign: "center", padding: 20, color: GRAY_TEXT }}>Đang kết nối hệ thống kế toán...</div> : invoiceList.length === 0 ? (
                <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                  ℹ️ Hiện tại không ghi nhận hóa đơn dịch vụ viện phí nào cần thanh toán cho mã tài khoản này.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h4 style={{ color: PRIMARY, margin: "0 0 4px 0" }}>Bảng kê khai viện phí dịch vụ tổng kết</h4>
                  {invoiceList.map((invoice) => (
                    <div key={invoice._id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div><strong>Mã số hóa đơn:</strong> <code style={{ color: PRIMARY, fontWeight: 600 }}>{invoice.invoiceId}</code></div>
                        <div><strong>Nội dung thanh toán:</strong> {invoice.description || "Chi phí khám bệnh & cấp phát vật tư y tế"}</div>
                        <div><strong>Cơ sở bệnh viện ban hành:</strong> {invoice.hospitalName || "VNmedID Network"}</div>
                        <div><strong>Số tiền quy đổi viện phí:</strong> <span style={{ color: "#E24B4A", fontWeight: 700, fontSize: 16 }}>{invoice.amount} ETH</span></div>
                        {invoice.paymentStatus === "paid" && (
                          <div style={{ fontSize: 12, color: "#16A34A", wordBreak: "break-all", marginTop: 4 }}>
                            <strong>Mã băm hóa đơn (TxHash):</strong> {invoice.txHash || "Thanh toán nội bộ"}
                          </div>
                        )}
                      </div>
                      <div>
                        {invoice.paymentStatus === "paid" ? (
                          <span style={{ background: "#D1FAE5", color: "#065F46", padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>✓ Đã thanh toán</span>
                        ) : (
                          <button 
                            onClick={() => handlePayWithMetaMask(invoice)} 
                            disabled={payingId !== null}
                            style={{
                              background: payingId === invoice.invoiceId ? GRAY_TEXT : "#10B981", color: WHITE, border: "none",
                              padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13
                            }}
                          >
                            {payingId === invoice.invoiceId ? "🔄 Đang xử lý ký..." : "🦊 Trả viện phí (MetaMask)"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ===== TAB 4: QUẢN LÝ PHÂN QUYỀN TRUY CẬP HỒ SƠ CỦA BÁC SĨ ===== */}
            {tab === "access" && (
              loadingAccess ? <div style={{ textAlign: "center", padding: 20, color: GRAY_TEXT }}>Đang tìm nạp danh sách phân quyền mật mã...</div> : accessRequests.length === 0 ? (
                <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 8, color: GRAY_TEXT, fontSize: 13, fontStyle: "italic", border: `1px solid ${BORDER}` }}>
                  ℹ️ Chưa có yêu cầu xin cấp quyền truy cập dữ liệu bảo mật nào từ phía Bác sĩ điều trị.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h4 style={{ color: PRIMARY, margin: "0 0 4px 0" }}>Danh sách yêu cầu phê duyệt hồ sơ từ chuyên gia khám</h4>
                  {accessRequests.map((req) => (
                    <div key={req._id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "20px", border: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div><strong>Họ tên Bác sĩ yêu cầu:</strong> ThS. BS {req.doctorName || "Ẩn danh"}</div>
                        <div><strong>Cơ sở y khoa công tác:</strong> {req.hospitalName || "Cơ sở liên kết mạng lưới"}</div>
                        <div><strong>Lý do xin cấp quyền:</strong> <span style={{ color: GRAY_TEXT, fontStyle: "italic" }}>"{req.reason || "Phục vụ công tác chẩn đoán bệnh án lâm sàng."}"</span></div>
                        <div><strong>Định danh ví Web3 Bác sĩ:</strong> <code style={{ background: "#E5E7EB", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{req.doctorWallet}</code></div>
                      </div>
                      <div>
                                    {req.status === "approved" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <span style={{ background: "#D1FAE5", color: "#065F46", padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                  🛡️ Đã cấp quyền xem
                </span>
                <span style={{ fontSize: 11, color: GRAY_TEXT }}>
                  ⏰ Tự hết hạn: {req.expiresAt ? new Date(req.expiresAt).toLocaleString('vi-VN') : "---"}
                </span>
                <button
                  onClick={() => handleRevokeAccess(req)}
                  disabled={approvingId !== null}
                  style={{
                    background: approvingId === req._id ? GRAY_TEXT : "#EF4444",
                    color: WHITE, border: "none", padding: "8px 16px",
                    borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13
                  }}
                >
                  {approvingId === req._id ? "⏳ Đang xử lý..." : "🚫 Thu hồi quyền"}
                </button>
              </div>
            ) : req.status === "revoked" || req.status === "expired" ? (
              <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                {req.status === "revoked" ? "🚫 Đã thu hồi" : "⏰ Đã hết hạn"}
              </span>
            ) : req.status === "rejected" ? (
              <span style={{ background: "#F3F4F6", color: GRAY_TEXT, padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
                ❌ Đã từ chối
              </span>
            ) : (
              <button
                onClick={() => handleApproveRequest(req)}
                disabled={approvingId !== null}
                style={{
                  background: approvingId === req._id ? GRAY_TEXT : PRIMARY, color: WHITE, border: "none",
                  padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13
                }}
              >
                {approvingId === req._id ? "✍️ Đang ký mật mã..." : "✍️ Ký số Duyệt quyền"}
              </button>
            )}



                        
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ===== TAB 5: CHỈNH SỬA LÝ LỊCH HÀNH CHÍNH ===== */}
            {tab === "edit" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 20 }}>Thay đổi thông tin hành chính cá nhân</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={labelStyle}>Họ và tên bệnh nhân (Khai sinh)</label>
                    <input style={inputStyle} type="text" value={formBasic.fullName} onChange={e => setFormBasic(p => ({ ...p, fullName: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ngày tháng năm sinh (Yêu cầu khớp CCCD)</label>
                    <input style={inputStyle} type="date" value={formBasic.dob} onChange={e => setFormBasic(p => ({ ...p, dob: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Giới tính sinh học</label>
                    <select style={inputStyle} value={formBasic.gender} onChange={e => setFormBasic(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">-- Chọn giới tính --</option>
                      <option value="Male">Nam (Male)</option>
                      <option value="Female">Nữ (Female)</option>
                      <option value="Other">Khác (Other)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Số điện thoại di động liên lạc</label>
                    <input style={inputStyle} type="text" value={formBasic.phone} onChange={e => setFormBasic(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Địa chỉ thường trú / Tạm trú hiện nay</label>
                    <input style={inputStyle} type="text" value={formBasic.address} onChange={e => setFormBasic(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
                <button onClick={handleSaveBasic} disabled={saving} style={{
                  background: PRIMARY, color: WHITE, border: "none", padding: "12px 24px",
                  borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14, width: "100%"
                }}>
                  {saving ? "Đang đồng bộ cơ sở dữ liệu..." : "Lưu thay đổi hồ sơ hành chính"}
                </button>
              </div>
            )}

            {/* ===== TAB 6: CHỈNH SỬA TIỀN SỬ SỨC KHỎE THƯỜNG THỨC ===== */}
            {tab === "health" && (
              <div style={{ maxWidth: 600 }}>
                <h4 style={{ color: PRIMARY, marginTop: 0, marginBottom: 20 }}>Cập nhật bổ sung chỉ số trạng thái y sinh</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={labelStyle}>Hệ nhóm máu</label>
                    <select style={inputStyle} value={formHealth.nhomMau} onChange={e => setFormHealth(p => ({ ...p, nhomMau: e.target.value }))}>
                      <option value="">-- Chưa xác định cụ thể --</option>
                      <option value="A+">Nhóm máu A+</option>
                      <option value="A-">Nhóm máu A-</option>
                      <option value="B+">Nhóm máu B+</option>
                      <option value="B-">Nhóm máu B-</option>
                      <option value="O+">Nhóm máu O+</option>
                      <option value="O-">Nhóm máu O-</option>
                      <option value="AB+">Nhóm máu AB+</option>
                      <option value="AB-">Nhóm máu AB-</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Tiền sử dị ứng vật tư / Dược phẩm / Thực phẩm</label>
                    <input style={inputStyle} type="text" value={formHealth.diUng} onChange={e => setFormHealth(p => ({ ...p, diUng: e.target.value }))} placeholder="Ví dụ: Dị ứng Penicillin, hải sản..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Bệnh lý nền mãn tính mắc phải</label>
                    <input style={inputStyle} type="text" value={formHealth.tienSuBenh} onChange={e => setFormHealth(p => ({ ...p, tienSuBenh: e.target.value }))} placeholder="Ví dụ: Cao huyết áp, tiểu đường Type 2..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Triệu chứng lâm sàng ghi nhận tự thân gần đây</label>
                    <input style={inputStyle} type="text" value={formHealth.trieuChung} onChange={e => setFormHealth(p => ({ ...p, trieuChung: e.target.value }))} placeholder="Ví dụ: Thường xuyên đau đầu râm ran mệt mỏi..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Ghi chú mở rộng thêm</label>
                    <textarea style={{ ...inputStyle, height: 80, resize: "none" }} value={formHealth.ghiChu} onChange={e => setFormHealth(p => ({ ...p, ghiChu: e.target.value }))} placeholder="Các lưu ý đặc biệt khác cho bác sĩ khi kê đơn thuốc..." />
                  </div>
                </div>
                <button onClick={handleSaveHealth} disabled={saving} style={{
                  background: PRIMARY, color: WHITE, border: "none", padding: "12px 24px",
                  borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14, width: "100%"
                }}>
                  {saving ? "Đang cập nhật hồ sơ y tế ngầm..." : "Xác nhận cập nhật dữ liệu trạng thái sức khỏe"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}