import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "white",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          AI Resume Tailor
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Free Job Match Optimization with Relevancy Scoring
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#64748b",
            textAlign: "center",
          }}
        >
          Tailor your resume for each job. Get more interviews.
        </div>
        <div
          style={{
            marginTop: 48,
            padding: "12px 24px",
            background: "linear-gradient(90deg, #06b6d4, #a855f7)",
            borderRadius: 12,
            color: "white",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Get Started Free
        </div>
      </div>
    ),
    { ...size }
  );
}
