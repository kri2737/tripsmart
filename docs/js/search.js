document.getElementById('logoutButton').addEventListener('click', function () {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

let currentTripData = null;

function resolvePhotoUrl(item) {
  if (item.photoReference) {
    return `${window.API_BASE_URL}/api/photos/${encodeURIComponent(item.photoReference)}`;
  }
  return item.image || '';
}

document.getElementById('search').addEventListener('submit', async function (e) {
  e.preventDefault();

  const destination = document.getElementById('destination').value;
  const days = Number(document.getElementById('days').value);
  const people = Number(document.getElementById('people').value);
  const budget = Number(document.getElementById('budget').value);
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('message').innerHTML = '<div class="spinner"></div>';
  document.getElementById('result').innerHTML = '';
  document.getElementById('saveButton').style.display = 'none';

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/trips/search`, {
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

      const hotelsHTML = (data.hotels || []).map((hotel) => {
        const photoUrl = resolvePhotoUrl(hotel);
        return `
          <div class="card">
            ${photoUrl ? `<img src="${window.escapeHTML(photoUrl)}" class="cardImage" alt="${window.escapeHTML(hotel.name)}">` : ''}
            <div class="cardBody">
              <h4>${window.escapeHTML(hotel.name)}</h4>
              <p>${window.escapeHTML(hotel.address)}</p>
              <p>⭐ ${window.escapeHTML(hotel.rating || 'N/A')}</p>
              <p>Est. Per Night: ₹${window.escapeHTML(hotel.estimatedPerNight || hotel.priceLevel || 'N/A')}</p>
            </div>
          </div>
        `;
      }).join('');

      const restaurantsHTML = (data.restaurants || []).map((r) => {
        const photoUrl = resolvePhotoUrl(r);
        return `
          <div class="card">
            ${photoUrl ? `<img src="${window.escapeHTML(photoUrl)}" class="cardImage" alt="${window.escapeHTML(r.name)}">` : ''}
            <div class="cardBody">
              <h4>${window.escapeHTML(r.name)}</h4>
              <p>${window.escapeHTML(r.address)}</p>
              <p>⭐ ${window.escapeHTML(r.rating || 'N/A')}</p>
              <p>Est. Per Meal: ₹${window.escapeHTML(r.estimatedPerMeal || r.priceLevel || 'N/A')}</p>
            </div>
          </div>
        `;
      }).join('');

      const itineraryFormatted = window.escapeHTML(data.itinerary || '')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      document.getElementById('result').innerHTML = `
        ${data.destinationImage ? `<img src="${window.escapeHTML(data.destinationImage)}" class="destinationBanner" alt="${window.escapeHTML(data.destination)}">` : ''}
        <h2>Hotels</h2>
        <div class="cardContainer">${hotelsHTML || '<p>No hotels found.</p>'}</div>
        <h2>Restaurants</h2>
        <div class="cardContainer">${restaurantsHTML || '<p>No restaurants found.</p>'}</div>
        <h2>Itinerary</h2>
        <div class="itinerary">${itineraryFormatted}</div>
      `;
    } else {
      document.getElementById('message').textContent = data.message || 'Search failed';
    }
  } catch (error) {
    document.getElementById('message').textContent = 'Something went wrong';
  }
});

document.getElementById('saveButton').addEventListener('click', async function () {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/trips/save`, {
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
      document.getElementById('message').textContent = data.message || 'Failed to save trip';
    }
  } catch (error) {
    document.getElementById('message').textContent = 'Something went wrong';
  }
});
