let gameData = {};

function startGame() {
    fetch("/start_game", { method: "POST" })
    .then(response => response.json())
    .then(data => {
        gameData = data;
        document.getElementById("status").innerText = "Game Started! Ask AI hints.";
        document.getElementById("hint-section").style.display = "block";
        updateCurrentWord();
    });
}

function updateCurrentWord() {
    if (gameData.current_index < gameData.words.length) {
        document.getElementById("current-word").innerText = "Word " + (gameData.current_index + 1);
    } else {
        document.getElementById("status").innerText = "Game Over!";
        document.getElementById("hint-section").style.display = "none";
    }
}

function askHint() {
    let question = document.getElementById("question").value;
    let hintsDiv = document.getElementById("hints");

    if (!question.trim()) {
        hintsDiv.innerHTML += `<p style="color: red;">Please enter a question to receive a hint.</p>`;
        return;
    }

    fetch("/ask_hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question })
    })
    .then(response => response.json())
    .then(data => {
        if (data.hint) {
            hintsDiv.innerHTML += `<p>${data.hint}</p>`;
        } else if (data.error) {
            hintsDiv.innerHTML += `<p style="color: red;">${data.error}</p>`;
        }
    })
    .catch(error => {
        console.error("Error fetching hint:", error);
        hintsDiv.innerHTML += `<p style="color: red;">Failed to get hint. Try again later.</p>`;
    });
}



function submitAnswer() {
    let answer = document.getElementById("answer-input").value;
    let word = gameData.words[gameData.current_index];

    fetch("/submit_answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word, answer: answer, game_data: gameData })
    })
    .then(response => response.json())
    .then(data => {
        gameData = data;
        updateCurrentWord();
    });
}
