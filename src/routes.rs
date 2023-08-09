use actix_web::{HttpResponse, web, Responder, Error as ActixError, HttpRequest, post, HttpMessage};

use crate::DbPool;

use actix_web::Error;

use openai_api_rust::*;
use openai_api_rust::chat::*;
use actix_web::http::StatusCode;
use actix_web::{App, HttpServer, middleware};
use actix_identity::{Identity};
use sqlx::PgPool;
use serde::{Deserialize, Serialize};
use openai_api_rust::*;
use openai_api_rust::chat::*;

use crate::{
    errors::ServiceError,
    models::{Invitation, Pool, SlimUser, User},
    utils::hash_password,
};

use crate::invitation_handler;
use crate::auth_handler;
use crate::register_handler;

pub fn init_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
    web::scope("/api")
        .service(
            web::resource("/invitation")
                .route(web::post().to(invitation_handler::post_invitation)),
        )
        .service(
            web::resource("/register_user")
                .route(web::post().to(register_handler::register_user)),
        )
        .service(
            web::resource("/auth")
                .route(web::post().to(auth_handler::login))
                .route(web::delete().to(auth_handler::logout))
                .route(web::get().to(auth_handler::get_me)),
        ),
    );
}