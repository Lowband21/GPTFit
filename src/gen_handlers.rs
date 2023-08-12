
use actix_identity::Identity;
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
    models::{FitnessProfile, NewGeneratedText, NewUserProfile, User, FitnessProfileChangeset},
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

use serde_json;

fn get_user(identity: &Identity) -> anyhow::Result<User> {
    match identity.id() {
        Ok(user_json_str) => {
            serde_json::from_str::<User>(&user_json_str).map_err(|e| {
                eprintln!("Error deserializing user from identity: {:?}", e);
                anyhow::Error::msg(format!("Deserialization error: {}", e))
            })
        },
        Err(e) => {
            eprintln!("Error fetching ID from identity: {:?}", e);
            Err(anyhow::Error::msg(format!("Identity error: {}", e)))
        }
    }
}

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

    let new_profile = FitnessProfileChangeset {
        user_id: profile.user_id,
        name: Some(profile.name.clone()),
        age: Some(profile.age),
        height: Some(profile.height),
        height_unit: Some(profile.height_unit.clone()),
        weight: Some(profile.weight),
        weight_unit: Some(profile.weight_unit.clone()),
        gender: Some(profile.gender.clone()),
        years_trained: profile.years_trained,
        fitness_level: profile.fitness_level.clone(),
        injuries: profile.injuries.clone(),
        fitness_goal: profile.fitness_goal.clone(),
        target_timeframe: profile.target_timeframe.clone(),
        challenges: profile.challenges.clone(),
        exercise_blacklist: profile.exercise_blacklist.clone(),
        frequency: Some(profile.frequency),
        days_cant_train: profile.days_cant_train.clone(),
        preferred_workout_duration: Some(profile.preferred_workout_duration),
        gym_or_home: Some(profile.gym_or_home.clone()),
        favorite_exercises: profile.favorite_exercises.clone(),
        equipment: profile.equipment.clone(),
    };

    let existing_profile = fitness_profile::table
        .filter(fitness_profile::user_id.eq(user_id))
        .first::<FitnessProfile>(&mut *conn);

    match existing_profile {
        Ok(_) => {
            match diesel::update(fitness_profile::table.filter(fitness_profile::user_id.eq(user_id)))
                .set(&new_profile)
                .execute(&mut *conn)
            {
                Ok(_) => HttpResponse::Ok().json(ApiResponse {
                    data: Some(new_profile),
                    error: None,
                }),
                Err(err) => HttpResponse::InternalServerError().json(ApiResponse::<FitnessProfile> {
                    data: None,
                    error: Some(format!("An error occurred while updating: {}", err)),
                }),
            }
        }
        Err(_) => {
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
                    error: Some(format!("An error occurred while inserting: {}", err)),
                }),
            }
        }
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
    id: Option<Identity>,
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
        content: "You are an expert fitness program builder. You generate workouts day by day in json format. It's essential that you do not repeat information as your responses will be concatenated. Ensure that the plan adheres to the user's profile. Each day of the program should be complete and comprehensive.".to_string(),
    };
    messages_for_api.push(sys_message);
    // Add the system message outside the loop, as it's always the same
    let sys_message = Message {
        role: Role::System,
        content: "
        \"Day [#]\": {{
            \"rest_day\": [true or false]
            \"exercise[#]\": {{
                \"name\": \"{{exercise1_name}}\",
                \"sets\": \"{{exercise1_sets}}\",
                \"reps\": \"{{exercise1_reps}}\"
            }},
            ...
        }},
    }}
}}
        ".to_string()
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
            model: "gpt-4".to_string(),
            max_tokens: Some(300),
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
                            eprintln!(
                                "Unexpected response format from OpenAI for day {}",
                                day_num
                            );
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

                    complete_response.push_str(&("\n".to_string() + &message.content));

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

    let new_entry = match id {
        Some(id) => {
            match get_user(&id) {
                Ok(user) => {
                    // Save the complete response to your database
                    NewGeneratedText {
                        prompt: msg.prompt.clone(),
                        response: complete_response.clone(),
                        user_id: Some(user.user_id),
                    }
                },
                Err(_) => {
                    NewGeneratedText {
                        prompt: msg.prompt.clone(),
                        response: complete_response.clone(),
                        user_id: None,
                    }

                },
            }
        },
        None => {
            NewGeneratedText {
                prompt: msg.prompt.clone(),
                response: complete_response.clone(),
                user_id: None,
            }
            
        },
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
pub async fn get_responses(user: Option<Identity>, pool: web::Data<DbPool>) -> Result<HttpResponse, ActixError> {
    let mut conn = pool.get().unwrap();

    if let Some(user) = user {
        let user = get_user(&user).unwrap();
        println!("user_id: {}", user.user_id);

        let results = generated_text::table
            .filter(generated_text::user_id.eq(user.user_id))
            .load::<Response>(&mut *conn);

        match results {
            Ok(data) => Ok(HttpResponse::Ok().json(data)),
            Err(err) => {
                eprintln!("Error querying for responses: {:?}", err);
                Ok(HttpResponse::InternalServerError().json("Error querying for responses"))
            }
        }
    }else {
        Ok(HttpResponse::Unauthorized().json("User not logged in"))
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
