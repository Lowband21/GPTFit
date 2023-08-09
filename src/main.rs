use actix_web::{web, App, HttpServer, HttpResponse, HttpRequest};
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::PgConnection;
use std::env;
use dotenv::dotenv;
use actix_web::middleware::Logger;

use actix_web::cookie::Key;
use actix_identity::IdentityMiddleware;
use actix_session::{Session, SessionMiddleware, storage::RedisSessionStore};

mod models;
mod routes;
mod schema;
mod utils;
mod errors;
mod invitation_handler;
mod email_service;
mod auth_handler;
mod register_handler;

use crate::routes::*;

#[macro_use]
extern crate lazy_static;

type DbPool = Pool<ConnectionManager<PgConnection>>;

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    println!("Here");
    dotenv().ok();

    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let manager = ConnectionManager::<PgConnection>::new(database_url);
    let pool: DbPool = Pool::builder()
        .build(manager)
        .expect("Failed to create pool.");


    let redis_connection_string = std::env::var("REDIS_URL").unwrap_or_else(|_| String::from("127.0.0.1:6379"));
    let secret_key = Key::generate();
    let redis_store = RedisSessionStore::new("redis://127.0.0.1:6379")
        .await
        .unwrap();

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .wrap(IdentityMiddleware::default())
            .wrap(SessionMiddleware::new(
                 redis_store.clone(),
                 secret_key.clone()
            ))
            .app_data(web::Data::new(pool.clone()))
            .configure(routes::init_routes)
            .service(actix_files::Files::new("/", "./client/public").index_file("index.html"))
            .service(
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
                )
            .default_service(
                web::route().to(move |req: HttpRequest| {
                    let path = req.path().to_owned();
                    async move {
                        if path.starts_with("/api") {
                            HttpResponse::NotFound().finish()
                        } else {
                            match actix_files::NamedFile::open("./client/public/index.html") {
                                Ok(file) => file.into_response(&req),
                                Err(_) => HttpResponse::InternalServerError().finish(),
                            }
                        }
                    }
                })
            )
    })
    .bind(format!("0.0.0.0:{}", env::var("PORT").unwrap_or_else(|_| "5000".to_string())))?
    .run()
    .await
}