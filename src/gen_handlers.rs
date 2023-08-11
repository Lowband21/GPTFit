
use actix_web::{
    web, Error as ActixError,
    HttpResponse,
};
use diesel::prelude::*;
use serde::Deserialize;
use serde_derive::Serialize;

use super::schema::*;
use crate::{
    errors::ServiceError,
    models::{FitnessProfile, NewGeneratedText, NewUserProfile, User},
    schema::fitness_profile::all_columns,
    utils::verify,
    DbPool,
};

#[derive(Serialize)]
struct ApiResponse<T> {
    data: Option<T>,
    error: Option<String>,
}

use crate::schema::{fitness_profile, users};
use diesel::prelude::*;

pub async fn get_user_profile(
    pool: web::Data<DbPool>,
    user_email: web::Path<String>,
) -> HttpResponse {
    let mut conn = match pool.get() {
        Ok(connection) => connection,
        Err(_) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<FitnessProfile> {
                data: None,
                error: Some("Failed to get database connection".to_string()),
            })
        }
    };

    log::info!("Executing user profile query for email: {}", user_email);
    let user_profile = users::table
        .inner_join(
            fitness_profile::table.on(users::user_id.nullable().eq(fitness_profile::user_id)),
        )
        .filter(users::email.eq(&user_email.into_inner()))
        .select(all_columns)
        .first::<FitnessProfile>(&mut conn);

    match user_profile {
        Ok(profile) => HttpResponse::Ok().json(ApiResponse {
            data: Some(profile),
            error: None,
        }),
        Err(err) => {
            log::error!("Failed to fetch user profile. Detailed error: {:?}", err);
            HttpResponse::InternalServerError().json(ApiResponse::<FitnessProfile> {
                data: None,
                error: Some(format!("An error occurred: {}", err)),
            })
        }
    }
}

pub async fn save_user_profile(
    profile: web::Json<NewUserProfile>,
    pool: web::Data<DbPool>,
    user_email: web::Path<String>,
) -> HttpResponse {
    let mut conn = pool.get().unwrap();

    let user = users::table
        .filter(users::email.eq(user_email.into_inner()))
        .first::<User>(&mut *conn);

    if let Err(err) = user {
        return HttpResponse::InternalServerError().json(ApiResponse::<FitnessProfile> {
            data: None,
            error: Some(format!("User not found: {}", err)),
        });
    }

    let user_id = user.unwrap().user_id;

    let new_profile = FitnessProfile {
        id: user_id,
        user_id: Some(user_id),
        name: profile.name.clone(),
        age: profile.age,
        height: profile.height,
        height_unit: profile.height_unit.clone(),
        weight: profile.weight,
        weight_unit: profile.weight_unit.clone(),
        gender: profile.gender.clone(),
        years_trained: profile.years_trained,
        fitness_level: profile.fitness_level.clone(),
        injuries: profile.injuries.clone(),
        fitness_goal: profile.fitness_goal.clone(),
        target_timeframe: profile.target_timeframe.clone(),
        challenges: profile.challenges.clone(),
        exercise_blacklist: profile.exercise_blacklist.clone(),
        frequency: profile.frequency,
        days_cant_train: profile.days_cant_train.clone(),
        preferred_workout_duration: profile.preferred_workout_duration,
        gym_or_home: profile.gym_or_home.clone(),
        favorite_exercises: profile.favorite_exercises.clone(),
        equipment: profile.equipment.clone(),
    };

    match diesel::insert_into(fitness_profile::table)
        .values(&new_profile)
        .execute(&mut *conn)
    {
        Ok(_) => HttpResponse::Ok().json(ApiResponse {
            data: Some(new_profile),
            error: None,
        }),
        Err(err) => HttpResponse::InternalServerError().json(ApiResponse::<FitnessProfile> {
            data: None,
            error: Some(format!("An error occurred: {}", err)),
        }),
    }
}

use openai_api_rust::chat::*;
use openai_api_rust::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct Prompt {
    pub prompt: String,
}

