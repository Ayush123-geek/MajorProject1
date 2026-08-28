const Listing = require("../models/listing.js");

// Helper: Geocode location using OpenStreetMap Nominatim
async function geocodeLocation(locationStr, countryStr) {
    try {
        const query = encodeURIComponent(`${locationStr}, ${countryStr}`);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
        const response = await fetch(url, {
            headers: { "User-Agent": "Wanderlust-App" },
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lon), parseFloat(data[0].lat)]; // [lng, lat] GeoJSON order
        }
    } catch (err) {
        console.error("Geocoding error:", err.message);
    }
    return [0, 0]; // fallback
}

module.exports.index = async (req, res) => {
    const { q, category, minPrice, maxPrice, amenities } = req.query;
    let filter = {};

    if (category) {
        filter.category = category;
    }

    if (q && q.trim() !== "") {
        const regex = new RegExp(q.trim(), "i");
        filter.$or = [
            { title: regex },
            { location: regex },
            { country: regex },
            { category: regex },
        ];
    }

    // Price Filter ($gte, $lte)
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice && !isNaN(Number(minPrice))) filter.price.$gte = Number(minPrice);
        if (maxPrice && !isNaN(Number(maxPrice))) filter.price.$lte = Number(maxPrice);
    }

    // Amenities Filter ($all)
    if (amenities) {
        const amenityList = Array.isArray(amenities) ? amenities : [amenities];
        filter.amenities = { $all: amenityList };
    }

    const allListings = await Listing.find(filter);
    const selectedAmenities = amenities
        ? (Array.isArray(amenities) ? amenities : [amenities])
        : [];

    res.render("listings/index.ejs", {
        allListings,
        searchQuery: q || "",
        selectedCategory: category || "",
        minPrice: minPrice || "",
        maxPrice: maxPrice || "",
        selectedAmenities,
    });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist..");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    // Geocode the location
    const coordinates = await geocodeLocation(
        req.body.listing.location,
        req.body.listing.country
    );
    newListing.geometry = { type: "Point", coordinates };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist..");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_150");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
    }

    // Re-geocode if location or country changed
    const coordinates = await geocodeLocation(
        req.body.listing.location,
        req.body.listing.country
    );
    listing.geometry = { type: "Point", coordinates };

    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};