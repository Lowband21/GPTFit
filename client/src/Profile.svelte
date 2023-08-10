<script>
    import { onMount, tick } from 'svelte';
    let email = "";
    let isAuth = false;
    let user = {
        name: '',
        age: '',
        height_unit: 'ft',
        height: '',
        weight_unit: 'lbs',
        weight: '',
        gender: '',
        years_trained: '',
        fitness_level: '',
        injuries: '',
        fitness_goal: '',
        target_timeframe: '',
        challenges: '',
        favorite_exercises: [],
        exercise_blacklist: [],
        frequency: '',
        days_cant_train: [],
        preferred_workout_duration: '',
        gym_or_home: '',
        equipment: [],
    };

    const equipmentOptions = ['Dumbbells', 'Barbell', 'Kettlebells', 'Resistance Bands', 'Treadmill', 'Stationary Bike'];
    let profileExists = false;
    let dataSaved = false;
    let error = null;

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const exercises = ['Squats', 'Deadlift', 'Bench Press', 'Pullups', 'Pushups', 'Crunches', 'Lunges'];
    const genderOptions = ['Male', 'Female', 'Other'];
    const heightUnits = ['cm', 'ft'];
    const weightUnits = ['kg', 'lbs'];

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
    }
    onMount(async () => {
        await fetchAuthStatus();
        await loadProfile();
    });
    async function loadProfile() {
        try {
            const response = await fetch(`./api/profile/${email}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
    
            if (!response.ok) {
                throw new Error(await response.text()); // get and throw the error message
            }
    
            const userProfile = await response.json();
            await tick();
    
            console.log(userProfile);
            
            user = { ...user, ...userProfile.data }; // spread the data from userProfile into user object
            profileExists = userProfile.data && Object.keys(userProfile.data).length > 0; // check if the profile exists based on data
    
        } catch (err) {
            error = err.message; // set the error message
            console.error(error); // print error message to console
        }
    }

    async function saveProfile() {
        const response = await fetch(`./api/profile/${email}`, {
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

    h3 {
        margin-top: 2em;
    }
</style>

{#if user}
    <h2>You're logged in!</h2>
    {#if profileExists}
        {#if dataSaved}
            <p>Your data has been saved successfully!</p>
        {/if}
    {/if}
    <form on:submit|preventDefault={saveProfile}>
        <h3>Personal Information</h3>
        <label>Name: <input bind:value={user.name} placeholder="Enter your name"></label>
        <label>Age: <input bind:value={user.age} type="number" min="0" placeholder="Enter your age"></label>
        <label>
            Height: 
            <input bind:value={user.height} type="number" min="0" placeholder="Enter your height">
            <select bind:value={user.height_unit}>
                {#each heightUnits as unit}
                    <option value={unit}>{unit}</option>
                {/each}
            </select>
        </label>
        <label>
            Weight: 
            <input bind:value={user.weight} type="number" min="0" placeholder="Enter your weight">
            <select bind:value={user.weight_unit}>
                {#each weightUnits as unit}
                    <option value={unit}>{unit}</option>
                {/each}
            </select>
        </label>
        <label>Gender:
            <select bind:value={user.gender}>
                <option value="">Select...</option>
                {#each genderOptions as gender}
                    <option value={gender}>{gender}</option>
                {/each}
            </select>
        </label>
        <h3>Fitness Information</h3>
        <label>Years Trained: <input bind:value={user.years_trained} type="number" min="0" placeholder="Enter years trained"></label>
        <label>Fitness Level: <input bind:value={user.fitness_level} placeholder="Enter your fitness level"></label>
        <label>Injuries or Health Concerns: <input bind:value={user.injuries} placeholder="Enter any injuries or health concerns"></label>
        <label>Fitness Goal: <input bind:value={user.fitness_goal} placeholder="Enter your fitness goal"></label>
        <label>Target Timeframe: <input bind:value={user.target_timeframe} placeholder="Enter your target timeframe"></label>
        <label>Specific Challenges: <input bind:value={user.challenges} placeholder="Enter any specific challenges"></label>

        <h3>Workout Preferences</h3>
        <label>Favorite Exercises:
            <select bind:value={user.favorite_exercises} multiple>
                {#each exercises as exercise (exercise)}
                    <option value={exercise}>{exercise}</option>
                {/each}
            </select>
        </label>
        <label>Preferred Workout Duration (in minutes): <input bind:value={user.preferred_workout_duration} type="number" min="0" placeholder="Enter preferred workout duration"></label>
        <label>Do you workout at gym or home?
            <select bind:value={user.gym_or_home}>
                <option value="">Select...</option>
                <option value="gym">Gym</option>
                <option value="home">Home</option>
                <option value="both">Both</option>
            </select>
        </label>
        <label>What equipment do you have access to?
            <select bind:value={user.equipment} multiple>
                {#each equipmentOptions as equipment (equipment)}
                    <option value={equipment}>{equipment}</option>
                {/each}
            </select>
        </label>
        <label>Exercises to Avoid:
            <select bind:value={user.exercise_blacklist} multiple>
                {#each exercises as exercise (exercise)}
                    <option value={exercise}>{exercise}</option>
                {/each}
            </select>
        </label>
        <label>Workout Frequency (days per week): <input bind:value={user.frequency} type="number" min="0" placeholder="Enter workout frequency"></label>
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