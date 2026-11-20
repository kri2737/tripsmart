const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const axios = require('axios');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const HOTEL_PRICE_PER_NIGHT = { 0: 800, 1: 1500, 2: 3500, 3: 7000, 4: 15000 };
const MEAL_PRICE_PER_PERSON = { 0: 100, 1: 250, 2: 500, 3: 1000, 4: 2500 };
const MEALS_PER_DAY = 3;

function estimateHotelPerNight(priceLevel) {
  return HOTEL_PRICE_PER_NIGHT[priceLevel] ?? 2500;
}

function estimateMealPerPerson(priceLevel) {
  return MEAL_PRICE_PER_PERSON[priceLevel] ?? 400;
}

function pickBestFit(places, estimateFn, maxAffordablePerUnit) {
  const affordable = places.filter((p) => estimateFn(p.priceLevelRaw) <= maxAffordablePerUnit);
  const pool = affordable.length > 0 ? affordable : places;
  return [...pool].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
}

// Proxy Google Place Photo without exposing GOOGLE_API_KEY
exports.proxyPhoto = async (req, res) => {
  try {
    const { ref } = req.params;
    if (!ref || !/^[A-Za-z0-9_-]{10,500}$/.test(ref)) {
      return res.status(400).json({ message: 'Invalid photo reference' });
    }

    const googleRes = await axios.get('https://maps.googleapis.com/maps/api/place/photo', {
      params: {
        maxwidth: 400,
        photo_reference: ref,
        key: process.env.GOOGLE_API_KEY
      },
      responseType: 'stream',
      timeout: 8000
    });

    res.setHeader('Content-Type', googleRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    googleRes.data.pipe(res);
  } catch (error) {
    console.error('PHOTO PROXY ERROR:', error.message);
    return res.status(502).json({ message: 'Unable to load image' });
  }
};

// Search Trip
exports.searchTrip = async (req, res) => {
  try {
    const { destination, days, budget, people } = req.body;
    const numDays = Number(days);
    const numPeople = Number(people);
    const numBudget = Number(budget);

    // Step 1 - Search Hotels using Google Places
    const hotelsResponse = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: `hotels in ${destination}`,
          key: process.env.GOOGLE_API_KEY
        }
      }
    );

    const hotels = (hotelsResponse.data.results || []).slice(0, 5).map((hotel) => {
      const priceLevelRaw = hotel.price_level !== undefined ? hotel.price_level : 2;
      return {
        name: hotel.name,
        address: hotel.formatted_address,
        rating: hotel.rating,
        priceLevel: hotel.price_level !== undefined ? hotel.price_level : 'Not available',
        priceLevelRaw,
        estimatedPerNight: estimateHotelPerNight(priceLevelRaw),
        photoReference: hotel.photos?.[0]?.photo_reference || ''
      };
    });

    // Step 2 - Search Restaurants using Google Places
    const restaurantsResponse = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: `restaurants in ${destination}`,
          key: process.env.GOOGLE_API_KEY
        }
      }
    );

    const restaurants = (restaurantsResponse.data.results || []).slice(0, 5).map((restaurant) => {
      const priceLevelRaw = restaurant.price_level !== undefined ? restaurant.price_level : 2;
      return {
        name: restaurant.name,
        address: restaurant.formatted_address,
        rating: restaurant.rating,
        priceLevel: restaurant.price_level !== undefined ? restaurant.price_level : 'Not available',
        priceLevelRaw,
        estimatedPerMeal: estimateMealPerPerson(priceLevelRaw),
        photoReference: restaurant.photos?.[0]?.photo_reference || ''
      };
    });

    // Step 3 - Budget allocation
    const lodgingAndFoodCeiling = numBudget * 0.7;

    let chosenHotel = pickBestFit(hotels, (h) => h.estimatedPerNight, Infinity);
    let chosenRestaurant = pickBestFit(restaurants, (r) => r.estimatedPerMeal, Infinity);

    const sortedHotelsByPrice = [...hotels].sort((a, b) => a.estimatedPerNight - b.estimatedPerNight);
    const sortedRestaurantsByPrice = [...restaurants].sort((a, b) => a.estimatedPerMeal - b.estimatedPerMeal);

    let hotelCost = chosenHotel ? chosenHotel.estimatedPerNight * numDays : 0;
    let foodCost = chosenRestaurant ? chosenRestaurant.estimatedPerMeal * MEALS_PER_DAY * numDays * numPeople : 0;

    if (hotelCost + foodCost > lodgingAndFoodCeiling) {
      const affordableHotels = sortedHotelsByPrice.filter((h) => h.estimatedPerNight * numDays <= lodgingAndFoodCeiling * 0.5);
      const affordableRestaurants = sortedRestaurantsByPrice.filter(
        (r) => r.estimatedPerMeal * MEALS_PER_DAY * numDays * numPeople <= lodgingAndFoodCeiling * 0.5
      );

      chosenHotel = (affordableHotels.length ? affordableHotels : sortedHotelsByPrice).sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
      )[0];
      chosenRestaurant = (affordableRestaurants.length ? affordableRestaurants : sortedRestaurantsByPrice).sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
      )[0];

      hotelCost = chosenHotel ? chosenHotel.estimatedPerNight * numDays : 0;
      foodCost = chosenRestaurant ? chosenRestaurant.estimatedPerMeal * MEALS_PER_DAY * numDays * numPeople : 0;
    }

    const activityBudget = Math.max(numBudget - hotelCost - foodCost, 0);
    const isOverBudgetEvenBeforeActivities = hotelCost + foodCost > numBudget;

    // Step 4 - Generate Itinerary using AI
    const itineraryResponse = await openai.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'user',
          content: `Create a ${numDays} day travel itinerary for ${destination} for ${numPeople} people.

The traveler is staying at "${chosenHotel?.name || 'a local hotel'}" (approx Rs.${hotelCost} total for the stay)
and will primarily eat at "${chosenRestaurant?.name || 'local restaurants'}" (approx Rs.${foodCost} total for meals).

Total trip budget: Rs.${numBudget}
Budget already committed to hotel + food: Rs.${hotelCost + foodCost}
Remaining budget for daily activities and experiences: Rs.${activityBudget}

Design each day's activities to use as much of the Rs.${activityBudget} remaining budget as possible without exceeding it.
Reference the hotel by name for check-in/check-out or as the base each day, and reference the restaurant by name for at least one meal per day (breakfast, lunch, or dinner).

Format your response exactly like this for each day:

**Day 1**
- Morning: [activity] - Approx cost: Rs.[amount]
- Afternoon: [activity] - Approx cost: Rs.[amount]
- Evening: [activity, may reference the restaurant by name] - Approx cost: Rs.[amount]

At the end, add:
**Total Activity Cost: Rs.[sum of all activity costs, should be close to but not exceed Rs.${activityBudget}]**
**Total Trip Cost (Hotel + Food + Activities): Rs.[amount]**

Keep activity descriptions short, one line only. Use bullet points only. No introduction or conclusion text, just start directly with Day 1.`
        }
      ]
    });
    const itinerary = itineraryResponse.choices[0].message.content;

    // Get destination image from Unsplash
    const unsplashResponse = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: destination,
        per_page: 1
      },
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      }
    });

    const destinationImage = unsplashResponse.data.results[0]?.urls?.regular || '';

    return res.status(200).json({
      destination,
      days: numDays,
      people: numPeople,
      budget: numBudget,
      hotels,
      restaurants,
      chosenHotel,
      chosenRestaurant,
      itinerary,
      destinationImage,
      budgetBreakdown: {
        hotelCost,
        foodCost,
        activityBudget,
        total: numBudget,
        estimatedCommitted: hotelCost + foodCost,
        status: isOverBudgetEvenBeforeActivities ? 'over_budget' : 'within_budget'
      }
    });
  } catch (error) {
    console.error('SEARCH ERROR:', error);
    return res.status(500).json({ message: 'Failed to search trip' });
  }
};

// Save Trip
exports.saveTrip = async (req, res) => {
  try {
    const { destination, days, budget, people, hotels, restaurants, itinerary } = req.body;
    const trip = await Trip.create({
      userId: req.userId,
      destination,
      days,
      budget,
      people,
      hotels,
      restaurants,
      itinerary
    });
    return res.status(201).json({
      message: 'Trip saved successfully',
      trip
    });
  } catch (error) {
    console.error('SAVE TRIP ERROR:', error);
    return res.status(500).json({ message: 'Failed to save trip' });
  }
};

// Get Saved Trips
exports.getSavedTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({
      count: trips.length,
      trips
    });
  } catch (error) {
    console.error('GET TRIPS ERROR:', error);
    return res.status(500).json({ message: 'Failed to load saved trips' });
  }
};

// Delete Trip
exports.deleteTrip = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid trip ID' });
    }

    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    return res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('DELETE TRIP ERROR:', error);
    return res.status(500).json({ message: 'Failed to delete trip' });
  }
};
