import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: 7,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="1" y="8" width="3" height="11" rx="1" fill="#ff8a1f" />
          <rect x="6" y="3" width="3" height="16" rx="1" fill="#ff8a1f" />
          <rect x="11" y="6" width="3" height="13" rx="1" fill="#ffb066" />
          <rect x="16" y="0" width="3" height="19" rx="1" fill="#ff8a1f" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
