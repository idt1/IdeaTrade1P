import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import { useSubscription } from "@/context/SubscriptionContext"; 
// 🟢 อิมพอร์ต useAuth เข้ามาเพื่อดึงข้อมูลจาก Firestore
import { useAuth } from "@/context/AuthContext"; 

import { auth } from "@/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";

import logo from "@/assets/images/logo.png";
import ToggleIcon from "@/assets/icons/Vector.svg";

/* ================= ICONS ================= */
import preview from "@/assets/icons/preview.svg";
import apreview from "@/assets/icons/apreview.svg";
import mit from "@/assets/icons/mit.svg";
import amit from "@/assets/icons/amit.svg";
import fortune from "@/assets/icons/fortune.svg";
import afortune from "@/assets/icons/afortune.svg";
import petroleum from "@/assets/icons/petroleum.svg";
import apetroleum from "@/assets/icons/apetroleum.svg";
import rubber from "@/assets/icons/rubber.svg";
import arubber from "@/assets/icons/arubber.svg";
import flow from "@/assets/icons/flow.svg";
import aflow from "@/assets/icons/aflow.svg";
import s50 from "@/assets/icons/s50.svg";
import as50 from "@/assets/icons/as50.svg";
import gold from "@/assets/icons/gold.svg";
import agold from "@/assets/icons/agold.svg";
import bidask from "@/assets/icons/bidask.svg";
import abidask from "@/assets/icons/abidask.svg";
import tickmatch from "@/assets/icons/tickmatch.svg";
import atickmatch from "@/assets/icons/atickmatch.svg";
import dr from "@/assets/icons/dr.svg";
import adr from "@/assets/icons/adr.svg";
import signinIcon from "@/assets/icons/signin.svg";
import signupIcon from "@/assets/icons/signup.svg";
import realflow1 from "@/assets/icons/realflow1.svg";
import realflowGray from "@/assets/icons/realflow_gray.svg";
import chartFlipId from "@/assets/icons/chartfilp.svg";
import chartFlipIdGray from "@/assets/icons/chartfilpg.svg";
import ideatradepoint from "@/assets/icons/ideatradepoint.svg";
import sectorrotation from "@/assets/icons/sector.svg";

/* ================= ICON MAP ================= */
const sidebarIcons = {
  preview:   { default: preview,   active: apreview   },
  mit:       { default: mit,       active: amit       },
  fortune:   { default: fortune,   active: afortune   },
  petroleum: { default: petroleum, active: apetroleum },
  rubber:    { default: rubber,    active: arubber    },
  flow:      { default: flow,      active: aflow      },
  realflow:  { default: realflowGray, active: realflow1 },
  chartflipid: { default: chartFlipIdGray, active: chartFlipId },
  s50:       { default: s50,       active: as50       },
  gold:      { default: gold,      active: agold      },
  bidask:    { default: bidask,    active: abidask    },
  tickmatch: { default: tickmatch, active: atickmatch },
  dr:        { default: dr,        active: adr        },
  ideatradepoint: { default: ideatradepoint, active: ideatradepoint },
  sectorrotation: { default: sectorrotation, active: sectorrotation },
};

const getIcon = (key, active) => {
  const icons = sidebarIcons[key];
  if (!icons) return null;
  return active ? icons.active : icons.default;
};

/* ================= PROJECTS CONFIGURATION ================= */
const projects = [
  { id: "fortune",   name: "Stock Fortune Teller", iconKey: "fortune"   },
  { id: "petroleum", name: "Petroleum",            iconKey: "petroleum" },
  { id: "rubber",    name: "Rubber Thai",          iconKey: "rubber"    },
  { id: "flow",      name: "Flow Intraday",        iconKey: "flow"      },
  { id: "s50",       name: "S50",                  iconKey: "s50"       },
  { id: "gold",      name: "Gold",                 iconKey: "gold"      },
  { id: "bidask",    name: "BidAsk",               iconKey: "bidask"    },
  { id: "tickmatch", name: "TickMatch",            iconKey: "tickmatch" },
  { id: "dr",        name: "DR",                   iconKey: "dr"        },
];

