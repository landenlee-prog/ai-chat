import './style.css'

import './style.css'
import { HfInference } from '@huggingface/inference'

// ============================================
// CONFIGURATION
// ============================================

// Get API key from environment variable (stored in .env file)
const API_KEY = import.meta.env.VITE_HF_API_KEY;

// Create Hugging Face client
const hf = new HfInference(API_KEY);

// ============================================
// DOM ELEMENTS
// ============================================
async function fetchFinancialData(query) {
  const API_KEY = import.meta.env.VITE_AV_API_KEY;

  // You can change the endpoint depending on your needs
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${API_KEY}`;


  try {
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Financial API error:", err);
    return null;
  }
}

const chatDisplay = document.getElementById('chat-display');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading');


// ============================================
// MAIN FUNCTIONALITY
// ============================================
let conversationHistory = [
  {
  role: "system",
  content: `
You are a financial analysis assistant.
Today's actual date is: ${new Date().toLocaleDateString("en-US")}

ALWAYS use today's real date when doing analysis.
NEVER assume it is 2023 or any past year.
If the user asks "what year is it", respond with today's date.
You also receive REAL_DATA from Alpha Vantage inside the user message.
Never invent numbers.
Keep responses concise and evidence-based.
`
}


];

// Function to add a message to the chat display
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
  
  // Add avatar for AI messages
  if (!isUser) {
    const avatar = document.createElement('img');
    avatar.src = 'clanker.jpg';
    avatar.alt = 'AI';
    avatar.className = 'ai-avatar';
    messageDiv.appendChild(avatar);
  }
  
  const textSpan = document.createElement('span');
  textSpan.textContent = content;
  messageDiv.appendChild(textSpan);

  chatDisplay.appendChild(messageDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}


// Function to show/hide loading indicator
function setLoading(isLoading) {
  loadingIndicator.style.display = isLoading ? 'block' : 'none';
  sendButton.disabled = isLoading;
  userInput.disabled = isLoading;
    // 🔊 Play loading/notification sound
}

// Function to show error messages
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = `⚠️ Error: ${message}`;
  chatDisplay.appendChild(errorDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Function to call the Hugging Face API
async function getAIResponse(userMessage) {
  try {
    let fullResponse = '';
    
    // Use the Hugging Face library with streaming
const stream = hf.chatCompletionStream({
  model: "Qwen/Qwen2.5-72B-Instruct",
  messages: conversationHistory,
  max_tokens: 1000,
  temperature: 0.15,
  
});


    // Collect the streamed response
    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        if (newContent) {
          fullResponse += newContent;
        }
      }
    }

    return fullResponse || 'No response generated.';
    
  } catch (error) {
    console.error('Error calling AI API:', error);
    
    // Provide helpful error messages
    if (error.message.includes('API key')) {
      throw new Error('Invalid API key. Please check your .env file and make sure VITE_HF_API_KEY is set correctly.');
    } else if (error.message.includes('loading')) {
      throw new Error('Model is loading. Please wait a moment and try again.');
    } else {
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }
}

// Main function to handle sending messages
async function handleSendMessage() {
  const message = userInput.value.trim();
  
  // Don't send empty messages
  if (!message) return;
  
  // Check if API key is set
  if (!API_KEY) {
    showError('API key not found! Make sure you created a .env file with VITE_HF_API_KEY.');
    return;
  }
  
  // Add user message to chat
  addMessage(message, true);
  conversationHistory.push({ role: "user", content: message });
  // Clear input
  userInput.value = '';
  
  // Show loading state
  setLoading(true);
  
  try {
    // Get AI response
    // Fetch real verified market data FIRST
const realData = await fetchFinancialData(message);

// Build enhanced message content
const enhancedUserMessage = `
USER QUESTION:
${message}

REAL DATA FROM ALPHA VANTAGE:
${JSON.stringify(realData, null, 2)}

Respond based ONLY on real data when relevant. 
If data is missing, say "Data unavailable from API".
`;

// Get AI response using augmented data
const aiResponse = await getAIResponse(enhancedUserMessage);

    
    // Add AI response to chat
    addMessage(aiResponse, false);
    conversationHistory.push({ role: "assistant", content: aiResponse });
  } catch (error) {
    showError(error.message);
  } finally {
    // Hide loading state
    setLoading(false);
    
    // Focus back on input
    userInput.focus();
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
// Send button click
sendButton.addEventListener('click', handleSendMessage);

// Enter key in textarea (Shift+Enter for new line)
userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
});
// Handle multiple template buttons
document.querySelectorAll(".template-button").forEach(button => {
  button.addEventListener("click", () => {
    const template = button.getAttribute("data-template");
    userInput.value = template;
    userInput.focus();
  });
});

// Hover preview for template buttons
let previousInput = "";
let hoveredTemplate = "";
let clickedTemplate = false;

document.querySelectorAll(".template-button").forEach(button => {

  // Hover preview
  button.addEventListener("mouseenter", () => {
    clickedTemplate = false; // reset click state
    previousInput = userInput.value;

    hoveredTemplate = button.getAttribute("data-template");
    userInput.value = hoveredTemplate;
  });

  // When mouse leaves
  button.addEventListener("mouseleave", () => {
    // Only restore input if the user *did not click*
    if (!clickedTemplate) {
      userInput.value = previousInput;
    }
  });

  // On click: Lock in the template
  button.addEventListener("click", () => {
    clickedTemplate = true;   // prevents reset
    userInput.value = hoveredTemplate;
    userInput.focus();
  });

});

// Focus input on load
userInput.focus();

// Remove the welcome message when first message is sent
chatDisplay.addEventListener('DOMNodeInserted', function() {
  const welcomeMsg = chatDisplay.querySelector('.welcome-message');
  const messages = chatDisplay.querySelectorAll('.message');
  if (welcomeMsg && messages.length > 0) {
    welcomeMsg.remove();
  }
}, { once: true });
