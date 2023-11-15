<script>
    import { onMount } from "svelte";

    let responses = [];

    async function deleteResponse(id) {
        const res = await fetch(`api/response/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
        });

        if (res.ok) {
            responses = responses.filter((response) => response.id !== id);
        } else {
            console.error("Error deleting response:", await res.json());
        }
    }

    onMount(async () => {
        const res = await fetch("/api/responses", {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
        });
        //console.log(await res.json());
        responses = await res.json();
    });
</script>

<div class="container">
    <h1>Previous Responses</h1>
    {#each responses as response (response.id)}
        <div class="response-item">
            <pre>{response.response}</pre>
            <button
                class="delete-button"
                on:click={() => deleteResponse(response.id)}>Delete</button
            >
        </div>
    {/each}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 2em;
    }
    .response-item {
        margin-bottom: 1em;
        padding: 1em;
        border: 1px solid #ddd;
        border-radius: 5px;
        width: 100%;
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
    .delete-button {
        color: white;
        background-color: red;
        border: none;
        padding: 10px;
        cursor: pointer;
        margin-top: 10px;
    }
</style>
