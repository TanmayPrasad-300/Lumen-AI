const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const flashcardRoutes = require('./flashcardRoutes');
const tutorRoutes = require('./tutorRoutes');
const mindmapRoutes = require('./mindmapRoutes');
const { generateMemoryPalace } = require('../controllers/memoryPalaceController');
const { generateQuiz } = require('../controllers/quizController');

// Active Feature Modules
router.use('/auth', authRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/tutor', tutorRoutes);
router.use('/mindmap', mindmapRoutes);
router.use('/upload-pdf', mindmapRoutes); // Direct root compatibility alias for lomen-mindmap
router.use('/quiz', require('./quizRoutes'));

// Memory Palace routes
router.post('/memory-palace/generate', generateMemoryPalace);

// Dashboard routes
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {
      success: true,
      currentStreak: 5,
      totalHours: 48,
      weeklyHours: 12,
      strengths: [
        'Problem Solving',
        'Algorithm Design',
        'Data Structures'
      ],
      weaknesses: [
        'Time Management',
        'Advanced Mathematics',
        'System Design'
      ],
      workOnItems: [
        'Practice LeetCode daily',
        'Review System Design patterns',
        'Work on time management'
      ]
    };
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

router.post('/dashboard/ask', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    const SARVAM_API_URL = process.env.SARVAM_API_URL || 'https://api.sarvam.ai/v1/chat/completions';
    const SARVAM_MODEL = process.env.SARVAM_MODEL || 'sarvam-105b-conversations';
    const SARVAM_AI_API_KEY = process.env.SARVAM_AI_API_KEY;

    if (!SARVAM_AI_API_KEY || SARVAM_AI_API_KEY === 'your_sarvam_ai_api_key_here') {
      // Fallback response if API key is not configured
      return res.json({
        success: true,
        answer: `I understand you're asking about: "${question}"\n\nTo get AI-powered responses, please configure your Sarvam AI API key in the backend environment variables. For now, I'm operating in demo mode.\n\nIn a fully configured setup, I would provide detailed explanations, examples, and study guidance based on your question.`
      });
    }

    const axios = require('axios');
    const response = await axios.post(SARVAM_API_URL, {
      model: SARVAM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI study assistant. Provide clear, concise, and educational responses to help students learn effectively. Use examples and explanations that make complex topics easier to understand. Focus on being practical and actionable.'
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SARVAM_AI_API_KEY}`
      }
    });

    const answer = response.data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('AI question error:', error);
    
    // Fallback response in case of API errors
    res.json({
      success: true,
      answer: `I encountered an error while processing your question: "${question}"\n\nError details: ${error.message}\n\nPlease try again or check your API configuration.`
    });
  }
});

// Health & System Info
router.get('/health', (req, res) => {
  const dbStatus = require('../config/db').isConnected();
  const hasSarvam = Boolean(process.env.SARVAM_AI_API_KEY && process.env.SARVAM_AI_API_KEY !== 'your_sarvam_ai_api_key_here');

  res.json({
    status: 'online',
    message: 'Luman AI Backend API is operational',
    database: {
      type: 'MongoDB',
      connected: dbStatus,
    },
    features: {
      flashcards: 'active',
      mindmap: 'active',
      tutor: 'active',
      auth: 'active',
      quiz: 'active',
      memory_palace: 'active',
    },
    sarvamConfigured: hasSarvam,
  });
});

module.exports = router;
