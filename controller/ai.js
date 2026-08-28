const Listing = require("../models/listing.js");
const { GoogleGenAI } = require("@google/genai");

// Render AI Planner Page
module.exports.renderAiPlanner = (req, res) => {
    res.render("ai/planner.ejs");
};

// Conversational Chat Endpoint for Floating AI Drawer
module.exports.chatQuery = async (req, res) => {
    try {
        const { query } = req.body || {};
        if (!query || query.trim() === "") {
            return res.json({ success: false, message: "Please ask a travel question." });
        }

        // Fetch sample stays from MongoDB to provide context
        const sampleStays = await Listing.find({}).limit(8);
        const staysContext = sampleStays.map(s =>
            `- "${s.title}" in ${s.location}, ${s.country} (₹${s.price}/night, Category: ${s.category}, Amenities: ${(s.amenities || []).join(", ")})`
        ).join("\n");

        if (!process.env.GEMINI_API_KEY) {
            // Intelligent fallback response
            return res.json({
                success: true,
                reply: `### 🌴 AI Travel Concierge
Here's a curated recommendation for **"${query}"**:
- **Best Season**: October to March for pleasant weather.
- **Top Highlights**: Scenic spots, local markets, and cultural landmarks.
- **Stay Suggestion**: Check out our verified listings in this destination on Wanderlust!
- **Estimated Budget**: ~₹3,000 - ₹5,000 per person per day.

*(💡 Add your Gemini API key in .env for custom real-time AI responses!)*`
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const systemInstruction = `You are the friendly, expert AI Travel Concierge for Wanderlust Stays.
Format your reply in compact, highly readable markdown using bold bullet points, emojis, and clear headings.
Avoid massive walls of text. Be concise, engaging, and practical.
When relevant, recommend matching stays from our platform:
${staysContext}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${systemInstruction}\n\nUser Question: ${query}`,
        });

        return res.json({ success: true, reply: response.text });
    } catch (err) {
        console.error("AI Chat Error:", err);
        return res.json({ success: false, message: "Sorry, I couldn't process your request right now." });
    }
};

// Generate Structured AI Itinerary
module.exports.generateItinerary = async (req, res) => {
    try {
        const { destination, budget, days, category } = req.body || {};

        if (!destination || !budget || !days) {
            return res.json({ success: false, message: "Please provide destination, budget, and trip duration." });
        }

        let listingFilter = {};
        if (category && category !== "Any") {
            listingFilter.category = category;
        }

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

        let additionalListings = [];
        if (matchingListings.length < 3) {
            additionalListings = await Listing.find(listingFilter).limit(6);
        }

        const allRelevantListings = [...matchingListings, ...additionalListings]
            .filter((v, i, a) => a.findIndex(t => t._id.toString() === v._id.toString()) === i)
            .slice(0, 6);

        const listingContext = allRelevantListings.map(l =>
            `- "${l.title}" in ${l.location}, ${l.country} | ₹${l.price}/night | Category: ${l.category} | Amenities: ${(l.amenities || []).join(", ")}`
        ).join("\n");

        const prompt = `You are a professional AI travel concierge for "Wanderlust Stays".

A traveler requested a trip plan:
- **Destination**: ${destination}
- **Budget**: ₹${budget} total
- **Duration**: ${days} day(s)
${category && category !== "Any" ? `- **Category**: ${category}` : ""}

Available stays on our platform:
${listingContext || "No exact match, suggest general stay styles."}

Create a crisp, highly readable, structured travel itinerary. Keep it formatted with clean headers, bullet points, and emojis.
Include:
1. **Trip Title**
2. **Day-by-Day Highlights** (Morning / Afternoon / Evening for each day)
3. **Recommended Stays** (Reference from available stays)
4. **Budget Breakdown Table**
5. **Top 3 Pro Tips**`;

        if (!process.env.GEMINI_API_KEY) {
            const fallbackItinerary = generateFallbackItinerary(destination, budget, days, category, allRelevantListings);
            return res.json({ success: true, itinerary: fallbackItinerary, source: "template" });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return res.json({ success: true, itinerary: response.text, source: "gemini" });
    } catch (err) {
        console.error("AI Itinerary Generation Error:", err);
        return res.json({ success: false, message: "Failed to generate itinerary. Please try again." });
    }
};

// Fallback generator
function generateFallbackItinerary(destination, budget, days, category, listings) {
    const perDay = Math.round(Number(budget) / Number(days));
    const accommodation = Math.round(perDay * 0.4);
    const food = Math.round(perDay * 0.25);
    const transport = Math.round(perDay * 0.15);
    const activities = Math.round(perDay * 0.2);

    let stayRecommendations = "";
    if (listings.length > 0) {
        stayRecommendations = listings.slice(0, 3).map(l =>
            `- **${l.title}** — ${l.location}, ${l.country} — ₹${l.price}/night`
        ).join("\n");
    } else {
        stayRecommendations = "- Browse verified stays in this location on Wanderlust!";
    }

    let dayPlans = "";
    for (let i = 1; i <= Number(days); i++) {
        dayPlans += `
### 📅 Day ${i}
- **🌅 Morning**: Sightseeing and scenic landmarks in ${destination}
- **☀️ Afternoon**: Local markets, activities, and authentic dining
- **🌙 Evening**: Sunset viewpoint and leisure experience
`;
    }

    return `# 🗺️ ${days}-Day Itinerary for ${destination}

## ✨ Overview
A **${days}-day** trip to **${destination}** with a budget of **₹${Number(budget).toLocaleString("en-IN")}**.

---

## 🏡 Recommended Stays
${stayRecommendations}

---

## 📋 Day-by-Day Plan
${dayPlans}

---

## 💰 Budget Breakdown
| Category | Daily (Est.) | Total (${days} Days) |
|---|---|---|
| 🏠 Accommodation | ₹${accommodation.toLocaleString("en-IN")} | ₹${(accommodation * days).toLocaleString("en-IN")} |
| 🍽️ Dining | ₹${food.toLocaleString("en-IN")} | ₹${(food * days).toLocaleString("en-IN")} |
| 🚗 Transport | ₹${transport.toLocaleString("en-IN")} | ₹${(transport * days).toLocaleString("en-IN")} |
| 🎯 Activities | ₹${activities.toLocaleString("en-IN")} | ₹${(activities * days).toLocaleString("en-IN")} |

---

## 💡 Pro Tips
- 🎒 Book stays early for high-demand seasons.
- 🍜 Try local specialties at popular market stalls.
- 📱 Save offline navigation maps before exploring.
`;
}
