// Game state tracking
let currentWordNumber = 1;
let gameStartTime = 0;

// DOM elements
const questionInput = document.getElementById('question');
const answerInput = document.getElementById('answer');
const hintsContainer = document.getElementById('hints');
const resultContainer = document.getElementById('result');

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add enter key support for inputs
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askHint();
            }
        });
    }
    
    if (answerInput) {
        answerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitAnswer();
            }
        });
    }
});

function startGame() {
    gameStartTime = Date.now();
    currentWordNumber = 1;
    
    fetch("/start_game", { method: "POST" })
        .then(res => res.json())
        .then(data => {
            document.getElementById("game-status").innerText = data.message;
            document.getElementById("game-area").style.display = "block";
            document.getElementById("hints").innerHTML = "";
            document.getElementById("result").innerHTML = "";
            document.getElementById("current-word").innerText = `Word ${currentWordNumber} of 10`;
            
            // Focus on question input
            if (questionInput) {
                questionInput.focus();
            }
        })
        .catch(error => {
            console.error("Error starting game:", error);
            document.getElementById("game-status").innerText = "Error starting game. Please try again.";
        });
}

function askHint() {
    const question = questionInput.value.trim();
    
    if (!question) {
        showMessage(resultContainer, "Please enter a question.", "error");
        questionInput.focus();
        return;
    }

    // Show loading indicator
    const loadingHint = document.createElement('div');
    loadingHint.className = 'hint loading';
    loadingHint.innerText = 'Getting hint from AI...';
    hintsContainer.appendChild(loadingHint);

    fetch("/ask_hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
    })
        .then(res => res.json())
        .then(data => {
            // Remove loading indicator
            hintsContainer.removeChild(loadingHint);
            
            if (data.hint) {
                // Create hint element
                const hintElement = document.createElement('div');
                hintElement.className = 'hint';
                hintElement.innerHTML = `<strong>Q: ${question}</strong><p>${data.hint}</p>`;
                hintsContainer.appendChild(hintElement);
                
                // Clear input and focus
                questionInput.value = "";
                questionInput.focus();
            } else if (data.error) {
                showMessage(resultContainer, data.error, "error");
            }
        })
        .catch(error => {
            // Remove loading indicator
            if (hintsContainer.contains(loadingHint)) {
                hintsContainer.removeChild(loadingHint);
            }
            console.error("Error getting hint:", error);
            showMessage(resultContainer, "Failed to get hint. Please try again.", "error");
        });
}

function submitAnswer() {
    const answer = answerInput.value.trim();
    
    if (!answer) {
        showMessage(resultContainer, "Please enter your answer.", "error");
        answerInput.focus();
        return;
    }

    fetch("/submit_answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer })
    })
        .then(res => res.json())
        .then(data => {
            if (data.correct) {
                // Show success message
                showMessage(resultContainer, data.message, "success");
                
                // Clear inputs
                answerInput.value = "";
                questionInput.value = "";
                hintsContainer.innerHTML = "";
                
                // Check if game is over
                if (data.message.includes("Game Over")) {
                    // Show game completion stats
                    const gameTime = (Date.now() - gameStartTime) / 1000;
                    const statsHtml = `
                        <div class="game-stats">
                            <h3>Game Complete!</h3>
                            <p>Score: ${data.score || 100}</p>
                            <p>Time: ${data.time || gameTime.toFixed(2)} seconds</p>
                            <button onclick="startGame()">Play Again</button>
                            <a href="/profile" class="button">View Profile</a>
                        </div>
                    `;
                    document.getElementById("game-area").innerHTML = statsHtml;
                } else {
                    // Update word counter for next word
                    currentWordNumber++;
                    document.getElementById("current-word").innerText = `Word ${currentWordNumber} of 10`;
                    
                    // Focus on question input for next word
                    setTimeout(() => {
                        questionInput.focus();
                    }, 500);
                }
            } else {
                // Show error message
                showMessage(resultContainer, data.message, "error");
                
                // Clear and focus on answer input
                answerInput.value = "";
                answerInput.focus();
            }
        })
        .catch(error => {
            console.error("Error submitting answer:", error);
            showMessage(resultContainer, "Error submitting answer. Please try again.", "error");
        });
}

function showMessage(container, message, type) {
    container.innerText = message;
    container.className = `message ${type}`;
    
    // Clear message after delay (for error messages)
    if (type === "error") {
        setTimeout(() => {
            container.innerText = "";
            container.className = "";
        }, 3000);
    }
}
