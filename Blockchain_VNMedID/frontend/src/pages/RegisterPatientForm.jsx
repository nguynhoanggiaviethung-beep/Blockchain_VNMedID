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
  const [cccdImage, setCccdImage] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleChange = (e) => {
    setPatientData({ ...patientData, [e.target.name]: e.target.value });
  };
  const handleCCCDUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setCccdImage(file);

    const formData = new FormData();

    formData.append("image", file);

    try {
      setVerifying(true);

      const response = await axios.post(
        "https://blockchainvnmedid-production.up.railway.app/api/v1/ekyc/verify-cccd",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const cccd = response.data.data.data[0];

      setPatientData(prev => ({
        ...prev,

        fullName: cccd.name || "",

        citizenId: cccd.id || "",

        dob: convertDate(cccd.dob),

        gender: 
        cccd.sex === "NAM" ? "Nam"
        : cccd.sex === "NỮ" ? "Nữ"
        : "",

        address: cccd.address || ""
      }));

      setVerified(true);

    } catch (err) {

      alert("Không thể xác thực CCCD");

    } finally {

      setVerifying(false);

    }
  };
  const convertDate = (dateStr) => {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!verified) {
      alert("Vui lòng xác thực CCCD trước khi đăng ký");
      return;
    }
    
    setRegistering(true);
    setStatusMessage('');
    try {
      const response = await axios.post(
        "https://blockchainvnmedid-production.up.railway.app/api/v1/auth/register-patient",
        { ...patientData, isVerified: verified }
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
      <div
        style={{
          border: "1px dashed #CBD5E1",
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          textAlign: "center"
        }}
      >
        <label style={labelStyle}>
          Ảnh CCCD/CMND (mặt trước)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleCCCDUpload}
          style={{ marginTop: 8 }}
        />
        {verifying && (
          <div style={{ marginTop: 10 }}>
            ⏳ Đang xác thực CCCD...
          </div>
        )}
        {verified && (
          <div style={{ marginTop: 10, color: '#16A34A', fontWeight: 600 }}>
            ✅ Xác thực thành công!
          </div>
        )}
      </div>

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
            <input type="text" name="fullName" value={patientData.fullName} placeholder="Nguyễn Văn A" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Email *</label>
            <input type="email" name="email" value={patientData.email} placeholder="abc@gmail.com" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Mật khẩu *</label>
            <input type="password" name="password" value={patientData.password} placeholder="Tối thiểu 6 ký tự" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Ngày sinh *</label>
            <input type="date" name="dob" value={patientData.dob} onChange={handleChange} required style={{ ...inputStyle, colorScheme: 'light' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Giới tính *</label>
            <select name="gender" value={patientData.gender} onChange={handleChange} required style={inputStyle}>
              <option value="" disabled>-- Chọn --</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Số điện thoại *</label>
            <input type="tel" name="phone" value={patientData.phone} placeholder="0912 345 678" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Số CCCD *</label>
            <input type="text" name="citizenId" value={patientData.citizenId} placeholder="012345678901" onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Địa chỉ</label>
            <input type="text" name="address" value={patientData.address} placeholder="Số nhà, tên đường, tỉnh/TP" onChange={handleChange} style={inputStyle} />
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