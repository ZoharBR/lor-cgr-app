import React from 'react';

const AlertDialog = ({ children, open, onOpenChange }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={() => onOpenChange(false)} />
      <div className="relative z-50">{children}</div>
    </div>
  );
};

const AlertDialogContent = React.forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`relative grid w-full max-w-md gap-4 border border-zinc-800 bg-zinc-900 p-6 shadow-lg rounded-lg ${className}`} {...props} />
));
AlertDialogContent.displayName = 'AlertDialogContent';

const AlertDialogHeader = ({ className = '', ...props }) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`} {...props} />
);

const AlertDialogTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h2 ref={ref} className={`text-lg font-semibold text-white ${className}`} {...props} />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef(({ className = '', ...props }, ref) => (
  <p ref={ref} className={`text-sm text-zinc-400 ${className}`} {...props} />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

const AlertDialogFooter = ({ className = '', ...props }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`} {...props} />
);

const AlertDialogAction = React.forwardRef(({ className = '', ...props }, ref) => (
  <button ref={ref} className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 text-white ${className}`} {...props} />
));
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef(({ className = '', ...props }, ref) => (
  <button ref={ref} className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white ${className}`} {...props} />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';

export { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel };
