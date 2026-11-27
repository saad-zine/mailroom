/** A decorative little assistant, kept inline with the dashboard headline. */
export function Bot() {
  return (
    <span className="headline-bot" aria-hidden="true">
      <svg className="bot-body" viewBox="0 0 86 68" fill="none">
        <path d="M43 8V3M38 3h10" stroke="#18223A" strokeWidth="3" strokeLinecap="round" />
        <rect x="7" y="13" width="72" height="48" rx="15" fill="#F04B42" stroke="#18223A" strokeWidth="3" />
        <path d="M7 35H3M83 35h-4" stroke="#18223A" strokeWidth="3" strokeLinecap="round" />
        <rect x="16" y="21" width="54" height="30" rx="10" fill="white" stroke="#18223A" strokeWidth="2.5" />
        <g className="bot-eyes" fill="#18223A">
          <ellipse cx="34" cy="35" rx="3.5" ry="5" />
          <ellipse cx="52" cy="35" rx="3.5" ry="5" />
        </g>
        <path d="M38 44c3 2 7 2 10 0" stroke="#18223A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
