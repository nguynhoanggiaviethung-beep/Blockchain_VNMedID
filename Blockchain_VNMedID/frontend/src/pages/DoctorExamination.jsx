import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const BASE_URL = "https://victorious-commitment-production-ba03.up.railway.app/api/v1";

const SUGGESTED_DRUGS = [
  "Paracetamol 500mg (Giảm đau, hạ sốt)",
  "Amoxicillin 500mg (Kháng sinh)",
  "Augmentin 1g (Kháng sinh nhiễm khuẩn đường hô hấp)",
  "Panadol Extra (Giảm đau đầu)",
  "Decolgen Forte (Điều trị cảm cúm, nghẹt mũi)",
  "Eugica (Thuốc ho thảo dược)",
  "Acetylcistein 200mg (Thuốc long đờm)",
  "Nexium mups 20mg (Điều trị dạ dày, trào ngược)",
  "Gaviscon (Hỗn dịch trào ngược dạ dày)",
  "Vitamin C 500mg (Tăng cường sức kháng)"
];

const DoctorExamination = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [patientData, setPatientData] = useState(null);
  const [doctorInput, setDoctorInput] = useState({ chanDoanChuyenMon: '', huongDieuTri: '' });

  const [prescriptions, setPrescriptions] = useState([
    { tenThuoc: '', soLuong: '', thoiGianUong: ['Sáng', 'Chiều'], thoiDiemAn: 'Sau khi ăn', soNgay: '5' }
  ]);

  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  useEffect(() => {
    const useMockFallback = () => {
      setPatientData({
        fullName: id === "1" ? "Nguyễn Văn A" : "Trần Thị B",
        dob: "1990-05-15",
        phone: "0901234567",
        citizenId: "012345678912",
        trieuChung: "Ho khan, sốt nhẹ về chiều, đau rát họng kéo dài 3 ngày",
        tienSuBenh: "Dạ dày nhẹ",
        diUng: "Không dị ứng",
        nhomMau: "O",
        ghiChu: "Bệnh nhân muốn kiểm tra kỹ thêm về phổi"
      });
    };
    if (id) useMockFallback();
  }, [id]);

  const handleDrugChange = (index, value) => {
    const updated = [...prescriptions];
    updated[index].tenThuoc = value;
    setPrescriptions(updated);

    if (value.trim() === '') {
      setFilteredSuggestions([]);
      setActiveSuggestionIndex(null);
    } else {
      const filtered = SUGGESTED_DRUGS.filter(drug => drug.toLowerCase().includes(value.toLowerCase()));
      setFilteredSuggestions(filtered);
      setActiveSuggestionIndex(index);
    }
  };

  const selectSuggestion = (index, drugName) => {
    const updated = [...prescriptions];
    updated[index].tenThuoc = drugName;
    setPrescriptions(updated);
    setFilteredSuggestions([]);
    setActiveSuggestionIndex(null);
  };

  const updatePrescriptionField = (index, field, value) => {
    const updated = [...prescriptions];
    updated[index][field] = value;
    setPrescriptions(updated);
  };

  const toggleThoiGianUong = (index, timeValue) => {
    const updated = [...prescriptions];
    const currentTimes = updated[index].thoiGianUong;
    if (currentTimes.includes(timeValue)) {
      updated[index].thoiGianUong = currentTimes.filter(t => t !== timeValue);
    } else {
      updated[index].thoiGianUong = [...currentTimes, timeValue];
    }
    setPrescriptions(updated);
  };

  const addDrugRow = () => {
    setPrescriptions([...prescriptions, { tenThuoc: '', soLuong: '', thoiGianUong: ['Sáng', 'Chiều'], thoiDiemAn: 'Sau khi ăn', soNgay: '5' }]);
  };

  const removeDrugRow = (index) => {
    if (prescriptions.length > 1) {
      setPrescriptions(prescriptions.filter((_, i) => i !== index));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const stringifiedPrescription = prescriptions.map((p, i) => 
      `${i+1}. ${p.tenThuoc} - SL: ${p.soLuong} viên (${p.soNgay} ngày) [Buổi: ${p.thoiGianUong.join(', ') || 'Chưa chọn'} | Thời điểm: ${p.thoiDiemAn}]`
    ).join('\n');

    // ✅ FIX: Gọi đúng endpoint /complete với recordId để cập nhật status → "completed"
    const payload = {
      recordId: id,
      diagnose: doctorInput.chanDoanChuyenMon,
      prescription: `[ĐƠN THUỐC ĐIỆN TỬ]\n${stringifiedPrescription}\n\n[LỜI DẶN]: ${doctorInput.huongDieuTri}`,
      doctorName: localStorage.getItem('fullName') || ''
    };

    try {
      const res = await fetch(`${BASE_URL}/medical-records/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Đã lưu bệnh án và cập nhật trạng thái thành công!");
        navigate('/dashboard/doctor');
      } else {
        alert("Lỗi: " + (data.message || "Không thể lưu bệnh án"));
      }
    } catch (error) {
      alert("Lỗi kết nối server: " + error.message);
    }
  };

  if (!patientData) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', paddingBottom: 60 }}>
      
      {/* HEADER */}
      <div style={{ background: '#0F172A', color: '#fff', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '0.5px' }}>HỒ SƠ KHÁM BỆNH CHI TIẾT</h2>
        <button onClick={() => navigate(-1)} style={{ background: '#F1F5F9', color: '#0F172A', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: '600' }}>
          Quay lại danh sách
        </button>
      </div>

      <div style={{ maxWidth: 1350, margin: '30px auto', padding: '0 20px' }}>
        
        {/* KHỐI 1: THÔNG TIN BỆNH NHÂN */}
        <div style={{ background: '#FFF', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 16, textTransform: 'uppercase' }}>Thông tin hành chính & lâm sàng bệnh nhân</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ background: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Họ và tên</div>
              <div style={{ fontSize: 16, fontWeight: '700', color: '#000000' }}>{patientData.fullName}</div>
            </div>
            <div style={{ background: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Ngày tháng năm sinh</div>
              <div style={{ fontSize: 16, fontWeight: '700', color: '#000000' }}>{patientData.dob ? new Date(patientData.dob).toLocaleDateString('vi-VN') : '---'}</div>
            </div>
            <div style={{ background: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Số điện thoại</div>
              <div style={{ fontSize: 16, fontWeight: '700', color: '#000000' }}>{patientData.phone}</div>
            </div>
            <div style={{ background: '#F1F5F9', padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Mã định danh CCCD</div>
              <div style={{ fontSize: 16, fontWeight: '700', color: '#000000' }}>{patientData.citizenId}</div>
            </div>
            <div style={{ gridColumn: '1 / span 4', background: '#FEF2F2', padding: 16, borderRadius: 8, border: '1px solid #FEE2E2' }}>
              <div style={{ fontSize: 12, color: '#EF4444', fontWeight: '700', marginBottom: 4 }}>Triệu chứng bệnh nhân tự khai báo:</div>
              <div style={{ fontSize: 15, fontWeight: '700', color: '#000000' }}>{patientData.trieuChung}</div>
            </div>
            <div style={{ gridColumn: '1 / span 2', background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <span style={{ fontWeight: '600', color: '#475569' }}>Tiền sử bệnh:</span> <span style={{ color: '#000000', fontWeight: '600' }}>{patientData.tienSuBenh}</span>
            </div>
            <div style={{ gridColumn: '3 / span 2', background: '#FFFBEB', padding: 14, borderRadius: 8, border: '1px solid #FEF3C7' }}>
              <span style={{ fontWeight: '700', color: '#D97706' }}>Tình trạng dị ứng:</span> <span style={{ color: '#000000', fontWeight: '600' }}>{patientData.diUng}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate}>
          
          {/* KHỐI 2: CHẨN ĐOÁN */}
          <div style={{ background: '#FFF', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid #E2E8F0', borderLeft: '6px solid #3B82F6' }}>
            <div style={{ fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginBottom: 12, textTransform: 'uppercase' }}>1. Kết luận chẩn đoán chuyên môn</div>
            <input 
              type="text"
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #CBD5E1', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: '700', outline: 'none', background: '#F8FAFC', color: '#000000' }}
              required
              value={doctorInput.chanDoanChuyenMon}
              onChange={(e) => setDoctorInput({...doctorInput, chanDoanChuyenMon: e.target.value})}
              placeholder="Nhập kết luận bệnh án tại đây..."
            />
          </div>

          {/* KHỐI 3: KÊ ĐƠN THUỐC */}
          <div style={{ background: '#FFF', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid #E2E8F0', borderLeft: '6px solid #10B981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: '700', color: '#064E3B', textTransform: 'uppercase' }}>2. Kê đơn thuốc điện tử</div>
              <button type="button" onClick={addDrugRow} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: '700', cursor: 'pointer', fontSize: 13 }}>Thêm thuốc mới</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {prescriptions.map((prescription, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#F8FAFC', padding: '20px', borderRadius: 10, border: '1px solid #E2E8F0', position: 'relative' }}>
                  
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%' }}>
                    <div style={{ flex: '2 1 400px', position: 'relative' }}>
                      <div style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginBottom: 6 }}>Tên thuốc / Hàm lượng</div>
                      <input 
                        type="text"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 15, fontWeight: '700', background: '#FFF', color: '#000000' }}
                        placeholder="Nhập tên thuốc để xem gợi ý..."
                        value={prescription.tenThuoc}
                        onChange={(e) => handleDrugChange(index, e.target.value)}
                        required
                      />
                      {activeSuggestionIndex === index && filteredSuggestions.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #CBD5E1', borderRadius: 6, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', zIndex: 50, maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
                          {filteredSuggestions.map((drug, dIdx) => (
                            <div key={dIdx} onClick={() => selectSuggestion(index, drug)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontSize: 14, fontWeight: '700', color: '#000000' }} onMouseOver={(e) => e.target.style.background = '#F1F5F9'} onMouseOut={(e) => e.target.style.background = '#fff'}>
                              {drug}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ width: 130 }}>
                      <div style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginBottom: 6 }}>Tổng số lượng</div>
                      <input 
                        type="number" min="1"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: 6, border: '1px solid #CBD5E1', textAlign: 'center', fontSize: 15, fontWeight: '700', background: '#FFF', color: '#000000' }}
                        value={prescription.soLuong}
                        onChange={(e) => updatePrescriptionField(index, 'soLuong', e.target.value)}
                        placeholder="Số viên" required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%', alignItems: 'flex-end' }}>
                    
                    <div style={{ flex: '3 1 340px' }}>
                      <div style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginBottom: 6 }}>Các buổi cần uống:</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['Sáng', 'Trưa', 'Chiều', 'Tối'].map((session) => {
                          const isSelected = prescription.thoiGianUong.includes(session);
                          let activeColor = '#2563EB';
                          if (session === 'Trưa') activeColor = '#059669';
                          if (session === 'Chiều') activeColor = '#D97706';
                          if (session === 'Tối') activeColor = '#4F46E5';
                          return (
                            <button
                              key={session} type="button"
                              onClick={() => toggleThoiGianUong(index, session)}
                              style={{ flex: 1, padding: '10px 2px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: '700', background: isSelected ? activeColor : '#E2E8F0', color: isSelected ? '#fff' : '#475569' }}
                            >
                              {session}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ flex: '4 1 420px' }}>
                      <div style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginBottom: 6 }}>Thời điểm uống thuốc:</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { key: 'Sau khi ăn', label: 'Sau khi ăn' },
                          { key: 'Trước khi ăn', label: 'Trước khi ăn' },
                          { key: 'Trong khi ăn', label: 'Trong khi ăn' },
                          { key: 'Trước khi đi ngủ', label: 'Trước khi đi ngủ' }
                        ].map((item) => {
                          const isSelected = prescription.thoiDiemAn === item.key;
                          return (
                            <button
                              key={item.key} type="button"
                              onClick={() => updatePrescriptionField(index, 'thoiDiemAn', item.key)}
                              style={{ flex: 1, padding: '10px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: '700', background: isSelected ? '#334155' : '#E2E8F0', color: isSelected ? '#fff' : '#475569' }}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ flex: '2 1 220px' }}>
                      <div style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginBottom: 6 }}>Số ngày uống:</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {['3', '5', '7'].map((day) => {
                          const isSelected = prescription.soNgay === day;
                          return (
                            <button
                              key={day} type="button"
                              onClick={() => updatePrescriptionField(index, 'soNgay', day)}
                              style={{ width: 40, height: 38, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: '700', background: isSelected ? '#047857' : '#E2E8F0', color: isSelected ? '#fff' : '#475569' }}
                            >
                              {day}N
                            </button>
                          );
                        })}
                        <input 
                          type="number" min="1"
                          style={{ width: 60, height: 38, boxSizing: 'border-box', padding: '5px', borderRadius: 6, border: '1px solid #CBD5E1', textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#000000', background: '#FFF' }}
                          value={prescription.soNgay}
                          onChange={(e) => updatePrescriptionField(index, 'soNgay', e.target.value)}
                          placeholder="Khác"
                        />
                        <span style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>Ngày</span>
                      </div>
                    </div>

                  </div>

                  {prescriptions.length > 1 && (
                    <button
                      type="button" onClick={() => removeDrugRow(index)}
                      style={{ position: 'absolute', top: 12, right: 12, background: '#EF4444', color: '#fff', border: 'none', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ✕
                    </button>
                  )}

                </div>
              ))}
            </div>
          </div>

          {/* KHỐI LỜI DẶN DÒ */}
          <div style={{ background: '#fcf7bf', borderRadius: 12, padding: 24, marginBottom: 30, border: '1px solid #eaeff5', borderLeft: '6px solid #022784' }}>
            <div style={{ fontSize: 16, fontWeight: '700', color: '#001e65', marginBottom: 12, textTransform: 'uppercase' }}>3. Lời dặn dò & Chế độ sinh hoạt</div>
            <textarea 
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #CBD5E1', padding: 14, borderRadius: 8, fontSize: 15, outline: 'none', minHeight: 70, fontFamily: 'Arial, sans-serif', fontWeight: '700', color: '#333' }}
              rows="2" value={doctorInput.huongDieuTri}
              onChange={(e) => setDoctorInput({...doctorInput, huongDieuTri: e.target.value})}
              placeholder="Nhập lời dặn bác sĩ tại đây..."
            />
          </div>

          {/* NÚT SUBMIT */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="submit" style={{ background: '#0F172A', color: '#ffffff', border: 'none', padding: '16px 80px', borderRadius: 10, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: 500 }}>
              LƯU & CẬP NHẬT HỒ SƠ BỆNH ÁN
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default DoctorExamination;