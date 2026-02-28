import React from 'react';

const Badge = React.forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-blue-600 text-white',
    secondary: 'bg-zinc-700 text-white',
    destructive: 'bg-red-600 text-white',
    outline: 'border border-zinc-600 text-zinc-300',
  };
  return <div ref={ref} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`} {...props} />;
});
Badge.displayName = 'Badge';
export { Badge };
