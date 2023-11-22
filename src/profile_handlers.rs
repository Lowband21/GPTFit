use crate::api_responses::*;
use crate::gen_handlers::get_user;
use crate::models::*;
use actix_identity::Identity;
use actix_web::{web, HttpResponse};
use sqlx::PgPool;

pub async fn get_user_program_prompt(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let user_id = match identity_opt {
        Some(id) => match get_user(&id) {
            Ok(user) => user.user_id,
            Err(_) => -1,
        },
        None => -1,
    };

    let user_profile = sqlx::query_as::<_, FitnessProfileResponse>(
        "SELECT * FROM fitness_profiles"
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    match user_profile {
        Ok(profile) =>{
            let data = profile_to_prompt(&profile.profile_data.0);
            println!("Sending prompt: {}", data);
            HttpResponse::Ok().json(ApiResponse {
                data: Some(data),
                error: None,
            })
        },
        Err(err) => {
            HttpResponse::InternalServerError().json(ApiResponse::<String> {
                data: None,
                error: Some(format!("Error updating program: {}", err)),
            })
        }
    }
}

pub fn profile_to_prompt(profile: &FitnessProfile) -> String {
    let mut prompt = String::from("Create a fitness program");

    if let Some(name) = &profile.name {
        prompt.push_str(&format!(" for {}", name));
    }

    if let Some(age) = profile.age {
        prompt.push_str(&format!(", age: {}", age));
    }

    if let Some(height) = profile.height {
        prompt.push_str(&format!(", height: {} {}", height, profile.height_unit));
    }

    if let Some(weight) = profile.weight {
        prompt.push_str(&format!(", weight: {} {}", weight, profile.weight_unit));
    }

    if let Some(gender) = &profile.gender {
        prompt.push_str(&format!(", gender: {}", gender));
    }

    if let Some(years) = profile.years_trained {
        prompt.push_str(&format!(", years trained: {}", years));
    }

    if let Some(level) = &profile.fitness_level {
        prompt.push_str(&format!(", fitness level: {}", level));
    }

    if let Some(injuries) = &profile.injuries {
        prompt.push_str(&format!(", injuries: {}", injuries));
    }

    if let Some(goal) = &profile.fitness_goal {
        prompt.push_str(&format!(", goal: {}", goal));
    }

    if let Some(timeframe) = &profile.target_timeframe {
        prompt.push_str(&format!(", timeframe: {} weeks", timeframe));
    }

    if let Some(challenges) = &profile.challenges {
        prompt.push_str(&format!(", challenges: {}", challenges));
    }

    if let Some(frequency) = profile.frequency {
        prompt.push_str(&format!(", training frequency per week: {}", frequency));
    }

    if let Some(duration) = profile.preferred_workout_duration {
        prompt.push_str(&format!(", preferred workout duration: {} minutes", duration));
    }

    if let Some(setting) = &profile.gym_or_home {
        prompt.push_str(&format!(", setting: {}", setting));
    }

    // Handle JSON fields like exercise_blacklist, favorite_exercises, equipment, etc.
    // Example for exercise_blacklist:
    if let Some(blacklist) = &profile.exercise_blacklist {
        prompt.push_str(&format!(", exercise blacklist: {}", blacklist));
    }

    // Similar handling for favorite_exercises and equipment

    prompt
}

pub async fn get_user_profile(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    _user_email: web::Path<String>,
) -> HttpResponse {
    println!("Getting user profile");

    let user_id = match identity_opt {
        Some(id) => match get_user(&id) {
            Ok(user) => user.user_id,
            Err(_) => -1,
        },
        None => -1,
    };

    let user_profile = sqlx::query_as::<_, FitnessProfileResponse>(
        "SELECT * FROM fitness_profiles"
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    match user_profile {
        Ok(profile) => HttpResponse::Ok().json(ApiResponse {
            data: Some(profile.profile_data),
            error: None,
        }),
        Err(err) => {
            println!("User profile not found with error {}, returning default", err);
            let profile = FitnessProfile {
                name: Some("TestUser".to_string()),
                age: Some(20),
                height: Some(6.),
                height_unit: "ft".to_string(),
                weight: Some(180.),
                weight_unit: "lbs".to_string(),
                gender: Some("male".to_string()),
                years_trained: Some(2),
                fitness_level: Some("beginner".to_string()),
                injuries: None,
                fitness_goal: None,
                target_timeframe: None,
                challenges: None,
                exercise_blacklist: None,
                frequency: Some(5),
                days_cant_train: None,
                preferred_workout_duration: Some(50),
                gym_or_home: Some("Gym".to_string()),
                favorite_exercises: None,
                equipment: None,
            };
            HttpResponse::Ok().json(ApiResponse {
                data: Some(profile),
                error: None,
            })
        }
    }
}

pub async fn get_profile(
    user_id: i32,
    pool: &PgPool,
    ) -> FitnessProfile {

    let user_profile = sqlx::query_as::<_, FitnessProfileResponse>(
        "SELECT * FROM fitness_profiles"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await;

    match user_profile {
        Ok(profile) => {
            profile.profile_data.0
        },
        Err(err) => {
            println!("User profile not found with error {}, returning default", err);
            
            FitnessProfile {
                name: Some("TestUser".to_string()),
                age: Some(20),
                height: Some(6.),
                height_unit: "ft".to_string(),
                weight: Some(180.),
                weight_unit: "lbs".to_string(),
                gender: Some("male".to_string()),
                years_trained: Some(2),
                fitness_level: Some("beginner".to_string()),
                injuries: None,
                fitness_goal: None,
                target_timeframe: None,
                challenges: None,
                exercise_blacklist: None,
                frequency: Some(5),
                days_cant_train: None,
                preferred_workout_duration: Some(50),
                gym_or_home: Some("Gym".to_string()),
                favorite_exercises: None,
                equipment: None,
            }
        }
    }
    
}

pub async fn save_user_profile(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    _user_email: web::Path<String>,
    updated_profile: web::Json<NewUserProfile>,
) -> HttpResponse {
    println!("Saving user profile");

    let user_id = match identity_opt {
        Some(id) => match get_user(&id) {
            Ok(user) => user.user_id,
            Err(_) => -1,
        },
        None => -1,
    };

    let current_profile_opt = sqlx::query_as::<_, FitnessProfileResponse>("SELECT * FROM fitness_profiles").bind(user_id).fetch_optional(pool.get_ref()).await;

    let update_result = if let Ok(Some(current_profile)) = current_profile_opt {
        println!("Existing user profile {:#?}", current_profile);
        println!("Updated existing user profile");
        sqlx::query!("UPDATE fitness_profiles SET profile_data = $1 WHERE user_id = $2",
            updated_profile.program_data,user_id)
            .execute(pool.get_ref())
            .await
    } else {
        println!("Created new user profile");
        sqlx::query!("INSERT INTO fitness_profiles (user_id, profile_data) VALUES ($1, $2)",
            user_id, updated_profile.program_data)
            .execute(pool.get_ref())
            .await
        
    };

    // Update the fitness_programs table

    match update_result {
                Ok(_) => {
                    println!("Program updated successfully");
                    HttpResponse::Ok().json(ApiResponse {
                    data: Some("Program updated successfully".to_string()),
                    error: None,
                })}
                ,
                Err(err) => {
                    println!("Failed to update program");
                    HttpResponse::InternalServerError().json(ApiResponse::<String> {
                    data: None,
                    error: Some(format!("Error updating program: {}", err)),
                })},
            }
}
