from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_security import UserMixin, RoleMixin
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship, backref

roles_users = db.Table('roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id')))

class GeneratedText(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prompt = db.Column(db.String(5000))
    response = db.Column(db.String(50000))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def __init__(self, prompt, response, user_id):
        self.prompt = prompt
        self.response = response
        self.user_id = user_id

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
    fs_uniquifier = Column(String(255), unique=True)  # add this line
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
    height_unit = db.Column(db.String(15))
    weight = db.Column(db.Float)
    weight_unit = db.Column(db.String(15))
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
