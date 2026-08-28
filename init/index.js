if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";

const locationCoords = {
  "Malibu": [-118.7798, 34.0259],
  "New York City": [-74.0060, 40.7128],
  "Aspen": [-106.8175, 39.1911],
  "Florence": [11.2558, 43.7696],
  "Banff": [-115.5708, 51.1784],
  "London": [-0.1276, 51.5074],
  "Tuscany": [11.2558, 43.7696],
  "Serengeti": [34.8333, -2.3333],
  "Cancun": [-86.8515, 21.1619],
  "Lake Tahoe": [-120.0324, 39.0968],
  "Kyoto": [135.7681, 35.0116],
  "Swiss Alps": [8.2275, 46.5601],
  "Bali": [115.1889, -8.4095],
  "Reykjavik": [-21.9426, 64.1466],
  "Santorini": [25.4317, 36.3932],
  "Mykonos": [25.3289, 37.4467],
  "Zermatt": [7.7491, 46.0207],
  "Paris": [2.3522, 48.8566],
  "Rome": [12.4964, 41.9028],
  "Tokyo": [139.6917, 35.6895],
  "Goa": [73.8567, 15.2993],
  "Manali": [77.1887, 32.2432],
  "Jaipur": [75.7873, 26.9124],
  "Kerala": [76.2711, 10.8505],
  "Shimla": [77.1734, 31.1048],
  "Udaipur": [73.7125, 24.5854],
  "Rishikesh": [78.2676, 30.0869],
  "Darjeeling": [88.2636, 27.0410]
};

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
    let ownerUser = await User.findOne({});
    let ownerId;
    if (ownerUser) {
      ownerId = ownerUser._id;
    } else {
      const newAdmin = new User({ email: "admin@wanderlust.com", username: "wanderlust_admin" });
      const registeredAdmin = await User.register(newAdmin, "admin123");
      ownerId = registeredAdmin._id;
      console.log("Created default host admin user.");
    }

    const allAmenities = ["WiFi", "Pool", "AC", "Free Parking", "Kitchen", "TV", "Pet Friendly"];
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj, idx) => {
      const coords = locationCoords[obj.location] || [-118.2437, 34.0522];
      // Pick 3-5 deterministic sample amenities based on index
      const itemAmenities = [
        "WiFi",
        "AC",
        ...(idx % 2 === 0 ? ["Pool"] : []),
        ...(idx % 3 === 0 ? ["Kitchen", "TV"] : ["Free Parking"]),
        ...(idx % 5 === 0 ? ["Pet Friendly"] : [])
      ];
      return {
        ...obj,
        owner: ownerId,
        amenities: Array.from(new Set(itemAmenities)),
        geometry: {
          type: "Point",
          coordinates: coords,
        },
      };
    });

    await Listing.insertMany(initData.data);
    console.log("Database initialized with", initData.data.length, "listings with coordinates!");
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding:", err);
    process.exit(1);
  }
};