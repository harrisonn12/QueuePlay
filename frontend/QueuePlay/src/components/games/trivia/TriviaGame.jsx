import { useEffect, useState, useRef } from 'react';
import QRCodeDisplay from './components/QRCodeDisplay';
import Timer from './components/Timer';


/*
NOTES:

-server side should handle all game logic:
    -1) Real Time Updates. All players should see the same thing, and backend responsible for managing the WebSocket connections, so broadcasting to all connected clients. frontend can't broadcast.
    -2) Any logic on the frontend can be bypassed or tampered with using tools like browser developer tools or custom HTTP requests. For example, questions, roles, and scores should be managed on the server side to prevent tampering.

-client side should 
    1) display
    2) capture user input
    3) send action to server
    4) update UI with new message from server


IMPLEMENT:
-implement automatic restart of game instead of restart button (server side as well, dont want users to restart game by bypassing)
-instead of button to move to next question, need to add timer which automitcally moves to next question.


comments:
-joingame/{gameId} vs hostgame/{gameId}
-endpoint for host vs gamer. unique id is generated, role is generated.
-from server, receives which role based on which message received. 


*/

const TriviaGame = () => {
    const timePerQuestion = 15; // 15 seconds per question
    const [gameStatus, setGameStatus] = useState('waiting'); // 'waiting', 'playing', 'finished'
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timerKey, setTimerKey] = useState(0);
    const [scores, setScores] = useState({}); 
    const [gameId, setGameId] = useState("");
    const [role, setRole] = useState(''); 
    const [clientId, setClientId] = useState(null);
    const [players, setPlayers] = useState([]); 
    const [inputGameId, setInputGameId] = useState(""); // gameId entered by player to join (remove later with QRCode)
    const [status, setStatus] = useState('');  // display connection status of websocket
    const [hasAnswered, setHasAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [playersWhoAnswered, setPlayersWhoAnswered] = useState([]);
    const [qrCodeData, setQrCodeData] = useState(null); // Store QR code data
    const socketRef = useRef(null);

    useEffect(() => {
        if(socketRef.current) return; // if its already connected 
        const socket = new WebSocket("ws://localhost:6789/");

        socket.onopen = () => {
            socketRef.current = socket;
            setStatus("WebSocket connected");
            console.log("WebSocket connected");
            
            // Check for gameId in URL parameters (from QR code scan)
            const urlParams = new URLSearchParams(window.location.search);
            const gameIdFromUrl = urlParams.get('gameId');
            
            if (gameIdFromUrl) {
                console.log("Auto-joining game with ID:", gameIdFromUrl);
                setInputGameId(gameIdFromUrl);
                // Set a flag in sessionStorage to prevent multiple joins
                if (!sessionStorage.getItem('autoJoined')) {
                    sessionStorage.setItem('autoJoined', gameIdFromUrl);
                    // Auto-join with slight delay to ensure connection is ready
                    setTimeout(() => {
                        socket.send(JSON.stringify({
                            action: "joinGame",
                            gameId: gameIdFromUrl,
                        }));
                    }, 500);
                }
            }
        };
        socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              // Expected message format: {action : "actionName", ... } 
              handleWebSocketMessage(data);  
            } catch (err) {
              console.error("Error parsing JSON", err);
            }
        };
        socket.onerror = (error) => {
            setStatus("WebSocket error")
            console.error("WebSocket error:", error);
        };
      
        socket.onclose = () => {
            console.log("WebSocket disconnected");
            setStatus("WebSocket disconnected");
            socketRef.current = null;
        };
        //cleanup function to close the socket when component unmounts
        return () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
            // Clear the auto-join flag when component unmounts
            sessionStorage.removeItem('autoJoined');
        };
    }, []);
    
    const handleWebSocketMessage = (data) => {
        //updates state based on message received from server, not linear because event driven
        switch(data.action) {
            case "gameInitialized": // if game is initialized, pass in clientId
                console.log("Game initialized message received:", data);
                setClientId(data.clientId);
                setGameId(data.gameId);
                setRole(data.role);
                // setGameStatus('waiting');
                setQrCodeData(data.qrCodeData); // Store the QR code data
                
                setScores({});
                break;

            case "gameJoined": // from player side
                console.log("Game joined message received:", data);
                setClientId(data.clientId);
                setGameId(data.gameId);
                setRole(data.role);
                // setGameStatus('waiting');
                break;

            case "playerJoined": // from host side. when new player joins, server broadcasts updated playerList
                console.log("Player joined:", data.clientId);
                setPlayers(prevPlayers => { // prevPlayers is the previous state of players
                    if (!prevPlayers.includes(data.clientId)) {
                        return [...prevPlayers, data.clientId]; 
                    }
                    return prevPlayers;
                });
                break;
            
            case "gameStarted":
                console.log("Game started message received:", data);
                setGameStatus("playing");
                setCurrentQuestionIndex(0);
                setHasAnswered(false);
                setSelectedAnswer(false);
                setPlayersWhoAnswered([]);
                // Reset timer when game starts
                setTimerKey(prev => prev + 1); 
                if (data.questions && data.questions.length > 0) {
                    console.log("Questions are receieved from backend")
                    setQuestions(data.questions);  // Set questions from backend
                } else {
                    console.error("No questions received from backend!");
                }
                break;
            
            case "answerSubmitted": // from player side
                console.log(`Answer for question ${data.questionIndex} submitted successfully`);
                break;
            
            case "playerAnswered": // from host side
                console.log(`Player ${data.clientId} answered question ${data.questionIndex}`);
                // Update the playersWhoAnswered state to include the player who answered
                setPlayersWhoAnswered(prev => {
                    if (!prev.includes(data.clientId)) {
                        console.log("Adding player to answered list:", data.clientId);
                        return [...prev, data.clientId];
                    }
                    return prev;
                });
                break;
            
            case "questionResult": // from host side
                console.log("Question result message received:", data);
                if (data.scores) {
                    setScores(data.scores);
                }
                break;
            
            case "nextQuestion": // from host side
                console.log("Next question message received:", data);
                setCurrentQuestionIndex(data.questionIndex);
                setHasAnswered(false);
                setSelectedAnswer(null);
                setPlayersWhoAnswered([]);
                setTimerKey(prev => prev + 1);
                break;
            
            case "gameFinished":
                console.log("Game finished message received:", data);
                setGameStatus('finished');
                if (data.finalScores) {
                    setScores(data.finalScores);
                }
                break;
            
            default:
                break;
        }
    };


    const hostGame = () => {
        resetGame();
        if(socketRef.current) {
            // Connection already established
            socketRef.current.send(JSON.stringify({
              action: "initializeGame",
            }));
        }
    };

    const joinGame = () => {
        if (socketRef.current && inputGameId) {
            
            socketRef.current.send(JSON.stringify({
                action: "joinGame",
                gameId : inputGameId,
            }));
        }
    };

    const startGame = () => {
        if (socketRef.current) {    
            socketRef.current.send(JSON.stringify({
                action: "startGame",
                gameId : gameId,
                clientId: clientId
            }));
        } else {
            console.log("Cannot start game - missing data:", { socketRef: !!socketRef.current, role, clientId, gameId });
        }
    }

    const submitAnswer = (answerIndex) => {
        if(socketRef.current && role === 'player' && !hasAnswered) {
            socketRef.current.send(JSON.stringify({
                action: "submitAnswer",
                gameId : gameId,
                clientId : clientId,
                answerIndex : answerIndex,
                questionIndex: currentQuestionIndex
            }));
            setHasAnswered(true);
            setSelectedAnswer(answerIndex);
        }
    }

    const nextQuestion = () => {
        if(socketRef.current && role === 'host') {
            socketRef.current.send(JSON.stringify({
                action : "nextQuestion",
                gameId: gameId,
                clientId : clientId
            }))
        }
    }
    
    // Handle timer completion
    const handleTimerComplete = () => {
        console.log("Timer completed for question", currentQuestionIndex);
        
        // If user is host, automatically move to next question
        if (role === 'host') {
            nextQuestion();
        }
        
        return { shouldRepeat: false }; // Do not repeat the timer
    }


    const renderGameLobby = () => {
        return (
            <div className="game-lobby">
                <h1>Game</h1>

                {!gameId ? (
                    <>
                        <div>
                            <h2>Host a Game</h2>
                            <button onClick={hostGame}>Host Game</button>
                        </div>
                        <div>
                            <h2>Join a Game</h2>
                            <input 
                                type="text" 
                                placeholder="Enter Game ID" 
                                value={inputGameId} 
                                onChange={(e) => setInputGameId(e.target.value)}
                            />
                            <button onClick={joinGame}>Join Game</button>
                        </div>
                    </>
                ) : role === 'host' ? (
                    <div className="host-lobby">
                        <h2>Game ID: {gameId}</h2>
                        <p>Share this Game ID with players to join</p>
                        
                        {/* Display QR code if available */}
                        {qrCodeData && (
                            <div className="qr-code-wrapper">
                                <QRCodeDisplay qrCodeData={qrCodeData} size={250} />
                            </div>
                        )}
                        
                        <h3>Players ({players.length})</h3>
                        <ul>
                            {players.map((player) => (
                                <li key={player}>{player}</li>
                            ))}
                        </ul>
                        
                        <button 
                            onClick={() => {
                                console.log("Start button clicked");
                                startGame();
                            }} 
                            disabled={players.length === 0}
                        >
                            Start Game
                        </button>
                    </div>
                ) : (
                    <div className="player-lobby">
                        <h2>Waiting for Host to Start Game</h2>
                        <p>Game ID: {gameId}</p>
                        <p>Your ID: {clientId}</p>
                        <p>Status: Waiting for host to start the game...</p>
                    </div>
                )}
            </div>
        );
    };

    const renderPlayerGameView = () => {
        if (!questions.length || currentQuestionIndex >= questions.length) {
            return <p>Waiting for question...</p>;
        }
        
        const currentQuestion = questions[currentQuestionIndex];
        
        return (
            <div className="player-game-view">
                <h2>Question {currentQuestionIndex + 1}</h2>
                
                {/* Timer display for player */}
                <div className="timer-container">
                    <Timer 
                        key={timerKey} 
                        seconds={timePerQuestion} 
                        onTimerEnd={() => {}} // Players don't trigger the next question
                    />
                </div>
                
                <h3>{currentQuestion.question}</h3>
                
                <div className="options">
                    {currentQuestion.options.map((option, index) => (
                        <button 
                            key={index}
                            onClick={() => submitAnswer(index)}
                            disabled={hasAnswered}
                            className={selectedAnswer === index ? 'selected' : ''}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                
                {hasAnswered && (
                    <p>Answer submitted! Waiting for next question...</p>
                )}
            </div>
        );
    };

    const renderHostGameView = () => {
        if (!questions.length || currentQuestionIndex >= questions.length) {
            return <p>Loading questions...</p>;
        }
        
        const currentQuestion = questions[currentQuestionIndex];
        
        return (
            <div className="host-game-view">
                <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
                
                {/* Timer display for host */}
                <div className="timer-container">
                    <Timer 
                        key={timerKey} 
                        seconds={timePerQuestion} 
                        onTimerEnd={handleTimerComplete} 
                    />
                </div>
                
                <h3>{currentQuestion.question}</h3>
                
                <div className="options">
                    {currentQuestion.options.map((option, index) => (
                        <div 
                            key={index} 
                            className={`option ${index === currentQuestion.answerIndex ? 'correct' : ''}`}
                        >
                            {option}
                        </div>
                    ))}
                </div>
                
                <div className="player-responses">
                    <h3>Players who answered this question: {playersWhoAnswered.length}/{players.length}</h3>
                    <ul>
                        {playersWhoAnswered.map((playerId) => (
                            <li key={playerId}>{playerId}</li>
                        ))}
                    </ul>
                </div>
                
                <div className="scores">
                    <h3>Current Scores:</h3>
                    <ul>
                        {Object.entries(scores).length > 0 ? (
                            Object.entries(scores)
                                .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                                .map(([playerId, score]) => (
                                    <li key={playerId}>{playerId}: {score} points</li>
                                ))
                        ) : (
                            <li>No scores yet</li>
                        )}
                    </ul>
                </div>
                
                <button 
                    onClick={nextQuestion}
                >
                    {currentQuestionIndex < questions.length - 1 ? 'Skip to Next Question' : 'End Game'}
                </button>
            </div>
        );
    };

    const resetGame = () => {
        setGameStatus('waiting');
        setGameId('');
        setRole('');
        setPlayers([]);
        setScores({});
        setCurrentQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setPlayersWhoAnswered([]);
        setQrCodeData(null); // Reset QR code data
        
        
    }

    const renderGameResults = () => {
        return (
            <div className="game-results">
                <h2>Game Finished!</h2>
                
                <h3>Final Scores:</h3>
                <ul>
                    {Object.entries(scores)
                        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                        .map(([playerId, score]) => (
                            <li key={playerId}>{playerId}: {score} points</li>
                        ))}
                </ul>
                
                {role === 'host' && (
                    <button onClick={hostGame}>Host New Game</button>
                )}
                
                <button onClick={resetGame}>
                    Back to Lobby
                </button>
            </div>
        );
    };

    

    let content;
    
    if (gameStatus === 'loading') {
        content = <p>Loading game...</p>;
    } else if (gameStatus === 'waiting') {
        content = renderGameLobby();
    } else if (gameStatus === 'playing') {
        content = (role === 'host') ? renderHostGameView() : renderPlayerGameView();
    } else if (gameStatus === 'finished') {
        content = renderGameResults();
    }

    return (
        <div className="trivia-game-container">
            <div className="connection-status">
                {status && <span>Connection status: {status}</span>}
            </div>
            {content}
        </div>
    );
}
export default TriviaGame;
