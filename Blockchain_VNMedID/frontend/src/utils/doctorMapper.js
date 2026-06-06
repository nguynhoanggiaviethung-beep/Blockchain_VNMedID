// src/utils/doctorMapper.js

/**
 * 1. Hàm chuyển đổi dữ liệu từ API Backend (Tiếng Việt) thành dạng CamelCase (Tiếng Anh) cho Frontend dễ code
 */
export const mapBackendToFrontend = (backendData) => {
  if (!backendData) return null;
  return {
    email: backendData.email || "",
    password: backendData.password || "",
    fullName: backendData["Họ và tên"] || backendData.fullName || "",
    dob: backendData["Ngày sinh"] || backendData.dob || "",
    gender: backendData["Giới tính"] || backendData.gender || "",
    phone: backendData["Số điện thoại"] || backendData.phone || "",
    specialty: backendData["Chuyên Khoa"] || backendData.specialty || "",
    doctorCode: backendData["Mã Bác sĩ"] || backendData.doctorCode || "",
    licenseNumber: backendData["Giấy phép hành nghề"] || backendData.licenseNumber || ""
  };
};

/**
 * 2. Hàm chuyển đổi ngược lại từ State Frontend thành đúng Body Tiếng Việt để gửi lên API Backend
 */
export const mapFrontendToBackend = (frontendData) => {
  if (!frontendData) return null;
  return {
    email: frontendData.email,
    password: frontendData.password,
    "Họ và tên": frontendData.fullName,
    "Ngày sinh": frontendData.dob,
    "Giới tính": frontendData.gender,
    "Số điện thoại": frontendData.phone,
    "Chuyên Khoa": frontendData.specialty,
    "Mã Bác sĩ": frontendData.doctorCode,
    "Giấy phép hành nghề": frontendData.licenseNumber // Chuẩn 12 số mới
  };
};