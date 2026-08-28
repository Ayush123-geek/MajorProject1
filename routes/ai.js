const express = require("express");
const router = express.Router();
const aiController = require("../controller/ai.js");

// AI Travel Planner Page
router.get("/ai-planner", aiController.renderAiPlanner);

// Generate AI Itinerary (API endpoint)
router.post("/ai/generate-itinerary", aiController.generateItinerary);

module.exports = router;
