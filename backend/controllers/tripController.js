// const Trip = require('../models/Trip');
// const axios = require('axios');
// const OpenAI = require('openai');

// const openai = new OpenAI({
//   apiKey: process.env.GROQ_API_KEY,
//   baseURL: 'https://api.groq.com/openai/v1'
// });

// // Search Trip
// exports.searchTrip = async (req, res) => {
//     try {
//       const { destination, days, budget, people } = req.body;
  
//       // Step 1 - Search Hotels using Google Places
//       const hotelsResponse = await axios.get(
//         `https://maps.googleapis.com/maps/api/place/textsearch/json`,
//         {
//           params: {
//             query: `hotels in ${destination}`,
//             key: process.env.GOOGLE_API_KEY
//           }
//         }
//       );
//       const hotels = hotelsResponse.data.results.slice(0, 5).map(hotel => ({
//         name: hotel.name,
//         address: hotel.formatted_address,
//         rating: hotel.rating,
//         priceLevel: hotel.price_level !== undefined ? hotel.price_level : 'Not available',
//         image: hotel.photos?.[0]?.photo_reference 
//             ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.photos[0].photo_reference}&key=${process.env.GOOGLE_API_KEY}`
//             : ''
//     }));
      
  
//       // Step 2 - Search Restaurants using Google Places
//       const restaurantsResponse = await axios.get(
//         `https://maps.googleapis.com/maps/api/place/textsearch/json`,
//         {
//           params: {
//             query: `restaurants in ${destination}`,
//             key: process.env.GOOGLE_API_KEY
//           }
//         }
//       );
//       const restaurants = restaurantsResponse.data.results.slice(0, 5).map(restaurant => ({
//         name: restaurant.name,
//         address: restaurant.formatted_address,
//         rating: restaurant.rating,
//         priceLevel: restaurant.price_level !== undefined ? restaurant.price_level : 'Not available',
//         image: restaurant.photos?.[0]?.photo_reference 
//             ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${restaurant.photos[0].photo_reference}&key=${process.env.GOOGLE_API_KEY}`
//             : ''
//     }));
  
//       // Step 3 - Generate Itinerary using OpenAI
//       const itineraryResponse = await openai.chat.completions.create({
//         model:  'llama-3.3-70b-versatile',
//         messages: [
//           {
//             role: 'user',
//             content: `Create a ${days} day travel itinerary for ${destination} for ${people} people with a total budget of ${budget} rupees.

//              Format your response exactly like this for each day:

//              **Day 1**
//              - Morning: [activity] - Approx cost: ₹[amount]
//              - Afternoon: [activity] - Approx cost: ₹[amount]
//              - Evening: [activity] - Approx cost: ₹[amount]

//              At the end, add:
//              **Total Estimated Cost: ₹[total amount]**

//             Keep activity descriptions short, one line only. Use bullet points only. Make sure the total estimated cost stays within or close to the given budget. No introduction or conclusion text, just start directly with Day 1.`
          
//           }
//         ]
//       });
//       const itinerary = itineraryResponse.choices[0].message.content;
//       // Get destination image from Unsplash
//       const unsplashResponse = await axios.get('https://api.unsplash.com/search/photos', {
//      params: {
//       query: destination,
//       per_page: 1
//     },
//     headers: {
//       Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
//     }
//      });

//     const destinationImage = unsplashResponse.data.results[0]?.urls?.regular || '';
  
//       // Step 4 - Send back response
//       res.status(200).json({
//         destination,
//         days,
//         budget,
//         hotels,
//         restaurants,
//         itinerary,
//         destinationImage
//     });
  
//     } catch (error) {
//       console.log('SEARCH ERROR:', error);
//       res.status(500).json({ message: error.message });
//     }
//   };

//   // Save Trip
// exports.saveTrip = async (req, res) => {
//     try {
//       const { destination, days, budget, people, hotels, restaurants, itinerary } = req.body;
//       const trip = await Trip.create({
//         userId: req.userId,
//         destination,
//         days,
//         budget,
//         people,
//         hotels,
//         restaurants,
//         itinerary
//     });
//       res.status(201).json({
//         message: 'Trip saved successfully',
//         trip
//       });
  
//     } catch (error) {
//       console.log('Could not Save Trip:', error);
//     res.status(500).json({ message: error.message });
//     }
//   };

  
//   // Get Saved Trips
//   // Save Trip - stores user's searched trip with all details including people count
// exports.getSavedTrips = async (req, res) => {
//   try {
//     const trips = await Trip.find({ userId: req.userId });

//     res.status(200).json({
//       count: trips.length,
//       trips
//     });

//   } catch (error) {
//     console.log('GET TRIPS ERROR:', error);
//     res.status(500).json({ message: error.message });
//   }
// };
//   // Delete Trip

