document.getElementById('logoutButton').addEventListener('click', function() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});
let allTrips = [];  // store full trip data globally

async function loadSavedTrips() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('http://localhost:8000/api/trips/saved', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();

        if (response.ok) {
            allTrips = data.trips;  // save full data for later use

            const tripsHTML = data.trips.map(trip => `
                <div class="tripCard" data-id="${trip._id}">
                    <h3>${trip.destination}</h3>
                    <p>Days: ${trip.days}</p>
                    <p>Budget: ₹${trip.budget}</p>
                    <div class="tripDetails" style="display:none;"></div>
                </div>
            `).join('');

            document.getElementById('tripsList').innerHTML = tripsHTML;

            addCardClickListeners();
        } else {
            document.getElementById('message').textContent = data.message;
        }

    } catch (error) {
        document.getElementById('message').textContent = 'Something went wrong';
    }
}

function addCardClickListeners() {
    document.querySelectorAll('.tripCard').forEach(card => {
        card.addEventListener('click', function() {
            const tripId = this.getAttribute('data-id');
            const trip = allTrips.find(t => t._id === tripId);
            const detailsDiv = this.querySelector('.tripDetails');

            if (detailsDiv.style.display === 'none') {
                detailsDiv.innerHTML = `
                    <h4>Hotels</h4>
                    <p>${JSON.stringify(trip.hotels)}</p>
                    <h4>Restaurants</h4>
                    <p>${JSON.stringify(trip.restaurants)}</p>
                    <h4>Itinerary</h4>
                    <p>${trip.itinerary}</p>
                    <button class="deleteButton" data-id="${trip._id}">Delete Trip</button>
                `;
                detailsDiv.style.display = 'block';
            } else {
                detailsDiv.style.display = 'none';
            }
        });
    });
}
document.getElementById('tripsList').addEventListener('click', async function(e) {
    if (e.target.classList.contains('deleteButton')) {
        const tripId = e.target.getAttribute('data-id');
        
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`http://localhost:8000/api/trips/${tripId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            const data = await response.json();

            if (response.ok) {
                loadSavedTrips();  // reload the list after delete
            } else {
                document.getElementById('message').textContent = data.message;
            }

        } catch (error) {
            document.getElementById('message').textContent = 'Something went wrong';
        }
    }
});

loadSavedTrips();