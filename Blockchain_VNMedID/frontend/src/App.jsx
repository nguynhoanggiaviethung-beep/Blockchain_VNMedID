import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import DoctorExamination from './pages/DoctorExamination'

// Component bọc bảo vệ (Protected Route)
const ProtectedRoute = ({ children, allowedRoles }) => {
  // ✅ FIX: đổi 'role' → 'userRole' cho khớp với key Login.jsx lưu
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');

  if (!token || !userRole) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang đăng nhập công khai */}
        <Route path="/" element={<Login />} />

        {/* 1. Trang cá nhân của Bệnh nhân */}
        <Route
          path="/dashboard/patient"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* 2. Trang chủ Dashboard của Bác sĩ */}
        <Route
          path="/dashboard/doctor"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Trang nhập đơn thuốc/chẩn đoán của Bác sĩ */}
        <Route
          path="/dashboard/doctor/diagnose/:id"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorExamination />
            </ProtectedRoute>
          }
        />
        
        {/* 3. Trang của Quản trị viên */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Nếu gõ sai đường dẫn, tự động đẩy về trang Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App