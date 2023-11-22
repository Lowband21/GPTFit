use crate::{
    errors::ServiceError,
    models::{Exercises, FitnessProgram, Info, Mesocycle, User, Week},
};
use actix_identity::Identity;
use actix_web::{web, Error as ActixError, HttpResponse, Result};
use anyhow::Result as AnyResult;
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use sqlx::PgPool;
use std::collections::HashMap;

use crate::api_responses::*;
use crate::profile_handlers::*;
use sqlx::FromRow;

pub fn get_user(identity: &Identity) -> AnyResult<User> {
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

use openai_api_rust::chat::*;
use openai_api_rust::completions::Completion;
use openai_api_rust::*;
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct PromptWithId {
    pub id: i32,
    pub prompt: String,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct ProgramWithId {
    pub id: i32,
    pub program: FitnessProgram,
    pub prompt: String,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Prompt {
    pub prompt: String,
}

fn create_chat_body(messages: Vec<Message>) -> ChatBody {
    //let mut logit_bias = HashMap::new();
    //logit_bias.insert("5501".to_string(), "-100".to_string());
    //logit_bias.insert("4213".to_string(), "-100".to_string());
    //logit_bias.insert("14295".to_string(), "-100".to_string());
    //logit_bias.insert("747".to_string(), "-100".to_string());
    ChatBody {
        model: "gpt-4-1106-preview".to_string(), // Update the model as needed
        max_tokens: None,
        temperature: Some(0.7),
        top_p: None,
        n: Some(1),
        stream: Some(false),
        stop: None,
        presence_penalty: None,
        frequency_penalty: None,
        logit_bias: None,
        user: None,
        messages,
        response_format: Some(ResponseFormat {
            type_field: "json_object".to_string(),
        }),
    }
}

fn create_system_messages_for_meso_summary() -> Vec<Message> {
    let sys_message = Message {
        role: Role::System,
        content: "You are an AI generating a summary for a fitness mesocycle. Please provide goals, the periodization model, and notes in the following JSON format.".to_string(),
    };

    let mut messages_for_api: Vec<Message> = vec![sys_message];

    let sys_message = Message {
        role: Role::System,
        content: r#"
        Please consider the following details when formulating the json formatted program, do not include user information or outside braces, only select from the available options as these string types will be converted to enums:

        Goal Type:
            Strength,
            Power,
            Endurance,
            FatLoss,
            Hypertrophy,
            Skill,

        Periodization Model: This pertains to the overall approach or model of the training program. The models available are:
            Linear: A progressive increase in intensity with consistent exercise types.
            Undulating: Variations in intensity and volume within each week or session.
            Block: Dividing training into blocks, each with a specific focus.
            Conjugate: Combining different methods, like strength and speed work, in the same phase.
            Polarized: Balancing high-intensity workouts with low-intensity sessions.
            ReverseLinear: Decreasing intensity while increasing volume over time.
            "#
            .to_string()
    };
    messages_for_api.push(sys_message);

    let sys_message = Message {
        role: Role::System,
        content: r#"
            "goals": ["Strength", "Hypertrophy", "Endurance", ...], // Any combination of goal types
            "periodization_model": "Linear", // Your selection of periodization model
            "notes": "Focus on progressive overload and adequate recovery."           
        "#
        .to_string(),
    };
    messages_for_api.push(sys_message);

    messages_for_api
}

fn create_user_message(prompt: String) -> Message {
    Message {
        role: Role::User,
        content: prompt,
    }
}

fn parse_mesocycle_from_response(response: Completion) -> Mesocycle {
    // Assuming the response is in a compatible JSON format
    serde_json::from_str(
        response
            .choices
            .get(0)
            .and_then(|choice| choice.message.as_ref())
            .expect("Invalid response format")
            .content
            .as_str(),
    )
    .expect("Error parsing JSON to Mesocycle")
}

fn parse_exercises_from_response(response: Completion) -> Exercises {
    // Parsing the exercise list from the response
    serde_json::from_str(
        response
            .choices
            .get(0)
            .and_then(|choice| choice.message.as_ref())
            .expect("Invalid response format")
            .content
            .as_str(),
    )
    .expect("Error parsing JSON to Exercise list")
}

fn create_system_messages_for_exercise_generation(meso: &Mesocycle) -> Vec<Message> {
    let mut messages: Vec<Message> = vec![];
    let intro_message = Message {
        role: Role::System,
        content: "Generate a list of exercises for a fitness mesocycle, including equipment type and muscle groups. \
            Do not include the users information in your response.\
            Ensure you generate enough exercises to program an entire mesocycle.".to_string(),
    };
    let meso_message = Message {
        role: Role::System,
        content: format!("The following are the decisions made about the mesocycle so far, do not include any of this information in your response, but use it to inform your selection: {:#?}", meso),
    };
    let options_message = Message {
        role: Role::System,
        content: r#"
        Please consider the following details when formulating the json formatted exercise list, only select from the available options as these string types will be converted to enums:

        Equipment Type: This category defines the type of equipment used in exercises. The options include:
            Barbell: Standard barbell exercises.
            Dumbbell: Exercises using dumbbells.
            Machine: Exercises performed on resistance machines.
            WeightedBodyweight: Bodyweight exercises enhanced with additional weights.
            AssistedBodyweight: Bodyweight exercises with assistance, such as bands.
            RepsOnly: Exercises focusing solely on repetitions without additional equipment.
            Cardio: Cardiovascular exercises, like running or cycling.
            Duration: Exercises where the focus is on the duration rather than reps, such as planks.
            Cable: Exercises utilzing a cable machine

        Muscle Groups: These are the target muscle groups for each exercise. Options include:
            Back, Abs, Traps, Triceps, Forearms, Calves, FrontDelts, Glutes, Chest, Biceps, Quads, Hamstrings, SideDelts, RearDelts, LowerBack. // Select only from these options! Core and Obliques are both in the Abs category.
            Each muscle group should be targeted appropriately based on the exercise and equipment.
            "#
            .to_string()
    };
    let format_message = Message {
        role: Role::System,
        content: r#"
            Include these fields and only these fields: 
            "exercises": [ // Note that exercises is an array
              { 
                "name": "Bench Press",
                "equipment_type": "Barbell", // Only valid equipment types
                "muscle_groups": ["Chest", "Triceps"] // Only valid muscle groups
              },
              {
                "name": "Squat",
                "equipment_type": "Barbell",
                "muscle_groups": ["Quads", "Glutes"]
              }
              // ... Additional exercises ...
            ],
            "#
        .to_string(),
    };
    messages.push(intro_message);
    messages.push(meso_message);
    messages.push(options_message);
    messages.push(format_message);
    messages
}
#[derive(FromRow)]
pub struct Id {
    id: i32,
}

pub async fn generate_meso_summary(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    prompt: web::Json<Prompt>,
) -> Result<HttpResponse, ActixError> {
    let auth = Auth::from_env().unwrap();
    let openai = OpenAI::new(auth, "https://api.openai.com/v1/");

    let user_id = match identity_opt {
        Some(id) => match get_user(&id) {
            Ok(user) => user.user_id,
            Err(_) => -1,
        },
        None => -1,
    };

    let mut messages = create_system_messages_for_meso_summary();
    let user_message = create_user_message(prompt.0.prompt.clone());
    messages.push(user_message);

    let body = create_chat_body(messages);

    let response = openai
        .chat_completion_create(&body)
        .expect("Error handling is needed here");
    dbg!(
        response
            .choices
            .get(0)
            .unwrap()
            .message
            .clone()
            .unwrap()
            .content
    );
    let mut meso = parse_mesocycle_from_response(response);
    meso.exercises = Some(generate_exercises(&prompt.0, &openai, &meso));
    println!("Meso Summary: {:#?}", meso);
    let program = FitnessProgram::from_meso(meso);

    let id = sqlx::query_as::<_, Id>(
        "INSERT INTO fitness_programs (user_id, program_data) VALUES ($1, $2) RETURNING id",
    )
    .bind(user_id)
    .bind(
        serde_json::from_str::<Json<FitnessProgram>>(
            serde_json::to_string(&program).unwrap().as_str(),
        )
        .unwrap(),
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|err| {
        eprintln!("Error during program insertion: {:?}", err);
        println!("eprintln should have output something directly above");
        ServiceError::InternalServerError
    })?
    .id;
    println!("Json Converted Program: {:#?}", Json(program.clone()));
    let program_response = ProgramSummaryResponse {
        id,
        fitness_program: sqlx::types::Json(program),
    };
    Ok(HttpResponse::Ok().json(program_response))
}

pub async fn get_program(pool: &PgPool, id: i32, user_id: i32) -> FitnessProgram {
    sqlx::query_as::<_, FitnessProgramResponse>(
        "SELECT * FROM fitness_programs WHERE user_id = $1 AND id = $2",
    )
    .bind(user_id)
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|err| {
        eprintln!("Error during program retreval: {:?}", err);
        ServiceError::InternalServerError
    })
    .unwrap()
    .program_data
    .0
}
pub fn generate_exercises(prompt: &Prompt, openai: &OpenAI, meso: &Mesocycle) -> Exercises {
    let mut messages = create_system_messages_for_exercise_generation(meso);
    let user_message = create_user_message(prompt.prompt.clone());
    messages.push(user_message);
    let body = create_chat_body(messages);

    let response = openai
        .chat_completion_create(&body)
        .expect("Error handling is needed here");
    dbg!(
        response
            .choices
            .get(0)
            .unwrap()
            .message
            .clone()
            .unwrap()
            .content
    );
    parse_exercises_from_response(response)
}
pub async fn generate_exercises_route(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    msg: web::Json<ProgramWithId>,
) -> Result<HttpResponse, ActixError> {
    let auth = Auth::from_env().unwrap();
    let openai = OpenAI::new(auth, "https://api.openai.com/v1/");

    let meso = msg.0.program.macrocycle.get("01").unwrap();

    let mut messages = create_system_messages_for_exercise_generation(meso);
    let user_message = create_user_message(msg.prompt.clone());
    messages.push(user_message);
    let body = create_chat_body(messages);

    let response = openai
        .chat_completion_create(&body)
        .expect("Error handling is needed here");
    dbg!(
        response
            .choices
            .get(0)
            .unwrap()
            .message
            .clone()
            .unwrap()
            .content
    );
    Ok(HttpResponse::Ok().json(parse_exercises_from_response(response)))
}

pub async fn generate_weeks(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    msg: web::Json<ProgramWithId>,
) -> Result<HttpResponse, ActixError> {
    println!("In Chat with message: {:?}", msg);

    let auth = Auth::from_env().unwrap();
    let openai = OpenAI::new(auth, "https://api.openai.com/v1/");

    let user_id = match identity_opt {
        Some(id) => match get_user(&id) {
            Ok(user) => user.user_id,
            Err(_) => -1,
        },
        None => -1,
    };

    //let mut program = get_program(pool.get_ref(), msg.id, user_id).await;
    let mut program = msg.program.clone();
    let profile = get_profile(user_id, pool.get_ref()).await;

    // List to store messages for API
    let mut messages_for_api: Vec<Message> = Vec::new();

    // Add the system message outside the loop, as it's always the same
    let sys_message = Message {
        role: Role::System,
        content: "You are an expert fitness program builder. You generate a weeks worth of workouts a single day at a time in json format. It's essential that you do not repeat information as your responses will be concatenated. Ensure that the plan adheres to the user's profile. Each day of the program should be complete and comprehensive.".to_string(),
    };
    messages_for_api.push(sys_message);

    let sys_message = Message {
        role: Role::System,
        content: format!(
            "These are the parameters of the Mesocycle: {:#?}",
            program.macrocycle.get("01").unwrap()
        ),
    };
    messages_for_api.push(sys_message);

    // Add the system message outside the loop, as it's always the same
    let sys_message = Message {
        role: Role::System,
        content: "
            \"rest_day\": [true or false]
            \"exercises\": {{
                \"exercise[#]\": {{
                    \"name\": \"{{exercise1_name}}\", // Required String
                    \"sets\": {{exercise1_sets}}, // Required Integer
                    \"rep_range_min\": {{exercise1_rep_range_min}} // Optional Integer
                    \"rep_range_max\": {{exercise1_rep_range_max}} // Optional Integer
                    \"rpe\": {{rpe}}, // Optional Float
                    \"duration\": {{duration}}, // Optional String
                    \"notes\": \"{{notes}}\", // Optional String
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

    let mut weeks = HashMap::new();

    let num_weeks = if profile.target_timeframe.unwrap_or(1) > 6 {
        6
    } else {
        profile.target_timeframe.unwrap_or(1)
    };

    for week_num in 1..=num_weeks {
        // Define how many days we want to generate
        let total_days = 7; // Or extract from user input or another variable

        // Initialize the complete response as an empty string
        let mut week_response = Week { days: Vec::new() };

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

                        week_response
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
        weeks.insert(week_num.to_string(), week_response);
    }

    program.macrocycle.get_mut("01").unwrap().weeks = Some(weeks);

    println!("Generated program: {:#?}", program);

    sqlx::query("INSERT INTO fitness_programs (user_id, program_data) VALUES ($1, $2)")
        .bind(user_id)
        .bind(
            serde_json::from_str::<Json<FitnessProgram>>(
                serde_json::to_string(&program).unwrap().as_str(),
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

    Ok(HttpResponse::Ok().json(Response {
        id: msg.id,
        response: program.to_user_friendly_string(),
    }))
}
pub async fn get_responses(
    user: Option<Identity>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, ActixError> {
    println!("Running get responses route");
    if let Some(identity) = user {
        if let Ok(user) = get_user(&identity) {
            let mut responses: Vec<Response> = sqlx::query_as::<_, FitnessProgramResponse>(
                "SELECT * FROM fitness_programs WHERE user_id = $1",
            )
            .bind(user.user_id)
            .fetch_all(pool.get_ref())
            .await
            .map_err(|err| {
                eprintln!("Error during program retreval: {:?}", err);
                ServiceError::InternalServerError
            })?
            .iter()
            .map(|fitness_program_response| Response {
                response: fitness_program_response
                    .program_data
                    .to_user_friendly_string(),
                id: fitness_program_response.id,
            })
            .collect();

            println!(
                "Responses from database {:#?} with user id {}",
                responses, user.user_id
            );

            responses.reverse();

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
