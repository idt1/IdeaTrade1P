// src/components/ToolCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function ToolsCard({
  project,
  isMember = false,
  unlockedList = [],
}) {
  const navigate = useNavigate();

  if (!project) return null;

  // 🔥 หัวใจสำคัญ: เช็คสิทธิ์การปลดล็อกรายเครื่องมือ
  // isUnlocked จะเป็น true ก็ต่อเมื่อ:
  // 1. เป็นเครื่องมือฟรี (ไม่ premium)
  // 2. มีชื่ออยู่ใน unlockedList (ผ่านการเช็ควันหมดอายุจากหน้าหลักแล้ว)
  // 3. หรือค่า isMember ที่ส่งตรงมาจากหน้าหลักเป็น true
  const isUnlocked = !project.premium || unlockedList.includes(project.id) || isMember;

  /* ===== Card Background ===== */
  // ใช้สีเดิมของคุณ: ทอง [#403000] เมื่อปลดล็อกแล้ว, เทา [#666666] เมื่อยังไม่ปลดล็อกหรือหมดอายุ
  const cardBackground =
    project.premium && isUnlocked
      ? "bg-[#403000]"
      : "bg-[#666666]";

  /* ===== Icon Style ===== */
  // ใช้สีทอง [#cca300] เฉพาะเมื่อเป็น premium และยังไม่หมดอายุ (isUnlocked)
  const iconStyle = project.external
    ? "bg-sky-600 border-sky-500"
    : project.premium && isUnlocked
      ? "bg-[#cca300] border-[#b38f00]"
      : "bg-gray-500 border-gray-400";

  const handleClick = () => {
    if (project.external && project.url) {
      window.open(project.url, "_blank");
      return;
    }

    if (isUnlocked) {
      navigate(`/${project.id}`);
    } else {
      navigate("/member-register");
    }
  };

  return (
    <div
      className={`
        ${cardBackground}
        rounded-xl p-6
        flex flex-col gap-4
        border border-transparent
        hover:border-gray-500
        hover:-translate-y-1
        transition-all duration-200
      `}
    >
      {/* ===== Header ===== */}
      <div className="flex items-center gap-4">
        <div
          className={`
            w-12 h-12 rounded-full
            flex items-center justify-center
            text-white
            shadow-sm
            border-2
            ${iconStyle}
          `}
        >
          {project.external ? (
            <span className="text-xl font-bold">↗</span>
          ) : project.premium ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <span className="text-xl">🚀</span>
          )}
        </div>

        <h3 className="text-xl font-bold text-white">
          {project.name}
        </h3>
      </div>

      {/* ===== Description ===== */}
      <p className="text-[#a0a0a0] text-sm leading-relaxed flex-grow">
        {project.desc}
      </p>

      {/* ===== Action Button ===== */}
      <button
        onClick={handleClick}
        className={`
          w-full py-2.5 rounded-full
          font-semibold
          transition shadow-md
          ${
            project.external
              ? "bg-sky-600 hover:bg-sky-500 text-white"
              : isUnlocked // ✅ ปุ่มจะเป็นสีทอง/สีหลัก เฉพาะเมื่อยังไม่หมดอายุเท่านั้น
                ? (project.premium ? "bg-[#cca300] hover:bg-[#b38f00] text-white" : "bg-gray-600 hover:bg-gray-500 text-white")
                : "bg-gray-700 hover:bg-gray-800 text-gray-400" // สีปุ่มเมื่อล็อค/หมดอายุ
          }
        `}
      >
        {project.external
          ? "OPEN EXTERNAL ↗"
          : isUnlocked
            ? "OPEN TOOL"
            : "JOIN MEMBERSHIP"}
      </button>
    </div>
  );
}