-- Add up migration script here
CREATE TABLE fitness_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT,
    profile_data JSON
);

