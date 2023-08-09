// @generated automatically by Diesel CLI.

diesel::table! {
    users (email) {
        email -> Text,
        hash -> Text,
        created_at -> Timestamp,
    }
}
