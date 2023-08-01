<script>
  import { writable, derived, get } from 'svelte/store';
  import { onMount } from 'svelte';

  const user = writable({
    frequency: '',
    type: [],
    days_cant_train: [],
    favorite_exercises: [],
  });

  let generatedText = '';
  let isLoading = false; 
  let error = null; 

  // define prompt as a derived store
  const prompt = derived(user, $user => {
    if ($user.name) { // or check for any required property
      return `My name is ${$user.name} and I am ${$user.age} years old. I am ${$user.height} feet tall and I weigh ${$user.weight} pounds. I am ${$user.gender} and I have been training for ${$user.years_trained} years. 
      I am a ${$user.type} type of trainer and I prefer to work out ${$user.frequency} times a week. On these days: ${$user.days_cant_train.join(", ")} I can't train. I especially enjoy these exercises: ${$user.favorite_exercises.join(", ")}. 
      I prefer my workouts to be ${$user.preferred_workout_duration} minutes long and I ${$user.gym_or_home === 'gym' ? 'have access to a gym' : 'prefer to workout at home'}. 
      My fitness level is ${$user.fitness_level}. I have the following injuries: ${$user.injuries}. My fitness goal is ${$user.fitness_goal} and I aim to reach it in ${$user.target_timeframe}. 
      The challenges I face in reaching my fitness goals are: ${$user.challenges}. The exercises I avoid are: ${$user.exercise_blacklist}. 
      The equipment I have available for my workouts include: ${$user.equipment.join(", ")}.`;
    } else {
      return '';  // default value
    }
  });

  async function generateText() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch("./generate", {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
              prompt: $prompt,
              max_tokens: 1000 
          })
      })

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(data)}`);
      }

      generatedText = data;
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }

  onMount(async () => {
    const response = await fetch('./profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
  
    if (response.ok) {
      const userProfile = await response.json();
      console.log('userProfile:', userProfile); // Add this line
      console.log('current user:', get(user)); // Add this line
  
      if (userProfile && get(user)) { // Check if both userProfile and get(user) are not undefined
        user.set({ ...get(user), ...userProfile });
      } else {
        error = "Failed to load user profile."
      }
    } else {
      error = "Failed to load user profile."
    }
  });
</script>

<style>
  /* Style for your component */
  .container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2em;
  }
  .text-input {
    margin: 1em 0;
    width: 100%;
    padding: 0.5em;
    font-size: 1.2em;
  }
  .text-area {
    margin: 1em 0;
    width: 100%;
    height: 150px;
    padding: 0.5em;
    font-size: 1.2em;
  }
  .generate-btn {
    padding: 0.5em 1em;
    font-size: 1.2em;
    color: white;
    background-color: #007BFF;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .generate-btn:hover {
    background-color: #0056b3;
  }
  pre {
    white-space: pre-wrap;       /* css-3 */
    white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
    white-space: -pre-wrap;      /* Opera 4-6 */
    white-space: -o-pre-wrap;    /* Opera 7 */
    word-wrap: break-word;       /* Internet Explorer 5.5+ */
    overflow: auto;
    width: 100%;
    height: auto;
    background: #f4f4f4;
    padding: 10px;
    border-radius: 5px;
  }
</style>

<div class="container">
  <h1>Your Custom Workout Plan</h1>
  {#if error}
    <div class="error">{error}</div>
  {:else if isLoading}
    <div>Loading...</div>
  {:else}
    {#if $user}
      <textarea bind:value={$prompt} class="text-area"></textarea>
    {:else}
      <p>Loading user data...</p>
    {/if}
    <button class="generate-btn" on:click={generateText}>Generate</button>
    <pre>{generatedText}</pre>
  {/if}
</div>
