type ErrorStateProps = {
  message?: string;
  className?: string;
};

export function ErrorState({ message, className }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 text-sm text-rose-500 ${className ?? ''}`}>
      <p>{message ?? 'Something went wrong.'}</p>
    </div>
  );
}
