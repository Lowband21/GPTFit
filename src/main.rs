use actix_web::middleware::Logger;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::PgConnection;
use dotenv::dotenv;
use std::env;

use actix_identity::IdentityMiddleware;
use actix_session::{storage::RedisSessionStore, Session, SessionMiddleware};
use actix_web::cookie::Key;

mod auth_handler;
mod errors;
mod gen_handlers;
mod models;
mod register_handler;
mod routes;
mod schema;
mod utils;

use crate::routes::*;

type DbPool = Pool<ConnectionManager<PgConnection>>;

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let manager = ConnectionManager::<PgConnection>::new(database_url);
    let pool: DbPool = Pool::builder()
        .build(manager)
        .expect("Failed to create pool.");

    let redis_connection_string =
        std::env::var("REDIS_URL").unwrap_or_else(|_| String::from("redis://127.0.0.1:6379"));
    let secret_key = Key::generate();
    let redis_store = RedisSessionStore::new(redis_connection_string)
        .await
        .unwrap();

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .wrap(IdentityMiddleware::default())
            .wrap(SessionMiddleware::new(
                redis_store.clone(),
                secret_key.clone(),
            ))
            .app_data(web::Data::new(pool.clone()))
            .service(
                web::scope("/api")
                    .service(
                        web::resource("/profile/{user_email}")
                            .route(web::post().to(gen_handlers::save_user_profile))
                            .route(web::get().to(gen_handlers::get_user_profile)),
                    )
                    .service(
                        web::resource("/response/{id}")
                            .route(web::delete().to(gen_handlers::delete_response)),
                    )
                    .service(
                        web::resource("/responses")
                            .route(web::get().to(gen_handlers::get_responses)),
                    )
                    .service(
                        web::resource("/csrf_token")
                            .route(web::get().to(auth_handler::get_csrf_token)),
                    )
                    .service(
                        web::resource("/register_user")
                            .route(web::post().to(register_handler::register_user)),
                    )
                    .service(
                        web::resource("/generate").route(web::post().to(gen_handlers::generate)),
                    )
                    .service(
                        web::resource("/auth")
                            .route(web::post().to(auth_handler::login))
                            .route(web::delete().to(auth_handler::logout))
                            .route(web::get().to(auth_handler::get_me)),
                    ),
            )
            .service(actix_files::Files::new("/", "./client/public").index_file("index.html"))
            .default_service(web::route().to(move |req: HttpRequest| {
                let path = req.path().to_owned();
                async move {
                    if path.starts_with("/api") {
                        println!("Matching /api as webpage");
                        HttpResponse::NotFound().finish()
                    } else {
                        println!("Matching file");
                        match actix_files::NamedFile::open("./client/public/index.html") {
                            Ok(file) => file.into_response(&req),
                            Err(_) => HttpResponse::InternalServerError().finish(),
                        }
                    }
                }
            }))
    })
    .bind(format!(
        "0.0.0.0:{}",
        env::var("PORT").unwrap_or_else(|_| "5000".to_string())
    ))?
    .run()
    .await
}
