import express from "express";
import dotenv from "dotenv";
import { signIn, signUp } from "./controllers/apicontroller";
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

type User = {
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

type Bid = {
    availableQty: number,
    openOrders: { userId: number, qty: number, filledQty: number, orderId: number, createdAt: Date }[]
}

type Orderbook = {
    bids: Record<string, Bid>,
    asks: Record<string, Bid>,
    lastTradedPrice: number,
    indexPrice: number
}

type Orderbooks = Record<string, Orderbook>

const orderbooks: Orderbooks = {
    SOL: { bids: {}, asks: {}, lastTradedPrice: 90, indexPrice: 90.01 },
    ETH: { bids: {}, asks: {}, lastTradedPrice: 1900, indexPrice: 1899.9 }
}

const fills = [{
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

app.post("/signup", (req, res) => signUp)
app.post("/signin", (req, res) => signIn)
app.post("/onramp", (req, res) => { })
app.post("/order", (req, res) => { })
app.delete("/order", (req, res) => { })
app.get("/equity/available", (req, res) => { })
app.get("/positions/open/:marketId", (req, res) => { });
app.get("/positions/closed/:marketId", (req, res) => { });
app.get("/orders/open/:marketId", (req, res) => { })
app.get("/orders/:marketId", (req, res) => { })
app.get("/fills", (req, res) => { });

async function liqudationChecks(asset: string, price: number) {

}


async function onPriceUpdateFromBinance(asset: string, price: number) {
    liqudationChecks(asset, price);
}
