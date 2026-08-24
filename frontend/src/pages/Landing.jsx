import React from "react";
import MarketingPage from "../components/MarketingPage";

// Authenticated home (/landing). Same marketing layout, member hero: the
// extension demo ends on "saved to your dashboard" instead of the sign-up wall.
function Landing() {
  return <MarketingPage authed={true} />;
}

export default Landing;
