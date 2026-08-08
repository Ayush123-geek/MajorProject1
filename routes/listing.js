const express=require("express");
const router=express.Router();
const wrapAsync=require("../utils/wrapAsync.js");
const {isLoggedIn, isOwner, validateListing}=require("../middleware.js");
const listingController= require("../controller/listing.js");
const multer  = require('multer');
const {storage}= require("../cloudConfig.js");
const upload = multer({ storage });


router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post( isLoggedIn,
        upload.single("listing[image]"),
        validateListing, 
        wrapAsync(listingController.createListing))

//New Route
router.get("/new",isLoggedIn,listingController.renderNewForm);

router
    .route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(isLoggedIn ,isOwner, upload.single("listing[image]"),validateListing, wrapAsync(listingController.updateListing))
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.deleteListing))


const userController= require("../controller/user.js");

//Wishlist Route
router.post("/:id/wishlist", isLoggedIn, wrapAsync(userController.toggleWishlist));

module.exports=router;
