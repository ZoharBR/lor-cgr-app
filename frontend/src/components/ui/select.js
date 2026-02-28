import React, { useState, useRef, useEffect } from 'react';

const Select = ({ children, value, onValueChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return <div ref={ref} className="relative">{React.Children.map(children, child => React.cloneElement(child, { value, onValueChange, open, setOpen }))}</div>;
};

const SelectTrigger = React.forwardRef(({ className = '', value, onValueChange, open, setOpen, children, ...props }, ref) => (
  <button ref={ref} type="button" onClick={() => setOpen(!open)} className={`flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>
    {children}
    <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
  </button>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = ({ placeholder, value }) => <span className={value ? '' : 'text-zinc-500'}>{value || placeholder}</span>;

const SelectContent = React.forwardRef(({ className = '', children, open, onValueChange, setOpen, ...props }, ref) => {
  if (!open) return null;
  return (
    <div ref={ref} className={`absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-700 bg-zinc-800 p-1 text-white shadow-lg ${className}`} {...props}>
      {React.Children.map(children, child => React.cloneElement(child, { onValueChange, setOpen }))}
    </div>
  );
});
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef(({ className = '', children, value, onValueChange, setOpen, ...props }, ref) => (
  <div ref={ref} className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-zinc-700 focus:bg-zinc-700 ${className}`} onClick={() => { onValueChange(value); setOpen(false); }} {...props}>{children}</div>
));
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
