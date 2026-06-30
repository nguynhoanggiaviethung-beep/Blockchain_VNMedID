import  { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DoctorExamination = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Tự động điều hướng bác sĩ quay trở lại Dashboard chính
    const timer = setTimeout(() => {
      navigate('/dashboard/doctor');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#F4F7FB", 
      display: "flex", 
      flexDirection: "column",
      justifyContent: "center", 
      alignItems: "center", 
      fontFamily: "sans-serif" 
    }}>
      <div style={{ 
        background: "#fff", 
        padding: "32px", 
        borderRadius: 14, 
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)", 
        textAlign: "center" 
      }}>
        <span style={{ fontSize: 40 }}>🔄</span>
        <h3 style={{ color: "#0A2D6E", marginTop: 16 }}>Đang chuyển hướng...</h3>
        <p style={{ color: "#5F6B7A", fontSize: 14 }}>
          Hệ thống đang đưa bạn quay trở lại Bảng điều khiển khám bệnh tổng hợp.
        </p>
        <button 
          onClick={() => navigate('/dashboard/doctor')} 
          style={{ 
            background: "#1A4FA8", 
            color: "#fff", 
            border: "none", 
            padding: "8px 16px", 
            borderRadius: 6, 
            cursor: "pointer",
            fontWeight: 600,
            marginTop: 10
          }}
        >
          Quay lại ngay
        </button>
      </div>
    </div>
  );
};

export default DoctorExamination;