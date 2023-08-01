import os
import uuid
import openai
import random
import json # Added JSON import
from flask import Flask, send_from_directory, request, jsonify
#from flask_wtf import CSRFProtect
from flask_security import UserMixin, RoleMixin, SQLAlchemyUserDatastore, Security
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship, backref
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Float, JSON
from flask_migrate import Migrate
from flask_cors import CORS, cross_origin
from flask_login import LoginManager, login_required, current_user, login_user
from flask import make_response
import psycopg2

app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
DATABASE_URI = os.getenv('DATABASE_URL')
if DATABASE_URI.startswith("postgres://"):
    print("REPLACING DATABASE URI")
    DATABASE_URI = DATABASE_URI.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URI
app.config['SECURITY_PASSWORD_SALT'] = os.getenv('SECURITY_PASSWORD_SALT')
app.config['WTF_CSRF_ENABLED'] = True
app.config['WTF_CSRF_CHECK_DEFAULT'] = False
app.config['WTF_CSRF_TIME_LIMIT'] = None
app.config['Access-Control-Allow-Credentials'] = True

login_manager = LoginManager(app)
login_manager.init_app(app)
CORS(app, resources={r'/*': {'origins': '*'}}, supports_credentials=True)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
openai.api_key = os.getenv('OPENAI_API_KEY')

roles_users = db.Table('roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id')))

class GeneratedText(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.String(5000))
    response = db.Column(db.String(50000))

    def __init__(self, prompt, response):
        self.prompt = prompt
        self.response = response

class Role(db.Model, RoleMixin):
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True)
    description = Column(String(255))

class User(db.Model, UserMixin):
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    password = Column(String(255))
    active = Column(Boolean())
    confirmed_at = Column(DateTime())
    fs_uniquifier = Column(String(255), unique=True, default=str(uuid.uuid4()))  # add this line
    roles = relationship('Role', secondary=roles_users, backref=backref('users', lazy='dynamic'))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class FitnessProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    name = db.Column(db.String(50))
    age = db.Column(db.Integer)
    height = db.Column(db.Float)
    weight = db.Column(db.Float)
    gender = db.Column(db.String(50))
    years_trained = db.Column(db.Integer)
    type = db.Column(db.String(50))
    fitness_level = db.Column(db.String(50))
    injuries = db.Column(db.String(500))
    fitness_goal = db.Column(db.String(500))
    target_timeframe = db.Column(db.String(50))
    challenges = db.Column(db.String(500))
    exercise_blacklist = db.Column(db.String(500))
    frequency = db.Column(db.Integer)
    days_cant_train = db.Column(JSON)
    preferred_workout_duration = db.Column(db.Integer) # User's preferred workout duration in minutes
    gym_or_home = db.Column(db.String(50)) # 'gym' or 'home'
    favorite_exercises = db.Column(JSON)
    equipment = db.Column(JSON)

    user = db.relationship('User', backref='fitness_profile')

# After your models are defined...
with app.app_context():
    db.create_all()

# Setup Flask-Security
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

def create_user(email, password):
    user = user_datastore.create_user(email=email, password=hash_password(password), active=True)
    db.session.commit()
    return user

#@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
# Path for our main Svelte page
@app.route("/")
def base():
    return send_from_directory('client/public', 'index.html')

# Path for all the static files (compiled JS/CSS, etc.)
@app.route("/<path:path>")
def home(path):
    return send_from_directory('client/public', path)

@app.route('/generate', methods=['POST'])
def generate():
    try:
        prompt = request.json['prompt']
        max_tokens = request.json.get('max_tokens', 1000)

        response = openai.ChatCompletion.create(
          model="gpt-3.5-turbo",  # replace with appropriate GPT-4 model when available
          messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.choices[0].message.content.strip()

        # create a new GeneratedText object with the prompt and response, and add it to the db
        new_generated_text = GeneratedText(prompt, response_text)
        db.session.add(new_generated_text)
        db.session.commit()

        return jsonify(response_text)
        
    except Exception as e:
        return jsonify(error=str(e)), 500

from flask import request, jsonify
from flask_security import login_user

@app.route('/responses', methods=['GET'])
def get_responses():
    try:
        # query the database for all responses
        responses = GeneratedText.query.all()

        # convert the list of SQLAlchemy Objects to a list of dictionaries
        responses_list = [{"id": response.id, "prompt": response.prompt, "response": response.response} for response in responses]
        
        return jsonify(responses_list)
    except Exception as e:
        return jsonify(error=str(e)), 500

from flask_wtf.csrf import generate_csrf

from flask_login import logout_user

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
        resp = make_response(jsonify(success=True, message='Logged in successfully'), 200)
    else:
        resp = make_response(jsonify(success=False, message='Invalid credentials'), 401)
    
    resp.set_cookie('csrf_access_token', generate_csrf())  # Set the CSRF token here
    return resp



from flask_security.utils import hash_password
from flask_security.utils import verify_password

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
        return jsonify(success=False, error='Could not create user'), 500

    db.session.commit()

    return jsonify(success=True)

from flask_login import login_required, current_user

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile(): 
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
                weight=profile.weight,
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

if __name__ == "__main__":
    app.run(debug=True)
