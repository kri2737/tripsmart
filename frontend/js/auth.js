if (document.getElementById('loginForm')){
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('message').textContent = 'Login successful!';
            localStorage.setItem('token', data.token);
        } else {
            document.getElementById('message').textContent = data.message;
        }

    } catch (error) {
        document.getElementById('message').textContent = 'Something went wrong';
    }
});
}
if (document.getElementById('signUpForm')) {
    document.getElementById('signUpForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:8000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                document.getElementById('message').textContent = 'Registration successful!';
                localStorage.setItem('token', data.token);
            } else {
                document.getElementById('message').textContent = data.message;
            }

        } catch (error) {
            document.getElementById('message').textContent = 'Something went wrong';
        }
    });
}
