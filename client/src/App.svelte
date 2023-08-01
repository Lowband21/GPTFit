<script>
  import { Router, Route, Link } from "svelte-routing";
  import Home from "./Home.svelte";
  import Profile from "./Profile.svelte";
  import Browse from "./Browse.svelte";
  import Generate from "./Generate.svelte";
  import Login from "./Login.svelte";
  import Register from "./Register.svelte";
  import { onMount } from 'svelte';

  let isAuth = false;
  let username = "";

  import { auth } from './auth.js';

  let authState = {};

  auth.subscribe(value => {
      authState = value;
  });

  const fetchAuthStatus = async () => {
    const response = await fetch("./auth_status");
    const { is_authenticated, email } = await response.json();
    isAuth = is_authenticated;
    username = email || "";
  };

  const logout = async () => {
    const response = await fetch("./logout", { method: "POST" });
    if (response.ok) {
      isAuth = false;
      username = "";
    }
  };

  onMount(fetchAuthStatus);
</script>

<style>
  /* Navbar styling */
  .navbar {
    display: flex;
    justify-content: space-around;
    padding: 15px 0;
    background-color: #f5f5f5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Link styling */
  .navbar a {
    text-decoration: none;
    color: #333;
    font-size: 1.2em;
    transition: color 0.2s ease;
  }

  /* Link hover styling */
  .navbar a:hover {
    color: #007BFF;
  }

  /* Current page link styling */
  .navbar a[aria-current="true"] {
    color: #007BFF;
    font-weight: bold;
  }
</style>

<Router>
  <nav class="navbar">
    <Link to="/">Home</Link>
    <Link to="/profile">Profile</Link>
    <Link to="/generate">Generate Workout</Link>
    <Link to="/browse">Browse Workouts</Link>
    {#if authState.isAuth || isAuth}
      <span>Logged in as {authState.username || username}</span>
      <button on:click={logout}>Logout</button>
    {:else}
      <Link to="/login">Login</Link>
      <Link to="/register">Register</Link>
    {/if}
  </nav>

  <Route path="/" component={Home} />
  <Route path="/profile" component={Profile} />
  <Route path="/generate" component={Generate} />
  <Route path="/browse" component={Browse} />
  <Route path="/login" component={Login} />
  <Route path="/register" component={Register} />
</Router>

