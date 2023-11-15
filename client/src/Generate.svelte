<script>
  import { writable, derived, get } from "svelte/store";
  import { onMount } from "svelte";


  let email = "";
  let isAuth = false;
  let generatedText = "";
  let isLoading = false;
  let error = null;
  let prompt = writable("");

  async function generateText() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch("./api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          prompt: $prompt,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, details: ${JSON.stringify(
            data
          )}`
        );
      }

      generatedText = data;
      console.log(generatedText);
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch("./api/auth"); // Updated to the get_me endpoint
      if (response.ok) {
        const user = await response.json();
        isAuth = true; // The user is authenticated if the request was successful
        email = user.email;
      } else {
        isAuth = false;
        email = "";
      }
    } catch (error) {
      console.error("Error fetching authentication status:", error);
      isAuth = false;
      username = "";
    }
  };
  async function loadProfile() {
    const response = await fetch(`./api/prompt`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });

    if (response.ok) {
      const api_response = await response.json();
      prompt.set(api_response.data);
      console.log("prompt:", prompt); // Add this line
    } else {
      error = "Failed to load user profile.";
    }
  }

  onMount(async () => {
    await fetchAuthStatus();
    await loadProfile();
  });
</script>

<div class="container">
  <h1>Your Custom Workout Plan</h1>
  {#if error}
    <div class="error">{error}</div>
  {:else if isLoading}
    <div>Loading...</div>
  {:else}
    {#if isAuth}
      <textarea bind:value={$prompt} class="text-area" />
    {:else}
      <p>Loading user data...</p>
    {/if}
    <button class="generate-btn" on:click={generateText}>Generate</button>
    <pre>{generatedText}</pre>
  {/if}
</div>

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
    background-color: #007bff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .generate-btn:hover {
    background-color: #0056b3;
  }
  pre {
    white-space: pre-wrap; /* css-3 */
    white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
    white-space: -pre-wrap; /* Opera 4-6 */
    white-space: -o-pre-wrap; /* Opera 7 */
    word-wrap: break-word; /* Internet Explorer 5.5+ */
    overflow: auto;
    width: 100%;
    height: auto;
    background: #f4f4f4;
    padding: 10px;
    border-radius: 5px;
  }
</style>
