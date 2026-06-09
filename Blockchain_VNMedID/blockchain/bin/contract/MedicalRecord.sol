// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// @title   MedicalRecord - Hợp đồng quản lý hồ sơ bệnh án VNmedID
// @notice  Chịu trách nhiệm: (1) Quản lý quyền truy cập hồ sơ dựa trên UUID
//          của database Backend, và (2) Lưu trữ mã băm IPFS của bệnh án.
// @dev     Tuân thủ nguyên tắc Đơn trách nhiệm (SRP) - KHÔNG chứa nghiệp vụ
//          thanh toán. Hoạt động theo mô hình Web 2.5: Backend Relayer là
//          trung gian duy nhất được phép ghi dữ liệu lên chain.
// @author  VNmedID Blockchain Team

// -----------------------------------------------------------------------------
// @notice Interface giao tiếp với hợp đồng đăng ký người dùng (UserRegistry).
//         Backend cần deploy UserRegistry trước, sau đó truyền địa chỉ vào
//         constructor của hợp đồng này.
// -----------------------------------------------------------------------------
interface IUserRegistry {
    /**
     * @notice Kiểm tra xem một ví có được gán vai trò cụ thể không.
     * @param _wallet Địa chỉ ví cần kiểm tra.
     * @param _role   Mã số vai trò (ví dụ: ROLE_DOCTOR = 2).
     * @return bool   Trả về `true` nếu ví có vai trò đó, ngược lại `false`.
     */
    function isAuthorizedRole(address _wallet, uint8 _role) external view returns (bool);
}

