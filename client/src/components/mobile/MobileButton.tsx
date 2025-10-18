import { forwardRef } from 'react';
import { useMobileLayout } from '../../stores/useMobileLayout';

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'normal' | 'small';
  icon?: string;
  label?: string;
  children?: React.ReactNode;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ variant = 'primary', size = 'normal', icon, label, className = '', children, ...props }, ref) => {
    const { config } = useMobileLayout();
    
    const baseClasses = [
      'flex items-center justify-center',
      'transition-all duration-150',
      'font-medium',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95',
      config.panel.backdrop,
      config.panel.radius,
    ];
    
    const sizeClasses = size === 'small' 
      ? `w-10 h-10 text-xs` 
      : `w-12 h-12 ${config.text.button}`;
    
    const variantClasses = {
      primary: [
        'bg-cyan-500/90 hover:bg-cyan-400/90',
        'border-2 border-cyan-400',
        'text-slate-900',
        'shadow-lg shadow-cyan-500/20',
      ],
      secondary: [
        config.panel.bg,
        config.panel.border,
        'text-slate-300 hover:text-white',
        'hover:bg-slate-700/90',
      ],
      danger: [
        'bg-red-500/90 hover:bg-red-400/90',
        'border-2 border-red-400',
        'text-white',
        'shadow-lg shadow-red-500/20',
      ],
    };
    
    return (
      <div className="flex flex-col items-center space-y-1" data-ui>
        <button
          ref={ref}
          className={[
            ...baseClasses,
            sizeClasses,
            ...variantClasses[variant],
            className,
          ].join(' ')}
          {...props}
        >
          {icon && <span className="text-lg">{icon}</span>}
          {children}
        </button>
        {label && (
          <div className={`${config.text.label} text-center leading-tight`}>
            {label}
          </div>
        )}
      </div>
    );
  }
);

MobileButton.displayName = 'MobileButton';