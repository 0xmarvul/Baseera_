import React from "react";
import MarketingPage from "../components/MarketingPage";

// Public landing page shown to signed-out visitors. Guest hero + sign-up CTAs.
function Home() {
  return <MarketingPage authed={false} />;
}

export default Home;
