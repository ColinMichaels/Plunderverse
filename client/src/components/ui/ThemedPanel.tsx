import {forwardRef, ReactNode} from 'react';
import {HTMLMotionProps, motion} from 'framer-motion';
import {cn} from '@/lib/utils.ts';

interface ThemedPanelProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
    children: ReactNode;
    className?: string;
    withCorners?: boolean;
    withScanline?: boolean;
}

/**
 * Reusable themed panel matching PauseMenu design
 * Features: glassmorphism, corner decorations, scan lines
 */
export const ThemedPanel = forwardRef<HTMLDivElement, ThemedPanelProps>(
    ({children, className, withCorners = true, withScanline = true, ...props}, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    'relative bg-[var(--theme-bg-primary)] backdrop-blur-xl',
                    'border border-[var(--theme-border-primary)] rounded-none shadow-2xl',
                    'overflow-hidden',
                    className
                )}
                {...props}
            >
                {/* Scan line effect */}
                {withScanline && (
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none"/>
                )}

                {/* Corner decorations */}
                {withCorners && (
                    <>
                        <div
                            className="absolute top-0 left-0 w-12 h-12 border-l border-t border-[var(--theme-border-accent)] pointer-events-none"/>
                        <div
                            className="absolute top-0 right-0 w-12 h-12 border-r border-t border-[var(--theme-border-accent)] pointer-events-none"/>
                        <div
                            className="absolute bottom-0 left-0 w-12 h-12 border-l border-b border-[var(--theme-border-accent)] pointer-events-none"/>
                        <div
                            className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-[var(--theme-border-accent)] pointer-events-none"/>
                    </>
                )}

                {children}
            </motion.div>
        );
    }
);

ThemedPanel.displayName = 'ThemedPanel';

/**
 * Themed panel header matching PauseMenu style
 */
interface ThemedPanelHeaderProps {
    children: ReactNode;
    subtitle?: string;
    className?: string;
}

export function ThemedPanelHeader({children, subtitle, className}: ThemedPanelHeaderProps) {
    return (
        <div
            className={cn(
                'relative px-8 py-6 bg-[var(--theme-bg-secondary)]',
                'border-b border-[var(--theme-border-primary)]',
                className
            )}
        >
            <motion.h1
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.1}}
                className="text-3xl font-bold text-center text-[var(--theme-text-primary)] tracking-widest font-mono"
            >
                {children}
            </motion.h1>
            {subtitle && (
                <p className="text-center text-[var(--theme-text-secondary)] mt-2 text-xs font-mono tracking-wider">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

/**
 * Themed panel content area
 */
interface ThemedPanelContentProps {
    children: ReactNode;
    className?: string;
}

export function ThemedPanelContent({children, className}: ThemedPanelContentProps) {
    return (
        <div className={cn('p-8', className)}>
            {children}
        </div>
    );
}

/**
 * Themed button matching PauseMenu style
 */
interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    icon?: ReactNode;
    shortcut?: string;
    variant?: 'primary' | 'secondary' | 'danger';
}

export function ThemedButton({
                                 children,
                                 icon,
                                 shortcut,
                                 variant = 'primary',
                                 className,
                                 disabled,
                                 ...props
                             }: ThemedButtonProps) {
    const variantStyles = {
        primary: 'border-[var(--theme-border-primary)] hover:border-[var(--theme-border-hover)]',
        secondary: 'border-[var(--theme-border-primary)] hover:border-[var(--theme-text-secondary)]',
        danger: 'border-red-500/30 hover:border-red-500/60',
    };

    return (
        <button
            className={cn(
                'w-full group relative overflow-hidden',
                'border hover:bg-[var(--theme-bg-secondary)]',
                'transition-all duration-200 p-4',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                variantStyles[variant],
                className
            )}
            disabled={disabled}
            {...props}
        >
            <div className="relative flex items-center justify-center gap-3">
                {icon && (
                    <span className="text-[var(--theme-text-accent)]">
            {icon}
          </span>
                )}
                <span className="text-base font-mono font-medium text-[var(--theme-text-primary)] tracking-wide">
          {children}
        </span>
            </div>
            {shortcut && (
                <p className="relative text-[10px] text-[var(--theme-text-secondary)] mt-1 font-mono">
                    {shortcut}
                </p>
            )}
        </button>
    );
}

/**
 * Themed input field
 */
interface ThemedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export function ThemedInput({label, className, ...props}: ThemedInputProps) {
    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-mono text-[var(--theme-text-secondary)] tracking-wider">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    'w-full px-4 py-3 font-mono',
                    'bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]',
                    'text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-secondary)]',
                    'focus:outline-none focus:border-[var(--theme-border-hover)]',
                    'transition-colors duration-200',
                    className
                )}
                {...props}
            />
        </div>
    );
}

/**
 * Themed key display (for keybindings)
 */
interface ThemedKeyDisplayProps {
    keyCode: string;
    onRemove?: () => void;
    className?: string;
}

export function ThemedKeyDisplay({keyCode, onRemove, className}: ThemedKeyDisplayProps) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5',
                'bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]',
                'font-mono text-sm text-[var(--theme-text-primary)]',
                'transition-colors duration-200',
                onRemove && 'hover:border-[var(--theme-border-hover)] cursor-pointer',
                className
            )}
        >
            <span className="tracking-wider">{keyCode}</span>
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="text-[var(--theme-text-secondary)] hover:text-red-400 transition-colors"
                >
                    ×
                </button>
            )}
        </div>
    );
}

/**
 * Themed section divider
 */
export function ThemedDivider({className}: { className?: string }) {
    return (
        <div
            className={cn(
                'h-px bg-gradient-to-r from-transparent via-[var(--theme-border-primary)] to-transparent',
                'my-6',
                className
            )}
        />
    );
}

/**
 * Themed section heading
 */
interface ThemedSectionHeadingProps {
    children: ReactNode;
    className?: string;
}

export function ThemedSectionHeading({children, className}: ThemedSectionHeadingProps) {
    return (
        <h3
            className={cn(
                'text-lg font-mono font-bold text-[var(--theme-text-primary)]',
                'tracking-widest uppercase mb-4',
                className
            )}
        >
            {children}
        </h3>
    );
}
