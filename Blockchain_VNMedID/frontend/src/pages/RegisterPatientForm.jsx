import React, { useState } from 'react';
import axios from 'axios';

const RegisterPatientForm = () => {
  const [patientData, setPatientData] = useState({
    email: '',
    password: '',
    fullName: '',
    dob: '',
    gender: '',      
    phone: '',       
    address: '',
    citizenId: ''    
  });
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (e) => {
    // Đoạn code được sửa chính xác tại đây:
    setPatientData({ ...patientData, [e.target.name]: e.target.value });
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    try {
      // Sửa code file này đúng không: Có, và cần bao gồm logic axios request
      // Code trong hình của bạn không có phần này, nên nó không thể gửi dữ liệu thật
      const response = await axios.post(`http://localhost:5000/api/v1/auth/register-patient`, patientData);
      if (response.data.success) {
        setStatusMessage('Đăng ký tài khoản bệnh nhân thành công!');
      }
    } catch (error) {
      setStatusMessage(error.response?.data?.message || 'Lỗi kết nối hệ thống Backend.');
    }
  };

  // Các style đã được cung cấp để đảm bảo form có màu sáng:
  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none',
    fontFamily: '"Inter", system-ui, sans-serif',
    boxSizing: 'border-box',
    width: '100%'
  };

  const labelStyle = {
    fontWeight: '600',
    marginBottom: '6px',
    color: '#334155',
    fontSize: '13px',
    fontFamily: '"Inter", system-ui, sans-serif'
  };

  return (
    <div className="register-container" style={{ padding: '40px 30px', maxWidth: '460px', margin: '40px auto', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '28px', color: '#1e293b', fontFamily: '"Inter", sans-serif', fontWeight: '700', letterSpacing: '-0.02em' }}>
      ĐĂNG KÝ BỆNH NHÂN MỚI
      </h3>
      <form onSubmit={handleSubmitRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Email:</label>
          <input type="email" name="email" placeholder="Nhập địa chỉ email" onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Mật khẩu:</label>
          <input type="password" name="password" placeholder="Nhập mật khẩu truy cập" onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Họ và Tên:</label>
          <input type="text" name="fullName" placeholder="Nhập đầy đủ họ và tên" onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Ngày sinh:</label>
          <input type="date" name="dob" onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Giới tính:</label>
          <select name="gender" onChange={handleChange} required defaultValue="" style={inputStyle}>
            <option value="" disabled style={{ color: '#94a3b8' }}>-- Chọn giới tính --</option>
            <option value="Nam" style={{ color: '#0f172a' }}>Nam</option>
            <option value="Nữ" style={{ color: '#0f172a' }}>Nữ</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Số điện thoại:</label>
          <input type="tel" name="phone" placeholder="Nhập số điện thoại liên hệ" onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Số CCCD/CMND:</label>
          <input type="text" name="citizenId" placeholder="Nhập số căn cước công dân" onChange={handleChange} required style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Địa chỉ hiện tại:</label>
          <input type="text" name="address" placeholder="Nhập số nhà, tên đường, tỉnh/TP" onChange={handleChange} required style={inputStyle} />
        </div>

        <button type="submit" style={{ padding: '12px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', marginTop: '12px', fontSize: '15px', fontFamily: '"Inter", sans-serif', boxShadow: '0 4px 6px rgba(30,41,59,0.12)', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#0f172a'} onMouseOut={(e) => e.target.style.background = '#1e293b'}>
          Đăng ký tài khoản
        </button>
        
        {statusMessage && (
          <p style={{ color: statusMessage.includes('thành công') ? '#10b981' : '#ef4444', textAlign: 'center', fontWeight: '600', fontSize: '14px', marginTop: '10px', fontFamily: '"Inter", sans-serif' }}>
            {statusMessage}
          </p>
        )}
      </form>
    </div>
  );
};

export default RegisterPatientForm;