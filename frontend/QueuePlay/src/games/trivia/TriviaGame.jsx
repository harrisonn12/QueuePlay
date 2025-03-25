import { useEffect, useState } from 'react';
import Question from './components/Question.jsx';
import QuestionService from '../../services/QuestionService';

const TriviaGame = () => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [gameStatus, setGameStatus] = useState('loading'); // loading, playing, finished
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [questions, setQuestions] = useState([]);
  
  
    const timePerQuestion = 15;
    
    const hardcodedQuestions = [
        {
            question: "Who is the lead singer of the band Coldplay?",
            options: ["Michael Jackson", "Chris Martin", "Billy Joel", "Skrillex"],
            answerIndex: 1
        },
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Venus", "Jupiter", "Mars", "Saturn"],
            answerIndex: 2
        },
        {
            question: "What is the capital of France?",
            options: ["London", "Berlin", "Madrid", "Paris"],
            answerIndex: 3
        },
    ];


    useEffect(() => { 
        const loadQuestions = async () => {
            try {
                const fetchedQuestions = await QuestionService.getQuestionAnswerSet();
                setQuestions(fetchedQuestions);
                setGameStatus('playing');
            } catch (error) {
                // console.error('Failed to load questions:', error);
                // throw error;
                console.error('Failed to load questions:', error);
                setQuestions(hardcodedQuestions);
                setGameStatus('playing');
            }
        };
        loadQuestions();
    }, []);


  
    const totalQuestions = questions.length;
    const currentQuestion = questions[currentQuestionIndex];
    const timeoutDelay = 1000;

    const handleAnswer = (selected) => {
        if (isAnswered) return; // does not run second time
    
        const correctOption = currentQuestion.options[currentQuestion.answerIndex];
        const correct = selected === correctOption;
        setIsCorrect(correct);
        setIsAnswered(true);
        setSelectedAnswer(selected);
        
        if (correct) {
            setScore(score + 1);
        }
        
        // added delay before moving to next question
        setTimeout(() => {
            moveToNextQuestion();
        }, timeoutDelay);
    };
  
    const handleTimeUp = () => {
        if (!isAnswered) {
            setIsAnswered(true);
            setIsCorrect(false);
        
            setTimeout(() => {
                moveToNextQuestion();
            }, timeoutDelay);
        }
    };
  
    const moveToNextQuestion = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setIsAnswered(false);
            setSelectedAnswer(null);
        } else {
            setGameStatus('finished');
        }
    };
  
    const restartGame = () => {
        setCurrentQuestionIndex(0);
        setScore(0);
        setGameStatus('playing');
        setIsAnswered(false);
        setSelectedAnswer(null);
    };
  
    return (
        <div>
            
            {gameStatus === 'loading' && ( // same thing as if gameStatus === 'loading' then do this
                <div>Loading questions...</div> // but in return statement jsx cant use if statement
            )}
            
            {gameStatus === 'playing' && currentQuestion && ( // if gameStatus === 'playing' and currentQuestion is not null
                <div>  
                    <Question 
                        question={{
                        ...currentQuestion, 
                        selectedAnswer,
                        correctAnswer: currentQuestion.options[currentQuestion.answerIndex]
                        }}
                        onSelectAnswer={handleAnswer}
                        isAnswered={isAnswered}
                        isCorrect={isCorrect}
                        onTimeUp={handleTimeUp}
                        timePerQuestion={timePerQuestion}
                    />
                </div>
            )}
            
            {gameStatus === 'finished' && (
                <div>
                    <h2>Game Over, Your final score: {score}/{totalQuestions}</h2>
                    <button onClick={restartGame}>Play Again</button>
                </div>
            )}
        </div>
    );
};

export default TriviaGame;

