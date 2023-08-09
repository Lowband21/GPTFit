<script>
    import { auth } from "./auth.js";
    async function getCsrfToken() {
        const response = await fetch("./api/csrf_token", {
            method: "GET",
        });
        console.log(response);
    
        if (response.ok) {
            const textData = await response.text();
            console.log("Response text:", textData);
            const data = await response.json();
            console.log("Got back CsrfToken:", data.csrfToken);
            return data.csrfToken;
        } else {
            alert("Failed to fetch CSRF token.");
            return null;
        }
    }

    let email = "";
    let password = "";
    let loggedIn = false;
    let attemptedLogin = false;
    let errorMessage = "";
    let successMessage = "";

    async function login() {
        errorMessage = "";
        successMessage = "";
        const csrfToken = await getCsrfToken();
        const response = await fetch("./api/auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password, csrfToken }),
            credentials: "include",
        });
        console.log(response);

        attemptedLogin = true;
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            auth.set({ isAuth: true, username: email });
            loggedIn = true;
            successMessage = "Logged in successfully!";
            localStorage.setItem("auth_token", data.auth_token);
        }

        const data = await response.json();
        console.log(data);
        auth.set({ isAuth: true, username: email });
        loggedIn = true;
        localStorage.setItem("auth_token", data.auth_token);
    }
</script>

<form on:submit|preventDefault={login}>
    <input type="email" bind:value={email} placeholder="Email" />
    <input type="password" bind:value={password} placeholder="Password" />
    <button type="submit">Log In</button>
    {#if attemptedLogin && !loggedIn}
        <p style="color:red">
            Failed to log in. Please check your credentials.
        </p>
        <p style="color:red">{errorMessage}</p>
    {/if}
    {#if loggedIn}
        <p style="color:green">
            {successMessage}
        </p>
    {/if}
</form>

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
        background-color: #007bff;
        color: white;
        border: none;
        cursor: pointer;
    }

    button:hover {
        background-color: #0056b3;
    }
</style>
