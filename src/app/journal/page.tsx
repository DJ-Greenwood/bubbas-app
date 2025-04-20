"use client";
import Journal from "@/components/Journal";

export default function JournalPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Journal</h1>
      <Journal />
    </div>
  );
}