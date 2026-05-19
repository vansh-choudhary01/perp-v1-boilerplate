import type { AVLTree } from "avl";
import { AVLTreeInit } from "../algos/avl";

export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";

export interface Balance {
  available: number;
  locked: number;
  leverageAmount: number;
}

export interface RestingOrder {
  orderId: string;
  userId: string;
  side: Side;
  type: "limit";
  symbol: string;
  price: number;
  qty: number;
  filledQty: number;
  totalPrice: number;
  averagePrice: number | null;
  status: OrderStatus;
  createdAt: number;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
  side: Side;
  type: OrderType;
  symbol: string;
  price: number | null;
  qty: number;
  margin: number;
  filledQty: number;
  totalPrice: number;
  averagePrice: number | null;
  status: OrderStatus;
  fills: Fill[];
  createdAt: number;
}

export interface Fill {
  fillId: string;
  symbol: string;
  price: number;
  qty: number;
  buyOrderId: string;
  sellOrderId: string;
  createdAt: number;
}

export interface CreateOrderInput {
  userId: string;
  type: OrderType;
  side: Side;
  symbol: string;
  price: number | null;
  qty: number;
}

export interface DepthLevel {
  price: number;
  qty: number;
}

export interface DepthResponse {
  symbol: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
}

export interface Position {
  market: "SOL" | "ETH",
  type: "LONG" | "SORT",
  qty: number,
  margin: number,
  liquidationPrice: number,
  pnL: number,
  averagePrice: number | null,
}

export type User = {
    userId: string,
    username: string,
    password: string,
    collateral: {
        available: number,
        locked: number
    },
    positions: {
        market: {
            type: string,
            enum: ["SOL", "ETH"]
        },
        type: {
            type: string,
            enum: ["LONG", "SORT"]
        },
        qty: number,
        margin: number,
        liquidationPrice: number,
        pnL: number,
        averagePrice: number
    }[],
    orders: {
        orderId: string,
        market: {
            type: string,
            enum: ["SOL", "ETH"]
        },
        type: {
            type: string,
            enum: ["LONG", "SORT"]
        },
        qty: number,
        margin: number,
        orderType: {
            type: string,
            enum: ["market", "limit"]
        }
        price: number,
        status: {
            type: string,
            enum: ["open", "filled", "partial_filled", "cancelled"]
        }
    }[]
};

export interface Fill {
  fillId: string;
  symbol: string;
  price: number;
  qty: number;
  buyOrderId: string;
  sellOrderId: string;
  createdAt: number;
}

export type EngineCommandType =
  | "create_order"
  | "get_depth"
  | "get_user_balance"
  | "get_orders"
  | "get_order"
  | "cancel_order"
  | "update_balance";

export interface EngineRequest {
  correlationId: string;
  responseQueue: string;
  type: EngineCommandType;
  payload: Record<string, unknown>;
}

export type Order = {
    userId: number,
    orderId: string,
    market: string,
    type: "LONG"| "SORT",
    qty: number,
    filledQty: number,
    totalPrice: number,
    averagePrice: number,
    margin: number,
    orderType: "limit"| "market",
    price: number | null,
    status: "open"| "partially_filled"| "filled"| "cancelled"
    fills: Fill[],
}

export type Bid = {
    availableQty: number,
    openOrders: RestingOrder[]
}

export type Orderbook = {
    bids: AVLTree<number, Bid>,
    asks: AVLTree<number, Bid>,
    lastTradedPrice: number,
    indexPrice: number
}

type Orderbooks = Record<string, Orderbook>

export const orderbooks: Orderbooks = {
    SOL: { bids: AVLTreeInit.create("new"), asks: AVLTreeInit.create("new"), lastTradedPrice: 90, indexPrice: 90.01 },
    ETH: { bids: AVLTreeInit.create("new"), asks: AVLTreeInit.create("new"), lastTradedPrice: 1900, indexPrice: 1899.9 }
}

export const BALANCES = new Map<string, Record<string, Balance>>();
// export const ORDERBOOKS = new Map<string, Orderbook>();
export const ORDERBOOKS: Orderbooks = {
    SOL: { bids: AVLTreeInit.create("new"), asks: AVLTreeInit.create("new"), lastTradedPrice: 90, indexPrice: 90.01 },
    ETH: { bids: AVLTreeInit.create("new"), asks: AVLTreeInit.create("new"), lastTradedPrice: 1900, indexPrice: 1899.9 }
}
export const ORDERS = new Map<string, OrderRecord[]>();
export const FILLS: Fill[] = [];
export const INDEXPRICES = {
  SOL: { indexPrice: 0, leverageThresold: 100},
  ETH: { indexPrice: 0, leverageThresold: 100},
};