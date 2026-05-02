import { Handle, Position, NodeProps } from 'reactflow';
import { Target, Star } from 'lucide-react';

function CustomNode({ data, isConnectable }: NodeProps) {
  return (
    <div className="px-5 py-4 shadow-lg shadow-black/5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#004d40] dark:border-[#00bfa5] w-[260px] min-h-[100px] flex flex-col items-center justify-center text-center transition-transform hover:scale-105">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-[#004d40] dark:bg-[#00bfa5]" />
      
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#004d40]/10 mb-3 text-[#004d40] dark:text-[#00bfa5]">
        {data.isGoal ? <Target className="w-5 h-5" /> : <Star className="w-5 h-5" />}
      </div>
      
      <div className="font-bold text-slate-800 dark:text-white text-md whitespace-pre-wrap leading-tight">{data.label}</div>
      {data.description && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{data.description}</div>
      )}
      
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-[#004d40] dark:bg-[#00bfa5]" />
    </div>
  );
}

export default CustomNode;
