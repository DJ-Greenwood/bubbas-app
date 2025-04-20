import React from 'react';

// Example icons (replace with your actual icons or imports)
const emotions = {
    joyful: '/assets/emotions/Joyful.jpg',
    peaceful: '/assets/emotions/Peaceful.jpg',
    tired: '/assets/emotions/Drained.jpg',
    nervous: '/assets/emotions/Nervous.jpg',
    frustrated: '/assets/emotions/Frustrated.jpg',
    grateful: '/assets/emotions/Greatful.jpg',
    hopeful: '/assets/emotions/Hopeful.jpg',
    isolated: '/assets/emotions/Isolated.jpg',
    confused: '/assets/emotions/Confused.jpg',
    reflective: '/assets/emotions/Reflective.jpg',
    sad: '/assets/emotions/Sad.jpg',
    angry: '/assets/emotions/Angry.jpg',
    default: '/assets/images/emotions/default.jpg',
};

interface AIResponse {
    message: string;
    type: keyof typeof emotions;
}

interface ChatUIProps {
    aiResponse: AIResponse;
}

const ChatUI: React.FC<ChatUIProps> = ({ aiResponse }) => {
    const { message, type } = aiResponse;

    // Get the related icon based on the response type
    const icon = emotions[type] || emotions.default;

    return (
        <div style={styles.container}>
            <img src={icon} alt={type} style={styles.icon} />
            <p style={styles.message}>{message}</p>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        marginBottom: '10px',
    },
    icon: {
        marginRight: '10px',
        width: '64px',
        height: '64px',
    },
    message: {
        margin: 0,
        fontSize: '16px',
    },
};

export default ChatUI;