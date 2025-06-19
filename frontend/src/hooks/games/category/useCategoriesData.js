import { useState, useCallback, useMemo } from 'react';

// Predefined categories pool
const CATEGORIES_POOL = [
  { name: 'Animals', examples: ['Dog', 'Cat', 'Lion'] },
  { name: 'Colors', examples: ['Red', 'Blue', 'Green'] },
  { name: 'Countries', examples: ['USA', 'Canada', 'France'] },
  { name: 'Food & Drinks', examples: ['Pizza', 'Coffee', 'Apple'] },
  { name: 'Sports', examples: ['Soccer', 'Tennis', 'Basketball'] },
  { name: 'Movies', examples: ['Titanic', 'Avatar', 'Batman'] },
  { name: 'Professions', examples: ['Doctor', 'Teacher', 'Engineer'] },
  { name: 'Fruits', examples: ['Apple', 'Orange', 'Banana'] },
  { name: 'Vegetables', examples: ['Carrot', 'Broccoli', 'Tomato'] },
  { name: 'Cities', examples: ['New York', 'Tokyo', 'London'] },
  { name: 'Brands', examples: ['Apple', 'Google', 'Nike'] },
  { name: 'School Subjects', examples: ['Math', 'Science', 'History'] },
];

// Basic word validation - expanded lists for common categories
const VALIDATION_DATA = {
  'Animals': [
    'dog', 'cat', 'lion', 'tiger', 'elephant', 'bear', 'wolf', 'fox', 'rabbit', 'deer',
    'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken', 'duck', 'fish', 'bird', 'eagle',
    'owl', 'snake', 'lizard', 'frog', 'turtle', 'shark', 'whale', 'dolphin', 'octopus', 'crab'
  ],
  'Colors': [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white',
    'gray', 'grey', 'violet', 'indigo', 'turquoise', 'maroon', 'navy', 'lime', 'olive', 'cyan'
  ],
  'Countries': [
    'usa', 'canada', 'mexico', 'france', 'germany', 'italy', 'spain', 'japan', 'china', 'india',
    'brazil', 'argentina', 'australia', 'russia', 'egypt', 'nigeria', 'kenya', 'sweden', 'norway', 'denmark'
  ],
  'Food & Drinks': [
    'pizza', 'burger', 'pasta', 'rice', 'bread', 'cheese', 'milk', 'coffee', 'tea', 'water',
    'juice', 'soda', 'beer', 'wine', 'cake', 'cookies', 'chocolate', 'ice cream', 'soup', 'salad'
  ],
  'Sports': [
    'soccer', 'football', 'basketball', 'tennis', 'golf', 'baseball', 'hockey', 'swimming', 'running', 'cycling',
    'boxing', 'wrestling', 'skiing', 'snowboarding', 'surfing', 'climbing', 'volleyball', 'badminton', 'cricket', 'rugby'
  ],
  'Movies': [
    'titanic', 'avatar', 'batman', 'superman', 'spiderman', 'ironman', 'avengers', 'starwars', 'frozen', 'shrek',
    'finding nemo', 'toy story', 'lion king', 'beauty and the beast', 'aladdin', 'inception', 'matrix', 'gladiator', 'jaws', 'et'
  ],
  'Professions': [
    'doctor', 'teacher', 'engineer', 'lawyer', 'nurse', 'pilot', 'chef', 'artist', 'musician', 'writer',
    'police', 'firefighter', 'mechanic', 'plumber', 'electrician', 'architect', 'scientist', 'farmer', 'driver', 'accountant'
  ],
  'Fruits': [
    'apple', 'orange', 'banana', 'grape', 'strawberry', 'blueberry', 'watermelon', 'pineapple', 'mango', 'peach',
    'pear', 'cherry', 'plum', 'kiwi', 'lemon', 'lime', 'coconut', 'papaya', 'avocado', 'pomegranate'
  ],
  'Vegetables': [
    'carrot', 'broccoli', 'tomato', 'potato', 'onion', 'garlic', 'pepper', 'cucumber', 'lettuce', 'spinach',
    'cabbage', 'celery', 'corn', 'peas', 'beans', 'eggplant', 'zucchini', 'mushroom', 'radish', 'beet'
  ],
  'Cities': [
    'new york', 'los angeles', 'chicago', 'houston', 'philadelphia', 'toronto', 'vancouver', 'london', 'paris', 'berlin',
    'rome', 'madrid', 'tokyo', 'beijing', 'seoul', 'mumbai', 'delhi', 'sydney', 'melbourne', 'cairo'
  ],
  'Brands': [
    'apple', 'google', 'microsoft', 'amazon', 'facebook', 'tesla', 'nike', 'adidas', 'coca cola', 'pepsi',
    'mcdonalds', 'starbucks', 'disney', 'netflix', 'spotify', 'uber', 'airbnb', 'walmart', 'target', 'samsung'
  ],
  'School Subjects': [
    'math', 'mathematics', 'science', 'biology', 'chemistry', 'physics', 'history', 'geography', 'english', 'literature',
    'art', 'music', 'physical education', 'pe', 'computer science', 'psychology', 'sociology', 'economics', 'philosophy', 'language'
  ],
};

export const useCategoriesData = () => {
  const [usedCategories, setUsedCategories] = useState([]);

  // Get available categories (not yet used)
  const availableCategories = useMemo(() => {
    return CATEGORIES_POOL.filter(cat => !usedCategories.includes(cat.name));
  }, [usedCategories]);

  // Get random category
  const getRandomCategory = useCallback(() => {
    if (availableCategories.length === 0) {
      // Reset if all categories used
      setUsedCategories([]);
      return CATEGORIES_POOL[Math.floor(Math.random() * CATEGORIES_POOL.length)];
    }
    
    const randomIndex = Math.floor(Math.random() * availableCategories.length);
    const selectedCategory = availableCategories[randomIndex];
    
    setUsedCategories(prev => [...prev, selectedCategory.name]);
    return selectedCategory;
  }, [availableCategories]);

  // Validate word for category
  const isValidForCategory = useCallback((word, categoryName) => {
    if (!word || typeof word !== 'string') return false;
    
    const cleanWord = word.toLowerCase().trim();
    if (cleanWord.length === 0) return false;

    // Check if word exists in validation data for this category
    const validWords = VALIDATION_DATA[categoryName];
    if (!validWords) return false;

    return validWords.includes(cleanWord);
  }, []);

  // Reset used categories (for new game)
  const resetUsedCategories = useCallback(() => {
    setUsedCategories([]);
  }, []);

  // Get category examples for display
  const getCategoryExamples = useCallback((categoryName) => {
    const category = CATEGORIES_POOL.find(cat => cat.name === categoryName);
    return category ? category.examples : [];
  }, []);

  return {
    getRandomCategory,
    isValidForCategory,
    resetUsedCategories,
    getCategoryExamples,
    availableCategories: availableCategories.length,
    totalCategories: CATEGORIES_POOL.length,
  };
}; 