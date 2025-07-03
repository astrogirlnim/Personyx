/**
 * Evidence Score Gauge Component
 *
 * Displays evidence scores with animated SVG ring gauge and Score Pulse animation.
 * Implements the Evidence Gate Design System with proper accessibility.
 */

import React, { useEffect, useState, useRef } from 'react';

interface EvidenceScoreGaugeProps {
  /** Evidence score between 0-100, or null for empty state */
  score: number | null;
  /** Optional className for styling customization */
  className?: string;
}

export function EvidenceScoreGauge({
  score,
  className = '',
}: EvidenceScoreGaugeProps): JSX.Element {
  // 🐛 DEBUG: Log incoming score prop details
  console.log(
    '🎯 EvidenceScoreGauge: Incoming prop analysis',
    JSON.stringify(
      {
        score,
        scoreType: typeof score,
        scoreValue: score,
        isNull: score === null,
        isUndefined: score === undefined,
        isNaN: score !== null ? Number.isNaN(score) : 'N/A',
        scoreString: String(score),
        scoreJSON: JSON.stringify(score),
      },
      null,
      2
    )
  );

  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [shouldPulse, setShouldPulse] = useState(false);
  const prevScoreRef = useRef<number | null>(null);

  // Handle score changes and trigger pulse animation
  useEffect(() => {
    const prevScore = prevScoreRef.current;

    console.log(
      '🎯 EvidenceScoreGauge: Score update triggered',
      JSON.stringify(
        {
          newScore: score,
          prevScore,
          displayScore,
          shouldTriggerPulse:
            score !== null && score !== prevScore && prevScore !== null,
        },
        null,
        2
      )
    );

    // Only trigger pulse on non-null score changes (not initial load)
    if (score !== null && score !== prevScore && prevScore !== null) {
      console.log(
        '🎯 EvidenceScoreGauge: Triggering pulse animation',
        JSON.stringify(
          {
            from: prevScore,
            to: score,
          },
          null,
          2
        )
      );
      setShouldPulse(true);
      // Remove pulse class after animation completes
      const timer = setTimeout(() => {
        setShouldPulse(false);
        console.log('🎯 EvidenceScoreGauge: Pulse animation completed');
      }, 400);
      return () => clearTimeout(timer);
    }

    prevScoreRef.current = score;
    setDisplayScore(score);

    console.log(
      '🎯 EvidenceScoreGauge: Updated display score',
      JSON.stringify(
        {
          displayScore: score,
          prevScoreRef: prevScoreRef.current,
        },
        null,
        2
      )
    );
  }, [score, displayScore]);

  // Determine score color class based on value
  const getScoreColorClass = (scoreValue: number | null): string => {
    if (scoreValue === null) return 'text-graphite dark:text-graphite-dark';
    if (scoreValue >= 80) return 'text-persona dark:text-persona-dark';
    if (scoreValue >= 60)
      return 'text-caution-amber dark:text-caution-amber-dark';
    return 'text-risk-red dark:text-risk-red-dark';
  };

  // Calculate stroke-dasharray and stroke-dashoffset for animated arc
  const radius = 70; // SVG circle radius
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset =
    displayScore !== null
      ? circumference - (displayScore / 100) * circumference
      : circumference;

  // Check for reduced motion preference
  const respectsReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  console.log(
    '🎯 EvidenceScoreGauge: Rendering',
    JSON.stringify(
      {
        score,
        displayScore,
        shouldPulse,
        strokeDashoffset,
        colorClass: getScoreColorClass(displayScore),
      },
      null,
      2
    )
  );

  return (
    <div className={`relative ${className}`}>
      {/* Ring Gauge SVG */}
      <div
        className="mx-auto relative"
        style={{
          width: 'var(--dr-ring-gauge-size)',
          height: 'var(--dr-ring-gauge-size)',
        }}
      >
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 160 160"
          aria-hidden="true"
        >
          {/* Background circle (dashed when empty) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-graphite dark:text-graphite-dark opacity-30"
            strokeDasharray={displayScore === null ? '10 5' : 'none'}
          />

          {/* Animated score arc */}
          {displayScore !== null && (
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className={getScoreColorClass(displayScore)}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: respectsReducedMotion
                  ? 'none'
                  : 'stroke-dashoffset 0.6s ease-in-out',
              }}
            />
          )}
        </svg>

        {/* Center Score Label */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-live="polite"
          aria-label={
            displayScore !== null
              ? `Evidence score: ${displayScore} out of 100`
              : 'No evidence score available'
          }
        >
          <div
            className={`text-center ${shouldPulse && !respectsReducedMotion ? 'score-pulse' : ''}`}
          >
            <div
              className={`text-4xl font-bold ${getScoreColorClass(displayScore)}`}
            >
              {displayScore !== null ? Math.round(displayScore) : '--'}
            </div>
            <div className="text-caption text-steel dark:text-steel-dark">
              {displayScore !== null ? 'Score' : 'No Score'}
            </div>
          </div>
        </div>
      </div>

      {/* Screen Reader Description */}
      <div className="sr-only">
        {displayScore !== null
          ? `Evidence score: ${Math.round(displayScore)} out of 100. ${
              displayScore >= 80
                ? 'High evidence coverage'
                : displayScore >= 60
                  ? 'Medium evidence coverage'
                  : 'Low evidence coverage'
            }`
          : 'No evidence scores available. Import a PRD to generate scores.'}
      </div>
    </div>
  );
}

export default EvidenceScoreGauge;
