const Trip = require('../models/Trip');
const axios = require('axios');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// Search Trip
exports.searchTrip = async (req, res) => {
    try {
      const { destination, days, budget } = req.body;
  
      // Step 1 - Search Hotels using Google Places
      const hotelsResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json`,
        {
          params: {
            query: `hotels in ${destination}`,
            key: process.env.GOOGLE_API_KEY
          }
        }
      );
      const hotels = hotelsResponse.data.results.slice(0, 5).map(hotel => ({
        name: hotel.name,
        address: hotel.formatted_address,
        rating: hotel.rating
      }));
  
      // Step 2 - Search Restaurants using Google Places
      const restaurantsResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json`,
        {
          params: {
            query: `restaurants in ${destination}`,
            key: process.env.GOOGLE_API_KEY
          }
        }
      );
      const restaurants = restaurantsResponse.data.results.slice(0, 5).map(restaurant => ({
        name: restaurant.name,
        address: restaurant.formatted_address,
        rating: restaurant.rating
      }));
  
      // Step 3 - Generate Itinerary using OpenAI
      const itineraryResponse = await openai.chat.completions.create({
        model:  'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: `Create a detailed ${days} day travel itinerary for ${destination} with a budget of ${budget} rupees. Include morning, afternoon and evening activities for each day.`
          }
        ]
      });
      const itinerary = itineraryResponse.choices[0].message.content;
  
      // Step 4 - Send back response
      res.status(200).json({
        destination,
        days,
        budget,
        hotels,
        restaurants,
        itinerary
      });
  
    } catch (error) {
      console.log('SEARCH ERROR:', error);
      res.status(500).json({ message: error.message });
    }
  };

  // Save Trip
exports.saveTrip = async (req, res) => {
    try {
      res.status(200).json({ message: 'Save trip coming soon' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // Get Saved Trips
  exports.getSavedTrips = async (req, res) => {
    try {
      res.status(200).json({ message: 'Get saved trips coming soon' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // Delete Trip
  exports.deleteTrip = async (req, res) => {
    try {
      res.status(200).json({ message: 'Delete trip coming soon' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };