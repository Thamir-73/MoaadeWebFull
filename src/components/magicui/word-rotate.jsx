"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function WordRotate({
  words,
  durations, // New prop for individual word durations
  start = true,
  framerProps = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!start) return;

    const rotateWord = () => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    };

    const timer = setTimeout(rotateWord, durations[index]);

    return () => clearTimeout(timer);
  }, [index, words, durations, start]);

  return (
    <div className="overflow-hidden py-2">
      <AnimatePresence mode="wait">
        <motion.h1 key={words[index]} className={cn(className)} {...framerProps}>
          {words[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}