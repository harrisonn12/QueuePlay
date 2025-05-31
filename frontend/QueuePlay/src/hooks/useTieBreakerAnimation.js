import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to handle tie-breaker animation logic
 * 
 * @param {Array} tiedPlayerIds - Array of player IDs who are tied
 * @param {boolean} isTieBreaking - Whether tie breaking is in progress
 * @param {function} onTieResolved - Callback function to execute when animation completes with winner ID
 * @returns {Object} Animation state and controls
 */
export const useTieBreakerAnimation = (tiedPlayerIds, isTieBreaking, onTieResolved) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const animationTimeoutRef = useRef(null);
  const preSelectedWinnerRef = useRef(null);
  const animationStartTimeRef = useRef(null);
  
  // Start animation when tie breaking begins
  useEffect(() => {
    // Only run on host when tie stage is 'breaking' and we're not already animating
    if (isTieBreaking && !isAnimating && tiedPlayerIds.length > 1) {
      console.log("Starting tie breaker animation effect...");
      
      // Pre-select the winner
      const winnerIndex = Math.floor(Math.random() * tiedPlayerIds.length);
      const winnerId = tiedPlayerIds[winnerIndex];
      preSelectedWinnerRef.current = winnerId;
      console.log(`Tie-breaker winner pre-selected: ${winnerId} at index ${winnerIndex}`);

      // Start the animation
      setIsAnimating(true);
      setHighlightedIndex(0); // Start highlight at first player
      
      // Record animation start time
      animationStartTimeRef.current = Date.now();
      
      let currentHighlightIndex = 0;
      let currentDelay = 50; // Initial delay ms
      const maxDelay = 500; // Max delay ms
      const delayIncrement = 25; // How much to increase delay each step
      const animationTargetDuration = 3500; // Aim for roughly 3.5 seconds animation

      const runAnimationStep = () => {
        // Move to next player, wrapping around
        currentHighlightIndex = (currentHighlightIndex + 1) % tiedPlayerIds.length;
        console.log(`[Animation Step] Setting highlighted index: ${currentHighlightIndex}, Delay: ${currentDelay}ms`);
        setHighlightedIndex(currentHighlightIndex);

        // Check elapsed time since animation started instead of tracking cumulative delay
        const elapsedTime = Date.now() - animationStartTimeRef.current;

        // Check if animation should stop
        if (elapsedTime >= animationTargetDuration && currentHighlightIndex === winnerIndex) {
          console.log(`Animation stopping. Final index: ${currentHighlightIndex}, Winner ID: ${winnerId}, Elapsed time: ${elapsedTime}ms`);
          // Ensure final highlight is on the winner for a moment
          animationTimeoutRef.current = setTimeout(() => {
            setIsAnimating(false); // Stop animation flag
            setHighlightedIndex(winnerIndex); // Ensure final index is correct
            animationStartTimeRef.current = null;
            // Send the result after a short pause
            setTimeout(() => onTieResolved(winnerId), 300);
          }, currentDelay + 100); // Pause longer on the winner
        } else {
          // Continue animation: schedule next step
          const nextDelay = Math.min(currentDelay + delayIncrement, maxDelay);
          currentDelay = nextDelay;
          animationTimeoutRef.current = setTimeout(runAnimationStep, currentDelay);
        }
      };

      // Kick off the first step
      animationTimeoutRef.current = setTimeout(runAnimationStep, currentDelay);
    }

    // Cleanup function to clear timeout if component unmounts or state changes
    return () => {
      // Only clear if we were animating but are no longer in tie-breaking mode
      if (animationTimeoutRef.current && !isTieBreaking && isAnimating) {
        console.log("Clearing animation timeout due to tie-breaking ending.");
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
        animationStartTimeRef.current = null;
        setIsAnimating(false);
      }
    };
  }, [isTieBreaking, isAnimating, tiedPlayerIds, onTieResolved]);

  // Function to manually reset the animation state
  const resetAnimation = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    animationStartTimeRef.current = null;
    setIsAnimating(false);
    setHighlightedIndex(-1);
    preSelectedWinnerRef.current = null;
    console.log("Animation manually reset");
  };

  return {
    isAnimating,
    highlightedIndex,
    resetAnimation,
    // Expose the pre-selected winner for testing/debugging
    preSelectedWinnerId: preSelectedWinnerRef.current 
  };
}; 