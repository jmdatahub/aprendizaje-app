"use client";

import React, { Suspense } from "react";
import { UnifiedTutorChat } from "@/features/chat/components/UnifiedTutorChat";
import Link from "next/link";

export default function AprenderPage() {
  return (
    <div className="flex h-screen w-full flex-col bg-white overflow-hidden">
      <Suspense fallback={<div className="flex items-center justify-center h-full">Cargando chat...</div>}>
        <div className="flex-1 h-full relative">
          <UnifiedTutorChat 
              onClose={() => window.location.href = '/'} 
          />
        </div>
      </Suspense>
    </div>
  );
}
