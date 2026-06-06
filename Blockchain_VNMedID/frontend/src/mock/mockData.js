export const mockPatientList = [
  { _id: "1", fullName: "Nguyễn Văn A", dob: "1990-05-15", gender: "Male", phone: "0901234567" },
  { _id: "2", fullName: "Trần Thị B", dob: "1985-08-20", gender: "Female", phone: "0912345678" },
  { _id: "3", fullName: "Lê Văn C", dob: "1995-03-10", gender: "Male", phone: "0923456789" },
];

export const mockDoctorList = [
  { _id: "1", fullName: "BS. Hoàng Thị Minh Anh", specialty: "Nội khoa", licenseNumber: "BS001" },
  { _id: "2", fullName: "BS. Nguyễn Văn An", specialty: "Tim mạch", licenseNumber: "BS002" },
];

export const mockGetDoctorResponse = {
  data: {
    fullName: "BS. Hoàng Thị Minh Anh",
    specialty: "Nội khoa",
    licenseNumber: "BS-12345"
  }
};

export const mockGetPatientResponse = {
  data: {
    fullName: "Nguyễn Văn A",
    dob: "1990-05-15",
    gender: "Male",
    phone: "0901234567"
  }
};