import React from 'react';

// 1. COMPONENT ICON (Sử dụng SVG để vẽ biểu tượng)
export const Icon = ({ name, size = 18, className = "" }) => {
  const icons = {
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>,
    edit: <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    chain: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    audit: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
    assign: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></>
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {icons[name]}
    </svg>
  );
};

// 2. COMPONENT BADGE (Thẻ màu trạng thái)
export const Badge = ({ status }) => {
  const map = {
    active: { label: "Hoạt động", cls: "bg-emerald-100 text-emerald-700" },
    inactive: { label: "Ngừng HĐ", cls: "bg-slate-100 text-slate-500" },
    done: { label: "Hoàn thành", cls: "bg-blue-100 text-blue-700" },
    waiting: { label: "Chờ khám", cls: "bg-amber-100 text-amber-700" },
    on_leave: { label: "Nghỉ phép", cls: "bg-amber-100 text-amber-700" },
    in_progress: { label: "Đang khám", cls: "bg-purple-100 text-purple-700" },
    scheduled: { label: "Đã lên lịch", cls: "bg-indigo-100 text-indigo-700" },
    skipped: { label: "Qua lượt", cls: "bg-orange-100 text-orange-700" }
  };
  const { label, cls } = map[status] || map.inactive;
  return <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
};

// 3. COMPONENT MODAL (Popup nổi bật lên giữa màn hình)
export const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">✕</button>
      </div>
      <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

// 4. COMPONENT FIELD & INPUT DÙNG TRONG FORM
export const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">{label}</label>
    {children}
  </div>
);
export const Input = (props) => <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700" {...props} />;
export const Select = ({ options, ...props }) => (
  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700" {...props}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);