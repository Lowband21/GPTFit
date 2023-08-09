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
    models::{Pool, SlimUser, User},
    utils::hash_password,
};

use crate::auth_handler;
use crate::register_handler;
