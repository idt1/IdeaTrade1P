import React, { useState, useRef } from "react";
import hintIcon from "@/assets/icons/hint.svg";
import hintHoverIcon from "@/assets/icons/hinthover.svg";

/**
 * ToolHint Component - แสดง popover เมื่อคลิก icon
 * @param {string} description - คำอธิบายของ tool (ภาษาไทย)
 * @param {function} onViewDetails - callback เมื่อคลิก "View feature details here"
 */
export default function ToolHint({ description, onViewDetails }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.top - 8,
        left: rect.right + 12,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsHovered(false);
  };

  return (
    <>
      {/* Hint Icon Button */}
      <button
        ref={buttonRef}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 flex-shrink-0 pointer-events-auto"
        onClick={handleButtonClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isOpen && setIsHovered(false)}
        title="View tool information"
      >
        {/* แสดง icon ตามสถานะ */}
        <img
        src={isOpen || isHovered ? hintHoverIcon : hintIcon}
        alt="hint"
        className="w-4.5 h-4.5 object-contain"
        style={{
            filter: isOpen || isHovered ? "drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))" : "none",
        }}
        />
      </button>

      {/* Popover Backdrop (ปิด popover เมื่อคลิกที่อื่น) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={handleClose}
          style={{ cursor: "default" }}
        />
      )}

      {/* Popover Content */}
      {isOpen && (
        <div
          className="fixed z-[9999] pointer-events-auto"
          style={{
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            animation: "popoverSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/80 rounded-lg shadow-2xl backdrop-blur-md w-[300px]">
            {/* Content */}
            <div className="px-5 py-4">
              {/* Description */}
              <p className="text-slate-300 text-xs leading-relaxed mb-4">
                {description}
              </p>

              {/* View Details Link */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                  onViewDetails && onViewDetails();
                }}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 group"
              >
                View feature details here
                <svg
                  className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Arrow Pointer */}
            <div
              className="absolute w-3 h-3 bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-l border-t border-slate-700/80 pointer-events-none"
              style={{
                left: "-6px",
                top: "23px",
                transform: "rotate(45deg)",
              }}
            />
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes popoverSlideIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}