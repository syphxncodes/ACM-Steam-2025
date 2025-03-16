import os

class Config:
    SECRET_KEY = "your_secret_key"
    SQLALCHEMY_DATABASE_URI = "sqlite:///database.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "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")  # Set API key correctly
