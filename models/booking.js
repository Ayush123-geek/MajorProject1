const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    checkIn: {
        type: Date,
        required: true,
    },
    checkOut: {
        type: Date,
        required: true,
    },
    nights: {
        type: Number,
        required: true,
    },
    basePrice: {
        type: Number,
        required: true,
    },
    gstAmount: {
        type: Number,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["Confirmed", "Cancelled"],
        default: "Confirmed",
    },
    razorpayOrderId: {
        type: String,
    },
    razorpayPaymentId: {
        type: String,
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Paid",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Booking", bookingSchema);
