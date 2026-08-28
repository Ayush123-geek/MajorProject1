const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const PDFDocument = require("pdfkit");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay instance if keys exist
const getRazorpayInstance = () => {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        return new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return null;
};

// Step 1: Create Payment Order
module.exports.createPaymentOrder = async (req, res) => {
    try {
        let { id } = req.params;
        let { checkIn, checkOut } = req.body || {};

        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found." });
        }

        const start = new Date(checkIn);
        const end = new Date(checkOut);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
            return res.status(400).json({ success: false, message: "Invalid check-in or check-out dates." });
        }

        // Check for overlapping confirmed bookings
        const existingConflict = await Booking.findOne({
            listing: id,
            status: "Confirmed",
            $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }],
        });

        if (existingConflict) {
            return res.status(400).json({
                success: false,
                message: "These dates are already reserved by another guest. Please select different dates.",
            });
        }

        // Calculate nights & pricing
        const diffTime = Math.abs(end - start);
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const basePrice = listing.price * nights;
        const gstAmount = Math.round(basePrice * 0.18);
        const totalPrice = basePrice + gstAmount;

        const razorpay = getRazorpayInstance();

        if (razorpay) {
            const options = {
                amount: totalPrice * 100, // amount in paise
                currency: "INR",
                receipt: `receipt_${Date.now()}`,
            };
            const order = await razorpay.orders.create(options);
            return res.json({
                success: true,
                isTestSimulated: false,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
                nights,
                basePrice,
                gstAmount,
                totalPrice,
                listingTitle: listing.title,
            });
        } else {
            // Test simulation fallback when Razorpay API keys are not in .env
            const simulatedOrderId = `order_test_${Date.now()}`;
            return res.json({
                success: true,
                isTestSimulated: true,
                orderId: simulatedOrderId,
                amount: totalPrice * 100,
                currency: "INR",
                keyId: "rzp_test_demo",
                nights,
                basePrice,
                gstAmount,
                totalPrice,
                listingTitle: listing.title,
            });
        }
    } catch (err) {
        console.error("Error creating payment order:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Step 2: Verify Payment & Confirm Booking
module.exports.verifyPayment = async (req, res) => {
    try {
        let { id } = req.params;
        let {
            checkIn,
            checkOut,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            isTestSimulated,
        } = req.body || {};

        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found." });
        }

        const start = new Date(checkIn);
        const end = new Date(checkOut);

        // Verify Razorpay HMAC signature if live test keys are configured
        if (!isTestSimulated && process.env.RAZORPAY_KEY_SECRET) {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Payment signature verification failed." });
            }
        }

        // Calculate nights & pricing
        const diffTime = Math.abs(end - start);
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const basePrice = listing.price * nights;
        const gstAmount = Math.round(basePrice * 0.18);
        const totalPrice = basePrice + gstAmount;

        const newBooking = new Booking({
            listing: id,
            user: req.user._id,
            checkIn: start,
            checkOut: end,
            nights,
            basePrice,
            gstAmount,
            totalPrice,
            status: "Confirmed",
            paymentStatus: "Paid",
            razorpayOrderId: razorpay_order_id || `order_sim_${Date.now()}`,
            razorpayPaymentId: razorpay_payment_id || `pay_sim_${Date.now()}`,
        });

        await newBooking.save();
        req.flash("success", "Payment successful & Reservation confirmed! You can view your invoice in My Bookings.");
        return res.json({ success: true, redirectUrl: "/bookings" });
    } catch (err) {
        console.error("Error verifying payment:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Existing createBooking fallback (Form POST fallback)
module.exports.createBooking = async (req, res) => {
    let { id } = req.params;
    let { checkIn, checkOut } = req.body;

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        req.flash("error", "Invalid check-in or check-out dates.");
        return res.redirect(`/listings/${id}`);
    }

    const existingConflict = await Booking.findOne({
        listing: id,
        status: "Confirmed",
        $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }],
    });

    if (existingConflict) {
        req.flash("error", "These dates are already reserved by another guest. Please select different dates.");
        return res.redirect(`/listings/${id}`);
    }

    const diffTime = Math.abs(end - start);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const basePrice = listing.price * nights;
    const gstAmount = Math.round(basePrice * 0.18);
    const totalPrice = basePrice + gstAmount;

    const newBooking = new Booking({
        listing: id,
        user: req.user._id,
        checkIn: start,
        checkOut: end,
        nights,
        basePrice,
        gstAmount,
        totalPrice,
        status: "Confirmed",
        paymentStatus: "Paid",
        razorpayOrderId: `order_sim_${Date.now()}`,
        razorpayPaymentId: `pay_sim_${Date.now()}`,
    });

    await newBooking.save();
    req.flash("success", "Reservation confirmed! You can view your invoice in My Bookings.");
    res.redirect("/bookings");
};

