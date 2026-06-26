import React, { useState, useEffect } from "react";
import axios from "axios";

const ManageInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/v1/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(response.data.data);
      setLoading(false);
    } catch (err) {
      setError("Không thể tải danh sách hóa đơn!");
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#3B82F6" }}>⏳ Đang tải dữ liệu...</div>;
  if (error) return <div style={{ padding: 24, textAlign: "center", color: "#EF4444" }}>{error}</div>;

  const paid = invoices.filter(i => i.paymentStatus === "paid").length;
  const unpaid = invoices.length - paid;

  return (
    <div style={{ padding: 24, background: "#F8FAFC", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 4, height: 32, background: "#2563EB", borderRadius: 4 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Quản lý Hóa đơn & Đối soát Viện phí
        </h2>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1D4ED8" }}>{invoices.length}</div>
          <div style={{ fontSize: 13, color: "#3B82F6", marginTop: 4 }}>Tổng hóa đơn</div>
        </div>
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#15803D" }}>{paid}</div>
          <div style={{ fontSize: 13, color: "#16A34A", marginTop: 4 }}>Đã thanh toán</div>
        </div>
        <div style={{ background: "#FEFCE8", border: "1px solid #FDE68A", borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#B45309" }}>{unpaid}</div>
          <div style={{ fontSize: 13, color: "#D97706", marginTop: 4 }}>Chưa thanh toán</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflowX: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "linear-gradient(90deg, #1E3A8A, #2563EB)", color: "#fff" }}>
              {["#", "Mã Hóa Đơn", "Bệnh Nhân", "Số Tiền (ETH)", "Trạng Thái", "Ngày Tạo", "Tra cứu Blockchain"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => {
              const isPaid = invoice.paymentStatus === "paid";
              const date = new Date(invoice.createdAt);
              return (
                <tr
                  key={invoice._id || index}
                  style={{
                    background: index % 2 === 0 ? "#fff" : "#F8FAFC",
                    borderBottom: "1px solid #F1F5F9",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"}
                  onMouseLeave={e => e.currentTarget.style.background = index % 2 === 0 ? "#fff" : "#F8FAFC"}
                >
                  {/* STT */}
                  <td style={{ padding: "12px 16px", color: "#94A3B8", textAlign: "center" }}>{index + 1}</td>

                  {/* Mã hóa đơn */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1D4ED8", background: "#EFF6FF", padding: "3px 8px", borderRadius: 6, fontSize: 13 }}>
                      {invoice.invoiceId || invoice._id}
                    </span>
                  </td>

                  {/* Bệnh nhân */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#EDE9FE", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {(invoice.patientName || "?")[0].toUpperCase()}
                      </div>
                      <span style={{ color: "#334155", fontWeight: 500 }}>{invoice.patientName}</span>
                    </div>
                  </td>

                  {/* Số tiền */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "3px 10px", borderRadius: 6 }}>
                      {invoice.amount} ETH
                    </span>
                  </td>

                  {/* Trạng thái */}
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: isPaid ? "#DCFCE7" : "#FEF9C3",
                      color: isPaid ? "#15803D" : "#B45309",
                      border: `1px solid ${isPaid ? "#86EFAC" : "#FDE68A"}`,
                      whiteSpace: "nowrap"
                    }}>
                      {isPaid ? "✅ Đã thanh toán" : "⏳ Chưa thanh toán"}
                    </span>
                  </td>

                  {/* Ngày tạo */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ color: "#334155", fontWeight: 500, fontSize: 13 }}>
                      {date.toLocaleDateString("vi-VN")}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 12 }}>
                      {date.toLocaleTimeString("vi-VN")}
                    </div>
                  </td>

                  {/* Etherscan */}
                  <td style={{ padding: "12px 16px" }}>
                    {invoice.txHash ? (
                      <a
                      
                      
                        href={`https://sepolia.etherscan.io/tx/${invoice.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "5px 12px", background: "#3B82F6", color: "#fff",
                          borderRadius: 8, fontSize: 12, fontWeight: 600,
                          textDecoration: "none", boxShadow: "0 1px 3px rgba(59,130,246,0.4)"
                        }}
                      >
                        🔍 Etherscan
                      </a>
                    ) : (
                      <span style={{ color: "#CBD5E1", fontSize: 12, fontStyle: "italic" }}>— Chưa có</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, textAlign: "right", fontSize: 12, color: "#94A3B8" }}>
        Tổng cộng {invoices.length} hóa đơn
      </div>
    </div>
  );
};

export default ManageInvoices;
