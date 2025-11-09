import type { ReactElement } from "react";

import UserIcon from "../../../components/actor";
import CdnIcon from "../../../components/cdn";
import LoadBalancerIcon from "../../../components/load-balancer";
import ApiGatewayIcon from "../../../components/api-gateway";
import ServiceIcon from "../../../components/service";
import CacheIcon from "../../../components/cache";
import QueueIcon from "../../../components/queue";
import MessageBrokerIcon from "../../../components/message-broker";
import DatabaseIcon from "../../../components/db";
import SearchIcon from "../../../components/search";
import MetricsCollectorIcon from "../../../components/metrics-collector";
import LogAggregatorIcon from "../../../components/log-aggregator";
import TracingServiceIcon from "../../../components/tracing-service";
import ServiceMeshIcon from "../../../components/service-mesh";
import ObjectStorageTierIcon from "../../../components/object-storage-tier";
import AnalyticsWarehouseIcon from "../../../components/analytics-warehouse";
import StreamProcessorIcon from "../../../components/stream-processor";
import NotificationServiceIcon from "../../../components/notification-service";
import RealtimeGatewayIcon from "../../../components/realtime-gateway";
import EdgeComputeIcon from "../../../components/edge-compute";
import CircuitBreakerIcon from "../../../components/circuit-breaker";

export type IconComponent = () => ReactElement;

export const componentIcons: Record<string, IconComponent> = {
  User: UserIcon,
  CDN: CdnIcon,
  "Load Balancer": LoadBalancerIcon,
  "API Gateway": ApiGatewayIcon,
  Service: ServiceIcon,
  Cache: CacheIcon,
  Queue: QueueIcon,
  "Message Broker": MessageBrokerIcon,
  Database: DatabaseIcon,
  DB: DatabaseIcon,
  "Search Index": SearchIcon,
  "Metrics Collector": MetricsCollectorIcon,
  "Log Aggregator": LogAggregatorIcon,
  "Tracing Service": TracingServiceIcon,
  "Service Mesh": ServiceMeshIcon,
  "Object Storage Tier": ObjectStorageTierIcon,
  "Analytics Warehouse": AnalyticsWarehouseIcon,
  "Stream Processor": StreamProcessorIcon,
  "Notification Service": NotificationServiceIcon,
  "Realtime Gateway": RealtimeGatewayIcon,
  "Edge Compute": EdgeComputeIcon,
  "Circuit Breaker": CircuitBreakerIcon,
};
