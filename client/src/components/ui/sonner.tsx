"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          // Base toast styles with glassmorphism effect
          toast:
            "group toast group-[.toaster]:bg-gray-900/90 group-[.toaster]:backdrop-blur-sm group-[.toaster]:text-amber-100 group-[.toaster]:border group-[.toaster]:border-amber-600/30 group-[.toaster]:shadow-2xl group-[.toaster]:shadow-amber-900/20",
          description: "group-[.toast]:text-amber-200/80",
          
          // Action and cancel button styles
          actionButton:
            "group-[.toast]:bg-amber-600 group-[.toast]:text-gray-900 group-[.toast]:hover:bg-amber-500 group-[.toast]:border-amber-400/30",
          cancelButton:
            "group-[.toast]:bg-gray-800/80 group-[.toast]:text-amber-300 group-[.toast]:hover:bg-gray-700/80 group-[.toast]:border-gray-600/30",
          
          // Success variant - amber/gold theme
          success: 
            "group toast-success group-[.toast-success]:bg-gray-900/95 group-[.toast-success]:backdrop-blur-sm group-[.toast-success]:border-amber-500/50 group-[.toast-success]:text-amber-300 group-[.toast-success]:shadow-2xl group-[.toast-success]:shadow-amber-900/30",
          
          // Error variant - red with dark theme
          error:
            "group toast-error group-[.toast-error]:bg-gray-900/95 group-[.toast-error]:backdrop-blur-sm group-[.toast-error]:border-red-600/50 group-[.toast-error]:text-red-400 group-[.toast-error]:shadow-2xl group-[.toast-error]:shadow-red-900/30",
          
          // Warning variant - orange theme
          warning:
            "group toast-warning group-[.toast-warning]:bg-gray-900/95 group-[.toast-warning]:backdrop-blur-sm group-[.toast-warning]:border-orange-600/50 group-[.toast-warning]:text-orange-400 group-[.toast-warning]:shadow-2xl group-[.toast-warning]:shadow-orange-900/30",
          
          // Info variant - cyan accent
          info:
            "group toast-info group-[.toast-info]:bg-gray-900/95 group-[.toast-info]:backdrop-blur-sm group-[.toast-info]:border-cyan-600/50 group-[.toast-info]:text-cyan-400 group-[.toast-info]:shadow-2xl group-[.toast-info]:shadow-cyan-900/30",
          
          // Close button styling
          closeButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-amber-400/60 group-[.toast]:hover:text-amber-300 group-[.toast]:hover:bg-amber-900/20 group-[.toast]:border-none",
        },
        
        // Additional style overrides for consistency
        style: {
          background: "rgba(17, 24, 39, 0.95)", // gray-900 with opacity
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(217, 119, 6, 0.3)", // amber-600 with opacity
        },
        
        duration: 4000,
      }}
      {...props}
    />
  )
}

export { Toaster }
