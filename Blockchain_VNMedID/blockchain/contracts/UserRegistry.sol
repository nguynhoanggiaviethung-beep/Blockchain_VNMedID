// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserRegistry {
    address public admin;

    uint8 public constant ROLE_NONE = 0;
    uint8 public constant ROLE_PATIENT = 1;
    uint8 public constant ROLE_DOCTOR = 2;
    uint8 public constant ROLE_ADMIN = 3;

    struct UserInfo {
        string userId;
        uint8 role;
        bool active;
    }

    mapping(address => UserInfo) private users;

    event UserRegistered(address wallet, string userId, uint8 role);
    event UserStatusChanged(address wallet, bool active);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        users[msg.sender] = UserInfo("ADMIN", ROLE_ADMIN, true);
    }

    function registerUser(address wallet, string calldata userId, uint8 role) external onlyAdmin {
        require(wallet != address(0), "Wallet empty");
        require(bytes(userId).length > 0, "User id empty");
        require(role >= ROLE_PATIENT && role <= ROLE_ADMIN, "Role wrong");
        require(users[wallet].role == ROLE_NONE, "User exists");
        users[wallet] = UserInfo(userId, role, true);
        emit UserRegistered(wallet, userId, role);
    }

    function setUserStatus(address wallet, bool active) external onlyAdmin {
        require(wallet != address(0), "Wallet empty");
        require(users[wallet].role != ROLE_NONE, "User not found");
        users[wallet].active = active;
        emit UserStatusChanged(wallet, active);
    }

    function getUser(address wallet) external view returns (string memory userId, uint8 role, bool active) {
        UserInfo memory u = users[wallet];
        return (u.userId, u.role, u.active);
    }

    function isAuthorizedRole(address wallet, uint8 role) external view returns (bool) {
        return users[wallet].active && users[wallet].role == role;
    }
}
