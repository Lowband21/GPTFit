use actix_web::{web, Error as ActixError, HttpResponse};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{errors::ServiceError, models::User, utils::hash_password};

#[derive(Debug, Deserialize)]
pub struct UserData {
    pub username: String,
    pub password: String,
}

pub async fn register_user(
    user_data: web::Json<UserData>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, ActixError> {
    let user_data = user_data.into_inner();
    let username = user_data.username;
    let password = user_data.password;

    let user = query(username, password, pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(user))
}

async fn query(username: String, password: String, pool: &PgPool) -> Result<User, ServiceError> {
    let password_hash = hash_password(&password)?;

    // Check if user exists
    let user_result = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&username)
        .fetch_optional(pool)
        .await
        .unwrap();

    let user = match user_result {
        Some(user) => {
            println!("User already registered");
            user
        }
        None => {
            let user = User {
                user_id: Uuid::new_v4().to_u128_le() as i32,
                email: username,
                hash: password_hash,
                created_at: chrono::Local::now().naive_local(),
            };
            sqlx::query(
                "INSERT INTO users (user_id, email, hash, created_at) VALUES ($1, $2, $3, $4)",
            )
            .bind(&user.user_id)
            .bind(&user.email)
            .bind(&user.hash)
            .bind(&user.created_at)
            .execute(pool)
            .await
            .map_err(|err| {
                eprintln!("Error during user insertion: {:?}", err);
                ServiceError::InternalServerError
            })?;
            println!("Registered user");
            user
        }
    };
    Ok(user)
}
