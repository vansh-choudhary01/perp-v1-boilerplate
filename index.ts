import express, { type NextFunction } from "express";
import { type Request, type Response } from "express";
import dotenv from "dotenv";
import { signIn, signUp } from "./controllers/auth";
import { AVLTree } from "avl";
import { AVLTreeInit } from "./algos/avl";
import type { User } from "./store/exchange-store";
import { createOrderController } from "./controllers/order";
import jwt from "jsonwebtoken";
dotenv.config();

const app = express();
app.use(express.json());

export const users: User[] = [
    // {
    //     userId: 1,
    //     username: "harkirat",
    //     password: 123123,
    //     collateral: {
    //         availabe: 2000,
    //         locked: 1000
    //     },
    //     positions: [
    //         { market: "SOL", type: "LONG", qty: 10, margin: 500, liquidationPrice: 80, averagePrice: 90 },
    //         { market: "ETH", type: "SHORT", qty: 1, margin: 500, liquidationPrice: 2000, averagePrice: 1900 }
    //     ],
    //     orders: [
    //         { orderId: 1, market: "SOL", type: "LONG", qty: 10, margin: 500, orderType: "limit", price: 90, status: "filled" },
    //         { orderId: 2, market: "ETH", type: "SHORT", qty: 10, margin: 500, orderType: "limit", price: 1900, status: "filled" },
    //         { orderId: 3, market: "BTC", type: "LONG", qty: 10, margin: 500, orderType: "limit", price: 1900, status: "cancelled" },
    //     ]
    // }, {
    //     userId: 2,
    //     username: "raman",
    //     password: 123123,
    //     collateral: {
    //         availabe: 2000,
    //         locked: 2000
    //     },
    //     positions: [
    //         { market: "SOL", type: "SHORT", qty: 10, margin: 1000, liquidationPrice: 80, pnL: 200, averagePrice: 90 },
    //         { market: "ETH", type: "LONG", qty: 1, margin: 1000, liquidationPrice: 2000, pnL: -100, averagePrice: 1900 }
    //     ],
    //     orders: [
    //         { orderId: 10, market: "SOL", type: "SHORT", qty: 10, margin: 500, orderType: "market", price: 90, status: "filled" },
    //         { orderId: 11, market: "ETH", type: "LONG", qty: 10, margin: 500, orderType: "market", price: 1900, status: "filled" },
    //         { orderId: 12, market: "ZEC", type: "LONG", qty: 10, margin: 500, orderType: "limit", price: 1900, status: "open" },
    //     ]
    // }
];

export const fills = [{
    maker: 1,
    taker: 2,
    market: "SOL",
    qty: 10,
    price: 90,
    long: 1,
    short: 2
}, {
    maker: 1,
    taker: 2,
    market: "ETH",
    qty: 1,
    price: 1900,
    long: 2,
    short: 1
}];

app.get("/", (req, res) => res.json("Server is healthy"))

export interface TokenPayload {
  userId: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing auth token" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWTSECRET!) as TokenPayload;
    console.log(payload);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid auth token" });
  }
}

app.post("/signup", signUp)
app.post("/signin", signIn)
app.post("/onramp", (req, res) => { })
app.post("/order", requireAuth, createOrderController)
app.delete("/order", (req, res) => { })
app.get("/equity/available", (req, res) => { })
app.get("/positions/open/:marketId", (req, res) => { });
app.get("/positions/closed/:marketId", (req, res) => { });
app.get("/orders/open/:marketId", (req, res) => { })
app.get("/orders/:marketId", (req, res) => { })
app.get("/fills", (req, res) => { });

export async function liqudationChecks(asset: string, price: number) {

}


export async function onPriceUpdateFromBinance(asset: string, price: number) {
    liqudationChecks(asset, price);
}

app.listen(3000, () => {
    console.log("Server is running on 3000");
});