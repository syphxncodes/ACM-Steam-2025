// Game state tracking
let currentWordNumber = 1;
let totalWords = 10;
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
    
    fetch("/start_game", { method: "POST" })
        .then(res => {
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.error || "Failed to start game");
                });
            }
            return res.json();
        })
        .then(data => {
            document.getElementById("game-area").style.display = "block";
            document.getElementById("hints").innerHTML = "";
            document.getElementById("result").innerHTML = "";
            
            // Hide the active game message
            const activeGameMessage = document.querySelector(".alert.alert-warning");
            if (activeGameMessage) {
                activeGameMessage.style.display = "none";
            }
            
            // Hide buttons when game starts
            if (document.getElementById("start-button")) {
                document.getElementById("start-button").style.display = "none";
            }
            if (document.getElementById("continue-button")) {
                document.getElementById("continue-button").style.display = "none";
            }
            if (document.getElementById("end-button")) {
                document.getElementById("end-button").style.display = "none";
            }
            
            // Update word counter based on server response
            currentWordNumber = data.currentIndex || 1;
            totalWords = data.totalWords || 10;
            document.getElementById("current-word").innerText = `Word ${currentWordNumber} of ${totalWords}`;
            
            // Show "Continuing existing game" message only for the first word
            if (data.message.includes("Continuing") && currentWordNumber === 1) {
                document.getElementById("game-status").innerText = data.message;
                // Hide the message after 3 seconds
                setTimeout(() => {
                    document.getElementById("game-status").innerText = "";
                }, 3000);
            } else {
                document.getElementById("game-status").innerText = "";
            }
            
            // Focus on question input
            if (questionInput) {
                questionInput.focus();
            }
        })
        .catch(error => {
            console.error("Error starting game:", error);
            document.getElementById("game-status").innerText = error.message || "Error starting game. Please try again.";
        });
}


function endGame() {
    if (confirm("Are you sure you want to end your game? This cannot be undone.")) {
        // Immediately hide the active game message
        const activeGameMessage = document.querySelector(".alert.alert-warning");
        if (activeGameMessage) {
            activeGameMessage.style.display = "none";
        }
        
        fetch('/end_game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || "Failed to end game");
                });
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('game-status').textContent = data.message;
            // Hide game area and buttons
            document.getElementById('game-area').style.display = 'none';
            if (document.getElementById("continue-button")) {
                document.getElementById("continue-button").style.display = 'none';
            }
            if (document.getElementById("end-button")) {
                document.getElementById("end-button").style.display = 'none';
            }
            
            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('game-status').textContent = error.message || 'An error occurred while ending the game.';
        });
    }
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
        .then(res => {
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.error || "Failed to get hint");
                });
            }
            return res.json();
        })
        .then(data => {
            // Remove loading indicator
            hintsContainer.removeChild(loadingHint);
            
            if (data.hint) {
                // Mark all existing hints as completed
                const existingHints = document.querySelectorAll('.hint');
                existingHints.forEach(hint => {
                    hint.classList.add('completed');
                });
                
                // Create hint element
                const hintElement = document.createElement('div');
                hintElement.className = 'hint'; // New hint is not completed
                hintElement.innerHTML = `<strong>Q: ${question}</strong><p>${data.hint}</p>`;
                hintsContainer.appendChild(hintElement);
                
                // Auto-scroll to the bottom to show the newest hint
                hintsContainer.scrollTop = hintsContainer.scrollHeight;
                
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
            showMessage(resultContainer, error.message || "Failed to get hint. Please try again.", "error");
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
        .then(res => {
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.error || "Failed to submit answer");
                });
            }
            return res.json();
        })
        .then(data => {
            if (data.correct) {
                // Show success message
                showMessage(resultContainer, data.message, "success");
                
                // Mark all hints as completed by adding a class
                const allHints = document.querySelectorAll('.hint');
                allHints.forEach(hint => {
                    hint.classList.add('completed');
                });
                
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
            showMessage(resultContainer, error.message || "Error submitting answer. Please try again.", "error");
        });
}


function showMessage(container, message, type) {
    container.innerText = message;
    container.className = `message ${type}`;
    
    // Clear message after delay (for both error and success messages)
    if (type === "error" || type === "success") {
        setTimeout(() => {
            // Add fade-out class first
            container.classList.add('fade-out');
            
            // Then clear text after transition completes
            setTimeout(() => {
                container.innerText = "";
                container.className = "";
            }, 500); // This should match the transition duration in CSS
        }, type === "error" ? 3000 : 2000); // 3 seconds for errors, 2 for success
    }
}

