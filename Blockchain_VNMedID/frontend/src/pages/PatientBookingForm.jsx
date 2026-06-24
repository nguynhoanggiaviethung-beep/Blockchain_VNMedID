import React, { useState } from 'react';
import axios from 'axios';

const SPECIALTIES = [
  "Nội tổng quát", "Ngoại tổng quát", "Nhi khoa",
  "Tim mạch", "Da liễu", "Tai mũi họng",
  "Mắt", "Răng hàm mặt", "Thần kinh", "Xương khớp",
];

export default function PatientBookingForm() {
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await axios.get("https://blockchain-vnmedid.onrender.com/api/v1/doctors/hospitals");
        if (response.data?.success) {
          setHospitals(response.data.hospitals);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách bệnh viện:", error);
      } finally {
        setLoadingHospitals(false);
      }
    };

    fetchHospitals();
  }, []);
}

export default function PatientBookingForm({ onBookingSuccess }) {
  const [specialty, setSpecialty]   = useState('');
  const [appointmentDate, setDate]  = useState('');
  const [trieuChung, setTrieuChung] = useState('');
  const [hospitalName, setHospitalName] = useState(''); // ✅ Thêm state lưu bệnh viện được chọn
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState('');

  const handleBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token       = localStorage.getItem('token');
      const patientId   = localStorage.getItem('userId');
      const patientName = localStorage.getItem('fullName');

      const response = await axios.post(
        'https://blockchain-vnmedid.onrender.com/api/v1/visits', // ✅ đúng endpoint
        {
          patientId,
          patientName,
          specialty,
          appointmentDate,
          trieuChungLamSang: trieuChung,
          hospitalName, // ✅ THÊM: Đẩy tên bệnh viện lên API Backend
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage('🎉 Đăng ký khám thành công! Chờ hệ thống tự động phân phối về bệnh viện.');
        setSpecialty('');
        setDate('');
        setTrieuChung('');
        setHospitalName(''); // Reset bộ chọn bệnh viện
        if (onBookingSuccess) onBookingSuccess();
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '500px', margin: '20px 0' }}>
      <h3 style={{ color: '#0A2D6E', marginTop: 0, fontSize: '16px', fontWeight: '700' }}>
        🗓️ ĐĂNG KÝ PHÒNG KHÁM ONLINE
      </h3>

      <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ✅ THÊM MỚI: Bộ chọn Cơ sở Bệnh viện khám */}
        <div>
          <label style={labelStyle}>Cơ sở Bệnh viện khám <span style={{ color: 'red' }}>*</span></label>
          <select 
            value={hospitalName} 
            onChange={(e) => setHospitalName(e.target.value)} 
            required 
            style={inputStyle}
          >
            <option value="">-- Chọn bệnh viện tiếp nhận --</option>
            {HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* Chuyên khoa */}
        <div>
          <label style={labelStyle}>Chuyên khoa <span style={{ color: 'red' }}>*</span></label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} required style={inputStyle}>
            <option value="">-- Chọn chuyên khoa --</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Ngày khám */}
        <div>
          <label style={labelStyle}>Ngày khám <span style={{ color: 'red' }}>*</span></label>
          <input
            type="date"
            value={appointmentDate}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Triệu chứng */}
        <div>
          <label style={labelStyle}>Triệu chứng hiện tại</label>
          <textarea
            value={trieuChung}
            onChange={(e) => setTrieuChung(e.target.value)}
            placeholder="Ví dụ: Ho sốt 2 ngày, đau rát họng, mệt mỏi..."
            rows="3"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ background: '#0A2D6E', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Đang xử lý...' : 'Gửi yêu cầu đăng ký khám'}
        </button>

        {message && (
          <p style={{ fontSize: '13px', fontWeight: '600', color: message.includes('thành công') ? '#10b981' : '#ef4444', margin: 0 }}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#475569', marginBottom: '6px'
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px',
  borderRadius: '6px', border: '1px solid #cbd5e1',
  fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: '#fff'
};