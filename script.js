document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const chatHistory = document.getElementById('chat-history');
    const loadingIndicator = document.getElementById('loading-indicator');
    const listeningIndicator = document.getElementById('listening-indicator');
    const ttsToggle = document.getElementById('tts-toggle');

    const ollamaEndpoint = 'http://localhost:11434/api/chat';
    const modelName = 'llama3.2:3b'; // Your specific Llama 3.2 model

    // Initialize conversation history with the bot's welcome message.
    // This ensures the bot has context from the very beginning.
    let conversationHistory = [
        { role: 'assistant', content: 'Hello! I am Jarvis, your personal AI assistant powered by Llama3.2. How can I assist you today?' }
    ];

    // --- Speech Recognition (STT) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Process single utterance then stop.
        recognition.lang = 'en-US';     // Set language (can be changed).
        recognition.interimResults = false; // Get final results only.
        recognition.maxAlternatives = 1;  // Get only the top alternative.

        recognition.onstart = () => {
            listeningIndicator.style.display = 'flex';
            if(micButton) {
                micButton.classList.add('active'); // Optional: style the button when listening.
                micButton.disabled = true; // Disable mic button while listening
            }
            if(sendButton) sendButton.disabled = true; // Disable send button while listening
        };

        recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript;
            promptInput.value = spokenText; // Populate the input field.
            sendMessage(); // Automatically send the message after speech is recognized.
        };

        recognition.onspeechend = () => {
            recognition.stop(); // Stop recognition when speech ends.
        };

        recognition.onend = () => {
            listeningIndicator.style.display = 'none';
            if(micButton) {
                micButton.classList.remove('active');
                micButton.disabled = false; // Re-enable mic button
            }
            if(sendButton) sendButton.disabled = false; // Re-enable send button
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Speech recognition error.';
            if (event.error === 'no-speech') {
                errorMessage = 'No speech detected. Please try again.';
            } else if (event.error === 'audio-capture') {
                errorMessage = 'Microphone not available or not working. Please check your microphone setup.';
            } else if (event.error === 'not-allowed') {
                errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            }
            addMessage('system', errorMessage); // Display error to the user.
            // Ensure indicators and buttons are reset on error
            listeningIndicator.style.display = 'none';
            if(micButton) {
                micButton.classList.remove('active');
                micButton.disabled = false;
            }
            if(sendButton) sendButton.disabled = false;
        };
    } else {
        console.warn('Speech Recognition API not supported in this browser.');
        if(micButton) {
            micButton.disabled = true;
            micButton.title = "Voice input not supported in this browser";
        }
    }

    // --- Text-to-Speech (TTS) ---
    const speakText = (text) => {
        if (!ttsToggle.checked || !('speechSynthesis' in window)) {
            return; // TTS is disabled or not supported.
        }
        // Sanitize text for speech: remove markdown that might sound awkward.
        let cleanText = text
            .replace(/```[\s\S]*?```/g, "The following is a code block.") // Announce code blocks.
            .replace(/`([^`]+)`/g, "$1") // Read inline code content directly.
            .replace(/[\*_~]/g, ""); // Remove markdown emphasis characters.
                           
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-US'; // Set language for TTS.
        
        // Optional: Attempt to find a more "Jarvis-like" voice.
        // This depends on voices installed on the user's system.
        // const voices = speechSynthesis.getVoices();
        // const jarvisVoice = voices.find(voice => voice.name.includes("Google UK English Male") || voice.name.includes("Daniel") || voice.name.toLowerCase().includes("male"));
        // if (jarvisVoice) {
        //     utterance.voice = jarvisVoice;
        // }

        speechSynthesis.cancel(); // Cancel any ongoing speech.
        speechSynthesis.speak(utterance); // Speak the new utterance.
    };

    // Load voices for TTS. Some browsers require `getVoices()` to be called after `onvoiceschanged`.
    if ('speechSynthesis' in window && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }


    // --- Chat Message Handling ---
    const addMessage = (sender, messageContent) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        
        const p = document.createElement('p'); // Paragraph element to hold the message content.

        if (sender === 'user') {
            messageElement.classList.add('user-message');
            p.textContent = messageContent; // Plain text for user messages.
        } else if (sender === 'bot') {
            messageElement.classList.add('bot-message');
            // Basic Markdown-like to HTML conversion for bot messages.
            let htmlContent = messageContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold: **text**
                .replace(/\*(.*?)\*/g, '<em>$1</em>')         // Italics: *text*
                .replace(/```([\s\S]*?)```/g, (match, p1) => { // Code blocks: ```code```
                    // Basic HTML escaping for content within code blocks
                    const escapedCode = p1.replace(/&/g, '&amp;')
                                          .replace(/</g, '&lt;')
                                          .replace(/>/g, '&gt;')
                                          .replace(/"/g, '&quot;')
                                          .replace(/'/g, '&#039;');
                    return `<pre><code>${escapedCode}</code></pre>`;
                })
                .replace(/`([^`]+)`/g, (match, p1) => {   // Inline code: `code`
                    const escapedCode = p1.replace(/&/g, '&amp;')
                                          .replace(/</g, '&lt;')
                                          .replace(/>/g, '&gt;')
                                          .replace(/"/g, '&quot;')
                                          .replace(/'/g, '&#039;');
                    return `<code>${escapedCode}</code>`;
                })
                .replace(/\n/g, '<br>');                       // Newlines to <br>.
            // Sanitize the HTML content before assigning it to innerHTML
            htmlContent = DOMPurify.sanitize(htmlContent, {USE_PROFILES: {html: true}});
            p.innerHTML = htmlContent;
        } else { // For system messages (e.g., errors).
            messageElement.classList.add('system-message'); // Style this class in CSS if needed.
            p.textContent = messageContent;
        }
        
        messageElement.appendChild(p);
        chatHistory.appendChild(messageElement);
        // Scroll to the bottom of the chat history to show the latest message.
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // If the message is from the bot, speak it (if TTS is enabled).
        if (sender === 'bot') {
            speakText(messageContent);
        }
    };
    
    // --- Send Message to Ollama ---
    const sendMessage = async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) return; // Don't send empty messages.

        addMessage('user', prompt); // Display user's message.
        promptInput.value = ''; // Clear the input field.
        
        promptInput.style.height = 'auto'; 
        promptInput.style.height = Math.max(promptInput.scrollHeight, 50) + 'px';


        loadingIndicator.style.display = 'flex'; 
        if(sendButton) sendButton.disabled = true;
        if (micButton) micButton.disabled = true;

        // Add user's message to the main conversation history.
        conversationHistory.push({ role: 'user', content: prompt });

        // --- Create dynamic system context message ---
        const now = new Date();
        const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const currentLocation = "Mumbai, Maharashtra, India"; // Using the provided location context.

        const systemContextMessage = {
            role: "system",
            content: `You are Jarvis, an AI assistant. Current date is ${currentDate}. Current time is ${currentTime}. The user's current location is ${currentLocation}. Please use this information to make your responses more relevant and accurate. For instance, if the user asks about today, the current time, or things related to their location, use this provided context.`
        };

        // Prepare messages for the API call: system context + full conversation history
        const messagesForAPI = [systemContextMessage, ...conversationHistory];
        // --- End of context message creation ---

        try {
            const response = await fetch(ollamaEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: messagesForAPI, // Send the context-enhanced messages array
                    stream: false 
                }),
            });

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore parsing error, use default HTTP error */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            
            if (data.message && data.message.content) {
                const botResponse = data.message.content;
                addMessage('bot', botResponse); 
                // Add bot's response to history for context in next turn.
                conversationHistory.push({ role: 'assistant', content: botResponse });
            } else {
                addMessage('bot', 'Sorry, I received an unexpected response format from the AI.');
                console.error('Unexpected response format:', data);
            }

        } catch (error) {
            console.error('Error sending message to Ollama:', error);
            addMessage('bot', `Error: ${error.message}`);
        } finally {
            loadingIndicator.style.display = 'none'; 
            if(sendButton) sendButton.disabled = false;
            if (micButton) micButton.disabled = false;
            promptInput.focus(); 
        }
    };

    // --- Event Listeners ---
    if(sendButton) sendButton.addEventListener('click', sendMessage);

    promptInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); 
            sendMessage();
        }
    });
    
    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto'; 
        promptInput.style.height = Math.max(promptInput.scrollHeight, 50) + 'px';
    });


    if (micButton && recognition) { 
        micButton.addEventListener('click', () => {
            try {
                if (micButton.classList.contains('active')) { 
                    recognition.stop();
                } else {
                    recognition.start(); 
                }
            } catch (e) {
                console.warn("Recognition start/stop error:", e);
                if (e.name === 'InvalidStateError') {
                    addMessage('system', 'Voice recognition is already processing. Please wait.');
                } else {
                    addMessage('system', 'Could not start voice recognition. Please check microphone permissions and ensure it is not already active.');
                }
                listeningIndicator.style.display = 'none';
                micButton.classList.remove('active');
                micButton.disabled = false;
                if(sendButton) sendButton.disabled = false;
            }
        });
    }
});
