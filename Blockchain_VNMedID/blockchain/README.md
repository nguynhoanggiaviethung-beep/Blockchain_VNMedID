# VNMedID Blockchain Module

## Network
Sepolia Testnet

## Contracts
- UserRegistry.sol: quản lý ví và role người dùng.
- AccessControl.sol: cấp/hủy quyền truy cập hồ sơ bệnh nhân cho bác sĩ.
- MedicalRecord.sol: lưu hash/IPFS hash của hồ sơ bệnh án.
- Payment.sol: demo thanh toán viện phí bằng Sepolia ETH.

## Deployment order
1. UserRegistry
2. AccessControl
3. MedicalRecord
4. Payment

## Test flow
1. Admin đăng ký doctor.
2. Admin đăng ký patient.
3. Admin cấp quyền doctor xem hồ sơ patient.
4. MedicalRecord lưu hash hồ sơ.
5. Payment tạo invoice.
6. Patient thanh toán invoice.

## Important note
Hệ thống không lưu bệnh án thật trực tiếp lên blockchain. Dữ liệu chi tiết được lưu ở database/IPFS. Blockchain chỉ lưu hash, quyền truy cập, audit log và trạng thái thanh toán.