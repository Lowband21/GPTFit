-- Your SQL goes here
CREATE TABLE users (
    email TEXT NOT NULL PRIMARY KEY,
    hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);