// exports.deleteTrip = async (req, res) => {
//   try {
//     const trip = await Trip.findOne({ _id: req.params.id, userId: req.userId });

//     if (!trip) {
//       return res.status(404).json({ message: 'Trip not found' });
//     }

//     await Trip.findByIdAndDelete(req.params.id);

//     res.status(200).json({ message: 'Trip deleted successfully' });

//   } catch (error) {
//     console.log('DELETE TRIP ERROR:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



const Trip = require('../models/Trip');
const axios = require('axios');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// ─── Price level → estimated cost in RUPEES ───────────────────────────
// Google price_level is 0–4. We map it to realistic Indian travel estimates.
const HOTEL_COST_PER_NIGHT = { 0: 800, 1: 1200, 2: 2500, 3: 5000, 4: 10000 };
const FOOD_COST_PER_MEAL   = { 0: 100, 1: 150,  2: 350,  3: 700,  4: 1500  };
const PRICE_LABEL          = { 0: '₹', 1: '₹',  2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' };

// Search Trip
exports.searchTrip = async (req, res) => {
  try {
    const { destination, days, budget, people } = req.body;

    const totalBudget = parseFloat(budget);
    const numDays     = parseInt(days);
    const numPeople   = parseInt(people);

    // ── BUDGET ALLOCATION ────────────────────────────────────────────
    // 40% hotels, 35% food, 25% activities — sensible travel split
    const hotelBudgetTotal    = totalBudget * 0.40;
    const foodBudgetTotal     = totalBudget * 0.35;
    const activityBudgetTotal = totalBudget * 0.25;

    const hotelBudgetPerNight    = hotelBudgetTotal / numDays;
    const foodBudgetPerMealPax   = foodBudgetTotal / (numDays * 3 * numPeople);

    // ── STEP 1: FETCH HOTELS ─────────────────────────────────────────
    const hotelsResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json`,
      { params: { query: `hotels in ${destination}`, key: process.env.GOOGLE_API_KEY } }
    );

    const allHotels = hotelsResponse.data.results.map(hotel => {
      const pl = hotel.price_level ?? 0;
      return {
        name:              hotel.name,
        address:           hotel.formatted_address,
        rating:            hotel.rating || null,
        priceLevel:        pl,
        priceLabel:        PRICE_LABEL[pl],
        estimatedPerNight: HOTEL_COST_PER_NIGHT[pl],
        image: hotel.photos?.[0]?.photo_reference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${hotel.photos[0].photo_reference}&key=${process.env.GOOGLE_API_KEY}`
          : ''
      };
    });

    // Keep hotels whose estimated nightly cost fits the per-night budget
    let hotels = allHotels.filter(h => h.estimatedPerNight <= hotelBudgetPerNight);
    // If none fit, take the 3 cheapest so the page isn't empty
    if (hotels.length === 0) {
      hotels = allHotels.sort((a, b) => a.estimatedPerNight - b.estimatedPerNight).slice(0, 3);
    }
    hotels = hotels.slice(0, 5);

    // ── STEP 2: FETCH RESTAURANTS ────────────────────────────────────
    const restaurantsResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json`,
      { params: { query: `restaurants in ${destination}`, key: process.env.GOOGLE_API_KEY } }
    );

    const allRestaurants = restaurantsResponse.data.results.map(r => {
      const pl = r.price_level ?? 0;
      return {
        name:             r.name,
        address:          r.formatted_address,
        rating:           r.rating || null,
        priceLevel:       pl,
        priceLabel:       PRICE_LABEL[pl],
        estimatedPerMeal: FOOD_COST_PER_MEAL[pl],
        image: r.photos?.[0]?.photo_reference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${process.env.GOOGLE_API_KEY}`
          : ''
      };
    });

    let restaurants = allRestaurants.filter(r => r.estimatedPerMeal <= foodBudgetPerMealPax);
    if (restaurants.length === 0) {
      restaurants = allRestaurants.sort((a, b) => a.estimatedPerMeal - b.estimatedPerMeal).slice(0, 3);
    }
    restaurants = restaurants.slice(0, 5);

    // ── STEP 3: COMPUTE BUDGET BREAKDOWN ────────────────────────────
    const chosenHotel      = hotels[0];
    const chosenRestaurant = restaurants[0];

    const estHotelCost      = chosenHotel      ? chosenHotel.estimatedPerNight * numDays                          : hotelBudgetTotal;
    const estFoodCost       = chosenRestaurant ? chosenRestaurant.estimatedPerMeal * 3 * numDays * numPeople       : foodBudgetTotal;
    const estActivityCost   = activityBudgetTotal;
    const estTotal          = estHotelCost + estFoodCost + estActivityCost;

    const budgetBreakdown = {
      total:            totalBudget,
      hotel:            { allocated: Math.round(hotelBudgetTotal),    estimated: Math.round(estHotelCost),    perNight: Math.round(hotelBudgetPerNight) },
      food:             { allocated: Math.round(foodBudgetTotal),     estimated: Math.round(estFoodCost),     perMealPerPerson: Math.round(foodBudgetPerMealPax) },
      activities:       { allocated: Math.round(estActivityCost) },
      estimatedTotal:   Math.round(estTotal),
      remaining:        Math.round(totalBudget - estTotal),
      status:           estTotal <= totalBudget ? 'within_budget' : 'over_budget'
    };

    // ── STEP 4: AI ITINERARY with real context ───────────────────────
    const hotelInfo = hotels
    .map(h =>`${h.name} | Rating: ${h.rating}⭐ | Estimated: ₹${h.estimatedPerNight}/night`).join("\n");
  
  const restaurantInfo = restaurants .map(r =>`${r.name} | Rating: ${r.rating}⭐` ).join("\n");
    const itineraryResponse = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are an expert travel planner.

