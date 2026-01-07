import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Data Analytics Page
 * 
 * Displays statistics about WhatsApp messages sent, delivery rates,
 * webhook processing, and cart recovery metrics.
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Calculate date ranges
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Message statistics
  const totalMessages = await prisma.messageLog.count({
    where: { shopDomain },
  });

  const messagesLast7Days = await prisma.messageLog.count({
    where: {
      shopDomain,
      createdAt: { gte: last7Days },
    },
  });

  const messagesLast30Days = await prisma.messageLog.count({
    where: {
      shopDomain,
      createdAt: { gte: last30Days },
    },
  });

  const messagesByStatus = await prisma.messageLog.groupBy({
    by: ["status"],
    where: { shopDomain },
    _count: true,
  });

  const messagesByType = await prisma.messageLog.groupBy({
    by: ["messageType"],
    where: { shopDomain },
    _count: true,
    orderBy: { _count: { messageType: "desc" } },
    take: 10,
  });

  // Calculate success rate
  const sentMessages = messagesByStatus.find((s) => s.status === "sent")?._count || 0;
  const failedMessages = messagesByStatus.find((s) => s.status === "failed")?._count || 0;
  const successRate = totalMessages > 0 
    ? Math.round((sentMessages / totalMessages) * 100) 
    : 0;

  // Webhook statistics
  const totalWebhooks = await prisma.webhookLog.count({
    where: { shopDomain },
  });

  const webhooksLast7Days = await prisma.webhookLog.count({
    where: {
      shopDomain,
      createdAt: { gte: last7Days },
    },
  });

  const webhooksByStatus = await prisma.webhookLog.groupBy({
    by: ["status"],
    where: { shopDomain },
    _count: true,
  });

  const webhooksByTopic = await prisma.webhookLog.groupBy({
    by: ["topic"],
    where: { shopDomain },
    _count: true,
    orderBy: { _count: { topic: "desc" } },
    take: 10,
  });

  // Cart recovery statistics
  const totalCarts = await prisma.pendingCart.count({
    where: { shopDomain },
  });

  const cartsLast7Days = await prisma.pendingCart.count({
    where: {
      shopDomain,
      createdAt: { gte: last7Days },
    },
  });

  const cartsByStatus = await prisma.pendingCart.groupBy({
    by: ["status"],
    where: { shopDomain },
    _count: true,
  });

  // Recent messages (last 10)
  const recentMessages = await prisma.messageLog.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      recipient: true,
      messageType: true,
      status: true,
      createdAt: true,
      sentAt: true,
      errorMessage: true,
    },
  });

  // Time-series data for last 7 days
  const messagesByDay = [];
  const webhooksByDay = [];
  const labels = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayLabel = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    labels.push(dayLabel);
    
    const dayMessages = await prisma.messageLog.count({
      where: {
        shopDomain,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });
    messagesByDay.push(dayMessages);
    
    const dayWebhooks = await prisma.webhookLog.count({
      where: {
        shopDomain,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });
    webhooksByDay.push(dayWebhooks);
  }

  return {
    shopDomain,
    // Message stats
    totalMessages,
    messagesLast7Days,
    messagesLast30Days,
    messagesByStatus,
    messagesByType,
    successRate,
    // Webhook stats
    totalWebhooks,
    webhooksLast7Days,
    webhooksByStatus,
    webhooksByTopic,
    // Cart stats
    totalCarts,
    cartsLast7Days,
    cartsByStatus,
    // Recent activity
    recentMessages,
    // Time-series data
    messagesByDay,
    webhooksByDay,
    labels,
  };
};

