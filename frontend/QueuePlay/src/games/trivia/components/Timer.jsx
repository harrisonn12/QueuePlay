import { CountdownCircleTimer } from 'react-countdown-circle-timer';

const Timer = ({ seconds, onTimerEnd }) => {
    return (
        <div>
            <CountdownCircleTimer
                isPlaying={true}
                duration={seconds}
                colors={['#0b5425', '#06810c', '#ffc107', '#e6162b']}  
                colorsTime={[seconds, seconds/3 * 2, seconds/3,0]}
                onComplete={onTimerEnd} 
                size={80}
                strokeWidth={5}
                trailColor="#e9e9e9"
            > 
                {({ remainingTime, color }) => ( // a function for the color and remaining time change on the inside.
                <div style={{ position: 'absolute', fontSize: '1.8rem', fontWeight: 'bold', color }}> 
                    {remainingTime}
                </div>
                )}
            </CountdownCircleTimer>
        </div>
  );
};

export default Timer;