Create a realistic ${numDays}-day travel itinerary for ${destination} for ${numPeople} people.

TOTAL BUDGET: ₹${totalBudget}

IMPORTANT RULES (Follow ALL):

1. The final total cost MUST be between 90% and 100% of the total budget.
   - Minimum allowed: ₹${Math.round(totalBudget * 0.9)}
   - Maximum allowed: ₹${totalBudget}
   - Do NOT create a cheap itinerary.

2. Use this budget allocation approximately:
   • Hotel: ₹${Math.round(hotelBudgetTotal)}
   • Food: ₹${Math.round(foodBudgetTotal)}
   • Activities & Sightseeing: ₹${Math.round(estActivityCost)}
   • Local Transport: ₹${Math.round(totalBudget * 0.10)}
   • Shopping/Miscellaneous: ₹${Math.round(totalBudget * 0.05)}

3. Accommodation has already been selected.

HOTEL:
${chosenHotel ? chosenHotel.name : "Budget Hotel"}

Estimated Cost:
₹${chosenHotel ? chosenHotel.estimatedPerNight : 1200} per night

4. ONLY use restaurants from this list whenever suggesting meals:

${restaurantNames}

5. Every day MUST include:
- Breakfast
- Morning sightseeing
- Lunch
- Afternoon activity
- Evening attraction
- Dinner
- Local transport expenses

6. Include paid attractions whenever possible.
Avoid free activities unless necessary.

7. Spend the user's budget wisely.
Do NOT try to save money unnecessarily.
Provide the best experience while staying within budget.

8. Mention approximate cost after EVERY activity.

9. At the end provide exactly this summary:

Budget Summary
--------------
Hotel: ₹...
Food: ₹...
Transport: ₹...
Activities: ₹...
Shopping: ₹...
----------------
Total Estimated Cost: ₹...
Remaining Budget: ₹...

Format exactly like this:

## Day 1

• Breakfast at Restaurant - ₹...
• Visit Attraction - ₹...
• Lunch at Restaurant - ₹...
• Afternoon Activity - ₹...
• Evening Attraction - ₹...
• Dinner at Restaurant - ₹...
• Transport - ₹...

Repeat for all ${numDays} days.

Start directly from Day 1.
Do not write any introduction.
`
      }]
    });
    const itinerary = itineraryResponse.choices[0].message.content;

    // ── STEP 5: DESTINATION IMAGE ────────────────────────────────────
    const unsplashResponse = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query: destination, per_page: 1 },
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
    });
    const destinationImage = unsplashResponse.data.results[0]?.urls?.regular || '';

    // ── STEP 6: RESPOND ──────────────────────────────────────────────
    res.status(200).json({
      destination, days, budget, people,
      hotels, restaurants, itinerary,
      destinationImage, budgetBreakdown
    });

  } catch (error) {
    console.log('SEARCH ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// Save Trip
exports.saveTrip = async (req, res) => {
  try {
    const { destination, days, budget, people, hotels, restaurants, itinerary, budgetBreakdown } = req.body;
    const trip = await Trip.create({
      userId: req.userId,
      destination, days, budget, people,
      hotels, restaurants, itinerary, budgetBreakdown
    });
    res.status(201).json({ message: 'Trip saved successfully', trip });
  } catch (error) {
    console.log('Could not Save Trip:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get Saved Trips
exports.getSavedTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.userId });
    res.status(200).json({ count: trips.length, trips });
  } catch (error) {
    console.log('GET TRIPS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete Trip
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.userId });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    await Trip.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.log('DELETE TRIP ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};