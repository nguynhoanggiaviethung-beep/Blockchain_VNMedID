// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Payment {
    address public admin;

    struct Invoice {
        address patientWallet;
        uint256 amount;
        bool paid;
    }

    mapping(string => Invoice) public invoices;

    event InvoiceCreated(string invoiceId, address patientWallet, uint256 amount);
    event InvoicePaid(string invoiceId, address patientWallet, uint256 amount, uint256 time);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
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