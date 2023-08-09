import os
import uuid
import openai
import random
import json
import jwt
import datetime
from flask import Flask, send_from_directory, request, jsonify, make_response, session
from flask_security import SQLAlchemyUserDatastore, Security, login_user
from flask_login import LoginManager, login_required, current_user, logout_user
from flask_cors import CORS, cross_origin
from flask_wtf.csrf import generate_csrf
from models import GeneratedText, User, FitnessProfile
from app import app, user_datastore, load_user
from extensions import db
from flask_security.utils import hash_password, verify_password
from os.path import splitext

def create_auth_token_for(user):
    payload = {
        'user_id': user.id,  
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)  
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token.decode()

"""
@app.route("/")
def base():
    return send_from_directory('client/static', 'index.html')

@app.route("/<path:path>")
def home(path):
    return send_from_directory('client/static', path)
"""

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def home(path):
    # Check if path is a file by checking if it has an extension
    if splitext(path)[1]:
        return send_from_directory('client/public', path)
    else:
        return send_from_directory('client/static', 'index.html')


@app.route('/generate', methods=['POST'])
@login_required
def generate():
    try:
        prompt = request.json['prompt']
        max_tokens = request.json.get('max_tokens', 1000)

        response = openai.ChatCompletion.create(
          model="gpt-4",  # replace with appropriate GPT-4 model when available
          messages=[
            {"role": "system", "content": """You are an expert fitness program builder. You output programs in the following format: 
=== WORKOUT PLAN ===

Participant Name: {participant_name}
Goal: {goal}

--- START DATE: {start_date} ---

== MACROCYCLE 1 ==
Name: {macrocycle1_name}
Focus: {macrocycle1_focus}
Duration: {macrocycle1_duration} weeks

=== Microcycle Details ===
Week 1:
Day 1:
  - Exercise: {exercise1_name}
    - Sets: {exercise1_sets}
    - Reps: {exercise1_reps}
    - Weight: {exercise1_weight}
  - Exercise: {exercise2_name}
    - Sets: {exercise2_sets}
    - Reps: {exercise2_reps}
    - Weight: {exercise2_weight}
    (Continue as needed for other exercises)
(Continue as needed for other days)

Week 2:
(Repeat the structure from week 1 for each day, replacing exercise details accordingly)

Week 3:
(Repeat the structure from week 1 for each day, replacing exercise details accordingly)

Week 4:
(Repeat the structure from week 1 for each day, replacing exercise details accordingly)

== MACROCYCLE 2 ==
(Repeat the structure from macrocycle 1, replacing macrocycle and exercise details accordingly)

== MACROCYCLE 3 ==
(Repeat the structure from macrocycle 1, replacing macrocycle and exercise details accordingly)

--- END DATE: {end_date} ---

Additional instructions:
- Warm-up: {warm_up_activities}
- Cooldown: {cooldown_activities}
- Hydration and Nutrition: {nutrition_hydration_instructions}
"""},
            {"role": "user", "content": prompt},
          ], 
          max_tokens=max_tokens,
        )
        
        response_text = response.choices[0].message.content.strip()

        # create a new GeneratedText object with the prompt and response, and add it to the db
        new_generated_text = GeneratedText(prompt, response_text, current_user.id)
        db.session.add(new_generated_text)
        db.session.commit()

        return jsonify(response_text)
    except Exception as e:
        return jsonify(error=str(e)), 500

import json

def parse_workout_plan(response_text):
    lines = response_text.split("\n")
    workout_plan = {}
    current_macrocycle = None
    current_week = None
    current_day = None
    current_exercise = None
    instructions_key = None
    errors = []

    for line in lines:
        try:
            if ": " in line:
                key, value = [part.strip() for part in line.split(": ", 1)]
                if "MACROCYCLE" in key:
                    current_macrocycle = value
                    workout_plan[current_macrocycle] = {}
                elif key.startswith("Week"):
                    current_week = value
                    workout_plan[current_macrocycle][current_week] = {}
                elif key.startswith("Day"):
                    current_day = value
                    workout_plan[current_macrocycle][current_week][current_day] = []
                elif key.startswith("- Exercise"):
                    current_exercise = {"Exercise": value}
                    workout_plan[current_macrocycle][current_week][current_day].append(current_exercise)
                elif key.startswith("- Sets") or key.startswith("- Reps") or key.startswith("- Weight"):
                    current_exercise[key.strip("- ").capitalize()] = value
                elif key in ["Participant Name", "Goal", "--- START DATE", "--- END DATE"]:
                    instructions_key = key
                    workout_plan[instructions_key] = value
            elif instructions_key == "Additional instructions":
                workout_plan[instructions_key] = workout_plan.get(instructions_key, "") + line.strip()
        except Exception as e:
            errors.append({"error": str(e), "line": line})
            continue

    json_workout_plan = json.dumps(workout_plan, indent=4)
    return {"workout_plan": json_workout_plan, "errors": errors}

