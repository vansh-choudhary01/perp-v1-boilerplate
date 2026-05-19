import { AVLTree } from "avl";
// import { orderbooks, users, type Bid, type Fill, type Order, type RestingOrder } from "..";
import type { Request, Response } from "express";
import { AVLTreeInit } from "../algos/avl";
// import { MaxHeap, MinHeap } from "../algos/heap.js";
import { BALANCES, FILLS, INDEXPRICES, ORDERBOOKS, ORDERS, type Bid, type Fill, type OrderRecord, type OrderStatus, type OrderType, type Position, type RestingOrder, type Side } from "../store/exchange-store.js";
import { orderBodySchema } from "../types/exchange-schema.js";

function resetBalance(userId: string) {
    const user = users.find((user) => userId === userId);

    if (user) {
        user.collateral = {
            available: 10000,
            locked: 0
        }
    }
}

type fillRequiredFields = {
    price: number,
    qty: number,
    buyOrderId: string,
    sellOrderId: string,
}

function getFillObject(order: OrderRecord, { price, qty, buyOrderId, sellOrderId }: fillRequiredFields): Fill {
    return {
        fillId: crypto.randomUUID(),
        symbol: order.symbol,
        price,
        qty,
        buyOrderId,
        sellOrderId,
        createdAt: Date.now(),
    }
}

function getRestingOrder(order: OrderRecord): RestingOrder {
    return {
        userId: order.userId,
        qty: order.qty,
        filledQty: order.filledQty,
        orderId: order.orderId,
        createdAt: Date.now(),
    }
}

function getBid(order: OrderRecord): Bid {
    return {
        availableQty: order.qty - order.filledQty,
        openOrders: [getRestingOrder(order)]
    }
}

// export function createOrder(req: Request, res: Response) {
//     const { userId } = req;
//     const {market, type, qty, margin, price, orderType } = req.body;
//     const user = users.find((ur) => ur.userId === userId);
//     const order: Order = {
//         userId,
//         orderId: crypto.randomUUID(),
//         market,
//         type,
//         qty,
//         filledQty: 0,
//         totalPrice: 0,
//         averagePrice: 0,
//         margin,
//         orderType,
//         price: orderType === 'market' ? null : price,
//         status: "open",
//         fills: [],
//     };

//     let orderbook = orderbooks[market];

//     if (!orderbook) {
//         if (["SOL", "ETH", "BTC"].includes(market)) {
//             orderbook = {
//                 bids: AVLTreeInit.create("new"),
//                 asks: AVLTreeInit.create("new"),
//                 lastTradedPrice: 0,
//                 indexPrice: 100,
//             }
//             orderbooks[market] = orderbook;
//         }
//     }
//     if (type === "LONG") {
//         const askOrderbook = orderbook!.asks;
//         const bidOrderbook = orderbook!.bids;
//         const remaingQty = qty;
//         while(remaingQty > 0) {
//             const minNode  = askOrderbook.minNode();
//             console.log('minNode = ', minNode);

//             // so that i can check with condition (order can swap or not)
//             if (orderType === 'limit') {
//                 // const firstRestingOrder = minNode?.data?.openOrders[0];
//                 // if 
//                 if (!minNode || minNode!.key > order.price!) { // i can't swap here
//                     // first i have to find (is there anyone who also want to stick on this price)
//                     // find resting orders for order.price
//                     const restingOrdersNode = bidOrderbook.find(order.price!)
//                     // first i have to find is resting orders exist for this price 
//                     if (restingOrdersNode) {
//                         restingOrdersNode.data?.openOrders.push(getRestingOrder(order));
//                     } else {
//                         bidOrderbook.insert(order.price!, getBid(order));
//                     }
//                     // console.log(restingOrders.)

