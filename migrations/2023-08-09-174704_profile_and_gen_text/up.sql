-- Your SQL goes here
-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Create the fitness_profile table
CREATE TABLE fitness_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    height REAL NOT NULL,
    height_unit TEXT NOT NULL,
    weight REAL NOT NULL,
    weight_unit TEXT NOT NULL,
    gender TEXT NOT NULL,
    years_trained INTEGER NOT NULL,
    fitness_level TEXT NOT NULL,
    injuries TEXT NOT NULL,
    fitness_goal TEXT NOT NULL,
    target_timeframe TEXT NOT NULL,
    challenges TEXT NOT NULL,
    exercise_blacklist JSONB,
    frequency INTEGER NOT NULL,
    days_cant_train JSONB,
    preferred_workout_duration INTEGER NOT NULL,
    gym_or_home TEXT NOT NULL,
    favorite_exercises JSONB,
    equipment JSONB
);

-- Create the generated_text table
CREATE TABLE generated_text (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE
);
