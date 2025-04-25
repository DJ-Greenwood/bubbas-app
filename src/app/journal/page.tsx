"use client";
import Journal from "@/components/JournalChat/JournalChat";
import RequireAuth from "@/components/RequiredAuth/RequiredAuth";


export default function JournalPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Journal with Bubba</h1>
      
        <Journal />
      </div>
    </RequireAuth>
  );
}