<script>
    import { onMount } from 'svelte';

    let name = 'User';
    let error = null;

    onMount(async () => {
        try {
            const response = await fetch('./profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(`Error: ${data.error}`);
            }
            
            const user = await response.json();
            name = user.name;
        } catch (err) {
            error = err.message || "An error occurred.";
        }
    });
</script>

<style>
  .home-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-family: Arial, sans-serif;
  }

  h1, p {
    text-align: center;
  }

  .error {
    color: red;
  }
</style>

<div class="home-container">
  <h1>Welcome to GPTFit, {name}!</h1>
  <p>Get personalized workout programs, powered by AI.</p>
  <p>Use the navigation bar to access your profile, generate new workouts, or browse existing workouts.</p>
  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>
