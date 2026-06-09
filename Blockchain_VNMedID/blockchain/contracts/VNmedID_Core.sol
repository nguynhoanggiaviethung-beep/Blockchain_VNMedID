// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VNmedID_Core {
    address public admin;

    uint8 public constant ROLE_PATIENT = 1;
    uint8 public constant ROLE_DOCTOR = 2;
    uint8 public constant ROLE_ADMIN = 3;

    struct UserInfo {
        string userId;
        uint8 role;
        bool active;
    }

    struct AccessLog {
        address doctorWallet;
        bool allowed;
        uint256 time;
    }

    struct Invoice {
        address patientWallet;
        uint256 amount;
        bool paid;
    }

    mapping(address => UserInfo) private users;
    mapping(string => mapping(address => bool)) public doctorAccess;
    mapping(string => string[]) private recordHashes;
    mapping(string => AccessLog[]) private accessLogs;
    mapping(string => Invoice) public invoices;

    event UserRegistered(address wallet, string userId, uint8 role);
    event AccessGranted(string patientId, address doctorWallet, uint256 time);
    event AccessRevoked(string patientId, address doctorWallet, uint256 time);
    event RecordAdded(string patientId, address doctorWallet, string recordHash, uint256 time);
    event InvoiceCreated(string invoiceId, address patientWallet, uint256 amount);
    event InvoicePaid(string invoiceId, address patientWallet, uint256 amount, uint256 time);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        users[msg.sender] = UserInfo("ADMIN", ROLE_ADMIN, true);
    }

    function registerUser(
        address wallet,
        string calldata userId,
        uint8 role
    ) external onlyAdmin {
        require(wallet != address(0), "Wallet empty");
        require(role >= ROLE_PATIENT && role <= ROLE_ADMIN, "Role wrong");

        users[wallet] = UserInfo(userId, role, true);
        emit UserRegistered(wallet, userId, role);
    }

    function getUser(address wallet)
        external
        view
        returns (string memory userId, uint8 role, bool active)
    {
        UserInfo memory u = users[wallet];
        return (u.userId, u.role, u.active);
    }

    function grantAccess(string calldata patientId, address doctorWallet) external onlyAdmin {
        require(users[doctorWallet].active, "Doctor not active");
        require(users[doctorWallet].role == ROLE_DOCTOR, "Not doctor");

        doctorAccess[patientId][doctorWallet] = true;
        accessLogs[patientId].push(AccessLog(doctorWallet, true, block.timestamp));
        emit AccessGranted(patientId, doctorWallet, block.timestamp);
    }

    function revokeAccess(string calldata patientId, address doctorWallet) external onlyAdmin {
        doctorAccess[patientId][doctorWallet] = false;
        accessLogs[patientId].push(AccessLog(doctorWallet, false, block.timestamp));
        emit AccessRevoked(patientId, doctorWallet, block.timestamp);
    }

    function addRecordHash(
        string calldata patientId,
        address doctorWallet,
        string calldata recordHash
    ) external onlyAdmin {
        require(bytes(recordHash).length > 0, "Hash empty");
        require(doctorAccess[patientId][doctorWallet], "No access");

        recordHashes[patientId].push(recordHash);
        emit RecordAdded(patientId, doctorWallet, recordHash, block.timestamp);
    }

    function checkPermission(string calldata patientId, address doctorWallet)
        external
        view
        returns (bool)
    {
        return doctorAccess[patientId][doctorWallet];
    }

    function checkMyPermission(string calldata patientId) external view returns (bool) {
        return doctorAccess[patientId][msg.sender];
    }

    function getRecordHashes(string calldata patientId) external view returns (string[] memory) {
        return recordHashes[patientId];
    }

    function getAccessLogs(string calldata patientId) external view returns (AccessLog[] memory) {
        return accessLogs[patientId];
    }

    function createInvoice(
        string calldata invoiceId,
        address patientWallet,
        uint256 amount
    ) external onlyAdmin {
        require(patientWallet != address(0), "Patient empty");
        require(amount > 0, "Amount wrong");
        require(invoices[invoiceId].amount == 0, "Invoice exists");

        invoices[invoiceId] = Invoice(patientWallet, amount, false);
        emit InvoiceCreated(invoiceId, patientWallet, amount);
    }

    function payInvoice(string calldata invoiceId) external payable {
        Invoice storage inv = invoices[invoiceId];

        require(inv.amount > 0, "Invoice not found");
        require(inv.patientWallet == msg.sender, "Wrong patient");
        require(!inv.paid, "Already paid");
        require(msg.value == inv.amount, "Wrong amount");

        inv.paid = true;
        emit InvoicePaid(invoiceId, msg.sender, msg.value, block.timestamp);
    }

    function withdraw() external onlyAdmin {
        payable(admin).transfer(address(this).balance);
    }
}