const PROJECT_PREVIEWS = {
  fortune:   "stock-fortune",
  petroleum: "petroleum-preview",
  rubber:    "RubberThai",
  flow:      "FlowIntraday",
  s50:       "S50",
  gold:      "Gold",
  bidask:    "BidAsk",
  tickmatch: "TickMatch",
  dr:        "DRInsight",
};

/* ================= INLINE ICONS ================= */
const CrownIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 pointer-events-none" fill={color}>
    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19H5V18H19V19Z" />
  </svg>
);

const ProfileIconSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const SettingsIconSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
  </svg>
);

const LogoutIconSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const DWIconSVG = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#ffffff" : "#9ca3af"}
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="3 17 7 11 11 14 15 8 21 12" />
    <line x1="3" y1="20" x2="21" y2="20" />
    <line x1="7" y1="11" x2="7" y2="20" strokeDasharray="2 2" strokeOpacity="0.4" />
    <line x1="15" y1="8" x2="15" y2="20" strokeDasharray="2 2" strokeOpacity="0.4" />
  </svg>
);

const ChartFlipIconSVG = ({ active }) => {
  const color = active ? "#ffffff" : "#9ca3af";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3V16C3 18.7614 5.23858 21 8 21H21" stroke={color} strokeWidth="1.2"/>
      <path d="M8 16.5C8 17.3284 7.32843 18 6.5 18C5.67157 18 5 17.3284 5 16.5C5 15.6716 5.67157 15 6.5 15C7.32843 15 8 15.6716 8 16.5Z" fill={color}/>
      <path d="M11 8.5C11 9.32843 10.3284 10 9.5 10C8.67157 10 8 9.32843 8 8.5C8 7.67157 8.67157 7 9.5 7C10.3284 7 11 7.67157 11 8.5Z" fill={color}/>
      <path d="M17 13.5C17 14.3284 16.3284 15 15.5 15C14.6716 15 14 14.3284 14 13.5C14 12.6716 14.6716 12 15.5 12C16.3284 12 17 12.6716 17 13.5Z" fill={color}/>
      <path d="M21 6.5C21 7.32843 20.3284 8 19.5 8C18.6716 8 18 7.32843 18 6.5C18 5.67157 18.6716 5 19.5 5C20.3284 5 21 5.67157 21 6.5Z" fill={color}/>
      <path d="M6.99847 15.5008L8.99962 9.49933M14.5 12.5L10.5012 8.9985M16 12.5L19 7.5" stroke={color} strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  );
};

/* ================= FLOATING TOOLTIP ================= */
const FloatingTooltip = ({ visible, top, text }) => {
  if (!visible) return null;
  return (
    <div
      style={{ top: top, left: 85 }} 
      className="fixed z-[10000] -translate-y-1/2 px-3 py-1.5 bg-[#333333] text-white text-[13px] rounded-md border border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.3)] pointer-events-none whitespace-nowrap"
    >
      <div className="absolute top-1/2 -left-1.5 -mt-1.5 border-t-[6px] border-b-[6px] border-r-[6px] border-transparent border-r-[#333333]"></div>
      {text}
    </div>
  );
};

