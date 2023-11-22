use crate::models::{FitnessProfile, FitnessProgram};
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use sqlx::FromRow;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub data: Option<T>,
    pub error: Option<String>,
}

#[derive(FromRow, Debug)]
pub struct FitnessProfileResponse {
    pub id: i32,
    pub user_id: i32,
    pub profile_data: Json<FitnessProfile>,
}
#[derive(FromRow, Serialize, Deserialize, Debug)]
pub struct FitnessProgramResponse {
    pub id: i32,
    pub user_id: i32,
    pub program_data: Json<FitnessProgram>,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct ProgramSummaryResponse {
    pub id: i32,
    pub fitness_program: Json<FitnessProgram>,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct Response {
    pub id: i32,
    pub response: String,
}
