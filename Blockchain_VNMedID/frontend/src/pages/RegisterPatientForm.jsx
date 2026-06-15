import React, { useState } from 'react';
import axios from 'axios';

const PRIMARY = "#0A2D6E";
const PRIMARY_MED = "#1A4FA8";

const RegisterPatientForm = () => {
  const [patientData, setPatientData] = useState({
    email: '', password: '', fullName: '', dob: '',
    gender: '', phone: '', address: '', citizenId: ''
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleChange = (e) => {
    setPatientData({ ...patientData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setStatusMessage('');
    try {
      const response = await axios.post(
        'https://victorious-commitment-production-250c.up.railway.app/api/v1/auth/register-patient',
        patientData
      );
      if (response.data.success) {
        setStatusMessage('🎉 Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
        setStatusType('success');
      }
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Lỗi kết nối hệ thống.');
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

  if (statusType === 'success') {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: PRIMARY, marginBottom: 8 }}>
          Đăng ký thành công!
        </div>
        <div style={{ fontSize: 14, color: '#5F6B7A', lineHeight: 1.6 }}>
          Tài khoản của bạn đã được tạo.<br />
          Vui lòng đăng nhập để kết nối ví MetaMask.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <h3 style={{ textAlign: 'center', color: PRIMARY, fontWeight: 700, fontSize: 22, marginBottom: 4 }}>
        ĐĂNG KÝ BỆNH NHÂN MỚI
      </h3>
      <p style={{ textAlign: 'center', color: '#5F6B7A', fontSize: 14, marginBottom: 20 }}>
        Điền thông tin cá nhân để tạo tài khoản
      </p>

      {statusMessage && statusType === 'error' && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          color: '#DC2626', fontSize: 13, fontWeight: 600, textAlign: 'center',
        }}>
          {statusMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

        <button type="submit" disabled={registering} style={{
          padding: '13px', borderRadius: 10, border: 'none',
          background: registering ? '#93B8E8' : `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_MED})`,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: registering ? 'not-allowed' : 'pointer', marginTop: 4,
        }}>
          {registering ? '⏳ Đang đăng ký...' : '✅ Tạo tài khoản'}
        </button>
      </form>
    </div>
  );
};

export default RegisterPatientForm;