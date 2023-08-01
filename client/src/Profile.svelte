<script>
    import { onMount, tick } from 'svelte';

    let user = {
        name: 'Unknown',
        age: null,
        height: null,
        weight: null,
        gender: 'Unknown',
        years_trained: null,
        type: 'Unknown',
        fitness_level: 'Unknown',
        injuries: 'None',
        fitness_goal: 'Unknown',
        target_timeframe: 'Unknown',
        challenges: 'None',
        favorite_exercises: [],
        exercise_blacklist: [],
        frequency: null,
        days_cant_train: [],
        preferred_workout_duration: null, // new field
        gym_or_home: 'Unknown', // new field
        equipment: [], // new field
    };

    const equipmentOptions = ['Dumbbells', 'Barbell', 'Kettlebells', 'Resistance Bands', 'Treadmill', 'Stationary Bike']; // possible options for equipment

    let profileExists = false; 
    let dataSaved = false;
    let error = null; // to store error message

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const exercises = ['Squats', 'Deadlift', 'Bench Press', 'Pullups', 'Pushups', 'Crunches', 'Lunges'];

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
            await tick();
            user = { ...user, ...userProfile }; 
            if (Object.keys(userProfile).length) {  
                profileExists = true;
            }
        } else {
            error = await response.text(); // get error message
            console.error(error); // print error message to console
        }
    });

    async function saveProfile() {
        const response = await fetch('./profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(user)
        });

        if (response.ok) {
            const updatedUser = await response.json();
            await tick();
            user = { ...user, ...updatedUser };
            profileExists = true;
            dataSaved = true; 
        } else {
            error = await response.text(); // get error message
            console.error(error); // print error message to console
            alert(error);
        }
        alert(error);
    }
</script>

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    label {
        display: flex;
        flex-direction: column;
        font-size: 1.2em;
    }

    input, select {
        padding: 0.5em;
        font-size: 1em;
    }

    button {
        padding: 0.5em 1em;
        font-size: 1em;
        background-color: #008CBA; 
        border: none;
        color: white;
        cursor: pointer;
    }

    button:hover {
        background-color: #007B9A;
    }
</style>

{#if user}
    <h2>You're logged in!</h2>
    {#if profileExists}
        <h2> You have a profile saved! </h2>
        {#if dataSaved}
            <p>Your data has been saved successfully!</p>
        {/if}
    {/if}
    <form on:submit|preventDefault={saveProfile}>
        <label>Name: <input bind:value={user.name}></label>
        <label>Age: <input bind:value={user.age} type="number"></label>
        <label>Height: <input bind:value={user.height}></label>
        <label>Weight: <input bind:value={user.weight}></label>
        <label>Gender: <input bind:value={user.gender}></label>
        <label>Years Trained: <input bind:value={user.years_trained} type="number"></label>
        <label>Type: <input bind:value={user.type}></label>
        <label>Fitness Level: <input bind:value={user.fitness_level}></label>
        <label>Injuries or Health Concerns: <input bind:value={user.injuries}></label>
        <label>Fitness Goal: <input bind:value={user.fitness_goal}></label>
        <label>Target Timeframe: <input bind:value={user.target_timeframe}></label>
        <label>Specific Challenges: <input bind:value={user.challenges}></label>
        <label>Favorite Exercises: 
            <select bind:value={user.favorite_exercises} multiple>
                {#each exercises as exercise (exercise)}
                    <option value={exercise}>{exercise}</option>
                {/each}
            </select>
        </label>
        <label>Preferred Workout Duration (in minutes): <input bind:value={user.preferred_workout_duration} type="number"></label>
        <label>Do you workout at gym or home? 
            <select bind:value={user.gym_or_home}>
                <option value="">Select...</option>
                <option value="gym">Gym</option>
                <option value="home">Home</option>
            </select>
        </label>
        <label>What equipment do you have access to? 
            <select bind:value={user.equipment} multiple>
                {#each equipmentOptions as equipment (equipment)}
                    <option value={equipment}>{equipment}</option>
                {/each}
            </select>
        </label>
        <label>Exercise Blacklist: 
            <select bind:value={user.exercise_blacklist} multiple>
                {#each exercises as exercise (exercise)}
                    <option value={exercise}>{exercise}</option>
                {/each}
            </select>
        </label>
        <label>Frequency: <input bind:value={user.frequency} type="number"></label>
        <label>Days You Can't Train: 
            <select bind:value={user.days_cant_train} multiple>
                {#each daysOfWeek as day (day)}
                    <option value={day}>{day}</option>
                {/each}
            </select>
        </label>
        <button type="submit">Save</button>
    </form>
{:else}
    <p>Loading...</p>
{/if}
