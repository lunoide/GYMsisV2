import React from 'react';
import { cn } from '../../utils/helpers';
export interface LineChartData {
  label: string;
  value: number;
}
export interface LineChartProps {
  data: LineChartData[];
  title?: string;
  height?: number;
  color?: string;
  showDots?: boolean;
  showGrid?: boolean;
  className?: string;
}
const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 300,
  color = '#3B82F6',
  showDots = true,
  showGrid = true,
  className
}) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const range = maxValue - minValue || 1;
  const chartHeight = height - 80; // Space for labels
  const chartWidth = 400; // Fixed width for calculations
  // Generate SVG path for the line
  const generatePath = () => {
    if (data.length === 0) return '';
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };
  // Generate grid lines
  const gridLines = [];
  if (showGrid) {
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * chartHeight;
      gridLines.push(
        <line
          key={i}
          x1="0"
          y1={y}
          x2={chartWidth}
          y2={y}
          stroke="#E5E7EB"
          strokeWidth="1"
        />
      );
    }
  }
  return (
    <div className={cn('bg-white p-6 rounded-lg shadow-sm border border-gray-200', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="relative overflow-x-auto">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full"
        >
          {/* Grid lines */}
          {gridLines}
          {/* Line */}
          <path
            d={generatePath()}
            fill="none"
            stroke={color}
            strokeWidth="2"
            className="transition-all duration-300"
          />
          {/* Dots */}
          {showDots && data.map((item, index) => {
            const x = (index / (data.length - 1)) * chartWidth;
            const y = chartHeight - ((item.value - minValue) / range) * chartHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={color}
                className="transition-all duration-300 hover:r-6"
              >
                <title>{`${item.label}: ${item.value}`}</title>
              </circle>
            );
          })}
          {/* Labels */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * chartWidth;
            return (
              <text
                key={index}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {item.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
export default LineChart;