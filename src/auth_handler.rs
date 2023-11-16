use std::future::{ready, Ready};

use actix_identity::Identity;
use actix_web::{
    dev::Payload, web, Error, FromRequest, HttpMessage as _, HttpRequest, HttpResponse,
};
use serde::Deserialize;
use sqlx::{PgPool};

use crate::{
    errors::ServiceError,
    models::{User},
    utils::verify,
};

#[derive(Debug, Deserialize)]
pub struct AuthData {
    pub email: String,
    pub password: String,
}

// we need the same data
// simple aliasing makes the intentions clear and its more readable
pub type LoggedUser = User;

impl FromRequest for LoggedUser {
    type Error = Error;
    type Future = Ready<Result<User, Error>>;

    fn from_request(req: &HttpRequest, pl: &mut Payload) -> Self::Future {
        match Identity::from_request(req, pl).into_inner() {
            Ok(identity) => match identity.id() {
                Ok(user_json_str) => match serde_json::from_str::<User>(&user_json_str) {
                    Ok(user) => ready(Ok(user)),
                    Err(e) => {
                        eprintln!("Error deserializing user from identity: {:?}", e);
                        ready(Err(ServiceError::Unauthorized.into()))
                    }
                },
                Err(e) => {
                    eprintln!("Error fetching ID from identity: {:?}", e);
                    ready(Err(ServiceError::Unauthorized.into()))
                }
            },
            Err(_) => {
                eprintln!("Failed to extract identity from request");
                ready(Err(ServiceError::Unauthorized.into()))
            }
        }
    }
}

pub async fn logout(id: Identity) -> HttpResponse {
    id.logout();
    HttpResponse::NoContent().finish()
}

pub async fn login(
    req: HttpRequest,
    login_data: web::Json<AuthData>,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse, ServiceError> {
    let login_data = login_data.into_inner();
    let email = login_data.email;
    let password = login_data.password;

    match validate_user(&email, &password, pool.get_ref()).await {
        Ok(user) => {
            Identity::login(&req.extensions(), serde_json::to_string(&user).unwrap()).unwrap();
            Ok(HttpResponse::Ok().json(user))
        }
        Err(e) => Err(e),
    }
}

async fn validate_user(
    username: &str,
    password: &str,
    pool: &PgPool,
) -> Result<User, ServiceError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(username)
        .fetch_optional(pool)
        .await
        .map_err(|_| ServiceError::InternalServerError)?
        .ok_or(ServiceError::BadRequest("User not found".into()))?;

    if verify(&user.hash, password)? {
        Ok(user)
    } else {
        Err(ServiceError::BadRequest("Invalid password".into()))
    }
}

pub async fn get_me(_user: Option<Identity>, logged_user: LoggedUser) -> HttpResponse {
    HttpResponse::Ok().json(logged_user)
}
