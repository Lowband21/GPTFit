// @generated automatically by Diesel CLI.

diesel::table! {
    fitness_profile (id) {
        id -> Int4,
        user_id -> Nullable<Int4>,
        name -> Text,
        age -> Int4,
        height -> Float4,
        height_unit -> Text,
        weight -> Float4,
        weight_unit -> Text,
        gender -> Text,
        years_trained -> Int4,
        fitness_level -> Text,
        injuries -> Text,
        fitness_goal -> Text,
        target_timeframe -> Text,
        challenges -> Text,
        exercise_blacklist -> Nullable<Jsonb>,
        frequency -> Int4,
        days_cant_train -> Nullable<Jsonb>,
        preferred_workout_duration -> Int4,
        gym_or_home -> Text,
        favorite_exercises -> Nullable<Jsonb>,
        equipment -> Nullable<Jsonb>,
    }
}

diesel::table! {
    generated_text (id) {
        id -> Int4,
        prompt -> Text,
        response -> Text,
        user_id -> Nullable<Int4>,
    }
}

diesel::table! {
    users (user_id) {
        user_id -> Int4,
        email -> Text,
        hash -> Text,
        created_at -> Timestamp,
    }
}

diesel::joinable!(fitness_profile -> users (user_id));
diesel::joinable!(generated_text -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(fitness_profile, generated_text, users,);
