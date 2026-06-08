import { useState, useEffect } from 'react';
import axios from 'axios';

const PRIMARY = "#0A2D6E"
const PRIMARY_MED = "#1A4FA8"
const PRIMARY_LIGHT = "#E6F1FB"
const GRAY_TEXT = "#5F6B7A"
const BORDER = "#CBD5E1"
const ERROR = "#E24B4A"
const BASE_URL = "http://localhost:5000/api/v1"

export default function AdminDoctors() {
  const token = localStorage.getItem("token")
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchDoctors = () => {
    setLoading(true)
    axios.get(`${BASE_URL}/doctors`, {
      headers: { Authorization: `Bearer ${token}` },
      params: search ? { search } : {}
    })
    .then(res => setDoctors(res.data?.data?.doctors || res.data?.data || []))
    .catch(err => console.error(err))
    .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDoctors() }, [])

  const handleSearch = (e) => { e.preventDefault(); fetchDoctors() }

  const openEdit = (d) => {
    setEditTarget(d._id)
    setEditForm({
      fullName:      d.fullName      || "",
      specialty:     d.specialty     || "",
      licenseNumber: d.licenseNumber || "",
      walletAddress: d.walletAddress || "",
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.put(`${BASE_URL}/doctors/${editTarget}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEditTarget(null)
      fetchDoctors()
    } catch (err) {
      alert("Lỗi cập nhật: " + (err.response?.data?.message || err.message))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/doctors/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConfirmDelete(null)
      fetchDoctors()
    } catch (err) {
      alert("Lỗi xóa: " + (err.response?.data?.message || err.message))
    }
  }

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: `1px solid ${BORDER}`, fontSize: 13, outline: "none",
    boxSizing: "border-box", background: "#F8FAFC", color: "#1E293B"
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: PRIMARY, margin: 0 }}>🩺 Quản lý bác sĩ</h2>
          <p style={{ color: GRAY_TEXT, marginTop: 4, fontSize: 14 }}>Xem, chỉnh sửa và xóa tài khoản bác sĩ</p>
        </div>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, chuyên khoa, giấy phép..."
            style={{ ...inputStyle, width: 280 }} />
          <button type="submit" style={{ background: PRIMARY, color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            🔍 Tìm
          </button>
        </form>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: PRIMARY_LIGHT }}>
              {["STT", "Họ tên", "Chuyên khoa", "Số giấy phép", "Wallet Address", "Thao tác"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 13, color: PRIMARY, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: GRAY_TEXT }}>Đang tải...</td></tr>
            ) : doctors.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: GRAY_TEXT, fontStyle: "italic" }}>Không có bác sĩ nào.</td></tr>
            ) : doctors.map((d, i) => (
              <tr key={d._id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFC", borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: PRIMARY_MED }}>#{i + 1}</td>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1E293B" }}>{d.fullName || "—"}</td>
                <td style={{ padding: "12px 14px" }}>
                  {d.specialty
                    ? <span style={{ background: PRIMARY_LIGHT, color: PRIMARY_MED, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{d.specialty}</span>
                    : "—"}
                </td>
                <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "monospace", fontSize: 13 }}>{d.licenseNumber || "—"}</td>
                <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "monospace", fontSize: 12,
                  maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.walletAddress || "—"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(d)} style={{ background: PRIMARY_LIGHT, color: PRIMARY_MED, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✏️ Sửa</button>
                    <button onClick={() => setConfirmDelete(d)} style={{ background: "#FEE2E2", color: ERROR, border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🗑 Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Sửa */}
      {editTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <h3 style={{ color: PRIMARY, marginTop: 0 }}>✏️ Chỉnh sửa bác sĩ</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Họ và tên",       key: "fullName" },
                { label: "Chuyên khoa",     key: "specialty" },
                { label: "Số giấy phép",    key: "licenseNumber" },
                { label: "Wallet Address",  key: "walletAddress" },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.key === "walletAddress" ? "1 / -1" : "auto" }}>
                  <label style={{ fontSize: 12, color: GRAY_TEXT, display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input
                    type="text"
                    value={editForm[f.key] || ""}
                    onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setEditTarget(null)} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: GRAY_TEXT, cursor: "pointer", fontWeight: 600 }}>Hủy</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: PRIMARY, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                {saving ? "Đang lưu..." : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400, textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: PRIMARY, marginTop: 0 }}>Xác nhận xóa</h3>
            <p style={{ color: GRAY_TEXT, fontSize: 14 }}>Bạn có chắc muốn xóa bác sĩ <strong>{confirmDelete.fullName}</strong>?<br />Hành động này không thể hoàn tác.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "9px 24px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: GRAY_TEXT, cursor: "pointer", fontWeight: 600 }}>Hủy</button>
              <button onClick={() => handleDelete(confirmDelete._id)} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: ERROR, color: "#fff", cursor: "pointer", fontWeight: 600 }}>🗑 Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}