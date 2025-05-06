import React from "react";
import UpdatedChatBasicService from "../ChatBasic/UpdatedChatBasic";

"use client"; 


const ChatBasicDebug = () => {
    return (
        <div className="debug-container p-4 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Chat Basic Debug</h1>
            <div className="debug-info mb-6">
                <h2 className="text-lg font-semibold">Debug Information</h2>
                <p className="text-sm text-gray-600">
                    Use this component to debug the UpdatedChatBasicService. Ensure all
                    props, states, and interactions are working as expected.
                </p>
            </div>
            <div className="debug-component border border-gray-300 rounded-lg p-4 bg-white shadow">
                <UpdatedChatBasicService />
            </div>
        </div>
    );
};

export default ChatBasicDebug;