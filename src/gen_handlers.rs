use crate::utils::verify;
use crate::{
    errors::ServiceError,
    models::{FitnessProfile, NewGeneratedText, NewUserProfile, User},
};
use actix_identity::Identity;
use actix_web::{web, Error as ActixError, HttpResponse};
use anyhow::Result as AnyResult;
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Serialize)]
struct ApiResponse<T> {
    data: Option<T>,
    error: Option<String>,
}

use std::collections::HashMap;

use sqlx::FromRow;
#[derive(FromRow)]
pub struct FitnessProgramResponse {
    id: i32,
    fitness_program: Json<FitnessProgram>,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct FitnessProgram {
    macrocycles: HashMap<String, Mesocycle>, // Structure similar to mesocycle
}

#[derive(Serialize, Deserialize, Debug)]
struct Mesocycle {
    weeks: HashMap<String, Week>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Week {
    days: Vec<Day>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Day {
    rest_day: Option<bool>,
    exercises: Option<HashMap<String, Exercise>>,
    notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Exercise {
    name: String,
    sets: i32,
    rep_range_min: Option<i32>,
    rep_range_max: Option<i32>,
    rpe: Option<String>,      // Optional
    duration: Option<String>, // Optional
    notes: Option<String>,    // Optional
}

impl FitnessProgram {
    pub fn to_user_friendly_string(&self) -> String {
        let mut output = String::new();

        for (mesocycle_name, mesocycle) in &self.macrocycles {
            output.push_str(&format!("mesocycle: {}\n", mesocycle_name));
            for (week_name, week) in &mesocycle.weeks {
                output.push_str(&format!("  Week: {}\n", week_name));
                for (i, day) in week.days.iter().enumerate() {
                    if day.rest_day.unwrap_or(false) {
                        output.push_str(&format!("    Day {}: Rest Day\n", i));
                    } else {
                        output.push_str(&format!("    Day {}:\n", i));
                        if let Some(exercises) = &day.exercises {
                            for (_exercise_name, exercise) in exercises {
                                output.push_str(&format!("      Exercise: {}\n", exercise.name));
                                output.push_str(&format!("        Sets: {}\n", exercise.sets));
                                if let (Some(min), Some(max)) =
                                    (exercise.rep_range_min, exercise.rep_range_max)
                                {
                                    output.push_str(&format!("        Reps: {}-{}\n", min, max));
                                }
                                if let Some(rpe) = &exercise.rpe {
                                    output.push_str(&format!("        RPE: {}\n", rpe));
                                }
                                if let Some(duration) = &exercise.duration {
                                    output.push_str(&format!("        Duration: {}\n", duration));
                                }
                                if let Some(notes) = &exercise.notes {
                                    output.push_str(&format!("        Notes: {}\n", notes));
                                }
                            }
                        }
                    }
                }
            }
        }

        output
    }

    fn from_week(week: Week) -> FitnessProgram {
        // Create an empty mesocycle
        let mut mesocycle = Mesocycle {
            weeks: HashMap::new(),
        };

        // Insert the provided week into the mesocycle
        // Assuming a naming convention for the week, e.g., "Week 1"
        mesocycle.weeks.insert("Week 01".to_string(), week);

        // Create a macrocycle with the single mesocycle
        let mut macrocycle = HashMap::new();
        macrocycle.insert("Mesocycle 01".to_string(), mesocycle);

        // Construct and return the FitnessProgram
        FitnessProgram {
            macrocycles: macrocycle,
        }
    }
}

fn get_user(identity: &Identity) -> AnyResult<User> {
    match identity.id() {
        Ok(user_json_str) => serde_json::from_str::<User>(&user_json_str).map_err(|e| {
            eprintln!("Error deserializing user from identity: {:?}", e);
            anyhow::Error::msg(format!("Deserialization error: {}", e))
        }),
        Err(e) => {
            eprintln!("Error fetching ID from identity: {:?}", e);
            Err(anyhow::Error::msg(format!("Identity error: {}", e)))
        }
    }
}

pub async fn get_user_profile(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    user_email: web::Path<String>,
) -> HttpResponse {
    println!("Getting user profile");

    let user_id = match identity_opt {
        Some(id) => match get_user(&id) {
            Ok(user) => user.user_id,
            Err(_) => -1,
        },
        None => -1,
    };

    let user_profile = sqlx::query_as::<_, FitnessProfile>(
        "SELECT * FROM fitness_profile INNER JOIN users ON users.user_id = fitness_profile.user_id WHERE users.user_id = $1"
    )
    .bind(user_id)
    .fetch_one(pool.get_ref())
    .await;

    match user_profile {
        Ok(profile) => HttpResponse::Ok().json(ApiResponse {
            data: Some(profile),
            error: None,
        }),
        Err(err) => {
            println!("User profile not found with error {}, returning default", err);
            let profile = FitnessProfile {
                id: -1,
                user_id: None,
                name: "TestUser".to_string(),
                age: 20,
                height: 6.,
                height_unit: "ft".to_string(),
                weight: 180.,
                weight_unit: "lbs".to_string(),
                gender: "male".to_string(),
                years_trained: 2,
                fitness_level: "beginner".to_string(),
                injuries: "None".to_string(),
                fitness_goal: "Get Stronger".to_string(),
                target_timeframe: "None".to_string(),
                challenges: "None".to_string(),
                exercise_blacklist: None,
                frequency: 5,
                days_cant_train: None,
                preferred_workout_duration: 50,
                gym_or_home: "Gym".to_string(),
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

pub async fn save_user_profile(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    user_email: web::Path<String>,
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

    // Update the fitness_programs table
    let update_result = sqlx::query!("UPDATE fitness_programs SET program_data = $1 WHERE user_id = $2",                updated_profile.program_data,user_id)
            .execute(pool.get_ref())
            .await;

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

use openai_api_rust::chat::*;
use openai_api_rust::*;
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct Prompt {
    pub prompt: String,
}

pub async fn generate(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    msg: web::Json<Prompt>,
) -> Result<HttpResponse, ActixError> {
    println!("In Chat with message: {:?}", msg);

    let auth = Auth::from_env().unwrap();
    let openai = OpenAI::new(auth, "https://api.openai.com/v1/");

    // Initialize the complete response as an empty string
    let mut complete_response = Week { days: Vec::new() };

    // List to store messages for API
    let mut messages_for_api: Vec<Message> = Vec::new();

    // Add the system message outside the loop, as it's always the same
    let sys_message = Message {
        role: Role::System,
        content: "You are an expert fitness program builder. You generate a weeks worth of workouts a single day at a time in json format. It's essential that you do not repeat information as your responses will be concatenated. Ensure that the plan adheres to the user's profile. Each day of the program should be complete and comprehensive.".to_string(),
    };
    messages_for_api.push(sys_message);
    // Add the system message outside the loop, as it's always the same
    let sys_message = Message {
        role: Role::System,
        content: "
            \"rest_day\": [true or false]
            \"exercises\": {{
                \"exercise[#]\": {{
                    \"name\": \"{{exercise1_name}}\",
                    \"sets\": {{exercise1_sets}},
                    \"rep_range_min\": {{exercise1_rep_range_min}} // Optional
                    \"rep_range_max\": {{exercise1_rep_range_max}} // Optional
                    \"rpe\": {{rpe}}, // Optional
                    \"duration\": {{duration}}, // Optional
                    \"notes\": \"{{notes}}\", // Optional
                }},
                ...
            }}
            \"notes\" : \"{{notes}}, // Optional
        "
        .to_string(),
    };
    messages_for_api.push(sys_message);

    // Add the user message, which will be constant throughout all iterations
    messages_for_api.push(Message {
        role: Role::User,
        content: msg.prompt.clone(),
    });

    // Define how many days we want to generate
    let total_days = 7; // Or extract from user input or another variable

    for day_num in 1..=total_days {
        // Constructing a new system message for each day

        let body = ChatBody {
            model: "gpt-4-1106-preview".to_string(),
            max_tokens: None,
            temperature: Some(0.9_f32),
            top_p: None,
            n: Some(1),
            stream: Some(false),
            stop: None,
            presence_penalty: None,
            frequency_penalty: None,
            logit_bias: None,
            user: None,
            messages: messages_for_api.clone(),
            response_format: Some(ResponseFormat {
                type_field: "json_object".to_string(),
            }),
        };

        let mut retries = 0;
        const MAX_RETRIES: usize = 5; // Set this to your preferred number of retries
        loop {
            match openai.chat_completion_create(&body) {
                Ok(response) => {
                    let message = response
                        .choices
                        .get(0)
                        .and_then(|choice| choice.message.as_ref())
                        .ok_or_else(|| {
                            eprintln!("Unexpected response format from OpenAI for day {}", day_num);
                            HttpResponse::InternalServerError().json(format!(
                                "Unexpected response from OpenAI for day {}",
                                day_num
                            ))
                        })
                        .unwrap();

                    println!("Day {}: {:?}", day_num, message);

                    // Add this day's response to messages_for_api so it will be included in next iteration's prompt
                    messages_for_api.push(Message {
                        role: Role::Assistant,
                        content: message.content.clone(),
                    });

                    complete_response
                        .days
                        .push(serde_json::from_str(message.content.as_str()).unwrap());

                    // ... Save each day's response in your database if needed ...
                    break;
                }
                Err(e) => {
                    eprintln!("Error for day {}: {:?}", day_num, e);

                    retries += 1;
                    if retries <= MAX_RETRIES {
                        sleep(Duration::from_secs(30)).await;
                        continue;
                    } else {
                        return Ok(HttpResponse::InternalServerError().json(format!(
                            "Failed to communicate with OpenAI for day {} after {} retries",
                            day_num, MAX_RETRIES
                        )));
                    }
                }
            }
        }
    }

    let user_id = match identity_opt {
        Some(id) => match get_user(&id) {
            Ok(user) => user.user_id,
            Err(_) => -1,
        },
        None => -1,
    };
    let program_from_string: FitnessProgram = FitnessProgram::from_week(complete_response);

    sqlx::query("INSERT INTO fitness_programs (user_id, program_data) VALUES ($1, $2)")
        .bind(&user_id)
        .bind(
            serde_json::from_str::<Json<FitnessProgram>>(
                serde_json::to_string(&program_from_string)
                    .unwrap()
                    .as_str(),
            )
            .unwrap(),
        )
        .execute(pool.get_ref())
        .await
        .map_err(|err| {
            eprintln!("Error during program insertion: {:?}", err);
            println!("eprintln should have output something directly above");
            ServiceError::InternalServerError
        })?;

    //diesel::insert_into(generated_text::table)
    //    .values(&new_entry)
    //    .execute(&mut *conn)
    //    .map_err(|e| {
    //        eprintln!("Error saving generated text: {:?}", e);
    //        HttpResponse::InternalServerError().json("Failed to save generated text")
    //    })
    //    .unwrap();

    Ok(HttpResponse::Ok().body(program_from_string.to_user_friendly_string()))
}
#[derive(Serialize, Deserialize, Debug)]
struct Response {
    id: i32,
    response: String,
}
#[derive(Deserialize)]
pub struct Info {
    id: i32,
}
pub async fn get_responses(
    user: Option<Identity>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, ActixError> {
    println!("Running get responses route");
    if let Some(identity) = user {
        if let Ok(user) = get_user(&identity) {
            let responses: Vec<Response> = sqlx::query_as::<_, FitnessProgramResponse>(
                "SELECT id, program_data as fitness_program FROM fitness_programs WHERE user_id = $1",
            )
            .bind(user.user_id)
            .fetch_all(pool.get_ref())
            .await
            .map_err(|err| {
                eprintln!("Error during program retreval: {:?}", err);
                ServiceError::InternalServerError
            })?
            .iter()
            .map(|fitness_program_response| {
                Response { 
                    response: fitness_program_response.fitness_program.to_user_friendly_string(),
                    id: fitness_program_response.id,
                }
            })
            .collect();

            println!(
                "Responses from database {:#?} with user id {}",
                responses, user.user_id
            );
            Ok(HttpResponse::Ok().json(responses))
        } else {
            Ok(HttpResponse::Unauthorized().json("User not logged in"))
        }
    } else {
        Ok(HttpResponse::Unauthorized().json("User not logged in"))
    }
}

pub async fn delete_response(
    path: web::Path<Info>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, ActixError> {
    let result = sqlx::query!("DELETE FROM fitness_programs WHERE id = $1", path.id)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().finish()),
        Err(err) => {
            eprintln!("Error deleting response: {:?}", err);
            Ok(HttpResponse::InternalServerError().json("Error deleting response"))
        }
    }
}
