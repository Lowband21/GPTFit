<script>
    import { auth } from './auth.js';
    async function getCsrfToken() {
        const response = await fetch('https://gptfit-69ea38e54370.herokuapp.com/csrf_token', { 
            method: 'GET', 
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Got back CsrfToken");
            return data.csrfToken;
        } else {
            alert('Failed to fetch CSRF token.');
            return null;
        }
    }

    let email = '';
    let password = '';
    let loggedIn = false;
    let attemptedLogin = false;
    let errorMessage = '';

    async function login() {
        const csrfToken = await getCsrfToken();
    
        const response = await fetch('https://gptfit-69ea38e54370.herokuapp.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, csrf_token: csrfToken }), 
            credentials: 'include',
        });

        attemptedLogin = true;
        if (!response.ok) {
            console.log("Response not okay");
            try {
                const data = await response.json();
                errorMessage = data.message;  // Expect a 'message' key in the JSON response
            } catch (error) {
                errorMessage = `Failed to log in. Status: ${response.status}`;
            }
            alert(errorMessage);
            return;
        }
        
        const data = await response.json();
        console.log(data);
        auth.set({ isAuth: true, username: email });
        loggedIn = true;
        localStorage.setItem('auth_token', data.auth_token);
    }
</script>

<style>
  form {
    display: flex;
    flex-direction: column;
    max-width: 300px;
    margin: 0 auto;
  }

  input {
    margin-bottom: 10px;
    padding: 10px;
    font-size: 1em;
  }

  button {
    padding: 10px;
    font-size: 1em;
    background-color: #007BFF;
    color: white;
    border: none;
    cursor: pointer;
  }

  button:hover {
    background-color: #0056b3;
  }
</style>

<form on:submit|preventDefault={login}>
    <input type="email" bind:value={email} placeholder="Email">
    <input type="password" bind:value={password} placeholder="Password">
    <button type="submit">Log In</button>
    {#if attemptedLogin && !loggedIn}
        <p style="color:red">Failed to log in. Please check your credentials.</p>
        <p style="color:red">{errorMessage}</p>
    {/if}
</form>
