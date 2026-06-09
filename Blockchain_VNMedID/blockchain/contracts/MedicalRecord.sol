// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAccessControlForRecord {
    function checkAccess(string calldata patientId, address doctorWallet)
        external
        view
        returns (bool);
}

contract MedicalRecord {
    address public admin;
    IAccessControlForRecord public accessControl;

    struct RecordInfo {
        string patientId;
        address doctorWallet;
        string recordHash;
        uint256 time;
    }

    mapping(string => string[]) private patientRecordHashes;
    RecordInfo[] private records;

    event RecordHashAdded(
        string patientId,
        address doctorWallet,
        string recordHash,
        uint256 time
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address accessControlAddress) {
        admin = msg.sender;
        accessControl = IAccessControlForRecord(accessControlAddress);
    }

    function addRecordHash(
        string calldata patientId,
        address doctorWallet,
        string calldata recordHash
    ) external onlyAdmin {
        require(bytes(patientId).length > 0, "Patient empty");
        require(bytes(recordHash).length > 0, "Hash empty");
        require(
            accessControl.checkAccess(patientId, doctorWallet),
            "No access"
        );

        patientRecordHashes[patientId].push(recordHash);

        records.push(RecordInfo(
            patientId,
            doctorWallet,
            recordHash,
            block.timestamp
        ));

        emit RecordHashAdded(
            patientId,
            doctorWallet,
            recordHash,
            block.timestamp
        );
    }

    function getRecordHashes(string calldata patientId)
        external
        view
        returns (string[] memory)
    {
        return patientRecordHashes[patientId];
    }

    function getRecordCount() external view returns (uint256) {
        return records.length;
    }
}