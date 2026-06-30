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

    struct PatientRecord {
        string recordHash;
        address doctorWallet;
        uint256 createdAt;
    }

    mapping(string => PatientRecord[]) private patientRecords;

    event RecordHashAdded(
        string patientId,
        address doctorWallet,
        string recordHash,
        uint256 createdAt
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can do this");
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
        require(bytes(patientId).length > 0, "Patient id is empty");
        require(doctorWallet != address(0), "Doctor wallet is empty");
        require(bytes(recordHash).length > 0, "Record hash is empty");

        bool hasAccess = accessControl.checkAccess(patientId, doctorWallet);
        require(hasAccess == true, "Doctor has no access");

        PatientRecord memory newRecord = PatientRecord({
            recordHash: recordHash,
            doctorWallet: doctorWallet,
            createdAt: block.timestamp
        });

        patientRecords[patientId].push(newRecord);

        emit RecordHashAdded(
            patientId,
            doctorWallet,
            recordHash,
            block.timestamp
        );
    }

    function getPatientRecord(string calldata patientId)
        external
        view
        returns (PatientRecord[] memory)
    {
        return patientRecords[patientId];
    }

    function getRecordCount(string calldata patientId)
        external
        view
        returns (uint256)
    {
        return patientRecords[patientId].length;
    }

    function getRecordByIndex(string calldata patientId, uint256 index)
        external
        view
        returns (
            string memory recordHash,
            address doctorWallet,
            uint256 createdAt
        )
    {
        require(index < patientRecords[patientId].length, "Index is wrong");

        PatientRecord memory recordItem = patientRecords[patientId][index];

        return (
            recordItem.recordHash,
            recordItem.doctorWallet,
            recordItem.createdAt
        );
    }
}