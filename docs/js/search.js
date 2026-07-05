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
  
    document.getElementById('message').innerHTML = '<div class="spinner"></div>';
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
              <p>Price Level: ${hotel.priceLevel}</p>
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
              <p>Price Level: ${r.priceLevel}</p>
            </div>
          </div>
        `).join('');
  
        // ── ITINERARY ──────────────────────────────────────────────────
        const itineraryFormatted = data.itinerary
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
        // ── INJECT EVERYTHING INTO #result ────────────────────────────
        document.getElementById('result').innerHTML = `
          ${data.destinationImage ? `<img src="${data.destinationImage}" class="destinationBanner">` : ''}
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