/* ================= SIDEBAR INNER CONTENT ================= */
const SidebarContent = ({
  collapsed,
  setCollapsed,
  activePage,
  setActivePage,
  openProject,
  onMobileClose, 
  isMobile = false,
}) => {
  const navigate = useNavigate();
  
  const { accessData } = useSubscription();
  const { userData } = useAuth();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isMember, setIsMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [tooltipState, setTooltipState] = useState({ visible: false, top: 0, text: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      
      const hasOldPackages = Object.keys(accessData || {}).length > 0;
      const hasNewPackages = Object.keys(userData?.subscriptions || {}).length > 0;
      
      if (hasOldPackages || hasNewPackages) {
        setIsMember(true);
      } else {
        const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        setIsMember(savedProfile.role === "member" || savedProfile.role === "membership");
      }
    });
    return () => unsubscribe();
  }, [accessData, userData]);

  const isToolUnlocked = (id) => {
    const expireTimestamp = userData?.subscriptions?.[id.toLowerCase()] || accessData?.[id.toLowerCase()];
    if (!expireTimestamp) return false;
    
    let expireDate;
    try {
      expireDate = typeof expireTimestamp.toDate === 'function' 
        ? expireTimestamp.toDate() 
        : new Date(expireTimestamp);
    } catch (error) {
      expireDate = new Date(0); 
    }
    
    return expireDate > new Date(); 
  };

  /* ================= AUTH ACTIONS ================= */
  const handleSignUp = () => { navigate("/register"); onMobileClose?.(); };
  const handleSignIn = () => { navigate("/welcome"); onMobileClose?.(); };
  const handleSignOutClick = () => setShowLogoutModal(true);

  const confirmSignOut = async () => {
    try {
      await signOut(auth); 
      localStorage.removeItem("userProfile"); 
      setIsLoggedIn(false); 
      setIsMember(false);
      setShowLogoutModal(false);
      onMobileClose?.();
      navigate("/welcome");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleNavigation = (id, projectItem = null) => {
    let targetId = id;
    
    if (PROJECT_PREVIEWS[id] && !isToolUnlocked(id)) {
      targetId = PROJECT_PREVIEWS[id];
    }

    if (projectItem && openProject) {
      openProject({ ...projectItem, id: targetId });
    } else {
      setActivePage(targetId);
    }
    
    onMobileClose?.(); 
  };

  const handleDWNavigation = () => {
    navigate("/dw");
    setActivePage("dw");
    onMobileClose?.();
  };

  const handleChartFlipNavigation = () => {
    navigate("/chart-flip-id");
    setActivePage("chart-flip-id");
    onMobileClose?.();
  };

  const handleMouseEnter = (e, text) => {
    if (!collapsed || isMobile) return; 
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipState({ visible: true, top: rect.top + (rect.height / 2), text });
  };

  const handleMouseLeave = () => setTooltipState({ ...tooltipState, visible: false });

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCollapsed = isMobile ? false : collapsed;

  return (
    <>
      <FloatingTooltip visible={tooltipState.visible} top={tooltipState.top} text={tooltipState.text} />

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-[#1F2937] p-6 sm:p-8 rounded-lg shadow-2xl flex flex-col items-center gap-6 w-full max-w-[400px] border border-white/10">
            <h2 className="text-base sm:text-lg text-gray-200 font-medium text-center">
              Are you sure you want to log out?
            </h2>
            <div className="flex gap-3 sm:gap-4 w-full justify-center">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-5 sm:px-6 py-2 rounded bg-[#9CA3AF] text-white font-semibold hover:bg-gray-500 transition text-sm sm:text-base"
              >
                CANCEL
              </button>
              <button
                onClick={confirmSignOut}
                className="px-5 sm:px-6 py-2 rounded bg-[#EF4444] text-white font-semibold hover:bg-red-700 transition text-sm sm:text-base"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>,
        document.body 
      )}

      {/* HEADER & LOGO */}
      <div className={`flex items-center shrink-0 transition-all duration-300 ${isCollapsed ? "flex-col-reverse gap-6 mb-4" : "justify-between px-6 py-6"}`}>
        {!isCollapsed && <img src={logo} className="w-36 transition-opacity object-contain pointer-events-none" alt="logo" />}

        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`transition-all hover:opacity-100 p-1 rounded-full hover:bg-white/5 ${isCollapsed ? "opacity-60 rotate-180" : "opacity-60"}`}
          >
            <img src={ToggleIcon} className="w-4 pointer-events-none" alt="toggle" />
          </button>
        )}

        {isMobile && (
          <button
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* STATUS BADGES */}
      <div className={`flex shrink-0 transition-all duration-300 ${isCollapsed ? "flex-col gap-1 w-full px-2 mb-3" : "flex-row gap-2 px-6 mb-0"}`}>
        <div className={`font-bold rounded border text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center transition-all whitespace-nowrap overflow-hidden
          ${isCollapsed ? "text-[10px] py-1 w-full" : "text-[11px] px-2 py-1 rounded-full"}`}
        >
          {isCollapsed ? "ONLINE" : "STATUS: ONLINE"}
        </div>

        <div className={`font-bold rounded border flex items-center justify-center transition-all whitespace-nowrap overflow-hidden
          ${isMember ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" : "text-sky-400 border-sky-500/30 bg-sky-500/10"}
          ${isCollapsed ? "text-[10px] py-1 w-full" : "text-[11px] px-2 py-1 rounded-full"}`}
        >
          {isCollapsed ? (isMember ? "MEMBER" : "FREE") : (isMember ? "MEMBERSHIP" : "FREE ACCESS")}
        </div>
      </div>

      {/* MENU ITEMS */}
      <nav 
        className={`flex-1 no-scrollbar w-full ${
          isCollapsed 
            ? "px-2 flex flex-col items-center gap-2 overflow-y-auto" 
            : "px-3 mt-4 overflow-y-auto"
        }`}
      >
        
        {/* SEARCH BAR */}
        <div className={`transition-all duration-300 mb-2 ${isCollapsed ? "w-10" : "w-full"}`}>
          <div 
            onClick={() => isCollapsed && setCollapsed(false)}
            onMouseEnter={(e) => handleMouseEnter(e, "Search")}
            onMouseLeave={handleMouseLeave}
            className={`relative group flex items-center bg-[#1A1D23] border border-white/5 rounded-lg transition-all 
            ${isCollapsed ? "w-10 h-10 justify-center cursor-pointer hover:bg-white/10" : "w-full h-10 px-4"}`}
          >
            <svg className={`w-4 h-4 text-gray-500 shrink-0 ${!isCollapsed && "mr-4"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {!isCollapsed && (
              <input
                type="text"
                placeholder="Search Something..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-gray-300 text-[13px] placeholder-gray-600 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Preview Button */}
        <button
          onClick={() => handleNavigation("preview-projects")} 
          onMouseEnter={(e) => handleMouseEnter(e, "Preview Projects")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all cursor-pointer relative group
          ${activePage === "preview-projects" ? "bg-slate-800 text-white" : "hover:bg-white/5 text-gray-300"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 gap-3"}`}
        >
          <div className="relative flex items-center justify-center pointer-events-none">
            <img src={getIcon("preview", activePage === "preview-projects")} className="w-5" alt="preview" />
            {isCollapsed && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00ff47] rounded-full border-2 border-[#15181e]"></div>
            )}
          </div>
          {!isCollapsed && (
            <>
              <span className="pointer-events-none">Preview Projects</span>
              <div className="ml-auto w-2 h-2 bg-[#00ff47] rounded-full shadow-[0_0_5px_#00ff47]"></div>
            </>
          )}
        </button>

        {/* Beta Label */}
        {isCollapsed ? <div className="w-8 h-[1px] bg-white/10 my-1 shrink-0" /> : <div className="mt-6 mb-2 px-2 text-[11px] uppercase text-gray-500 shrink-0">Beta Tools</div>}

        {/* MIT Button */}
        <button
          onClick={() => handleNavigation("mit")} 
          onMouseEnter={(e) => handleMouseEnter(e, "MIT")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all relative group cursor-pointer
          ${activePage === "mit" ? "bg-slate-800 text-white" : "hover:bg-white/5 text-gray-300"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 justify-between"}`}
        >
          <div className={`flex items-center gap-3 pointer-events-none ${isCollapsed ? "justify-center w-full" : ""}`}>
            <img src={getIcon("mit", activePage === "mit")} className="w-5" alt="mit" />
            {!isCollapsed && <span>MIT</span>}
          </div>
          {isCollapsed ? (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 pointer-events-none"></span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400 text-black pointer-events-none">FREE</span>
          )}
        </button>

        {/* Member Label */}
        {isCollapsed ? <div className="w-8 h-[1px] bg-white/10 my-1 shrink-0" /> : <div className="mt-6 mb-2 px-2 text-[11px] uppercase text-gray-500 shrink-0">Membership Tools</div>}

        {/* Project List */}
        {filteredProjects.length > 0 ? (
          filteredProjects.map((p) => {
            const unlocked = isToolUnlocked(p.id);
            const active = activePage === p.id || PROJECT_PREVIEWS[p.id] === activePage;

            return (
              <button
                key={p.id}
                onClick={() => handleNavigation(p.id, p)}
                onMouseEnter={(e) => handleMouseEnter(e, p.name)}
                onMouseLeave={handleMouseLeave}
                className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
                ${active ? "bg-slate-800" : "hover:bg-white/5"}
                ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 justify-between"}`}
              >
                <div className={`flex items-center gap-3 font-medium transition-colors pointer-events-none
                  ${active 
                    ? (unlocked ? "text-[#ffcc00]" : "text-white") 
                    : (unlocked ? "text-[#977100]" : "text-gray-400")
                  }
                  ${isCollapsed ? "justify-center w-full" : ""}`}
                >
                  <img 
                    src={getIcon(p.iconKey, active)} 
                    className="w-5" 
                    alt={p.name}
                    style={
                      active 
                        ? (unlocked 
                          ? { filter: "brightness(0) saturate(100%) invert(87%) sepia(26%) saturate(6838%) hue-rotate(359deg) brightness(101%) contrast(103%)" }
                          : { filter: "brightness(0) invert(1)" } 
                        )
                        : (unlocked 
                          ? { filter: "brightness(0) saturate(100%) invert(43%) sepia(70%) saturate(2264%) hue-rotate(24deg) brightness(92%) contrast(101%)" } 
                          : {} 
                        )
                    }
                  />
                  {!isCollapsed && <span>{p.name}</span>}
                </div>
                {/* ✅ เปลี่ยนสีมงกุฎกลับมาเป็นสีทอง (#facc15) เสมอ ไม่ว่าปลดล็อกหรือไม่ */}
                {!isCollapsed && <CrownIcon color="#facc15" />}
              </button>
            );
          })
        ) : (
          !isCollapsed && <div className="text-gray-500 text-[12px] text-center mt-4">No projects found</div>
        )}

        {/* ================= HIDDEN PAGE SECTION ================= */}
        {isCollapsed
          ? <div className="w-8 h-[1px] bg-white/10 my-1 shrink-0" />
          : <div className="mt-6 mb-2 px-2 text-[11px] uppercase text-gray-500 shrink-0">hidden page</div>
        }

        {/* Real Flow Button */}
        <button
          onClick={() => handleNavigation("real-flow")}
          onMouseEnter={(e) => handleMouseEnter(e, "Real Flow")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
          ${activePage === "real-flow" ? "bg-slate-800" : "hover:bg-white/5"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 justify-between"}`}
        >
          <div className={`flex items-center gap-3 font-medium transition-colors pointer-events-none
            ${activePage === "real-flow" ? "text-white" : "text-gray-400"}
            ${isCollapsed ? "justify-center w-full" : ""}`}
          >
            <img
              src={getIcon("realflow", activePage === "real-flow")}
              className="w-5"
              alt="Real Flow"
              style={
                activePage === "real-flow"
                ? { filter: "brightness(0) invert(1)" }
                : { filter: "brightness(0) invert(1) opacity(0.4)" }
              }
            />
            {!isCollapsed && <span>Real Flow</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 pointer-events-none">
              NEW
            </span>
          )}
        </button>

        {/* ── Chart Flip ID Button ── */}
        <button
          onClick={handleChartFlipNavigation}
          onMouseEnter={(e) => handleMouseEnter(e, "Chart Flip ID")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
          ${activePage === "chart-flip-id" ? "bg-slate-800" : "hover:bg-white/5"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 justify-between"}`}
        >
          <div className={`flex items-center gap-3 font-medium transition-colors pointer-events-none
            ${activePage === "chart-flip-id" ? "text-white" : "text-gray-400"}
            ${isCollapsed ? "justify-center w-full" : ""}`}
          >
            <ChartFlipIconSVG active={activePage === "chart-flip-id"} />
            {!isCollapsed && <span>ChartFlip</span>}
          </div>
        </button>

        {/* ── DW Button ── */}
        <button
          onClick={handleDWNavigation}
          onMouseEnter={(e) => handleMouseEnter(e, "DW View")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
          ${activePage === "dw" ? "bg-slate-800" : "hover:bg-white/5"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 gap-3"}`}
        >
          <div className={`flex items-center gap-3 font-medium transition-colors pointer-events-none
            ${activePage === "dw" ? "text-white" : "text-gray-400"}
            ${isCollapsed ? "justify-center w-full" : ""}`}
          >
            <DWIconSVG active={activePage === "dw"} />
            {!isCollapsed && <span>DW</span>}
          </div>
        </button>

        {/* ── Idea Trade Point Button ── */}
        <button
          onClick={() => { navigate("/ideatradepoint"); setActivePage("ideatradepoint"); onMobileClose?.(); }}
          onMouseEnter={(e) => handleMouseEnter(e, "Idea Trade Point")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
          ${activePage === "ideatradepoint" ? "bg-slate-800" : "hover:bg-white/5"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 justify-between"}`}
        >
          <div className={`flex items-center gap-3 font-medium transition-colors pointer-events-none
            ${activePage === "ideatradepoint" ? "text-white" : "text-gray-400"}
            ${isCollapsed ? "justify-center w-full" : ""}`}
          >
            <img
              src={getIcon("ideatradepoint", activePage === "ideatradepoint")}
              className="w-5"
              alt="Idea Trade Point"
              style={
                activePage === "ideatradepoint"
                  ? { filter: "brightness(0) invert(1)" }
                  : { filter: "brightness(0) invert(1) opacity(0.4)" }
              }
            />
            {!isCollapsed && <span>IdeaTradePoint</span>}
          </div>
        </button>

        {/* ── Sector Rotation Button ── */}
        <button
          onClick={() => { navigate("/sector-rotation"); setActivePage("sectorrotation"); onMobileClose?.(); }}
          onMouseEnter={(e) => handleMouseEnter(e, "Sector Rotation")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
          ${activePage === "sectorrotation" ? "bg-slate-800" : "hover:bg-white/5"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 justify-between"}`}
        >
          <div className={`flex items-center gap-3 font-medium transition-colors pointer-events-none
            ${activePage === "sectorrotation" ? "text-white" : "text-gray-400"}
            ${isCollapsed ? "justify-center w-full" : ""}`}
          >
            <img
              src={getIcon("sectorrotation", activePage === "sectorrotation")}
              className="w-7"
              alt="Sector Rotation"
              style={
                activePage === "sectorrotation"
                  ? { filter: "brightness(0) invert(1)" }
                  : { filter: "brightness(0) invert(1) opacity(0.4)" }
              }
            />
            {!isCollapsed && <span>Sector Rotation</span>}
          </div>
        </button>


        {/* ACCOUNT SECTION */}
        {isCollapsed ? <div className="w-8 h-[1px] bg-white/10 my-1 shrink-0" /> : <div className="mt-6 mb-2 px-2 text-[11px] uppercase text-gray-500 shrink-0">Account</div>}

        <button
          onClick={() => handleNavigation("profile")}
          onMouseEnter={(e) => handleMouseEnter(e, "Profile")}
          onMouseLeave={handleMouseLeave}
          className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
          ${activePage === "profile" ? "bg-slate-800 text-white" : "hover:bg-white/5 text-gray-300"}
          ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 gap-3"}`}
        >
          <ProfileIconSVG />
          {!isCollapsed && <span className="pointer-events-none">Profile</span>}
        </button>

        {isLoggedIn && (
          <button
            onClick={() => {
              navigate("/manage-subscription"); 
              setActivePage("subscription"); 
              onMobileClose?.();
            }}
            onMouseEnter={(e) => handleMouseEnter(e, "Manage Subscription")}
            onMouseLeave={handleMouseLeave}
            className={`rounded-lg flex items-center shrink-0 transition-all mb-1 cursor-pointer relative group
            ${activePage === "subscription" ? "bg-slate-800 text-white" : "hover:bg-white/5 text-gray-300"}
            ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 gap-3"}`}
          >
            <SettingsIconSVG />
            {!isCollapsed && <span className="pointer-events-none">Manage Subscription</span>}
          </button>
        )}

        {isLoggedIn && (
          <button
            onClick={handleSignOutClick}
            onMouseEnter={(e) => handleMouseEnter(e, "Sign Out")}
            onMouseLeave={handleMouseLeave}
            className={`rounded-lg flex items-center shrink-0 transition-all mb-1 hover:bg-white/5 text-gray-300 cursor-pointer relative group
            ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 gap-3"}`}
          >
            <LogoutIconSVG />
            {!isCollapsed && <span className="pointer-events-none">Sign Out</span>}
          </button>
        )}

        {!isLoggedIn && (
          <>
            <button
              onClick={handleSignUp}
              onMouseEnter={(e) => handleMouseEnter(e, "Sign Up")}
              onMouseLeave={handleMouseLeave}
              className={`rounded-lg flex items-center shrink-0 transition-all mb-1 hover:bg-white/5 text-gray-300 cursor-pointer relative group
              ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 gap-3"}`}
            >
              <img src={signupIcon} alt="Sign Up" className="w-5 opacity-80 pointer-events-none" />
              {!isCollapsed && <span className="pointer-events-none">Sign Up</span>}
            </button>

            <button
              onClick={handleSignIn}
              onMouseEnter={(e) => handleMouseEnter(e, "Sign In")}
              onMouseLeave={handleMouseLeave}
              className={`rounded-lg flex items-center shrink-0 transition-all hover:bg-white/5 text-gray-300 cursor-pointer relative group
              ${isCollapsed ? "w-10 h-10 justify-center" : "w-full h-11 px-4 gap-3"}`}
            >
              <img src={signinIcon} alt="Sign In" className="w-5 opacity-80 pointer-events-none" />
              {!isCollapsed && <span className="pointer-events-none">Sign In</span>}
            </button>
          </>
        )}

        <div className="h-10 shrink-0" />
      </nav>

      {/* FOOTER */}
      <div className="px-2 pb-2 w-full flex justify-center shrink-0">
        <button
          onClick={() => { 
            navigate("/premium-tools"); 
            onMobileClose?.(); 
          }}
          onMouseEnter={(e) => handleMouseEnter(e, "Join Membership")}
          onMouseLeave={handleMouseLeave}
          className={`flex items-center justify-center transition-all shadow-lg overflow-hidden shrink-0 cursor-pointer relative group
          ${isCollapsed 
            ? "w-10 h-10 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400" 
            : "w-full h-11 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-semibold gap-2"}`}
        >
          <CrownIcon color="#000" />
          {!isCollapsed && <span className="whitespace-nowrap pointer-events-none">Join Membership</span>}
        </button>
      </div>
    </>
  );
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  activePage,
  setActivePage,
  openProject,
  mobileOpen,        
  onMobileClose,     
}) {
  const sharedProps = { collapsed, setCollapsed, activePage, setActivePage, openProject };

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.1s ease-out; }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <aside
        className={`
          hidden md:flex flex-col h-screen shrink-0
          bg-gradient-to-b from-[#0c0f14] to-[#0a0d11]
          border-r border-white/10
          transition-all duration-300
          ${collapsed ? "w-[80px] items-center py-4" : "w-[280px] overflow-hidden"}
        `}
      >
        <SidebarContent {...sharedProps} onMobileClose={null} isMobile={false} />
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          md:hidden fixed top-0 left-0 h-full z-50
          w-[280px] flex flex-col
          bg-gradient-to-b from-[#0c0f14] to-[#0a0d11]
          border-r border-white/10
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent
          {...sharedProps}
          onMobileClose={onMobileClose}
          isMobile={true}
        />
      </aside>
    </>
  );
}