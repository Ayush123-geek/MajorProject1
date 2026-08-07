if (process.env.NODE_ENV !== "production") {
  require('dotenv').config({ path: '../.env' });
}

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("Connected to DB successfully for seeding.");
    initDB();
  })
  .catch((error) => {
    console.error("DB Connection Error:", error);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

const initDB = async () => {
  try {
    // Find an existing user or fallback owner ID
    let ownerUser = await User.findOne({});
    let ownerId;
    if (ownerUser) {
      ownerId = ownerUser._id;
    } else {
      // Create a default admin host user if none exists
      const newAdmin = new User({ email: "admin@wanderlust.com", username: "wanderlust_admin" });
      const registeredAdmin = await User.register(newAdmin, "admin123");
      ownerId = registeredAdmin._id;
      console.log("Created default host admin user.");
    }

    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({
      ...obj,
      owner: ownerId,
    }));

    await Listing.insertMany(initData.data);
    console.log("Database initialized with", initData.data.length, "listings across all categories!");
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding:", err);
    process.exit(1);
  }
};