const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const PDFDocument = require("pdfkit");

// Create a new reservation
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

    // Check for overlapping confirmed bookings
    const existingConflict = await Booking.findOne({
        listing: id,
        status: "Confirmed",
        $or: [
            { checkIn: { $lt: end }, checkOut: { $gt: start } },
        ],
    });

    if (existingConflict) {
        req.flash("error", "These dates are already reserved by another guest. Please select different dates.");
        return res.redirect(`/listings/${id}`);
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

    // Stream directly to response
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
        .text(`Stay: ${booking.listing.title}`)
        .text(`Location: ${booking.listing.location}, ${booking.listing.country}`);

    doc.moveDown(2);
    doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, 245).lineTo(550, 245).stroke();

    // Booking Breakdown Table Header
    doc.fillColor("#111827").fontSize(12).text("Reservation Summary", 50, 260, { bold: true });
    
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
    doc.fillColor("#6b7280").text("Status:", 50, y)
        .fillColor(booking.status === "Confirmed" ? "#10b981" : "#ef4444").text(booking.status, 180, y);

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
