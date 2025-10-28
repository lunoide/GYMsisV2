import React from 'react';
import { cn } from '../../utils/helpers';
export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}
export interface BarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  showValues?: boolean;
  className?: string;
}
const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 300,
  showValues = true,
  className
}) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];
  return (
    <div className={cn('bg-white p-6 rounded-lg shadow-sm border border-gray-200', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="relative" style={{ height }}>
        <div className="flex items-end justify-between h-full space-x-2">
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * (height - 60); // 60px for labels
            const color = item.color || colors[index % colors.length];
            return (
              <div key={item.label} className="flex flex-col items-center flex-1">
                <div className="relative flex flex-col items-center justify-end h-full">
                  {showValues && (
                    <span className="text-xs font-medium text-gray-600 mb-1">
                      {item.value}
                    </span>
                  )}
                  <div
                    className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                    style={{
                      height: barHeight,
                      backgroundColor: color,
                      minHeight: '4px'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-2 text-center break-words">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default BarChart;