import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const api = axios.create({
  baseURL: "https://blockchain-vnmedid.onrender.com/api/v1",
});

const PRIMARY = "#0A2D6E";
const PRIMARY_MED = "#1A4FA8";
const WHITE = "#FFFFFF";
const GRAY_TEXT = "#5F6B7A";
const BORDER = "#CBD5E1";
const SUCCESS = "#10B981";
const ERROR = "#E24B4A";

// ── PARTICLES BG ──
function AnimatedBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.4, dx: (Math.random() - 0.5) * 0.35, dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.4 + 0.08,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`; ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />;
}

export default function SetupWallet() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle"); // idle | connecting | success | error
  const [walletAddress, setWalletAddress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fullName = localStorage.getItem("fullName") || "bạn";
  const token = localStorage.getItem("token");
  const redirectTo = localStorage.getItem("redirectAfterWallet") || "/";

  // Nếu chưa đăng nhập → về trang login
  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  const handleConnect = async () => {
    if (!window.ethereum) {
      setStatus("error");
      setErrorMsg("Chưa cài MetaMask! Vui lòng cài extension MetaMask trên trình duyệt.");
      return;
    }

    try {
      setStatus("connecting");
      setErrorMsg("");

      // 1. Yêu cầu kết nối ví
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      setWalletAddress(address);

      // 2. Lưu ví vào DB
      await api.put("/auth/wallet",
        { walletAddress: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatus("success");

      // 3. Sau 2s → vào dashboard
      setTimeout(() => {
        localStorage.removeItem("redirectAfterWallet");
        navigate(redirectTo);
      }, 2000);

    } catch (err) {
      setStatus("error");
      setErrorMsg(err.response?.data?.message || err.message || "Kết nối ví thất bại!");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_MED} 50%, #1565C0 100%)`,
      fontFamily: "'Segoe UI', Arial, sans-serif", position: "relative", overflow: "hidden",
    }}>
      <AnimatedBg />

      <div style={{
        position: "relative", zIndex: 1,
        background: WHITE, borderRadius: 24, padding: "48px 44px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        textAlign: "center",
      }}>

        {/* Icon */}
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {status === "success" ? "🎉" : status === "error" ? "⚠️" : "🔐"}
        </div>

        {/* Title */}
        <h2 style={{ color: PRIMARY, fontSize: 24, fontWeight: 800, margin: "0 0 10px 0" }}>
          {status === "success" ? "Kết nối thành công!" : "Kết nối ví MetaMask"}
        </h2>

        {/* Sub */}
        <p style={{ color: GRAY_TEXT, fontSize: 14, lineHeight: 1.7, margin: "0 0 32px 0" }}>
          {status === "success"
            ? `Ví của bạn đã được liên kết. Lần sau đăng nhập thẳng bằng ví!`
            : status === "connecting"
            ? "Đang kết nối ví, vui lòng xác nhận trên MetaMask..."
            : <>
                Xin chào <strong>{fullName}</strong>! Để bảo mật tài khoản và sử dụng<br />
                đầy đủ tính năng Blockchain, vui lòng kết nối ví MetaMask.
              </>
          }
        </p>

        {/* Wallet address hiển thị sau khi connect */}
        {walletAddress && (
          <div style={{
            background: "#F0FDF4", border: "1px solid #BBF7D0",
            borderRadius: 10, padding: "12px 16px", marginBottom: 24,
            fontSize: 13, color: "#065F46", fontWeight: 600,
            wordBreak: "break-all",
          }}>
            ✅ {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            <span style={{ color: "#6EE7B7", marginLeft: 8, fontSize: 11 }}>
              ({walletAddress})
            </span>
          </div>
        )}

        {/* Error */}
        {status === "error" && errorMsg && (
          <div style={{
            background: "#FEF2F2", border: `1px solid ${ERROR}`,
            borderRadius: 10, padding: "12px 16px", marginBottom: 24,
            fontSize: 13, color: ERROR,
          }}>
            {errorMsg}
          </div>
        )}

        {/* Progress bar khi connecting */}
        {status === "connecting" && (
          <div style={{ background: "#E2E8F0", borderRadius: 99, height: 6, marginBottom: 24, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_MED})`,
              animation: "slideBar 1.5s ease-in-out infinite",
              width: "60%",
            }} />
            <style>{`@keyframes slideBar { 0%{margin-left:-60%} 100%{margin-left:100%} }`}</style>
          </div>
        )}

        {/* Nút kết nối */}
        {status !== "success" && (
          <button
            onClick={handleConnect}
            disabled={status === "connecting"}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: status === "connecting"
                ? "#93B8E8"
                : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
              color: WHITE, fontSize: 15, fontWeight: 700,
              cursor: status === "connecting" ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              boxShadow: "0 4px 16px rgba(10,45,110,0.3)",
              marginBottom: 16,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 35 33" fill="none">
              <path d="M32.958 1L19.41 10.692l2.519-5.937L32.958 1z" fill="#E2761B" />
              <path d="M2.025 1l13.435 9.784-2.4-5.937L2.025 1z" fill="#E4761B" />
              <path d="M28.226 23.534l-3.4 5.21-7.275 2.01-1.01-7.22 11.685-0z" fill="#E4761B" />
            </svg>
            {status === "connecting" ? "Đang kết nối..." : "Kết nối ví MetaMask"}
          </button>
        )}

        {/* Thông tin bảo mật */}
        {status === "idle" && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              display: "flex", flexDirection: "column", gap: 10,
              background: "#F8FAFC", borderRadius: 12, padding: "16px 20px",
              border: `1px solid ${BORDER}`, textAlign: "left", marginBottom: 16,
            }}>
              {[
                "🔒 Ví chỉ dùng để xác thực, không truy cập tài sản",
                "🔑 Lần sau đăng nhập thẳng bằng ví không cần mật khẩu",
                "🌐 Hỗ trợ mạng Sepolia Testnet",
              ].map((text, i) => (
                <div key={i} style={{ fontSize: 13, color: GRAY_TEXT }}>{text}</div>
              ))}
            </div>
          </div>
        )}

        {/* Redirect thông báo */}
        {status === "success" && (
          <p style={{ color: SUCCESS, fontSize: 13, fontWeight: 600 }}>
            Đang chuyển vào hệ thống...
          </p>
        )}

        {/* Retry nếu lỗi */}
        {status === "error" && (
          <button
            onClick={() => { setStatus("idle"); setErrorMsg(""); }}
            style={{
              background: "none", border: `1.5px solid ${BORDER}`,
              color: GRAY_TEXT, padding: "10px 24px", borderRadius: 8,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}