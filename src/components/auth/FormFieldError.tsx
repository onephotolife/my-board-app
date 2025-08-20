'use client';

interface FormFieldErrorProps {
  fieldName: string;
  error?: string;
  touched: boolean;
}

export function FormFieldError({ fieldName, error, touched }: FormFieldErrorProps) {
  if (!error || !touched) return null;
  
  return (
    <div 
      id={`${fieldName}-helper-text`}
      className="field-error MuiFormHelperText-root Mui-error"
      role="alert"
      aria-live="polite"
      style={{
        fontSize: '12px',
        color: '#dc2626',
        marginTop: '4px',
        animation: 'fadeIn 0.2s ease-in',
      }}
    >
      {error}
    </div>
  );
}