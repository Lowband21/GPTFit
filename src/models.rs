#![allow(clippy::extra_unused_lifetimes)]

use diesel::{
    r2d2::ConnectionManager,
    Insertable, PgConnection, Queryable, AsChangeset,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::schema::*;

// type alias to use in multiple places
pub type Pool = r2d2::Pool<ConnectionManager<PgConnection>>;

#[derive(Debug, Serialize, Deserialize, Queryable, Insertable)]
#[diesel(table_name = fitness_profile)]
pub struct NewUserProfile {
    pub user_id: Option<i32>,
    pub name: String,
    pub age: i32,
    pub height: f32,
    pub height_unit: String,
    pub weight: f32,
    pub weight_unit: String,
    pub gender: String,
    pub years_trained: Option<i32>,
    pub fitness_level: Option<String>,
    pub injuries: Option<String>,
    pub fitness_goal: Option<String>,
    pub target_timeframe: Option<String>,
    pub challenges: Option<String>,
    pub exercise_blacklist: Option<serde_json::Value>,
    pub frequency: i32,
    pub days_cant_train: Option<serde_json::Value>, // Using serde_json::Value for JSON fields
    pub preferred_workout_duration: i32,
    pub gym_or_home: String,
    pub favorite_exercises: Option<serde_json::Value>,
    pub equipment: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Insertable)]
#[diesel(table_name = users)]
pub struct User {
    pub user_id: i32,
    pub email: String,
    pub hash: String,
    pub created_at: chrono::NaiveDateTime,
}

impl User {
    pub fn from_details<S: Into<String>, T: Into<String>>(email: S, pwd: T) -> Self {
        User {
            user_id: Uuid::new_v4().to_u128_le() as i32,
            email: email.into(),
            hash: pwd.into(),
            created_at: chrono::Local::now().naive_local(),
        }
    }
}

#[derive(Insertable)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub user_id: i32,
    pub email: String,
    pub hash: String,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlimUser {
    pub email: String,
}

impl From<User> for SlimUser {
    fn from(user: User) -> Self {
        SlimUser { email: user.email }
    }
}
#[derive(Insertable)]
#[diesel(table_name = generated_text)]
pub struct NewGeneratedText {
    pub prompt: String,
    pub response: String,
    pub user_id: Option<i32>,
}

#[derive(Queryable)]
pub struct GeneratedText {
    pub id: i32,
    pub prompt: String,
    pub response: String,
    pub user_id: i32,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Insertable)]
#[diesel(table_name = fitness_profile)]
pub struct FitnessProfile {
    pub id: i32,
    pub user_id: Option<i32>,
    pub name: String,
    pub age: i32,
    pub height: f32,
    pub height_unit: String,
    pub weight: f32,
    pub weight_unit: String,
    pub gender: String,
    pub years_trained: i32,
    pub fitness_level: String,
    pub injuries: String,
    pub fitness_goal: String,
    pub target_timeframe: String,
    pub challenges: String,
    pub exercise_blacklist: Option<serde_json::Value>,
    pub frequency: i32,
    pub days_cant_train: Option<serde_json::Value>, // Using serde_json::Value for JSON fields
    pub preferred_workout_duration: i32,
    pub gym_or_home: String,
    pub favorite_exercises: Option<serde_json::Value>,
    pub equipment: Option<serde_json::Value>,
}

#[derive(AsChangeset, Serialize, Deserialize, Debug, Insertable)]
#[diesel(table_name=fitness_profile)]
pub struct FitnessProfileChangeset {
    pub user_id: Option<i32>,
    pub name: Option<String>,
    pub age: Option<i32>,
    pub height: Option<f32>,
    pub height_unit: Option<String>,
    pub weight: Option<f32>,
    pub weight_unit: Option<String>,
    pub gender: Option<String>,
    pub years_trained: Option<i32>,
    pub fitness_level: Option<String>,
    pub injuries: Option<String>,
    pub fitness_goal: Option<String>,
    pub target_timeframe: Option<String>,
    pub challenges: Option<String>,
    pub exercise_blacklist: Option<serde_json::Value>,
    pub frequency: Option<i32>,
    pub days_cant_train: Option<serde_json::Value>, // Using serde_json::Value for JSON fields
    pub preferred_workout_duration: Option<i32>,
    pub gym_or_home: Option<String>,
    pub favorite_exercises: Option<serde_json::Value>,
    pub equipment: Option<serde_json::Value>,
}