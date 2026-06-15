import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logoVNMedID.png";
import RegisterPatientForm from "./RegisterPatientForm";
import { mapBackendToFrontend } from '../utils/doctorMapper.js';

const api = axios.create({
  baseURL: "https://blockchainvnmedid-production.up.railway.app/api/v1",
});

const PRIMARY = "#0A2D6E";
const PRIMARY_MED = "#1A4FA8";
const PRIMARY_LIGHT = "#E6F1FB";
const ACCENT = "#1976D2";
const WHITE = "#FFFFFF";
const GRAY_TEXT = "#5F6B7A";
const BORDER = "#CBD5E1";
const ERROR = "#E24B4A";

// ── SHOOTING STARS + PARTICLES CANVAS ──
function AnimatedBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Hạt nền
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.4,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.45 + 0.08,
    }));

    // Sao băng
    const MAX_STARS = 5;
    const stars = [];
    const spawnStar = () => {
      const angle = Math.PI / 6 + Math.random() * Math.PI / 6; // 30–60 độ
      const speed = 6 + Math.random() * 6;
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: 80 + Math.random() * 100,
        alpha: 1,
        life: 0,
        maxLife: 40 + Math.random() * 30,
      });
    };

    let frameCount = 0;

    const draw = () => {
      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Vẽ hạt
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();
      });

      // Nối hạt gần nhau
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Spawn sao băng ngẫu nhiên
      if (frameCount % 90 === 0 && stars.length < MAX_STARS) spawnStar();

      // Vẽ sao băng
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx; s.y += s.vy; s.life++;
        const progress = s.life / s.maxLife;
        const alpha = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;

        const grad = ctx.createLinearGradient(
          s.x - s.vx * (s.len / Math.hypot(s.vx, s.vy)),
          s.y - s.vy * (s.len / Math.hypot(s.vx, s.vy)),
          s.x, s.y
        );
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.9})`);

        ctx.beginPath();
        ctx.moveTo(
          s.x - s.vx * (s.len / Math.hypot(s.vx, s.vy)),
          s.y - s.vy * (s.len / Math.hypot(s.vx, s.vy))
        );
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Đầu sao sáng
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();

        if (s.life >= s.maxLife || s.x > canvas.width + 200 || s.y > canvas.height + 200) {
          stars.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0,
    }} />
  );
}

// ── FLOATING MEDICAL ICONS ──
const FLOAT_ICONS = [
  { emoji: "🏥", size: 28, x: "8%",  y: "12%", dur: "7s",  delay: "0s"   },
  { emoji: "💊", size: 22, x: "18%", y: "72%", dur: "9s",  delay: "1.2s" },
  { emoji: "🩺", size: 26, x: "78%", y: "18%", dur: "8s",  delay: "0.5s" },
  { emoji: "🧬", size: 24, x: "88%", y: "65%", dur: "10s", delay: "2s"   },
  { emoji: "❤️", size: 20, x: "5%",  y: "50%", dur: "6s",  delay: "1.8s" },
  { emoji: "🔬", size: 22, x: "70%", y: "82%", dur: "11s", delay: "0.8s" },
  { emoji: "💉", size: 20, x: "55%", y: "8%",  dur: "8.5s",delay: "3s"   },
  { emoji: "🩻", size: 24, x: "92%", y: "38%", dur: "7.5s",delay: "1.5s" },
  { emoji: "🧪", size: 20, x: "32%", y: "88%", dur: "9.5s",delay: "2.5s" },
  { emoji: "⚕️", size: 26, x: "42%", y: "5%",  dur: "6.5s",delay: "0.3s" },
  { emoji: "🫀", size: 22, x: "15%", y: "35%", dur: "10s", delay: "4s"   },
  { emoji: "🧠", size: 20, x: "65%", y: "55%", dur: "8s",  delay: "2.8s" },
];

function FloatingIcons() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px)   rotate(0deg);   opacity: 0.13; }
          25%  { transform: translateY(-18px) rotate(6deg);   opacity: 0.22; }
          50%  { transform: translateY(-8px)  rotate(-4deg);  opacity: 0.18; }
          75%  { transform: translateY(-22px) rotate(8deg);   opacity: 0.25; }
          100% { transform: translateY(0px)   rotate(0deg);   opacity: 0.13; }
        }
      `}</style>
      {FLOAT_ICONS.map((ic, i) => (
        <div key={i} style={{
          position: "absolute",
          left: ic.x, top: ic.y,
          fontSize: ic.size,
          animation: `floatUp ${ic.dur} ${ic.delay} ease-in-out infinite`,
          userSelect: "none",
          filter: "blur(0.4px)",
        }}>
          {ic.emoji}
        </div>
      ))}
    </div>
  );
}

