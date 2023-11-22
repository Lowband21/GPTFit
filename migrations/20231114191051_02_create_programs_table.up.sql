-- Add up migration script here
CREATE TABLE fitness_programs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    program_data JSON NOT NULL
);