@app.route('/response/<int:id>', methods=['DELETE'])
@login_required
def delete_response(id):
    try:
        # get the response with the given id
        response = GeneratedText.query.get(id)

        # ensure the response exists and belongs to the current user
        if response is None or response.user_id != current_user.id:
            return jsonify(error='No response found'), 404

        # delete the response
        db.session.delete(response)
        db.session.commit()

        return jsonify(success=True), 200
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route('/responses', methods=['GET'])
@login_required
def get_responses():
    try:
        # query the database for all responses
        responses = GeneratedText.query.filter_by(user_id=current_user.id)

        # convert the list of SQLAlchemy Objects to a list of dictionaries
        responses_list = [{"id": response.id, "prompt": response.prompt, "response": response.response} for response in responses]
        return jsonify(responses_list)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200

@app.route('/login', methods=['POST'])
@cross_origin(supports_credentials=True) # This will enable CORS for the login route
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify(success=False, message='Missing email or password'), 400

    user = User.query.filter_by(email=email).first()
    
    if user and user.check_password(password):
        login_user(user)
        session['logged_in'] = True  
        auth_token = create_auth_token_for(user)  # Replace with your function to create an auth token
        resp = make_response(jsonify(success=True, message='Logged in successfully', auth_token=auth_token), 200)
    else:
        resp = make_response(jsonify(success=False, message='Invalid credentials'), 401)
    
    resp.set_cookie('csrf_access_token', generate_csrf())  # Set the CSRF token here
    return resp

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify(success=False, error='Email and password required'), 400

    user = User.query.filter_by(email=email).first()

    # If this returns a user, then the email already exists in database
    if user:
        return jsonify(success=False, error='A user with that email already exists.'), 400

    user = user_datastore.create_user(email=email, password=hash_password(password), active=True)

    if not user:
        return jsonify(success=False, error='There was an error creating your account. Please try again.'), 400

    db.session.commit()

    return jsonify(success=True, message='Successfully registered. You can now log in.')

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile(): 
    try:
        if request.method == 'GET':
            profile = FitnessProfile.query.filter_by(user_id=current_user.id).first()
            if profile:
                # Convert JSON strings to list
                favorite_exercises = json.loads(profile.favorite_exercises)
                exercise_blacklist = json.loads(profile.exercise_blacklist)
                days_cant_train = json.loads(profile.days_cant_train)
                equipment = json.loads(profile.equipment)

                return jsonify(
                    name=profile.name,
                    age=profile.age,
                    height=profile.height,
                    height_unit=profile.height_unit,
                    weight=profile.weight,
                    weight_unit=profile.weight_unit,
                    gender=profile.gender,
                    years_trained=profile.years_trained,
                    type=profile.type,
                    fitness_level=profile.fitness_level,
                    injuries=profile.injuries,
                    fitness_goal=profile.fitness_goal,
                    target_timeframe=profile.target_timeframe,
                    challenges=profile.challenges,
                    favorite_exercises=favorite_exercises,
                    exercise_blacklist=exercise_blacklist,
                    frequency=profile.frequency,
                    days_cant_train=days_cant_train,
                    preferred_workout_duration=profile.preferred_workout_duration,
                    gym_or_home=profile.gym_or_home,
                    equipment=equipment
                )
            else:
                return jsonify(error='No profile found'), 404
        else: # POST request
            data = request.get_json()
            profile = FitnessProfile.query.filter_by(user_id=current_user.id).first()
            if profile:
                for key, value in data.items():
                    # Convert list to JSON string
                    if key in ["favorite_exercises", "exercise_blacklist", "days_cant_train", "equipment"]:
                        value = json.dumps(value)
                    setattr(profile, key, value)
            else: # if profile does not exist, create it
                # Convert lists to JSON strings
                for key in ["favorite_exercises", "exercise_blacklist", "days_cant_train", "equipment"]:
                    if key in data:
                        data[key] = json.dumps(data[key])
                profile = FitnessProfile(user_id=current_user.id, **data)
                db.session.add(profile)
            
            db.session.commit()
            return jsonify(success=True)
    except Exception as e:
        return jsonify(error=str(e)), 500


@app.route('/auth_status', methods=['GET'])
def auth_status():
    if current_user.is_authenticated:
        print("Not authenticated")
        return jsonify(is_authenticated=True, email=current_user.email)
    else:
        return jsonify(is_authenticated=False)

from flask_wtf.csrf import generate_csrf

@app.route('/csrf_token', methods=['GET'])
def csrf_token():
    token = generate_csrf()
    return jsonify({'csrfToken': token}), 200
