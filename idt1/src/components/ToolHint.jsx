import React, { useState, useRef, useEffect } from "react";
import hintIcon from "@/assets/icons/hint.svg";
import hintHoverIcon from "@/assets/icons/hinthover.svg";

/**
 * ToolHint Component - แสดง popover เมื่อคลิก icon
 * @param {React.ReactNode} children - Content ที่จะแสดงใน popover
 * @param {function} onViewDetails - callback เมื่อคลิก "View feature details here"
 */
export default function ToolHint({ children, onViewDetails }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);

  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 320 });
  const [pointerConfig, setPointerConfig] = useState({ type: "left", offset: 0 });
  const [animClass, setAnimClass] = useState("popoverSlideIn");

  const POPOVER_H_ESTIMATE = 140; // px — ประมาณความสูง popover เพื่อป้องกัน overflow

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;

      let top, left, width, type, offset, anim;

      if (isMobile) {
        // 📱 มือถือ: เปิดด้านล่างปุ่ม
        width  = vw - 32;
        left   = 16;
        top    = rect.bottom + 12;
        type   = "top";
        anim   = "popoverSlideDown";
        const btnCenter = rect.left + rect.width / 2;
        offset = btnCenter - left;
      } else {
        // 💻 PC: เปิดด้านขวา (หรือซ้ายถ้าล้น)
        width = 320;
        left  = rect.right + 12;
        type  = "left";
        anim  = "popoverSlideIn";

        if (left + width > vw - 16) {
          left = rect.left - width - 12;
          type = "right";
          anim = "popoverSlideInRight";
        }

        // คำนวณ top — align กับปุ่ม แล้วกัน overflow
        top = rect.top - 8;

        // ป้องกันล้นลงล่าง
        if (top + POPOVER_H_ESTIMATE > vh - 8) {
          top = vh - POPOVER_H_ESTIMATE - 8;
        }
        // ป้องกันล้นขึ้นบน  ← แก้ไขหลัก
        if (top < 8) {
          top = 8;
        }

        offset = 0;
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

  // ปิดเมื่อ scroll
  useEffect(() => {
    if (isOpen) {
      const onScroll = () => setIsOpen(false);
      window.addEventListener("scroll", onScroll, true);
      return () => window.removeEventListener("scroll", onScroll, true);
    }
  }, [isOpen]);

  const getClipPath = () => {
    const arrowWidth  = 14;
    const arrowHeight = 8;

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

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={handleClose}
          style={{ cursor: "default" }}
        />
      )}

      {/* Popover */}
      {isOpen && (
        <div
          className="fixed z-[9999] pointer-events-auto"
          style={{
            top:    `${popoverPos.top}px`,
            left:   `${popoverPos.left}px`,
            width:  `${popoverPos.width}px`,
            animation: `${animClass} 0.2s ease-out forwards`,
            filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.6))",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md relative"
            style={{
              clipPath:      getClipPath(),
              paddingTop:    pointerConfig.type === "top"   ? "20px" : "16px",
              paddingBottom: "16px",
              paddingLeft:   pointerConfig.type === "left"  ? "24px" : "20px",
              paddingRight:  pointerConfig.type === "right" ? "24px" : "20px",
            }}
          >
            <div className="absolute inset-0 border border-slate-600/50 rounded-xl mix-blend-overlay pointer-events-none" />
            <div className="relative z-20">
              {typeof children === "string" ? (
                <p className="text-slate-300 text-xs leading-relaxed mb-4">{children}</p>
              ) : (
                <div className="mb-4 text-slate-300 text-xs leading-relaxed">{children}</div>
              )}
              {onViewDetails && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleClose(); onViewDetails(); }}
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 group"
                >
                  View feature details here
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popoverSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popoverSlideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes popoverSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
     import { InfoTooltip } from "@/components/ToolHint.jsx";
     <InfoTooltip text="Ctrl+คลิก เพื่อเพิ่มหุ้นเปรียบเทียบ" placement="bottom" />
───────────────────────────────────────────────────────────── */
export function InfoTooltip({ text = "ข้อมูลเพิ่มเติม", placement = "bottom" }) {
  const [show, setShow] = useState(false);

  const posMap = {
    top:    { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top:    "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    left:   { right:  "calc(100% + 6px)", top:  "50%", transform: "translateY(-50%)" },
    right:  { left:   "calc(100% + 6px)", top:  "50%", transform: "translateY(-50%)" },
  };
  const posStyle = posMap[placement] ?? posMap.bottom;

  // animation origin ตาม placement
  const animFrom = {
    top:    "translateX(-50%) translateY(4px)",
    bottom: "translateX(-50%) translateY(-4px)",
    left:   "translateY(-50%) translateX(4px)",
    right:  "translateY(-50%) translateX(-4px)",
  }[placement] ?? "translateX(-50%) translateY(-4px)";

  const animTo = {
    top:    "translateX(-50%) translateY(0)",
    bottom: "translateX(-50%) translateY(0)",
    left:   "translateY(-50%) translateX(0)",
    right:  "translateY(-50%) translateX(0)",
  }[placement] ?? "translateX(-50%) translateY(0)";

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {/* ⓘ circle */}
      <span style={{
        width: 16, height: 16,
        borderRadius: "50%",
        border: `1px solid ${show ? "#94a3b8" : "#475569"}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 10,
        color: show ? "#94a3b8" : "#475569",
        cursor: "default",
        userSelect: "none",
        transition: "border-color 0.15s, color 0.15s",
      }}>
        i
      </span>

      {/* tooltip bubble */}
      {show && (
        <span style={{
          position:   "absolute",
          ...posStyle,
          zIndex:     9999,
          background: "#0d1b2a",
          border:     "1px solid rgba(255,255,255,0.12)",
          borderRadius: 6,
          padding:    "5px 10px",
          fontSize:   11,
          color:      "#94a3b8",
          fontFamily: "monospace",
          whiteSpace: "nowrap",
          boxShadow:  "0 4px 16px rgba(0,0,0,0.5)",
          pointerEvents: "none",
          animation:  "infoTooltipIn 0.12s ease-out forwards",
        }}>
          {text}
          <style>{`
            @keyframes infoTooltipIn {
              from { opacity: 0; transform: ${animFrom}; }
              to   { opacity: 1; transform: ${animTo}; }
            }
          `}</style>
        </span>
      )}
    </span>
  );
}