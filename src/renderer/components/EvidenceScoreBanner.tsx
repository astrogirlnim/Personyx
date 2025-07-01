/**
 * EvidenceScoreBanner Component - Phase 3.1 Feature 1.3
 * Real-time Evidence Score banner after import
 */

import React, { useEffect, useState } from 'react';
import type { EvidenceScore } from '@shared/types';

interface EvidenceScoreBannerProps {
  scores: EvidenceScore[];
  averageScore: number | null;
}

export function EvidenceScoreBanner({
  scores,
  averageScore,
}: EvidenceScoreBannerProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);

  // Show banner with animation when scores are available
  useEffect(() => {
    if (scores.length > 0) {
      setIsVisible(true);
      setShouldPulse(true);

      // Remove pulse animation after it completes
      const timer = setTimeout(() => setShouldPulse(false), 600);
      return () => clearTimeout(timer);
    }
  }, [scores]);

  // Get score classification and styling
  const getScoreStyle = (score: number | null) => {
    if (score === null)
      return { class: '', label: 'No Data', color: 'text-steel' };
    if (score >= 80)
      return { class: 'high', label: 'Excellent', color: 'text-persona' };
    if (score >= 60)
      return { class: 'medium', label: 'Good', color: 'text-caution-amber' };
    return { class: 'low', label: 'Needs Work', color: 'text-risk-red' };
  };

  // Get persona breakdown
  const personaBreakdown = scores.reduce(
    (acc, score) => {
      // Use personaId to create a generic persona name for now
      const personaName = `Persona ${score.personaId}`;
      acc[personaName] = score.score;
      return acc;
    },
    {} as Record<string, number>
  );

  const scoreStyle = getScoreStyle(averageScore);

  if (!isVisible || scores.length === 0) {
    return <></>;
  }

  return (
    <div
      className={`mb-6 bg-paper dark:bg-paper-dark rounded-dr-md shadow-dr-md border-l-4 ${
        averageScore && averageScore >= 80
          ? 'border-persona'
          : averageScore && averageScore >= 60
            ? 'border-caution-amber'
            : 'border-risk-red'
      } ${shouldPulse ? 'animate-pulse-score' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Score Summary */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`text-2xl font-bold ${scoreStyle.color} dark:${scoreStyle.color}-dark`}
              >
                {averageScore !== null ? averageScore : '--'}
              </div>
              <div>
                <div className="text-body-lg font-medium text-slate dark:text-slate-dark">
                  Evidence Score
                </div>
                <div
                  className={`text-caption ${scoreStyle.color} dark:${scoreStyle.color}-dark font-medium`}
                >
                  {scoreStyle.label}
                </div>
              </div>
            </div>

            {/* Persona Breakdown */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="w-px h-8 bg-graphite dark:bg-graphite-dark"></div>
              <div className="flex items-center space-x-3">
                {Object.entries(personaBreakdown).map(
                  ([personaName, score]) => {
                    const personaStyle = getScoreStyle(score);
                    return (
                      <div key={personaName} className="text-center">
                        <div
                          className={`text-body-lg font-bold ${personaStyle.color} dark:${personaStyle.color}-dark`}
                        >
                          {score}
                        </div>
                        <div className="text-caption text-steel dark:text-steel-dark">
                          {personaName}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* Score Indicator & Actions */}
          <div className="flex items-center space-x-3">
            {/* Visual Score Indicator */}
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-graphite dark:text-graphite-dark"
                  strokeDasharray="175.9"
                  strokeDashoffset="0"
                />
                {averageScore !== null && (
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className={
                      scoreStyle.color.replace('text-', 'text-') +
                      ' dark:' +
                      scoreStyle.color.replace('text-', 'text-') +
                      '-dark'
                    }
                    strokeDasharray="175.9"
                    strokeDashoffset={175.9 - (175.9 * averageScore) / 100}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-caption font-bold text-slate dark:text-slate-dark">
                  {averageScore || 0}%
                </span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 rounded-full transition-colors group"
              title="Dismiss banner"
            >
              <svg
                className="w-4 h-4 text-steel dark:text-steel-dark group-hover:text-slate dark:group-hover:text-slate-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded Persona Breakdown for Mobile */}
        <div className="md:hidden mt-4 pt-4 border-t border-graphite dark:border-graphite-dark">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(personaBreakdown).map(([personaName, score]) => {
              const personaStyle = getScoreStyle(score);
              return (
                <div
                  key={personaName}
                  className="flex items-center justify-between"
                >
                  <span className="text-body text-slate dark:text-slate-dark">
                    {personaName}
                  </span>
                  <span
                    className={`text-body font-bold ${personaStyle.color} dark:${personaStyle.color}-dark`}
                  >
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-3 pt-3 border-t border-graphite dark:border-graphite-dark">
          <div className="flex items-center justify-between text-caption text-steel dark:text-steel-dark">
            <span>
              📊 Analysis complete • {scores.length} persona
              {scores.length !== 1 ? 's' : ''} evaluated
            </span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Recommendation based on score */}
        {averageScore !== null && (
          <div className="mt-3 pt-3 border-t border-graphite dark:border-graphite-dark">
            <div className="flex items-start space-x-2">
              <div className="text-lg">
                {averageScore >= 80 ? '🎉' : averageScore >= 60 ? '✨' : '⚠️'}
              </div>
              <div className="text-caption text-steel dark:text-steel-dark">
                {averageScore >= 80 && (
                  <span>
                    <strong>Strong evidence foundation!</strong> Your PRD shows
                    excellent persona alignment. Consider proceeding with
                    development.
                  </span>
                )}
                {averageScore >= 60 && averageScore < 80 && (
                  <span>
                    <strong>Good coverage detected.</strong> Some personas could
                    benefit from additional evidence. Consider gathering more
                    insights.
                  </span>
                )}
                {averageScore < 60 && (
                  <span>
                    <strong>Limited evidence found.</strong> This PRD may need
                    more persona research before development. Consider
                    conducting additional interviews.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
