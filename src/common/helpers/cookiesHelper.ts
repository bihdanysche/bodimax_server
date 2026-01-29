import type { Response } from "express";
import { AppConfig } from "src/config/app.config";

const IS_PROD = process.env.NODE_ENV === 'production';
const ACCESS_TOKEN_AGE = AppConfig.ACCESS_TOKEN_AGE;
const REFRESH_TOKEN_AGE = AppConfig.REFRESH_TOKEN_AGE;

export function setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        maxAge: ACCESS_TOKEN_AGE,
        path: "/"
    });

    res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        maxAge: REFRESH_TOKEN_AGE,
        path: "/auth"
    });
}

export function clearAllCookies(res: Response) {
    res.clearCookie("access_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        maxAge: ACCESS_TOKEN_AGE,
        path: "/"
    });

    res.clearCookie("refresh_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        maxAge: REFRESH_TOKEN_AGE,
        path: "/auth"
    }); 
}