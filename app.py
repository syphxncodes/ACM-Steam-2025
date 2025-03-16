from flask import Flask, render_template, request, jsonify, session
import random
import openai
import os
from config import Config

app = Flask(__name__)
app.secret_key = "your_secret_key"

app.config.from_object(Config)
openai.api_key = app.config["OPENAI_API_KEY"]

OPENAI_API_KEY = app.config["OPENAI_API_KEY"]

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
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant that helps users guess a hidden word. Answer the user's question with a hint without directly revealing the word."},
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

@app.route("/start_game", methods=["POST"])
def start_game():
    """ Initialize game session with 10 random words. """
    session["words"] = random.sample(WORDS_POOL, 10)
    session["current_index"] = 0
    session["hints"] = []
    return jsonify({"message": "Game Started! Ask AI hints."})

@app.route("/ask_hint", methods=["POST"])
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

    return jsonify({"hint": hint})

@app.route("/submit_answer", methods=["POST"])
def submit_answer():
    """ Check if the answer is correct and update progress. """
    if "words" not in session or session["current_index"] >= len(session["words"]):
        return jsonify({"error": "Game not started or already completed."}), 400

    user_answer = request.json.get("answer", "").strip().lower()
    correct_word = session["words"][session["current_index"]].lower()

    if user_answer == correct_word:
        session["current_index"] += 1  # Move to next word
        session["hints"] = []  # Reset hints for new word
        if session["current_index"] < len(session["words"]):
            return jsonify({"correct": True, "message": "Correct! Next word."})
        else:
            return jsonify({"correct": True, "message": "Game Over! You guessed all words."})
    else:
        return jsonify({"correct": False, "message": "Incorrect! Try again."})

if __name__ == "__main__":
    app.run(debug=True)