pub async fn generate(
    pool: web::Data<DbPool>,
    msg: web::Json<Prompt>,
) -> Result<HttpResponse, ActixError> {
    println!("In Chat with message: {:?}", msg);

    let auth = Auth::from_env().unwrap();
    let openai = OpenAI::new(auth, "https://api.openai.com/v1/");

    // Initialize the complete response as an empty string
    let mut complete_response = String::new();

    // List to store messages for API
    let mut messages_for_api: Vec<Message> = Vec::new();

    // Add the system message outside the loop, as it's always the same
    let sys_message = Message {
        role: Role::System,
        content: "You are an expert fitness program builder.".to_string(),
    };
    messages_for_api.push(sys_message);

    // Add the user message, which will be constant throughout all iterations
    messages_for_api.push(Message {
        role: Role::User,
        content: msg.prompt.clone(),
    });

    // Define how many weeks (macrocycle durations) we want to generate
    let total_weeks = 4; // Or extract from user input or another variable

    for week_num in 1..=total_weeks {
        // Constructing a new system message for each week
        messages_for_api.push(Message {
            role: Role::System,
            content: format!(
                "Provide a detailed workout plan for Week {}: 
                === Week {} ===
                Day 1:
                - Exercise: {{exercise1_name}}
                ...
                Day 7:
                ...
                ",
                week_num, week_num
            ),
        });

        let body = ChatBody {
            model: "gpt-4".to_string(),
            max_tokens: Some(1000),
            temperature: Some(0.9_f32),
            top_p: Some(0.5_f32),
            n: Some(1),
            stream: Some(false),
            stop: None,
            presence_penalty: None,
            frequency_penalty: Some(0.5_f32),
            logit_bias: None,
            user: None,
            messages: messages_for_api.clone(),
        };

        match openai.chat_completion_create(&body) {
            Ok(response) => {
                let message = response
                    .choices
                    .get(0)
                    .and_then(|choice| choice.message.as_ref())
                    .ok_or_else(|| {
                        eprintln!(
                            "Unexpected response format from OpenAI for week {}",
                            week_num
                        );
                        HttpResponse::InternalServerError().json(format!(
                            "Unexpected response from OpenAI for week {}",
                            week_num
                        ))
                    })
                    .unwrap();

                println!("Week {}: {:?}", week_num, message);

                // Add this week's response to messages_for_api so it will be included in next iteration's prompt
                messages_for_api.push(Message {
                    role: Role::Assistant,
                    content: message.content.clone(),
                });

                complete_response.push_str(&("\n".to_string() + &message.content));

                // ... Save each week's response in your database if needed ...
            }
            Err(e) => {
                eprintln!("Error for week {}: {:?}", week_num, e);
                return Ok(HttpResponse::InternalServerError().json(format!(
                    "Failed to communicate with OpenAI for week {}",
                    week_num
                )));
            }
        }
    }

    // Save the complete response to your database
    let new_entry = NewGeneratedText {
        prompt: msg.prompt.clone(),
        response: complete_response.clone(),
        user_id: None,
    };

    let mut conn = pool
        .get()
        .map_err(|_| HttpResponse::InternalServerError().json("Failed to obtain DB connection"))
        .unwrap();

    diesel::insert_into(generated_text::table)
        .values(&new_entry)
        .execute(&mut *conn)
        .map_err(|e| {
            eprintln!("Error saving generated text: {:?}", e);
            HttpResponse::InternalServerError().json("Failed to save generated text")
        })
        .unwrap();

    Ok(HttpResponse::Ok().json(complete_response))
}
// This struct might be useful for deserializing the body or path info
#[derive(Deserialize)]
pub struct Info {
    id: i32,
}
// Assuming you have a struct like this for the database
#[derive(Queryable, Serialize)]
struct Response {
    id: i32,
    prompt: String,
    response: String,
    user_id: Option<i32>,
}
// Get all responses
pub async fn get_responses(pool: web::Data<DbPool>) -> Result<HttpResponse, ActixError> {
    let mut conn = pool.get().unwrap();

    let results = generated_text::table.load::<Response>(&mut *conn);

    match results {
        Ok(data) => Ok(HttpResponse::Ok().json(data)),
        Err(err) => {
            println!("Error querying for responses: {:?}", err);
            Ok(HttpResponse::InternalServerError().json("Error querying for responses"))
        }
    }
}

// Delete a specific response
pub async fn delete_response(
    path: web::Path<Info>,
    pool: web::Data<DbPool>,
) -> Result<HttpResponse, ActixError> {
    let mut conn = pool.get().unwrap();

    let count = diesel::delete(generated_text::table.find(path.id)).execute(&mut *conn);

    match count {
        Ok(_) => Ok(HttpResponse::Ok().finish()),
        Err(err) => {
            println!("Error deleting response: {:?}", err);
            Ok(HttpResponse::InternalServerError().json("Error deleting response"))
        }
    }
}
