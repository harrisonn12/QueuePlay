import { useState, useCallback, useRef } from 'react';
import { useGameCore } from '../../core/useGameCore';

/**
 * Hook for validating words using the backend API with ConceptNet + AI fallback
 * Replaces the hardcoded word validation in useCategoriesData.js
 */
export const useWordValidationAPI = () => {
  const { ensureConnected } = useGameCore();
  const [isValidating, setIsValidating] = useState(false);
  const [validationCache, setValidationCache] = useState(new Map());
  const [stats, setStats] = useState({
    totalValidations: 0,
    cacheHits: 0,
    apiCalls: 0,
    errors: 0
  });
  
  // Rate limiting to prevent API spam
  const lastApiCall = useRef(0);
  const apiCallDelay = 100; // 100ms between API calls
  
  /**
   * Validate a single word against a category
   */
  const validateWord = useCallback(async (word, category) => {
    if (!word || !category) {
      return { isValid: false, source: 'validation', explanation: 'Empty word or category' };
    }
    
    const cleanWord = word.trim().toLowerCase();
    const cleanCategory = category.trim().toLowerCase();
    const cacheKey = `${cleanWord}:${cleanCategory}`;
    
    // Check cache first
    if (validationCache.has(cacheKey)) {
      setStats(prev => ({ ...prev, cacheHits: prev.cacheHits + 1, totalValidations: prev.totalValidations + 1 }));
      return validationCache.get(cacheKey);
    }
    
    try {
      setIsValidating(true);
      
      // Rate limiting
      const now = Date.now();
      const timeSinceLastCall = now - lastApiCall.current;
      if (timeSinceLastCall < apiCallDelay) {
        await new Promise(resolve => setTimeout(resolve, apiCallDelay - timeSinceLastCall));
      }
      lastApiCall.current = Date.now();
      
      // Make API call
      console.log(`[WordValidationAPI] Making API call for "${cleanWord}" in "${cleanCategory}"`);
      const token = localStorage.getItem('jwt_token');
      console.log(`[WordValidationAPI] Using JWT token: ${token ? 'present' : 'missing'}`);
      
      const response = await fetch('http://localhost:8000/validate-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Use stored JWT token
        },
        body: JSON.stringify({
          word: cleanWord,
          category: cleanCategory
        })
      });
      
      console.log(`[WordValidationAPI] Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please refresh the page.');
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      }
      
      const data = await response.json();
      const result = {
        isValid: data.is_valid,
        source: data.confidence_source,
        explanation: data.explanation
      };
      
      // Cache the result
      setValidationCache(prev => new Map(prev.set(cacheKey, result)));
      setStats(prev => ({ 
        ...prev, 
        apiCalls: prev.apiCalls + 1, 
        totalValidations: prev.totalValidations + 1 
      }));
      
      console.log(`[WordValidationAPI] "${word}" in "${category}" = ${result.isValid} (${result.source})`);
      return result;
      
    } catch (error) {
      console.error(`[WordValidationAPI] Error validating "${word}" in "${category}":`, error);
      setStats(prev => ({ ...prev, errors: prev.errors + 1, totalValidations: prev.totalValidations + 1 }));
      
      // Fallback to conservative validation
      return {
        isValid: false,
        source: 'error_fallback',
        explanation: `Validation failed: ${error.message}`
      };
    } finally {
      setIsValidating(false);
    }
  }, [validationCache]);
  
  /**
   * Validate multiple word-category pairs in batch
   */
  const validateWordsBatch = useCallback(async (wordCategoryPairs) => {
    if (!wordCategoryPairs || wordCategoryPairs.length === 0) {
      return [];
    }
    
    // Check cache for each pair and separate cached vs uncached
    const cachedResults = [];
    const uncachedPairs = [];
    const uncachedIndices = [];
    
    wordCategoryPairs.forEach((pair, index) => {
      const { word, category } = pair;
      const cleanWord = word.trim().toLowerCase();
      const cleanCategory = category.trim().toLowerCase();
      const cacheKey = `${cleanWord}:${cleanCategory}`;
      
      if (validationCache.has(cacheKey)) {
        cachedResults[index] = validationCache.get(cacheKey);
      } else {
        uncachedPairs.push({ word: cleanWord, category: cleanCategory });
        uncachedIndices.push(index);
      }
    });
    
    // If all results are cached, return them
    if (uncachedPairs.length === 0) {
      setStats(prev => ({ 
        ...prev, 
        cacheHits: prev.cacheHits + wordCategoryPairs.length,
        totalValidations: prev.totalValidations + wordCategoryPairs.length
      }));
      return cachedResults;
    }
    
    try {
      setIsValidating(true);
      
      // Rate limiting for batch requests
      const now = Date.now();
      const timeSinceLastCall = now - lastApiCall.current;
      if (timeSinceLastCall < apiCallDelay * 2) { // Longer delay for batch
        await new Promise(resolve => setTimeout(resolve, (apiCallDelay * 2) - timeSinceLastCall));
      }
      lastApiCall.current = Date.now();
      
      // Make batch API call
      console.log(`[WordValidationAPI] Making batch API call for ${uncachedPairs.length} pairs`);
      const token = localStorage.getItem('jwt_token');
      console.log(`[WordValidationAPI] Using JWT token: ${token ? 'present' : 'missing'}`);
      
      const response = await fetch('http://localhost:8000/validate-words-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          word_category_pairs: uncachedPairs
        })
      });
      
      console.log(`[WordValidationAPI] Batch response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please refresh the page.');
        } else {
          throw new Error(`Batch API error: ${response.status}`);
        }
      }
      
      const data = await response.json();
      const batchResults = data.results;
      
      // Process batch results and update cache
      const finalResults = [...cachedResults];
      batchResults.forEach((result, batchIndex) => {
        const originalIndex = uncachedIndices[batchIndex];
        const processedResult = {
          isValid: result.is_valid,
          source: result.confidence_source,
          explanation: result.explanation
        };
        
        finalResults[originalIndex] = processedResult;
        
        // Cache the result
        const pair = uncachedPairs[batchIndex];
        const cacheKey = `${pair.word}:${pair.category}`;
        setValidationCache(prev => new Map(prev.set(cacheKey, processedResult)));
      });
      
      setStats(prev => ({ 
        ...prev, 
        apiCalls: prev.apiCalls + 1, // One batch API call
        cacheHits: prev.cacheHits + cachedResults.filter(r => r).length,
        totalValidations: prev.totalValidations + wordCategoryPairs.length 
      }));
      
      console.log(`[WordValidationAPI] Batch validated ${wordCategoryPairs.length} pairs (${uncachedPairs.length} API calls, ${cachedResults.filter(r => r).length} cached)`);
      return finalResults;
      
    } catch (error) {
      console.error('[WordValidationAPI] Batch validation error:', error);
      setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      
      // Return mixed results: cached results + fallback for failed ones
      const finalResults = [...cachedResults];
      uncachedIndices.forEach(index => {
        if (!finalResults[index]) {
          finalResults[index] = {
            isValid: false,
            source: 'batch_error_fallback',
            explanation: `Batch validation failed: ${error.message}`
          };
        }
      });
      
      return finalResults;
    } finally {
      setIsValidating(false);
    }
  }, [validationCache]);
  
  /**
   * Clear the validation cache
   */
  const clearCache = useCallback(() => {
    setValidationCache(new Map());
    setStats({
      totalValidations: 0,
      cacheHits: 0,
      apiCalls: 0,
      errors: 0
    });
    console.log('[WordValidationAPI] Cache cleared');
  }, []);
  
  /**
   * Get validation statistics
   */
  const getStats = useCallback(() => {
    return {
      ...stats,
      cacheSize: validationCache.size,
      cacheHitRate: stats.totalValidations > 0 ? (stats.cacheHits / stats.totalValidations * 100).toFixed(1) : '0.0'
    };
  }, [stats, validationCache.size]);
  
  return {
    validateWord,
    validateWordsBatch,
    clearCache,
    getStats,
    isValidating,
    cacheSize: validationCache.size
  };
}; 