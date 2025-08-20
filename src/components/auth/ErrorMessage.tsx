'use client';

interface ErrorMessageProps {
  error?: string;
  fieldName?: string;
  type?: 'field' | 'form';
}

export function ErrorMessage({ error, fieldName, type = 'field' }: ErrorMessageProps) {
  if (!error) return null;
  
  const baseClass = type === 'field' ? 'field-error' : 'error-message';
  const id = fieldName ? `${fieldName}-helper-text` : undefined;
  
  return (
    <div 
      className={`${baseClass} MuiFormHelperText-root Mui-error`}
      id={id}
      role="alert"
      aria-live="polite"
      style={{
        fontSize: type === 'field' ? '12px' : '14px',
        color: '#dc2626',
        marginTop: type === 'field' ? '4px' : '0',
        padding: type === 'form' ? '12px' : '0',
        backgroundColor: type === 'form' ? '#fef2f2' : 'transparent',
        border: type === 'form' ? '1px solid #fecaca' : 'none',
        borderRadius: type === 'form' ? '8px' : '0',
      }}
    >
      {error}
    </div>
  );
}