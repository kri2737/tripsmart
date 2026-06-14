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
            content: `Create a ${days} day travel itinerary for ${destination} with a budget of ${budget} rupees. 

            Format your response exactly like this for each day:
            
            **Day 1**
            - Morning: [activity]
            - Afternoon: [activity]
            - Evening: [activity]
            
            Keep each activity description short, one line only. Use bullet points only. No long paragraphs. No introduction or conclusion text, just start directly with Day 1.`
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
      const { destination, days, budget, hotels, restaurants, itinerary } = req.body;

      const trip = await Trip.create({
        userId: req.userId,
        destination,
        days,
        budget,
        hotels,
        restaurants,
        itinerary
      });
  
      res.status(201).json({
        message: 'Trip saved successfully',
        trip
      });
  
    } catch (error) {
      console.log('Could not Save Trip:', error);
    res.status(500).json({ message: error.message });
    }
  };

  
  // Get Saved Trips
  // Get Saved Trips
exports.getSavedTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.userId });

    res.status(200).json({
      count: trips.length,
      trips
    });

  } catch (error) {
    console.log('GET TRIPS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};
  // Delete Trip
  // Delete Trip
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.userId });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await Trip.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Trip deleted successfully' });

  } catch (error) {
    console.log('DELETE TRIP ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};