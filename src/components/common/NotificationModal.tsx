import React from 'react';
import { X, Bell, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotifsRead, setCurrentScreen, setActiveTrackingOrderId } = useData();

  if (!isOpen) return null;

  const handleItemClick = (n: any) => {
    if (n.type === 'order') {
      setActiveTrackingOrderId('ED20261114');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        <div className="bg-brand-red p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <h3 className="font-bold text-base">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Recent Activity</span>
          <button
            onClick={markNotifsRead}
            className="text-brand-red font-semibold hover:underline"
          >
            Mark all as read
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-3 rounded-xl border transition cursor-pointer active-press ${
                n.read ? 'bg-white border-slate-200' : 'bg-red-50/60 border-red-200 shadow-sm'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <div className="mt-0.5">
                  {n.type === 'order' ? (
                    <div className="w-7 h-7 rounded-full bg-red-100 text-brand-red flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{n.title}</h4>
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
