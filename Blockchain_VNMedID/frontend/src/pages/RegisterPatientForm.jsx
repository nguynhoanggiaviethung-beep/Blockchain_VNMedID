import React, { useState } from 'react';
import axios from 'axios';

const PRIMARY = "#0A2D6E";
const PRIMARY_MED = "#1A4FA8";

const RegisterPatientForm = () => {
  const [step, setStep] = useState(1); // 1: điền thông tin, 2: kết nối ví
  const [patientData, setPatientData] = useState({
    email: '', password: '', fullName: '', dob: '',
    gender: '', phone: '', address: '', citizenId: ''
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' | 'error'
  const [walletAddress, setWalletAddress] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleChange = (e) => {
    setPatientData({ ...patientData, [e.target.name]: e.target.value });
  };

  // Bước 1: Submit thông tin → chuyển sang bước 2
  const handleSubmitInfo = (e) => {
    e.preventDefault();
    setStep(2);
  };

  // Bước 2: Kết nối MetaMask → đăng ký
  const handleConnectAndRegister = async () => {
    // Kiểm tra MetaMask đã cài chưa
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setRegistering(true);
      setStatusMessage('');

      // Yêu cầu kết nối ví
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const wallet = accounts[0];
      setWalletAddress(wallet);

      // Gửi đăng ký kèm địa chỉ ví
      const response = await axios.post(
        'https://blockchainvnmedid-production.up.railway.app/api/v1/auth/register-patient',
        { ...patientData, walletAddress: wallet }
      );

      if (response.data.success) {
        setStatusMessage('🎉 Đăng ký thành công! Ví MetaMask đã được liên kết.');
        setStatusType('success');
      }
    } catch (error) {
      if (error.code === 4001) {
        setStatusMessage('Bạn đã từ chối kết nối ví. Vui lòng thử lại!');
      } else {
        setStatusMessage(error.response?.data?.message || 'Lỗi kết nối hệ thống.');
      }
      setStatusType('error');
    } finally {
      setRegistering(false);
    }
  };

  const inputStyle = {
    padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid #CBD5E1', backgroundColor: '#F8FAFD',
    color: '#0f172a', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', width: '100%',
    fontFamily: '"Inter", system-ui, sans-serif',
  };
  const labelStyle = {
    fontWeight: '600', marginBottom: '5px',
    color: '#334155', fontSize: '12px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    fontFamily: '"Inter", system-ui, sans-serif',
  };

  // ── BƯỚC 2: Kết nối ví ──
  if (step === 2) {
    const hasMetaMask = !!window.ethereum;
    return (
      <div style={{ padding: '8px 0' }}>
        <h3 style={{ textAlign: 'center', color: PRIMARY, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          🔗 Liên kết ví MetaMask
        </h3>
        <p style={{ textAlign: 'center', color: '#5F6B7A', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
          Thông tin của bạn đã sẵn sàng.<br />
          Bước cuối cùng: kết nối ví MetaMask để hoàn tất đăng ký.
        </p>

        {/* Box thông tin ví */}
        {walletAddress ? (
          <div style={{
            background: '#F0FDF4', border: '1.5px solid #86EFAC',
            borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: '#15803D', fontSize: 13 }}>Ví đã kết nối!</div>
              <div style={{ fontSize: 11, color: '#166534', wordBreak: 'break-all', marginTop: 2 }}>
                {walletAddress}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: hasMetaMask ? '#EFF6FF' : '#FEF3C7',
            border: `1.5px solid ${hasMetaMask ? '#BFDBFE' : '#FDE68A'}`,
            borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>{hasMetaMask ? '🦊' : '⚠️'}</span>
            <div>
              <div style={{ fontWeight: 700, color: hasMetaMask ? '#1D4ED8' : '#B45309', fontSize: 13 }}>
                {hasMetaMask ? 'MetaMask đã được cài đặt' : 'Chưa cài MetaMask'}
              </div>
              <div style={{ fontSize: 12, color: hasMetaMask ? '#1E40AF' : '#92400E', marginTop: 2 }}>
                {hasMetaMask
                  ? 'Bấm nút bên dưới để kết nối ví của bạn'
                  : 'Bấm nút bên dưới để cài đặt MetaMask trước'}
              </div>
            </div>
          </div>
        )}

        {/* Nút kết nối / cài MetaMask */}
        {!statusMessage && (
          <button
            onClick={handleConnectAndRegister}
            disabled={registering}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
              background: registering ? '#93B8E8' : hasMetaMask
                ? `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_MED})`
                : 'linear-gradient(90deg, #F59E0B, #D97706)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: registering ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            {registering ? (
              '⏳ Đang xử lý...'
            ) : hasMetaMask ? (
              <>
                <svg width="20" height="20" viewBox="0 0 35 33" fill="none">
                  <path d="M32.958 1L19.41 10.692l2.519-5.937L32.958 1z" fill="#E2761B" />
                  <path d="M2.025 1l13.435 9.784-2.4-5.937L2.025 1z" fill="#E4761B" />
                </svg>
                Kết nối MetaMask & Hoàn tất đăng ký
              </>
            ) : (
              '📥 Cài đặt MetaMask ngay'
            )}
          </button>
        )}

        {/* Thông báo kết quả */}
        {statusMessage && (
          <div style={{
            background: statusType === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${statusType === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            borderRadius: 8, padding: '12px 16px', marginTop: 16,
            color: statusType === 'success' ? '#15803D' : '#DC2626',
            fontSize: 13, fontWeight: 600, textAlign: 'center',
          }}>
            {statusMessage}
          </div>
        )}

        {/* Nút quay lại */}
        {!statusMessage && (
          <button onClick={() => setStep(1)} style={{
            width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 8,
            border: '1.5px solid #CBD5E1', background: '#fff',
            color: '#5F6B7A', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            ← Quay lại chỉnh sửa thông tin
          </button>
        )}
      </div>
    );
  }

  // ── BƯỚC 1: Điền thông tin ──
  return (
    <div style={{ padding: '4px 0' }}>
      <h3 style={{ textAlign: 'center', color: PRIMARY, fontWeight: 700, fontSize: 25, marginBottom: 4 }}>
        ĐĂNG KÝ BỆNH NHÂN MỚI
      </h3>
      <p style={{ textAlign: 'center', color: '#5F6B7A', fontSize: 15, marginBottom: 24 }}>
        Bước 1/2 — Điền thông tin cá nhân
      </p>

      <form onSubmit={handleSubmitInfo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Họ và tên *</label>
            <input type="text" name="fullName" placeholder="Nguyễn Văn A" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Email *</label>
            <input type="email" name="email" placeholder="abc@gmail.com" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Mật khẩu *</label>
            <input type="password" name="password" placeholder="Tối thiểu 6 ký tự" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Ngày sinh *</label>
            <input type="date" name="dob" onChange={handleChange} required style={{ ...inputStyle, colorScheme: 'light' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Giới tính *</label>
            <select name="gender" onChange={handleChange} required defaultValue="" style={inputStyle}>
              <option value="" disabled>-- Chọn --</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Số điện thoại *</label>
            <input type="tel" name="phone" placeholder="0912 345 678" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Số CCCD *</label>
            <input type="text" name="citizenId" placeholder="012345678901" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Địa chỉ</label>
            <input type="text" name="address" placeholder="Số nhà, tên đường, tỉnh/TP" onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <button type="submit" style={{
          padding: '13px', borderRadius: 10, border: 'none',
          background: `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_MED})`,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4,
        }}>
          Tiếp theo → Kết nối ví MetaMask
        </button>
      </form>
    </div>
  );
};

export default RegisterPatientForm;