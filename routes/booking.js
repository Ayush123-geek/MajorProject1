const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const bookingController = require("../controller/booking.js");

// Razorpay Payment Endpoints
router.post("/listings/:id/create-payment-order", isLoggedIn, wrapAsync(bookingController.createPaymentOrder));
router.post("/listings/:id/verify-payment", isLoggedIn, wrapAsync(bookingController.verifyPayment));

// POST /listings/:id/bookings - Create new reservation (fallback)
router.post("/listings/:id/bookings", isLoggedIn, wrapAsync(bookingController.createBooking));

// GET /bookings - View current user's reservations
router.get("/bookings", isLoggedIn, wrapAsync(bookingController.renderUserBookings));

// GET /bookings/:id/invoice - Download PDF receipt
router.get("/bookings/:id/invoice", isLoggedIn, wrapAsync(bookingController.downloadInvoice));

// DELETE /bookings/:id - Cancel reservation
router.delete("/bookings/:id", isLoggedIn, wrapAsync(bookingController.cancelBooking));

module.exports = router;