//                     // bidOrderbook
//                 } else {
//                     // we need to swap here with the basis of opponent price (because his given price can be less then what i want)
//                     // if (firstRestingOrder)
//                     while(remaingQty > 0 && minNode?.data?.openOrders.length) {
//                         const firstRestingOrder = minNode?.data?.openOrders[0];
//                         const opponentQty = firstRestingOrder?.qty! - firstRestingOrder?.filledQty!;
//                         if (opponentQty >= remaingQty) {
//                             const fillOrder = getFillObject(order, {price: minNode.key, qty: remaingQty, buyOrderId: order.orderId, sellOrderId: firstRestingOrder?.orderId!});
//                             order.fills.push(fillOrder);

//                             // first we adjest filledQty from the order and opponent order
//                             order.filledQty += remaingQty;
//                             firstRestingOrder!.filledQty -= remaingQty;
//                         }
//                     }

//                     // remove node from orderbook
//                     if (!minNode?.data?.openOrders.length) {
//                         askOrderbook.remove(minNode?.key!);
//                     }
//                 }
//             }

//             // if (remaingQty > 0 && minNode) {
//             //     minNode.data?.openOrders.push({
//             //         userId: order.userId,
//             //         qty: order.qty,
//             //         filledQty: order.filledQty,
//             //         orderId: order.userId,
//             //         createdAt: new Date(),
//             //     });
//             // }
//             // const firstRestingOrder = {
//             //     price: 12,
//             //     orders: [],
//             // }
//         }
//     }
// }


