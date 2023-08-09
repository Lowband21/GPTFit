<script>
    let email = '';
    let password = '';
    let invitation_id = '';

    async function register() {
        const response = await fetch('./api/register_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log("Here");

        const data = await response.json();

        if (response.ok) {
            alert('Successfully registered!');
            password = '';
        } else {
            alert(`Failed to register. Reason: ${JSON.stringify(data)}`);
        }
    }

</script>

<div class="login">
    <h1>Register Account</h1>

    <p>Please enter your email and new password</p>
    <input class="field" type="text" bind:value={email} placeholder="email" readonly/>
    <input class="field" type="password" bind:value={password} placeholder="Password" />
    <button class="btn" on:click|preventDefault={register}>Register</button>
</div>
