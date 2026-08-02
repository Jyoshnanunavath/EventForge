import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, description, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-card animate-scale-in flex flex-col max-h-[90vh]', sizes[size])}>
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-neutral-100">
            <div>
              {title && <h2 className="text-lg font-bold text-neutral-900">{title}</h2>}
              {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-6 pt-4 border-t border-neutral-100 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
