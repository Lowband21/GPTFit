use actix_web::{web, HttpResponse};
use diesel::prelude::*;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    errors::ServiceError,
    models::{Pool, NewUser, SlimUser, User},
    utils::hash_password,
};

// UserData is used to extract data from a post request by the client
#[derive(Debug, Deserialize)]
pub struct UserData {
    pub username: String,
    pub password: String,
}

pub async fn register_user(
    user_data: web::Json<UserData>,
    pool: web::Data<Pool>,
) -> Result<HttpResponse, actix_web::Error> {
    println!("Here");
    let user_data = user_data.into_inner();
    let username = user_data.username;
    let password = user_data.password;
    let user = web::block(move || {
        query(
            username,
            password,
            pool,
        )
    })
    .await??;

    Ok(HttpResponse::Ok().json(&user))
}

fn query(
    username: String,
    password: String,
    pool: web::Data<Pool>,
) -> Result<SlimUser, crate::errors::ServiceError> {
    use crate::schema::users::dsl::*;

    let mut conn = pool.get().unwrap();

    match users.filter(email.eq(&username)).load::<User>(&mut conn) {
        Ok(mut result) => {
            if let Some(user) = result.pop() {
                let password_hash: String = hash_password(&password)?;
                dbg!(&password_hash);

                if user.hash == password_hash {
                    return Ok(user.into());
                } else {
                    Err(ServiceError::BadRequest("Invalid Password".into()))
                }
            } else {
                // If no user was found, create a new one
                let new_user = NewUser { 
                    user_id: Uuid::new_v4().to_u128_le() as i32,     
                    email: username, 
                    hash: hash_password(&password)?,
                    created_at: chrono::Local::now().naive_local()
                };

                diesel::insert_into(users).values(&new_user).execute(&mut conn)
                    .map_err(|err| {
                        eprintln!("Error during user insertion: {:?}", err);
                        ServiceError::InternalServerError
                    })?;
                
                users.order(email.desc()).first::<User>(&mut conn).map(Into::into)
                    .map_err(|err| {
                        eprintln!("Error fetching the newly created user: {:?}", err);
                        ServiceError::InternalServerError
                    })
            }
        }
        Err(db_error) => {
            eprintln!("DB Error: {:?}", db_error); // or use any logger you have in place
            Err(ServiceError::BadRequest("Error fetching user".into()))
        }
    }
}
