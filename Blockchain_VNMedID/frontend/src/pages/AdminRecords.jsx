import { useState, useEffect } from 'react';
import axios from 'axios';

const PRIMARY = "#0A2D6E";
const PRIMARY_MED = "#1A4FA8";
const PRIMARY_LIGHT = "#E6F1FB";
const GRAY_TEXT = "#5F6B7A";
const BORDER = "#CBD5E1";
const ERROR = "#E24B4A";
const SUCCESS = "#16A34A";
const SUCCESS_LIGHT = "#DCFCE7";
const WARNING = "#D97706";
const WARNING_LIGHT = "#FEF3C7";

const BASE_URL = "https://blockchainvnmedid-production.up.railway.app/api/v1";

const STATUS_MAP = {
  pending: {
    label: "Chờ khám",
    bg: WARNING_LIGHT,
    color: WARNING,
    icon: "⏳"
  },
  examining: {
    label: "Đang khám",
    bg: PRIMARY_LIGHT,
    color: PRIMARY_MED,
    icon: "🩺"
  },
  completed: {
    label: "Đã khám",
    bg: SUCCESS_LIGHT,
    color: SUCCESS,
    icon: "✅"
  },
  cancelled: {
    label: "Đã hủy",
    bg: "#FEE2E2",
    color: ERROR,
    icon: "❌"
  },
};

const StatusBadge = ({ status }) => {
  const s =
    STATUS_MAP[status] || {
      label: status || "—",
      bg: "#F1F5F9",
      color: GRAY_TEXT,
      icon: "•"
    };

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 4
      }}
    >
      {s.icon} {s.label}
    </span>
  );
};

