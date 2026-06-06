import React, { useState } from 'react';
import axios from 'axios';

export default function PatientBookingForm({ onBookingSuccess }) {
  const [trieuChung, setTrieuChung] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      // Gọi lên API POST '/' của medical-records chúng ta vừa sửa ở Bước 1
      const response = await axios.post('http://localhost:5000/api/v1/medical-records', 
        { trieuChung }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage('🎉 Đăng ký khám thành công! Số thứ tự của bạn đã được chuyển tới phòng bác sĩ.');
        setTrieuChung('');
        if (onBookingSuccess) onBookingSuccess(); // Gọi hàm load lại dữ liệu nếu cần
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '500px', margin: '20px 0' }}>
      <h3 style={{ color: '#0A2D6E', marginTop: 0, fontSize: '16px', fontWeight: '700' }}>🗓️ ĐĂNG KÝ PHÒNG KHÁM ONLINE</h3>
      <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
            Nhập triệu chứng hiện tại của bạn:
          </label>
          <textarea
            value={trieuChung}
            onChange={(e) => setTrieuChung(e.target.value)}
            placeholder="Ví dụ: Tôi bị ho sốt 2 ngày nay, đau rát họng, mệt mỏi..."
            required
            rows="3"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ background: '#0A2D6E', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s' }}
        >
          {loading ? 'Đang xử lý...' : 'Gửi yêu cầu vào phòng chờ khám'}
        </button>
        {message && (
          <p style={{ fontSize: '13px', fontWeight: '600', color: message.includes('thành công') ? '#10b981' : '#ef4444', marginTop: '8px', margin: 0 }}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}