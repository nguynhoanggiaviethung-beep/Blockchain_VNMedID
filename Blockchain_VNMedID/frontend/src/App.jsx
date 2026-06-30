import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import DoctorExamination from './pages/DoctorExamination'
import SetupWallet from './pages/SetupWallet'

// ✅ Protected Route — kiểm tra token + role
const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('userRole')
  const token = localStorage.getItem('token')

  if (!token || !userRole) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />
  }

  return children
}

// ✅ Wallet Route — chỉ vào được khi đã đăng nhập
const WalletRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')

  if (!token || !userRole) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang đăng nhập công khai */}
        <Route path="/" element={<Login />} />

        {/* ✅ Trang setup ví — sau khi đăng nhập, trước khi vào dashboard */}
        <Route
          path="/setup-wallet"
          element={
            <WalletRoute>
              <SetupWallet />
            </WalletRoute>
          }
        />

        {/* 1. Trang bệnh nhân */}
        <Route
          path="/dashboard/patient"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* 2. Trang bác sĩ */}
        <Route
          path="/dashboard/doctor"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Trang khám bệnh */}
        <Route
          path="/dashboard/doctor/diagnose/:id"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorExamination />
            </ProtectedRoute>
          }
        />

        {/* 3. Trang admin */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App