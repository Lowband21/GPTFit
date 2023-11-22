use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;

// SQLx model definitions

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct NewUserProfile {
    pub program_data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub user_id: i32,
    pub email: String,
    pub hash: String,
    pub created_at: chrono::NaiveDateTime,
}

impl User {
    pub fn _from_details<S: Into<String>, T: Into<String>>(email: S, pwd: T) -> Self {
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
    pub target_timeframe: Option<i32>,
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FitnessProgram {
    pub macrocycle: HashMap<String, Mesocycle>, // Structure similar to mesocycle
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Mesocycle {
    pub weeks: Option<HashMap<String, Week>>,
    pub goals: Option<Vec<TrainingFocus>>,
    pub exercises: Option<Exercises>,
    pub periodization_model: Option<PeriodizationModel>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TrainingFocus {
    Strength,
    Power,
    Endurance,
    FatLoss,
    Hypertrophy,
    Skill,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    LowerBack,
    Core,
    Obliques,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum PeriodizationModel {
    Linear,
    Undulating,
    Block,
    Conjugate,
    Polarized,
    ReverseLinear,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Exercises {
    exercises: Vec<Exercise>,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct MuscleGroups(Vec<MuscleGroup>);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Exercise {
    name: String,
    equipment_type: EquipmentType,
    muscle_groups: Vec<MuscleGroup>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Week {
    pub days: Vec<Day>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Day {
    rest_day: Option<bool>,
    exercises: Option<HashMap<String, ProgrammedExercise>>,
    notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProgrammedExercise {
    name: String,
    sets: Option<i32>,
    rep_range_min: Option<i32>,
    rep_range_max: Option<i32>,
    rpe: Option<f32>,         // Optional
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
                let goals_str = goals
                    .iter()
                    .map(|g| format!("{:?}", g))
                    .collect::<Vec<_>>()
                    .join(", ");
                output.push_str(&format!("  Goals: {}\n", goals_str));
            }
            if let Some(exercises) = &mesocycle.exercises {
                // Handle mesocycle-level exercises
                for exercise in &exercises.exercises {
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
                            output.push_str(&format!("      Day {}: Rest Day\n", i + 1));
                        } else {
                            output.push_str(&format!("      Day {}:\n", i));
                            if let Some(exercises) = &day.exercises {
                                for (_exercise_name, exercise) in exercises {
                                    output.push_str(&format!(
                                        "        Exercise: {}\n",
                                        exercise.name
                                    ));
                                    if let Some(sets) = exercise.sets {
                                        output.push_str(&format!("          Sets: {}\n", sets));
                                    }
                                    if let (Some(min), Some(max)) =
                                        (exercise.rep_range_min, exercise.rep_range_max)
                                    {
                                        output.push_str(&format!(
                                            "          Reps: {}-{}\n",
                                            min, max
                                        ));
                                    }
                                    if let Some(rpe) = &exercise.rpe {
                                        output.push_str(&format!("          RPE: {}\n", rpe));
                                    }
                                    if let Some(duration) = &exercise.duration {
                                        output.push_str(&format!(
                                            "          Duration: {}\n",
                                            duration
                                        ));
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

    pub fn from_meso(meso: Mesocycle) -> FitnessProgram {
        let mut macrocycle = HashMap::new();
        macrocycle.insert("01".to_string(), meso);

        FitnessProgram { macrocycle }
    }

    pub fn _from_week(week: Week) -> FitnessProgram {
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
        FitnessProgram { macrocycle }
    }
}

#[derive(Deserialize)]
pub struct Info {
    pub id: i32,
}
