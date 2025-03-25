import { useEffect, useState } from 'react';
import Timer from './Timer';    

const Question = ({ 
    question, // the object containing the question and options and the correct answer index
    onSelectAnswer, // is a function prop (placeholder), that becomes reference to handleAnswer, which is a method in parent. 
    isAnswered, // boolean to check if the question is answered
    isCorrect, // boolean to check if the answer is correct
    onTimeUp, // is a function prop (placeholder), that becomes reference to handleTimeUp, which is a method in parent.
    timePerQuestion // time per question
}) => {

    const [timerKey, setTimerKey] = useState(0); // key to reset timer, helps React internally to create new Timer instances. 
    
    // useEffect is React hook that runs setup after dependency array changes
    // useEffect always runs after the initial render (component mount), but after that is dependency array based
    // format is useEffect(setup, dependency array)
    useEffect(() => {
        // for state update functions, the format is this setState(newState);
        setTimerKey(currKey => currKey + 1);
    }, [question.question]); 
    

    return (
        <div> 
            <div> {/* header with question and timer */}
                <h2>{question.question}</h2>  
                <Timer 
                    key={timerKey} // React handles internally, not passed in as parameter
                    seconds={timePerQuestion} 
                    onTimerEnd={onTimeUp} 
                />
            </div>
        
            <div>
                {question.options.map((option, index) => (
                    <button
                        key={index}
                        className="option"
                        onClick={() => onSelectAnswer(option)}
                        disabled={isAnswered} // if question is answered (pressed), disable button
                    >
                        {option}
                    </button>
                ))}
            </div>
            {/* need {} for js code (ex: && statements) in jsx file */}
            {isAnswered && (isCorrect ? (<p>Correct!</p>) : (<p>The correct answer is: {question.correctAnswer}</p>))}
        </div>
    );
};

export default Question;