import { CountdownCircleTimer } from 'react-countdown-circle-timer';

const Timer = ({ seconds, onTimerEnd = () => {}, size = 120 }) => {
    // Calculate inner circle size based on outer size
    const innerSize = size - 20;
    const fontSize = size === 120 ? '2.5rem' : size === 80 ? '1.8rem' : '1.5rem';
    
    return (
        <div className="timer-wrapper">
            <CountdownCircleTimer
                isPlaying={true}
                duration={seconds}
                colors={['#00d4ff', '#00ff88', '#f59e0b', '#ef4444']}  
                colorsTime={[seconds, seconds/2, seconds/4, 0]}
                onComplete={onTimerEnd}
                size={size}
                strokeWidth={8}
                trailColor="rgba(71, 85, 105, 0.3)"
            > 
                {({ remainingTime, color }) => {
                    // Determine the timer state for additional styling
                    let timerClass = 'timer';
                    if (remainingTime <= seconds/4) {
                        timerClass += ' critical';
                    } else if (remainingTime <= seconds/2) {
                        timerClass += ' warning';
                    }
                    
                    return (
                        <div className={timerClass} style={{ 
                            position: 'absolute',
                            width: `${innerSize}px`,
                            height: `${innerSize}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: fontSize,
                            fontWeight: '700',
                            color: color,
                            textShadow: `0 0 10px ${color}`,
                            borderRadius: '50%',
                            background: 'var(--card-bg)',
                            border: `2px solid ${color}`,
                            boxShadow: `0 0 20px ${color}40`
                        }}> 
                            {remainingTime}
                        </div>
                    );
                }}
            </CountdownCircleTimer>
        </div>
  );
};

export default Timer;
