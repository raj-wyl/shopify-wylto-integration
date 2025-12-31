import { Outlet } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  
  // Skip authentication for login route - it's handled by auth.login/route.jsx
  if (url.pathname === "/auth/login") {
    return null;
  }
  
  await authenticate.admin(request);

  return null;
};

export default function AuthLayout() {
  return <Outlet />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
