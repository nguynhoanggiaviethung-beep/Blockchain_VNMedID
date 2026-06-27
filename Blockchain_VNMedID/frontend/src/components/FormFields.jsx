const FormFields = ({ form, setForm, isEdit = false, doctors, inputStyle, ERROR, PRIMARY_MED, GRAY_TEXT }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
    <div>
      <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Bác sĩ <span style={{ color: ERROR }}>*</span></label>
      <select value={form.doctorId || ""} onChange={e => setForm({ ...form, doctorId: e.target.value })} style={inputStyle}>
        <option value="">-- Chọn bác sĩ --</option>
        {!isEdit && <option value="ALL_DOCTORS" style={{ fontWeight: "bold", color: PRIMARY_MED }}>🌟 TẤT CẢ BÁC SĨ</option>}
        {doctors.map(d => (
          <option key={d._id} value={d._id}>
            {d.fullName || d["Họ và tên"]} {d.specialty ? `– ${d.specialty}` : ""}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Ngày trực <span style={{ color: ERROR }}>*</span></label>
      <input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
    </div>
    <div>
      <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Ca trực</label>
      <select value={form.shift || "morning"} onChange={e => setForm({ ...form, shift: e.target.value })} style={inputStyle}>
        <option value="morning">🌅 Ca sáng (07:00 – 11:30)</option>
        <option value="afternoon">☀️ Ca chiều (13:00 – 17:00)</option>
      </select>
    </div>
    <div>
      <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Phòng khám</label>
      <input type="text" value={form.room || ""} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="VD: Phòng 101..." style={inputStyle} />
    </div>
    <div>
      <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Trạng thái</label>
      <select value={form.status || "active"} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
        <option value="active">✅ Hoạt động</option>
        <option value="inactive">⛔ Tạm nghỉ</option>
        <option value="full">🔴 Đã đầy</option>
      </select>
    </div>
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>Ghi chú</label>
      <input type="text" value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú thêm..." style={inputStyle} />
    </div>
  </div>
)

export default FormFields;