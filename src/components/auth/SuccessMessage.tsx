'use client';

interface SuccessMessageProps {
  message?: string;
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  if (!message) return null;
  
  return (
    <div 
      className="success-message MuiAlert-standardSuccess"
      role="status"
      aria-live="polite"
      style={{
        padding: '12px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        color: '#16a34a',
        marginBottom: '16px',
      }}
    >
      {message}
    </div>
  );
}