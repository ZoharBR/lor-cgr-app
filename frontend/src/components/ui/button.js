import React from 'react';

const Button = React.forwardRef(({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-zinc-700 bg-transparent hover:bg-zinc-800 text-white',
    secondary: 'bg-zinc-700 text-white hover:bg-zinc-600',
    ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-white',
    link: 'text-blue-500 underline-offset-4 hover:underline',
  };
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 text-sm',
    lg: 'h-11 px-8',
    icon: 'h-10 w-10',
  };
  return <button ref={ref} className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
});
Button.displayName = 'Button';
export { Button };
