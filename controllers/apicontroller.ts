import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { users } from "../index.js";

export async function signUp(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        if (users.find((user) => user.username === username)) {
            return res.status(409).json({
                status: true,
                error: {
                },
                message: "User already exists"
            })
        } else {
            const hashedToken = await bcrypt.hash(password, 10);
            users.push({
                userId: crypto.randomUUID(),
                username,
                password: hashedToken,
                collateral: {
                    available: 0,
                    locked: 0
                },
                positions: [],
                orders: [],
            })
            const token = jwt.sign(
                { username },
                process.env.JWTSECRET as string, {
                expiresIn: "7D",
            });

            return res.status(201).json({
                status: false,
                data: {
                    token,
                },
                message: "User created successfully",
            })
        }
    } catch (err) {
        return res.status(500).json({
            error: {
                message: err,
            },
            message: "Internal server error",
        })
    }
}

export async function signIn(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        const user = users.find((user) => user.username === username);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not find",
            })
        }

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { username },
                process.env.JWTSECRET as string,
                { expiresIn: "7D"}
            );

            return res.status(200).json({
                status: true,
                data: {
                    token,
                },
                message: "User signIn successfully" 
            })
        } else {
            return res.status(401).json({
                status: false,
                error: {

                }, 
                message: "username/password is incorrect"
            })
        }
    } catch (err) {
        return res.status(500).json({
            error: {
                message: err,
            },
            message: "Internal server error",
        })
    }
}