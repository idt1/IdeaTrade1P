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

  const isUnlocked =
    !project.premium || isMember || unlockedList.includes(project.id);

  /* ===== Card Background ===== */
  const cardBackground =
    project.premium && isUnlocked
      ? "bg-[#403000]"
      : "bg-[#666666]";

  /* ===== Icon Style ===== */
  const iconStyle = project.external
    ? "bg-sky-600 border-sky-500"
    : project.premium
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
        rounded-xl p-5
        flex flex-col gap-3
        border border-transparent
        hover:border-gray-500
        hover:-translate-y-1
        transition-all duration-200
        h-full
      `}
    >
      {/* ===== Header ===== */}
      <div className="flex items-center gap-3">
        <div
          className={`
            w-10 h-10 rounded-full shrink-0
            flex items-center justify-center
            text-white
            shadow-sm
            border-2
            ${iconStyle}
          `}
        >
          {project.external ? (
            <span className="text-lg font-bold">↗</span>
          ) : project.premium ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <span className="text-lg">🚀</span>
          )}
        </div>

        <h3 className="text-lg font-bold text-white text-left m-0">
          {project.name}
          {project.premium && (
            <span className="text-[#cca300] text-sm ml-2"></span>
          )}
        </h3>
      </div>

      {/* ===== Description ===== */}
      <p className="text-[#a0a0a0] text-sm leading-relaxed text-left flex-grow">
        {project.desc}
      </p>

      {/* ===== Action Button ===== */}
      <button
        onClick={handleClick}
        className={`
          w-full py-2.5 rounded-lg
          font-semibold text-sm tracking-wide
          transition shadow-md mt-2
          ${
            project.external
              ? "bg-sky-600 hover:bg-sky-500 text-white"
              : project.premium
                ? "bg-[#cca300] hover:bg-[#b38f00] text-white"
                : "bg-gray-600 hover:bg-gray-500 text-white"
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