export default function AdminRecords() {
  const token = localStorage.getItem("token");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchRecords = () => {
    setLoading(true);

    const params = {};

    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    if (filterDate) params.date = filterDate;

    axios
      .get(`${BASE_URL}/visits`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params
      })
      .then((res) => {
         setRecords(res.data?.data?.records || res.data?.data || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const openEdit = (r) => {
    setEditTarget(r._id);

    setEditForm({
      status: r.status || "pending",
      chanDoanChuyenMon: r.chanDoanChuyenMon || "",
      huongDieuTri: r.huongDieuTri || "",
      note: r.note || "",
      followUpDate: r.followUpDate || ""
    });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await axios.put(
        `${BASE_URL}/visits/${editTarget}`,
        editForm,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setEditTarget(null);
      fetchRecords();
    } catch (err) {
      alert(
        "Lỗi cập nhật: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/visits/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setConfirmDelete(null);
      fetchRecords();
    } catch (err) {
      alert(
        "Lỗi xóa: " +
          (err.response?.data?.message || err.message)
      );
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    background: "#F8FAFC",
    color: "#1E293B"
  };

  const textareaStyle = {
    ...inputStyle,
    resize: "vertical",
    minHeight: 72,
    fontFamily: "inherit"
  };

  const stats = {
    total: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    examining: records.filter((r) => r.status === "examining").length,
    completed: records.filter((r) => r.status === "completed").length
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24
        }}
      >
        <div>
          <h2 style={{ color: PRIMARY, margin: 0 }}>
            📋 Quản lý lượt khám
          </h2>

          <p
            style={{
              color: GRAY_TEXT,
              marginTop: 4,
              fontSize: 14
            }}
          >
            Theo dõi và quản lý toàn bộ hồ sơ khám bệnh
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 24
        }}
      >
        {[
          {
            label: "Tổng lượt khám",
            value: stats.total,
            icon: "📊",
            color: PRIMARY,
            bg: PRIMARY_LIGHT
          },
          {
            label: "Chờ khám",
            value: stats.pending,
            icon: "⏳",
            color: WARNING,
            bg: WARNING_LIGHT
          },
          {
            label: "Đang khám",
            value: stats.examining,
            icon: "🩺",
            color: PRIMARY_MED,
            bg: PRIMARY_LIGHT
          },
          {
            label: "Hoàn thành",
            value: stats.completed,
            icon: "✅",
            color: SUCCESS,
            bg: SUCCESS_LIGHT
          }
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "16px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: `1px solid ${BORDER}`
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20
              }}
            >
              {s.icon}
            </div>

            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: s.color
                }}
              >
                {s.value}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: GRAY_TEXT
                }}
              >
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 16,
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          border: `1px solid ${BORDER}`
        }}
      >
        <form
          onSubmit={handleSearch}
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center"
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên BN, bác sĩ..."
            style={{
              ...inputStyle,
              width: 220,
              flex: "none"
            }}
          />

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
            style={{
              ...inputStyle,
              width: 150,
              flex: "none"
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ khám</option>
            <option value="examining">Đang khám</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) =>
              setFilterDate(e.target.value)
            }
            style={{
              ...inputStyle,
              width: 160,
              flex: "none"
            }}
          />

          <button
            type="submit"
            style={{
              background: PRIMARY,
              color: "#fff",
              border: "none",
              padding: "8px 18px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              flex: "none"
            }}
          >
            🔍 Tìm kiếm
          </button>
        </form>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          overflow: "hidden"
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >
          <thead>
            <tr style={{ background: PRIMARY_LIGHT }}>
              {[
                "STT",
                "Bệnh nhân",
                "Bác sĩ",
                "Chuyên khoa",
                "Ngày khám",
                "Lý do khám",
                "Trạng thái",
                "Thao tác"
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontSize: 13,
                    color: PRIMARY,
                    fontWeight: 600
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: 40
                  }}
                >
                  Đang tải...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: 40
                  }}
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              records.map((r, i) => (
                <tr key={r._id}>
                  <td style={{ padding: 12 }}>
                    {i + 1}
                  </td>

                  <td style={{ padding: 12 }}>
                    {r.patientId?.fullName ||
                      r.patientName ||
                      "—"}
                  </td>

                  <td style={{ padding: 12 }}>
                    {r.doctorName || "—"}
                  </td>

                  <td style={{ padding: 12 }}>
                    {r.specialty || "—"}
                  </td>

                  <td style={{ padding: 12 }}>
                    {r.appointmentDate || "—"}
                  </td>

                  <td style={{ padding: 12 }}>
                    {r.trieuChungLamSang || "—"}
                  </td>

                  <td style={{ padding: 12 }}>
                    <StatusBadge status={r.status} />
                  </td>

                  <td style={{ padding: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8
                      }}
                    >
                      <button
                        onClick={() => setViewTarget(r)}
                      >
                        👁
                      </button>

                      <button
                        onClick={() => openEdit(r)}
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() =>
                          setConfirmDelete(r)
                        }
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: 560
            }}
          >
            <h3>📋 Chi tiết lượt khám</h3>

            <p>
              <strong>Bệnh nhân:</strong>{" "}
              {viewTarget.patientId?.fullName ||
                viewTarget.patientName}
            </p>

            <p>
              <strong>Bác sĩ:</strong>{" "}
              {viewTarget.doctorName}
            </p>

            <p>
              <strong>Chuyên khoa:</strong>{" "}
              {viewTarget.specialty}
            </p>

            <p>
              <strong>Ngày khám:</strong>{" "}
              {viewTarget.appointmentDate}
            </p>

            <p>
              <strong>Triệu chứng:</strong>{" "}
              {viewTarget.trieuChungLamSang}
            </p>

            <p>
              <strong>Chẩn đoán:</strong>{" "}
              {viewTarget.chanDoanChuyenMon}
            </p>

            <p>
              <strong>Hướng điều trị:</strong>{" "}
              {viewTarget.huongDieuTri}
            </p>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end"
              }}
            >
              <button
                onClick={() => setViewTarget(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: 520
            }}
          >
            <h3>✏️ Cập nhật lượt khám</h3>

            <div
              style={{
                display: "grid",
                gap: 14
              }}
            >
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    status: e.target.value
                  })
                }
                style={inputStyle}
              >
                <option value="pending">
                  Chờ khám
                </option>

                <option value="examining">
                  Đang khám
                </option>

                <option value="completed">
                  Hoàn thành
                </option>

                <option value="cancelled">
                  Đã hủy
                </option>
              </select>

              <textarea
                value={
                  editForm.chanDoanChuyenMon
                }
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    chanDoanChuyenMon:
                      e.target.value
                  })
                }
                style={textareaStyle}
                placeholder="Chẩn đoán..."
              />

              <textarea
                value={editForm.huongDieuTri}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    huongDieuTri:
                      e.target.value
                  })
                }
                style={textareaStyle}
                placeholder="Hướng điều trị..."
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20
              }}
            >
              <button
                onClick={() =>
                  setEditTarget(null)
                }
              >
                Hủy
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              width: 400,
              textAlign: "center"
            }}
          >
            <h3>Xác nhận xóa</h3>

            <p>
              Bạn có chắc muốn xóa lượt khám này?
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                marginTop: 20
              }}
            >
              <button
                onClick={() =>
                  setConfirmDelete(null)
                }
              >
                Hủy
              </button>

              <button
                onClick={() =>
                  handleDelete(confirmDelete._id)
                }
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