contract MedicalRecord {
    // STATE VARIABLES

    /// @notice Instance của hợp đồng UserRegistry để xác thực vai trò.
    IUserRegistry public userRegistry;

    /// @notice Địa chỉ ví Admin của Node.js Backend (Backend Relayer).
    ///         Đây là địa chỉ DUY NHẤT được phép gọi các hàm ghi (write).
    ///         Được gán bằng msg.sender tại thời điểm deploy.
    address public backendRelayer;

    /// @dev Hằng số định nghĩa mã số vai trò Bác sĩ, khớp với UserRegistry.
    uint8 constant ROLE_DOCTOR = 2;

    // DATA STRUCTURES

    /**
     * @notice Cấu trúc lưu một bản ghi nhật ký truy cập hồ sơ.
     * @param doctorWallet  Địa chỉ ví của bác sĩ được cấp/thu hồi quyền.
     * @param isAllowed     `true` = cấp quyền, `false` = thu hồi quyền.
     * @param timestamp     Thời điểm thực hiện hành động (unix timestamp).
     */
    struct AccessLog {
        address doctorWallet;
        bool    isAllowed;
        uint256 timestamp;
    }

    // MAPPINGS

    /**
     * @notice Mapping phân quyền truy cập hồ sơ.
     * @dev    Ánh xạ: UUID bệnh nhân (string) -> Ví bác sĩ (address) -> Trạng thái (bool).
     *         Công khai (public) để Backend có thể query nhanh không cần gọi hàm.
     */
    mapping(string => mapping(address => bool)) public hasAccess;

    /**
     * @notice Mapping lưu toàn bộ lịch sử cấp/thu hồi quyền theo UUID bệnh nhân.
     * @dev    Private - chỉ truy cập thông qua hàm `getAccessLogs` để phục vụ Audit Trail.
     */
    mapping(string => AccessLog[]) private patientAccessLogs;

    /**
     * @notice Mapping lưu danh sách mã băm IPFS của bệnh án theo UUID bệnh nhân.
     * @dev    Private - chỉ truy cập thông qua hàm `getRecordHashes`.
     *         Mỗi phần tử là một CID (Content Identifier) trên mạng IPFS.
     */
    mapping(string => string[]) private patientRecords;

    // EVENTS

    /**
     * @notice Phát sinh khi quyền truy cập của một bác sĩ được cập nhật.
     * @param patientId    UUID của bệnh nhân trong database Backend.
     * @param doctorWallet Địa chỉ ví của bác sĩ bị ảnh hưởng.
     * @param isAllowed    Trạng thái quyền mới: `true` = cấp, `false` = thu hồi.
     * @param timestamp    Thời điểm xảy ra sự kiện.
     */
    event AccessUpdated(
        string  indexed patientId,
        address indexed doctorWallet,
        bool            isAllowed,
        uint256         timestamp
    );

    /**
     * @notice Phát sinh khi một mã băm IPFS bệnh án mới được thêm vào hồ sơ.
     * @param patientId    UUID của bệnh nhân trong database Backend.
     * @param doctorWallet Địa chỉ ví của bác sĩ đã thêm bệnh án.
     * @param recordHash   Mã băm IPFS (CID) của tài liệu bệnh án.
     * @param timestamp    Thời điểm xảy ra sự kiện.
     */
    event RecordAdded(
        string  indexed patientId,
        address indexed doctorWallet,
        string          recordHash,
        uint256         timestamp
    );
    // MODIFIERS

    /**
     * @notice Bảo vệ hàm, chỉ cho phép `backendRelayer` gọi.
     * @dev    Cơ chế bảo mật Web 2.5: Người dùng cuối không bao giờ tương tác
     *         trực tiếp với contract. Mọi lệnh ghi phải đi qua Backend Relayer
     *         đã được xác thực và ủy quyền ở tầng Backend.
     */
    modifier onlyRelayer() {
        require(
            msg.sender == backendRelayer,
            "MedicalRecord: Only Backend Relayer can call this"
        );
        _;
    }
    // CONSTRUCTOR


    /**
     * @notice Khởi tạo hợp đồng với địa chỉ của UserRegistry.
     * @dev    Người deploy hợp đồng sẽ tự động trở thành `backendRelayer`.
     *         Đảm bảo deploy bằng đúng ví Admin của Node.js Backend.
     * @param _registryAddress Địa chỉ của hợp đồng IUserRegistry đã được deploy.
     */
    constructor(address _registryAddress) {
        require(
            _registryAddress != address(0),
            "MedicalRecord: Registry address cannot be zero"
        );
        userRegistry   = IUserRegistry(_registryAddress);
        backendRelayer = msg.sender;
    }

    // WRITE FUNCTIONS (chỉ Backend Relayer được gọi)

    /**
     * @notice Cấp quyền truy cập hồ sơ bệnh nhân cho một bác sĩ.
     * @dev    Luồng gọi: Backend xác thực nghiệp vụ -> ký giao dịch -> gọi hàm này.
     *         Hàm thực hiện kiểm tra kép trên chain để đảm bảo tính toàn vẹn dữ liệu.
     * @param _patientId    UUID của bệnh nhân (lấy từ database Backend).
     * @param _doctorWallet Địa chỉ ví của bác sĩ cần cấp quyền.
     */
    function grantAccess(
        string  calldata _patientId,
        address          _doctorWallet
    ) external onlyRelayer {
        // Kiểm tra 1: Xác minh _doctorWallet có vai trò ROLE_DOCTOR trong hệ thống không.
        require(
            userRegistry.isAuthorizedRole(_doctorWallet, ROLE_DOCTOR),
            "MedicalRecord: Target wallet is not a registered Doctor"
        );

        // Kiểm tra 2: Ngăn chặn cấp quyền trùng lặp - bác sĩ chưa có quyền trước đó.
        require(
            !hasAccess[_patientId][_doctorWallet],
            "MedicalRecord: Doctor already has access to this record"
        );

        // Cập nhật trạng thái quyền truy cập.
        hasAccess[_patientId][_doctorWallet] = true;

        // Ghi nhận lịch sử vào Audit Trail.
        patientAccessLogs[_patientId].push(AccessLog({
            doctorWallet : _doctorWallet,
            isAllowed    : true,
            timestamp    : block.timestamp
        }));

        emit AccessUpdated(_patientId, _doctorWallet, true, block.timestamp);
    }

    /**
     * @notice Thu hồi quyền truy cập hồ sơ bệnh nhân của một bác sĩ.
     * @dev    Chỉ có thể thu hồi nếu bác sĩ đang thực sự có quyền.
     * @param _patientId    UUID của bệnh nhân (lấy từ database Backend).
     * @param _doctorWallet Địa chỉ ví của bác sĩ cần thu hồi quyền.
     */
    function revokeAccess(
        string  calldata _patientId,
        address          _doctorWallet
    ) external onlyRelayer {
        // Kiểm tra: Bác sĩ phải đang có quyền thì mới thu hồi được.
        require(
            hasAccess[_patientId][_doctorWallet],
            "MedicalRecord: Doctor does not have access to revoke"
        );

        // Cập nhật trạng thái quyền truy cập.
        hasAccess[_patientId][_doctorWallet] = false;

        // Ghi nhận lịch sử vào Audit Trail.
        patientAccessLogs[_patientId].push(AccessLog({
            doctorWallet : _doctorWallet,
            isAllowed    : false,
            timestamp    : block.timestamp
        }));

        emit AccessUpdated(_patientId, _doctorWallet, false, block.timestamp);
    }

    /**
     * @notice Thêm mã băm IPFS của một bệnh án vào hồ sơ bệnh nhân.
     * @dev    Bảo mật kép: Backend Relayer đã xác thực ở tầng nghiệp vụ,
     *         contract tiếp tục kiểm tra quyền on-chain trước khi ghi.
     *         Điều này ngăn chặn trường hợp Relayer bị tấn công hoặc lỗi logic.
     * @param _patientId    UUID của bệnh nhân (lấy từ database Backend).
     * @param _doctorWallet Địa chỉ ví của bác sĩ đang tạo bệnh án.
     * @param _recordHash   Mã băm IPFS (CID v0/v1) của tài liệu bệnh án đã upload.
     */
    function addRecordHash(
        string  calldata _patientId,
        address          _doctorWallet,
        string  calldata _recordHash
    ) external onlyRelayer {
        // Bảo mật kép: Xác minh bác sĩ thực sự đang có quyền trước khi cho phép ghi.
        require(
            hasAccess[_patientId][_doctorWallet],
            "MedicalRecord: Doctor is not authorized to add records for this patient"
        );

        // Lưu mã băm IPFS vào hồ sơ bệnh nhân.
        patientRecords[_patientId].push(_recordHash);

        emit RecordAdded(_patientId, _doctorWallet, _recordHash, block.timestamp);
    }

    // READ FUNCTIONS (view - không tốn gas khi gọi trực tiếp từ off-chain)

    /**
     * @notice Kiểm tra quyền truy cập hồ sơ của một bác sĩ đối với một bệnh nhân.
     * @dev    Backend nên gọi hàm này để verify trước khi cho phép bác sĩ xem hồ sơ.
     *         Lưu ý: `hasAccess` là public mapping nên cũng có thể query trực tiếp.
     * @param _patientId    UUID của bệnh nhân.
     * @param _doctorWallet Địa chỉ ví của bác sĩ cần kiểm tra.
     * @return bool         `true` nếu bác sĩ có quyền, `false` nếu không.
     */
    function checkPermission(
        string  calldata _patientId,
        address          _doctorWallet
    ) external view returns (bool) {
        return hasAccess[_patientId][_doctorWallet];
    }

    /**
     * @notice Lấy toàn bộ nhật ký lịch sử cấp/thu hồi quyền của một bệnh nhân.
     * @dev    Dùng cho tính năng Audit Trail - giúp truy vết mọi thay đổi quyền.
     *         Trả về mảng rỗng nếu bệnh nhân chưa có lịch sử nào.
     * @param _patientId UUID của bệnh nhân.
     * @return           Mảng các AccessLog theo thứ tự thời gian (cũ -> mới).
     */
    function getAccessLogs(
        string calldata _patientId
    ) external view returns (AccessLog[] memory) {
        return patientAccessLogs[_patientId];
    }

    /**
     * @notice Lấy danh sách tất cả mã băm IPFS của bệnh án thuộc về một bệnh nhân.
     * @dev    Backend dùng các hash này để fetch tài liệu thực tế từ IPFS Gateway.
     *         Trả về mảng rỗng nếu bệnh nhân chưa có bệnh án nào trên chain.
     * @param _patientId UUID của bệnh nhân.
     * @return           Mảng các chuỗi CID (IPFS Content Identifier) theo thứ tự thêm vào.
     */
    function getRecordHashes(
        string calldata _patientId
    ) external view returns (string[] memory) {
        return patientRecords[_patientId];
    }
}