// Render current user's reservations
module.exports.renderUserBookings = async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });

    res.render("users/bookings.ejs", { bookings });
};

// Stream PDF invoice receipt
module.exports.downloadInvoice = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate("listing").populate("user");

    if (!booking || (!booking.user._id.equals(req.user._id) && !req.user._id.equals(booking.listing.owner))) {
        req.flash("error", "Booking invoice not found or unauthorized access.");
        return res.redirect("/bookings");
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=Wanderlust_Invoice_${booking._id}.pdf`
    );

    doc.pipe(res);

    // Header
    doc.fillColor("#fe424d").fontSize(26).text("Wanderlust", 50, 50, { bold: true });
    doc.fillColor("#4b5563").fontSize(10).text("Explore Amazing Stays Worldwide", 50, 80);
    doc.moveDown(1.5);

    doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, 100).lineTo(550, 100).stroke();

    // Invoice Title & Details
    doc.fillColor("#111827").fontSize(18).text("BOOKING RECEIPT & INVOICE", 50, 115);
    doc.fontSize(10).fillColor("#6b7280").text(`Invoice ID: ${booking._id}`, 50, 140);
    doc.text(`Booking Date: ${new Date(booking.createdAt).toLocaleDateString("en-IN")}`, 50, 155);

    // Customer & Property Info
    doc.fillColor("#111827").fontSize(12).text("Guest Details:", 50, 185, { underline: true });
    doc.fontSize(10).fillColor("#374151")
        .text(`Name: ${booking.user.username}`)
        .text(`Email: ${booking.user.email}`);

    doc.fillColor("#111827").fontSize(12).text("Property Details:", 300, 185, { underline: true });
    doc.fontSize(10).fillColor("#374151")
        .text(`Stay: ${booking.listing ? booking.listing.title : 'Stay'}`)
        .text(`Location: ${booking.listing ? booking.listing.location : ''}, ${booking.listing ? booking.listing.country : ''}`);

    doc.moveDown(2);
    doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, 245).lineTo(550, 245).stroke();

    // Booking Breakdown Table Header
    doc.fillColor("#111827").fontSize(12).text("Reservation & Payment Summary", 50, 260, { bold: true });
    
    let y = 285;
    doc.fontSize(10).fillColor("#6b7280")
        .text("Check-In Date:", 50, y)
        .fillColor("#111827").text(new Date(booking.checkIn).toLocaleDateString("en-IN"), 180, y);

    y += 20;
    doc.fillColor("#6b7280").text("Check-Out Date:", 50, y)
        .fillColor("#111827").text(new Date(booking.checkOut).toLocaleDateString("en-IN"), 180, y);

    y += 20;
    doc.fillColor("#6b7280").text("Duration:", 50, y)
        .fillColor("#111827").text(`${booking.nights} Night(s)`, 180, y);

    y += 20;
    doc.fillColor("#6b7280").text("Payment Status:", 50, y)
        .fillColor("#10b981").text(`${booking.paymentStatus || "Paid"} (Razorpay Verified)`, 180, y);

    y += 20;
    doc.fillColor("#6b7280").text("Payment Ref ID:", 50, y)
        .fillColor("#111827").text(booking.razorpayPaymentId || "N/A", 180, y);

    doc.moveDown(2);
    doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, y + 25).lineTo(550, y + 25).stroke();

    // Financial Calculation
    y += 40;
    doc.fillColor("#374151").fontSize(10)
        .text("Base Rate Total:", 50, y)
        .text(`INR ${booking.basePrice.toLocaleString("en-IN")}`, 430, y, { align: "right" });

    y += 20;
    doc.text("GST Tax (18%):", 50, y)
        .text(`INR ${booking.gstAmount.toLocaleString("en-IN")}`, 430, y, { align: "right" });

    y += 25;
    doc.strokeColor("#fe424d").lineWidth(1.5).moveTo(50, y).lineTo(550, y).stroke();
    
    y += 10;
    doc.fillColor("#fe424d").fontSize(14).text("Total Amount Paid:", 50, y)
        .text(`INR ${booking.totalPrice.toLocaleString("en-IN")}`, 400, y, { align: "right" });

    // Footer Note
    doc.fontSize(9).fillColor("#9ca3af").text(
        "Thank you for booking with Wanderlust! Please present this invoice upon arrival at the stay.",
        50,
        680,
        { align: "center", width: 500 }
    );

    doc.end();
};

// Cancel reservation
module.exports.cancelBooking = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking || !booking.user.equals(req.user._id)) {
        req.flash("error", "Booking not found or unauthorized.");
        return res.redirect("/bookings");
    }

    booking.status = "Cancelled";
    await booking.save();
    req.flash("success", "Reservation cancelled successfully.");
    res.redirect("/bookings");
};
