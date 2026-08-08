# Wanderlust — Vacation Rental & Accommodation Platform

Wanderlust is a full-stack web application designed for discovering, listing, and managing vacation rentals worldwide. Inspired by modern accommodation platforms like Airbnb, Wanderlust provides a seamless user experience for exploring stays, filtering by categories, viewing interactive geographical maps, calculating dynamic pricing inclusive of taxes, managing personal wishlists, and submitting verified guest reviews.

---

## Core Features & Functionality

### 1. Property Exploration & Filtering
- **Category Filtering**: Browse listings categorized into specific travel styles such as Trending, Rooms, Iconic Cities, Mountains, Castles, Amazing Pools, Camping, Farms, Arctic, Domes, and Boats.
- **Full-Text Search**: Search bar supporting real-time database queries matching listing titles, locations, countries, and categories.
- **Dynamic GST Tax Calculator**: Interactive toggle switch allowing users to view base nightly rates or real-time calculated prices including 18% GST.

### 2. User Authentication & Authorization
- **Secure Registration & Login**: User authentication powered by Passport.js with encrypted passwords and session persistence stored in MongoDB.
- **Role-Based Permissions**: Only listing owners can edit or delete their properties. Only review authors can delete their posted reviews.

### 3. Interactive Location Mapping
- **Geographic Mapping**: Embedded Leaflet.js maps utilizing OpenStreetMap tiles to render accurate property coordinates.
- **Automated Geocoding**: Integrated OpenStreetMap Nominatim API automatically converts location and country strings into GeoJSON Point coordinates `[longitude, latitude]` upon listing creation or updates.

### 4. Wishlist & Favorites Management
- **Bookmark Stays**: Logged-in users can save listings to their personal Wishlist directly from the Explore grid or listing detail pages.
- **Dedicated Wishlist View**: A user dashboard displaying saved stays with quick access to property details and removal capabilities.

### 5. Review & Rating System
- **5-Star Rating System**: Interactive Starability CSS rating selector for submitted reviews.
- **Author Attribution**: Reviews display verified user badges and timestamp details.

---

## Technology Stack

- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM) & MongoDB Atlas
- **Authentication**: Passport.js, Passport-Local, Express-Session, Connect-Mongo
- **Template Engine**: EJS (Embedded JavaScript) with EJS-Mate layout extension
- **Styling & UI**: Bootstrap 5.3, Custom CSS Design System with Dark/Light mode persistence
- **Mapping & Geocoding**: Leaflet.js, OpenStreetMap, Nominatim API
- **Cloud Media Storage**: Cloudinary API, Multer, Multer-Storage-Cloudinary
- **Input Validation**: Joi schema validation middleware

---

## Data Model Architecture

The database architecture consists of three interconnected Mongoose schemas:

```
[ User ]
  ├── username: String
  ├── email: String
  └── wishlist: [ Listing ObjectId ]

[ Listing ]
  ├── title: String
  ├── description: String
  ├── image: { url: String, filename: String }
  ├── price: Number
  ├── location: String
  ├── country: String
  ├── category: String (Enum)
  ├── geometry: { type: "Point", coordinates: [lng, lat] }
  ├── owner: User ObjectId
  └── reviews: [ Review ObjectId ]

[ Review ]
  ├── rating: Number (1-5)
  ├── comment: String
  ├── author: User ObjectId
  └── createdAt: Date
```

---

## Environment Variables Configuration

To run this application locally, create a `.env` file in the root directory with the following configuration keys:

```env
ATLASDB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/wanderlust
SECRET=your_session_secret_key
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret
```

---

## Local Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Ayush123-geek/MajorProject1.git
   cd MajorProject1
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file as shown in the section above.

4. **Seed the Database**
   Populate initial sample listings and default host credentials:
   ```bash
   node init/index.js
   ```

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:8080/listings`.

---

## Project Directory Structure

```
MajorProject1/
├── controller/        # Request handlers (listing, review, user logic)
├── init/              # Database initialization & sample seed data
├── middleware.js      # Authentication & validation middleware
├── models/            # Mongoose schemas (Listing, Review, User)
├── public/            # Static assets (CSS, client JS, icons)
│   ├── css/
│   └── js/
├── routes/            # Express routers (listing, review, user routes)
├── utils/             # Async utility wrappers & custom error handlers
├── views/             # EJS templates & layouts
│   ├── includes/      # Partials (navbar, footer, flash toasts)
│   ├── layouts/       # EJS-Mate boilerplate
│   ├── listings/      # Index, show, new, edit views
│   └── users/         # Login, signup, wishlist views
├── app.js             # Express application entry point
├── package.json       # Project dependencies & scripts
└── schema.js          # Joi schema definitions
```
