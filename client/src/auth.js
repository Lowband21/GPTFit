import { writable } from 'svelte/store';

export const auth = writable({
    isAuth: false,
    username: '',
});
