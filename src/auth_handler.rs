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
}

// we need the same data
// simple aliasing makes the intentions clear and its more readable
pub type LoggedUser = User;

impl FromRequest for LoggedUser {
    type Error = Error;
    type Future = Ready<Result<User, Error>>;

    fn from_request(req: &HttpRequest, pl: &mut Payload) -> Self::Future {
        match Identity::from_request(req, pl).into_inner() {
            Ok(identity) => {
                match identity.id() {
                    Ok(user_json_str) => {
                        match serde_json::from_str::<User>(&user_json_str) {
                            Ok(user) => ready(Ok(user)),
                            Err(e) => {
                                eprintln!("Error deserializing user from identity: {:?}", e);
                                ready(Err(ServiceError::Unauthorized.into()))
                            }
                        }
                    },
                    Err(e) => {
                        eprintln!("Error fetching ID from identity: {:?}", e);
                        ready(Err(ServiceError::Unauthorized.into()))
                    }
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
    auth_data: web::Json<AuthData>,
    pool: web::Data<Pool>,
) -> Result<HttpResponse, actix_web::Error> {
    let user = web::block(move || query(auth_data.into_inner(), pool)).await??;

    //let user_string = user.user_id.to_string();
    let user = serde_json::to_string(&user).unwrap();
    Identity::login(&req.extensions(), user).unwrap();

    Ok(HttpResponse::Ok().finish())
}

pub async fn get_me(user: Option<Identity>, logged_user: LoggedUser) -> HttpResponse {
    HttpResponse::Ok().json(logged_user)
}
/// Diesel query for authentication
fn query(auth_data: AuthData, pool: web::Data<Pool>) -> Result<User, ServiceError> {
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