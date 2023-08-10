from flask import Flask
from flask_security import SQLAlchemyUserDatastore, Security
from flask_cors import CORS, cross_origin
from flask_wtf.csrf import CSRFProtect, generate_csrf
from extensions import db, login_manager
from flask_migrate import Migrate
from models import User, Role
import os

app = Flask(__name__, static_folder='client/static')

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(32))
app.config['SECURITY_PASSWORD_SALT'] = os.environ.get('SECURITY_PASSWORD_SALT', os.urandom(32))
# Get the original connection string
connection_string = os.getenv('DATABASE_URL', 'sqlite:///db.sqlite')

# Check if it starts with 'postgres://'
if connection_string.startswith('postgres://'):
    # Replace the initial 'postgres://' with 'postgresql://'
    connection_string = 'postgresql://' + connection_string[len('postgres://'):]

# Now set the new connection string
app.config['SQLALCHEMY_DATABASE_URI'] = connection_string
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['WTF_CSRF_ENABLED'] = True
app.config['WTF_CSRF_CHECK_DEFAULT'] = False
app.config['WTF_CSRF_TIME_LIMIT'] = None
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['Access-Control-Allow-Credentials'] = True

db.init_app(app)
login_manager.init_app(app)

migrate = Migrate(app, db)

csrf = CSRFProtect(app)
CORS(app, support_credentials=True)

from models import User, Role

user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico')

from routes import *

if __name__ == '__main__':
    app.run(debug=True)