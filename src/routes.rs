use actix_web::{
    post, web, Error as ActixError, HttpMessage, HttpRequest, HttpResponse, Responder,
};

use crate::DbPool;

use actix_web::Error;

use actix_identity::Identity;
use actix_web::http::StatusCode;
use actix_web::{middleware, App, HttpServer};
use openai_api_rust::chat::*;
use openai_api_rust::chat::*;
use openai_api_rust::*;
use openai_api_rust::*;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::{
    errors::ServiceError,
    models::{Pool, SlimUser, User},
    utils::hash_password,
};

use crate::auth_handler;
use crate::register_handler;
