"use client";

import { X, Link as LinkIcon, Share2 } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { useEffect, useState } from "react";

interface ShareMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postTitle?: string;
  onInternalShare?: () => void;
}

export function ShareMenuModal({ isOpen, onClose, postId, postTitle, onInternalShare }: ShareMenuModalProps) {
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/post/${postId}`);
    }
  }, [postId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Link in die Zwischenablage kopiert!");
    onClose();
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Schau dir diesen Beitrag auf HelloUni an:\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleInstagram = () => {
    // Da Instagram keine Web-Sharing-API für Beiträge hat, kopieren wir den Link und öffnen Instagram
    navigator.clipboard.writeText(shareUrl).catch(console.error);
    
    // Auf Mobilgeräten versucht "instagram://" die App zu öffnen. Auf Desktop/Fallback "https://instagram.com"
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = "instagram://app";
      // Fallback nach kurzer Zeit, falls App nicht installiert ist
      setTimeout(() => {
        window.open("https://www.instagram.com", "_blank", "noopener,noreferrer");
      }, 500);
    } else {
      window.open("https://www.instagram.com", "_blank", "noopener,noreferrer");
    }
    
    onClose();
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle || 'Beitrag auf HelloUni',
          text: 'Schau dir diesen Beitrag auf HelloUni an!',
          url: shareUrl,
        });
        onClose();
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-[80] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 z-[80] flex flex-col bg-white rounded-t-3xl transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 1rem)"
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Beitrag teilen</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-y-6 gap-x-2 pb-8">
          {onInternalShare && (
            <button 
              onClick={() => {
                onClose();
                onInternalShare();
              }}
              className="flex flex-col items-center gap-2 group w-full"
            >
              <div className="w-14 h-14 rounded-full bg-[#D08945] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
                <img src="/logo2.svg" alt="HelloUni" className="w-7 h-7 object-contain brightness-0 invert" />
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight">In HelloUni</span>
            </button>
          )}

          <button 
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-2 group w-full"
          >
            <div className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <FaWhatsapp size={28} />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight">WhatsApp</span>
          </button>
          
          <button 
            onClick={handleInstagram}
            className="flex flex-col items-center gap-2 group w-full"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <FaInstagram size={28} />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Instagram</span>
          </button>
          
          <button 
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-2 group w-full"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <LinkIcon size={24} />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Kopieren</span>
          </button>
          
          <button 
            onClick={handleSystemShare}
            className="flex flex-col items-center gap-2 group w-full"
          >
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <Share2 size={24} />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight">Mehr</span>
          </button>
        </div>
      </div>
    </>
  );
}
