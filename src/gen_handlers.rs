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
#[derive(FromRow, Debug)]
pub struct FitnessProfileResponse {
    id: i32,
    user_id: i32,
    profile_data: Json<FitnessProfile>,
}
#[derive(FromRow)]
pub struct FitnessProgramResponse {
    id: i32,
    fitness_program: Json<FitnessProgram>,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct FitnessProgram {
    macrocycle: HashMap<String, Mesocycle>, // Structure similar to mesocycle
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Mesocycle {
    weeks: Option<HashMap<String, Week>>,
    goals: Option<Vec<TrainingFocus>>,
    exercises: Option<Exercises>,
    periodization_model: Option<PeriodizationModel>,
    notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum TrainingFocus {
    Strength,
    Power,
    Endurance,
    FatLoss,
    Hypertrophy,
    Skill,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum EquipmentType {
    Barbell,
    Dumbbell,
    Machine,
    WeightedBodyweight,
    AssistedBodyweight,
    RepsOnly,
    Cardio,
    Duration,
    Cable,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum MuscleGroup {
    Back,
    Abs,
    Traps,
    Triceps,
    Forearms,
    Calves,
    FrontDelts,
    Glutes,
    Chest,
    Biceps,
    Quads,
    Hamstrings,
    SideDelts,
    RearDelts,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum PeriodizationModel {
    Linear,
    Undulating,
    Block,
    Conjugate,
    Polarized,
    ReverseLinear,
}

#[derive(Debug, Serialize, Deserialize)]
struct Exercises(Vec<Exercise>);
#[derive(Debug, Serialize, Deserialize)]
struct MuscleGroups(Vec<MuscleGroup>);

#[derive(Debug, Serialize, Deserialize)]
pub struct Exercise {
    name: String,
    equipment_type: EquipmentType,
    muscle_groups: Vec<MuscleGroup>,
}


#[derive(Serialize, Deserialize, Debug)]
struct Week {
    days: Vec<Day>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Day {
    rest_day: Option<bool>,
    exercises: Option<HashMap<String, ProgrammedExercise>>,
    notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ProgrammedExercise {
    name: String,
    sets: i32,
    rep_range_min: Option<i32>,
    rep_range_max: Option<i32>,
    rpe: Option<i32>,      // Optional
    duration: Option<String>, // Optional
    notes: Option<String>,    // Optional
}

impl FitnessProgram {
    pub fn to_user_friendly_string(&self) -> String {
        let mut output = String::new();

        for (mesocycle_name, mesocycle) in &self.macrocycle {
            output.push_str(&format!("Mesocycle: {}\n", mesocycle_name));
            
            // Add mesocycle goals, exercises, periodization model, and notes if available
            if let Some(goals) = &mesocycle.goals {
                let goals_str = goals.iter().map(|g| format!("{:?}", g)).collect::<Vec<_>>().join(", ");
                output.push_str(&format!("  Goals: {}\n", goals_str));
            }
            if let Some(exercises) = &mesocycle.exercises {
                // Handle mesocycle-level exercises
                for exercise in &exercises.0 {
                    output.push_str(&format!("  Exercise: {}\n", exercise.name));
                }
            }
            if let Some(model) = &mesocycle.periodization_model {
                output.push_str(&format!("  Periodization Model: {:?}\n", model));
            }
            if let Some(notes) = &mesocycle.notes {
                output.push_str(&format!("  Notes: {}\n", notes));
            }

            if let Some(weeks) = &mesocycle.weeks {
                for (week_name, week) in weeks {
                    output.push_str(&format!("    Week: {}\n", week_name));
                    for (i, day) in week.days.iter().enumerate() {
                        if day.rest_day.unwrap_or(false) {
                            output.push_str(&format!("      Day {}: Rest Day\n", i));
                        } else {
                            output.push_str(&format!("      Day {}:\n", i));
                            if let Some(exercises) = &day.exercises {
                                for (_exercise_name, exercise) in exercises {
                                    output.push_str(&format!("        Exercise: {}\n", exercise.name));
                                    output.push_str(&format!("          Sets: {}\n", exercise.sets));
                                    if let (Some(min), Some(max)) =
                                        (exercise.rep_range_min, exercise.rep_range_max)
                                    {
                                        output.push_str(&format!("          Reps: {}-{}\n", min, max));
                                    }
                                    if let Some(rpe) = &exercise.rpe {
                                        output.push_str(&format!("          RPE: {}\n", rpe));
                                    }
                                    if let Some(duration) = &exercise.duration {
                                        output.push_str(&format!("          Duration: {}\n", duration));
                                    }
                                    if let Some(notes) = &exercise.notes {
                                        output.push_str(&format!("          Notes: {}\n", notes));
                                    }
                                }
                            }
                        }
                        if let Some(notes) = &day.notes {
                            output.push_str(&format!("        Notes: {}\n", notes));
                        }
                    }
                }
            }
        }

        output
    }

    fn from_meso(meso: Mesocycle) -> FitnessProgram {
        let mut macrocycle = HashMap::new();
        macrocycle.insert("01".to_string(), meso);

        FitnessProgram {
            macrocycle
        }
    }

    fn from_week(week: Week) -> FitnessProgram {
        // Create an empty mesocycle
        let mut mesocycle = Mesocycle {
            weeks: None,
            goals: None,
            periodization_model: None,
            exercises: None,
            notes: None,
        };

        // Insert the provided week into the mesocycle
        // Assuming a naming convention for the week, e.g., "Week 1"
        let mut weeks = HashMap::new();
        weeks.insert("01".to_string(), week);
        mesocycle.weeks = Some(weeks);

        // Create a macrocycle with the single mesocycle
        let mut macrocycle = HashMap::new();
        macrocycle.insert("Mesocycle 01".to_string(), mesocycle);

        // Construct and return the FitnessProgram
        FitnessProgram {
            macrocycle: macrocycle,
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
            profile
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

use openai_api_rust::chat::*;
use openai_api_rust::*;
use openai_api_rust::completions::Completion;
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct Prompt {
    pub prompt: String,
}

fn create_chat_body(messages: Vec<Message>) -> ChatBody {
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
        content: "You are an AI generating a summary for a fitness mesocycle. Please provide goals, every exercise to be performed during the meso, periodization model, and notes in the following JSON format. Ensure you generate enough exercises to program an entire mesocycle".to_string(),
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

fn create_user_message(prompt: &Prompt) -> Message {
    Message {
        role: Role::User,
        content: prompt.prompt.clone(),
    }
}

fn parse_mesocycle_from_response(response: Completion) -> Mesocycle {
    // Assuming the response is in a compatible JSON format
    serde_json::from_str(response.choices.get(0)
        .and_then(|choice| choice.message.as_ref())
        .expect("Invalid response format")
        .content.as_str())
        .expect("Error parsing JSON to Mesocycle")
}

fn parse_exercises_from_response(response: Completion) -> Vec<Exercise> {
    // Parsing the exercise list from the response
    serde_json::from_str(response.choices.get(0)
        .and_then(|choice| choice.message.as_ref())
        .expect("Invalid response format")
        .content.as_str())
        .expect("Error parsing JSON to Exercise list")
}

fn create_system_messages_for_exercise_generation(meso: &Mesocycle) -> Vec<Message> {
    let mut messages: Vec<Message> = vec![];
    let intro_message = Message {
        role: Role::System,
        content: "Generate a list of exercises for a fitness mesocycle, including equipment type and muscle groups.".to_string(),
    };
    let meso_message = Message {
        role: Role::System,
        content: format!("The following are the decisions made about the mesocycle so far: {:#?}", meso),
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
            Back, Abs, Traps, Triceps, Forearms, Calves, FrontDelts, Glutes, Chest, Biceps, Quads, Hamstrings, SideDelts, RearDelts.
            Each muscle group should be targeted appropriately based on the exercise and equipment.
            "#
            .to_string()
    };
    let format_message = Message {
        role: Role::System,
        content: r#"
            "exercises": [
              {  // Exercise index, can be replaced with any unique identifier
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
            "#.to_string()
    };
    messages.push(intro_message);
    messages.push(meso_message);
    messages.push(options_message);
    messages.push(format_message);
    messages
}

pub fn generate_meso_summary(prompt: &Prompt, openai: &OpenAI) -> Mesocycle {
    let mut messages = create_system_messages_for_meso_summary();
    let user_message = create_user_message(prompt);
    messages.push(user_message);

    let body = create_chat_body(messages);

    let response = openai.chat_completion_create(&body).expect("Error handling is needed here");
    let mut meso = parse_mesocycle_from_response(response);
    meso.exercises = Some(Exercises(generate_exercises(prompt, openai, &meso)));
    meso
}
pub fn generate_exercises(prompt: &Prompt, openai: &OpenAI, meso: &Mesocycle) -> Vec<Exercise> {
    let mut messages = create_system_messages_for_exercise_generation(meso);
    let user_message = create_user_message(prompt);
    messages.push(user_message);
    let body = create_chat_body(messages);

    let response = openai.chat_completion_create(&body).expect("Error handling is needed here");
    parse_exercises_from_response(response)
}


pub async fn generate(
    identity_opt: Option<Identity>,
    pool: web::Data<PgPool>,
    msg: web::Json<Prompt>,
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

    let mut meso = generate_meso_summary(&msg.0, &openai);
    let profile = get_profile(user_id, pool.get_ref()).await;
    //let mut meso = Mesocycle{
    //    weeks: None,
    //    goals: None,
    //    exercises: None,
    //    periodization_model: None,
    //    notes: None,
    //};


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
        content: format!("These are the parameters of the Mesocycle: {:#?}",meso),
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

    let mut weeks = HashMap::new();

    let num_weeks = if profile.target_timeframe.unwrap_or(1) > 6{
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

    meso.weeks = Some(weeks);

    let program: FitnessProgram = FitnessProgram::from_meso(meso);
    println!("Generated program: {:#?}", program);

    sqlx::query("INSERT INTO fitness_programs (user_id, program_data) VALUES ($1, $2)")
        .bind(&user_id)
        .bind(
            serde_json::from_str::<Json<FitnessProgram>>(
                serde_json::to_string(&program)
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

    Ok(HttpResponse::Ok().body(program.to_user_friendly_string()))
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
            let mut responses: Vec<Response> = sqlx::query_as::<_, FitnessProgramResponse>(
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

            Ok(HttpResponse::Ok().json(responses.reverse()))
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
