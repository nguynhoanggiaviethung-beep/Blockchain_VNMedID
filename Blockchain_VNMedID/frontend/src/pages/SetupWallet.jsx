import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const BASE_URL = "https://victorious-commitment-production-250c.up.railway.app/api/v1"

export default function SetupWallet() {
  const navigate = useNavigate()
  const fullName = localStorage.getItem('fullName') || 'Người dùng'
  const userRole = localStorage.getItem('userRole')
  const token = localStorage.getItem('token')

  const [walletAddress, setWalletAddress] = useState('')
  const [status, setStatus] = useState('') // 'connecting' | 'success' | 'error'
  const [message, setMessage] = useState('')

  const roleRedirect = {
    patient: '/dashboard/patient',
    doctor: '/dashboard/doctor',
    admin: '/dashboard/admin',
  }

  const handleSkip = () => {
    // Lưu flag đã bỏ qua để không hỏi lại trong session này
    sessionStorage.setItem('walletSetupSkipped', 'true')
    navigate(roleRedirect[userRole] || '/')
  }

  const handleConnect = async () => {
    if (!window.ethereum) {
      setStatus('error')
      setMessage('Vui lòng cài đặt MetaMask trước! Tải tại metamask.io')
      return
    }

    try {
      setStatus('connecting')
      setMessage('')

      // 1. Yêu cầu kết nối ví
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const wallet = accounts[0]
      setWalletAddress(wallet)

      // 2. Lưu ví vào DB qua API
      const res = await fetch(`${BASE_URL}/auth/wallet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress: wallet })
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setMessage('Ví MetaMask đã được liên kết thành công!')
        // Lưu wallet vào localStorage để dùng sau
        localStorage.setItem('walletAddress', wallet)
        // Chờ 1.5s rồi chuyển vào dashboard
        setTimeout(() => navigate(roleRedirect[userRole] || '/'), 1500)
      } else {
        setStatus('error')
        setMessage(data.message || 'Không thể lưu ví. Vui lòng thử lại!')
      }
    } catch (err) {
      if (err.code === 4001) {
        setStatus('error')
        setMessage('Bạn đã từ chối kết nối ví.')
      } else {
        setStatus('error')
        setMessage(err.message || 'Lỗi kết nối. Vui lòng thử lại!')
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_MED} 50%, #1565C0 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', Arial, sans-serif", padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px',
        width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>

        {/* Icon */}
        <div style={{ fontSize: 56, marginBottom: 16 }}>🦊</div>

        {/* Tiêu đề */}
        <h2 style={{ color: PRIMARY, fontWeight: 800, fontSize: 22, margin: '0 0 8px 0' }}>
          Kết nối ví MetaMask
        </h2>
        <p style={{ color: '#5F6B7A', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          Xin chào <strong>{fullName}</strong>! Để sử dụng đầy đủ tính năng thanh toán Blockchain,<br />
          vui lòng kết nối ví MetaMask của bạn.
        </p>

        {/* Các bước */}
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          borderRadius: 12, padding: '16px 20px', marginBottom: 28,
          textAlign: 'left',
        }}>
          {[
            { icon: '1️⃣', text: 'Mở MetaMask và chọn mạng Sepolia Testnet' },
            { icon: '2️⃣', text: 'Bấm nút bên dưới để kết nối' },
            { icon: '3️⃣', text: 'Xác nhận trong cửa sổ MetaMask' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
              <span style={{ fontSize: 16 }}>{step.icon}</span>
              <span style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.5 }}>{step.text}</span>
            </div>
          ))}
        </div>

        {/* Hiển thị ví đã kết nối */}
        {walletAddress && status !== 'error' && (
          <div style={{
            background: '#F0FDF4', border: '1.5px solid #86EFAC',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: '#15803D', fontSize: 13 }}>Ví đã kết nối!</div>
              <div style={{ fontSize: 11, color: '#166534', wordBreak: 'break-all', marginTop: 2 }}>
                {walletAddress}
              </div>
            </div>
          </div>
        )}

        {/* Thông báo lỗi */}
        {status === 'error' && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            color: '#DC2626', fontSize: 13, fontWeight: 600,
          }}>
            ❌ {message}
          </div>
        )}

        {/* Thông báo thành công */}
        {status === 'success' && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #86EFAC',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            color: '#15803D', fontSize: 13, fontWeight: 600,
          }}>
            ✅ {message} Đang chuyển đến Dashboard...
          </div>
        )}

        {/* Nút kết nối */}
        {status !== 'success' && (
          <button
            onClick={handleConnect}
            disabled={status === 'connecting'}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, border: 'none',
              background: status === 'connecting' ? '#93B8E8'
                : `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_MED} 100%)`,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: status === 'connecting' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 12, boxShadow: '0 4px 12px rgba(10,45,110,0.3)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 35 33" fill="none">
              <path d="M32.958 1L19.41 10.692l2.519-5.937L32.958 1z" fill="#E2761B" />
              <path d="M2.025 1l13.435 9.784-2.4-5.937L2.025 1z" fill="#E4761B" />
            </svg>
            {status === 'connecting' ? '⏳ Đang kết nối...' : 'Kết nối ví MetaMask'}
          </button>
        )}

        {/* Nút bỏ qua */}
        {status !== 'success' && (
          <button
            onClick={handleSkip}
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              border: '1.5px solid #CBD5E1', background: '#fff',
              color: '#5F6B7A', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Bỏ qua, vào Dashboard →
          </button>
        )}

        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 16 }}>
          Bạn có thể kết nối ví sau trong phần Hóa đơn & Thanh toán
        </p>
      </div>
    </div>
  )
}