export function createOrder(message: Record<string, unknown>) {
    let orderbook = ORDERBOOKS[message.symbol as string];
    // if (!orderbook) {
    //     orderbook = {
    //         bids: AVLTreeInit.create("new"),
    //         asks: AVLTreeInit.create("new"),
    //     }
    //     ORDERBOOKS.set(message.symbol as string, orderbook);
    // }
    let orderbookBuy = orderbook!.bids;
    let orderbookSell = orderbook!.asks;
    let order: OrderRecord = {
        orderId: crypto.randomUUID(),
        userId: String(message.userId),
        side: message.side as Side,
        type: message.type as OrderType,
        symbol: String(message.symbol),
        price: Number(message.price),
        qty: Number(message.qty),
        margin: Number(message.margin),
        filledQty: 0,
        totalPrice: 0,
        averagePrice: null,
        status: "open" as OrderStatus,
        fills: [],
        createdAt: Date.now()
    };

    type Indexprice = keyof typeof INDEXPRICES;
    const leverage = (order.qty * INDEXPRICES[order.symbol as Indexprice].indexPrice) / order.margin;
    if (leverage > INDEXPRICES[order.symbol as Indexprice].leverageThresold) {
        order.status = "cancelled";
        return order;
    }

    let position: Position = {
        market: message.symbol as "SOL" | "ETH",
        type: message.type === "buy" ? "LONG" : "SORT",
        qty: Number(message.qty),
        margin: Number(message.margin),
        liquidationPrice: (leverage * order.margin) - order.margin,
        pnL: 0,
        averagePrice: null,
    }

    if (!ORDERS.get(String(message.userId))) {
        ORDERS.set(String(message.userId), [order]);
    } else {
        const orders = ORDERS.get(String(message.userId))
        orders?.push(order);
    }

    if (message.type === "limit") {
        message.price = Number(message.price) as number;
        message.qty = Number(message.qty) as number;

        if (message.side === "sell") {
            // if (!highestPrice) { throw new Error("Buy OrderBook is empty")};
            const userBalance = BALANCES.get(order.userId);
            if (!userBalance || (userBalance!["USDT"]?.available! < order.margin)) {
                order.status = "cancelled";
                return order;
            } else {
                userBalance[order.symbol]!.available -= order.margin;
                userBalance[order.symbol]!.locked += order.margin;
                userBalance[order.symbol]!.leverageAmount += (leverage * order.margin) - order.margin;
            }
            while (Number(message.qty) > 0) {
                let highestPrice = orderbookBuy.maxNode();
                let bid = highestPrice?.data?.openOrders;
                let filledQty = 0;
                console.log("bid list on given price ", bid);

                if (!bid || bid.length === 0) {
                    orderbookBuy.popMax();
                    while (highestPrice && orderbookBuy.maxNode()?.key === highestPrice.key) {
                        orderbookBuy.popMax();
                    }
                    highestPrice = orderbookBuy.maxNode();
                    bid = highestPrice?.data?.openOrders;
                }

                if (!highestPrice || highestPrice.key < Number(message.price) || !bid || bid.length === 0) {
                    let ask = orderbookSell.find(Number(message.price));
                    if (!ask) {
                        orderbookSell.insert(Number(message.price), {
                            availableQty: 0,
                            openOrders: []
                        });
                        ask = orderbookSell.find(Number(message.price));
                    }
                    ask?.data?.openOrders.push(order as RestingOrder);
                    // orderbookSell.push({ price: Number(message.price) });

                    message.qty = 0;
                } else {

                    let topBid = bid?.[0];
                    const opponentBalance = BALANCES.get(topBid!.userId);
                    console.log(topBid!.qty);

                    // first check bids[0] and caluculate 
                    if (topBid!.qty - topBid!.filledQty > Number(message.qty)) {
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topBid!.price,
                            qty: Number(message.qty),
                            buyOrderId: topBid!.orderId,
                            sellOrderId: order.orderId,
                            createdAt: Date.now()
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        filledQty = Number(message.qty);
                        topBid!.filledQty += Number(message.qty);
                        topBid!.totalPrice += Number(message.qty) * topBid!.price;
                        topBid!.averagePrice = topBid!.totalPrice / topBid!.filledQty;
                        topBid!.status = "partially_filled";
                        order.filledQty += Number(message.qty);
                        order.totalPrice += Number(message.qty) * topBid!.price;
                        order!.averagePrice = order!.totalPrice / order!.filledQty;
                        order.status = "filled";
                        // highestPrice.quantity = diff;
                        message.qty = 0;
                    } else {
                        console.log("system ", topBid);
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topBid!.price,
                            qty: topBid!.qty - topBid!.filledQty,
                            buyOrderId: topBid!.orderId,
                            sellOrderId: order.orderId,
                            createdAt: Date.now()
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        message.qty = Number(message.qty) - (topBid!.qty - topBid!.filledQty);
                        order.filledQty += topBid!.qty - topBid!.filledQty;
                        order.totalPrice += topBid!.price * topBid!.qty - topBid!.filledQty;
                        order.averagePrice = order.totalPrice / order.filledQty;
                        order.status = "partially_filled";
                        filledQty = topBid!.qty - topBid!.filledQty;
                        topBid!.filledQty = topBid!.qty;
                        topBid!.totalPrice += topBid!.price * topBid!.qty;
                        topBid!.averagePrice = topBid!.totalPrice / topBid!.filledQty;
                        topBid!.status = "filled";
                    }
                    if (topBid!.qty === topBid!.filledQty) {
                        bid?.shift();
                        orderbookBuy.popMax();
                        while (orderbookBuy.maxNode()?.key === topBid!.price && !bid.length) {
                            orderbookBuy.popMax();
                        }
                    }
                    if (filledQty > 0) {
                        opponentBalance![order.symbol]!.available += filledQty;
                        opponentBalance!["USD"]!.locked -= filledQty * topBid!.price;
                    }
                }
            }

            if (order.filledQty > 0) {
                userBalance[order.symbol]!.locked -= order.filledQty;
                userBalance["USD"]!.available += order.totalPrice;
            }
        } else if (message.side === "buy") {
            const userBalance = BALANCES.get(order.userId);
            if (!userBalance || (userBalance!["USD"]?.available! < Number(order.price) * order.qty)) {
                order.status = "cancelled";
                return order;
            } else {
                userBalance["USD"]!.available -= Number(order.price) * order.qty;
                userBalance["USD"]!.locked += Number(order.price) * order.qty;
            }
            while (Number(message.qty) > 0) {
                let lowestPrice = orderbookSell.minNode();
                console.log("lowestPrice: ", lowestPrice);
                console.log("ask qty ;", Number(message.qty));
                let ask = lowestPrice?.data?.openOrders;
                console.log("ask list on given price ", ask);

                if (!ask || !ask.length) {
                    orderbookSell.pop();
                    while (lowestPrice && orderbookSell.minNode()?.key === lowestPrice.key) {
                        orderbookSell.pop();
                    }
                    lowestPrice = orderbookSell.minNode();
                    ask = lowestPrice?.data?.openOrders
                }
                if (!lowestPrice || lowestPrice.key > Number(message.price) || !ask || ask.length === 0) {
                    let bid = orderbookBuy.find(Number(message.price));
                    if (!bid) {
                        orderbookBuy.insert(Number(message.price), {
                            availableQty: 0,
                            openOrders: []
                        });
                        bid = orderbookBuy.find(Number(message.price))
                    }
                    bid?.data?.openOrders?.push(order as RestingOrder);
                    // orderbookBuy.push({ price: Number(message.price) });
                    message.qty = 0;
                } else {
                    let topAsk = ask?.[0];
                    console.log(topAsk!.qty);
                    const opponentBalance = BALANCES.get(topAsk!.userId);
                    let filledQty = 0;

                    if (topAsk!.qty - topAsk!.filledQty > Number(message.qty)) {
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topAsk!.price,
                            qty: Number(message.qty),
                            buyOrderId: order.orderId,
                            sellOrderId: topAsk!.orderId,
                            createdAt: Date.now(),
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        console.log("topAsk!.filledQty ", topAsk!.filledQty);
                        filledQty = Number(message.qty);
                        topAsk!.filledQty += Number(message.qty);
                        topAsk!.totalPrice += topAsk!.price * Number(message.qty);
                        topAsk!.averagePrice = topAsk!.totalPrice / topAsk!.filledQty;
                        topAsk!.status = "partially_filled";
                        order.filledQty += Number(message.qty);
                        order.totalPrice += topAsk!.price * Number(message.qty);
                        order.averagePrice = order.totalPrice / order.filledQty;
                        order.status = "filled";
                        message.qty = 0;
                    } else {
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topAsk!.price,
                            qty: topAsk!.qty - topAsk!.filledQty,
                            buyOrderId: order.orderId,
                            sellOrderId: topAsk!.orderId,
                            createdAt: Date.now(),
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        message.qty = Number(message.qty) - (topAsk!.qty - topAsk!.filledQty);
                        order.filledQty += (topAsk!.qty - topAsk!.filledQty);
                        order.totalPrice += topAsk!.price * (topAsk!.qty - topAsk!.filledQty);
                        order.averagePrice = order.totalPrice / order.filledQty;
                        order.status = "partially_filled";
                        filledQty = (topAsk!.qty - topAsk!.filledQty);
                        topAsk!.filledQty = topAsk!.qty;
                        topAsk!.totalPrice += topAsk!.price * topAsk!.qty;
                        topAsk!.averagePrice = topAsk!.totalPrice / topAsk!.filledQty;
                        topAsk!.status = "filled";
                    }

                    if (topAsk!.qty === topAsk!.filledQty) {
                        ask?.shift();
                        orderbookSell.pop();
                        while (orderbookSell.minNode()?.key === topAsk!.price && !ask.length) {
                            orderbookSell.pop();
                        }
                    }

                    if (filledQty > 0) {
                        opponentBalance![order.symbol]!.locked -= filledQty;
                        opponentBalance!["USD"]!.available += filledQty * topAsk!.price;
                    }
                }
            }
            if (order.filledQty > 0) {
                userBalance["USD"]!.available += ((Number(order.price) * order.filledQty) - (Number(order.averagePrice) * order.filledQty));
                userBalance["USD"]!.locked -= Number(order.price) * order.filledQty;
                userBalance[order.symbol]!.available += order.filledQty;
            }
        }
        if (order.qty === order.filledQty) {
            order.status = "filled";
        }
    } else if (message.type === "market") {
        message.qty = Number(message.qty);
        const userBalance = BALANCES.get(order.userId);
        if (!userBalance || !userBalance![order.symbol]) {
            order.status = "cancelled";
            return order;
        }

        if (message.side === "sell") {
            if (userBalance![order.symbol]!.available < order.qty) {
                order.status = "cancelled";
                return order;
            }
            while (Number(message.qty) > 0) {
                let highestPrice = orderbookBuy.maxNode();
                let bid = highestPrice?.data?.openOrders;

                if (!bid || !bid.length) {
                    orderbookBuy.popMax();
                    while (highestPrice && orderbookBuy.maxNode()?.key === highestPrice.key) {
                        orderbookBuy.popMax();
                    }
                    highestPrice = orderbookBuy.maxNode();
                    bid = highestPrice?.data?.openOrders;
                }
                if (!highestPrice || !bid || bid.length === 0) {
                    message.qty = 0;
                } else {
                    let topBid = bid?.[0];
                    const opponentBalance = BALANCES.get(topBid!.userId);
                    let filledQty = 0;

                    // first check bids[0] and calculate
                    if (topBid!.qty - topBid!.filledQty > Number(message.qty)) {
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topBid!.price,
                            qty: Number(message.qty),
                            buyOrderId: topBid!.orderId,
                            sellOrderId: order.orderId,
                            createdAt: Date.now()
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        filledQty = Number(message.qty);
                        topBid!.filledQty = Number(message.qty);
                        topBid!.totalPrice += Number(message.qty) * topBid!.price;
                        topBid!.averagePrice = topBid!.totalPrice / topBid!.filledQty;
                        topBid!.status = "partially_filled";
                        order.filledQty = Number(message.qty);
                        order.totalPrice += Number(message.qty) * topBid!.price;
                        order!.averagePrice = order!.totalPrice / order!.filledQty;
                        order.status = "filled";

                        message.qty = 0;
                    } else {
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topBid!.price,
                            qty: topBid!.qty - topBid!.filledQty,
                            buyOrderId: topBid!.orderId,
                            sellOrderId: order.orderId,
                            createdAt: Date.now()
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        message.qty = Number(message.qty) - (topBid!.qty - topBid!.filledQty);
                        order.filledQty += topBid!.qty - topBid!.filledQty;
                        order.totalPrice += topBid!.price * topBid!.qty - topBid!.filledQty;
                        order.averagePrice = order.totalPrice / order.filledQty;
                        order.status = "partially_filled";
                        filledQty = topBid!.qty - topBid!.filledQty;
                        topBid!.filledQty = topBid!.qty;
                        topBid!.totalPrice += topBid!.price * topBid!.qty;
                        topBid!.averagePrice = topBid!.totalPrice / topBid!.filledQty;
                        topBid!.status = "filled";
                    }
                    if (topBid!.qty === topBid!.filledQty) {
                        bid?.shift();
                        orderbookBuy.maxNode();
                        while (orderbookBuy.maxNode()?.key === topBid!.price && !bid.length) {
                            orderbookBuy.popMax();
                        }
                    }
                    if (filledQty > 0) {
                        opponentBalance![order.symbol]!.available += filledQty;
                        opponentBalance!["USD"]!.locked -= filledQty * topBid!.price;
                    }
                }
            }

            if (order.filledQty > 0) {
                userBalance![order.symbol]!.available -= order.filledQty;
                userBalance!["USD"]!.available += order.totalPrice;
            }
        } else if (message.side === "buy") {
            while (Number(message.qty) > 0) {
                let lowestPrice = orderbookSell.minNode();
                let ask = lowestPrice?.data?.openOrders;

                if (!ask || !ask.length) {
                    orderbookSell.minNode();
                    while (lowestPrice && orderbookSell.minNode()?.key === lowestPrice.key) {
                        orderbookSell.pop();
                    }
                    lowestPrice = orderbookSell.minNode();
                    ask = lowestPrice?.data?.openOrders;
                }
                if (!lowestPrice || !ask || ask.length === 0) {
                    message.qty = 0;
                } else {
                    if (message.qty as number > userBalance!["USD"]!.available / lowestPrice!.key) {
                        message.qty = userBalance!["USD"]!.available / lowestPrice!.key;
                    }
                    let topAsk = ask?.[0];
                    const opponentBalance = BALANCES.get(topAsk!.userId);
                    let filledQty = 0;
                    console.log(topAsk!.qty);

                    if (topAsk!.qty - topAsk!.filledQty > Number(message.qty)) {
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topAsk!.price,
                            qty: Number(message.qty),
                            buyOrderId: order.orderId,
                            sellOrderId: topAsk!.orderId,
                            createdAt: Date.now(),
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        console.log("topAsk!.filledQty ", topAsk!.filledQty);

                        filledQty = Number(message.qty);
                        topAsk!.filledQty += Number(message.qty);
                        topAsk!.totalPrice += topAsk!.price * Number(message.qty);
                        topAsk!.averagePrice = topAsk!.totalPrice / topAsk!.filledQty;
                        topAsk!.status = "partially_filled";
                        order.filledQty += Number(message.qty);
                        order.totalPrice += topAsk!.price * Number(message.qty);
                        order.averagePrice = order.totalPrice / order.filledQty;
                        order.status = "filled";
                        message.qty = 0;
                    } else {
                        const fill = {
                            fillId: crypto.randomUUID(),
                            symbol: order.symbol,
                            price: topAsk!.price,
                            qty: topAsk!.qty - topAsk!.filledQty,
                            buyOrderId: order.orderId,
                            sellOrderId: topAsk!.orderId,
                            createdAt: Date.now(),
                        }
                        order.fills.push(fill);
                        FILLS.push(fill);

                        message.qty = Number(message.qty) - (topAsk!.qty - topAsk!.filledQty);
                        order.filledQty += (topAsk!.qty - topAsk!.filledQty);
                        order.totalPrice += topAsk!.price * (topAsk!.qty - topAsk!.filledQty);
                        order.averagePrice = order.totalPrice / order.filledQty;
                        order.status = "partially_filled";
                        filledQty = (topAsk!.qty - topAsk!.filledQty);
                        topAsk!.filledQty = topAsk!.qty;
                        topAsk!.totalPrice += topAsk!.price * topAsk!.qty;
                        topAsk!.averagePrice = topAsk!.totalPrice / topAsk!.filledQty;
                        topAsk!.status = "filled";
                    }

                    if (topAsk!.qty === topAsk!.filledQty) {
                        ask?.shift();
                        orderbookSell.pop();
                        while (orderbookSell.minNode()?.key === topAsk!.price && !ask.length) {
                            orderbookSell.pop();
                        }
                    }

                    if (filledQty > 0) {
                        opponentBalance![order.symbol]!.locked -= filledQty;
                        opponentBalance!["USD"]!.available += filledQty * topAsk!.price;
                    }
                }
            }

            if (order.filledQty > 0) {
                userBalance!["USD"]!.available -= order.totalPrice;
                userBalance![order.symbol]!.available += order.filledQty;
            }
        }

        if (order.qty === order.filledQty) {
            order.status = "filled";
        } else if (order.status === "open" && order.filledQty === 0) {
            order.status = "cancelled";
        }
    }

    return order;
}

export function getUserId(req: Request): string {
    if (!req.userId) throw new Error("Missing authenticated user");
    return req.userId;
}

export function createOrderController(req: Request, res: Response) {
    try {
        const userId = getUserId(req);

        const parsedBody = orderBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(409).json({
                status: false,
                message: parsedBody.error
            })
        }

        const { type, side, symbol, qty } = parsedBody.data;
        const price = type === "market" ? null : parsedBody.data.price;

        const order = createOrder({
            userId,
            type,
            side,
            symbol,
            price: type === "market" ? null : price,
            qty,
        });

        res.status(200).json({
            status: true,
            data: order,
            message: "order created successful"
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: err
        })
    }

}