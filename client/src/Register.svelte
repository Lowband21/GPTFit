<script>
    let email = '';
    let password = '';

    async function register() {
        const response = await fetch('./register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Successfully registered!');
        } else {
            alert(`Failed to register. Reason: ${JSON.stringify(data)}`);
        }
    }
</script>

<form on:submit|preventDefault={register}>
    <input type="email" bind:value={email} placeholder="Email">
    <input type="password" bind:value={password} placeholder="Password">
    <button type="submit">Register</button>
</form>