export default function Analytics() {
  const data = useLoaderData();

  return (
    <s-page heading="Data Analytics">
      {/* Overview Cards */}
      <s-section heading="Overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-text tone="subdued" style={{ fontSize: "0.875rem" }}>Total Messages</s-text>
            <s-text style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", display: "block" }}>
              {data.totalMessages.toLocaleString()}
            </s-text>
            <s-text tone="subdued" style={{ fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
              {data.messagesLast7Days} in last 7 days
            </s-text>
          </s-box>

          <s-box padding="base" background="subdued" borderRadius="base">
            <s-text tone="subdued" style={{ fontSize: "0.875rem" }}>Success Rate</s-text>
            <s-text style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", display: "block" }}>
              {data.successRate}%
            </s-text>
            <s-text tone="subdued" style={{ fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
              {data.messagesByStatus.find((s) => s.status === "sent")?._count || 0} sent,{" "}
              {data.messagesByStatus.find((s) => s.status === "failed")?._count || 0} failed
            </s-text>
          </s-box>

          <s-box padding="base" background="subdued" borderRadius="base">
            <s-text tone="subdued" style={{ fontSize: "0.875rem" }}>Webhooks Processed</s-text>
            <s-text style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", display: "block" }}>
              {data.totalWebhooks.toLocaleString()}
            </s-text>
            <s-text tone="subdued" style={{ fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
              {data.webhooksLast7Days} in last 7 days
            </s-text>
          </s-box>

          <s-box padding="base" background="subdued" borderRadius="base">
            <s-text tone="subdued" style={{ fontSize: "0.875rem" }}>Cart Recovery</s-text>
            <s-text style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "0.5rem", display: "block" }}>
              {data.totalCarts.toLocaleString()}
            </s-text>
            <s-text tone="subdued" style={{ fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
              {data.cartsLast7Days} in last 7 days
            </s-text>
          </s-box>
        </div>
      </s-section>

      {/* Charts Section */}
      <s-section heading="Activity Trends" marginBlockStart="base">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "1rem" }}>
          {/* Messages Over Time */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", display: "block" }}>
              Messages Over Time (Last 7 Days)
            </s-text>
            <div style={{ height: "300px", position: "relative" }}>
              <Line
                data={{
                  labels: data.labels,
                  datasets: [
                    {
                      label: "Messages Sent",
                      data: data.messagesByDay,
                      borderColor: "rgb(22, 160, 133)",
                      backgroundColor: "rgba(22, 160, 133, 0.1)",
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                    },
                    tooltip: {
                      mode: "index",
                      intersect: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          </s-box>

          {/* Webhooks Over Time */}
          {data.totalWebhooks > 0 && (
            <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
              <s-text style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", display: "block" }}>
                Webhooks Processed (Last 7 Days)
              </s-text>
              <div style={{ height: "300px", position: "relative" }}>
                <Line
                  data={{
                    labels: data.labels,
                    datasets: [
                      {
                        label: "Webhooks Processed",
                        data: data.webhooksByDay,
                        borderColor: "rgb(52, 152, 219)",
                        backgroundColor: "rgba(52, 152, 219, 0.1)",
                        tension: 0.4,
                        fill: true,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: "top",
                      },
                      tooltip: {
                        mode: "index",
                        intersect: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            </s-box>
          )}
        </div>
      </s-section>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
        {/* Success Rate Chart */}
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-text style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", display: "block" }}>
            Success Rate
          </s-text>
          <div style={{ height: "250px", position: "relative" }}>
            <Doughnut
              data={{
                labels: ["Sent", "Failed"],
                datasets: [
                  {
                    data: [
                      data.messagesByStatus.find((s) => s.status === "sent")?._count || 0,
                      data.messagesByStatus.find((s) => s.status === "failed")?._count || 0,
                    ],
                    backgroundColor: ["rgb(22, 160, 133)", "rgb(220, 53, 69)"],
                    borderWidth: 2,
                    borderColor: "#fff",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </s-box>

        {/* Message Types Chart */}
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-text style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", display: "block" }}>
            Messages by Type
          </s-text>
          {data.messagesByType.length > 0 ? (
            <div style={{ height: "250px", position: "relative" }}>
              <Doughnut
                data={{
                  labels: data.messagesByType.map((item) => item.messageType),
                  datasets: [
                    {
                      data: data.messagesByType.map((item) => item._count),
                      backgroundColor: [
                        "rgb(22, 160, 133)",
                        "rgb(52, 152, 219)",
                        "rgb(155, 89, 182)",
                        "rgb(241, 196, 15)",
                        "rgb(230, 126, 34)",
                        "rgb(231, 76, 60)",
                        "rgb(149, 165, 166)",
                        "rgb(46, 204, 113)",
                      ],
                      borderWidth: 2,
                      borderColor: "#fff",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        boxWidth: 12,
                        font: {
                          size: 11,
                        },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                          return `${context.label}: ${context.parsed} (${percentage}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <s-text tone="subdued" style={{ textAlign: "center", display: "block", padding: "2rem" }}>
              No messages sent yet.
            </s-text>
          )}
        </s-box>
      </div>

      {/* Webhooks Chart */}
      {data.webhooksByTopic.length > 0 && (
        <s-section heading="Webhook Activity" marginBlockStart="base">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued" marginBlockStart="base">
            <s-text style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", display: "block" }}>
              Webhooks by Topic
            </s-text>
            <div style={{ height: "300px", position: "relative" }}>
              <Bar
                data={{
                  labels: data.webhooksByTopic.map((item) => item.topic.replace("orders/", "").replace("fulfillments/", "")),
                  datasets: [
                    {
                      label: "Webhooks Processed",
                      data: data.webhooksByTopic.map((item) => item._count),
                      backgroundColor: "rgba(22, 160, 133, 0.8)",
                      borderColor: "rgb(22, 160, 133)",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `${context.parsed.y} webhooks`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          </s-box>
        </s-section>
      )}

      {/* Messages by Type */}
      <s-section heading="Messages by Type" marginBlockStart="base">
        {data.messagesByType.length > 0 ? (
          <s-stack direction="block" gap="base">
            {data.messagesByType.map((item) => (
              <s-box
                key={item.messageType}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <s-text style={{ fontWeight: "500" }}>{item.messageType}</s-text>
                <s-text tone="subdued">{item._count.toLocaleString()} messages</s-text>
              </div>
              </s-box>
            ))}
          </s-stack>
        ) : (
          <s-text tone="subdued">No messages sent yet.</s-text>
        )}
      </s-section>

      {/* Webhooks by Topic */}
      <s-section heading="Webhooks by Topic" marginBlockStart="base">
        {data.webhooksByTopic.length > 0 ? (
          <s-stack direction="block" gap="base">
            {data.webhooksByTopic.map((item) => (
              <s-box
                key={item.topic}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <s-text style={{ fontWeight: "500" }}>{item.topic}</s-text>
                <s-text tone="subdued">{item._count.toLocaleString()} webhooks</s-text>
              </div>
              </s-box>
            ))}
          </s-stack>
        ) : (
          <s-text tone="subdued">No webhooks processed yet.</s-text>
        )}
      </s-section>

      {/* Recent Messages */}
      <s-section heading="Recent Messages" marginBlockStart="base">
        {data.recentMessages.length > 0 ? (
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              {data.recentMessages.map((message) => (
                <s-box
                  key={message.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background={message.status === "sent" ? "success-subdued" : "critical-subdued"}
                >
                  <s-stack direction="block" gap="tight">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <s-text style={{ fontWeight: "500" }}>{message.messageType}</s-text>
                      <s-text
                        tone={message.status === "sent" ? "success" : "critical"}
                        style={{ fontSize: "0.875rem" }}
                      >
                        {message.status.toUpperCase()}
                      </s-text>
                    </div>
                    <s-text tone="subdued" style={{ fontSize: "0.875rem" }}>
                      To: {message.recipient}
                    </s-text>
                    <s-text tone="subdued" style={{ fontSize: "0.75rem" }}>
                      {new Date(message.createdAt).toLocaleString()}
                    </s-text>
                    {message.errorMessage && (
                      <s-text tone="critical" style={{ fontSize: "0.875rem" }}>
                        Error: {message.errorMessage}
                      </s-text>
                    )}
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </s-box>
        ) : (
          <s-text tone="subdued">No recent messages.</s-text>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

