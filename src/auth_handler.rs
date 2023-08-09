use std::future::{ready, Ready};

use actix_identity::Identity;
use actix_web::{
    dev::Payload, web, Error, FromRequest, HttpMessage as _, HttpRequest, HttpResponse,
};
use diesel::prelude::*;
use serde::Deserialize;

use crate::{
    errors::ServiceError,
    models::{Pool, SlimUser, User},
    utils::verify,
};

#[derive(Debug, Deserialize)]
pub struct AuthData {
    pub email: String,
    pub password: String,
    pub csrfToken: String,
}

// we need the same data
// simple aliasing makes the intentions clear and its more readable
pub type LoggedUser = SlimUser;

impl FromRequest for LoggedUser {
    type Error = Error;
    type Future = Ready<Result<LoggedUser, Error>>;

    fn from_request(req: &HttpRequest, pl: &mut Payload) -> Self::Future {
        if let Ok(identity) = Identity::from_request(req, pl).into_inner() {
            if let Ok(user_json) = identity.id() {
                if let Ok(user) = serde_json::from_str(&user_json) {
                    return ready(Ok(user));
                }
            }
        }

        ready(Err(ServiceError::Unauthorized.into()))
    }
}

pub async fn logout(id: Identity) -> HttpResponse {
    id.logout();
    HttpResponse::NoContent().finish()
}

pub async fn login(
    req: HttpRequest,
    auth_data: web::Json<AuthData>,
    pool: web::Data<Pool>,
) -> Result<HttpResponse, actix_web::Error> {
    // Validate the CSRF token first
    if !validate_csrf_token(&auth_data.csrfToken) {
        return Err(actix_web::error::ErrorUnauthorized("Invalid CSRF Token"));
    }
    
    let user = web::block(move || query(auth_data.into_inner(), pool)).await??;

    let user_string = serde_json::to_string(&user).unwrap();
    Identity::login(&req.extensions(), user_string).unwrap();

    Ok(HttpResponse::Ok().finish())
}

// Placeholder function for CSRF token validation
fn validate_csrf_token(token: &str) -> bool {
    // Implement your actual CSRF token validation logic here
    true // Return true if the token is valid, false otherwise
}

pub async fn get_me(logged_user: LoggedUser) -> HttpResponse {
    HttpResponse::Ok().json(logged_user)
}
/// Diesel query for authentication
fn query(auth_data: AuthData, pool: web::Data<Pool>) -> Result<SlimUser, ServiceError> {
    use crate::schema::users::dsl::{email, users};

    let mut conn = pool.get().unwrap();

    let mut items = users
        .filter(email.eq(&auth_data.email))
        .load::<User>(&mut conn)?;

    if let Some(user) = items.pop() {
        if let Ok(matching) = verify(&user.hash, &auth_data.password) {
            if matching {
                return Ok(user.into());
            } else {
                return Err(ServiceError::BadRequest("Invalid password".into()));
            }
        }
    }
    
    Err(ServiceError::Unauthorized)
}

use actix_session::Session;
use uuid::Uuid;
use serde_json::json;

pub async fn get_csrf_token(session: Session) -> Result<HttpResponse, actix_web::Error> {
    // Generate a new UUID token
    let token = Uuid::new_v4().to_string();

    // Store this token in the user's session
    session.insert("csrf_token", &token)?;

    // Return the token in the response
    Ok(HttpResponse::Ok().json(json!({ "csrfToken": token })))
}
