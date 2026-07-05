const Trip = require('../models/Trip');
const axios = require('axios');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// ── PRICE ESTIMATION HELPERS ──────────────────────────────────────────
// Google's price_level is 0-4 (an indicator, not a real amount).
// We convert it into a real rupee estimate so the itinerary math means something.
const HOTEL_PRICE_PER_NIGHT = { 0: 800, 1: 1500, 2: 3500, 3: 7000, 4: 15000 };
const MEAL_PRICE_PER_PERSON = { 0: 100, 1: 250, 2: 500, 3: 1000, 4: 2500 };
const MEALS_PER_DAY = 3; // breakfast + lunch + dinner

function estimateHotelPerNight(priceLevel) {
  return HOTEL_PRICE_PER_NIGHT[priceLevel] ?? 2500; // default: moderate
}

function estimateMealPerPerson(priceLevel) {
  return MEAL_PRICE_PER_PERSON[priceLevel] ?? 400; // default: moderate
}

// Picks the best-rated hotel/restaurant whose estimated cost still leaves
// room in the budget, instead of just grabbing the first result.
function pickBestFit(places, estimateFn, maxAffordablePerUnit) {
  const affordable = places.filter(p => estimateFn(p.priceLevelRaw) <= maxAffordablePerUnit);
  const pool = affordable.length > 0 ? affordable : places; // fallback if nothing fits
  return [...pool].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
}

// Search Trip
exports.searchTrip = async (req, res) => {
  try {
    const { destination, days, budget, people } = req.body;

    if (!destination || !days || !budget || !people) {
      return res.status(400).json({ message: 'destination, days, budget and people are all required' });
    }

    const numDays = Number(days);
    const numPeople = Number(people);
    const numBudget = Number(budget);

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
    const hotels = hotelsResponse.data.results.slice(0, 5).map(hotel => {
      const priceLevelRaw = hotel.price_level !== undefined ? hotel.price_level : 2; // assume moderate if unknown
      return {
        name: hotel.name,
        address: hotel.formatted_address,
        rating: hotel.rating,
        priceLevel: hotel.price_level !== undefined ? hotel.price_level : 'Not available',
        priceLevelRaw,
        estimatedPerNight: estimateHotelPerNight(priceLevelRaw),
        image: hotel.photos?.[0]?.photo_reference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.photos[0].photo_reference}&key=${process.env.GOOGLE_API_KEY}`
          : ''
      };
    });

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
    const restaurants = restaurantsResponse.data.results.slice(0, 5).map(restaurant => {
      const priceLevelRaw = restaurant.price_level !== undefined ? restaurant.price_level : 2;
      return {
        name: restaurant.name,
        address: restaurant.formatted_address,
        rating: restaurant.rating,
        priceLevel: restaurant.price_level !== undefined ? restaurant.price_level : 'Not available',
        priceLevelRaw,
        estimatedPerMeal: estimateMealPerPerson(priceLevelRaw),
        image: restaurant.photos?.[0]?.photo_reference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${restaurant.photos[0].photo_reference}&key=${process.env.GOOGLE_API_KEY}`
          : ''
      };
    });

    // Step 3 - Work out how much budget is realistically left for activities
    // after locking in a hotel + restaurant tier that actually fits.
    const lodgingAndFoodCeiling = numBudget * 0.7;

    let chosenHotel = pickBestFit(hotels, h => h.estimatedPerNight, Infinity);
    let chosenRestaurant = pickBestFit(restaurants, r => r.estimatedPerMeal, Infinity);

    const sortedHotelsByPrice = [...hotels].sort((a, b) => a.estimatedPerNight - b.estimatedPerNight);
    const sortedRestaurantsByPrice = [...restaurants].sort((a, b) => a.estimatedPerMeal - b.estimatedPerMeal);

    let hotelCost = chosenHotel ? chosenHotel.estimatedPerNight * numDays : 0;
    let foodCost = chosenRestaurant ? chosenRestaurant.estimatedPerMeal * MEALS_PER_DAY * numDays * numPeople : 0;

    if (hotelCost + foodCost > lodgingAndFoodCeiling) {
      // Fall back to the cheapest available options that fit, best-rated among those.
      const affordableHotels = sortedHotelsByPrice.filter(h => h.estimatedPerNight * numDays <= lodgingAndFoodCeiling * 0.5);
      const affordableRestaurants = sortedRestaurantsByPrice.filter(r => r.estimatedPerMeal * MEALS_PER_DAY * numDays * numPeople <= lodgingAndFoodCeiling * 0.5);

      chosenHotel = (affordableHotels.length ? affordableHotels : sortedHotelsByPrice)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      chosenRestaurant = (affordableRestaurants.length ? affordableRestaurants : sortedRestaurantsByPrice)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];

      hotelCost = chosenHotel ? chosenHotel.estimatedPerNight * numDays : 0;
      foodCost = chosenRestaurant ? chosenRestaurant.estimatedPerMeal * MEALS_PER_DAY * numDays * numPeople : 0;
    }

    const activityBudget = Math.max(numBudget - hotelCost - foodCost, 0);
    const isOverBudgetEvenBeforeActivities = (hotelCost + foodCost) > numBudget;

    // Step 4 - Generate Itinerary using AI, now grounded in real hotel/restaurant choices
    const itineraryResponse = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

    // Step 5 - Send back response, including the budget breakdown so the frontend can show it
    res.status(200).json({
      destination,
      days: numDays,
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
    console.log('SEARCH ERROR:', error);
    res.status(500).json({ message: error.message });
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