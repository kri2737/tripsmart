document.getElementById('search').addEventListener('submit', async function(e) {
    e.preventDefault();

    const destination = document.getElementById('destination').value;
    const days = document.getElementById('days').value;
    const people = document.getElementById('people').value;
    const budget = document.getElementById('budget').value;
    const token = localStorage.getItem('token');

    document.getElementById('message').textContent = 'Searching... please wait';

    try {
        const response = await fetch('http://localhost:8000/api/trips/search', {
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
            document.getElementById('result').innerHTML = `
                <h2>Hotels</h2>
                <p>${JSON.stringify(data.hotels)}</p>
                <h2>Restaurants</h2>
                <p>${JSON.stringify(data.restaurants)}</p>
                <h2>Itinerary</h2>
                <p>${data.itinerary}</p>
            `;
        } else {
            document.getElementById('message').textContent = data.message;
        }

    } catch (error) {
        document.getElementById('message').textContent = 'Something went wrong';
    }
});