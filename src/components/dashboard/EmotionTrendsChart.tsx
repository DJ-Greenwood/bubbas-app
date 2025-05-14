// src/components/dashboard/EmotionTrendsChart.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useConversationService } from '../../hooks/useConversationService';
import { useAuth } from '../../hooks/useAuth';

interface EmotionTrend {
  date: string;
  emotions: Record<string, number>;
  totalCount: number;
}

interface EmotionTrendsChartProps {
  className?: string;
  period?: 'day' | 'month' | 'all';
  startDate?: Date;
  endDate?: Date;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number; // Emotion count fields will be added dynamically
}

const EmotionTrendsChart: React.FC<EmotionTrendsChartProps> = ({
  className = '',
  period = 'all',
  startDate,
  endDate
}) => {
  const { user } = useAuth();
  const { loadEmotionalTrends } = useConversationService();
  const [trends, setTrends] = useState<EmotionTrend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Define emotion colors
  const emotionColors: { [key: string]: string } = {
    happy: '#F59E0B',     // yellow-500
    sad: '#60A5FA',       // blue-400
    anxious: '#A78BFA',   // purple-400
    calm: '#2DD4BF',      // teal-400
    excited: '#FB923C',   // orange-400
    frustrated: '#EF4444', // red-500
    neutral: '#6B7280',   // gray-500
    confused: '#818CF8',  // indigo-400
    hopeful: '#34D399',   // emerald-400
    overwhelmed: '#F472B6', // pink-400
    grateful: '#10B981',  // green-500
    angry: '#DC2626',     // red-600
    determined: '#2563EB', // blue-600
    pensive: '#9CA3AF'    // gray-400
  };

  // Load emotional trends data
  useEffect(() => {
    const fetchTrends = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const trendsData = await loadEmotionalTrends(period);
        setTrends(trendsData);
      } catch (err) {
        console.error('Error loading emotional trends:', err);
        setError('Failed to load emotion data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrends();
  }, [user, period, loadEmotionalTrends]);
  
  // Process data for chart
  const processChartData = (trends: EmotionTrend[]): ChartDataPoint[] => {
    // Sort trends by date
    const sortedTrends = [...trends].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // Create chart data
    return sortedTrends.map(trend => {
      const dataPoint: ChartDataPoint = {
        date: formatDate(trend.date),
      };
      
      // Add each emotion count
      Object.entries(trend.emotions).forEach(([emotion, count]) => {
        dataPoint[emotion] = count;
      });
      
      return dataPoint;
    });
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    if (dateString.includes('monthly_')) {
      // Format monthly as "Jan 2023"
      const yearMonth = dateString.replace('monthly_', '');
      const [year, month] = yearMonth.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } else {
      // Format daily as "Jan 15"
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };
  
  // Get all emotions present in the data
  const getAllEmotions = (trends: EmotionTrend[]): string[] => {
    const emotionsSet = new Set<string>();
    
    trends.forEach(trend => {
      Object.keys(trend.emotions).forEach(emotion => {
        emotionsSet.add(emotion);
      });
    });
    
    return Array.from(emotionsSet);
  };
  
  const chartData = processChartData(trends);
  const allEmotions = getAllEmotions(trends);

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading emotion trends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            className="mt-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <p className="text-gray-500 text-center">
          No emotional data available yet. Continue chatting to track your emotional patterns.
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="p-6 bg-white rounded-lg shadow-sm h-full">
        <h2 className="text-xl font-semibold mb-4">Emotional Trends</h2>
        
        <div className="mb-4 flex gap-2">
          <button
            className={`px-3 py-1 text-sm rounded-full transition ${
              period === 'all' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => window.location.href = `${window.location.pathname}?period=all`}
          >
            All Time
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full transition ${
              period === 'month' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => window.location.href = `${window.location.pathname}?period=month`}
          >
            This Month
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full transition ${
              period === 'day' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => window.location.href = `${window.location.pathname}?period=day`}
          >
            Today
          </button>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              
              {/* Render a line for each emotion */}
              {allEmotions.map((emotion, index) => (
                <Line
                  key={emotion}
                  type="monotone"
                  dataKey={emotion}
                  name={emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                  stroke={emotionColors[emotion] || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          This chart shows the frequency of different emotions detected in your conversations over time.
        </p>
      </div>
    </div>
  );
};

export default EmotionTrendsChart;