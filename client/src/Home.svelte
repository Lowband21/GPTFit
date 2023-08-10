<script>
    import { onMount } from 'svelte';

    let name = 'User';
    let error = null;

    onMount(async () => {
        try {
            const response = await fetch("./api/auth"); // Updated to the get_me endpoint
            if (response.ok) {
                const user = await response.json();
                name = user.email;
            } 
        } catch (error) {
          console.error("Error fetching authentication status:", error);
          isAuth = false;
          username = "";
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
