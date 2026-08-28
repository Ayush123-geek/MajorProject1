const Listing = require("../models/listing.js");
const { GoogleGenAI } = require("@google/genai");

// Render AI Planner Page
module.exports.renderAiPlanner = (req, res) => {
    res.render("ai/planner.ejs");
};

// Generate AI Itinerary using Google Gemini
module.exports.generateItinerary = async (req, res) => {
    try {
        const { destination, budget, days, category } = req.body || {};

        if (!destination || !budget || !days) {
            return res.json({ success: false, message: "Please provide destination, budget, and trip duration." });
        }

        // Fetch relevant listings from MongoDB to recommend
        let listingFilter = {};
        if (category && category !== "Any") {
            listingFilter.category = category;
        }
        // Try to match destination to listings
        const destRegex = new RegExp(destination.trim(), "i");
        const matchingListings = await Listing.find({
            $or: [
                { location: destRegex },
                { country: destRegex },
                { title: destRegex },
                { category: destRegex },
            ],
            ...listingFilter,
        }).limit(6);

        // Also get some general listings if not enough matches
        let additionalListings = [];
        if (matchingListings.length < 3) {
            additionalListings = await Listing.find(listingFilter).limit(6);
        }

        const allRelevantListings = [...matchingListings, ...additionalListings]
            .filter((v, i, a) => a.findIndex(t => t._id.toString() === v._id.toString()) === i)
            .slice(0, 6);

        // Build listing context for AI prompt
        const listingContext = allRelevantListings.map(l =>
            `- "${l.title}" in ${l.location}, ${l.country} | ₹${l.price}/night | Category: ${l.category} | Amenities: ${(l.amenities || []).join(", ")}`
        ).join("\n");

        // Build Gemini prompt
        const prompt = `You are a professional AI travel concierge for "Wanderlust Stays", a premium travel and accommodation platform.

A traveler is planning a trip with the following preferences:
- **Destination / Vibe**: ${destination}
- **Budget**: ₹${budget} total
- **Duration**: ${days} day(s)
${category && category !== "Any" ? `- **Preferred Stay Type**: ${category}` : ""}

Here are some available stays on our platform that might be relevant:
${listingContext || "No specific listings match, but recommend based on the destination."}

Please generate a detailed, engaging travel itinerary with:
1. **Trip Title**: A catchy name for this trip.
2. **Day-by-Day Plan**: For each day, include:
   - Morning, Afternoon, and Evening activities with specific places/attractions.
   - Estimated cost breakdowns.
3. **Recommended Stays**: Pick the best matching stays from the listings above (reference by name). If none match perfectly, suggest what type of stay to look for.
4. **Budget Breakdown**: Show how the ₹${budget} budget splits across accommodation, food, transport, and activities.
5. **Pro Travel Tips**: 3-4 insider tips for the destination.

Format your response in clean, well-structured markdown with headers, bullet points, and emojis for visual appeal.`;

        // Check if Gemini API key is available
        if (!process.env.GEMINI_API_KEY) {
            // Fallback: Generate a template itinerary without API
            const fallbackItinerary = generateFallbackItinerary(destination, budget, days, category, allRelevantListings);
            return res.json({ success: true, itinerary: fallbackItinerary, source: "template" });
        }

        // Call Google Gemini API
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const itineraryText = response.text;

        return res.json({ success: true, itinerary: itineraryText, source: "gemini" });

    } catch (err) {
        console.error("AI Itinerary Generation Error:", err);
        return res.json({ success: false, message: "Failed to generate itinerary. Please try again." });
    }
};

// Fallback itinerary generator (no API key needed)
function generateFallbackItinerary(destination, budget, days, category, listings) {
    const perDay = Math.round(Number(budget) / Number(days));
    const accommodation = Math.round(perDay * 0.4);
    const food = Math.round(perDay * 0.25);
    const transport = Math.round(perDay * 0.15);
    const activities = Math.round(perDay * 0.2);

    let stayRecommendations = "";
    if (listings.length > 0) {
        stayRecommendations = listings.slice(0, 3).map(l =>
            `- **${l.title}** — ${l.location}, ${l.country} — ₹${l.price}/night (${(l.amenities || []).join(", ")})`
        ).join("\n");
    } else {
        stayRecommendations = "- Explore stays on Wanderlust matching your preferences!";
    }

    let dayPlans = "";
    for (let i = 1; i <= Number(days); i++) {
        dayPlans += `
### 📅 Day ${i}
- **🌅 Morning**: Explore local landmarks and scenic viewpoints in ${destination}
- **☀️ Afternoon**: Visit popular attractions, local markets, or adventure activities
- **🌙 Evening**: Enjoy local cuisine and nightlife experiences
- **💰 Est. Cost**: ~₹${perDay.toLocaleString("en-IN")}
`;
    }

    return `# 🗺️ ${days}-Day Trip to ${destination}

## ✨ Trip Overview
A curated **${days}-day** trip to **${destination}** within a budget of **₹${Number(budget).toLocaleString("en-IN")}**.

---

## 🏡 Recommended Stays
${stayRecommendations}

---

## 📋 Day-by-Day Itinerary
${dayPlans}

---

## 💰 Budget Breakdown
| Category | Per Day | Total (${days} days) |
|---|---|---|
| 🏠 Accommodation | ₹${accommodation.toLocaleString("en-IN")} | ₹${(accommodation * days).toLocaleString("en-IN")} |
| 🍽️ Food & Dining | ₹${food.toLocaleString("en-IN")} | ₹${(food * days).toLocaleString("en-IN")} |
| 🚗 Transport | ₹${transport.toLocaleString("en-IN")} | ₹${(transport * days).toLocaleString("en-IN")} |
| 🎯 Activities | ₹${activities.toLocaleString("en-IN")} | ₹${(activities * days).toLocaleString("en-IN")} |

---

## 💡 Pro Travel Tips
- 🎒 Book stays in advance during peak season for the best rates.
- 🍜 Try local street food for an authentic culinary experience.
- 📱 Download offline maps to navigate remote areas.
- 🌦️ Check weather forecasts and pack accordingly.

> 💡 *Add your Gemini API key in .env for a fully personalized AI-generated itinerary!*
`;
}