// ── CLICK STAR BURST EFFECT ──
function useClickStars() {
  useEffect(() => {
    const handleClick = (e) => {
      const colors = ["#FFE566", "#60C8FF", "#ffffff", "#FF6B9D", "#A8FF78"];
      const count = 10 + Math.floor(Math.random() * 6);

      for (let i = 0; i < count; i++) {
        const star = document.createElement("div");
        const size = 8 + Math.random() * 10;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 60 + Math.random() * 80;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const duration = 500 + Math.random() * 400;

        star.innerHTML = `<svg viewBox="0 0 20 20" fill="${color}" width="${size}" height="${size}">
          <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z"/>
        </svg>`;

        Object.assign(star.style, {
          position: "fixed",
          left: e.clientX - size / 2 + "px",
          top: e.clientY - size / 2 + "px",
          pointerEvents: "none",
          zIndex: 99999,
          transition: `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`,
          transform: "scale(1) rotate(0deg)",
          opacity: "1",
        });

        document.body.appendChild(star);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const tx = Math.cos(angle) * speed;
            const ty = Math.sin(angle) * speed;
            star.style.transform = `translate(${tx}px, ${ty}px) scale(0) rotate(${180 + Math.random() * 180}deg)`;
            star.style.opacity = "0";
          });
        });

        setTimeout(() => star.remove(), duration + 50);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);
}

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

  useClickStars(); // ✅ hiệu ứng bắn sao khi click

  const validate = () => {
    const e = {};
    if (!email) e.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email không hợp lệ";
    if (!password) e.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6) e.password = "Mật khẩu tối thiểu 6 ký tự";
    return e;
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      setErrors({ general: "Vui lòng cài đặt MetaMask trên trình duyệt!" });
      return;
    }
    try {
      setLoading(true);
      setErrors({});

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0];

      // ✅ Luôn đăng nhập bằng ví — không dùng token cũ
      const response = await api.post("/auth/login-wallet", { walletAddress });
      const loginData = response.data?.data;
      console.log("🔍 loginData:", loginData); // ← thêm dòng này
      if (!loginData?.token) throw new Error("Không nhận được token!");

      localStorage.clear();
      localStorage.setItem("token", loginData.token);
      localStorage.setItem("userRole", loginData.role);
      localStorage.setItem("userId", String(loginData.userId));
      localStorage.setItem("fullName", loginData.fullName || "Người dùng VNmedID");
      localStorage.setItem("walletAddress", walletAddress);

      if (loginData.role === "doctor") {
        localStorage.setItem("chuyenKhoa", loginData.specialty || "");
        localStorage.setItem("maBacSi", loginData.licenseNumber || "");
      }

      const roleRedirect = { patient: "/dashboard/patient", doctor: "/dashboard/doctor", admin: "/dashboard/admin" };
      setSuccess(true);
      navigate(roleRedirect[loginData.role] || "/");

    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Kết nối ví thất bại!";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setLoading(true);
    try {
      const roleMap = { "Bệnh nhân": "patient", "Bác sĩ": "doctor", "Admin": "admin" };
      const response = await api.post("/auth/login", { email, password, role: roleMap[role] });
      const loginData = response.data?.data || response.data;
      const token = loginData?.token;
      const userRole = loginData?.role;
      if (!token) throw new Error("Không nhận được mã xác thực (Token) từ hệ thống!");
      localStorage.setItem("token", token);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", loginData?.userId || loginData?._id || "");
      if (userRole === "doctor") {
        let doctorName = "Bác sĩ VNmedID", doctorSpecialty = "Da liễu", doctorLicense = "BS-123450";
        if (typeof mapBackendToFrontend === "function") {
          try {
            const mapped = mapBackendToFrontend(loginData);
            if (mapped) { doctorName = mapped.fullName || doctorName; doctorSpecialty = mapped.specialty || doctorSpecialty; doctorLicense = mapped.licenseNumber || doctorLicense; }
          } catch {}
        }
        doctorName = loginData?.["Họ và tên"] || loginData?.fullName || loginData?.email?.split('@')[0] || doctorName;
        doctorSpecialty = loginData?.["Chuyên Khoa"] || loginData?.specialty || doctorSpecialty;
        doctorLicense = loginData?.["Mã Bác sĩ"] || loginData?.["Giấy phép hành nghề"] || loginData?.licenseNumber || doctorLicense;
        localStorage.setItem("fullName", doctorName);
        localStorage.setItem("chuyenKhoa", doctorSpecialty);
        localStorage.setItem("maBacSi", doctorLicense);
      } else {
        localStorage.setItem("fullName", loginData?.fullName || loginData?.["Họ và tên"] || loginData?.email?.split('@')[0] || "Người dùng VNmedID");
      }
      const roleRedirect = { patient: "/dashboard/patient", doctor: "/dashboard/doctor", admin: "/dashboard/admin" };
      setSuccess(true);

      // ✅ Chưa có ví → bắt buộc qua setup-wallet, có ví rồi → vào thẳng dashboard
      if (!loginData?.walletAddress) {
        localStorage.setItem("redirectAfterWallet", roleRedirect[userRole] || "/");
        navigate("/setup-wallet");
      } else {
        navigate(roleRedirect[userRole] || "/");
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Đăng nhập thất bại!";
      setErrors({ general: msg });
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_MED} 50%, #1565C0 100%)`,
      fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <AnimatedBg />
      <FloatingIcons />

      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center",
        padding: "40px 48px",
        color: WHITE, position: "relative", zIndex: 1,
        textAlign: "center",
      }}>
        {/* Logo — khung fit logo, to hơn */}
        <div style={{
          display: "inline-flex",
          alignItems: "center", justifyContent: "center",
          padding: "0px",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          marginBottom: 28,
          border: "2px solid rgba(255,255,255,0.2)",
        }}>
          <img
            src={logo}
            alt="VNmedID Logo"
            style={{
              height: 160,
              width: 240,
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              transform: "scale(1.45)",   
              transformOrigin: "center center",
            }}
          />
        </div>

        {/* Slogan + Bling bling sparkles */}
        <div style={{ position: "relative", margin: "0 0 20px 0" }}>
          {/* Sparkle SVGs cố định quanh chữ */}
          {[
            { top: -18, left: -24, size: 18, delay: "0s",   dur: "2.1s" },
            { top: -10, left: "60%", size: 14, delay: "0.4s", dur: "1.8s" },
            { top: 10,  left: -16, size: 11, delay: "0.8s", dur: "2.4s" },
            { top: -20, left: "30%", size: 16, delay: "1.1s", dur: "1.9s" },
            { top: 30,  left: "85%", size: 13, delay: "0.2s", dur: "2.2s" },
            { top: 50,  left: -20, size: 10, delay: "1.4s", dur: "1.7s" },
            { top: 60,  left: "70%", size: 15, delay: "0.6s", dur: "2.0s" },
            { top: -8,  left: "45%", size: 12, delay: "1.6s", dur: "2.3s" },
            { top: 75,  left: "20%", size: 9,  delay: "0.9s", dur: "1.6s" },
            { top: 20,  left: "95%", size: 14, delay: "1.3s", dur: "2.1s" },
          ].map((s, i) => (
            <span key={i} style={{
              position: "absolute",
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              pointerEvents: "none", zIndex: 2,
              animation: `blingPulse ${s.dur} ${s.delay} ease-in-out infinite`,
            }}>
              <svg viewBox="0 0 20 20" fill="none" style={{ width: "100%", height: "100%" }}>
                <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z"
                  fill={i % 3 === 0 ? "#FFE566" : i % 3 === 1 ? "#60C8FF" : "#ffffff"}
                  opacity="0.95"
                />
              </svg>
            </span>
          ))}

          <style>{`
            @keyframes blingPulse {
              0%   { opacity: 0;   transform: scale(0.3) rotate(0deg);   }
              30%  { opacity: 1;   transform: scale(1.1) rotate(15deg);  }
              60%  { opacity: 0.7; transform: scale(0.8) rotate(-10deg); }
              100% { opacity: 0;   transform: scale(0.3) rotate(20deg);  }
            }
          `}</style>

          <h1 style={{
            fontSize: 26, fontWeight: 800, lineHeight: 1.35,
            margin: 0, letterSpacing: -0.2, position: "relative", zIndex: 1,
          }}>
            <span style={{ color: "rgba(255,255,255,0.93)", display: "block" }}>
              Hệ thống quản trị y tế số
            </span>
            <span style={{ color: "#60C8FF", display: "block", marginTop: 4, fontSize: 22 }}>
              Vận hành tinh gọn &amp; Bảo mật bằng Blockchain
            </span>
          </h1>
        </div>

        {/* Divider */}
        <div style={{
          width: 48, height: 2,
          background: "rgba(255,255,255,0.25)",
          borderRadius: 2, margin: "0 auto 24px auto",
        }} />

        {/* Thông tin — căn trái đều */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 16,
          width: "100%", maxWidth: 340,
          textAlign: "left",
        }}>
          {[
            {
              svg: (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              ),
              label: "HOTLINE HỖ TRỢ 24/7",
              value: "1900 1111",
            },
            {
              svg: (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              label: "ĐỊA CHỈ BỆNH VIỆN",
              value: "263–265 Trần Hưng Đạo, Cầu Ông Lãnh, Hồ Chí Minh",
            },
            {
              svg: (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              ),
              label: "CÔNG NGHỆ",
              value: "Blockchain Sepolia Network",
            },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "rgba(255,255,255,0.13)",
                border: "1px solid rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {item.svg}
              </div>
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.12em", marginBottom: 3,
                }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, lineHeight: 1.5 }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        width: 440, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 40px", position: "relative", zIndex: 1,
      }}>
        <div style={{
          background: WHITE, borderRadius: 20, padding: "36px 32px", width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: PRIMARY, marginBottom: 8 }}>Đăng nhập thành công!</div>
              <div style={{ fontSize: 14, color: GRAY_TEXT }}>Chào mừng, đang chuyển hướng đến Dashboard...</div>
            </div>
          ) : isLogin ? (
            <>
              <div style={{ fontSize: 24, fontWeight: 700, color: PRIMARY, marginBottom: 6 }}>Đăng nhập</div>
              <div style={{ fontSize: 14, color: GRAY_TEXT, marginBottom: 32 }}>Chọn vai trò và nhập thông tin của bạn</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                {ROLES.map((r, i) => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 8,
                    border: `1.5px solid ${role === r ? PRIMARY_MED : BORDER}`,
                    background: role === r ? PRIMARY_LIGHT : WHITE,
                    color: role === r ? PRIMARY_MED : GRAY_TEXT,
                    fontWeight: role === r ? 600 : 400, fontSize: 13, cursor: "pointer", transition: "all 0.18s",
                  }}>
                    {ROLE_ICONS[i]} {r}
                  </button>
                ))}
              </div>
              {errors.general && (
                <div style={{ background: "#FEF2F2", border: `1px solid ${ERROR}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: ERROR, textAlign: "center" }}>
                  {errors.general}
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block" }}>Email</label>
                <div style={{ position: "relative", marginBottom: 18 }}>
                  <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: GRAY_TEXT, fontSize: 16, pointerEvents: "none" }}>✉</span>
                  <input type="email" placeholder="example@hospital.vn" value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(ev => ({ ...ev, email: "" })); }}
                    style={{ width: "100%", padding: "11px 14px 11px 42px", borderRadius: 9, border: `1.5px solid ${errors.email ? ERROR : BORDER}`, fontSize: 14, color: "#1a1a2e", outline: "none", boxSizing: "border-box", background: WHITE }} />
                </div>
                {errors.email && <div style={{ fontSize: 12, color: ERROR, marginTop: -12, marginBottom: 12 }}>{errors.email}</div>}
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6, display: "block" }}>Mật khẩu</label>
                <div style={{ position: "relative", marginBottom: 18 }}>
                  <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: GRAY_TEXT, fontSize: 16, pointerEvents: "none" }}>🔒</span>
                  <input type={showPw ? "text" : "password"} placeholder="Nhập mật khẩu" value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(ev => ({ ...ev, password: "" })); }}
                    style={{ width: "100%", padding: "11px 42px 11px 42px", borderRadius: 9, border: `1.5px solid ${errors.password ? ERROR : BORDER}`, fontSize: 14, color: "#1a1a2e", outline: "none", boxSizing: "border-box", background: WHITE }} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: GRAY_TEXT, fontSize: 16, padding: 0 }}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {errors.password && <div style={{ fontSize: 12, color: ERROR, marginTop: -12, marginBottom: 12 }}>{errors.password}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -10, marginBottom: 24 }}>
                  <button type="button" style={{ fontSize: 13, color: ACCENT, cursor: "pointer", background: "none", border: "none", padding: 0 }}>Quên mật khẩu?</button>
                </div>
                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                  background: loading ? "#93B8E8" : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
                  color: WHITE, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.3,
                }}>
                  {loading ? "Đang xác thực..." : `Đăng nhập với tư cách ${role}`}
                </button>
              </form>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>hoặc</span>
                <div style={{ flex: 1, height: 1, background: BORDER }} />
              </div>
              <button type="button" onClick={connectMetaMask} style={{
                width: "100%", padding: "11px 0", borderRadius: 10, border: `1.5px solid ${BORDER}`,
                background: WHITE, color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                <svg width="20" height="20" viewBox="0 0 35 33" fill="none">
                  <path d="M32.958 1L19.41 10.692l2.519-5.937L32.958 1z" fill="#E2761B" />
                  <path d="M2.025 1l13.435 9.784-2.4-5.937L2.025 1z" fill="#E4761B" />
                </svg>
                Kết nối ví MetaMask
              </button>
              <div style={{ fontSize: 12, textAlign: "center", marginTop: 24, color: GRAY_TEXT }}>
                Bằng cách đăng nhập, bạn đồng ý với{" "}
                <span style={{ color: ACCENT, cursor: "pointer" }}>Điều khoản sử dụng</span>
              </div>
              <div style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
                Chưa có tài khoản?{" "}
                <span onClick={() => setIsLogin(false)} style={{ color: PRIMARY, cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}>
                  Đăng ký tài khoản bệnh nhân
                </span>
              </div>
            </>
          ) : (
            <>
              <RegisterPatientForm />
              <div style={{ textAlign: "center", marginTop: 20, fontSize: 14 }}>
                Đã có tài khoản?{" "}
                <span onClick={() => setIsLogin(true)} style={{ color: PRIMARY, cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}>
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