import React, { useState, useRef, useEffect } from "react";
import hintIcon from "@/assets/icons/hint.svg";
import hintHoverIcon from "@/assets/icons/hinthover.svg";

/**
 * ToolHint Component - แสดง popover เมื่อคลิก icon
 * @param {React.ReactNode} children - Content ที่จะแสดงใน popover (รองรับ JSX)
 * @param {function} onViewDetails - callback เมื่อคลิก "View feature details here"
 */
export default function ToolHint({ children, onViewDetails }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);

  // เก็บ State สำหรับตำแหน่ง, ความกว้าง และรูปแบบ (top, left, right)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 320 });
  const [pointerConfig, setPointerConfig] = useState({ type: "left", offset: 0 });
  const [animClass, setAnimClass] = useState("popoverSlideIn");

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const isMobile = vw < 640;

      let top, left, width, type, offset, anim;

      if (isMobile) {
        // 📱 โหมดมือถือ: ให้กล่องอยู่ "ด้านล่างปุ่ม" กว้างเกือบเต็มจอ
        width = vw - 32;
        left = 16;
        top = rect.bottom + 12;
        type = "top";
        anim = "popoverSlideDown";

        // คำนวณ offset ของลูกศรให้ตรงกับจุดกึ่งกลางปุ่ม
        const btnCenter = rect.left + rect.width / 2;
        offset = btnCenter - left;
      } else {
        // 💻 โหมด PC: พยายามเปิดด้านขวาเสมอ
        width = 320;
        left = rect.right + 12;
        top = rect.top - 8;
        type = "left";
        anim = "popoverSlideIn";

        // ถ้าระยะขวาล้นจอ ย้ายไปเปิดด้านซ้าย
        if (left + width > vw - 16) {
          left = rect.left - width - 12;
          type = "right";
          anim = "popoverSlideInRight";
        }
      }

      setPointerConfig({ type, offset });
      setPopoverPos({ top, left, width });
      setAnimClass(anim);
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsHovered(false);
  };

  // ปิดอัตโนมัติเมื่อไถหน้าจอกราฟ
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false);
      window.addEventListener("scroll", handleScroll, true);
      return () => window.removeEventListener("scroll", handleScroll, true);
    }
  }, [isOpen]);

  // ฟังก์ชันคำนวณ clip-path สำหรับวาดรูปร่างกล่องพร้อมลูกศร
  const getClipPath = () => {
    const arrowWidth = 14; // ความกว้างฐานลูกศร
    const arrowHeight = 8; // ความสูงลูกศร

    if (pointerConfig.type === "top") {
      const cx = pointerConfig.offset;
      return `polygon(
        0% ${arrowHeight}px,
        ${cx - arrowWidth / 2}px ${arrowHeight}px,
        ${cx}px 0%,
        ${cx + arrowWidth / 2}px ${arrowHeight}px,
        100% ${arrowHeight}px,
        100% 100%,
        0% 100%
      )`;
    } else if (pointerConfig.type === "left") {
      return `polygon(
        ${arrowHeight}px 0%,
        100% 0%,
        100% 100%,
        ${arrowHeight}px 100%,
        ${arrowHeight}px 24px,
        0% 16px,
        ${arrowHeight}px 8px
      )`;
    } else if (pointerConfig.type === "right") {
      return `polygon(
        0% 0%,
        calc(100% - ${arrowHeight}px) 0%,
        calc(100% - ${arrowHeight}px) 8px,
        100% 16px,
        calc(100% - ${arrowHeight}px) 24px,
        calc(100% - ${arrowHeight}px) 100%,
        0% 100%
      )`;
    }
    return "none";
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
        <img
          src={isOpen || isHovered ? hintHoverIcon : hintIcon}
          alt="hint"
          className="w-4.5 h-4.5 object-contain"
        />
      </button>

      {/* Popover Backdrop */}
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
            width: `${popoverPos.width}px`,
            animation: `${animClass} 0.2s ease-out forwards`,
            // ใช้ drop-shadow เพื่อให้เงาวาดตามรูปทรงของ clip-path
            filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.6))",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* กล่องหลักที่มีรูปร่างตาม clip-path */}
          <div
            className="w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md relative"
            style={{
              clipPath: getClipPath(),
              // เพิ่ม padding ตามทิศทางของลูกศร
              paddingTop: pointerConfig.type === "top" ? "20px" : "16px",
              paddingBottom: "16px",
              paddingLeft: pointerConfig.type === "left" ? "24px" : "20px",
              paddingRight: pointerConfig.type === "right" ? "24px" : "20px",
            }}
          >
            {/* เส้นขอบจำลอง (เนื่องจาก clip-path จะตัดเส้นขอบจริงออก) */}
            <div className="absolute inset-0 border border-slate-600/50 rounded-xl mix-blend-overlay pointer-events-none" />

            <div className="relative z-20">
              {typeof children === "string" ? (
                <p className="text-slate-300 text-xs leading-relaxed mb-4">
                  {children}
                </p>
              ) : (
                <div className="mb-4 text-slate-300 text-xs leading-relaxed">
                  {children}
                </div>
              )}

              {/* View Details Link */}
              {onViewDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                    onViewDetails();
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes popoverSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes popoverSlideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes popoverSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}