use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// SQLx model definitions

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct NewUserProfile {
    pub program_data: serde_json::Value,
    //pub name: String,
    //pub age: i32,
    //pub height: f32,
    //pub height_unit: String,
    //pub weight: f32,
    //pub weight_unit: String,
    //pub gender: String,
    //pub years_trained: Option<i32>,
    //pub fitness_level: Option<String>,
    //pub injuries: Option<String>,
    //pub fitness_goal: Option<String>,
    //pub target_timeframe: Option<String>,
    //pub challenges: Option<String>,
    //pub exercise_blacklist: Option<serde_json::Value>,
    //pub frequency: i32,
    //pub days_cant_train: Option<serde_json::Value>,
    //pub preferred_workout_duration: i32,
    //pub gym_or_home: String,
    //pub favorite_exercises: Option<serde_json::Value>,
    //pub equipment: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
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

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SlimUser {
    pub email: String,
}

impl From<User> for SlimUser {
    fn from(user: User) -> Self {
        SlimUser { email: user.email }
    }
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct NewGeneratedText {
    pub prompt: String,
    pub response: String,
    pub user_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct GeneratedText {
    pub id: i32,
    pub prompt: String,
    pub response: String,
    pub user_id: i32,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct FitnessProfile {
    pub name: Option<String>,
    pub age: Option<i32>,
    pub height: Option<f32>,
    pub height_unit: String, // Turn into enum
    pub weight: Option<f32>,
    pub weight_unit: String, // Turn into enum
    pub gender: Option<String>,
    pub years_trained: Option<i32>,
    pub fitness_level: Option<String>,
    pub injuries: Option<String>,
    pub fitness_goal: Option<String>,
    pub target_timeframe: Option<String>,
    pub challenges: Option<String>,
    pub exercise_blacklist: Option<serde_json::Value>,
    pub frequency: Option<i32>,
    pub days_cant_train: Option<serde_json::Value>,
    pub preferred_workout_duration: Option<i32>,
    pub gym_or_home: Option<String>,
    pub favorite_exercises: Option<serde_json::Value>,
    pub equipment: Option<serde_json::Value>,
}

pub enum HeightUnit {
    Cm,
    In,
}

pub enum WeightUnit {
    Kg,
    Lb,
}

impl From<String> for HeightUnit {
    fn from(unit: String) -> Self {
        match unit.as_str() {
            "in" => HeightUnit::In,
            _ => HeightUnit::Cm,
        }
    }
}

impl From<String> for WeightUnit {
    fn from(unit: String) -> Self {
        match unit.as_str() {
            "lb" => WeightUnit::Lb,
            _ => WeightUnit::Kg,
        }
    }
}
