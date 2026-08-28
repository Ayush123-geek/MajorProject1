const express=require("express");
const router=express.Router({mergeParams: true});
const wrapAsync = require("../utils/wrapAsync");
const passport= require("passport");
const {saveRedirectUrl, isLoggedIn}= require("../middleware.js");
const userController=require("../controller/user.js");

router
    .route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup))

router
    .route("/login")
    .get(userController.renderLoginForm)
    .post(saveRedirectUrl ,
    passport.authenticate("local",
        {failureRedirect: "/login",
        failureFlash: true}),
    userController.login
    )

router.get("/logout",userController.logout );

// Wishlist routes
router.get("/wishlist", isLoggedIn, wrapAsync(userController.renderWishlist));
router.post("/listings/:id/wishlist", isLoggedIn, wrapAsync(userController.toggleWishlist));

// Google OAuth routes
router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: "Google authentication failed. Please try again.",
    }),
    (req, res) => {
        req.flash("success", `Welcome to Wanderlust, ${req.user.username}!`);
        res.redirect("/listings");
    }
);

module.exports= router;