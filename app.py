from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import random
import openai
import os
import time
from config import Config
from flask_cors import CORS
from models import db, User, GameResult
#from flask_admin import Admin
#from flask_admin.contrib.sqla import ModelView

#admin = Admin(app, name='HeadUp Admin', template_mode='bootstrap3')
#admin.add_view(ModelView(User, db.session))
#admin.add_view(ModelView(GameResult, db.session))

app = Flask(__name__)
CORS(app)
app.secret_key = "your_secret_key"

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///game.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

app.config.from_object(Config)
openai.api_key = app.config["OPENAI_API_KEY"]
OPENAI_API_KEY = app.config["OPENAI_API_KEY"]

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# List of words (30 total, 10 randomly chosen per game)
WORDS_POOL = ["Python", "Algorithm", "Database", "Neural Network", "Encryption",
              "Compiler", "Blockchain", "Cloud Computing", "Big Data", "Cybersecurity",
              "Artificial Intelligence", "Machine Learning", "Internet of Things", "Quantum Computing",
              "API", "Bug", "Cache", "Data Structure", "Debugging", "Front-end",
              "Back-end", "Full Stack", "GraphQL", "HTTP", "Kernel",
              "Linux", "Middleware", "Node.js", "Open Source", "React"]

def get_ai_hint(word, question):
    """Generate AI hints based on the user's question without directly revealing the word."""
    openai.api_key = OPENAI_API_KEY  # Set the API key globally
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an assistant that helps users guess a hidden word. Answer the user's question with a hint without directly revealing the word. If the user asks to give the word, reply to him as not possible."},
                {"role": "user", "content": f"The hidden word is '{word}'. The user asked: {question}. Provide a helpful response without saying the word directly."}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error fetching hint: {str(e)}"

@app.route("/")
def index():
    """ Render game home page. """
    return render_template("index.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    """ Handle user login """
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        remember = True if request.form.get("remember") else False
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            flash("Please check your login details and try again.")
            return redirect(url_for("login"))
            
        login_user(user, remember=remember)
        return redirect(url_for("index"))
        
    return render_template("login.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    """ Handle user registration """
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        
        # Check if user already exists
        user_by_email = User.query.filter_by(email=email).first()
        user_by_username = User.query.filter_by(username=username).first()
        
        if user_by_email:
            flash("Email already exists.")
            return redirect(url_for("signup"))
            
        if user_by_username:
            flash("Username already exists.")
            return redirect(url_for("signup"))
            
        # Create new user
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return redirect(url_for("login"))
        
    return render_template("signup.html")

@app.route("/logout")
@login_required
def logout():
    """ Handle user logout """
    logout_user()
    return redirect(url_for("index"))

@app.route("/profile")
@login_required
def profile():
    """ Display user profile and game history """
    game_results = GameResult.query.filter_by(user_id=current_user.id).order_by(GameResult.created_at.desc()).all()
    return render_template("profile.html", user=current_user, games=game_results)

@app.route("/start_game", methods=["POST"])
@login_required
def start_game():
    """ Initialize game session with 10 random words and create a new game record. """
    # Create a new game result entry
    new_game = GameResult(user_id=current_user.id)
    db.session.add(new_game)
    db.session.commit()
    
    # Store game ID in session
    session["game_id"] = new_game.id
    session["start_time"] = time.time()
    session["words"] = random.sample(WORDS_POOL, 10)
    session["current_index"] = 0
    session["hints"] = []
    session["total_hints"] = 0
    
    return jsonify({"message": "Game Started! Ask AI hints."})

@app.route("/ask_hint", methods=["POST"])
@login_required
def ask_hint():
    """ Provide hints for the current word based on user questions. """
    if "words" not in session or session["current_index"] >= len(session["words"]):
        return jsonify({"error": "Game not started or already completed."}), 400

    word = session["words"][session["current_index"]]
    data = request.get_json()
    question = data.get("question", "")

    if not question:
        return jsonify({"error": "Please enter a question to get a hint."}), 400

    hint = get_ai_hint(word, question)  # Call AI hint function
    session["hints"].append(hint)  # Track hints given
    session["total_hints"] = session.get("total_hints", 0) + 1
    
    # Update hint count in database
    game = GameResult.query.get(session["game_id"])
    if game:
        game.total_hints = session["total_hints"]
        db.session.commit()

    return jsonify({"hint": hint})

@app.route("/submit_answer", methods=["POST"])
@login_required
def submit_answer():
    """ Check if the answer is correct and update progress. """
    if "words" not in session or session["current_index"] >= len(session["words"]):
        return jsonify({"error": "Game not started or already completed."}), 400

    user_answer = request.json.get("answer", "").strip().lower()
    correct_word = session["words"][session["current_index"]].lower()

    if user_answer == correct_word:
        session["current_index"] += 1  # Move to next word
        words_guessed = session["current_index"]
        session["hints"] = []  # Reset hints for new word
        
        # Update game progress in database
        game = GameResult.query.get(session["game_id"])
        if game:
            game.words_guessed = words_guessed
            game.score = words_guessed * 10  # 10 points per word
            
            # If game is complete, calculate final stats
            if session["current_index"] >= len(session["words"]):
                elapsed_time = time.time() - session.get("start_time", time.time())
                game.time_taken = elapsed_time
                game.completed = True
                
            db.session.commit()
            
        if session["current_index"] < len(session["words"]):
            return jsonify({"correct": True, "message": "Correct! Next word."})
        else:
            return jsonify({
                "correct": True, 
                "message": "Game Over! You guessed all words.",
                "score": game.score,
                "time": round(game.time_taken, 2)
            })
    else:
        return jsonify({"correct": False, "message": "Incorrect! Try again."})

# Create database tables before first request
with app.app_context():
    db.create_all()



if __name__ == "__main__":
    app.run(debug=True)
