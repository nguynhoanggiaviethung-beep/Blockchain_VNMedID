import React, { useState, useEffect } from "react";
import axios from "axios";

const ManageInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("token");
      // Thay đổi đường dẫn API phù hợp với Backend của bạn (ví dụ: /api/admin/invoices hoặc /api/invoices)
      const response = await axios.get("http://localhost:5000/api/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(response.data);
      setLoading(false);
    } catch (err) {
      setError("Không thể tải danh sách hóa đơn!");
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Đang tải dữ liệu hóa đơn...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Quản lý Hóa đơn & Đối soát Viện phí</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-800 text-white text-left font-semibold">
              <th className="p-3 border border-gray-200">Mã Hóa Đơn</th>
              <th className="p-3 border border-gray-200">Bệnh Nhân</th>
              <th className="p-3 border border-gray-200">Số Tiền (ETH)</th>
              <th className="p-3 border border-gray-200">Trạng Thái</th>
              <th className="p-3 border border-gray-200">Ngày Tạo</th>
              <th className="p-3 border border-gray-200">Tra cứu Blockchain (Etherscan)</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr 
                key={invoice._id || index} 
                className={index % 2 === 0 ? "bg-gray-50 hover:bg-gray-100" : "bg-white hover:bg-gray-100"}
              >
                {/* 1. Mã hóa đơn */}
                <td className="p-3 border border-gray-200 font-mono text-sm text-blue-600">
                  {invoice._id || invoice.invoiceId}
                </td>
                
                {/* 2. Tên bệnh nhân */}
                <td className="p-3 border border-gray-200">
                  {invoice.patientId?.fullName || invoice.patientName || "N/A"}
                </td>
                
                {/* 3. Số tiền viện phí */}
                <td className="p-3 border border-gray-200 font-bold text-green-600">
                  {invoice.amount || invoice.totalAmount} ETH
                </td>
                
                {/* 4. Trạng thái */}
                <td className="p-3 border border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    invoice.status === "Paid" || invoice.status === "Đã thanh toán"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {invoice.status}
                  </span>
                </td>
                
                {/* 5. Ngày tạo */}
                <td className="p-3 border border-gray-200 text-sm text-gray-600">
                  {new Date(invoice.createdAt).toLocaleString("vi-VN")}
                </td>
                
                {/* 6. Mã tra cứu Etherscan */}
                <td className="p-3 border border-gray-200">
                  {invoice.transactionHash ? (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${invoice.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded shadow transition-colors"
                    >
                      🔍 Xem trên Etherscan
                    </a>
                  ) : (
                    <span className="text-gray-400 italic text-xs">Chưa có giao dịch (Chưa trả)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageInvoices;