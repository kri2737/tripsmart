// document.getElementById('logoutButton').addEventListener('click', function() {
//     localStorage.removeItem('token');
//     window.location.href = 'login.html';
// });


// let currentTripData = null;
// document.getElementById('search').addEventListener('submit', async function(e) {
//     e.preventDefault();

//     const destination = document.getElementById('destination').value;
//     const days = document.getElementById('days').value;
//     const people = document.getElementById('people').value;
//     const budget = document.getElementById('budget').value;
//     const token = localStorage.getItem('token');
    

//     document.getElementById('message').textContent = 'Searching... please wait';

//     try {
//         const response = await fetch('https://tripsmart-lpsm.onrender.com/api/trips/search', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': 'Bearer ' + token
//             },
//             body: JSON.stringify({ destination, days, budget, people })
//         });

        

//         const data = await response.json();
//         if (response.ok) {
//             document.getElementById('message').textContent = '';
//             currentTripData = data;
//             document.getElementById('saveButton').style.display = 'block';
        
//             const hotelsHTML = data.hotels.map(hotel => `
//                 <div class="card">
//                     ${hotel.image ? `<img src="${hotel.image}" class="cardImage">` : ''}
//                     <h4>${hotel.name}</h4>
//                     <p>${hotel.address}</p>
//                     <p>Rating: ${hotel.rating || 'N/A'}</p>
//                     <p>Price Level: ${hotel.priceLevel}</p>
//                 </div>
//             `).join('');
        
//             const restaurantsHTML = data.restaurants.map(restaurant => `
//                 <div class="card">
//                 ${restaurant.image ? `<img src="${restaurant.image}" class="cardImage">` : ''}
//                     <h4>${restaurant.name}</h4>
//                     <p>${restaurant.address}</p>
//                     <p>Rating: ${restaurant.rating || 'N/A'}</p>
//                     <p>Price Level: ${restaurant.priceLevel}</p>
//                 </div>
//             `).join('');
        
//             document.getElementById('result').innerHTML = `
//             ${data.destinationImage ? `<img src="${data.destinationImage}" class="destinationBanner">` : ''}
//             <h2>Hotels</h2>
//             <div class="cardContainer">${hotelsHTML}</div>
//             <h2>Restaurants</h2>
//             <div class="cardContainer">${restaurantsHTML}</div>
//             <h2>Itinerary</h2>
//             <div class="itinerary">${data.itinerary}</div>
//             `;
//         } else {
//             document.getElementById('message').textContent = data.message;
//         }
//     }
//         catch (error) {                               // ← MAKE SURE THIS EXISTS
//             document.getElementById('message').textContent = 'Something went wrong';
//         }
// });
// document.getElementById('saveButton').addEventListener('click', async function() {
//     const token = localStorage.getItem('token');

//     try {
//         const response = await fetch('https://tripsmart-lpsm.onrender.com/api/trips/save', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': 'Bearer ' + token
//             },
//             body: JSON.stringify(currentTripData)
//         });

//         const data = await response.json();

//         if (response.ok) {
//             document.getElementById('message').textContent = 'Trip saved successfully!';
//         } else {
//             document.getElementById('message').textContent = data.message;
//         }

//     } catch (error) {
//         document.getElementById('message').textContent = 'Something went wrong';
//     }
// });


document.getElementById('logoutButton').addEventListener('click', function() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
  
  let currentTripData = null;
  
  document.getElementById('search').addEventListener('submit', async function(e) {
    e.preventDefault();
  
    const destination = document.getElementById('destination').value;
    const days        = document.getElementById('days').value;
    const people      = document.getElementById('people').value;
    const budget      = document.getElementById('budget').value;
    const token       = localStorage.getItem('token');
  
    document.getElementById('message').textContent = 'Searching... please wait';
    document.getElementById('result').innerHTML = '';
    document.getElementById('saveButton').style.display = 'none';
  
    try {
      const response = await fetch('https://tripsmart-lpsm.onrender.com/api/trips/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ destination, days, budget, people })
      });
  
      const data = await response.json();
  
      if (response.ok) {
        document.getElementById('message').textContent = '';
        currentTripData = data;
        document.getElementById('saveButton').style.display = 'block';
  
        // ── HOTEL CARDS ────────────────────────────────────────────────
        const hotelsHTML = data.hotels.map(hotel => `
          <div class="card">
            ${hotel.image ? `<img src="${hotel.image}" class="cardImage">` : ''}
            <div class="cardBody">
              <h4>${hotel.name}</h4>
              <p>${hotel.address}</p>
              <p>⭐ ${hotel.rating || 'N/A'}</p>
              <div class="cardMeta">
                <span class="priceTag">${hotel.priceLabel || '₹'}</span>
                <span class="costEstimate">~₹${hotel.estimatedPerNight?.toLocaleString()}/night</span>
              </div>
            </div>
          </div>
        `).join('');
  
        // ── RESTAURANT CARDS ───────────────────────────────────────────
        const restaurantsHTML = data.restaurants.map(r => `
          <div class="card">
            ${r.image ? `<img src="${r.image}" class="cardImage">` : ''}
            <div class="cardBody">
              <h4>${r.name}</h4>
              <p>${r.address}</p>
              <p>⭐ ${r.rating || 'N/A'}</p>
              <div class="cardMeta">
                <span class="priceTag">${r.priceLabel || '₹'}</span>
                <span class="costEstimate">~₹${r.estimatedPerMeal?.toLocaleString()}/meal/person</span>
              </div>
            </div>
          </div>
        `).join('');
  
        // ── BUDGET BREAKDOWN CARD ──────────────────────────────────────
        const bb        = data.budgetBreakdown;
        const isOver    = bb.status === 'over_budget';
        const statusClr = isOver ? '#e74c3c' : '#27ae60';
        const statusTxt = isOver ? '⚠️ Over Budget' : '✅ Within Budget';
  
        const budgetHTML = `
          <div class="budgetCard">
            <div class="budgetHeader">
              <h3>💰 Budget Breakdown</h3>
              <span class="budgetBadge" style="background:${statusClr}">${statusTxt}</span>
            </div>
            <div class="budgetRow">
              <span>🏨 Hotel <small>(₹${bb.hotel.perNight?.toLocaleString()}/night budget)</small></span>
              <span>Est. ₹${bb.hotel.estimated?.toLocaleString()} <small>/ ₹${bb.hotel.allocated?.toLocaleString()} allocated</small></span>
            </div>
            <div class="budgetRow">
              <span>🍽️ Food <small>(₹${bb.food.perMealPerPerson?.toLocaleString()}/meal/person budget)</small></span>
              <span>Est. ₹${bb.food.estimated?.toLocaleString()} <small>/ ₹${bb.food.allocated?.toLocaleString()} allocated</small></span>
            </div>
            <div class="budgetRow">
              <span>🎯 Activities</span>
              <span>₹${bb.activities.allocated?.toLocaleString()} allocated</span>
            </div>
            <div class="budgetDivider"></div>
            <div class="budgetRow budgetTotal">
              <span>Estimated Total</span>
              <strong style="color:${statusClr}">₹${bb.estimatedTotal?.toLocaleString()}</strong>
            </div>
            <div class="budgetRow budgetTotal">
              <span>Your Budget</span>
              <strong>₹${bb.total?.toLocaleString()}</strong>
            </div>
            <div class="budgetRow budgetTotal">
              <span>${isOver ? 'Over by' : 'Remaining'}</span>
              <strong style="color:${statusClr}">₹${Math.abs(bb.remaining)?.toLocaleString()}</strong>
            </div>
            ${isOver ? `<p class="budgetTip">💡 Try reducing days, or choose budget (₹) hotels and restaurants to stay within your budget.</p>` : ''}
          </div>
        `;
  
        // ── ITINERARY ──────────────────────────────────────────────────
        const itineraryFormatted = data.itinerary
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
        // ── INJECT EVERYTHING INTO #result ────────────────────────────
        document.getElementById('result').innerHTML = `
          ${data.destinationImage ? `<img src="${data.destinationImage}" class="destinationBanner">` : ''}
          ${budgetHTML}
          <h2>Hotels</h2>
          <div class="cardContainer">${hotelsHTML}</div>
          <h2>Restaurants</h2>
          <div class="cardContainer">${restaurantsHTML}</div>
          <h2>Itinerary</h2>
          <div class="itinerary">${itineraryFormatted}</div>
        `;
  
      } else {
        document.getElementById('message').textContent = data.message;
      }
  
    } catch (error) {
      document.getElementById('message').textContent = 'Something went wrong';
    }
  });
  
  document.getElementById('saveButton').addEventListener('click', async function() {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('https://tripsmart-lpsm.onrender.com/api/trips/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(currentTripData)
      });
      const data = await response.json();
      if (response.ok) {
        document.getElementById('message').textContent = 'Trip saved successfully!';
      } else {
        document.getElementById('message').textContent = data.message;
      }
    } catch (error) {
      document.getElementById('message').textContent = 'Something went wrong';
    }
  });