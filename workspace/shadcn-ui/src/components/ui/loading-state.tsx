type LoadingStateProps = {
  message?: string;
  className?: string;
};

export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center py-8 text-sm text-slate-500 ${className ?? ''}`}>
      {message ?? 'Loading...'}
    </div>
  );
}
