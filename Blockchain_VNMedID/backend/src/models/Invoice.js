const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    drugName: {
      type: String,
      required: true,
    },

    unitPrice: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    timesPerDay: {
      type: Number,
      default: 0,
    },

    meals: {
      type: [String],
      default: [],
    },

    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
    },

    amount: Number,

    amountInWei: {
      type: String,
      default: "",
    },

    patientWallet: String,

    txHash: String,

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    items: {
      type: [invoiceItemSchema],
      default: [],
    },

    totalVND: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);