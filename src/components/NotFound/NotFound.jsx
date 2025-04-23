import React from 'react';

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <img 
                src={process.env.PUBLIC_URL + '/assets/images/404/404.jpg'} 
                alt="Page Not Found" 
                className="w-1/2 max-w-md mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-800">Oops! Page Not Found</h1>
        </div>
    );
};

export default NotFound;