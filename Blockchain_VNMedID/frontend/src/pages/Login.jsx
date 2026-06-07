import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logoVNMedID.png";
import RegisterPatientForm from "./RegisterPatientForm";
import { mapBackendToFrontend } from '../utils/doctorMapper.js';

// Cấu hình Axios kết nối trực tiếp đến Endpoint của Backend
const api = axios.create({
  baseURL: "http://localhost:5000/api/v1",
});

// Bảng màu hệ thống định danh thương hiệu (Design Tokens)
const PRIMARY = "#0A2D6E";
const PRIMARY_MED = "#1A4FA8";
const PRIMARY_LIGHT = "#E6F1FB";
const ACCENT = "#1976D2";
const WHITE = "#FFFFFF";
const GRAY_TEXT = "#5F6B7A";
const BORDER = "#CBD5E1";
const ERROR = "#E24B4A";

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_MED} 50%, #1565C0 100%)`,
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgCircle1: {
    position: "absolute", width: 400, height: 400, borderRadius: "50%",
    background: "rgba(255,255,255,0.04)", top: -100, right: -80, pointerEvents: "none",
  },
  bgCircle2: {
    position: "absolute", width: 300, height: 300, borderRadius: "50%",
    background: "rgba(255,255,255,0.03)", bottom: -60, left: -60, pointerEvents: "none",
  },
  bgCircle3: {
    position: "absolute", width: 200, height: 200, borderRadius: "50%",
    background: "rgba(255,255,255,0.04)", top: "40%", left: "10%", pointerEvents: "none",
  },
  left: {
    flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
    padding: "60px 56px", color: WHITE, position: "relative", zIndex: 1,
  },
  logoRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 56 },
  logoText: { fontSize: 22, fontWeight: 700, letterSpacing: 0.5, color: WHITE },
  logoSub: {
    fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1,
    textTransform: "uppercase", marginTop: 1,
  },
  heroTitle: { fontSize: 38, fontWeight: 700, lineHeight: 1.2, marginBottom: 16, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, color: "rgba(255,255,255,0.72)", lineHeight: 1.7, maxWidth: 380, marginBottom: 48 },
  featureList: { display: "flex", flexDirection: "column", gap: 16 },
  featureItem: { display: "flex", alignItems: "center", gap: 14 },
  featureDot: {
    width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
  },
  featureLabel: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 },
  right: {
    width: 480, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "40px 48px", position: "relative", zIndex: 1,
  },
  card: {
    background: WHITE, borderRadius: 20, padding: "44px 40px", width: "100%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
  },
  cardTitle: { fontSize: 24, fontWeight: 700, color: PRIMARY, marginBottom: 6 },
  cardSub: { fontSize: 14, color: GRAY_TEXT, marginBottom: 32 },
  roleRow: { display: "flex", gap: 8, marginBottom: 28 },
  roleBtn: (active) => ({
    flex: 1, padding: "9px 0", borderRadius: 8,
    border: `1.5px solid ${active ? PRIMARY_MED : BORDER}`,
    background: active ? PRIMARY_LIGHT : WHITE,
    color: active ? PRIMARY_MED : GRAY_TEXT,
    fontWeight: active ? 600 : 400, fontSize: 13, cursor: "pointer", transition: "all 0.18s",
  }),
  label: { fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block" },
  inputWrapper: { position: "relative", marginBottom: 18 },
  input: (hasError) => ({
    width: "100%", padding: "11px 14px 11px 42px", borderRadius: 9,
    border: `1.5px solid ${hasError ? ERROR : BORDER}`, fontSize: 14, color: "#1a1a2e",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.18s", background: WHITE,
  }),
  inputIcon: {
    position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
    color: GRAY_TEXT, fontSize: 16, pointerEvents: "none",
  },
  eyeBtn: {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", color: GRAY_TEXT,
    fontSize: 16, padding: 0, lineHeight: 1,
  },
  errorText: { fontSize: 12, color: ERROR, marginTop: -12, marginBottom: 12 },
  errorBox: {
    background: "#FEF2F2", border: `1px solid ${ERROR}`, borderRadius: 8,
    padding: "10px 14px", marginBottom: 16, fontSize: 13, color: ERROR, textAlign: "center",
  },
  forgotRow: { display: "flex", justifyContent: "flex-end", marginTop: -10, marginBottom: 24 },
  forgotLink: {
    fontSize: 13, color: ACCENT, textDecoration: "none", cursor: "pointer",
    background: "none", border: "none", padding: 0,
  },
  submitBtn: (loading) => ({
    width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
    background: loading ? "#93B8E8" : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
    color: WHITE, fontSize: 15, fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.3, transition: "opacity 0.18s",
  }),
  divider: { display: "flex", alignItems: "center", gap: 12, margin: "22px 0" },
  dividerLine: { flex: 1, height: 1, background: BORDER },
  dividerText: { fontSize: 12, color: "#9CA3AF" },
  metaMaskBtn: {
    width: "100%", padding: "11px 0", borderRadius: 10, border: `1.5px solid ${BORDER}`,
    background: WHITE, color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "background 0.15s",
  },
  footer: { fontSize: 12, textAlign: "center", marginTop: 24, color: GRAY_TEXT },
};

