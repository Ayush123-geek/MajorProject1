const User=require("../models/user.js");
const Listing=require("../models/listing.js");

module.exports.renderSignupForm=(req, res)=>{
    res.render("users/signup.ejs");
}

module.exports.signup=async(req, res)=>{
    try {
        let{ username, email, password}= req.body;
        const newUser=new User({email, username});
        const registerdUser= await User.register(newUser, password);
        req.login(registerdUser, (err)=>{
            if(err){
                next(err);
            }
            req.flash("success","Welcome to Wanderlust!");
            res.redirect("/listings");
        })
    } catch (err) {
        req.flash("error",err.message);
        res.redirect("/signup");
    }
}

module.exports.renderLoginForm= (req, res)=>{
    res.render("users/login.ejs");
}

module.exports.login=async (req,res)=>{
        req.flash("success","Welcome back to Wanderlust!");
        const redirectUrl=res.locals.redirectUrl || "/listings";
        delete req.session.redirectUrl;
        res.redirect(redirectUrl);
}

module.exports.logout=(req, res, next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","you are logged out!");
        res.redirect("/listings");
    })
}

// Wishlist: Toggle (add/remove) a listing from current user's wishlist
module.exports.toggleWishlist = async (req, res) => {
    let { id } = req.params;
    const user = await User.findById(req.user._id);
    const idx = user.wishlist.indexOf(id);
    if (idx === -1) {
        user.wishlist.push(id);
        req.flash("success", "Added to your Wishlist!");
    } else {
        user.wishlist.splice(idx, 1);
        req.flash("success", "Removed from your Wishlist.");
    }
    await user.save();
    const redirectUrl = req.get("Referrer") || "/listings";
    res.redirect(redirectUrl);
}

// Wishlist: Render user's saved listings
module.exports.renderWishlist = async (req, res) => {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.render("users/wishlist.ejs", { wishlistListings: user.wishlist });
}