document.getElementById('logoutButton').addEventListener('click', function () {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

let allTrips = [];

async function loadSavedTrips() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/trips/saved`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const data = await response.json();

    if (response.ok) {
      allTrips = data.trips || [];

      if (allTrips.length === 0) {
        document.getElementById('tripsList').innerHTML = '<p>No saved trips yet.</p>';
        return;
      }

      const tripsHTML = allTrips.map((trip) => `
        <div class="tripCard" data-id="${window.escapeHTML(trip._id)}">
          <h3>${window.escapeHTML(trip.destination)}</h3>
          <p>${window.escapeHTML(trip.days)} days • ₹${window.escapeHTML(trip.budget)} • ${window.escapeHTML(trip.people)} people</p>
          <div class="tripDetails" style="display:none;"></div>
        </div>
      `).join('');

      document.getElementById('tripsList').innerHTML = tripsHTML;
      addCardClickListeners();
    } else {
      document.getElementById('message').textContent = data.message || 'Failed to load trips';
    }
  } catch (error) {
    document.getElementById('message').textContent = 'Something went wrong';
  }
}

function addCardClickListeners() {
  document.querySelectorAll('.tripCard').forEach((card) => {
    card.addEventListener('click', function (e) {
      if (e.target.classList.contains('deleteButton')) return;

      const tripId = this.getAttribute('data-id');
      const trip = allTrips.find((t) => t._id === tripId);
      const detailsDiv = this.querySelector('.tripDetails');

      if (detailsDiv.style.display === 'none') {
        const hotelNames = (trip.hotels || []).map((h) => window.escapeHTML(h.name)).join(', ') || 'None';
        const restaurantNames = (trip.restaurants || []).map((r) => window.escapeHTML(r.name)).join(', ') || 'None';
        const formattedItinerary = window.escapeHTML(trip.itinerary || '')
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        detailsDiv.innerHTML = `
          <h4>Hotels</h4>
          <p>${hotelNames}</p>
          <h4>Restaurants</h4>
          <p>${restaurantNames}</p>
          <h4>Itinerary</h4>
          <div>${formattedItinerary}</div>
          <button class="deleteButton" data-id="${window.escapeHTML(trip._id)}">Delete Trip</button>
        `;
        detailsDiv.style.display = 'block';
      } else {
        detailsDiv.style.display = 'none';
      }
    });
  });
}

document.getElementById('tripsList').addEventListener('click', async function (e) {
  if (e.target.classList.contains('deleteButton')) {
    e.stopPropagation();
    const tripId = e.target.getAttribute('data-id');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${window.API_BASE_URL}/api/trips/${encodeURIComponent(tripId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      const data = await response.json();

      if (response.ok) {
        loadSavedTrips();
      } else {
        document.getElementById('message').textContent = data.message || 'Delete failed';
      }
    } catch (error) {
      document.getElementById('message').textContent = 'Something went wrong';
    }
  }
});

loadSavedTrips();