const ROLES = ["Bệnh nhân", "Bác sĩ", "Admin"];
const ROLE_ICONS = ["👤", "🩺", "🔑"];

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("Bác sĩ");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!email) e.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email không hợp lệ";
    if (!password) e.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6) e.password = "Mật khẩu tối thiểu 6 ký tự";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // 1. Map role tiếng Việt sang tiếng Anh để gửi lên BE
      const roleMap = { "Bệnh nhân": "patient", "Bác sĩ": "doctor", "Admin": "admin" };
      const response = await api.post("/auth/login", { email, password, role: roleMap[role] });
      
      // Đọc an toàn cấu trúc data trả về từ Backend
      const loginData = response.data?.data || response.data;
      const token = loginData?.token;
      const userRole = loginData?.role;

      if (!token) {
        throw new Error("Không nhận được mã xác thực (Token) từ hệ thống!");
      }

      // 2. Lưu token và thông tin nhận diện cốt lõi
      localStorage.setItem("token", token);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", loginData?.userId || loginData?._id || "");

      // 3. Phân tách và lưu trữ thông tin hiển thị theo vai trò cá nhân
      if (userRole === "doctor") {
        let doctorName = "Bác sĩ VNmedID";
        let doctorSpecialty = "Da liễu";
        let doctorLicense = "BS-123450";

        if (typeof mapBackendToFrontend === "function") {
          try {
            const mapped = mapBackendToFrontend(loginData);
            if (mapped) {
              doctorName = mapped.fullName || doctorName;
              doctorSpecialty = mapped.specialty || doctorSpecialty;
              doctorLicense = mapped.licenseNumber || doctorLicense;
            }
          } catch (mapErr) {
            console.warn("Lưu ý: Không thể map dữ liệu profile bác sĩ, chuyển sang đọc trực tiếp.");
          }
        }

        doctorName = loginData?.["Họ và tên"] || loginData?.fullName || loginData?.email?.split('@')[0] || doctorName;
        doctorSpecialty = loginData?.["Chuyên Khoa"] || loginData?.specialty || doctorSpecialty;
        doctorLicense = loginData?.["Mã Bác sĩ"] || loginData?.["Giấy phép hành nghề"] || loginData?.licenseNumber || doctorLicense;

        localStorage.setItem("fullName", doctorName);
        localStorage.setItem("chuyenKhoa", doctorSpecialty);
        localStorage.setItem("maBacSi", doctorLicense);
      } else {
        const patientName = loginData?.fullName || loginData?.["Họ và tên"] || loginData?.email?.split('@')[0] || "Người dùng VNmedID";
        localStorage.setItem("fullName", patientName);
      }

      // 4. ✅ FIX: Navigate ngay, không dùng setTimeout để tránh ProtectedRoute
      //    redirect về login trước khi localStorage được set xong
      const roleRedirect = {
        patient: "/dashboard/patient",
        doctor: "/dashboard/doctor",
        admin: "/dashboard/admin",
      };

      setSuccess(true);
      navigate(roleRedirect[userRole] || "/");

    } catch (error) {
      console.error("Lỗi xử lý đăng nhập:", error);
      const msg = error.response?.data?.message || error.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản, mật khẩu!";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />
      <div style={styles.bgCircle3} />

      <div style={styles.left}>
        <div style={styles.logoRow}>
          <img src={logo} alt="VNmedID Logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "contain" }} />
          <div>
            <div style={styles.logoText}>VNmedID</div>
            <div style={styles.logoSub}>Hospital Management System</div>
          </div>
        </div>

        <h1 style={styles.heroTitle}>
          Quản lý bệnh viện<br />
          thông minh & bảo mật
        </h1>
        <p style={styles.heroSub}>
          Hệ thống tích hợp Blockchain đảm bảo tính minh bạch,
          toàn vẹn dữ liệu bệnh nhân và quyền truy cập an toàn.
        </p>

        <div style={styles.featureList}>
          {[
            ["🔗", "Lưu trữ hồ sơ trên Blockchain"],
            ["🔒", "Phân quyền truy cập theo vai trò"],
            ["💳", "Thanh toán viện phí qua MetaMask"],
          ].map(([icon, label]) => (
            <div key={label} style={styles.featureItem}>
              <div style={styles.featureDot}>{icon}</div>
              <span style={styles.featureLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: PRIMARY, marginBottom: 8 }}>
                Đăng nhập thành công!
              </div>
              <div style={{ fontSize: 14, color: GRAY_TEXT }}>
                Chào mừng, đang chuyển hướng đến Dashboard...
              </div>
            </div>
          ) : isLogin ? (
            <>
              <div style={styles.cardTitle}>Đăng nhập</div>
              <div style={styles.cardSub}> Chọn vai trò và nhập thông tin của bạn </div>

              <div style={styles.roleRow}>
                {ROLES.map((r, i) => {
                  const isActive = role === r;
                  return (
                    <button 
                      key={r} 
                      style={styles.roleBtn(isActive)} 
                      onClick={() => setRole(r)}
                    >
                      {ROLE_ICONS[i]} {r}
                    </button>
                  );
                })}
              </div>

              {errors.general && <div style={styles.errorBox}>{errors.general}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <label style={styles.label}>Email</label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}> ✉ </span>
                  <input
                    type="email"
                    placeholder="example@hospital.vn"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(ev => ({ ...ev, email: "" })); }}
                    style={styles.input(!!errors.email)}
                  />
                </div>
                {errors.email && <div style={styles.errorText}>{errors.email}</div>}

                <label style={styles.label}> Mật khẩu </label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(ev => ({ ...ev, password: "" })); }}
                    style={styles.input(!!errors.password)}
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPw(v => !v)}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {errors.password && <div style={styles.errorText}>{errors.password}</div>}

                <div style={styles.forgotRow}>
                  <button type="button" style={styles.forgotLink}> Quên mật khẩu? </button>
                </div>

                <button type="submit" style={styles.submitBtn(loading)} disabled={loading}>
                  {loading ? "Đang xác thực..." : `Đăng nhập với tư cách ${role}`}
                </button>
              </form>

              <div style={styles.divider}>
                <div style={styles.dividerLine} />
                <span style={styles.dividerText}> hoặc </span>
                <div style={styles.dividerLine} />
              </div>

              <button type="button" style={styles.metaMaskBtn}>
                <svg width="20" height="20" viewBox="0 0 35 33" fill="none">
                  <path d="M32.958 1L19.41 10.692l2.519-5.937L32.958 1z" fill="#E2761B" />
                  <path d="M2.025 1l13.435 9.784-2.4-5.937L2.025 1z" fill="#E4761B" />
                </svg>
                Kết nối ví MetaMask
              </button>

              <div style={styles.footer}>
                Bằng cách đăng nhập, bạn đồng ý với{" "}
                <span style={{ color: ACCENT, cursor: "pointer" }}>Điều khoản sử dụng</span>
              </div>
              <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px" }}>
                Chưa có tài khoản?{" "}
                <span
                  onClick={() => setIsLogin(false)}
                  style={{ color: PRIMARY, cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
                >
                  Đăng ký tài khoản bệnh nhân
                </span>
              </div>
            </>
          ) : (
            <>
              <RegisterPatientForm />
              <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px" }}>
                Đã có tài khoản bệnh nhân?{" "}
                <span
                  onClick={() => setIsLogin(true)}
                  style={{ color: PRIMARY, cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
                >
                  Quay lại Đăng nhập
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;