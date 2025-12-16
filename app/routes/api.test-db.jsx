import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Test 1: Check session exists
  const sessionExists = await prisma.session.findFirst({
    where: { shop: session.shop }
  });
  
  // Test 2: Try to create a test store record
  const testStore = await prisma.store.upsert({
    where: { shopDomain: session.shop },
    update: { status: "testing" },
    create: {
      shopDomain: session.shop,
      status: "testing"
    }
  });
  
  return {
    success: true,
    shop: session.shop,
    sessionExists: !!sessionExists,
    testStore: testStore
  };
};