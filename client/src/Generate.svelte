<script>
  import { writable, derived, get } from "svelte/store";
  import { onMount } from "svelte";

  let email = "";
  let isAuth = false;
  let generatedText = "";
  let isLoading = false;
  let error = null;
  let prompt = writable("");
  let id = null;
  let mesoSummary = "";
  let generatedProgram = "";

  async function generateMesoSummary() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch("./api/generate_meso_summary", {
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

      id = data.id;
      mesoSummary = data.fitness_program;
      console.log(mesoSummary);
      //generatedText = data;
      console.log(id);
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }

  async function regenerateNotes() {
    error = null;
    try {
      const response = await fetch("./api/regenerate_notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          id: id,
          program: mesoSummary,
          prompt: $prompt,
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

      mesoSummary.macrocycle["01"].notes = data;
      console.log(data);
    } catch (e) {
      error = e.message;
    }
  }

  async function regenerateExercises() {
    error = null;
    try {
      const response = await fetch("./api/regenerate_exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          id: id,
          program: mesoSummary,
          prompt: $prompt,
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

      mesoSummary.macrocycle["01"].exercises = data;
      console.log(data);
    } catch (e) {
      error = e.message;
    }
  }

  async function addExercises() {
    error = null;
    try {
      const response = await fetch("./api/generate_exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          id: id,
          program: mesoSummary,
          prompt: $prompt,
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

      mesoSummary.macrocycle["01"].exercises = data;
      console.log(data);
    } catch (e) {
      error = e.message;
    }
  }

  async function generateMeso() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch("./api/generate_weeks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          id: id,
          program: mesoSummary,
          prompt: $prompt,
        }),
      });

      const data = response.json();

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, details: ${JSON.stringify(
            data
          )}`
        );
      }

      generatedProgram = data.response;
      console.log(generatedProgram);
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
    } else {
      error = "Failed to load user profile.";
    }
  }
  function addExercise() {
    mesoSummary.macrocycle["01"].exercises.exercises.push({
      name: "", // Default name
      equipment_type: "", // Default equipment type
    });
  }

  function deleteExercise(index) {
    mesoSummary.macrocycle["01"].exercises.exercises.splice(index, 1);
  }

  onMount(async () => {
    await fetchAuthStatus();
    await loadProfile();
  });
</script>

<div class="container">
  <h1>Program Generator</h1>
  {#if error}
    <div class="error">{error}</div>
  {:else if isLoading}
    <div>Generating...</div>
  {:else if isAuth}
    {#if !mesoSummary}
      <textarea bind:value={$prompt} class="text-area" />
      <button class="generate-btn" on:click={generateMesoSummary}
        >Generate Mesocycle Summary</button
      >
    {:else if !generatedProgram}
      <textarea bind:value={$prompt} class="text-area" />
      <button class="generate-btn" on:click={generateMesoSummary}
        >Regenerate Mesocycle Summary</button
      >
      <form id="mesoSummaryForm">
        <fieldset>
          <legend>Fitness Program</legend>
          <div>
            <label for="macrocycle">Macrocycle ID:</label>
            <input
              type="text"
              id="macrocycle"
              name="macrocycle"
              bind:value={id}
            />
          </div>
          <fieldset>
            <legend>Mesocycle</legend>
            <div>
              <label for="goals">Goals:</label>
              <select
                multiple
                id="goals"
                name="goals"
                bind:value={mesoSummary.macrocycle["01"].goals}
              >
                <option value="Strength">Strength</option>
                <option value="Hypertrophy">Hypertrophy</option>
                <option value="Power">Power</option>
                <option value="Endurance">Endurance</option>
                <option value="FatLoss">FatLoss</option>
                <option value="Skill">Skill</option>
              </select>
            </div>
            <fieldset>
              <legend>Exercises</legend>
              {#each mesoSummary.macrocycle["01"].exercises.exercises as exercise, index (exercise.name)}
                <div class="exercise">
                  <div>
                    <label for={`exerciseName-${index}`}>Exercise Name:</label>
                    <input
                      type="text"
                      id={`exerciseName-${index}`}
                      name={`exerciseName-${index}`}
                      bind:value={exercise.name}
                    />
                  </div>
                  <div>
                    <label for={`equipmentType-${index}`}>Equipment Type:</label
                    >
                    <select
                      id={`equipmentType-${index}`}
                      name={`equipmentType-${index}`}
                      bind:value={exercise.equipment_type}
                    >
                      <option value="Barbell">Barbell</option>
                      <option value="Dumbbell">Dumbbell</option>
                      <option value="Machine">Machine</option>
                      <option value="Cable">Cable</option>
                      <option value="WeightedBodyweight"
                        >Weighted Bodyweight</option
                      >
                      <option value="AssistedBodyweight"
                        >Assisted Bodyweight</option
                      >
                      <option value="RepsOnly">Reps Only</option>
                      <option value="Duration">Duration</option>
                      <!-- Add other equipment types as needed -->
                    </select>
                  </div>
                  <button type="button" on:click={() => deleteExercise(index)}
                    >Delete</button
                  >
                </div>
              {/each}
              <button type="button" on:click={addExercise}
                >Add Exercise Manually</button
              >
              <button
                type="button"
                class="generate-btn"
                on:click={regenerateExercises}>Regenerate All Exercises</button
              >
              <button type="button" class="generate-btn" on:click={addExercises}
                >Add Generated Exercises</button
              >
            </fieldset>
            <div>
              <label for="periodizationModel">Periodization Model:</label>
              <select
                id="periodizationModel"
                name="periodizationModel"
                bind:value={mesoSummary.macrocycle["01"].periodization_model}
              >
                <option value="Undulating">Undulating</option>
                <option value="Linear">Linear</option>
                <option value="Block">Block</option>
                <option value="Conjugate">Conjugate</option>
                <option value="Polarized">Polarized</option>
                <option value="ReverseLinear">ReverseLinear</option>
              </select>
            </div>
            <div>
              <label for="notes">Notes:</label>
              <textarea
                id="notes"
                name="notes"
                bind:value={mesoSummary.macrocycle["01"].notes}
              />
              <button type="button" on:click={regenerateNotes}
                >Regenerate Notes From Changes</button
              >
            </div>
          </fieldset>
        </fieldset>
      </form>
      <button type="button" class="generate-btn" on:click={generateMeso}
        >Generate Mesocycle</button
      >
    {:else}
      <p>generatedProgram</p>
    {/if}
  {:else}
    <p>Please login before attempting to generate</p>
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
  /* New styles */
  form {
    width: 100%;
    max-width: 60%;
    margin: 20px auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #f8f8f8;
  }
  fieldset {
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 10px;
    margin: 10px 0;
  }
  legend {
    font-weight: bold;
    padding: 0 5px;
  }
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
  }
  input[type="text"],
  select,
  textarea {
    width: 100%;
    padding: 8px;
    margin-bottom: 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .exercise {
    margin-bottom: 15px;
    padding: 10px;
    border: 1px dashed #ccc;
    border-radius: 5px;
    background-color: #f0f0f0;
  }
  .error {
    color: #d9534f;
    background-color: #f2dede;
    border-color: #ebccd1;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
  }
  input[type="submit"] {
    padding: 10px 15px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  input[type="submit"]:hover {
    background-color: #218838;
  }
</style>
